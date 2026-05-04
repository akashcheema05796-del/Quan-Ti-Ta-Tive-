import { useState } from 'react'

const CRYPTOS = [
  { symbol: 'BTC/USDT',  name: 'Bitcoin',      tag: 'BTC'   },
  { symbol: 'ETH/USDT',  name: 'Ethereum',     tag: 'ETH'   },
  { symbol: 'SOL/USDT',  name: 'Solana',       tag: 'SOL'   },
  { symbol: 'BNB/USDT',  name: 'BNB',          tag: 'BNB'   },
  { symbol: 'XRP/USDT',  name: 'XRP',          tag: 'XRP'   },
  { symbol: 'DOGE/USDT', name: 'Dogecoin',     tag: 'DOGE'  },
  { symbol: 'ADA/USDT',  name: 'Cardano',      tag: 'ADA'   },
  { symbol: 'AVAX/USDT', name: 'Avalanche',    tag: 'AVAX'  },
  { symbol: 'DOT/USDT',  name: 'Polkadot',     tag: 'DOT'   },
  { symbol: 'LINK/USDT', name: 'Chainlink',    tag: 'LINK'  },
  { symbol: 'MATIC/USDT',name: 'Polygon',      tag: 'MATIC' },
  { symbol: 'UNI/USDT',  name: 'Uniswap',      tag: 'UNI'   },
  { symbol: 'ATOM/USDT', name: 'Cosmos',       tag: 'ATOM'  },
  { symbol: 'LTC/USDT',  name: 'Litecoin',     tag: 'LTC'   },
  { symbol: 'TRX/USDT',  name: 'TRON',         tag: 'TRX'   },
  { symbol: 'BCH/USDT',  name: 'Bitcoin Cash', tag: 'BCH'   },
  { symbol: 'ETC/USDT',  name: 'ETH Classic',  tag: 'ETC'   },
  { symbol: 'FIL/USDT',  name: 'Filecoin',     tag: 'FIL'   },
  { symbol: 'APT/USDT',  name: 'Aptos',        tag: 'APT'   },
  { symbol: 'ARB/USDT',  name: 'Arbitrum',     tag: 'ARB'   },
]

// Unique colour per tag (deterministic, no external dep)
function tagColor(tag) {
  const palette = ['#2196f3','#26a69a','#f0c27f','#bb86fc','#ef5350','#4fc3f7','#80cbc4','#ffb74d']
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff
  return palette[h % palette.length]
}

export default function CryptoList({ symbol, onSymbolChange }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? CRYPTOS.filter(c =>
        c.tag.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : CRYPTOS

  return (
    <aside style={{
      width: 156, flexShrink: 0,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 10px 6px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
          Markets
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          style={{
            width: '100%', background: 'var(--bg3)',
            border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', fontSize: 11,
            padding: '4px 8px', outline: 'none',
            fontFamily: 'var(--font)',
          }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 11, padding: '10px', fontStyle: 'italic' }}>
            No results
          </div>
        )}
        {filtered.map(c => {
          const active = c.symbol === symbol
          const color  = tagColor(c.tag)
          return (
            <button
              key={c.symbol}
              onClick={() => onSymbolChange(c.symbol)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', textAlign: 'left',
                background: active ? `${color}18` : 'transparent',
                borderLeft: `2px solid ${active ? color : 'transparent'}`,
                borderRight: 'none', borderTop: 'none', borderBottom: '1px solid #161b22',
                cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg3)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              {/* Tag badge */}
              <span style={{
                minWidth: 32, textAlign: 'center',
                fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                color, background: `${color}22`,
                borderRadius: 3, padding: '2px 4px',
              }}>
                {c.tag}
              </span>

              {/* Name */}
              <span style={{
                fontSize: 11, color: active ? 'var(--text)' : 'var(--muted)',
                fontWeight: active ? 600 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c.name}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
