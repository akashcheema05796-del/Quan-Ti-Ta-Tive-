import { useState, useEffect, useRef, useCallback } from 'react'
import Chart from './components/Chart.jsx'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d']

async function fetchJSON(url) {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export default function App() {
  const [candles,   setCandles]   = useState([])
  const [orders,    setOrders]    = useState([])
  const [signals,   setSignals]   = useState([])
  const [status,    setStatus]    = useState(null)
  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState(null)
  const [tf,        setTf]        = useState('15m')   // selected timeframe
  const [livePrice, setLivePrice] = useState(null)
  const [prevPrice, setPrevPrice] = useState(null)

  const wsRef      = useRef(null)
  const retryRef   = useRef(null)
  const fetchTimer = useRef(null)
  const tfRef      = useRef(tf)
  tfRef.current = tf

  const fetchAll = useCallback(async (timeframe) => {
    const useTf = timeframe ?? tfRef.current
    const [c, o, s, st] = await Promise.all([
      fetchJSON(`/api/candles?limit=200&timeframe=${useTf}`),
      fetchJSON('/api/orders?limit=50'),
      fetchJSON('/api/signals?limit=30'),
      fetchJSON('/api/status'),
    ])
    if (c === null && o === null && s === null && st === null) {
      setError('Backend not reachable — retrying…')
      fetchTimer.current = setTimeout(() => fetchAll(), 3000)
      return
    }
    setError(null)
    if (Array.isArray(c)) {
      setCandles(c)
      // seed live price from latest close
      const last = c[c.length - 1]
      if (last) { setPrevPrice(null); setLivePrice(last.close) }
    }
    if (Array.isArray(o)) setOrders(o)
    if (Array.isArray(s)) setSignals(s)
    if (st) setStatus(st)
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      clearTimeout(retryRef.current)
      fetchAll()
    }

    ws.onmessage = (evt) => {
      let msg
      try { msg = JSON.parse(evt.data) } catch { return }

      if (msg.type === 'candle') {
        const bar = msg.data
        // update live price with animated flash
        setLivePrice(prev => { setPrevPrice(prev); return bar.close })
        setCandles(prev => {
          const idx = prev.findIndex(c => c.time === bar.time)
          if (idx >= 0) {
            const next = [...prev]; next[idx] = { ...next[idx], ...bar }; return next
          }
          return [...prev, bar].sort((a, b) => a.time - b.time)
        })
      }

      if (msg.type === 'signal') {
        setSignals(prev => [msg.data, ...prev].slice(0, 30))
        setStatus(prev => prev ? { ...prev, latest_signal: msg.data } : prev)
        fetchJSON('/api/status').then(st => { if (st) setStatus(st) })
      }

      if (msg.type === 'order') {
        setOrders(prev => [msg.data, ...prev].slice(0, 50))
        fetchJSON('/api/status').then(st => { if (st) setStatus(st) })
      }
    }

    ws.onclose = () => { setConnected(false); retryRef.current = setTimeout(connect, 3000) }
    ws.onerror = () => ws.close()
  }, [fetchAll])

  useEffect(() => {
    fetchAll()
    connect()
    return () => {
      clearTimeout(retryRef.current)
      clearTimeout(fetchTimer.current)
      wsRef.current?.close()
    }
  }, [fetchAll, connect])

  // Refetch candles when timeframe changes
  const handleTf = (newTf) => {
    setTf(newTf)
    setCandles([])
    fetchAll(newTf)
  }

  const rsiOverbought = status?.rsi_overbought ?? 70
  const rsiOversold   = status?.rsi_oversold   ?? 30

  // P&L
  const initBalance = 10000
  const usdtBal = status?.paper_balance?.USDT ?? initBalance
  const baseBal  = status?.paper_balance?.[status?.symbol?.split('/')[0]] ?? 0
  const totalVal = usdtBal + baseBal * (livePrice ?? 0)
  const pnl      = totalVal - initBalance
  const pnlPct   = (pnl / initBalance) * 100

  const chartArea = () => {
    if (error && candles.length === 0) return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <span style={{ color: '#ef5350', fontSize: 14 }}>{error}</span>
        <span style={{ color: '#7d8590', fontSize: 12 }}>Make sure <code>python main.py</code> is running</span>
      </div>
    )
    if (candles.length === 0) return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8590', fontSize: 14 }}>
        {connected ? 'Loading candle data…' : 'Connecting to bot…'}
      </div>
    )
    return (
      <Chart candles={candles} orders={orders}
        rsiOverbought={rsiOverbought} rsiOversold={rsiOversold} />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <Header
        status={status} connected={connected}
        livePrice={livePrice} prevPrice={prevPrice}
        pnl={pnl} pnlPct={pnlPct}
      />

      {/* Toolbar: timeframe selector */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 12px',
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--muted)', fontSize: 11, marginRight: 6, fontWeight: 600, letterSpacing: 0.5 }}>TF</span>
        {TIMEFRAMES.map(t => (
          <button key={t} className={`tf-btn${tf === t ? ' active' : ''}`}
            onClick={() => handleTf(t)}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {error && (
          <span style={{ color: 'var(--red)', fontSize: 11 }}>{error}</span>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {chartArea()}
        </div>
        <Sidebar
          status={status} signals={signals} orders={orders}
          livePrice={livePrice} pnl={pnl} pnlPct={pnlPct}
          rsiOverbought={rsiOverbought} rsiOversold={rsiOversold}
        />
      </div>
    </div>
  )
}
