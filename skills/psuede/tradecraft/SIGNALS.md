# Tradecraft Signals API

Subscribe to and monitor trading signal sources.

**Main Documentation:** [skills.md](https://tradecraft.finance/skills.md)

---

## List Signal Sources

Get available signal sources from the marketplace.

**Endpoint:** `GET /signals/sources`

**Scopes:** `signals:read`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by category |
| `search` | string | - | Search by name/description |
| `sortBy` | string | newest | `newest`, `popular`, `rating` |
| `limit` | integer | 20 | Results per page (max: 100) |
| `offset` | integer | 0 | Pagination offset |

```bash
curl -X GET "https://api.tradecraft.finance/v1/signals/sources?category=telegram&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "id": 1,
        "name": "Alpha Signals",
        "description": "High-quality Solana token signals",
        "category": "telegram",
        "isFree": false,
        "price": 0.5,
        "paymentMethod": "SOL",
        "subscriberCount": 150,
        "rating": 4.5,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
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

## Subscribe to Signal Source

Subscribe to a signal source to receive trading signals.

**Endpoint:** `POST /signals/sources/:sourceId/subscribe`

**Scopes:** `signals:write`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentMethod` | string | No | `FREE`, `SOL`, `HODL`, `WHITELIST` |
| `transactionSignature` | string | Conditional | Required for SOL payment |
| `connectedWallet` | string | Conditional | Required for HODL verification |

```bash
# Free source
curl -X POST "https://api.tradecraft.finance/v1/signals/sources/1/subscribe" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "FREE"
  }'
```

```bash
# Paid source
curl -X POST "https://api.tradecraft.finance/v1/signals/sources/2/subscribe" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "SOL",
    "transactionSignature": "5J7...abc"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": 789,
      "sourceId": 1,
      "sourceName": "Alpha Signals",
      "paymentMethod": "FREE",
      "subscribedAt": "2024-01-15T10:30:00.000Z",
      "expiresAt": "2025-01-15T10:30:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes:**

- `SOURCE_NOT_FOUND` (404): Signal source doesn't exist
- `SOURCE_NOT_AVAILABLE` (400): Source is not approved
- `ALREADY_SUBSCRIBED` (400): Already have active subscription
- `NOT_FREE` (400): Source requires payment
- `NOT_WHITELISTED` (403): Not on whitelist
- `MISSING_TRANSACTION` (400): Transaction signature required for SOL
- `MISSING_WALLET` (400): Wallet required for HODL verification

---

## Get Signals from Source

Fetch signals from a subscribed signal source.

**Endpoint:** `GET /signals/sources/:sourceId/signals`

**Scopes:** `signals:read`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (max: 100) |
| `before` | ISO8601 | - | Cursor for pagination (timestamp) |

```bash
curl -X GET "https://api.tradecraft.finance/v1/signals/sources/1/signals?limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

```bash
# With pagination
curl -X GET "https://api.tradecraft.finance/v1/signals/sources/1/signals?limit=20&before=2024-01-15T10:00:00.000Z" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": 1001,
        "tokenAddress": "So11111111111111111111111111111111111111112",
        "chain": "solana",
        "signalTime": "2024-01-15T10:15:00.000Z",
        "initialPrice": 0.0000005,
        "metadata": {
          "source": "telegram",
          "channel": "alpha_calls"
        }
      }
    ],
    "pagination": {
      "hasMore": true,
      "nextCursor": "2024-01-15T10:00:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes:**

- `SOURCE_NOT_FOUND` (404): Signal source doesn't exist
- `ACCESS_DENIED` (403): No active subscription to this source

---

## Signal Monitoring Example

```bash
# 1. List available signal sources
curl -X GET "https://api.tradecraft.finance/v1/signals/sources?category=telegram" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 2. Subscribe to a source
curl -X POST "https://api.tradecraft.finance/v1/signals/sources/1/subscribe" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "FREE"}'

# 3. Poll for new signals (implement continuous polling)
curl -X GET "https://api.tradecraft.finance/v1/signals/sources/1/signals?limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 4. Execute trades based on signals
curl -X POST "https://api.tradecraft.finance/v1/trade/buy" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "SIGNAL_TOKEN_ADDRESS",
    "walletId": 42,
    "solAmount": 0.5
  }'
```

---

## Error Codes

| Code                   | HTTP | Description                      |
| ---------------------- | ---- | -------------------------------- |
| `SOURCE_NOT_FOUND`     | 404  | Signal source doesn't exist      |
| `SOURCE_NOT_AVAILABLE` | 400  | Source not approved or active    |
| `ALREADY_SUBSCRIBED`   | 400  | Already have active subscription |
| `NOT_FREE`             | 400  | Source requires payment          |
| `NOT_WHITELISTED`      | 403  | Not on whitelist for source      |
| `MISSING_TRANSACTION`  | 400  | Transaction signature required   |
| `MISSING_WALLET`       | 400  | Wallet required for HODL         |
| `ACCESS_DENIED`        | 403  | No active subscription           |
