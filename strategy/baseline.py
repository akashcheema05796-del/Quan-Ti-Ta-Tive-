import pandas as pd
from ta.momentum import RSIIndicator
from loguru import logger
from config import config

class BaselineStrategy:
    def __init__(self):
        self.rsi_period     = config.RSI_PERIOD
        self.rsi_overbought = config.RSI_OVERBOUGHT
        self.rsi_oversold   = config.RSI_OVERSOLD

    def analyze(self, df: pd.DataFrame) -> dict:
        # Drop the in-progress candle — only react to closed bars.
        if len(df) > 0:
            df = df.iloc[:-1]

        if df.empty or len(df) < self.rsi_period + 1:
            return {"signal": "NEUTRAL", "reasoning": {"description": "Not enough closed candles"}}

        rsi_indicator = RSIIndicator(close=df['close'], window=self.rsi_period)
        df = df.assign(rsi=rsi_indicator.rsi())

        current_rsi  = df['rsi'].iloc[-1]
        previous_rsi = df['rsi'].iloc[-2]

        signal = "NEUTRAL"
        reason = f"RSI is {current_rsi:.2f}"

        if previous_rsi < self.rsi_oversold and current_rsi >= self.rsi_oversold:
            signal = "LONG"
            reason = f"RSI crossed above {self.rsi_oversold} (Current: {current_rsi:.2f})"
        elif previous_rsi > self.rsi_overbought and current_rsi <= self.rsi_overbought:
            signal = "SHORT"
            reason = f"RSI crossed below {self.rsi_overbought} (Current: {current_rsi:.2f})"

        return {
            "timestamp":  df.index[-1].isoformat(),
            "asset":      config.SYMBOL,
            "signal":     signal,
            "confidence": 0.70,
            "timeframe":  config.TIMEFRAME,
            "reasoning": {
                "technical_score": current_rsi,
                "description":     reason,
            },
        }
