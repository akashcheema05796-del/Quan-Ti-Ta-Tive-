import { useState } from 'react'

const CRYPTOS = [
  { symbol: 'BTC/USDT',   name: 'Bitcoin',      tag: 'BTC'   },
  { symbol: 'ETH/USDT',   name: 'Ethereum',     tag: 'ETH'   },
  { symbol: 'SOL/USDT',   name: 'Solana',       tag: 'SOL'   },
  { symbol: 'BNB/USDT',   name: 'BNB',          tag: 'BNB'   },
  { symbol: 'XRP/USDT',   name: 'XRP',          tag: 'XRP'   },
  { symbol: 'DOGE/USDT',  name: 'Dogecoin',     tag: 'DOGE'  },
  { symbol: 'ADA/USDT',   name: 'Cardano',      tag: 'ADA'   },
  { symbol: 'AVAX/USDT',  name: 'Avalanche',    tag: 'AVAX'  },
  { symbol: 'DOT/USDT',   name: 'Polkadot',     tag: 'DOT'   },
  { symbol: 'LINK/USDT',  name: 'Chainlink',    tag: 'LINK'  },
  { symbol: 'MATIC/USDT', name: 'Polygon',      tag: 'MATIC' },
  { symbol: 'UNI/USDT',   name: 'Uniswap',      tag: 'UNI'   },
  { symbol: 'ATOM/USDT',  name: 'Cosmos',       tag: 'ATOM'  },
  { symbol: 'LTC/USDT',   name: 'Litecoin',     tag: 'LTC'   },
  { symbol: 'TRX/USDT',   name: 'TRON',         tag: 'TRX'   },
  { symbol: 'BCH/USDT',   name: 'Bitcoin Cash', tag: 'BCH'   },
  { symbol: 'ETC/USDT',   name: 'ETH Classic',  tag: 'ETC'   },
  { symbol: 'FIL/USDT',   name: 'Filecoin',     tag: 'FIL'   },
  { symbol: 'APT/USDT',   name: 'Aptos',        tag: 'APT'   },
  { symbol: 'ARB/USDT',   name: 'Arbitrum',     tag: 'ARB'   },
]

function tagColor(tag) {
  const palette = ['#6366f1', '#10b981', '#f59e0b', '#a855f7', '#f43f5e', '#22d3ee', '#34d399', '#fb923c']
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff
  return palette[h % palette.length]
}

export default function CryptoList({ symbol, onSymbolChange }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const filtered = query.trim()
    ? CRYPTOS.filter(c =>
        c.tag.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : CRYPTOS

  return (
    <aside style={{
      width: 160, flexShrink: 0,
      background: 'rgba(9,12,22,0.6)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 10px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          color: 'var(--muted)', fontSize: 9, fontWeight: 700,
          letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8,
        }}>
          Markets
        </div>
        <div style={{
          position: 'relative',
          boxShadow: focused ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
          borderRadius: 'var(--radius-sm)',
          transition: 'box-shadow 0.18s var(--ease)',
        }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search…"
            style={{
              width: '100%',
              background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${focused ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)', fontSize: 11,
              padding: '5px 9px', outline: 'none',
              fontFamily: 'var(--font)',
              transition: 'all 0.18s var(--ease)',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 11, padding: '12px 10px', fontStyle: 'italic' }}>
            No results
          </div>
        )}
        {filtered.map(c => {
          const active = c.symbol === symbol
          const color  = tagColor(c.tag)
          return (
            <CryptoRow
              key={c.symbol}
              crypto={c}
              active={active}
              color={color}
              onClick={() => onSymbolChange(c.symbol)}
            />
          )
        })}
      </div>
    </aside>
  )
}

function CryptoRow({ crypto, active, color, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', textAlign: 'left',
        background: active
          ? `linear-gradient(90deg, ${color}14 0%, transparent 100%)`
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderLeft: `2px solid ${active ? color : 'transparent'}`,
        borderRight: 'none', borderTop: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.035)',
        cursor: 'pointer',
        transition: 'all 0.16s var(--ease)',
        boxShadow: active ? `inset 0 0 20px ${color}08` : 'none',
      }}
    >
      {/* Tag badge */}
      <span style={{
        minWidth: 32, textAlign: 'center',
        fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
        color, background: `${color}1a`,
        border: `1px solid ${color}30`,
        borderRadius: 5, padding: '2px 4px',
        transition: 'all 0.16s var(--ease)',
        boxShadow: active ? `0 0 8px ${color}30` : 'none',
      }}>
        {crypto.tag}
      </span>

      {/* Name */}
      <span style={{
        fontSize: 11.5,
        color: active ? 'var(--text)' : hovered ? 'var(--muted2)' : 'var(--muted)',
        fontWeight: active ? 600 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'color 0.16s var(--ease)',
      }}>
        {crypto.name}
      </span>
    </button>
  )
}
