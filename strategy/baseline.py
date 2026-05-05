from __future__ import annotations

import pandas as pd
from ta.momentum import RSIIndicator
from loguru import logger

from config import config


class BaselineStrategy:
    def analyze(self, df: pd.DataFrame) -> dict:
        # Read thresholds fresh from config each call so a restart is not required
        # after changing RSI_PERIOD / RSI_OVERBOUGHT / RSI_OVERSOLD. (L-9)
        rsi_period     = config.RSI_PERIOD
        rsi_overbought = config.RSI_OVERBOUGHT
        rsi_oversold   = config.RSI_OVERSOLD

        # Drop the in-progress candle — only react to closed bars.
        if len(df) > 0:
            df = df.iloc[:-1]

        if df.empty or len(df) < rsi_period + 1:
            return {
                "signal":    "NEUTRAL",
                "reasoning": {"description": "Not enough closed candles"},
            }

        rsi_indicator = RSIIndicator(close=df["close"], window=rsi_period)
        df = df.assign(rsi=rsi_indicator.rsi())

        current_rsi  = df["rsi"].iloc[-1]
        previous_rsi = df["rsi"].iloc[-2]

        # H-7: NaN RSI values silently break comparisons — guard explicitly.
        if pd.isna(current_rsi) or pd.isna(previous_rsi):
            logger.debug("RSI values are NaN — not enough data for a signal yet.")
            return {
                "timestamp": df.index[-1].isoformat(),
                "asset":     config.SYMBOL,
                "signal":    "NEUTRAL",
                "confidence": 0.0,
                "timeframe": config.TIMEFRAME,
                "reasoning": {
                    "technical_score": None,
                    "description":     "RSI not yet available (warming up)",
                },
            }

        signal = "NEUTRAL"
        reason = f"RSI is {current_rsi:.2f}"

        if previous_rsi < rsi_oversold and current_rsi >= rsi_oversold:
            signal = "LONG"
            reason = f"RSI crossed above {rsi_oversold} (Current: {current_rsi:.2f})"
        elif previous_rsi > rsi_overbought and current_rsi <= rsi_overbought:
            signal = "SHORT"
            reason = f"RSI crossed below {rsi_overbought} (Current: {current_rsi:.2f})"

        # M-7: Derive confidence from how far RSI is from the neutral midpoint (50).
        # A crossover deep in oversold/overbought territory scores higher than one
        # that barely clears the threshold.
        distance_from_mid = abs(current_rsi - 50.0)
        confidence = round(min(distance_from_mid / 50.0, 1.0), 4)  # 0.0 – 1.0

        return {
            "timestamp":  df.index[-1].isoformat(),
            "asset":      config.SYMBOL,
            "signal":     signal,
            "confidence": confidence,
            "timeframe":  config.TIMEFRAME,
            "reasoning": {
                "technical_score": round(float(current_rsi), 4),
                "description":     reason,
            },
        }
