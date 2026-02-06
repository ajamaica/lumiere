"""
Technical analysis indicators: RSI, MACD, Bollinger Bands
"""
import pandas as pd
import numpy as np


def RSI(series: pd.Series, period=14):
    delta = series.diff()
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    ma_up = up.rolling(period).mean()
    ma_down = down.rolling(period).mean()
    rs = ma_up / ma_down
    rsi = 100 - (100 / (1 + rs))
    return rsi


def MACD(series: pd.Series, fast=12, slow=26, signal=9):
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    hist = macd - signal_line
    return macd, signal_line, hist


def Bollinger(series: pd.Series, period=20, mult=2):
    sma = series.rolling(period).mean()
    std = series.rolling(period).std()
    upper = sma + mult * std
    lower = sma - mult * std
    return upper, sma, lower
