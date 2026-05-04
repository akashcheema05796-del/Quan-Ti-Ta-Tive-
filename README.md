# Crypto Trading Bot

An autonomous, agentic trading system with deterministic execution and AI-driven signal generation.

## Core Architecture Principle

```text
[Data Layer] → [Feature Layer] → [Agent Research Layer] → [Signal JSON] → [Deterministic Execution Layer] → [Audit + Observability]
```
**Hard Rule:** AI agents generate signals. They never touch execution.

## Phases

- **Phase 0: Close the Loop First** (Current Focus)
  Prove a full pipeline works end-to-end on paper trading. One data source, one strategy, one execution, one log.
- **Phase 1: The Data Moat**
  Historical Data Store (Parquet, QuestDB, PostgreSQL) & On-Chain Data (Glassnode, Whale Alert).
- **Phase 2: Feature Engineering Layer**
  Price/Volume Features, Crypto-Specific Features, and Deep Learning Visual Signals (GAF/ResNet).
- **Phase 3: The Agentic Research Layer**
  LangGraph system mapping Sentiment, Risk, and Technical agents to output a strict JSON signal.
- **Phase 4: Deterministic Execution Layer**
  Risk Rules, Position Sizing, and Audit & Observability.
- **Phase 5 & 6: Backtesting & Live Deployment**
  Vectorbt backtesting, walk-forward validation, and VPS deployment.

---

## Setup for Phase 0

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akashcheema05796-del/Quan-Ti-Ta-Tive-.git
   cd Quan-Ti-Ta-Tive-
   ```

2. **Set up Virtual Environment:**
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On Mac/Linux:
   source .venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Copy the example environment file and configure your API keys.
   ```bash
   cp .env.example .env
   ```
   *Note: You can use any CCXT-supported exchange (e.g., Bybit, OKX, Kraken). The bot now also natively handles **Coinbase Advanced Trade (CDP)** keys, including multi-line ECDSA private keys.*

5. **Run the Bot:**
   ```bash
   python main.py
   ```
