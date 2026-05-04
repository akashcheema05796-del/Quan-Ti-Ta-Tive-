import aiosqlite
from loguru import logger
from config import config

class DatabaseLogger:
    def __init__(self):
        self.db_path = config.DB_PATH

    async def initialize(self):
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute('''
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
                ''')
                await db.execute('''
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
                ''')
                await db.execute('''
                    CREATE TABLE IF NOT EXISTS system_logs (
                        id        INTEGER PRIMARY KEY AUTOINCREMENT,
                        level     TEXT,
                        message   TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                await db.commit()
                logger.info("Database initialised.")
        except Exception as e:
            logger.error(f"DB init failed: {e}")

    async def log_order(self, order_id: str, symbol: str, side: str,
                        price: float, amount: float, status: str):
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    'INSERT INTO orders (order_id, symbol, side, price, amount, status) '
                    'VALUES (?, ?, ?, ?, ?, ?)',
                    (order_id, symbol, side, price, amount, status),
                )
                await db.commit()
                logger.info(f"Order logged: {side} {amount} {symbol} @ {price} ({status})")
        except Exception as e:
            logger.error(f"Failed to log order {order_id}: {e}")

    async def log_signal(self, signal_json: dict):
        if signal_json.get("signal") == "NEUTRAL":
            return
        reasoning = signal_json.get("reasoning", {})
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    'INSERT INTO signals '
                    '(timestamp, asset, signal, confidence, timeframe, technical_score, description) '
                    'VALUES (?, ?, ?, ?, ?, ?, ?)',
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
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to log signal: {e}")

    async def get_orders(self, limit: int = 50) -> list:
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                async with db.execute(
                    'SELECT * FROM orders ORDER BY id DESC LIMIT ?', (limit,)
                ) as cur:
                    rows = await cur.fetchall()
                    return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to fetch orders: {e}")
            return []

    async def get_signals(self, limit: int = 30) -> list:
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                async with db.execute(
                    'SELECT * FROM signals ORDER BY id DESC LIMIT ?', (limit,)
                ) as cur:
                    rows = await cur.fetchall()
                    return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to fetch signals: {e}")
            return []

    async def log_system_event(self, level: str, message: str):
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    'INSERT INTO system_logs (level, message) VALUES (?, ?)',
                    (level, message),
                )
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to log system event: {e}")

db_logger = DatabaseLogger()
