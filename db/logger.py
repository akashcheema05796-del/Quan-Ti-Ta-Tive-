import aiosqlite
import datetime
from loguru import logger
from config import config

class DatabaseLogger:
    def __init__(self):
        self.db_path = config.DB_PATH

    async def initialize(self):
        """Creates the database tables if they do not exist."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute('''
                    CREATE TABLE IF NOT EXISTS orders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        order_id TEXT,
                        symbol TEXT,
                        side TEXT,
                        price REAL,
                        amount REAL,
                        status TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                await db.execute('''
                    CREATE TABLE IF NOT EXISTS system_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        level TEXT,
                        message TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                await db.commit()
                logger.info("Database initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")

    async def log_order(self, order_id: str, symbol: str, side: str, price: float, amount: float, status: str):
        """Logs an order execution to the database."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    '''INSERT INTO orders (order_id, symbol, side, price, amount, status) 
                       VALUES (?, ?, ?, ?, ?, ?)''',
                    (order_id, symbol, side, price, amount, status)
                )
                await db.commit()
                logger.info(f"Order logged: {side} {amount} {symbol} @ {price} ({status})")
        except Exception as e:
            logger.error(f"Failed to log order {order_id} to DB: {e}")

    async def log_system_event(self, level: str, message: str):
        """Logs a system event or error."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    '''INSERT INTO system_logs (level, message) VALUES (?, ?)''',
                    (level, message)
                )
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to log system event: {e}")

db_logger = DatabaseLogger()
