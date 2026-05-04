import pandas as pd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from ta.momentum import RSIIndicator

from api.state import state
from db.logger import db_logger
from config import config

app = FastAPI(title="Quan-Ti-Ta-Tive API")


@app.get("/api/candles")
async def get_candles(limit: int = 200, timeframe: str = None, symbol: str = None):
    if state.exchange is None:
        return []
    tf  = timeframe if timeframe else config.TIMEFRAME
    sym = symbol    if symbol    else config.SYMBOL
    df = await state.exchange.fetch_ohlcv(sym, tf, limit=limit)
    if df.empty:
        return []
    rsi_series = RSIIndicator(close=df["close"], window=config.RSI_PERIOD).rsi()
    df = df.assign(rsi=rsi_series)
    result = []
    for ts, row in df.iterrows():
        bar = {
            "time":   int(ts.timestamp()),
            "open":   float(row["open"]),
            "high":   float(row["high"]),
            "low":    float(row["low"]),
            "close":  float(row["close"]),
            "volume": float(row["volume"]),
        }
        rsi_val = row.get("rsi")
        if rsi_val is not None and not pd.isna(rsi_val):
            bar["rsi"] = round(float(rsi_val), 4)
        result.append(bar)
    return result


@app.get("/api/orders")
async def get_orders(limit: int = 50):
    return await db_logger.get_orders(limit)


@app.get("/api/signals")
async def get_signals(limit: int = 30):
    rows = await db_logger.get_signals(limit)
    # Re-shape into the same structure the frontend expects from a live signal event
    return [
        {
            "timestamp": r.get("timestamp"),
            "asset":     r.get("asset"),
            "signal":    r.get("signal"),
            "confidence": r.get("confidence"),
            "timeframe": r.get("timeframe"),
            "reasoning": {
                "technical_score": r.get("technical_score"),
                "description":     r.get("description"),
            },
        }
        for r in rows
    ]


@app.get("/api/status")
async def get_status():
    paper_balance = {}
    positions     = {}
    if state.executor is not None and config.PAPER_MODE == "internal":
        paper_balance = state.executor.balance
        positions     = {k: v for k, v in state.executor.positions.items() if v}
    return {
        "symbol":        config.SYMBOL,
        "timeframe":     config.TIMEFRAME,
        "exchange":      config.EXCHANGE_ID,
        "mode":          config.PAPER_MODE,
        "latest_signal": state.latest_signal,
        "paper_balance": paper_balance,
        "positions":     positions,
        "rsi_overbought": config.RSI_OVERBOUGHT,
        "rsi_oversold":   config.RSI_OVERSOLD,
    }


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    state.add_client(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        state.remove_client(ws)
