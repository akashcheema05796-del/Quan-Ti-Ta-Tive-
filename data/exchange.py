from __future__ import annotations

from typing import Optional

import ccxt.async_support as ccxt
import pandas as pd
from loguru import logger

from config import config


class ExchangeManager:
    def __init__(self):
        # H-5: Validate exchange ID against the known ccxt exchange list before calling getattr.
        if config.EXCHANGE_ID not in ccxt.exchanges:
            raise ValueError(
                f"Unknown exchange {config.EXCHANGE_ID!r}. "
                f"Valid options include: {', '.join(list(ccxt.exchanges)[:10])} …"
            )

        exchange_class = getattr(ccxt, config.EXCHANGE_ID)

        # L-8: Only apply the Coinbase CDP '\n' fix to Coinbase; other exchanges
        # may legitimately have '\n' in their API secret.
        secret = config.EXCHANGE_API_SECRET
        if config.EXCHANGE_ID == "coinbase":
            secret = secret.replace("\\n", "\n")

        self.exchange = exchange_class({
            "apiKey":          config.EXCHANGE_API_KEY,
            "secret":          secret,
            "enableRateLimit": True,
        })

        if config.PAPER_MODE == "sandbox":
            try:
                self.exchange.set_sandbox_mode(True)
            except ccxt.NotSupported:
                logger.warning(
                    f"{config.EXCHANGE_ID} does not support sandbox mode. "
                    "Switch PAPER_MODE=internal or use testnet API keys manually."
                )

    async def load_markets(self) -> None:
        try:
            await self.exchange.load_markets()
        except Exception as e:
            logger.warning(f"Could not load markets: {e}")

    async def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int = 200) -> pd.DataFrame:
        try:
            ohlcv = await self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
            df.set_index("timestamp", inplace=True)
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol}: {e}")
            return pd.DataFrame()

    async def get_current_price(self, symbol: str) -> Optional[float]:
        """Return the latest trade price, or None on any error. (H-6)"""
        try:
            ticker = await self.exchange.fetch_ticker(symbol)
            price = ticker.get("last")
            if price is None:
                return None
            return float(price)
        except Exception as e:
            logger.error(f"Error fetching ticker for {symbol}: {e}")
            return None

    async def get_balance(self, currency: str = "USDT") -> float:
        try:
            balance = await self.exchange.fetch_balance()
            return float(balance.get(currency, {}).get("free", 0.0))
        except Exception as e:
            logger.error(f"Error fetching balance: {e}")
            return 0.0

    async def place_market_order(self, symbol: str, side: str, amount: float):
        try:
            logger.info(f"Placing market {side} order: {amount} {symbol}")
            return await self.exchange.create_market_order(symbol, side, amount)
        except Exception as e:
            logger.error(f"Failed to place order: {e}")
            return None

    async def close(self) -> None:
        await self.exchange.close()
