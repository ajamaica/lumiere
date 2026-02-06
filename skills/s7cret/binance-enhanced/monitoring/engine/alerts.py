"""Alerting engine skeleton

Functions expect input data structures and return alert objects.
"""

import math
from datetime import datetime, timedelta


def percent_change(old, new):
    try:
        return (new - old) / old * 100.0
    except Exception:
        return 0.0


def check_price_change(price_history, threshold_percent=3.0):
    """price_history: list of (timestamp (datetime), price)
    Checks last two points and returns alert if change exceeds threshold
    """
    if len(price_history) < 2:
        return None
    t1, p1 = price_history[-2]
    t2, p2 = price_history[-1]
    pc = percent_change(p1, p2)
    if abs(pc) >= threshold_percent:
        return {'type': 'price_change', 'ticker': None, 'percent': pc, 'from': p1, 'to': p2, 'time': t2}
    return None


def check_stop_take(portfolio, stop_percent=5.0, take_percent=10.0):
    """portfolio: list of holdings: {'ticker','entry_price','current_price','amount'}
    Returns list of alerts
    """
    alerts = []
    for h in portfolio:
        entry = h.get('entry_price')
        cur = h.get('current_price')
        if not entry or not cur:
            continue
        pc = percent_change(entry, cur)
        if pc <= -abs(stop_percent):
            alerts.append({'type': 'stop_loss', 'ticker': h.get('ticker'), 'percent': pc, 'entry': entry, 'current': cur})
        elif pc >= abs(take_percent):
            alerts.append({'type': 'take_profit', 'ticker': h.get('ticker'), 'percent': pc, 'entry': entry, 'current': cur})
    return alerts


def check_volatility(price_series, window_minutes=60, vol_threshold_percent=2.5):
    """price_series: list of (timestamp, price) sorted ascending
    Compute simple volatility measure: max-min over window / mean *100
    """
    if not price_series:
        return None
    end = price_series[-1][0]
    start = end - timedelta(minutes=window_minutes)
    window = [p for t, p in price_series if t >= start]
    if len(window) < 2:
        return None
    mx = max(window)
    mn = min(window)
    mean = sum(window) / len(window)
    vol = (mx - mn) / mean * 100.0
    if vol >= vol_threshold_percent:
        return {'type': 'volatility', 'vol_percent': vol, 'window_minutes': window_minutes, 'time': end}
    return None


def check_low_balance(portfolio_usd, threshold_usd=10.0):
    if portfolio_usd <= threshold_usd:
        return {'type': 'low_balance', 'balance_usd': portfolio_usd, 'threshold': threshold_usd}
    return None
