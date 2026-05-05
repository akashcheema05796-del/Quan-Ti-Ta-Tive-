import { useEffect, useRef, useState } from 'react'

const SIG = {
  LONG:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', border: 'rgba(16,185,129,0.35)',  glow: '0 0 16px rgba(16,185,129,0.25)' },
  SHORT:   { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e', border: 'rgba(244,63,94,0.35)',   glow: '0 0 16px rgba(244,63,94,0.25)' },
  NEUTRAL: { bg: 'rgba(99,102,241,0.08)',  color: '#818cf8', border: 'rgba(99,102,241,0.25)',  glow: 'none' },
}

function LivePrice({ price, prevPrice }) {
  const [cls, setCls] = useState('')

  useEffect(() => {
    if (price == null || prevPrice == null) return
    const dir = price > prevPrice ? 'flash-up' : price < prevPrice ? 'flash-down' : ''
    if (!dir) return
    setCls(dir)
    const t = setTimeout(() => setCls(''), 750)
    return () => clearTimeout(t)
  }, [price, prevPrice])

  if (price == null) return <span style={{ color: 'var(--muted)' }}>—</span>

  return (
    <span className={`tabular ${cls}`} style={{
      fontSize: 19, fontWeight: 700, letterSpacing: -0.6,
      transition: 'color 0.2s ease',
    }}>
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
    <span className="tabular" style={{
      fontSize: 11, fontWeight: 600,
      color: up ? 'var(--green)' : 'var(--red)',
      background: up ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
      border: `1px solid ${up ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
      padding: '2px 7px', borderRadius: 'var(--radius-pill)',
      transition: 'all 0.2s var(--ease)',
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(3)}%
    </span>
  )
}

export default function Header({ status, connected, symbol, livePrice, prevPrice, pnl, pnlPct }) {
  // sig is always one of LONG / SHORT / NEUTRAL due to the ?? fallback; L-6: no
  // second fallback needed on the SIG lookup.
  const sig = status?.latest_signal?.signal ?? 'NEUTRAL'
  const rsi = status?.latest_signal?.reasoning?.technical_score
  const s   = SIG[sig] ?? SIG.NEUTRAL
  const pnlUp = pnl >= 0
  const displaySymbol = symbol ?? status?.symbol ?? '—'

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '0 16px', height: 54,
      background: 'rgba(9, 12, 22, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 50,
    }}>

      {/* Logo */}
      <span style={{
        fontWeight: 800, fontSize: 13, letterSpacing: 0.5,
        background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        whiteSpace: 'nowrap',
      }}>
        ⚡ QTTV
      </span>

      <Sep />

      {/* Symbol + exchange */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
          {displaySymbol}
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500 }}>
          {status?.exchange ?? '—'}
        </span>
      </div>

      {/* Live price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <LivePrice price={livePrice} prevPrice={prevPrice} />
        <PriceDelta price={livePrice} prevPrice={prevPrice} />
      </div>

      <Sep />

      {/* Signal badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          {sig !== 'NEUTRAL' && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 8,
              background: s.color, opacity: 0.14,
              animation: 'ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
            }} />
          )}
          <span style={{
            padding: '4px 11px', borderRadius: 8,
            fontWeight: 700, fontSize: 11, letterSpacing: 0.6,
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
            boxShadow: s.glow,
            position: 'relative',
            transition: 'all 0.3s var(--ease)',
          }}>
            {sig}
          </span>
        </div>

        {rsi != null && (
          <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 500 }}>
            RSI{' '}
            <span className="tabular" style={{
              fontWeight: 700,
              color: rsi >= (status?.rsi_overbought ?? 70) ? 'var(--red)'
                   : rsi <= (status?.rsi_oversold   ?? 30) ? 'var(--green)'
                   : '#818cf8',
            }}>
              {rsi.toFixed(2)}
            </span>
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* P&L */}
      {status?.mode === 'internal' && pnl != null && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          lineHeight: 1.25, padding: '4px 12px',
          background: pnlUp ? 'rgba(16,185,129,0.07)' : 'rgba(244,63,94,0.07)',
          border: `1px solid ${pnlUp ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
          borderRadius: 'var(--radius-sm)',
          transition: 'all 0.3s var(--ease)',
        }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.6, fontWeight: 600, textTransform: 'uppercase' }}>P&L</span>
          <span className="tabular" style={{
            fontSize: 13, fontWeight: 700,
            color: pnlUp ? 'var(--green)' : 'var(--red)',
          }}>
            {pnlUp ? '+' : ''}{pnl.toFixed(2)}{' '}
            <span style={{ fontSize: 10, opacity: 0.75 }}>
              ({pnlUp ? '+' : ''}{pnlPct.toFixed(2)}%)
            </span>
          </span>
        </div>
      )}

      <Sep />

      {/* Mode badge */}
      {status?.mode && (
        <span style={{
          padding: '3px 9px', borderRadius: 'var(--radius-pill)',
          fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
          textTransform: 'uppercase',
          background: 'rgba(245,158,11,0.1)',
          color: 'var(--yellow)',
          border: '1px solid rgba(245,158,11,0.25)',
        }}>
          {status.mode}
        </span>
      )}

      {/* Connection dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
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
            boxShadow: connected ? 'var(--glow-green)' : 'var(--glow-red)',
          }} />
        </div>
        <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 500 }}>
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>
    </header>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />
}
