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
├── main.py                   # Entry point — runs trading loop + API server concurrently
├── config.py                 # Centralised config (env-driven)
├── requirements.txt
├── data/
│   └── exchange.py           # CCXT async exchange wrapper
├── strategy/
│   └── baseline.py           # RSI crossover → Signal JSON
├── execution/
│   └── executor.py           # Deterministic executor (internal / sandbox / live)
├── api/
│   ├── server.py             # FastAPI app — REST + WebSocket endpoints
│   └── state.py              # Shared runtime state + WebSocket broadcast
├── db/
│   └── logger.py             # Async SQLite (orders, signals, system logs)
└── frontend/                 # React dashboard (Vite + lightweight-charts)
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        └── components/
            ├── Chart.jsx     # Candlestick + volume + RSI panels (synced timescales)
            ├── Header.jsx    # Symbol, timeframe, live signal badge, WS status
            └── Sidebar.jsx   # Paper balance, recent signals, recent orders
```

---

## Roadmap

| Phase | Name | Status |
|-------|------|--------|
| 0 | **Close the Loop** — full pipeline on paper trading + live dashboard | ✅ Complete |
| 1 | **The Data Moat** — Parquet/QuestDB/PostgreSQL + on-chain data | 🔜 Next |
| 2 | **Feature Engineering** — price/volume, crypto-specific, GAF/ResNet | 🔜 Planned |
| 3 | **Agentic Research Layer** — LangGraph: Sentiment, Risk, Technical agents | 🔜 Planned |
| 4 | **Deterministic Execution** — advanced risk rules, position sizing, audit | 🔜 Planned |
| 5 | **Backtesting** — vectorbt, walk-forward validation | 🔜 Planned |
| 6 | **Live Deployment** — VPS, monitoring, alerting | 🔜 Planned |

---

## Setup

### 1. Clone

```bash
git clone https://github.com/akashcheema05796-del/Quan-Ti-Ta-Tive-.git
cd Quan-Ti-Ta-Tive-
```

### 2. Python environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure `.env`

```bash
cp .env.example .env
# Edit .env with your API keys and settings
```

### 4. Frontend (optional, for the live dashboard)

```bash
cd frontend
npm install
```

### 5. Run the bot

```bash
# From project root
python main.py
```

This starts two things concurrently:
- **Trading loop** — fetches OHLCV, generates signals, executes paper trades
- **API server** on `http://localhost:8000` — serves REST + WebSocket

### 6. Open the dashboard

```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173` — the dashboard connects automatically.

---

## Paper Trading Modes

Set `PAPER_MODE` in `.env` (default: `internal`):

| Mode | Description |
|------|-------------|
| `internal` | Fills simulated locally against an in-memory balance. **Works on every exchange, no testnet keys required.** |
| `sandbox` | Uses CCXT `set_sandbox_mode(True)`. Only some exchanges support this (Bybit, Binance testnet). Coinbase does **not**. |
| `live` | Real orders. Refuses to start unless `ALLOW_LIVE=1` is also set. |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/candles?limit=200` | OHLCV bars with RSI values |
| `GET` | `/api/orders?limit=50` | Recent order history |
| `GET` | `/api/signals?limit=30` | Recent non-neutral signals |
| `GET` | `/api/status` | Bot status, latest signal, paper balance |
| `WS` | `/ws` | Live candle, signal, and order events |

---

## Configuration Reference

| Key | Default | Notes |
|-----|---------|-------|
| `EXCHANGE_ID` | `coinbase` | Any CCXT exchange ID |
| `TRADING_SYMBOL` | `BTC/USDT` | Market symbol |
| `TIMEFRAME` | `15m` | OHLCV candle interval |
| `PAPER_MODE` | `internal` | `internal` / `sandbox` / `live` |
| `ALLOW_LIVE` | `0` | Set to `1` to enable live trading |
| `RSI_PERIOD` | `14` | RSI lookback window |
| `RSI_OVERBOUGHT` | `70` | SHORT trigger threshold |
| `RSI_OVERSOLD` | `30` | LONG trigger threshold |
| `POSITION_SIZE_USD` | `100.0` | Fixed USD per trade |
| `PAPER_BALANCE_USD` | `10000.0` | Starting balance (internal mode) |
| `LOOP_INTERVAL` | *(unset)* | Seconds between cycles; unset = auto-align to candle close |

> **Coinbase CDP keys:** Paste the full multi-line ECDSA private key as-is — `\n` sequences are normalised automatically.

---

## Dependencies

```
ccxt>=4.4.0           Exchange connectivity (100+ exchanges)
pandas==2.2.2         OHLCV data handling
ta==0.11.0            Technical indicators (RSI)
fastapi>=0.111.0      REST + WebSocket API server
uvicorn[standard]     ASGI server
aiosqlite==0.20.0     Async SQLite audit log
loguru==0.7.2         Structured logging
python-dotenv==1.0.1  .env loading
```

Frontend: React 18, Vite 5, lightweight-charts 4
