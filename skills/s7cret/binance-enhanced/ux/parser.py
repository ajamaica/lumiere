#!/usr/bin/env python3
"""
Natural language parser for simple trading commands (RU / EN).
Examples:
  "купи 0.1 BTC по рынку"
  "sell 2 eth at 1800 limit"
  "place limit buy order for 0.5 BTCUSDT at 40000"

Notes:
- Conservative: parser extracts intent and parameters but does not validate against exchange rules.
- Returns a dict with keys: side, quantity, base_asset, quote_asset (optional), symbol (optional), order_type, price (optional), raw_text
"""
import re
from typing import Optional, Dict

SIDE_MAP = {
    'куп': 'BUY', 'купи': 'BUY', 'купить': 'BUY', 'покупаю': 'BUY', 'buy': 'BUY', 'b': 'BUY',
    'прод': 'SELL', 'продай': 'SELL', 'продать': 'SELL', 'sell': 'SELL', 's': 'SELL'
}

ORDER_TYPE_KEYWORDS = {
    'market': 'MARKET', 'по рынку': 'MARKET', 'рыноч': 'MARKET',
    'limit': 'LIMIT', 'лимит': 'LIMIT', 'по цене': 'LIMIT'
}

SYMBOL_RE = re.compile(r"([A-Za-z]{2,6})(?:/|\s*)?([A-Za-z]{2,6})")
AMOUNT_RE = re.compile(r"(\d+(?:[\.,]\d+)?)")
PRICE_RE = re.compile(r"(по цене|at)\s*(\d+[\.,]?\d*)")


def normalize_num(s: str) -> float:
    return float(s.replace(',', '.'))


def parse_symbol(text: str) -> Optional[Dict[str, str]]:
    m = SYMBOL_RE.search(text)
    if m:
        a, b = m.group(1).upper(), m.group(2).upper()
        return {'base': a, 'quote': b, 'symbol': f'{a}{b}'}
    # try single token like BTCUSDT
    t = re.search(r"\b([A-Za-z]{5,10})\b", text)
    if t:
        s = t.group(1).upper()
        # heuristic: split by common quote assets
        for q in ['USDT', 'USDC', 'BTC', 'ETH', 'BNB']:
            if s.endswith(q) and len(s) > len(q):
                return {'base': s[:-len(q)], 'quote': q, 'symbol': s}
    return None


def parse_side(text: str) -> Optional[str]:
    for k, v in SIDE_MAP.items():
        if re.search(rf"\b{k}\b", text, re.IGNORECASE):
            return v
    return None


def parse_order_type(text: str) -> Optional[str]:
    for k, v in ORDER_TYPE_KEYWORDS.items():
        if k in text.lower():
            return v
    return None


def parse_quantity(text: str) -> Optional[float]:
    # find quantity near keywords like buy/sell/купи
    tokens = re.split(r"\s+", text)
    for i, tok in enumerate(tokens):
        if tok.lower() in SIDE_MAP:
            # look next tokens for numbers
            for j in range(i+1, min(i+4, len(tokens))):
                m = AMOUNT_RE.match(tokens[j])
                if m:
                    return normalize_num(m.group(1))
    # fallback: first number
    m = AMOUNT_RE.search(text)
    if m:
        return normalize_num(m.group(1))
    return None


def parse_price(text: str) -> Optional[float]:
    m = PRICE_RE.search(text.lower())
    if m:
        return normalize_num(m.group(2))
    # try pattern like "at 1800" or "1800$"
    m2 = re.search(r"\b(\d+[\.,]?\d*)\s*(?:\$|usd|usdt)?\b", text.lower())
    if m2:
        return normalize_num(m2.group(1))
    return None


def parse(text: str) -> Dict:
    text = text.strip()
    res = {
        'raw_text': text,
        'side': parse_side(text),
        'quantity': parse_quantity(text),
        'order_type': parse_order_type(text),
        'price': None,
        'symbol': None,
        'base_asset': None,
        'quote_asset': None,
    }
    sym = parse_symbol(text)
    if sym:
        res['symbol'] = sym['symbol']
        res['base_asset'] = sym['base']
        res['quote_asset'] = sym['quote']
    # price only if limit or explicit
    price = parse_price(text)
    if price and res['order_type'] == 'LIMIT':
        res['price'] = price
    elif price and res['order_type'] is None:
        # if there's a price and no type, assume LIMIT
        res['price'] = price
        res['order_type'] = 'LIMIT'
    # if order type explicit market, clear price
    if res['order_type'] == 'MARKET':
        res['price'] = None
    return res


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: parser.py "купить 0.1 BTC по рынку"')
        sys.exit(1)
    txt = ' '.join(sys.argv[1:])
    print(parse(txt))
