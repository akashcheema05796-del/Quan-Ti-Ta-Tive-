from __future__ import annotations

from typing import Optional

import aiosqlite
from loguru import logger

from config import config


class DatabaseLogger:
    def __init__(self):
        self.db_path = config.DB_PATH
        self._db: Optional[aiosqlite.Connection] = None   # M-4: persistent connection

    async def initialize(self) -> None:
        # M-4: Open once and keep the connection alive for the process lifetime.
        # This prevents SQLite "database is locked" errors caused by opening a new
        # connection on every query under concurrent load.
        try:
            self._db = await aiosqlite.connect(self.db_path)
            self._db.row_factory = aiosqlite.Row
            await self._db.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id  TEXT,
                    symbol    TEXT,
                    side      TEXT,
                    price     REAL,
                    amount    REAL,
                    status    TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await self._db.execute("""
                CREATE TABLE IF NOT EXISTS signals (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp       TEXT,
                    asset           TEXT,
                    signal          TEXT,
                    confidence      REAL,
                    timeframe       TEXT,
                    technical_score REAL,
                    description     TEXT,
                    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await self._db.execute("""
                CREATE TABLE IF NOT EXISTS system_logs (
                    id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    level     TEXT,
                    message   TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await self._db.commit()
            logger.info("Database initialised.")
        except Exception as e:
            logger.error(f"DB init failed: {e}")

    async def close(self) -> None:
        if self._db is not None:
            try:
                await self._db.close()
            except Exception:
                pass
            self._db = None

    # ── Writes ────────────────────────────────────────────────────────────────

    async def log_order(
        self, order_id: str, symbol: str, side: str, price: float, amount: float, status: str
    ) -> None:
        if self._db is None:
            return
        try:
            await self._db.execute(
                "INSERT INTO orders (order_id, symbol, side, price, amount, status) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (order_id, symbol, side, price, amount, status),
            )
            await self._db.commit()
            logger.info(f"Order logged: {side} {amount} {symbol} @ {price} ({status})")
        except Exception as e:
            logger.error(f"Failed to log order {order_id}: {e}")

    async def log_signal(self, signal_json: dict) -> None:
        if signal_json.get("signal") == "NEUTRAL":
            return
        if self._db is None:
            return
        reasoning = signal_json.get("reasoning", {})
        try:
            await self._db.execute(
                "INSERT INTO signals "
                "(timestamp, asset, signal, confidence, timeframe, technical_score, description) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    signal_json.get("timestamp"),
                    signal_json.get("asset"),
                    signal_json.get("signal"),
                    signal_json.get("confidence"),
                    signal_json.get("timeframe"),
                    reasoning.get("technical_score"),
                    reasoning.get("description"),
                ),
            )
            await self._db.commit()
        except Exception as e:
            logger.error(f"Failed to log signal: {e}")

    async def log_system_event(self, level: str, message: str) -> None:
        if self._db is None:
            return
        try:
            await self._db.execute(
                "INSERT INTO system_logs (level, message) VALUES (?, ?)",
                (level, message),
            )
            await self._db.commit()
        except Exception as e:
            logger.error(f"Failed to log system event: {e}")

    # ── Reads ─────────────────────────────────────────────────────────────────

    async def get_orders(self, limit: int = 50) -> list:
        if self._db is None:
            return []
        try:
            # M-10: Explicit columns — never SELECT * to avoid leaking internal fields
            # and to keep the API contract stable as the schema evolves.
            async with self._db.execute(
                "SELECT order_id, symbol, side, price, amount, status, timestamp "
                "FROM orders ORDER BY id DESC LIMIT ?",
                (limit,),
            ) as cur:
                rows = await cur.fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to fetch orders: {e}")
            return []

    async def get_signals(self, limit: int = 30) -> list:
        if self._db is None:
            return []
        try:
            # M-10: Explicit columns
            async with self._db.execute(
                "SELECT timestamp, asset, signal, confidence, timeframe, "
                "technical_score, description "
                "FROM signals ORDER BY id DESC LIMIT ?",
                (limit,),
            ) as cur:
                rows = await cur.fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to fetch signals: {e}")
            return []


db_logger = DatabaseLogger()
