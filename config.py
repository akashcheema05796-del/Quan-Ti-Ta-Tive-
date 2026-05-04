import os
from dotenv import load_dotenv

load_dotenv()

_TIMEFRAME_SECONDS = {
    "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800,
    "1h": 3600, "2h": 7200, "4h": 14400, "6h": 21600, "12h": 43200, "1d": 86400,
}

class Config:
    # Exchange
    EXCHANGE_ID          = os.getenv("EXCHANGE_ID", "coinbase")
    EXCHANGE_API_KEY     = os.getenv("EXCHANGE_API_KEY", "")
    EXCHANGE_API_SECRET  = os.getenv("EXCHANGE_API_SECRET", "")

    # Paper trading mode: "internal" (default) | "sandbox" | "live"
    #   internal — fills simulated locally; works on every exchange, no sandbox needed
    #   sandbox  — uses CCXT set_sandbox_mode(True); only some exchanges support this
    #   live     — real orders; refuses to start unless ALLOW_LIVE=1
    PAPER_MODE = os.getenv("PAPER_MODE", "internal").lower()
    ALLOW_LIVE = os.getenv("ALLOW_LIVE", "0") == "1"

    # Trading parameters
    SYMBOL    = os.getenv("TRADING_SYMBOL", "BTC/USDT")
    TIMEFRAME = os.getenv("TIMEFRAME", "15m")

    # Loop interval in seconds; leave unset to auto-align with candle close
    _loop_env   = os.getenv("LOOP_INTERVAL", "")
    LOOP_INTERVAL: int | None = int(_loop_env) if _loop_env.strip() else None

    # Database
    DB_PATH = "trading_log.db"

    # Strategy
    RSI_PERIOD     = int(os.getenv("RSI_PERIOD", 14))
    RSI_OVERBOUGHT = int(os.getenv("RSI_OVERBOUGHT", 70))
    RSI_OVERSOLD   = int(os.getenv("RSI_OVERSOLD", 30))

    # Risk / sizing
    MAX_PORTFOLIO_RISK_PER_TRADE = float(os.getenv("MAX_PORTFOLIO_RISK_PER_TRADE", 0.02))
    POSITION_SIZE_USD            = float(os.getenv("POSITION_SIZE_USD", 100.0))
    PAPER_BALANCE_USD            = float(os.getenv("PAPER_BALANCE_USD", 10000.0))

    CANDLE_LIMIT = 200

    @property
    def timeframe_seconds(self) -> int:
        return _TIMEFRAME_SECONDS.get(self.TIMEFRAME, 900)

config = Config()
