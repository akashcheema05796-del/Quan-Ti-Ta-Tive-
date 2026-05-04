import asyncio
import sys
import time
import uvicorn

# Force ThreadedResolver on Windows to avoid aiodns DNS issues.
try:
    import aiohttp.connector, aiohttp.resolver
    aiohttp.connector.DefaultResolver = aiohttp.resolver.ThreadedResolver
except Exception:
    pass

from loguru import logger
from config import config
from db.logger import db_logger
from data.exchange import ExchangeManager
from strategy.baseline import BaselineStrategy
from execution.executor import Executor
from api.state import state as app_state
from api.server import app


def _seconds_until_next_close(timeframe_seconds: int) -> float:
    now = time.time()
    next_close = (int(now) // timeframe_seconds + 1) * timeframe_seconds
    return max(1.0, next_close - now + 2.0)


async def trading_loop(exchange: ExchangeManager, strategy: BaselineStrategy, executor: Executor):
    logger.info(f"Trading loop: {config.SYMBOL} {config.TIMEFRAME} mode={config.PAPER_MODE}")
    await exchange.load_markets()

    while True:
        try:
            logger.debug("--- cycle ---")
            df = await exchange.fetch_ohlcv(config.SYMBOL, config.TIMEFRAME, limit=config.CANDLE_LIMIT)

            if df.empty:
                logger.warning("Empty OHLCV — sleeping 30s.")
                await asyncio.sleep(30)
                continue

            # Broadcast latest closed candle to WebSocket clients.
            if len(df) >= 2:
                last = df.iloc[-2]
                await app_state.broadcast({
                    "type": "candle",
                    "data": {
                        "time":   int(df.index[-2].timestamp()),
                        "open":   float(last["open"]),
                        "high":   float(last["high"]),
                        "low":    float(last["low"]),
                        "close":  float(last["close"]),
                        "volume": float(last["volume"]),
                    },
                })

            signal_json = strategy.analyze(df)
            app_state.latest_signal = signal_json

            await db_logger.log_signal(signal_json)
            await app_state.broadcast({"type": "signal", "data": signal_json})

            await executor.execute_signal(signal_json)

            sleep_s = config.LOOP_INTERVAL if config.LOOP_INTERVAL is not None \
                else _seconds_until_next_close(config.timeframe_seconds)
            logger.debug(f"Sleeping {sleep_s:.0f}s.")
            await asyncio.sleep(sleep_s)

        except asyncio.CancelledError:
            logger.info("Trading loop cancelled.")
            break
        except Exception as e:
            logger.exception(f"Loop error: {e}")
            await db_logger.log_system_event("ERROR", str(e))
            await asyncio.sleep(10)


async def main():
    logger.add("logs/system.log", rotation="10 MB", retention="10 days", level="DEBUG")
    logger.info(f"Initializing — mode={config.PAPER_MODE} exchange={config.EXCHANGE_ID}")

    await db_logger.initialize()

    exchange = ExchangeManager()
    strategy = BaselineStrategy()
    executor = Executor(exchange)

    app_state.exchange = exchange
    app_state.executor = executor

    server = uvicorn.Server(
        uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="warning")
    )
    logger.info("API server starting on http://localhost:8000")

    try:
        await asyncio.gather(
            trading_loop(exchange, strategy, executor),
            server.serve(),
        )
    except KeyboardInterrupt:
        logger.info("Received exit signal.")
    finally:
        logger.info("Shutting down.")
        await exchange.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
