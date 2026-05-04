import { useState, useEffect, useRef, useCallback } from 'react'
import Chart from './components/Chart.jsx'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import CryptoList from './components/CryptoList.jsx'

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
  const [tf,        setTf]        = useState('15m')
  const [symbol,    setSymbol]    = useState('BTC/USDT')
  const [livePrice, setLivePrice] = useState(null)
  const [prevPrice, setPrevPrice] = useState(null)

  const wsRef      = useRef(null)
  const retryRef   = useRef(null)
  const fetchTimer = useRef(null)
  const tfRef      = useRef(tf)
  const symbolRef  = useRef(symbol)
  tfRef.current     = tf
  symbolRef.current = symbol

  const fetchAll = useCallback(async (timeframe, sym) => {
    const useTf  = timeframe ?? tfRef.current
    const useSym = sym ?? symbolRef.current
    const [c, o, s, st] = await Promise.all([
      fetchJSON(`/api/candles?limit=200&timeframe=${useTf}&symbol=${encodeURIComponent(useSym)}`),
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
      const last = c[c.length - 1]
      if (last) { setPrevPrice(null); setLivePrice(last.close) }
    }
    if (Array.isArray(o)) setOrders(o)
    if (Array.isArray(s)) setSignals(s)
    if (st) {
      setStatus(st)
      // Sync symbol to bot's trading symbol on first load
      if (!sym && symbolRef.current === 'BTC/USDT' && st.symbol) {
        setSymbol(st.symbol)
        symbolRef.current = st.symbol
      }
    }
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
        // Only update live price/candles if WS event matches the viewed symbol
        // (WS only pushes bot's trading symbol)
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

  const handleTf = (newTf) => {
    setTf(newTf)
    setCandles([])
    fetchAll(newTf, symbolRef.current)
  }

  const handleSymbol = (newSymbol) => {
    setSymbol(newSymbol)
    setCandles([])
    setLivePrice(null)
    setPrevPrice(null)
    fetchAll(tfRef.current, newSymbol)
  }

  const rsiOverbought = status?.rsi_overbought ?? 70
  const rsiOversold   = status?.rsi_oversold   ?? 30

  // P&L (only meaningful when viewing the bot's trading symbol)
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
        {connected ? `Loading ${symbol}…` : 'Connecting to bot…'}
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
        symbol={symbol}
        livePrice={livePrice} prevPrice={prevPrice}
        pnl={pnl} pnlPct={pnlPct}
      />

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 12px 5px 168px',
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--muted)', fontSize: 10, marginRight: 6, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>TF</span>
        {TIMEFRAMES.map(t => (
          <button key={t} className={`tf-btn${tf === t ? ' active' : ''}`} onClick={() => handleTf(t)}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {error && <span style={{ color: 'var(--red)', fontSize: 11 }}>{error}</span>}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <CryptoList symbol={symbol} onSymbolChange={handleSymbol} />

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
