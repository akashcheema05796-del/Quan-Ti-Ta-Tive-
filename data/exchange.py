import ccxt.async_support as ccxt
import pandas as pd
from loguru import logger
from config import config

class ExchangeManager:
    def __init__(self):
        # We use a configurable exchange testnet for paper trading (default Bybit)
        exchange_class = getattr(ccxt, config.EXCHANGE_ID)
        self.exchange = exchange_class({
            'apiKey': config.EXCHANGE_API_KEY,
            'secret': config.EXCHANGE_API_SECRET.replace('\\n', '\n'),
            'enableRateLimit': True,
        })
        try:
            self.exchange.set_sandbox_mode(True)  # VERY IMPORTANT: Testnet mode
        except ccxt.NotSupported:
            logger.warning(f"{config.EXCHANGE_ID} does not support sandbox mode via CCXT. It may be connecting to the live API. Please ensure your API keys are correct and you are not risking real funds.")
        
    async def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int = 100) -> pd.DataFrame:
        """Fetches OHLCV data and returns it as a pandas DataFrame."""
        try:
            ohlcv = await self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df.set_index('timestamp', inplace=True)
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol}: {e}")
            return pd.DataFrame()

    async def get_current_price(self, symbol: str) -> float:
        """Fetches the current ticker price."""
        try:
            ticker = await self.exchange.fetch_ticker(symbol)
            return ticker['last']
        except Exception as e:
            logger.error(f"Error fetching ticker for {symbol}: {e}")
            return 0.0

    async def get_balance(self, currency: str = 'USDT') -> float:
        """Fetches the available balance for a specific currency."""
        try:
            balance = await self.exchange.fetch_balance()
            if currency in balance and 'free' in balance[currency]:
                return balance[currency]['free']
            return 0.0
        except Exception as e:
            logger.error(f"Error fetching balance: {e}")
            return 0.0

    async def place_market_order(self, symbol: str, side: str, amount: float):
        """Places a market order."""
        try:
            logger.info(f"Attempting to place market {side} order for {amount} {symbol}")
            order = await self.exchange.create_market_order(symbol, side, amount)
            return order
        except Exception as e:
            logger.error(f"Failed to place order: {e}")
            return None

    async def close(self):
        """Gracefully close the exchange connection."""
        await self.exchange.close()
