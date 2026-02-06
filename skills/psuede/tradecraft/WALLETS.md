# Tradecraft Wallets API

Manage Privy-powered trading wallets.

**Main Documentation:** [skills.md](https://tradecraft.finance/skills.md)

---

## List Wallets

Get all wallets associated with your account.

**Endpoint:** `GET /wallets`

**Scopes:** `wallets:read`

```bash
curl -X GET "https://api.tradecraft.finance/v1/wallets" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": 42,
        "name": "Main Trading Wallet",
        "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "balance": 5.25,
        "tradingEnabled": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": 43,
        "name": "Backup Wallet",
        "address": "8QzEZwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWN",
        "balance": 2.0,
        "balanceError": false,
        "tradingEnabled": false,
        "createdAt": "2024-01-05T00:00:00.000Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Note:** `balance` may be `null` with `balanceError: true` if balance fetch times out.

---

## Create Wallet

Generate a new Privy-managed wallet. Created with trading disabled by default.

**Endpoint:** `POST /wallets`

**Scopes:** `wallets:write`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Wallet name (auto-generated if not provided) |

```bash
curl -X POST "https://api.tradecraft.finance/v1/wallets" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bot Trading Wallet"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": 44,
      "name": "Bot Trading Wallet",
      "address": "7PzFXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWO",
      "tradingEnabled": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "requiresFrontendActivation": true
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Note:** `requiresFrontendActivation: true` indicates trading must be enabled via the API (documented below)

**Error Codes:**

- `SERVICE_UNAVAILABLE` (503): Privy wallet service not configured
- `PRIVY_ACCOUNT_REQUIRED` (400): User must have Privy account
- `WALLET_EXISTS` (409): Wallet with this address already exists

---

## Enable Wallet Trading

Enable trading for a specific wallet.

**Endpoint:** `POST /wallets/:walletId/enable-trading`

**Scopes:** `wallets:write`

```bash
curl -X POST "https://api.tradecraft.finance/v1/wallets/42/enable-trading" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": 42,
      "tradingEnabled": true
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

---

## Disable Wallet Trading

Disable trading for a specific wallet.

**Endpoint:** `POST /wallets/:walletId/disable-trading`

**Scopes:** `wallets:write`

```bash
curl -X POST "https://api.tradecraft.finance/v1/wallets/42/disable-trading" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": 42,
      "tradingEnabled": false
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

---

## Wallet Management Example

```bash
# 1. Create a new wallet
curl -X POST "https://api.tradecraft.finance/v1/wallets" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bot Trading Wallet"}'

# 2. Enable trading (may require frontend activation first)
curl -X POST "https://api.tradecraft.finance/v1/wallets/44/enable-trading" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 3. Check wallet balance
curl -X GET "https://api.tradecraft.finance/v1/wallets" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 4. Execute trades with the wallet
curl -X POST "https://api.tradecraft.finance/v1/trade/buy" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "TOKEN_ADDRESS",
    "walletId": 44,
    "solAmount": 1.0
  }'
```

---

## Error Codes

| Code                     | HTTP | Description                         |
| ------------------------ | ---- | ----------------------------------- |
| `SERVICE_UNAVAILABLE`    | 503  | Privy wallet service not configured |
| `PRIVY_ACCOUNT_REQUIRED` | 400  | User must have Privy account        |
| `WALLET_EXISTS`          | 409  | Wallet already exists               |
| `WALLET_NOT_FOUND`       | 404  | Wallet doesn't exist or not yours   |
| `TRADING_DISABLED`       | 403  | Trading disabled for wallet         |
