# Quan-Ti-Ta-Tive — Autonomous Crypto Trading Bot

An autonomous, agentic trading system with deterministic execution and AI-driven signal generation, built for systematic crypto trading across multiple phases.

## Architecture

```
[Data Layer] → [Feature Layer] → [Agent Research Layer] → [Signal JSON] → [Deterministic Execution Layer] → [Audit + Observability]
```

**Core Rule:** AI agents generate signals. They never touch execution.

---

## Project Structure

```
Quan-Ti-Ta-Tive-/
├── main.py               # Entry point — runs the async trading loop
├── config.py             # Centralised config (env-driven)
├── requirements.txt      # Python dependencies
├── data/
│   └── exchange.py       # CCXT async exchange wrapper (fetch OHLCV, orders, balance)
├── strategy/
│   └── baseline.py       # RSI crossover signal generator → outputs Signal JSON
├── execution/
│   └── executor.py       # Deterministic executor — reads Signal JSON, places orders
└── db/
    └── logger.py         # Async SQLite logger (orders + system events)
```

---

## Roadmap

| Phase | Name | Status |
|-------|------|--------|
| 0 | **Close the Loop** — full pipeline on paper trading | ✅ Complete |
| 1 | **The Data Moat** — Parquet/QuestDB/PostgreSQL + on-chain data | 🔜 Next |
| 2 | **Feature Engineering** — price/volume, crypto-specific, GAF/ResNet | 🔜 Planned |
| 3 | **Agentic Research Layer** — LangGraph: Sentiment, Risk, Technical agents | 🔜 Planned |
| 4 | **Deterministic Execution** — advanced risk rules, position sizing, audit | 🔜 Planned |
| 5 | **Backtesting** — vectorbt, walk-forward validation | 🔜 Planned |
| 6 | **Live Deployment** — VPS, monitoring, alerting | 🔜 Planned |

---

## Phase 0 — What's Built

### Components

**`data/exchange.py` — ExchangeManager**
- Async CCXT wrapper supporting any CCXT-compatible exchange (Bybit, OKX, Kraken, Coinbase, etc.)
- Auto-enables sandbox/testnet mode where supported
- Handles Coinbase Advanced Trade (CDP) ECDSA private keys (multi-line keys normalised automatically)
- Methods: `fetch_ohlcv`, `get_current_price`, `get_balance`, `place_market_order`

**`strategy/baseline.py` — BaselineStrategy**
- RSI crossover strategy using the `ta` library
- Emits a strict Signal JSON dict: `{ signal, asset, timestamp, confidence, timeframe, reasoning }`
- Signals: `LONG` (RSI crosses above oversold threshold), `SHORT` (RSI crosses below overbought), `NEUTRAL`

**`execution/executor.py` — Executor**
- Reads Signal JSON — never calls the strategy directly
- Fixed $100 USD paper position sizing for Phase 0
- Balance check before buys; hard abort if `PAPER_TRADING=False` is ever accidentally set
- Logs every filled order to SQLite via `db_logger`

**`db/logger.py` — DatabaseLogger**
- Async SQLite (`aiosqlite`) — zero external dependencies
- Tables: `orders` (full order record) and `system_logs` (errors/events)
- Auto-initialises schema on first run

---

## Setup

### 1. Clone

```bash
git clone https://github.com/akashcheema05796-del/Quan-Ti-Ta-Tive-.git
cd Quan-Ti-Ta-Tive-
```

### 2. Virtual Environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

Create a `.env` file in the project root:

```env
# Exchange (any CCXT-supported ID: bybit, okx, kraken, coinbase, ...)
EXCHANGE_ID=coinbase
EXCHANGE_API_KEY=your_api_key_here
EXCHANGE_API_SECRET=your_api_secret_here

# Trading parameters (optional — defaults shown)
TRADING_SYMBOL=BTC/USDT
TIMEFRAME=15m

# Strategy tuning (optional)
RSI_PERIOD=14
RSI_OVERBOUGHT=70
RSI_OVERSOLD=30

# Risk (optional)
MAX_PORTFOLIO_RISK_PER_TRADE=0.02
```

> **Coinbase CDP keys:** Paste the full multi-line ECDSA private key as-is. The bot normalises `\n` escape sequences automatically.

> **Sandbox mode:** Enabled automatically where the exchange supports it. If not supported, a warning is logged — verify your keys are testnet keys.

### 5. Run

```bash
python main.py
```

Logs stream to the console and to `logs/system.log`. Trade records are written to `trading_log.db` (SQLite).

---

## Configuration Reference

All values can be overridden via environment variables. Hardcoded Phase 0 values are marked below.

| Key | Default | Notes |
|-----|---------|-------|
| `EXCHANGE_ID` | `coinbase` | Any CCXT exchange ID |
| `TRADING_SYMBOL` | `BTC/USDT` | Market symbol |
| `TIMEFRAME` | `15m` | OHLCV candle interval |
| `RSI_PERIOD` | `14` | RSI lookback window |
| `RSI_OVERBOUGHT` | `70` | SHORT trigger threshold |
| `RSI_OVERSOLD` | `30` | LONG trigger threshold |
| `MAX_PORTFOLIO_RISK_PER_TRADE` | `0.02` | 2% risk per trade |
| `PAPER_TRADING` | `True` | **Hardcoded True** in Phase 0 |
| `POSITION_SIZE_USD` | `100.0` | **Hardcoded $100** in Phase 0 |
| `LOOP_INTERVAL` | `60s` | Seconds between cycles |
| `CANDLE_LIMIT` | `100` | Candles fetched per cycle |

---

## Dependencies

```
ccxt==4.2.51        # Exchange connectivity
pandas==2.2.2       # OHLCV data handling
ta==0.11.0          # Technical indicators (RSI)
python-dotenv==1.0.1
aiosqlite==0.20.0   # Async SQLite
loguru==0.7.2       # Structured logging
```

---

## Safety

- `PAPER_TRADING` is hardcoded `True` in Phase 0 — the bot **cannot** accidentally go live
- Live execution path raises a critical error and aborts if somehow reached
- Sandbox mode is set on the exchange client at initialisation
