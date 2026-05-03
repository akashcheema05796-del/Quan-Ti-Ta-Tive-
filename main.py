import asyncio
from loguru import logger
from config import config
from db.logger import db_logger
from data.exchange import ExchangeManager
from strategy.baseline import BaselineStrategy
from execution.executor import Executor

async def trading_loop(exchange: ExchangeManager, strategy: BaselineStrategy, executor: Executor):
    """The main trading loop."""
    logger.info(f"Starting main trading loop for {config.SYMBOL} on {config.TIMEFRAME} timeframe.")
    
    while True:
        try:
            logger.debug("--- Starting new cycle ---")
            
            # 1. Fetch Data
            df = await exchange.fetch_ohlcv(config.SYMBOL, config.TIMEFRAME, limit=config.CANDLE_LIMIT)
            
            if df.empty:
                logger.warning("Fetched empty dataframe. Skipping cycle.")
                await asyncio.sleep(config.LOOP_INTERVAL)
                continue
                
            # 2. Analyze & Generate Signal
            signal_json = strategy.analyze(df)
            
            # 3. Execute Signal
            await executor.execute_signal(signal_json)
            
            # 4. Wait for next iteration
            logger.debug(f"Cycle complete. Waiting {config.LOOP_INTERVAL} seconds...")
            await asyncio.sleep(config.LOOP_INTERVAL)

        except asyncio.CancelledError:
            logger.info("Trading loop cancelled.")
            break
        except Exception as e:
            logger.exception(f"Unhandled exception in trading loop: {e}")
            await db_logger.log_system_event("ERROR", str(e))
            # Sleep briefly to avoid tight error loops
            await asyncio.sleep(10)

async def main():
    logger.add("logs/system.log", rotation="10 MB", retention="10 days", level="DEBUG")
    logger.info("Initializing Phase 0 Trading Bot...")
    
    # Initialize DB
    await db_logger.initialize()
    
    # Initialize Components
    exchange = ExchangeManager()
    strategy = BaselineStrategy()
    executor = Executor(exchange)
    
    try:
        # Run Loop
        await trading_loop(exchange, strategy, executor)
    except KeyboardInterrupt:
        logger.info("Received exit signal.")
    finally:
        logger.info("Shutting down cleanly...")
        await exchange.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
