from __future__ import annotations

import time
from typing import Optional

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocket, WebSocketDisconnect
from ta.momentum import RSIIndicator

from api.state import state
from db.logger import db_logger
from config import config

app = FastAPI(title="Quan-Ti-Ta-Tive API")

# H-3: Restrict CORS to known origins only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:8000",   # same-host production
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Simple in-memory candle cache (M-6) ──────────────────────────────────────
_candle_cache: dict = {}   # key: "{symbol}:{tf}" → {"data": list, "ts": float}
_CACHE_TTL = 20.0          # seconds before re-fetching from the exchange


def _cache_key(symbol: str, tf: str) -> str:
    return f"{symbol}:{tf}"


def _get_cached(symbol: str, tf: str) -> Optional[list]:
    entry = _candle_cache.get(_cache_key(symbol, tf))
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None


def _set_cached(symbol: str, tf: str, data: list) -> None:
    _candle_cache[_cache_key(symbol, tf)] = {"data": data, "ts": time.time()}


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/candles")
async def get_candles(limit: int = 200, timeframe: str = None, symbol: str = None):
    if state.exchange is None:
        return []

    tf  = timeframe if timeframe else config.TIMEFRAME
    sym = symbol    if symbol    else config.SYMBOL

    # Serve from cache when fresh (M-6)
    cached = _get_cached(sym, tf)
    if cached is not None:
        return cached

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

    _set_cached(sym, tf, result)
    return result


@app.get("/api/orders")
async def get_orders(limit: int = 50):
    return await db_logger.get_orders(limit)


@app.get("/api/signals")
async def get_signals(limit: int = 30):
    rows = await db_logger.get_signals(limit)
    return [
        {
            "timestamp":  r.get("timestamp"),
            "asset":      r.get("asset"),
            "signal":     r.get("signal"),
            "confidence": r.get("confidence"),
            "timeframe":  r.get("timeframe"),
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
        # positions_compat exposes {symbol: direction_str} (H-2 compat)
        positions = {k: v for k, v in state.executor.positions_compat.items() if v}
    return {
        "symbol":         config.SYMBOL,
        "timeframe":      config.TIMEFRAME,
        "exchange":       config.EXCHANGE_ID,
        "mode":           config.PAPER_MODE,
        "latest_signal":  state.latest_signal,
        "paper_balance":  paper_balance,
        "positions":      positions,
        "rsi_overbought": config.RSI_OVERBOUGHT,
        "rsi_oversold":   config.RSI_OVERSOLD,
    }


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    state.add_client(ws)
    try:
        # H-9: Use generic receive() so binary frames and disconnect messages are
        # all handled without raising unexpected exceptions.
        while True:
            msg = await ws.receive()
            if msg["type"] == "websocket.disconnect":
                break
            # Client messages are intentionally ignored — WS is server→client only.
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        state.remove_client(ws)
