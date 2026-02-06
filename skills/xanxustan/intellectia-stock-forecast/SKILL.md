---
name: intellectia-stock-forecast
description: US Stock AI Trading Assistant | Intellectia AI Stock Forecast — Smart analysis of stock entry/exit points, target price predictions, probability calculations, and technical ratings. Supports "Should I Buy" investment decision Q&A.
metadata: {"openclaw":{"requires":{"bins":["curl","python3"]},"install":[{"id":"python","kind":"pip","package":"requests","bins":[],"label":"Install requests (pip)"}]}}
---

# Intellectia Stock Forecast

Single-symbol **forecast** (yearly predictions) and **"Should I Buy?"** analysis from the Intellectia API.

Base URL: `https://api.intellectia.ai`

## Overview

This skill covers two endpoints:

- **Forecast (predictions):** `GET /gateway/v1/stock/screener-public`
- **Why / Should I buy (analysis):** `POST /gateway/v1/finance/should-i-buy`

## When to use this skill

Use this skill when you want to:
- Get **one** stock/crypto quote + **yearly predictions** (2026–2035)
- Answer **why / should I buy** for a specific ticker with a structured rationale

## How to ask (high hit-rate)

If you want OpenClaw to automatically pick this skill, include:
- **Intellectia**
- The **ticker** (e.g. TSLA / AAPL / BTC-USD)
- Either **forecast / prediction** (for predictions) or **why / should I buy** (for analysis)

To force the skill: `/skill intellectia-stock-forecast <your request>`

Copy-ready prompts:
- "Intellectia forecast for **TSLA**. Show price, probability, profit, and predictions 2026–2035."
- "Why should I buy **TSLA**? Use Intellectia Should I Buy."
- "Should I buy **AAPL**? Give me conclusion, catalysts, analyst rating, and 52-week range."
- "Get Intellectia yearly predictions for **BTC-USD** (asset_type 2)."

## Endpoints

| Use case | Method | Path |
|---|---|---|
| Forecast (predictions 2026–2035) | GET | `/gateway/v1/stock/screener-public` |
| Why / Should I buy analysis | POST | `/gateway/v1/finance/should-i-buy` |

## API: Forecast (screener-public)

- **Method:** `GET /gateway/v1/stock/screener-public`
- **Query parameters:**
  - `ticker` (string, required)
  - `asset_type` (int, required): `0=stock 1=etf 2=crypto`
- **Returns:** `data.list` (single object) + `data.prediction_2026` … `data.prediction_2035`

### Example (cURL)

```bash
curl -sS "https://api.intellectia.ai/gateway/v1/stock/screener-public?ticker=TSLA&asset_type=0"
```

### Example (Python)

```bash
python3 - <<'PY'
import requests
r = requests.get("https://api.intellectia.ai/gateway/v1/stock/screener-public", params={"ticker": "TSLA", "asset_type": 0}, timeout=30)
r.raise_for_status()
data = r.json().get("data") or {}
obj = data.get("list") or {}
print("symbol:", obj.get("symbol"), "price:", obj.get("price"))
for y in range(2026, 2036):
    k = f"prediction_{y}"
    if k in data: print(k, data[k])
PY
```

## API: Why / Should I buy (should-i-buy)

- **Method:** `POST /gateway/v1/finance/should-i-buy`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{ "asset": { "ticker": "TSLA", "asset_type": 0, "locale": "en" } }
```

- **Returns:** `data.action_type`, `data.conclusion`, catalysts, technical analysis, analyst rating, plus price context.

### Example (cURL)

```bash
curl -sS -X POST "https://api.intellectia.ai/gateway/v1/finance/should-i-buy" \
  -H "Content-Type: application/json" \
  -d '{"asset":{"ticker":"TSLA","asset_type":0,"locale":"en"}}'
```

### Example (Python)

```bash
python3 - <<'PY'
import requests
r = requests.post("https://api.intellectia.ai/gateway/v1/finance/should-i-buy",
  json={"asset": {"ticker": "TSLA", "asset_type": 0, "locale": "en"}}, timeout=30)
r.raise_for_status()
d = r.json().get("data") or {}
print("conclusion:", d.get("conclusion"))
print("action_type:", d.get("action_type"))
print("positive_catalysts:", d.get("postive_catalysts"))
print("negative_catalysts:", d.get("negative_catalysts"))
PY
```

## Tool configuration

| Tool | Purpose |
|---|---|
| `curl` | One-off GET or POST |
| `python3` / `requests` | Scripts; `pip install requests` |

## Using this skill in OpenClaw

```bash
clawhub install intellectia-stock-forecast
```

Start a **new OpenClaw session**, then:

```bash
openclaw skills list
openclaw skills info intellectia-stock-forecast
openclaw skills check
```

## Disclaimer and data

- **Disclaimer:** The data and analysis from this skill are for **informational purposes only** and do not constitute financial, investment, or trading advice. Past performance and model predictions are not guarantees of future results. You are solely responsible for your investment decisions; consult a qualified professional before making financial decisions.
- **Data delay:** Data provided by the API (prices, predictions, analysis) may be **delayed** and is not necessarily real-time. Do not rely on it for time-sensitive trading decisions.
- **Real-time data:** For real-time or live data, visit [Intellectia](https://intellectia.ai/?channelId=601&activityId=1)

## Notes

- **screener-public:** one symbol per request.
- **should-i-buy:** use when the user asks "why" / "should I buy" for a symbol; use conclusion and catalysts in your answer.
