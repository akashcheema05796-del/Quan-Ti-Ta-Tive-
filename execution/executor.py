from __future__ import annotations

import uuid
from typing import Callable, Optional

from loguru import logger

from config import config
from data.exchange import ExchangeManager
from db.logger import db_logger


class Executor:
    def __init__(
        self,
        exchange_manager: ExchangeManager,
        broadcast_fn: Optional[Callable] = None,   # M-11: injected to break circular import
    ):
        self.exchange   = exchange_manager
        self._broadcast = broadcast_fn

        # C-2: validated in config.validate() — safe to split here
        base  = config.SYMBOL.split("/")[0]
        quote = config.SYMBOL.split("/")[1]

        # Internal paper balance — only used when PAPER_MODE=internal
        self.balance: dict = {quote: config.PAPER_BALANCE_USD, base: 0.0}

        # H-2: Track both direction *and* quantity so we can close positions correctly
        # Structure: {symbol: {"direction": "LONG"|"SHORT"|None, "qty": float}}
        self.positions: dict = {config.SYMBOL: {"direction": None, "qty": 0.0}}

    # ── Public ────────────────────────────────────────────────────────────────

    async def execute_signal(self, signal_json: dict) -> None:
        signal = signal_json.get("signal", "NEUTRAL")
        symbol = signal_json.get("asset", config.SYMBOL)
        reasoning = signal_json.get("reasoning", {})

        if signal == "NEUTRAL":
            logger.debug("NEUTRAL signal — no action.")
            return

        logger.info(f"Signal: {signal} {symbol} | {reasoning.get('description', '')}")

        # H-6: price is Optional[float]; guard against None and zero
        current_price = await self.exchange.get_current_price(symbol)
        if current_price is None or current_price <= 0:
            logger.warning("Could not fetch a valid price — aborting signal.")
            return

        side = "buy" if signal == "LONG" else "sell"

        pos = self.positions.get(symbol, {"direction": None, "qty": 0.0})

        # H-1 + H-2: Use the held quantity to close; use POSITION_SIZE_USD for new entries
        if side == "sell":
            # Closing a LONG: sell exactly what we hold
            amount = pos["qty"]
            if amount <= 0:
                logger.warning(f"No open LONG position to close for {symbol}. Ignoring SELL signal.")
                return
        else:
            # Opening a new LONG
            if pos["direction"] == "LONG":
                logger.debug(f"Already LONG {symbol} — skipping duplicate BUY signal.")
                return
            amount = round(config.POSITION_SIZE_USD / current_price, 6)

        logger.info(f"Target: {side} {amount} {symbol} @ ~{current_price}")

        if config.PAPER_MODE == "internal":
            await self._internal_fill(symbol, side, amount, current_price)

        elif config.PAPER_MODE == "sandbox":
            order = await self.exchange.place_market_order(symbol, side, amount)
            if order:
                order_id     = order.get("id", str(uuid.uuid4()))
                filled_price = order.get("average", order.get("price", current_price))
                status       = order.get("status", "closed")
                logger.success(f"Sandbox order filled: {order_id}")
                await db_logger.log_order(order_id, symbol, side, filled_price, amount, status)
                await self._broadcast_order(order_id, symbol, side, filled_price, amount, status)
                self._update_position(symbol, side, amount)
            else:
                logger.error("Sandbox order returned None.")

        elif config.PAPER_MODE == "live":
            if not config.ALLOW_LIVE:
                logger.critical("Live trading blocked — set ALLOW_LIVE=1 to enable.")
                return
            # H-4: Extra position guard for live mode — never double-enter
            if side == "buy" and pos["direction"] == "LONG":
                logger.warning(f"Live: already LONG {symbol}, skipping BUY.")
                return
            order = await self.exchange.place_market_order(symbol, side, amount)
            if order:
                order_id     = order.get("id", str(uuid.uuid4()))
                filled_price = order.get("average", order.get("price", current_price))
                status       = order.get("status", "closed")
                logger.success(f"Live order filled: {order_id}")
                await db_logger.log_order(order_id, symbol, side, filled_price, amount, status)
                await self._broadcast_order(order_id, symbol, side, filled_price, amount, status)
                self._update_position(symbol, side, amount)

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _internal_fill(self, symbol: str, side: str, amount: float, price: float) -> None:
        base  = symbol.split("/")[0]
        quote = symbol.split("/")[1]
        cost  = amount * price

        if side == "buy":
            avail = self.balance.get(quote, 0.0)
            if avail < cost:
                logger.warning(
                    f"Insufficient {quote} balance ({avail:.2f}) for buy costing {cost:.2f}."
                )
                return
            self.balance[quote] = round(avail - cost, 4)
            self.balance[base]  = round(self.balance.get(base, 0.0) + amount, 8)
            self._update_position(symbol, "buy", amount)

        else:  # sell
            avail = self.balance.get(base, 0.0)
            if avail < amount:
                logger.warning(
                    f"Insufficient {base} balance ({avail:.8f}) for sell of {amount:.8f}."
                )
                return
            self.balance[base]  = round(avail - amount, 8)
            self.balance[quote] = round(self.balance.get(quote, 0.0) + cost, 4)
            self._update_position(symbol, "sell", amount)

        order_id = str(uuid.uuid4())
        logger.success(
            f"Internal paper fill: {side} {amount} {symbol} @ {price} | "
            f"Balance: {self.balance}"
        )
        await db_logger.log_order(order_id, symbol, side, price, amount, "paper")
        await self._broadcast_order(order_id, symbol, side, price, amount, "paper")

    def _update_position(self, symbol: str, side: str, amount: float) -> None:
        """Update the in-memory position tracker after a fill."""
        if side == "buy":
            self.positions[symbol] = {"direction": "LONG", "qty": amount}
        else:
            self.positions[symbol] = {"direction": None, "qty": 0.0}

    async def _broadcast_order(
        self,
        order_id: str,
        symbol: str,
        side: str,
        price: float,
        amount: float,
        status: str,
    ) -> None:
        """Broadcast an order event. Uses the injected broadcast function (M-11)."""
        if self._broadcast is None:
            return
        try:
            await self._broadcast({
                "type": "order",
                "data": {
                    "order_id": order_id,
                    "symbol":   symbol,
                    "side":     side,
                    "price":    price,
                    "amount":   amount,
                    "status":   status,
                },
            })
        except Exception as exc:
            logger.warning(f"Order broadcast failed: {exc}")

    # ── Legacy property for /api/status compatibility ─────────────────────────

    @property
    def positions_compat(self) -> dict:
        """Return {symbol: direction_str} for the status endpoint."""
        return {sym: info["direction"] for sym, info in self.positions.items()}
