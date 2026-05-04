import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'

const THEME = {
  layout:     { background: { color: '#131722' }, textColor: '#787b86' },
  grid:       { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
  crosshair:  { mode: CrosshairMode.Normal },
  timeScale:  { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
  rightPriceScale: { borderColor: '#2a2e39' },
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

export default function Chart({ candles, orders, rsiOverbought = 70, rsiOversold = 30 }) {
  const priceRef = useRef(null)
  const rsiRef   = useRef(null)
  const refs     = useRef({})
  const [chartError, setChartError] = useState(null)

  // Create charts once.
  useEffect(() => {
    try {
      const priceChart = createChart(priceRef.current, { ...THEME, autoSize: true })
      const rsiChart   = createChart(rsiRef.current,   {
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
      rsiSeries.createPriceLine({ price: 50,            color: '#787b86', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false })

      let syncing = false
      const syncFrom = (src, dst) => {
        if (syncing) return
        syncing = true
        const range = src.timeScale().getVisibleRange()
        if (range) dst.timeScale().setVisibleRange(range)
        syncing = false
      }
      priceChart.timeScale().subscribeVisibleTimeRangeChange(() => syncFrom(priceChart, rsiChart))
      rsiChart.timeScale().subscribeVisibleTimeRangeChange(()   => syncFrom(rsiChart, priceChart))

      refs.current = { priceChart, rsiChart, candleSeries, volSeries, rsiSeries }
      return () => { priceChart.remove(); rsiChart.remove() }
    } catch (e) {
      console.error('[Chart] init error:', e)
      setChartError(String(e))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update data whenever candles change.
  useEffect(() => {
    const { candleSeries, volSeries, rsiSeries, priceChart, rsiChart } = refs.current
    if (!candleSeries || !candles.length) return
    try {
      // Deduplicate and sort by time — LWC throws on duplicate timestamps.
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
    } catch (e) {
      console.error('[Chart] setData error:', e)
      setChartError(String(e))
    }
  }, [candles])

  // Update markers.
  useEffect(() => {
    const { candleSeries } = refs.current
    if (!candleSeries) return
    try {
      candleSeries.setMarkers(buildMarkers(orders))
    } catch (e) {
      console.error('[Chart] markers error:', e)
    }
  }, [orders])

  if (chartError) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24 }}>
        <span style={{ color: '#ef5350', fontSize: 14, fontWeight: 600 }}>Chart error</span>
        <code style={{ color: '#787b86', fontSize: 11, background: '#1e222d', padding: '8px 12px', borderRadius: 4, maxWidth: 480, wordBreak: 'break-all' }}>{chartError}</code>
        <button onClick={() => setChartError(null)} style={{ background: '#2196f3', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div ref={priceRef} style={{ flex: '0 0 68%', minHeight: 0 }} />
      <div style={{
        flex: '0 0 20px', display: 'flex', alignItems: 'center', flexShrink: 0,
        padding: '0 12px', background: '#1a1d27',
        color: '#787b86', fontSize: 11, fontWeight: 600, letterSpacing: 1,
        borderTop: '1px solid #2a2e39', borderBottom: '1px solid #2a2e39',
      }}>
        RSI ({rsiOversold} / {rsiOverbought})
      </div>
      <div ref={rsiRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}
