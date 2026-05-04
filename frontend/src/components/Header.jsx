const SIGNAL_STYLE = {
  LONG:    { background: '#26a69a22', color: '#26a69a', border: '1px solid #26a69a55' },
  SHORT:   { background: '#ef535022', color: '#ef5350', border: '1px solid #ef535055' },
  NEUTRAL: { background: '#78787822', color: '#787b86', border: '1px solid #78787855' },
}

export default function Header({ status, connected }) {
  const sig = status?.latest_signal?.signal ?? 'NEUTRAL'
  const reasoning = status?.latest_signal?.reasoning
  const rsi = reasoning?.technical_score

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 20,
      padding: '0 16px', height: 48,
      background: '#1e222d', borderBottom: '1px solid #2a2e39',
      flexShrink: 0,
    }}>
      {/* Logo + symbol */}
      <span style={{ fontWeight: 700, fontSize: 15, color: '#d1d4dc', letterSpacing: 0.5 }}>
        📈 Quan-Ti-Ta-Tive
      </span>

      <span style={{ color: '#2a2e39' }}>|</span>

      <span style={{ fontWeight: 600, color: '#d1d4dc' }}>
        {status?.symbol ?? '—'}
      </span>
      <span style={{ color: '#787b86' }}>{status?.timeframe ?? '—'}</span>
      <span style={{ color: '#787b86', fontSize: 12 }}>{status?.exchange ?? '—'}</span>

      <span style={{ color: '#2a2e39' }}>|</span>

      {/* Current signal badge */}
      <span style={{
        padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 12,
        ...SIGNAL_STYLE[sig] ?? SIGNAL_STYLE.NEUTRAL,
      }}>
        {sig}
      </span>

      {rsi != null && (
        <span style={{ color: '#787b86', fontSize: 12 }}>
          RSI <span style={{ color: '#d1d4dc', fontWeight: 600 }}>{Number(rsi).toFixed(2)}</span>
        </span>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Mode badge */}
      {status?.mode && (
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 11,
          background: status.mode === 'internal' ? '#f0c27f22' : '#ef535022',
          color:      status.mode === 'internal' ? '#f0c27f'   : '#ef5350',
          border:     `1px solid ${status.mode === 'internal' ? '#f0c27f44' : '#ef535044'}`,
        }}>
          {status.mode.toUpperCase()}
        </span>
      )}

      {/* WS connection dot */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#787b86' }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: connected ? '#26a69a' : '#ef5350',
          display: 'inline-block',
        }} />
        {connected ? 'Live' : 'Offline'}
      </span>
    </header>
  )
}
