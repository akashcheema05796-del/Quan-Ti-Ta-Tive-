import { useEffect, useRef } from 'react'

const SIG_COLOR = { LONG: '#10b981', SHORT: '#f43f5e', NEUTRAL: '#818cf8' }
const SIG_ICON  = { LONG: '▲', SHORT: '▼', NEUTRAL: '—' }
const fmt    = (n, d = 2) => n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtAmt = (n, d = 5) => n == null ? '—' : Number(n).toFixed(d)
const fmtTime = ts => {
  if (!ts) return '—'
  const d = new Date(ts)
  return isNaN(d) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ── RSI Gauge ──────────────────────────────────── */
function RsiGauge({ value, overbought = 70, oversold = 30 }) {
  const r = 34, cx = 44, cy = 44
  const circ = 2 * Math.PI * r
  const pct  = Math.max(0, Math.min(100, value ?? 50)) / 100
  const dash = pct * circ
  const color = value >= overbought ? '#f43f5e'
              : value <= oversold   ? '#10b981'
              : '#6366f1'
  const glow  = value >= overbought ? '0 0 20px rgba(244,63,94,0.4)'
              : value <= oversold   ? '0 0 20px rgba(16,185,129,0.4)'
              : '0 0 20px rgba(99,102,241,0.3)'

  return (
    <svg width={88} height={88} viewBox="0 0 88 88" style={{ display: 'block', filter: `drop-shadow(${glow})` }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      {/* Progress */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.25,0.46,0.45,0.94), stroke 0.4s ease' }}
      />
      {/* Value */}
      <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="16" fontWeight="800" fontFamily="Inter,sans-serif">
        {value != null ? value.toFixed(1) : '—'}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle"
        fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Inter,sans-serif" letterSpacing="2" fontWeight="600">
        RSI
      </text>
    </svg>
  )
}

/* ── Section ────────────────────────────────────── */
function Section({ title, children, action }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 14px 7px',
      }}>
        <span style={{
          color: 'var(--muted)', fontSize: 9.5, fontWeight: 700,
          letterSpacing: 1.2, textTransform: 'uppercase',
        }}>
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ── Animated number ────────────────────────────── */
function AnimNum({ value, prefix = '', suffix = '', decimals = 2, color }) {
  const prev = useRef(value)
  const ref  = useRef(null)

  useEffect(() => {
    if (prev.current === value || ref.current == null) { prev.current = value; return }
    const dir = value > prev.current ? 'flash-up' : 'flash-down'
    ref.current.classList.remove('flash-up', 'flash-down')
    void ref.current.offsetWidth
    ref.current.classList.add(dir)
    prev.current = value
  }, [value])

  return (
    <span ref={ref} className="tabular" style={{ color: color ?? 'var(--text)', fontWeight: 600 }}>
      {prefix}{value != null ? Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—'}{suffix}
    </span>
  )
}

export default function Sidebar({ status, signals, orders, livePrice, pnl, pnlPct, rsiOverbought = 70, rsiOversold = 30 }) {
  const balance  = status?.paper_balance ?? {}
  const positions = status?.positions ?? {}
  const base  = status?.symbol?.split('/')[0] ?? 'BTC'
  const quote = status?.symbol?.split('/')[1] ?? 'USDT'
  const pos   = positions[status?.symbol]
  const rsi   = status?.latest_signal?.reasoning?.technical_score
  const pnlUp = (pnl ?? 0) >= 0

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      background: 'rgba(9,12,22,0.6)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>

      {/* ── RSI Gauge section ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 14px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        <RsiGauge value={rsi} overbought={rsiOverbought} oversold={rsiOversold} />
        <div style={{ flex: 1, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 9.5, letterSpacing: 0.8, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase' }}>Overbought</div>
            <RsiThreshLine pct={rsiOverbought} color="var(--red)" />
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 9.5, letterSpacing: 0.8, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase' }}>Oversold</div>
            <RsiThreshLine pct={rsiOversold} color="var(--green)" />
          </div>
          <div style={{ marginTop: 2 }}>
            <div style={{ color: 'var(--muted)', fontSize: 9.5, letterSpacing: 0.8, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Signal</div>
            <SignalPill sig={status?.latest_signal?.signal ?? 'NEUTRAL'} />
          </div>
        </div>
      </div>

      {/* ── Paper Portfolio ── */}
      {status?.mode === 'internal' && (
        <Section title="Portfolio">
          <div style={{ padding: '6px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* P&L card */}
            <div style={{
              background: pnlUp
                ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.04) 100%)'
                : 'linear-gradient(135deg, rgba(244,63,94,0.1) 0%, rgba(244,63,94,0.04) 100%)',
              border: `1px solid ${pnlUp ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
              borderRadius: 'var(--radius)',
              padding: '9px 11px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: pnlUp ? '0 4px 16px rgba(16,185,129,0.08)' : '0 4px 16px rgba(244,63,94,0.08)',
            }}>
              <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 500 }}>Total P&L</span>
              <span className="tabular" style={{ fontWeight: 700, fontSize: 13, color: pnlUp ? 'var(--green)' : 'var(--red)' }}>
                {pnlUp ? '+' : ''}{pnl != null ? pnl.toFixed(2) : '—'}
                <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.75 }}>
                  ({pnlUp ? '+' : ''}{pnlPct != null ? pnlPct.toFixed(2) : '—'}%)
                </span>
              </span>
            </div>

            <BalRow label={quote} value={`$${fmt(balance[quote])}`} />
            <BalRow label={base}  value={fmtAmt(balance[base])} />
            {livePrice != null && balance[base] > 0 && (
              <BalRow label={`${base} value`} value={`$${fmt(balance[base] * livePrice)}`} dim />
            )}
            {pos && (
              <BalRow label="Position" value={pos} valueColor={SIG_COLOR[pos]} />
            )}
          </div>
        </Section>
      )}

      {/* ── Signals ── */}
      <Section title="Signals" action={
        <CountBadge n={signals.length} />
      }>
        <div style={{ maxHeight: 210, overflowY: 'auto' }}>
          {signals.length === 0
            ? <Empty text="Waiting for signals…" />
            : signals.map((s, i) => (
              <div key={i} className={i === 0 ? 'slide-right' : ''} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '6px 14px',
                borderBottom: i < signals.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.15s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  width: 22, textAlign: 'center', fontWeight: 700, fontSize: 13,
                  color: SIG_COLOR[s.signal] ?? 'var(--muted)',
                }}>
                  {SIG_ICON[s.signal] ?? '—'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 11, color: SIG_COLOR[s.signal] ?? 'var(--muted)' }}>
                      {s.signal}
                    </span>
                    <span className="tabular" style={{ color: 'var(--muted)', fontSize: 10 }}>
                      {fmtTime(s.timestamp)}
                    </span>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>
                    RSI{' '}
                    <span className="tabular" style={{ color: 'var(--muted2)' }}>
                      {s.reasoning?.technical_score?.toFixed(2) ?? '—'}
                    </span>
                  </span>
                </div>
              </div>
            ))
          }
        </div>
      </Section>

      {/* ── Orders ── */}
      <Section title="Orders" action={
        <CountBadge n={orders.length} />
      }>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {orders.length === 0
            ? <Empty text="No orders yet" />
            : orders.map((o, i) => {
              const isBuy = o.side === 'buy'
              return (
                <div key={i} className={i === 0 ? 'slide-right' : ''} style={{
                  padding: '7px 14px',
                  borderBottom: i < orders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition: 'background 0.15s ease',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{
                      fontWeight: 700, fontSize: 10.5, letterSpacing: 0.5,
                      color: isBuy ? 'var(--green)' : 'var(--red)',
                      background: isBuy ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                      border: `1px solid ${isBuy ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
                      padding: '1px 7px', borderRadius: 'var(--radius-pill)',
                    }}>
                      {o.side?.toUpperCase()}
                    </span>
                    <span className="tabular" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
                      ${fmt(o.price)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 10 }}>
                    <span className="tabular">{fmtAmt(o.amount)} {o.symbol?.split('/')[0] ?? base}</span>
                    <span>{fmtTime(o.timestamp ?? o.created_at)}</span>
                  </div>
                </div>
              )
            })
          }
        </div>
      </Section>
    </aside>
  )
}

function BalRow({ label, value, valueColor, dim }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0' }}>
      <span style={{ color: 'var(--muted)', fontSize: 11 }}>{label}</span>
      <span className="tabular" style={{ fontWeight: 600, fontSize: 12, color: valueColor ?? (dim ? 'var(--muted2)' : 'var(--text)') }}>
        {value}
      </span>
    </div>
  )
}

function RsiThreshLine({ pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        flex: 1, height: 3,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-pill)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 'var(--radius-pill)',
          transition: 'width 0.5s var(--ease)',
        }} />
      </div>
      <span className="tabular" style={{ color, fontSize: 10, fontWeight: 700, minWidth: 22, textAlign: 'right' }}>
        {pct}
      </span>
    </div>
  )
}

function SignalPill({ sig }) {
  const map = {
    LONG:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', border: 'rgba(16,185,129,0.3)',  label: 'LONG' },
    SHORT:   { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e', border: 'rgba(244,63,94,0.3)',   label: 'SHORT' },
    NEUTRAL: { bg: 'rgba(99,102,241,0.1)',   color: '#818cf8', border: 'rgba(99,102,241,0.25)', label: 'NEUTRAL' },
  }
  const c = map[sig] ?? map.NEUTRAL
  return (
    <span style={{
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      fontWeight: 700, fontSize: 10, padding: '2px 9px',
      borderRadius: 'var(--radius-pill)', letterSpacing: 0.6,
      boxShadow: `0 0 10px ${c.color}22`,
    }}>
      {c.label}
    </span>
  )
}

function CountBadge({ n }) {
  return (
    <span style={{
      color: 'var(--muted)', fontSize: 10, fontWeight: 600,
      background: 'var(--glass2)',
      border: '1px solid var(--border)',
      padding: '1px 6px', borderRadius: 'var(--radius-pill)',
    }}>
      {n}
    </span>
  )
}

function Empty({ text }) {
  return (
    <div style={{
      color: 'var(--muted)', padding: '10px 14px',
      fontSize: 11, fontStyle: 'italic',
      opacity: 0.7,
    }}>
      {text}
    </div>
  )
}
