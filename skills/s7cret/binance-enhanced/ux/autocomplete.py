#!/usr/bin/env python3
"""
Simple autocompletion helper for symbols and base assets.
Uses a small curated list (extendable by fetching exchange metadata).
"""
POPULAR_PAIRS = [
    {'symbol': 'BTCUSDT', 'base': 'BTC', 'quote': 'USDT'},
    {'symbol': 'ETHUSDT', 'base': 'ETH', 'quote': 'USDT'},
    {'symbol': 'BNBUSDT', 'base': 'BNB', 'quote': 'USDT'},
    {'symbol': 'SOLUSDT', 'base': 'SOL', 'quote': 'USDT'},
    {'symbol': 'XRPUSDT', 'base': 'XRP', 'quote': 'USDT'},
    {'symbol': 'DOGEUSDT', 'base': 'DOGE', 'quote': 'USDT'},
    {'symbol': 'BTCBUSD', 'base': 'BTC', 'quote': 'BUSD'},
]


def suggest_symbols(prefix: str, limit: int = 5):
    p = prefix.upper()
    res = [x for x in POPULAR_PAIRS if x['base'].startswith(p) or x['symbol'].startswith(p) or x['quote'].startswith(p)]
    return res[:limit]


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: autocomplete.py BTC')
    else:
        print(suggest_symbols(sys.argv[1]))
