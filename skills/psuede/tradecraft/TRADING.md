# Tradecraft Trading API

Execute trades and manage positions on Solana.

**Main Documentation:** [skills.md](https://tradecraft.finance/skills.md)

---

## Execute Buy Order

Purchase tokens using SOL from a specified wallet.

**Endpoint:** `POST /trade/buy`

**Scopes:** `trade:write`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tokenAddress` | string | Yes | Solana token mint address |
| `walletId` | integer | Yes | Wallet ID to use |
| `solAmount` | number | Yes | Amount of SOL to spend |
| `slippagePercentage` | number | No | Max slippage (default: 5, max: 50) |
| `priorityFee` | number | No | Priority fee in SOL (default: auto) |
| `groupId` | integer | No | Group ID if trading within a group |

```bash
curl -X POST "https://api.tradecraft.finance/v1/trade/buy" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "So11111111111111111111111111111111111111112",
    "walletId": 42,
    "solAmount": 0.5,
    "slippagePercentage": 10
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "positionId": 123,
    "signature": "5J7...abc",
    "tokenAmount": 1000000,
    "solSpent": 0.5,
    "pricePerToken": 0.0000005
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes:**

- `INVALID_TOKEN_ADDRESS` (400): Invalid token mint address
- `INVALID_WALLET_ID` (400): Invalid or missing wallet ID
- `INVALID_AMOUNT` (400): Invalid SOL amount
- `WALLET_NOT_FOUND` (404): Wallet doesn't exist or not yours
- `TRADING_DISABLED` (403): Trading disabled for this wallet
- `NOT_GROUP_MEMBER` (403): Not a member of specified group
- `TRADE_EXECUTION_FAILED` (400): Transaction failed on-chain

---

## Execute Sell Order

Sell tokens from an existing position.

**Endpoint:** `POST /trade/sell`

**Scopes:** `trade:write`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `positionId` | integer | Yes | Position ID to sell from |
| `tokenAmount` | number | No | Amount to sell (omit for full position) |

```bash
# Sell entire position
curl -X POST "https://api.tradecraft.finance/v1/trade/sell" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "positionId": 123
  }'
```

```bash
# Partial sell
curl -X POST "https://api.tradecraft.finance/v1/trade/sell" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "positionId": 123,
    "tokenAmount": 500000
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "positionId": 123,
    "signature": "3K9...xyz",
    "tokensSold": 500000,
    "solReceived": 0.25,
    "remainingTokens": 500000
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes:**

- `INVALID_POSITION_ID` (400): Invalid position ID
- `POSITION_NOT_FOUND` (404): Position doesn't exist or not yours
- `INSUFFICIENT_TOKENS` (400): Not enough tokens to sell
- `TRADING_DISABLED` (403): Trading disabled for this wallet

---

## List Positions

Get a paginated list of your trading positions.

**Endpoint:** `GET /positions`

**Scopes:** `trade:read`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | all | `open`, `closed`, or `all` |
| `limit` | integer | 50 | Results per page (max: 500) |
| `offset` | integer | 0 | Pagination offset |

```bash
curl -X GET "https://api.tradecraft.finance/v1/positions?status=open&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "id": 123,
        "tokenAddress": "So11111111111111111111111111111111111111112",
        "tokenName": "Wrapped SOL",
        "tokenSymbol": "SOL",
        "currentAmount": 1000000,
        "avgBuyPrice": 0.0000005,
        "currentPrice": 0.0000006,
        "currentValueSol": 0.6,
        "pnl": 0.1,
        "pnlPercentage": 20,
        "realizedPnl": 0,
        "gainMultiplier": 1.2,
        "status": "open",
        "walletId": 42,
        "groupId": null,
        "createdAt": "2024-01-15T08:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

---

## Get Trade History

Get a paginated list of executed trades.

**Endpoint:** `GET /positions/trades`

**Scopes:** `trade:read`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `action` | string | - | Filter: `buy` or `sell` |
| `limit` | integer | 50 | Results per page (max: 500) |
| `offset` | integer | 0 | Pagination offset |
| `since` | ISO8601 | - | Only trades after this timestamp |

```bash
curl -X GET "https://api.tradecraft.finance/v1/positions/trades?action=sell&limit=10&since=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": 456,
        "positionId": 123,
        "action": "sell",
        "tokenAddress": "So11111111111111111111111111111111111111112",
        "tokenName": "Wrapped SOL",
        "tokenAmount": 500000,
        "solAmount": 0.25,
        "pricePerToken": 0.0000005,
        "pnlSol": 0.05,
        "pnlPercentage": 25,
        "signature": "3K9...xyz",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

---

## Complete Buy Flow Example

```bash
# 1. List wallets to find one with trading enabled
curl -X GET "https://api.tradecraft.finance/v1/wallets" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 2. Execute buy order
curl -X POST "https://api.tradecraft.finance/v1/trade/buy" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "TOKEN_MINT_ADDRESS",
    "walletId": 42,
    "solAmount": 0.1,
    "slippagePercentage": 10
  }'

# 3. Check position status
curl -X GET "https://api.tradecraft.finance/v1/positions?status=open" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 4. View trade history
curl -X GET "https://api.tradecraft.finance/v1/positions/trades?action=buy" \
  -H "Authorization: Bearer YOUR_API_KEY"
```
