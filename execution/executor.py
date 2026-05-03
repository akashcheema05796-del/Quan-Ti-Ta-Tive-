from loguru import logger
from data.exchange import ExchangeManager
from db.logger import db_logger
from config import config
import uuid

class Executor:
    def __init__(self, exchange_manager: ExchangeManager):
        self.exchange = exchange_manager
        
    async def execute_signal(self, signal_json: dict):
        """
        Reads the signal JSON and executes the trade if rules are met.
        """
        signal = signal_json.get("signal", "NEUTRAL")
        symbol = signal_json.get("asset", config.SYMBOL)
        reasoning = signal_json.get("reasoning", {})
        
        if signal == "NEUTRAL":
            logger.debug("Received NEUTRAL signal. No action taken.")
            return

        logger.info(f"Received valid signal: {signal} on {symbol}. Reason: {reasoning.get('description', '')}")

        # 1. Check constraints & risk rules
        current_price = await self.exchange.get_current_price(symbol)
        if not current_price:
            logger.warning("Could not fetch current price, aborting execution.")
            return

        # 2. Position Sizing (Phase 0: Fixed size in USD)
        position_size_usd = config.POSITION_SIZE_USD
        amount = position_size_usd / current_price
        
        # Round amount appropriately for crypto (simplification for Phase 0)
        amount = round(amount, 4) 
        
        # Determine order side
        side = "buy" if signal == "LONG" else "sell"
        
        logger.info(f"Calculated target position: {amount} {symbol} (~${position_size_usd})")

        # 3. Execution
        if config.PAPER_TRADING:
            # Check balance
            usdt_balance = await self.exchange.get_balance("USDT")
            if side == "buy" and usdt_balance < position_size_usd:
                 logger.warning(f"Insufficient USDT balance: {usdt_balance}")
                 return
                 
            logger.info("Executing PAPER trade via CCXT...")
            order = await self.exchange.place_market_order(symbol, side, amount)
            
            if order:
                order_id = order.get('id', str(uuid.uuid4()))
                filled_price = order.get('average', order.get('price', current_price))
                status = order.get('status', 'closed')
                
                logger.success(f"Order executed successfully: ID {order_id}")
                await db_logger.log_order(order_id, symbol, side, filled_price, amount, status)
            else:
                logger.error("Order placement returned None.")
        else:
            # Protective check: Live execution not supported in Phase 0
            logger.error("CRITICAL: Live trading called but PAPER_TRADING is False! Aborting.")
