import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'

const THEME = {
  layout:     { background: { color: '#06080f' }, textColor: '#5e6d82', attribution: { visible: false } },
  grid:       { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
  crosshair:  { mode: CrosshairMode.Normal, vertLine: { color: 'rgba(99,102,241,0.5)', labelBackgroundColor: '#6366f1' }, horzLine: { color: 'rgba(99,102,241,0.5)', labelBackgroundColor: '#6366f1' } },
  timeScale:  { borderColor: 'rgba(255,255,255,0.07)', timeVisible: true, secondsVisible: false },
  rightPriceScale: { borderColor: 'rgba(255,255,255,0.07)' },
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
      const ts   = Math.floor(new Date(o.timestamp).getTime() / 1000)
      const isBuy = o.side === 'buy'
      return {
        time:     ts,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color:    isBuy ? '#10b981' : '#f43f5e',
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
    color: c.close >= c.open ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)',
  })))
  const rsiData = bars.filter(c => c.rsi != null).map(c => ({ time: c.time, value: c.rsi }))
  if (rsiData.length) rsiSeries.setData(rsiData)
  priceChart.timeScale().fitContent()
  rsiChart.timeScale().fitContent()
}

/* ── OHLCV Hover Overlay ─────────────────────────── */
function HoverOverlay({ hover }) {
  if (!hover) return null
  const up = hover.close >= hover.open
  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'rgba(9,12,22,0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '5px 12px', fontSize: 11.5,
      pointerEvents: 'none', userSelect: 'none',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <span style={{ color: 'var(--muted)', marginRight: 12, fontSize: 11 }}>{fmtTime(hover.time)}</span>
      <OItem label="O" value={fmtPrice(hover.open)}  color="var(--text)" />
      <OItem label="H" value={fmtPrice(hover.high)}  color="#10b981" />
      <OItem label="L" value={fmtPrice(hover.low)}   color="#f43f5e" />
      <OItem label="C" value={fmtPrice(hover.close)} color={up ? '#10b981' : '#f43f5e'} />
      {hover.volume != null && <OItem label="Vol" value={fmtVol(hover.volume)} color="var(--muted2)" />}
      {hover.rsi   != null && <OItem label="RSI" value={Number(hover.rsi).toFixed(2)} color="#818cf8" />}
    </div>
  )
}

function OItem({ label, value, color }) {
  return (
    <span style={{ marginRight: 12 }}>
      <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{label} </span>
      <span style={{ color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </span>
  )
}

/* ── Chart Component ─────────────────────────────── */
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
        upColor: '#10b981', downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#10b981', wickDownColor: '#f43f5e',
      })

      const volSeries = priceChart.addHistogramSeries({
        priceFormat: { type: 'volume' }, priceScaleId: 'vol',
      })
      priceChart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.80, bottom: 0 } })

      const rsiSeries = rsiChart.addLineSeries({
        color: '#6366f1', lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      })
      // M-9: Store refs to the OB/OS lines so a separate effect can update them
      // when rsiOverbought / rsiOversold props change without recreating the chart.
      const obLine = rsiSeries.createPriceLine({ price: rsiOverbought, color: '#f43f5e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'OB' })
      const osLine = rsiSeries.createPriceLine({ price: rsiOversold,   color: '#10b981', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'OS' })
      rsiSeries.createPriceLine({ price: 50, color: 'rgba(255,255,255,0.08)', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false })
      refs.current.rsiOBLine = obLine
      refs.current.rsiOSLine = osLine

      let syncing = false
      const syncFrom = (src, dst) => {
        if (syncing) return; syncing = true
        const range = src.timeScale().getVisibleRange()
        if (range) dst.timeScale().setVisibleRange(range)
        syncing = false
      }
      priceChart.timeScale().subscribeVisibleTimeRangeChange(() => syncFrom(priceChart, rsiChart))
      rsiChart.timeScale().subscribeVisibleTimeRangeChange(()   => syncFrom(rsiChart, priceChart))

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

      refs.current = { priceChart, rsiChart, candleSeries, volSeries, rsiSeries,
                       rsiOBLine: null, rsiOSLine: null }
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

  // M-9: Update RSI threshold lines whenever the props change, without
  // tearing down and recreating the entire chart.
  useEffect(() => {
    if (!chartReady) return
    const { rsiOBLine, rsiOSLine } = refs.current
    try {
      if (rsiOBLine) rsiOBLine.applyOptions({ price: rsiOverbought })
      if (rsiOSLine) rsiOSLine.applyOptions({ price: rsiOversold })
    } catch (e) { console.error('[Chart] threshold update error:', e) }
  }, [rsiOverbought, rsiOversold, chartReady])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Price chart */}
      <div style={{ flex: '0 0 68%', minHeight: 0, position: 'relative' }}>
        <div ref={priceRef} style={{ width: '100%', height: '100%' }} />
        <HoverOverlay hover={hover} />
      </div>

      {/* RSI divider */}
      <div style={{
        flex: '0 0 24px', display: 'flex', alignItems: 'center', flexShrink: 0,
        padding: '0 14px',
        background: 'rgba(255,255,255,0.018)',
        color: 'var(--muted)', fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4,
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        textTransform: 'uppercase',
      }}>
        RSI &nbsp;·&nbsp; Oversold {rsiOversold} &nbsp;·&nbsp; Overbought {rsiOverbought}
      </div>

      <div ref={rsiRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}
