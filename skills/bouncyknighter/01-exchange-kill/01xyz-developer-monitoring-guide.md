# Monitoring Guide: Safe Mode Operations

> ✅ **100% Safe** — These operations require no authentication and cannot spend funds.

This guide covers read-only data access for monitoring 01.xyz markets, prices, and network status. Perfect for building dashboards, alerts, and market analysis tools.

## Table of Contents

1. [Public vs Private Endpoints](#public-vs-private-endpoints)
2. [Market Information](#market-information)
3. [Orderbook Data](#orderbook-data)
4. [Price & Stats](#price--stats)
5. [Funding Rates](#funding-rates)
6. [Recent Trades](#recent-trades)
7. [Code Examples](#code-examples)
8. [Rate Limits](#rate-limits)

---

## Public vs Private Endpoints

### Public Endpoints (No Auth Required)

These endpoints return data available to all users:

| Endpoint                     | Description                          | Cache Time |
| ---------------------------- | ------------------------------------ | ---------- |
| `GET /info`                  | All markets, specs, metadata         | ~1 min     |
| `GET /market/{id}/orderbook` | Full L2 orderbook                    | Real-time  |
| `GET /market/{id}/stats`     | 24h volume, funding rate, mark price | ~30 sec    |
| `GET /trades`                | Recent public trades                 | Real-time  |
| `GET /timestamp`             | Server timestamp                     | N/A        |

### Private Endpoints (Auth Required)

These require running the local API:

| Endpoint                 | Description                 |
| ------------------------ | --------------------------- |
| `GET /account/{address}` | Account positions, balances |
| `GET /orders`            | Open orders for account     |
| `GET /fills`             | Fill history                |

---

## Market Information

### Get All Markets: `/info`

Returns complete list of trading markets with specifications.

**Example Request:**

```bash
curl https://zo-mainnet.n1.xyz/info | jq .
```

**Example Response:**

```json
{
  "markets": [
    {
      "id": 0,
      "symbol": "BTCUSD",
      "name": "Bitcoin",
      "baseAsset": "BTC",
      "quoteAsset": "USD",
      "maxLeverage": 20,
      "minOrderSize": 0.001,
      "tickSize": 0.5,
      "maintenanceMargin": 0.05
    },
    {
      "id": 1,
      "symbol": "ETHUSD",
      "name": "Ethereum",
      "baseAsset": "ETH",
      "quoteAsset": "USD",
      "maxLeverage": 20,
      "minOrderSize": 0.01,
      "tickSize": 0.1,
      "maintenanceMargin": 0.05
    },
    {
      "id": 2,
      "symbol": "SOLUSD",
      "name": "Solana",
      "baseAsset": "SOL",
      "quoteAsset": "USD",
      "maxLeverage": 20,
      "minOrderSize": 0.1,
      "tickSize": 0.01,
      "maintenanceMargin": 0.05
    }
  ],
  "serverTime": 1738598400000
}
```

**Key Fields:**

| Field               | Description                                      |
| ------------------- | ------------------------------------------------ |
| `id`                | Numeric market ID (required for all other calls) |
| `symbol`            | Human-readable symbol                            |
| `maxLeverage`       | Maximum allowed leverage                         |
| `tickSize`          | Minimum price increment                          |
| `maintenanceMargin` | Liquidation threshold (e.g., 0.05 = 5%)          |

---

## Orderbook Data

### Get Orderbook: `/market/{id}/orderbook`

Returns the full Level 2 orderbook for a given market.

**Example Request:**

```bash
curl https://zo-mainnet.n1.xyz/market/2/orderbook | jq .
```

**Example Response:**

```json
{
  "marketId": 2,
  "symbol": "SOLUSD",
  "bids": [
    [145.0, 125.5], // [price, size]
    [144.95, 300.0],
    [144.9, 150.0]
  ],
  "asks": [
    [145.02, 80.2], // [price, size]
    [145.05, 200.0],
    [145.1, 500.0]
  ],
  "timestamp": 1738598400000
}
```

**Important Notes:**

- Prices are in USD
- Sizes are in base asset units (SOL, BTC, etc.)
- The spread = `asks[0][0] - bids[0][0]`
- Mid price = `(bestBid + bestAsk) / 2`

### Orderbook Spread Analysis

```javascript
function analyzeSpread(orderbook) {
  const bestBid = orderbook.bids[0][0]
  const bestAsk = orderbook.asks[0][0]
  const spread = bestAsk - bestBid
  const midPrice = (bestBid + bestAsk) / 2
  const spreadPct = (spread / midPrice) * 100

  return {
    bestBid,
    bestAsk,
    spread,
    midPrice,
    spreadPct: spreadPct.toFixed(4) + '%',
  }
}
```

---

## Price & Stats

### Get Market Stats: `/market/{id}/stats`

Returns 24-hour statistics including mark price, index price, and funding rate.

**Example Request:**

```bash
curl https://zo-mainnet.n1.xyz/market/2/stats | jq .
```

**Example Response:**

```json
{
  "marketId": 2,
  "symbol": "SOLUSD",
  "perpStats": {
    "mark_price": 145.23,
    "index_price": 145.2,
    "funding_rate": 0.0001, // 0.01% per 8 hours
    "volume_24h": 12500000, // USD
    "open_interest": 45000000, // USD
    "change_24h": 0.0523, // +5.23%
    "high_24h": 148.5,
    "low_24h": 138.2
  },
  "timestamp": 1738598400000
}
```

**Key Fields:**

| Field           | Description             | Use Case               |
| --------------- | ----------------------- | ---------------------- |
| `mark_price`    | Current perpetual price | PnL calculation        |
| `index_price`   | Spot index price        | Fair value reference   |
| `funding_rate`  | Next funding payment    | Funding cost analysis  |
| `open_interest` | Total open positions    | Market liquidity gauge |
| `change_24h`    | 24h price change        | Trend analysis         |

---

## Funding Rates

### Understanding Funding Rates

Funding rates are periodic payments between longs and shorts to keep perpetuals aligned with spot prices:

| Rate         | Longs Pay      | Shorts Pay     | Market Bias    |
| ------------ | -------------- | -------------- | -------------- |
| **Positive** | Longs → Shorts | Receive        | Long-dominant  |
| **Negative** | Receive        | Shorts → Longs | Short-dominant |

- **Frequency**: Every 8 hours (00:00, 08:00, 16:00 UTC)
- **Formula**: `Position Size × Mark Price × Funding Rate`
- **Impact**: Can significantly affect PnL on longer holds

### Fetch All Funding Rates

```javascript
async function getAllFundingRates(baseUrl = 'https://zo-mainnet.n1.xyz') {
  // First get market list
  const info = await fetch(`${baseUrl}/info`).json()

  // Then fetch stats for each market
  const fundingData = await Promise.all(
    info.markets.map(async (market) => {
      const stats = await fetch(`${baseUrl}/market/${market.id}/stats`).json()
      return {
        symbol: market.symbol,
        marketId: market.id,
        fundingRate: stats.perpStats.funding_rate,
        markPrice: stats.perpStats.mark_price,
        annualizedRate: stats.perpStats.funding_rate * 3 * 365, // 3× daily × 365
      }
    }),
  )

  return fundingData.sort((a, b) => b.fundingRate - a.fundingRate)
}

// Usage
const rates = await getAllFundingRates()
console.table(rates)
```

**Sample Output:**

```
┌─────────┬────────┬─────────────┬────────────┬─────────────────┐
│ (index) │ symbol │  marketId   │ fundingRate│ annualizedRate  │
├─────────┼────────┼─────────────┼────────────┼─────────────────┤
│    0    │ 'BTCUSD'│     0      │   0.0003   │     0.3285      │
│    1    │ 'SOLUSD'│     2      │   0.0001   │     0.1095      │
│    2    │ 'ETHUSD'│     1      │  -0.00005  │    -0.05475     │
```

---

## Recent Trades

### Get Public Trades: `/trades`

Returns recent public trades across all markets.

**Query Parameters:**

| Parameter   | Type      | Description                |
| ----------- | --------- | -------------------------- |
| `marketId`  | number    | Filter by market           |
| `limit`     | number    | Max results (default: 100) |
| `startTime` | timestamp | From time (ms)             |
| `endTime`   | timestamp | To time (ms)               |

**Example:**

```bash
curl 'https://zo-mainnet.n1.xyz/trades?marketId=2&limit=10' | jq .
```

**Response:**

```json
{
  "trades": [
    {
      "id": "trade_12345",
      "marketId": 2,
      "price": 145.23,
      "size": 2.5,
      "side": "buy", // Taker side
      "time": 1738598400000
    }
  ]
}
```

---

## Code Examples

### Example 1: Market Scanner

```javascript
// monitor-markets.js
// Scans all markets and displays key metrics

const BASE_URL = 'https://zo-mainnet.n1.xyz'

async function scanMarkets() {
  try {
    const info = await fetch(`${BASE_URL}/info`).json()

    console.log('🔍 01.xyz Market Scanner\n')

    for (const market of info.markets) {
      const stats = await fetch(`${BASE_URL}/market/${market.id}/stats`).json()
      const { perpStats } = stats

      const spreadPct = (
        ((perpStats.mark_price - perpStats.index_price) / perpStats.index_price) *
        100
      ).toFixed(4)
      const fundingAnnual = (perpStats.funding_rate * 3 * 365 * 100).toFixed(2)

      console.log(`${market.symbol}:`)
      console.log(
        `  Price: $${perpStats.mark_price.toFixed(2)} (Index: $${perpStats.index_price.toFixed(2)})`,
      )
      console.log(`  Spread: ${spreadPct}% | 24h: ${(perpStats.change_24h * 100).toFixed(2)}%`)
      console.log(
        `  Funding: ${fundingAnnual}% APR | OI: $${(perpStats.open_interest / 1000000).toFixed(2)}M`,
      )
      console.log('---')
    }
  } catch (error) {
    console.error('Error scanning markets:', error.message)
  }
}

scanMarkets()
```

### Example 2: Orderbook Analyzer

```javascript
// analyze-orderbook.js
// Analyzes orderbook depth and calculates slippage

const BASE_URL = 'https://zo-mainnet.n1.xyz'

async function analyzeOrderbook(marketId, size) {
  try {
    const [orderbook, stats] = await Promise.all([
      fetch(`${BASE_URL}/market/${marketId}/orderbook`).json(),
      fetch(`${BASE_URL}/market/${marketId}/stats`).json(),
    ])

    const { symbol } = stats
    const { bids, asks } = orderbook

    // Calculate VWAP for given size
    function getVWAP(orders, targetSize) {
      let filled = 0
      let totalCost = 0

      for (const [price, amount] of orders) {
        const fillAmount = Math.min(amount, targetSize - filled)
        totalCost += fillAmount * price
        filled += fillAmount

        if (filled >= targetSize) break
      }

      return filled < targetSize ? null : totalCost / filled
    }

    const buyVWAP = getVWAP(asks, size)
    const sellVWAP = getVWAP(bids, size)
    const markPrice = stats.perpStats.mark_price

    console.log(`📊 Orderbook Analysis: ${symbol}`)
    console.log(`Target Size: ${size} contracts\n`)

    if (buyVWAP) {
      const slippage = (((buyVWAP - markPrice) / markPrice) * 100).toFixed(4)
      console.log(`Buy Impact:  $${buyVWAP.toFixed(2)} (+${slippage}%)`)
    } else {
      console.log('Buy Impact:  Insufficient liquidity')
    }

    if (sellVWAP) {
      const slippage = (((markPrice - sellVWAP) / markPrice) * 100).toFixed(4)
      console.log(`Sell Impact: $${sellVWAP.toFixed(2)} (-${slippage}%)`)
    } else {
      console.log('Sell Impact: Insufficient liquidity')
    }
  } catch (error) {
    console.error('Error analyzing orderbook:', error.message)
  }
}

// Analyze SOL orderbook for 100 contracts
analyzeOrderbook(2, 100)
```

### Example 3: Funding Rate Alert

```javascript
// funding-alert.js
// Monitors funding rates and alerts on extreme values

const BASE_URL = 'https://zo-mainnet.n1.xyz'
const ALERT_THRESHOLD = 0.001 // 0.1% per 8h = ~109.5% APR

async function checkFunding() {
  try {
    const info = await fetch(`${BASE_URL}/info`).json()
    const alerts = []

    for (const market of info.markets) {
      const stats = await fetch(`${BASE_URL}/market/${market.id}/stats`).json()
      const rate = Math.abs(stats.perpStats.funding_rate)

      if (rate > ALERT_THRESHOLD) {
        const direction = stats.perpStats.funding_rate > 0 ? 'Longs pay' : 'Shorts pay'
        alerts.push({
          symbol: market.symbol,
          rate: stats.perpStats.funding_rate,
          apr: (rate * 3 * 365 * 100).toFixed(2) + '%',
          direction,
        })
      }
    }

    if (alerts.length > 0) {
      console.log('🚨 HIGH FUNDING RATES DETECTED:\n')
      alerts.forEach((a) => {
        console.log(`${a.symbol}: ${a.direction} ${a.apr} APR`)
      })
    } else {
      console.log('✅ All funding rates within normal ranges')
    }
  } catch (error) {
    console.error('Error checking funding:', error.message)
  }
}

checkFunding()
```

---

## Rate Limits

### Public Endpoints

| Endpoint Type     | Rate Limit         |
| ----------------- | ------------------ |
| Market data (GET) | 100 req/min per IP |
| Orderbook (GET)   | 100 req/min per IP |
| Stats (GET)       | 60 req/min per IP  |

### Best Practices

1. **Cache responses** — Don't refetch unchanged data
2. **Batch requests** — Get multiple markets in parallel
3. **Use WebSocket** — For real-time data, consider WebSocket feeds
4. **Handle 429 errors** — Implement exponential backoff

### Error Handling

```javascript
async function safeFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)

      if (res.status === 429) {
        const delay = Math.pow(2, i) * 1000
        console.log(`Rate limited. Retrying in ${delay}ms...`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (err) {
      if (i === retries - 1) throw err
    }
  }
}
```

---

## Next Steps

- ✅ You've mastered safe, read-only operations
- 📖 Read [risk-management.md](risk-management.md) to understand margin calculations
- ⚠️ Review [safety-first.md](safety-first.md) before any trading operations
- 💻 See [examples/](examples/) for working code

---

_All examples use public endpoints and are safe to run without authentication._
