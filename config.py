import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Exchange API
    BINANCE_API_KEY = os.getenv("BINANCE_API_KEY", "")
    BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET", "")
    
    # Paper Trading Flag (ALWAYS TRUE FOR PHASE 0)
    PAPER_TRADING = True 

    # Trading Parameters
    SYMBOL = os.getenv("TRADING_SYMBOL", "BTC/USDT")
    TIMEFRAME = os.getenv("TIMEFRAME", "15m")
    
    # Main Loop Interval in seconds (e.g., check every minute)
    LOOP_INTERVAL = 60 

    # Database
    DB_PATH = "trading_log.db"

    # Strategy Parameters
    RSI_PERIOD = int(os.getenv("RSI_PERIOD", 14))
    RSI_OVERBOUGHT = int(os.getenv("RSI_OVERBOUGHT", 70))
    RSI_OVERSOLD = int(os.getenv("RSI_OVERSOLD", 30))

    # Hardcoded Risk Rules for Phase 0
    MAX_PORTFOLIO_RISK_PER_TRADE = float(os.getenv("MAX_PORTFOLIO_RISK_PER_TRADE", 0.02))
    POSITION_SIZE_USD = 100.0  # Fixed $100 paper position for testing
    
    # Limits for pulling historical data
    CANDLE_LIMIT = 100

config = Config()
