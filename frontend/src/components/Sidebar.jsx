const SIG_COLOR = { LONG: '#26a69a', SHORT: '#ef5350', NEUTRAL: '#787b86' }
const fmt = (n, d = 2) => n == null ? '—' : Number(n).toFixed(d)
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

function Section({ title, children }) {
  return (
    <div style={{ borderBottom: '1px solid #2a2e39', padding: '12px 0' }}>
      <div style={{ color: '#787b86', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '0 14px 8px' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 14px' }}>
      <span style={{ color: '#787b86' }}>{label}</span>
      <span style={{ color: valueColor ?? '#d1d4dc', fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  )
}

export default function Sidebar({ status, signals, orders }) {
  const balance = status?.paper_balance ?? {}
  const positions = status?.positions ?? {}
  const quote = Object.keys(balance).find(k => k !== (status?.symbol?.split('/')[0]))
  const base  = status?.symbol?.split('/')[0]
  const pos   = positions[status?.symbol]

  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: '#1e222d',
      borderLeft: '1px solid #2a2e39',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>

      {/* Paper balance */}
      {status?.mode === 'internal' && (
        <Section title="Paper Balance">
          {quote && <Row label={quote} value={`$${fmt(balance[quote])}`} valueColor="#f0c27f" />}
          {base  && <Row label={base}  value={fmt(balance[base], 6)} />}
          {pos && <Row label="Position" value={pos} valueColor={SIG_COLOR[pos]} />}
        </Section>
      )}

      {/* Recent signals */}
      <Section title={`Signals (last ${signals.length})`}>
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {signals.length === 0 && (
            <div style={{ color: '#787b86', padding: '0 14px', fontSize: 12 }}>No signals yet</div>
          )}
          {signals.map((s, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 14px',
              borderBottom: i < signals.length - 1 ? '1px solid #2a2e3966' : 'none',
            }}>
              <span style={{
                fontWeight: 700, fontSize: 11,
                color: SIG_COLOR[s.signal] ?? '#787b86',
                minWidth: 52,
              }}>
                {s.signal}
              </span>
              <span style={{ color: '#787b86', fontSize: 11 }}>
                RSI {fmt(s.reasoning?.technical_score)}
              </span>
              <span style={{ color: '#555', fontSize: 10 }}>{fmtTime(s.timestamp)}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Recent orders */}
      <Section title={`Orders (last ${orders.length})`}>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {orders.length === 0 && (
            <div style={{ color: '#787b86', padding: '0 14px', fontSize: 12 }}>No orders yet</div>
          )}
          {orders.map((o, i) => (
            <div key={i} style={{
              padding: '5px 14px',
              borderBottom: i < orders.length - 1 ? '1px solid #2a2e3966' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                <span style={{
                  fontWeight: 700, fontSize: 12,
                  color: o.side === 'buy' ? '#26a69a' : '#ef5350',
                }}>
                  {o.side?.toUpperCase()}
                </span>
                <span style={{ color: '#d1d4dc', fontSize: 12 }}>
                  ${fmt(o.price)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#787b86', fontSize: 11 }}>
                <span>{fmt(o.amount, 6)} {o.symbol?.split('/')[0]}</span>
                <span>{fmtTime(o.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </aside>
  )
}
