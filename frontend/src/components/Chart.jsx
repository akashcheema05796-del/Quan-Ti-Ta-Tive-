import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'

const THEME = {
  layout:     { background: { color: '#0d1117' }, textColor: '#7d8590', attribution: { visible: false } },
  grid:       { vertLines: { color: '#161b22' }, horzLines: { color: '#161b22' } },
  crosshair:  { mode: CrosshairMode.Normal },
  timeScale:  { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
  rightPriceScale: { borderColor: '#2a2e39' },
  watermark:  { visible: false },
}

const fmtPrice = n => n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtVol   = n => n == null ? '—' : Number(n).toFixed(4)
const fmtTime  = ts => {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
       + '  '
       + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function buildMarkers(orders) {
  return [...orders]
    .filter(o => o.status === 'closed' || o.status === 'paper')
    .map(o => {
      const ts = Math.floor(new Date(o.timestamp).getTime() / 1000)
      const isBuy = o.side === 'buy'
      return {
        time:     ts,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color:    isBuy ? '#26a69a' : '#ef5350',
        shape:    isBuy ? 'arrowUp' : 'arrowDown',
        text:     `${isBuy ? 'BUY' : 'SELL'} $${Number(o.price).toFixed(2)}`,
        size:     1,
      }
    })
    .sort((a, b) => a.time - b.time)
}

function applyCandles(refs, candles) {
  const { candleSeries, volSeries, rsiSeries, priceChart, rsiChart } = refs.current
  if (!candleSeries || !candles.length) return
  const seen = new Set()
  const bars = candles
    .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true })
    .sort((a, b) => a.time - b.time)
  candleSeries.setData(bars.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })))
  volSeries.setData(bars.map(c => ({
    time: c.time, value: c.volume,
    color: c.close >= c.open ? '#26a69a44' : '#ef535044',
  })))
  const rsiData = bars.filter(c => c.rsi != null).map(c => ({ time: c.time, value: c.rsi }))
  if (rsiData.length) rsiSeries.setData(rsiData)
  priceChart.timeScale().fitContent()
  rsiChart.timeScale().fitContent()
}

/* ── OHLCV Hover Overlay ─────────────────────── */
function HoverOverlay({ hover }) {
  if (!hover) return null
  const up = hover.close >= hover.open
  return (
    <div style={{
      position: 'absolute', top: 8, left: 8, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 0,
      background: '#1c212899', backdropFilter: 'blur(6px)',
      border: '1px solid #2a2e39', borderRadius: 6,
      padding: '4px 10px', fontSize: 11,
      pointerEvents: 'none', userSelect: 'none',
    }}>
      <span style={{ color: '#7d8590', marginRight: 10 }}>{fmtTime(hover.time)}</span>
      <OItem label="O" value={fmtPrice(hover.open)}  color="#e6edf3" />
      <OItem label="H" value={fmtPrice(hover.high)}  color="#26a69a" />
      <OItem label="L" value={fmtPrice(hover.low)}   color="#ef5350" />
      <OItem label="C" value={fmtPrice(hover.close)} color={up ? '#26a69a' : '#ef5350'} />
      {hover.volume != null && <OItem label="Vol" value={fmtVol(hover.volume)} color="#7d8590" />}
      {hover.rsi   != null && <OItem label="RSI" value={Number(hover.rsi).toFixed(2)} color="#2196f3" />}
    </div>
  )
}

function OItem({ label, value, color }) {
  return (
    <span style={{ marginRight: 10 }}>
      <span style={{ color: '#7d8590' }}>{label} </span>
      <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </span>
  )
}

/* ── Chart Component ─────────────────────────── */
export default function Chart({ candles, orders, rsiOverbought = 70, rsiOversold = 30 }) {
  const priceRef  = useRef(null)
  const rsiRef    = useRef(null)
  const refs      = useRef({})
  const candleRef = useRef(candles)
  const orderRef  = useRef(orders)
  const [chartReady, setChartReady] = useState(false)
  const [hover, setHover] = useState(null)

  candleRef.current = candles
  orderRef.current  = orders

  useEffect(() => {
    try {
      const priceChart = createChart(priceRef.current, { ...THEME, autoSize: true })
      const rsiChart   = createChart(rsiRef.current, {
        ...THEME, autoSize: true,
        rightPriceScale: { ...THEME.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
      })

      const candleSeries = priceChart.addCandlestickSeries({
        upColor: '#26a69a', downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a', wickDownColor: '#ef5350',
      })

      const volSeries = priceChart.addHistogramSeries({
        priceFormat: { type: 'volume' }, priceScaleId: 'vol',
      })
      priceChart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.80, bottom: 0 } })

      const rsiSeries = rsiChart.addLineSeries({
        color: '#2196f3', lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      })
      rsiSeries.createPriceLine({ price: rsiOverbought, color: '#ef5350', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'OB' })
      rsiSeries.createPriceLine({ price: rsiOversold,   color: '#26a69a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'OS' })
      rsiSeries.createPriceLine({ price: 50,            color: '#2a2e39', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false })

      let syncing = false
      const syncFrom = (src, dst) => {
        if (syncing) return; syncing = true
        const range = src.timeScale().getVisibleRange()
        if (range) dst.timeScale().setVisibleRange(range)
        syncing = false
      }
      priceChart.timeScale().subscribeVisibleTimeRangeChange(() => syncFrom(priceChart, rsiChart))
      rsiChart.timeScale().subscribeVisibleTimeRangeChange(()   => syncFrom(rsiChart, priceChart))

      // ── Crosshair hover → OHLCV overlay ──
      priceChart.subscribeCrosshairMove(param => {
        if (!param.time || !param.seriesData) { setHover(null); return }
        const candle = param.seriesData.get(candleSeries)
        const vol    = param.seriesData.get(volSeries)
        const rsi    = param.seriesData.get(rsiSeries)
        if (!candle) { setHover(null); return }
        setHover({
          time:   param.time,
          open:   candle.open,
          high:   candle.high,
          low:    candle.low,
          close:  candle.close,
          volume: vol?.value,
          rsi:    rsi?.value,
        })
      })

      refs.current = { priceChart, rsiChart, candleSeries, volSeries, rsiSeries }
      setChartReady(true)

      return () => {
        setChartReady(false)
        refs.current = {}
        setHover(null)
        priceChart.remove()
        rsiChart.remove()
      }
    } catch (e) {
      console.error('[Chart] init error:', e)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartReady) return
    try { applyCandles(refs, candleRef.current) }
    catch (e) { console.error('[Chart] setData error:', e) }
  }, [candles, chartReady])

  useEffect(() => {
    if (!chartReady) return
    const { candleSeries } = refs.current
    if (!candleSeries) return
    try { candleSeries.setMarkers(buildMarkers(orderRef.current)) }
    catch (e) { console.error('[Chart] markers error:', e) }
  }, [orders, chartReady])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Price chart with hover overlay */}
      <div style={{ flex: '0 0 68%', minHeight: 0, position: 'relative' }}>
        <div ref={priceRef} style={{ width: '100%', height: '100%' }} />
        <HoverOverlay hover={hover} />
      </div>

      {/* RSI divider */}
      <div style={{
        flex: '0 0 22px', display: 'flex', alignItems: 'center', flexShrink: 0,
        padding: '0 12px', background: '#161b22',
        color: '#7d8590', fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
        borderTop: '1px solid #2a2e39', borderBottom: '1px solid #2a2e39',
        textTransform: 'uppercase',
      }}>
        RSI — Oversold {rsiOversold} / Overbought {rsiOverbought}
      </div>

      <div ref={rsiRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}
