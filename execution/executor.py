import uuid
from loguru import logger
from data.exchange import ExchangeManager
from db.logger import db_logger
from config import config

class Executor:
    def __init__(self, exchange_manager: ExchangeManager):
        self.exchange = exchange_manager
        base = config.SYMBOL.split('/')[0]
        quote = config.SYMBOL.split('/')[-1]
        # Internal paper balance — only used when PAPER_MODE=internal
        self.balance   = {quote: config.PAPER_BALANCE_USD, base: 0.0}
        self.positions = {config.SYMBOL: None}  # None | "LONG" | "SHORT"

    async def execute_signal(self, signal_json: dict):
        signal = signal_json.get("signal", "NEUTRAL")
        symbol = signal_json.get("asset", config.SYMBOL)
        reasoning = signal_json.get("reasoning", {})

        if signal == "NEUTRAL":
            logger.debug("NEUTRAL signal — no action.")
            return

        logger.info(f"Signal: {signal} {symbol} | {reasoning.get('description', '')}")

        current_price = await self.exchange.get_current_price(symbol)
        if not current_price:
            logger.warning("Could not fetch price — aborting.")
            return

        side   = "buy" if signal == "LONG" else "sell"
        amount = round(config.POSITION_SIZE_USD / current_price, 6)
        logger.info(f"Target: {side} {amount} {symbol} (~${config.POSITION_SIZE_USD})")

        if config.PAPER_MODE == "internal":
            await self._internal_fill(symbol, side, amount, current_price)

        elif config.PAPER_MODE == "sandbox":
            order = await self.exchange.place_market_order(symbol, side, amount)
            if order:
                order_id   = order.get('id', str(uuid.uuid4()))
                filled_price = order.get('average', order.get('price', current_price))
                status       = order.get('status', 'closed')
                logger.success(f"Sandbox order filled: {order_id}")
                await db_logger.log_order(order_id, symbol, side, filled_price, amount, status)
                await self._broadcast_order(order_id, symbol, side, filled_price, amount, status)
            else:
                logger.error("Sandbox order returned None.")

        elif config.PAPER_MODE == "live":
            if not config.ALLOW_LIVE:
                logger.critical("Live trading blocked — set ALLOW_LIVE=1 to enable.")
                return
            order = await self.exchange.place_market_order(symbol, side, amount)
            if order:
                order_id   = order.get('id', str(uuid.uuid4()))
                filled_price = order.get('average', order.get('price', current_price))
                status       = order.get('status', 'closed')
                logger.success(f"Live order filled: {order_id}")
                await db_logger.log_order(order_id, symbol, side, filled_price, amount, status)
                await self._broadcast_order(order_id, symbol, side, filled_price, amount, status)

    async def _internal_fill(self, symbol: str, side: str, amount: float, price: float):
        base  = symbol.split('/')[0]
        quote = symbol.split('/')[-1]
        cost  = round(amount * price, 4)

        if side == "buy":
            if self.balance.get(quote, 0) < cost:
                logger.warning(f"Insufficient {quote} balance ({self.balance.get(quote, 0):.2f}) for buy.")
                return
            self.balance[quote] = round(self.balance.get(quote, 0) - cost, 4)
            self.balance[base]  = round(self.balance.get(base, 0) + amount, 8)
            self.positions[symbol] = "LONG"
        else:
            if self.balance.get(base, 0) < amount:
                logger.warning(f"Insufficient {base} balance ({self.balance.get(base, 0):.8f}) for sell.")
                return
            self.balance[base]  = round(self.balance.get(base, 0) - amount, 8)
            self.balance[quote] = round(self.balance.get(quote, 0) + cost, 4)
            self.positions[symbol] = "SHORT"

        order_id = str(uuid.uuid4())
        logger.success(f"Internal paper fill: {side} {amount} {symbol} @ {price} | "
                       f"Balance: {self.balance}")
        await db_logger.log_order(order_id, symbol, side, price, amount, "paper")
        await self._broadcast_order(order_id, symbol, side, price, amount, "paper")

    @staticmethod
    async def _broadcast_order(order_id, symbol, side, price, amount, status):
        try:
            from api.state import state
            await state.broadcast({
                "type": "order",
                "data": {
                    "order_id": order_id,
                    "symbol": symbol,
                    "side": side,
                    "price": price,
                    "amount": amount,
                    "status": status,
                },
            })
        except Exception:
            pass
