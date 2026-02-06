---
name: intellectia-stock-screener
description: Get stock screener list data from Intellectia API (no auth) and summarize results.
metadata:
  {
    'openclaw':
      {
        'requires': { 'bins': ['curl', 'python3'] },
        'install':
          [
            {
              'id': 'python',
              'kind': 'pip',
              'package': 'requests',
              'bins': [],
              'label': 'Install requests (pip)',
            },
          ],
      },
  }
---

# Intellectia Stock Screener

Base URL: `https://api.intellectia.ai`

## Endpoint

- `GET /gateway/v1/stock/screener-list`

Full URL:

- `https://api.intellectia.ai/gateway/v1/stock/screener-list`

## Query parameters

- `symbol_type` (int): Asset type `0=stock 1=etf 2=crypto`
- `period_type` (int): Period `0=day 1=week 2=month`
- `trend_type` (int): Trend `0=bullish 1=bearish`
- `profit_asc` (bool): Sort by profit ascending (`true` = small → large)
- `market_cap` (int): Market cap filter
  - `0=any`
  - `1=micro <300M`
  - `2=small 300M-2B`
  - `3=mid 2B-10B`
  - `4=large 10B-200B`
  - `5=mega >200B`
- `price` (int): Price filter
  - `0=any`
  - `1=<5`
  - `2=<50`
  - `3=>5`
  - `4=>50`
  - `5=5-50`
- `page` (int): Page number (example: 1)
- `size` (int): Page size (example: 20)

## Response (200)

Example response (shape):

```json
{
  "ret": 0,
  "msg": "",
  "data": {
    "list": [
      {
        "code": "BKD.N",
        "symbol": "BKD",
        "symbol_type": 0,
        "name": "Brookdale Senior Living Inc",
        "logo": "https://intellectia-public-documents.s3.amazonaws.com/image/logo/BKD_logo.png",
        "pre_close": 14.5,
        "price": 15,
        "change_ratio": 3.45,
        "timestamp": "1769749200",
        "simiar_num": 10,
        "probability": 80,
        "profit": 5.27,
        "klines": [{ "close": 15, "timestamp": "1769749200" }],
        "trend_list": [
          {
            "symbol": "BKD",
            "symbol_type": 0,
            "is_main": true,
            "list": [{ "change_ratio": 5.27, "timestamp": "1730260800", "close": 16 }]
          }
        ],
        "update_time": "1769806800"
      }
    ],
    "total": 3,
    "detail": {
      "cover_url": "https://d159e3ysga2l0q.cloudfront.net/image/cover_image/stock-1.png",
      "name": "Stocks Bullish Tomorrow",
      "screener_type": 1011,
      "params": "{}",
      "desc": "..."
    }
  }
}
```

### Field reference

Top-level:

- `ret` (int): Status code (typically `0` means success)
- `msg` (string): Message (empty string when OK)
- `data` (object): Payload

`data`:

- `data.list` (array): Result rows
- `data.total` (int): Total number of rows
- `data.detail` (object): Screener metadata

Each item in `data.list`:

- `code` (string): Full instrument code (may include exchange suffix, e.g. `BKD.N`)
- `symbol` (string): Ticker symbol (e.g. `BKD`)
- `symbol_type` (int): Asset type (`0=stock 1=etf 2=crypto`)
- `name` (string): Display name
- `logo` (string): Logo URL
- `pre_close` (number): Previous close price
- `price` (number): Current price
- `change_ratio` (number): Percent change vs previous close
- `timestamp` (string): Quote timestamp (Unix seconds)
- `simiar_num` (int): Similarity count (as returned by API; spelling kept as-is)
- `probability` (int): Model confidence (0-100)
- `profit` (number): Predicted/expected return (as returned by API)
- `klines` (array): Price series
  - `klines[].close` (number): Close price
  - `klines[].timestamp` (string): Unix seconds
- `trend_list` (array): Trend comparison series
  - `trend_list[].symbol` (string): Symbol for the series (may be empty for non-main series)
  - `trend_list[].symbol_type` (int): Asset type
  - `trend_list[].is_main` (bool): Whether this is the main series
  - `trend_list[].list` (array): Time points
    - `trend_list[].list[].change_ratio` (number): Percent change at that point
    - `trend_list[].list[].timestamp` (string): Unix seconds
    - `trend_list[].list[].close` (number): Close price at that point
- `update_time` (string): Last update time (Unix seconds)

`data.detail`:

- `cover_url` (string): Cover image URL
- `name` (string): Screener title
- `screener_type` (int): Screener type ID
- `params` (string): Serialized params (often JSON string)
- `desc` (string): Screener description
- `num` (int, optional): As returned by API (may be absent)

## Examples

### cURL

```bash
curl -sS "https://api.intellectia.ai/gateway/v1/stock/screener-list?symbol_type=0&period_type=0&trend_type=0&profit_asc=false&market_cap=0&price=0&page=1&size=20"
```

### Python (requests)

```bash
python3 - <<'PY'
import requests

base_url = "https://api.intellectia.ai"
params = {
  "symbol_type": 0,
  "period_type": 0,
  "trend_type": 0,
  "profit_asc": False,
  "market_cap": 0,
  "price": 0,
  "page": 1,
  "size": 20,
}

r = requests.get(f"{base_url}/gateway/v1/stock/screener-list", params=params, timeout=30)
r.raise_for_status()
payload = r.json()

print("ret:", payload.get("ret"))
print("msg:", payload.get("msg"))
data = payload.get("data") or {}
rows = data.get("list") or []
print("total:", data.get("total"))
for row in rows[:10]:
  print(row.get("symbol"), row.get("price"), row.get("change_ratio"), row.get("probability"), row.get("profit"))
PY
```

## Notes

- No authentication required.
- If you see rate limits, reduce `size` and add backoff/retry in client code.
