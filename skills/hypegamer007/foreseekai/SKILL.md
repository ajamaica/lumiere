---
name: foreseek
description: Trade prediction markets with natural language via Foreseek.
  Matches your beliefs to Kalshi contracts and executes trades. Use when
  user wants to bet on or trade predictions about elections, politics,
  sports outcomes, economic data (Fed rates, CPI, GDP), crypto prices,
  weather events, or any real-world event outcomes. Supports viewing
  positions, parsing predictions, executing market/limit orders, managing
  orders, and checking account status.
metadata:
  clawdbot:
    requires:
      env:
        - FORESEEK_API_KEY
---

# Foreseek - Prediction Market Trading

Trade prediction markets through natural language. Say what you believe,
get matched to the right contract on Kalshi.

## Setup

Get your API key from [foreseek.ai/dashboard](https://foreseek.ai/dashboard) → API Keys tab.

```bash
export FORESEEK_API_KEY="fsk_your_api_key_here"
```

## Quick Commands

### Parse a Prediction (Find Matching Markets)

Converts natural language to matched Kalshi contracts.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "parse", "prediction": "Fed will cut rates in March"}'
```

**Response:**

```json
{
  "matched": true,
  "confidence": 0.92,
  "direction": "yes",
  "market": {
    "ticker": "KXFED-25MAR-T475",
    "title": "Fed funds rate below 4.75% on March 19",
    "price": 0.35,
    "event_ticker": "KXFED-25MAR",
    "kalshi_url": "https://kalshi.com/markets/kxfed/fed-funds-rate-below-475-on-march-19/kxfed-25mar#market=KXFED-25MAR-T475"
  },
  "insight": "Currently trading at 35¢, implying 35% probability"
}
```

### Execute a Trade

Places an order on Kalshi through your connected account.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "trade",
    "ticker": "KXFED-25MAR-T475",
    "side": "yes",
    "action": "buy",
    "count": 10,
    "type": "market"
  }'
```

**Response:**

```json
{
  "success": true,
  "order": {
    "order_id": "abc123",
    "status": "filled",
    "filled_count": 10,
    "avg_price": 35
  },
  "message": "BUY 10 YES contracts on KXFED-25MAR-T475"
}
```

### View Positions

Shows your current open positions on Kalshi.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "positions"}'
```

**Response:**

```json
{
  "count": 2,
  "positions": [
    {
      "ticker": "KXBTC-120K-JAN",
      "title": "Bitcoin above $120,000",
      "side": "yes",
      "contracts": 25,
      "avg_price": 42,
      "current_price": 48,
      "pnl": 150
    }
  ],
  "is_demo": false
}
```

### Search Markets

Browse available markets by keyword or category.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "markets", "query": "bitcoin", "limit": 5}'
```

### View Pending Orders

Shows your pending and recent orders on Kalshi.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "orders"}'
```

**Response:**

```json
{
  "count": 3,
  "orders": [
    {
      "order_id": "abc123",
      "ticker": "KXBTC-120K",
      "side": "yes",
      "action": "buy",
      "status": "pending",
      "count": 10,
      "filled": 5,
      "price": 42,
      "created_at": "2026-01-31T10:00:00Z"
    }
  ],
  "is_demo": false
}
```

### Cancel an Order

Cancels a pending order by order ID.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "cancel", "order_id": "abc123"}'
```

**Response:**

```json
{
  "success": true,
  "order_id": "abc123",
  "message": "Order abc123 cancelled successfully"
}
```

### Check Account Status

View your subscription tier, usage limits, and connection status.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "status"}'
```

**Response:**

```json
{
  "tier": "pro",
  "daily_used": 5000,
  "daily_limit": 150000,
  "daily_percent": 3.3,
  "monthly_used": 25000,
  "monthly_limit": 3000000,
  "monthly_percent": 0.8,
  "predictions_used": 2,
  "predictions_limit": 75,
  "is_limited": false,
  "kalshi_connected": true,
  "is_demo": false
}
```

### Check Account Balance

View your Kalshi account balance and portfolio value.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "balance"}'
```

**Response:**

```json
{
  "balance": 1000.0,
  "available": 850.0,
  "portfolio_value": 150.0,
  "is_demo": false
}
```

### View Watchlist

View your saved markets with current prices.

```bash
curl -X POST https://jxvtetqmzduvhgiyldgp.supabase.co/functions/v1/foreseek-cli \
  -H "Authorization: Bearer $FORESEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "watchlist"}'
```

**Response:**

```json
{
  "count": 2,
  "watchlist": [
    {
      "ticker": "KXBTC-120K-JAN",
      "title": "Bitcoin above $120,000",
      "price": 48,
      "volume": 125000,
      "status": "open",
      "added_at": "2026-01-15T08:00:00Z"
    }
  ]
}
```

## Prediction Examples

| What You Say                       | Matched Market   |
| ---------------------------------- | ---------------- |
| "Trump wins 2028"                  | KXPRES-2028-REP  |
| "Bitcoin above $100k by month end" | KXBTC-100K-JAN   |
| "Eagles win Super Bowl"            | KXNFLSB-PHI      |
| "Fed cuts rates in March"          | KXFED-25MAR-T475 |
| "CPI above 3% next month"          | KXCPI-FEB-3PCT   |
| "Nvidia hits $200"                 | KXNVDA-200       |

## Operations Reference

| Operation | Description              | Scope     | Consumes Budget |
| --------- | ------------------------ | --------- | --------------- |
| parse     | AI prediction matching   | parse     | Yes             |
| trade     | Execute Kalshi orders    | trade     | No              |
| positions | View open positions      | positions | No              |
| markets   | Search available markets | markets   | No              |
| orders    | View pending orders      | orders    | No              |
| cancel    | Cancel pending order     | cancel    | No              |
| status    | Check tier & usage       | status    | No              |
| balance   | Get account balance      | balance   | No              |
| watchlist | View saved markets       | watchlist | No              |

## Trade Parameters

| Parameter  | Type   | Required    | Description                                                                          |
| ---------- | ------ | ----------- | ------------------------------------------------------------------------------------ |
| operation  | string | Yes         | One of: parse, trade, positions, markets, orders, cancel, status, balance, watchlist |
| prediction | string | For parse   | Natural language prediction                                                          |
| ticker     | string | For trade   | Market ticker (e.g., KXBTC-120K-JAN)                                                 |
| side       | string | For trade   | "yes" or "no"                                                                        |
| action     | string | For trade   | "buy" or "sell" (default: buy)                                                       |
| count      | number | For trade   | Number of contracts                                                                  |
| type       | string | For trade   | "market" or "limit" (default: market)                                                |
| yes_price  | number | For limit   | Limit price in cents (for YES side)                                                  |
| no_price   | number | For limit   | Limit price in cents (for NO side)                                                   |
| query      | string | For markets | Search term                                                                          |
| category   | string | For markets | Filter by category                                                                   |
| limit      | number | For markets | Max results (default: 10, max: 50)                                                   |
| order_id   | string | For cancel  | Order ID to cancel                                                                   |

## Error Handling

**401 - Unauthorized**

```json
{ "error": "Invalid or revoked API key" }
```

→ Check your API key is correct and not revoked

**403 - Forbidden**

```json
{ "error": "API key does not have permission for 'trade' operation" }
```

→ API key scopes don't include this operation

**429 - Rate Limited**

```json
{
  "error": "rate_limited",
  "tier": "free",
  "daily_used": 10000,
  "daily_limit": 10000,
  "message": "Daily limit reached. Resets at midnight UTC.",
  "upgrade_url": "https://foreseek.ai/pricing"
}
```

→ Daily token limit reached. Upgrade for higher limits:

- Free: ~5 predictions/day
- Pro ($29/mo): ~75 predictions/day
- Ultra ($79/mo): ~200 predictions/day

**400 - Bad Request**

```json
{
  "error": "Kalshi not connected",
  "message": "Connect your Kalshi account at https://foreseek.ai/dashboard"
}
```

→ Connect your Kalshi API credentials in the dashboard

## Categories

Available market categories for filtering:

- Politics (elections, legislation)
- Economics (Fed rates, CPI, GDP, unemployment)
- Crypto (Bitcoin, Ethereum prices)
- Sports (NFL, NBA, MLB, soccer)
- Entertainment (Oscars, streaming)
- Weather (temperature, hurricanes)
- Tech (product launches, earnings)

## Requirements

1. **Foreseek Account**: Sign up at [foreseek.ai](https://foreseek.ai)
2. **Kalshi Connection**: Connect your Kalshi API keys in the dashboard
3. **API Key**: Generate one from Dashboard → API Keys

## Links

- Website: https://foreseek.ai
- Dashboard: https://foreseek.ai/dashboard
- Documentation: https://foreseek.ai/docs
