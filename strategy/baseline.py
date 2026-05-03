import pandas as pd
from ta.momentum import RSIIndicator
from loguru import logger
from config import config

class BaselineStrategy:
    def __init__(self):
        self.rsi_period = config.RSI_PERIOD
        self.rsi_overbought = config.RSI_OVERBOUGHT
        self.rsi_oversold = config.RSI_OVERSOLD

    def analyze(self, df: pd.DataFrame) -> dict:
        """
        Analyzes the DataFrame and returns a signal JSON-like dict.
        Signal can be 'LONG', 'SHORT', or 'NEUTRAL'.
        """
        if df.empty or len(df) < self.rsi_period:
            return {"signal": "NEUTRAL", "reasoning": "Not enough data"}

        # Calculate RSI
        rsi_indicator = RSIIndicator(close=df['close'], window=self.rsi_period)
        df['rsi'] = rsi_indicator.rsi()

        current_rsi = df['rsi'].iloc[-1]
        previous_rsi = df['rsi'].iloc[-2]

        signal = "NEUTRAL"
        reason = f"RSI is {current_rsi:.2f}"

        # Simple RSI Crossover Logic
        if previous_rsi < self.rsi_oversold and current_rsi >= self.rsi_oversold:
            signal = "LONG"
            reason = f"RSI crossed above {self.rsi_oversold} (Current: {current_rsi:.2f})"
        elif previous_rsi > self.rsi_overbought and current_rsi <= self.rsi_overbought:
            signal = "SHORT"
            reason = f"RSI crossed below {self.rsi_overbought} (Current: {current_rsi:.2f})"

        return {
            "timestamp": df.index[-1].isoformat(),
            "asset": config.SYMBOL,
            "signal": signal,
            "confidence": 0.70, # Hardcoded confidence for Phase 0
            "timeframe": config.TIMEFRAME,
            "reasoning": {
                "technical_score": current_rsi,
                "description": reason
            }
        }
