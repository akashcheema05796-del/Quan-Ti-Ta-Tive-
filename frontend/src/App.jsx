import { useState, useEffect, useRef, useCallback } from 'react'
import Chart from './components/Chart.jsx'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

// Fetch JSON, returning null on any error instead of throwing.
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
  const wsRef      = useRef(null)
  const retryRef   = useRef(null)
  const fetchTimer = useRef(null)

  const fetchAll = useCallback(async () => {
    const [c, o, s, st] = await Promise.all([
      fetchJSON('/api/candles?limit=200'),
      fetchJSON('/api/orders?limit=50'),
      fetchJSON('/api/signals?limit=30'),
      fetchJSON('/api/status'),
    ])

    if (c === null && o === null && s === null && st === null) {
      // Backend not ready yet — retry in 3s
      setError('Backend not reachable — retrying…')
      fetchTimer.current = setTimeout(fetchAll, 3000)
      return
    }

    setError(null)
    if (Array.isArray(c)) setCandles(c)
    if (Array.isArray(o)) setOrders(o)
    if (Array.isArray(s)) setSignals(s)
    if (st)               setStatus(st)
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      clearTimeout(retryRef.current)
      // Refresh all data once connected to catch up on anything missed
      fetchAll()
    }

    ws.onmessage = (evt) => {
      let msg
      try { msg = JSON.parse(evt.data) } catch { return }

      if (msg.type === 'candle') {
        const bar = msg.data
        setCandles(prev => {
          const idx = prev.findIndex(c => c.time === bar.time)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = { ...next[idx], ...bar }
            return next
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

    ws.onclose = () => {
      setConnected(false)
      retryRef.current = setTimeout(connect, 3000)
    }

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

  const rsiOverbought = status?.rsi_overbought ?? 70
  const rsiOversold   = status?.rsi_oversold   ?? 30

  const chartArea = () => {
    if (error && candles.length === 0) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <span style={{ color: '#ef5350', fontSize: 14 }}>{error}</span>
          <span style={{ color: '#787b86', fontSize: 12 }}>Make sure <code>python main.py</code> is running</span>
        </div>
      )
    }
    if (candles.length === 0) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#787b86', fontSize: 14 }}>
          {connected ? 'Loading candle data…' : 'Connecting to bot…'}
        </div>
      )
    }
    return (
      <Chart
        candles={candles}
        orders={orders}
        rsiOverbought={rsiOverbought}
        rsiOversold={rsiOversold}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header status={status} connected={connected} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {chartArea()}
        </div>
        <Sidebar status={status} signals={signals} orders={orders} />
      </div>
    </div>
  )
}
