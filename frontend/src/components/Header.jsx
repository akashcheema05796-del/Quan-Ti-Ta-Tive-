import { useEffect, useRef, useState } from 'react'

const SIG = {
  LONG:    { bg: '#26a69a18', color: '#26a69a', border: '#26a69a44' },
  SHORT:   { bg: '#ef535018', color: '#ef5350', border: '#ef535044' },
  NEUTRAL: { bg: '#7d859018', color: '#7d8590', border: '#7d859044' },
}

function LivePrice({ price, prevPrice }) {
  const [cls, setCls] = useState('')
  const prev = useRef(price)

  useEffect(() => {
    if (price == null || prevPrice == null) return
    const dir = price > prevPrice ? 'flash-up' : price < prevPrice ? 'flash-down' : ''
    if (!dir) return
    setCls(dir)
    const t = setTimeout(() => setCls(''), 700)
    prev.current = price
    return () => clearTimeout(t)
  }, [price, prevPrice])

  if (price == null) return <span style={{ color: 'var(--muted)' }}>—</span>

  return (
    <span className={`tabular ${cls}`} style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>
      ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

function PriceDelta({ price, prevPrice }) {
  if (price == null || prevPrice == null || prevPrice === 0) return null
  const delta = price - prevPrice
  const pct   = (delta / prevPrice) * 100
  const up    = delta >= 0
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color: up ? 'var(--green)' : 'var(--red)',
      background: up ? '#26a69a18' : '#ef535018',
      padding: '1px 6px', borderRadius: 4,
    }} className="tabular">
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(3)}%
    </span>
  )
}

export default function Header({ status, connected, symbol, livePrice, prevPrice, pnl, pnlPct }) {
  const sig   = status?.latest_signal?.signal ?? 'NEUTRAL'
  const rsi   = status?.latest_signal?.reasoning?.technical_score
  const s     = SIG[sig] ?? SIG.NEUTRAL
  const pnlUp = pnl >= 0
  const displaySymbol = symbol ?? status?.symbol ?? '—'

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 14px', height: 52,
      background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
        ⚡ QTTV
      </span>

      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Symbol + exchange */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
          {displaySymbol}
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {status?.exchange ?? '—'}
        </span>
      </div>

      {/* Live price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <LivePrice price={livePrice} prevPrice={prevPrice} />
        <PriceDelta price={livePrice} prevPrice={prevPrice} />
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Signal badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {sig !== 'NEUTRAL' && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 5,
              background: s.color, opacity: 0.15,
              animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
            }} />
          )}
          <span style={{
            padding: '3px 10px', borderRadius: 5,
            fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
            position: 'relative',
          }}>
            {sig}
          </span>
        </div>

        {rsi != null && (
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>
            RSI{' '}
            <span style={{
              color: rsi >= (status?.rsi_overbought ?? 70) ? 'var(--red)'
                   : rsi <= (status?.rsi_oversold   ?? 30) ? 'var(--green)'
                   : 'var(--text)',
              fontWeight: 600,
            }} className="tabular">
              {rsi.toFixed(2)}
            </span>
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* P&L */}
      {status?.mode === 'internal' && pnl != null && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5 }}>P&L</span>
          <span className="tabular" style={{
            fontSize: 13, fontWeight: 700,
            color: pnlUp ? 'var(--green)' : 'var(--red)',
          }}>
            {pnlUp ? '+' : ''}{pnl.toFixed(2)} ({pnlUp ? '+' : ''}{pnlPct.toFixed(2)}%)
          </span>
        </div>
      )}

      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Mode */}
      {status?.mode && (
        <span style={{
          padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
          letterSpacing: 0.6, textTransform: 'uppercase',
          background: '#f0c27f18', color: 'var(--yellow)',
          border: '1px solid #f0c27f33',
        }}>
          {status.mode}
        </span>
      )}

      {/* Connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ position: 'relative', width: 8, height: 8 }}>
          {connected && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'var(--green)',
              animation: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite',
            }} />
          )}
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: connected ? 'var(--green)' : 'var(--red)',
          }} />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 500 }}>
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>
    </header>
  )
}
