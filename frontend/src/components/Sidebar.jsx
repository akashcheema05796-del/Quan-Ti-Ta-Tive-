import { useEffect, useRef } from 'react'

const SIG_COLOR = { LONG: '#26a69a', SHORT: '#ef5350', NEUTRAL: '#7d8590' }
const SIG_ICON  = { LONG: '▲', SHORT: '▼', NEUTRAL: '—' }
const fmt    = (n, d = 2) => n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtAmt = (n, d = 5) => n == null ? '—' : Number(n).toFixed(d)
const fmtTime = ts => {
  if (!ts) return '—'
  const d = new Date(ts)
  return isNaN(d) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ── RSI Gauge ───────────────────────────────── */
function RsiGauge({ value, overbought = 70, oversold = 30 }) {
  const r = 34, cx = 44, cy = 44
  const circ = 2 * Math.PI * r
  const pct  = Math.max(0, Math.min(100, value ?? 50)) / 100
  const dash = pct * circ
  const color = value >= overbought ? '#ef5350'
              : value <= oversold   ? '#26a69a'
              : '#2196f3'

  return (
    <svg width={88} height={88} viewBox="0 0 88 88" style={{ display: 'block' }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c2128" strokeWidth={7} />
      {/* Progress */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
      />
      {/* Value */}
      <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="15" fontWeight="700" fontFamily="Inter,sans-serif">
        {value != null ? value.toFixed(1) : '—'}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle"
        fill="#7d8590" fontSize="9" fontFamily="Inter,sans-serif" letterSpacing="1">
        RSI
      </text>
    </svg>
  )
}

/* ── Section wrapper ─────────────────────────── */
function Section({ title, children, action }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 6px',
      }}>
        <span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ── Animated number ─────────────────────────── */
function AnimNum({ value, prefix = '', suffix = '', decimals = 2, color }) {
  const prev  = useRef(value)
  const ref   = useRef(null)
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
      width: 256, flexShrink: 0,
      background: 'var(--bg2)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>

      {/* ── RSI Gauge ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 14px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        <RsiGauge value={rsi} overbought={rsiOverbought} oversold={rsiOversold} />
        <div style={{ flex: 1, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: 0.5, marginBottom: 2 }}>OVERBOUGHT</div>
            <RsiThreshLine pct={rsiOverbought} color="var(--red)" />
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: 0.5, marginBottom: 2 }}>OVERSOLD</div>
            <RsiThreshLine pct={rsiOversold} color="var(--green)" />
          </div>
          <div style={{ marginTop: 4 }}>
            <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: 0.5, marginBottom: 1 }}>SIGNAL</div>
            <SignalPill sig={status?.latest_signal?.signal ?? 'NEUTRAL'} />
          </div>
        </div>
      </div>

      {/* ── Paper Balance ── */}
      {status?.mode === 'internal' && (
        <Section title="Paper Portfolio">
          <div style={{ padding: '6px 14px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>

            {/* P&L bar */}
            <div style={{
              background: pnlUp ? '#26a69a18' : '#ef535018',
              border: `1px solid ${pnlUp ? '#26a69a33' : '#ef535033'}`,
              borderRadius: 6, padding: '8px 10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>Total P&L</span>
              <span className="tabular" style={{ fontWeight: 700, fontSize: 13, color: pnlUp ? 'var(--green)' : 'var(--red)' }}>
                {pnlUp ? '+' : ''}{pnl != null ? pnl.toFixed(2) : '—'}
                <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>
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
      <Section title={`Signals`} action={
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>{signals.length}</span>
      }>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {signals.length === 0
            ? <Empty text="No signals yet" />
            : signals.map((s, i) => (
              <div key={i} className={i === 0 ? 'slide-right' : ''} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 14px',
                borderBottom: i < signals.length - 1 ? '1px solid #2a2e3944' : 'none',
              }}>
                <span style={{
                  width: 24, textAlign: 'center', fontWeight: 700, fontSize: 12,
                  color: SIG_COLOR[s.signal] ?? 'var(--muted)',
                }}>
                  {SIG_ICON[s.signal] ?? '—'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 11, color: SIG_COLOR[s.signal] ?? 'var(--muted)' }}>
                      {s.signal}
                    </span>
                    <span className="tabular" style={{ color: 'var(--muted)', fontSize: 10 }}>
                      {fmtTime(s.timestamp)}
                    </span>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>
                    RSI <span className="tabular" style={{ color: 'var(--text)' }}>
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
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>{orders.length}</span>
      }>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {orders.length === 0
            ? <Empty text="No orders yet" />
            : orders.map((o, i) => {
              const isBuy = o.side === 'buy'
              return (
                <div key={i} className={i === 0 ? 'slide-right' : ''} style={{
                  padding: '6px 14px',
                  borderBottom: i < orders.length - 1 ? '1px solid #2a2e3944' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{
                      fontWeight: 700, fontSize: 11, letterSpacing: 0.3,
                      color: isBuy ? 'var(--green)' : 'var(--red)',
                      background: isBuy ? '#26a69a18' : '#ef535018',
                      padding: '1px 6px', borderRadius: 3,
                    }}>
                      {o.side?.toUpperCase()}
                    </span>
                    <span className="tabular" style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--muted)', fontSize: 11 }}>{label}</span>
      <span className="tabular" style={{ fontWeight: 600, fontSize: 12, color: valueColor ?? (dim ? 'var(--muted)' : 'var(--text)') }}>
        {value}
      </span>
    </div>
  )
}

function RsiThreshLine({ pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ flex: 1, height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span className="tabular" style={{ color, fontSize: 10, fontWeight: 700, minWidth: 22, textAlign: 'right' }}>{pct}</span>
    </div>
  )
}

function SignalPill({ sig }) {
  const s = { LONG: { bg:'#26a69a18', color:'#26a69a', label:'LONG' }, SHORT: { bg:'#ef535018', color:'#ef5350', label:'SHORT' }, NEUTRAL: { bg:'#7d859018', color:'#7d8590', label:'NEUTRAL' } }
  const c = s[sig] ?? s.NEUTRAL
  return (
    <span style={{ background: c.bg, color: c.color, fontWeight: 700, fontSize: 10, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>
      {c.label}
    </span>
  )
}

function Empty({ text }) {
  return (
    <div style={{ color: 'var(--muted)', padding: '8px 14px', fontSize: 11, fontStyle: 'italic' }}>
      {text}
    </div>
  )
}
