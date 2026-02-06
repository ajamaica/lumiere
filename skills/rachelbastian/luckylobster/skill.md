---
name: luckylobster
description: Trade prediction markets on Polymarket. Search markets, place orders, and manage positions.
homepage: https://luckylobster.io
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'primaryEnv': 'LUCKYLOBSTER_API_KEY',
        'emoji': '🦞',
        'homepage': 'https://luckylobster.io',
        'requires': { 'env': ['LUCKYLOBSTER_API_KEY'] },
      },
  }
---

# LuckyLobster - Polymarket Trading API

Trade prediction markets on Polymarket through a secure API designed for AI agents.

## How Polymarket Works

Polymarket is a prediction market where you trade on the outcomes of real-world events.

**Buying Contracts:**

- In active markets, you can buy outcome contracts priced from $0.01 to $0.99
- Each contract entitles you to 1 share at your purchase price
- Lower prices = higher potential return, but less likely outcome (market's view)

**Selling Contracts:**

- You can sell your shares at any time before the market closes
- Sell price depends on current market conditions

**Market Resolution:**

- When a market resolves, the winning outcome pays **$1.00 USDC per share**
- Losing outcomes pay $0 (or a negligible amount in rare cases)

**Example:** You buy 100 "Yes" shares at $0.35 each (cost: $35). If "Yes" wins, you receive $100 (profit: $65). If "No" wins, you lose your $35.

## Setup

If you don't have an API key configured, use the device authorization flow to link your account.

### Device Authorization Flow

**Step 1: Request a Device Code**

```http
POST https://luckylobster.io/api/auth/device
Content-Type: application/json

{
  "agent_name": "OpenClaw Agent"
}
```

Response:

```json
{
  "device_code": "abc123...",
  "user_code": "ABCD-1234",
  "verification_uri": "https://luckylobster.io/link",
  "verification_uri_complete": "https://luckylobster.io/link?code=ABCD-1234",
  "expires_in": 900,
  "interval": 5
}
```

**Step 2: Direct the User**

Display this message to the user:

```
🦞 To connect LuckyLobster, visit: https://luckylobster.io/link
   Enter code: ABCD-1234
```

**Step 3: Poll for Authorization**

Poll every 5 seconds until authorized:

```http
GET https://luckylobster.io/api/auth/device/token?device_code=abc123...
```

Pending response:

```json
{ "error": "authorization_pending" }
```

Success response:

```json
{
  "api_key": "ll_abc123...",
  "user_email": "user@example.com",
  "permissions": ["read", "trade", "cancel", "redeem"]
}
```

All linked agents receive standard permissions: **read** (view markets/orders/positions), **trade** (buy/sell), **cancel** (cancel orders), and **redeem** (settle positions).

**Step 4: Store the API Key**

Save the API key persistently so it survives restarts. It is only returned once.

**Option A: OpenClaw Config (Recommended)**
Use the `gateway` tool with `config.patch` to save it in the skill entry:

```javascript
gateway.config.patch({
  patch: {
    skills: {
      entries: {
        luckylobster: {
          env: {
            LUCKYLOBSTER_API_KEY: 'll_abc123...',
          },
        },
      },
    },
  },
})
```

**Option B: Environment File**
Append it to `~/.openclaw/.env` or the workspace `.env` file if one exists:

```bash
echo "LUCKYLOBSTER_API_KEY=ll_abc123..." >> ~/.openclaw/.env
```

---

## Authentication

All API requests require an API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

## Base URL

```
https://luckylobster.io/api/agent/v1
```

## Rate Limits

- Default: 100 requests per minute
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Max requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset time (ISO 8601)

## Endpoints

### Search Markets

Find prediction markets on Polymarket. The search uses smart relevance scoring to return the best matches first.

```http
GET /markets/search?q={query}
```

**Parameters:**

- `q` (required for search): Natural language query - "bitcoin 15m", "trump election", "superbowl winner"
- `limit` (optional): Max results (default: 10, max: 100)
- `offset` (optional): Pagination offset
- `sort` (optional): "relevance" (default), "volume", "liquidity", "end_date", "recent"
- `ending_soon` (optional): Prioritize markets ending within 24h (default: false)
- `min_volume` (optional): Minimum volume in USD (default: 100)
- `min_liquidity` (optional): Minimum liquidity in USD
- `tag` (optional): Filter by category: "crypto", "politics", "sports", "entertainment"
- `accepting_orders` (optional): Only tradeable markets (default: true)

**Search Tips:**

- **Shorthand supported:** "btc 15m" → "Bitcoin Up or Down", "eth daily" → "Ethereum Up or Down on"
- The search auto-expands: btc→Bitcoin, eth→Ethereum, sol→Solana, etc.
- Time keywords (15m, hourly, daily) auto-expand to "Up or Down" queries
- Results are ranked by relevance: query match + liquidity + volume + accepting orders
- For time-sensitive markets, add `ending_soon=true` to prioritize markets expiring within 24h
- First result is usually the best match - check `context.topMatch`

**Example - Find Current BTC Market:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/markets/search?q=bitcoin%20up%20down&ending_soon=true&limit=5"
```

**Example - High-Volume Politics Markets:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/markets/search?q=election&tag=politics&sort=volume"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "1314069",
      "slug": "bitcoin-up-or-down-on-february-3",
      "question": "Bitcoin Up or Down on February 3?",
      "outcomes": ["Up", "Down"],
      "outcomePrices": ["0.65", "0.35"],
      "volume": "409100.65",
      "liquidity": "39255.13",
      "endDate": "2026-02-03T17:00:00Z",
      "active": true,
      "acceptingOrders": true
    }
  ],
  "pagination": { "limit": 5, "offset": 0, "count": 1, "hasMore": false },
  "context": {
    "hasResults": true,
    "topMatch": {
      "id": "1314069",
      "question": "Bitcoin Up or Down on February 3?",
      "acceptingOrders": true
    },
    "endingSoonCount": 1
  },
  "options": {
    "sortBy": ["relevance", "volume", "liquidity", "end_date", "recent"],
    "tags": ["crypto", "politics", "sports", "entertainment"]
  }
}
```

**Workflow for Trading:**

1. Search: `GET /markets/search?q=bitcoin up down`
2. Use the `id` from the top result to get full details: `GET /markets/{id}`
3. Response includes `clobTokenIds` - use these with trading endpoints

---

### Quick Crypto Market Lookup

For crypto up/down markets, use this simplified endpoint:

```http
GET /markets/crypto?asset={btc|eth|sol}&timeframe={daily|hourly|15m}
```

**Examples:**

- `/markets/crypto?asset=btc` - Today's Bitcoin daily market
- `/markets/crypto?asset=btc&timeframe=15m` - Current Bitcoin 15-minute market
- `/markets/crypto?asset=eth&timeframe=hourly` - Current Ethereum hourly market

**Response includes `tokens` array with `tokenId` ready for trading.**

---

### Find Market by Slug

If you know the exact market slug (from a Polymarket URL), use this for direct lookup:

```http
GET /markets/by-slug?slug={slug}
```

**Example:** For URL `https://polymarket.com/event/btc-updown-15m-1770129900`

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/markets/by-slug?slug=btc-updown-15m-1770129900"
```

Response includes `clobTokenIds` and `tokens` ready for trading.

**Note:** For most use cases, `/markets/search` or `/markets/crypto` is easier than constructing slugs.

### Get Market Details

Get detailed information about a specific market, **including token IDs required for market data and trading**.

```http
GET /markets/{id}
```

**Parameters:**

- `id`: Market ID or condition ID (from search results)

**Example:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/markets/0x1234..."
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "1314069",
    "conditionId": "0xf46bf33576e8341821161316705ab2357312f58d58b7d157cb8dca73b656b326",
    "question": "Bitcoin Up or Down on February 3?",
    "outcomes": ["Up", "Down"],
    "outcomePrices": ["0.345", "0.655"],
    "tokens": [
      { "tokenId": "36656454529662513...", "outcome": "Up", "price": "0.345" },
      { "tokenId": "10609233133841503...", "outcome": "Down", "price": "0.655" }
    ],
    "clobTokenIds": ["36656454529662513...", "10609233133841503..."],
    "volume": "409100.65",
    "liquidity": "39255.13",
    "active": true,
    "acceptingOrders": true,
    "spreads": [
      { "outcome": "Up", "tokenId": "36656454...", "bid": "0.34", "ask": "0.35", "spread": "0.01" }
    ]
  }
}
```

**Important:** Use the `tokenId` from the `tokens` array or `clobTokenIds` for the market data endpoints below.

---

## Market Data Endpoints

These endpoints provide real-time order book and pricing data from the Polymarket CLOB (Central Limit Order Book).

**Workflow for getting market data:**

1. Search markets: `GET /markets/search?q=Bitcoin`
2. Get market details: `GET /markets/{id}` → This returns `tokens[].tokenId`
3. Get market data: `GET /orderbook?token_id={tokenId}` or `GET /market-data?token_id={tokenId}`

### Get Order Book

Get the order book summary for a token, including all bids and asks.

```http
GET /orderbook?token_id={tokenId}
```

**Parameters:**

- `token_id` (required): The outcome token address
- `token_ids` (optional): Comma-separated list for batch request (max 20)

**Example:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/orderbook?token_id=71321045..."
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tokenId": "71321045...",
    "market": "0xabc...",
    "timestamp": "2025-01-15T12:00:00Z",
    "bids": [
      { "price": "0.65", "size": "1000" },
      { "price": "0.64", "size": "500" }
    ],
    "asks": [
      { "price": "0.66", "size": "800" },
      { "price": "0.67", "size": "1200" }
    ],
    "tickSize": "0.01",
    "minOrderSize": "1",
    "summary": {
      "bidCount": 15,
      "askCount": 12,
      "bestBid": "0.65",
      "bestAsk": "0.66",
      "spread": "0.01",
      "totalBidSize": "5000.00",
      "totalAskSize": "4200.00"
    }
  }
}
```

### Get Prices

Get current prices for a token including midpoint, buy/sell prices, and last trade.

```http
GET /prices?token_id={tokenId}
```

**Parameters:**

- `token_id` (required): The outcome token address
- `side` (optional): `BUY` or `SELL` to get price for specific side
- `token_ids` (optional): Comma-separated list for batch request (max 20)

**Example:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/prices?token_id=71321045..."
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tokenId": "71321045...",
    "midpoint": "0.655",
    "lastTradePrice": "0.65",
    "buyPrice": "0.66",
    "sellPrice": "0.65",
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

### Get Spread

Get the bid-ask spread for a token.

```http
GET /spread?token_id={tokenId}
```

**Parameters:**

- `token_id` (required): The outcome token address
- `token_ids` (optional): Comma-separated list for batch request (max 20)

**Example:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/spread?token_id=71321045..."
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tokenId": "71321045...",
    "bid": "0.65",
    "ask": "0.66",
    "spread": "0.01",
    "spreadPercent": "1.52",
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

### Get Comprehensive Market Data

Get all market data in a single request (order book summary, prices, spread).

```http
GET /market-data?token_id={tokenId}
```

**Parameters:**

- `token_id` (required): The outcome token address

**Example:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/market-data?token_id=71321045..."
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tokenId": "71321045...",
    "prices": {
      "midpoint": "0.655",
      "bestBid": "0.65",
      "bestAsk": "0.66",
      "lastTrade": "0.65"
    },
    "spread": {
      "absolute": "0.01",
      "percent": "1.52"
    },
    "orderbook": {
      "bidCount": 15,
      "askCount": 12,
      "totalBidSize": "5000.00",
      "totalAskSize": "4200.00",
      "topBids": [{ "price": "0.65", "size": "1000" }],
      "topAsks": [{ "price": "0.66", "size": "800" }]
    },
    "parameters": {
      "tickSize": "0.01",
      "minOrderSize": "1"
    },
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

---

## Trading Endpoints

### Place Order

Place a buy or sell order on a market. Returns real-time order status.

```http
POST /orders
Content-Type: application/json

{
  "tokenId": "0x1234...",
  "side": "BUY",
  "price": 0.65,
  "size": 50,
  "type": "LIMIT"
}
```

**Parameters:**

- `tokenId`: Outcome token address (from market data)
- `side`: `BUY` or `SELL`
- `price`: Price per share (0.01 to 0.99)
- `size`: Number of shares
- `type`: `LIMIT`, `MARKET`, `FOK`, or `FAK`

**Real-time Status:** The response includes the order's current status from Polymarket. FOK and MARKET orders return faster (~500ms) since they execute immediately. LIMIT orders are checked after ~1 second.

**Example:**

```bash
curl -X POST -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tokenId":"0x1234...","side":"BUY","price":0.65,"size":50,"type":"LIMIT"}' \
  "https://luckylobster.io/api/agent/v1/orders"
```

**Response (with fill data when available):**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord_abc123",
      "polyOrderId": "0x...",
      "status": "FILLED",
      "side": "BUY",
      "price": 0.65,
      "size": 50,
      "filledSize": 50,
      "avgFillPrice": 0.65,
      "transactionHash": "0x...",
      "filledAt": "2025-01-15T12:00:01Z"
    }
  }
}
```

### List Orders

Get your orders with real-time status from Polymarket.

```http
GET /orders?status=OPEN&limit=50
```

**Parameters:**

- `status` (optional): Filter by status - `PENDING`, `OPEN`, `FILLED`, `PARTIALLY_FILLED`, `CANCELLED`, `EXPIRED`, `FAILED`
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset
- `sync` (optional): Set to `false` to skip live status sync (default: true)

**Real-time Sync:** Open orders (PENDING, OPEN, PARTIALLY_FILLED) are automatically synced with Polymarket in parallel for real-time status. The response includes sync metadata.

**Example:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/orders?status=OPEN"
```

**Response includes sync info:**

```json
{
  "success": true,
  "data": [...],
  "sync": { "enabled": true, "updated": 2 }
}
```

### Get Order Status

Get details for a specific order, including live status from Polymarket.

```http
GET /orders/{orderId}
```

**Example:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/orders/ord_abc123"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord_abc123",
      "polyOrderId": "0x...",
      "tokenId": "123456...",
      "side": "BUY",
      "type": "LIMIT",
      "price": "0.65",
      "size": "50",
      "filledSize": "25",
      "status": "PARTIALLY_FILLED",
      "marketQuestion": "Bitcoin Up or Down?",
      "outcome": "Up",
      "submittedAt": "2025-01-15T12:00:00Z"
    },
    "liveStatus": {
      "polymarketStatus": "LIVE",
      "originalSize": 50,
      "sizeMatched": 25,
      "price": 0.65
    }
  }
}
```

### Cancel Order

Cancel an open order. Only orders with status `PENDING`, `OPEN`, or `PARTIALLY_FILLED` can be cancelled.

```http
DELETE /orders/{orderId}
```

**Example:**

```bash
curl -X DELETE -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/orders/ord_abc123"
```

**Response:**

```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "order": {
      "id": "ord_abc123",
      "polyOrderId": "0x...",
      "status": "CANCELLED",
      "previousStatus": "OPEN",
      "filledSize": "25",
      "cancelledAt": "2025-01-15T12:05:00Z"
    }
  }
}
```

**Error Responses:**

- `400`: Order cannot be cancelled (already filled, cancelled, or failed)
- `403`: Order was not placed by your agent
- `404`: Order not found

**Notes:**

- You can only cancel orders that your agent placed
- If an order is partially filled, cancelling stops further fills but keeps the filled portion
- The `previousStatus` field shows what status the order had before cancellation

### Close Position (One-Shot)

Close an entire position with a single API call. The server handles determining the correct side, fetching current price, and placing the market order.

```http
POST /positions/{positionId}/close
```

**URL Parameters:**

- `positionId`: Position ID from `GET /positions`

**Optional Body:**

```json
{
  "type": "MARKET", // Order type: "MARKET" (default), "FOK", or "LIMIT"
  "slippage": 0.02, // Max slippage for LIMIT orders (default: 2%)
  "dryRun": true // Preview without executing
}
```

**Example - Close a position:**

```bash
curl -X POST -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/positions/pos_abc123/close"
```

**Example - Preview first (dry run):**

```bash
curl -X POST -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  "https://luckylobster.io/api/agent/v1/positions/pos_abc123/close"
```

**Response:**

```json
{
  "success": true,
  "message": "Position closed successfully",
  "data": {
    "order": {
      "id": "ord_xyz789",
      "polyOrderId": "0x...",
      "status": "FILLED",
      "side": "SELL",
      "type": "MARKET",
      "price": 0.65,
      "size": 100,
      "filledSize": 100,
      "avgFillPrice": 0.65,
      "transactionHash": "0x..."
    },
    "position": {
      "id": "pos_abc123",
      "remainingSize": 0,
      "isClosed": true
    },
    "execution": {
      "proceeds": 65.0,
      "pnl": 10.0,
      "pnlPercent": 18.18
    },
    "market": {
      "slug": "bitcoin-up-or-down-on-february-3",
      "question": "Bitcoin Up or Down on February 3?",
      "outcome": "Up"
    }
  }
}
```

**Dry Run Response:**

```json
{
  "success": true,
  "dryRun": true,
  "message": "Position close preview - no order placed",
  "data": {
    "position": {
      "id": "pos_abc123",
      "tokenId": "123456...",
      "size": 100,
      "avgEntryPrice": 0.55
    },
    "closeOrder": {
      "side": "SELL",
      "type": "MARKET",
      "price": 0.65,
      "size": 100
    },
    "estimates": {
      "currentPrice": 0.65,
      "bidPrice": 0.65,
      "proceeds": 65.0,
      "pnl": 10.0,
      "pnlPercent": 18.18
    }
  }
}
```

**Error Responses:**

- `400`: Position is already closed (size=0) or already settled
- `403`: Position belongs to another user
- `404`: Position not found
- `503`: Unable to fetch market price (market may be closed/illiquid)

**Notes:**

- Uses the current bid price for immediate execution
- For LIMIT orders, applies slippage tolerance (default 2%) below bid
- Position is partially closed if order only partially fills
- Check `position.isClosed` to verify complete exit

### Get Balance

Get raw wallet balance (live from chain).

```http
GET /balance
```

**Response:**

```json
{
  "success": true,
  "data": {
    "usdc": 93.16,
    "matic": 0.5,
    "address": "0x1234...",
    "walletType": "proxy"
  }
}
```

**Fields:**

- `usdc`: Raw USDC in wallet
- `matic`: For gas (rarely needed)
- `address`: Your trading wallet on Polygon

### Approve Tokens (Fix "not enough allowance" errors)

If you get a "not enough balance / allowance" error when selling or closing positions, you need to approve the CTF (Conditional Token Framework) contract. This is a one-time setup per wallet.

```http
POST /wallet/approve
```

**Request Body:**

```json
{
  "token": "CTF" // or "USDC", "NEG_RISK", "all"
}
```

**Token Types:**

- `USDC`: Required for buying (usually already approved)
- `CTF`: **Required for selling/closing positions**
- `NEG_RISK`: Required for multi-outcome markets
- `all`: Approve all tokens at once

**Example - Fix selling errors:**

```bash
curl -X POST -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"token": "CTF"}' \
  "https://luckylobster.io/api/agent/v1/wallet/approve"
```

**Response:**

```json
{
  "success": true,
  "message": "CTF approved successfully",
  "data": {
    "approvals": { "CTF": "0x..." },
    "successful": ["CTF"],
    "failed": []
  }
}
```

**When to use:**

- Error: "not enough balance / allowance" when selling
- Error: "not enough balance / allowance" when closing a position
- First time selling after wallet setup

### Get Budget

Get how much you can spend. **Use this before placing orders.**

Budget = min(wallet balance, fixed limit, % of wallet)

```http
GET /budget
```

**Response:**

```json
{
  "success": true,
  "data": {
    "usdc": 46.58,
    "limitedBy": "percent",
    "wallet": 93.16,
    "config": {
      "fixedLimit": null,
      "budgetPercent": 50,
      "maxPositionValue": null,
      "used": 0
    }
  }
}
```

**Fields:**

- `usdc`: **What you can spend** (accounts for all limits)
- `limitedBy`: Why you're capped (`"wallet"`, `"fixed_limit"`, `"percent"`, `"position_limit"`)
- `wallet`: Raw wallet balance
- `config`: Your budget settings

### Get Positions

Get your current positions directly from Polymarket. The endpoint fetches from the **Polymarket Data API** (source of truth) with automatic fallback to CLOB trades if Data API returns empty.

```http
GET /positions
```

**Parameters:**

- `status` (optional): Filter by status - `"open"` (default), `"settled"`, `"redeemable"`, or `"all"`
- `token_id` (optional): Filter by specific token ID
- `condition_id` (optional): Filter by condition ID (market)
- `source` (optional): Force data source - `"clob"` to bypass Data API and fetch directly from CLOB trades

**Example - Get Open Positions:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/positions"
```

**Example - Get Redeemable Positions:**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/positions?status=redeemable"
```

**Example - Force CLOB Source (for freshest data):**

```bash
curl -H "Authorization: Bearer $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/positions?source=clob"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "id": "0xabc123_0",
        "tokenId": "12345...",
        "conditionId": "0xabc123...",
        "market": {
          "slug": "bitcoin-up-or-down-on-february-3",
          "question": "Bitcoin Up or Down on February 3?",
          "outcome": "Up",
          "endDate": "2026-02-03T17:00:00Z",
          "eventSlug": "btc-updown"
        },
        "size": 100.0,
        "avgEntryPrice": 0.55,
        "currentPrice": 0.62,
        "currentValue": 62.0,
        "pnl": {
          "unrealized": 7.0,
          "unrealizedPercent": 12.73,
          "realized": 0.0,
          "realizedPercent": 0.0
        },
        "status": {
          "isOpen": true,
          "isSettled": false,
          "isRedeemable": false,
          "isMergeable": false,
          "isNegRisk": false
        },
        "oppositeOutcome": "Down",
        "oppositeAsset": "67890...",
        "updatedAt": "2026-02-03T14:45:00.000Z"
      }
    ],
    "summary": {
      "totalPositions": 1,
      "totalUnrealizedPnl": 7.0,
      "totalRealizedPnl": 0.0,
      "totalValue": 62.0
    },
    "filters": {
      "status": "open",
      "tokenId": null,
      "conditionId": null
    },
    "wallet": {
      "address": "0x539b2de928064898...",
      "type": "proxy"
    },
    "source": "data-api"
  }
}
```

**Key Fields:**

- `size`: Number of outcome tokens held
- `avgEntryPrice`: Average price paid per token (0.00 to 1.00)
- `currentPrice`: Live price from Polymarket
- `currentValue`: Current value in USDC
- `pnl.unrealized`: Unrealized profit/loss
- `pnl.unrealizedPercent`: Unrealized P&L as percentage
- `status.isRedeemable`: `true` if market resolved and position can be redeemed
- `status.isNegRisk`: `true` for multi-outcome markets (require special redemption)
- `wallet.type`: `"proxy"` (Polymarket smart wallet) or `"eoa"` (direct wallet)
- `source`: `"data-api"` or `"clob-trades"` - shows which data source was used

**Data Source Behavior:**

1. **Default**: Fetches from Polymarket Data API (most reliable, includes all historical positions)
2. **Fallback**: If Data API returns empty, automatically falls back to CLOB trades
3. **Forced CLOB**: Use `?source=clob` for freshest data immediately after placing an order (Data API can have ~30s delay)

**When to use `source=clob`:**

- Right after placing an order (Data API has indexing delay)
- When Data API returns fewer positions than expected
- For debugging position discrepancies

---

## Settlement & Redemption

When a market resolves, winning outcome tokens can be redeemed for $1.00 USDC each. The redemption endpoint automatically fetches all redeemable positions from Polymarket and redeems them in a single batched transaction.

### List Redeemable Positions

Check what positions are ready for redemption.

```http
GET /settlements/redeem
```

**Response:**

```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "conditionId": "0xbc13af0a940bb9a...",
        "title": "Bitcoin Up or Down - February 4, 1:45PM-2:00PM ET",
        "outcome": "Down",
        "size": 5.0,
        "estimatedValue": "$5.00",
        "negRisk": false
      }
    ],
    "count": 3,
    "totalValue": "$42.50",
    "wallet": "0x539b2de928064898..."
  },
  "message": "Found 3 redeemable positions (~$42.50). POST to redeem."
}
```

### Redeem Positions

Redeem winning positions in a single batched transaction. You can redeem all positions or target specific ones.

```http
POST /settlements/redeem
```

**Optional Parameters:**

```json
{
  "conditionId": "0x...", // Redeem ONLY this specific position
  "conditionIds": ["0x...", "..."], // Redeem ONLY these specific positions
  "limit": 50, // Max positions to redeem (default: 10, max: 50)
  "minValue": 1.0, // Skip positions below this value (default: $0.10)
  "dryRun": true // Preview what would be redeemed without executing
}
```

**Example - Redeem a specific position:**

```bash
curl -X POST -H "X-API-Key: $LUCKYLOBSTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"conditionId": "0xbc13af0a940bb9a..."}' \
  "https://luckylobster.io/api/agent/v1/settlements/redeem"
```

**Example - Redeem all:**

```bash
curl -X POST -H "X-API-Key: $LUCKYLOBSTER_API_KEY" \
  "https://luckylobster.io/api/agent/v1/settlements/redeem"
```

**Example - Dry run first:**

```bash
curl -X POST -H "X-API-Key: $LUCKYLOBSTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  "https://luckylobster.io/api/agent/v1/settlements/redeem"
```

**Example - Redeem up to 50, skip dust:**

```bash
curl -X POST -H "X-API-Key: $LUCKYLOBSTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "minValue": 1.00}' \
  "https://luckylobster.io/api/agent/v1/settlements/redeem"
```

**Response:**

```json
{
  "success": true,
  "message": "Redeemed 3 positions (~$42.50)",
  "data": {
    "processed": 3,
    "redeemed": [
      {
        "conditionId": "0xbc13af0a...",
        "title": "Bitcoin Up or Down - February 4, 1:45PM-2:00PM ET",
        "outcome": "Down",
        "size": 5.0,
        "txHash": "0x82d8d7e4d63185..."
      }
    ],
    "failed": [],
    "remaining": 0,
    "totalValueRedeemed": "$42.50"
  }
}
```

**Error Responses:**

- `404`: Wallet not found
- `403`: Missing "redeem" permission
- `501`: Polymarket Builder API not configured

**Notes:**

- Redemption is gasless (executed via Polymarket relayer)
- All positions are batched into a single on-chain transaction for efficiency
- Only positions marked as "redeemable" by Polymarket are included
- Both standard and NegRisk markets are handled automatically

---

## Error Handling

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable message"
}
```

**Status Codes:**

- `401`: Invalid API key
- `403`: Insufficient permissions or budget exceeded
- `404`: Resource not found
- `429`: Rate limit exceeded

## Permissions

- `read`: View markets, orders, positions, balance
- `trade`: Place orders
- `cancel`: Cancel orders
- `redeem`: Redeem settled positions
