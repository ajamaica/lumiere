# Agent API Skill - REST API for Trading Data & Token Info

Integrated REST API for AI agents and external services. Provides trading data, token information, holdings, and token creation functionalities.

## Overview

| Feature                | Endpoint                               | Description                             |
| ---------------------- | -------------------------------------- | --------------------------------------- |
| Chart Data             | `GET /agent/chart/:token_id`           | OHLCV chart data                        |
| Swap History           | `GET /agent/swap-history/:token_id`    | Transaction history                     |
| Market Data            | `GET /agent/market/:token_id`          | Current market data                     |
| Metrics                | `GET /agent/metrics/:token_id`         | Trading metrics                         |
| Token Info             | `GET /agent/token/:token_id`           | Token information                       |
| Holdings               | `GET /agent/holdings/:account_id`      | User holdings                           |
| Upload Image           | `POST /agent/token/image`              | Image upload                            |
| Upload Metadata        | `POST /agent/token/metadata`           | Metadata upload                         |
| Created Tokens         | `GET /agent/token/created/:account_id` | List of created tokens                  |
| Mine Salt              | `POST /agent/salt`                     | Salt mining for token address           |
| **API Key Management** |                                        |                                         |
| Create API Key         | `POST /api-key`                        | Generate new API key (session required) |
| List API Keys          | `GET /api-key`                         | List your API keys (session required)   |
| Revoke API Key         | `DELETE /api-key/:id`                  | Deactivate API key (session required)   |

## Authentication

All Agent APIs require an `X-API-Key` header.

```typescript
const headers = { 'X-API-Key': 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }
```

**Rate Limit:** 60 req/min per API Key

### Excluded Origins (No API Key Required)

| Origin                                        | Rate Limit                    |
| --------------------------------------------- | ----------------------------- |
| nad.fun, nadapp.net, _.nad.fun, _.symphony.io | None                          |
| localhost:\*                                  | None                          |
| Other external origins                        | 60 req/min (API Key required) |

---

## API Key Management

> **Note:** API Key management requires a session cookie from nad.fun login. Login via wallet on [nad.fun](https://nad.fun) first.

> **Limit:** Maximum 5 API keys per account. Delete existing keys if you need more.

### 1. Create API Key (`POST /api-key`)

Generate a new API key. Requires session cookie (login).

```bash
curl -X POST https://api.nadapp.net/api-key \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<your_session_cookie>" \
  -d '{
    "name": "My Trading Bot",
    "description": "External service integration",
    "expires_in_days": 365
  }'
```

**Request Body:**

| Field             | Type   | Required | Description                                     |
| ----------------- | ------ | -------- | ----------------------------------------------- |
| `name`            | string | Yes      | API Key name                                    |
| `description`     | string | No       | Description                                     |
| `expires_in_days` | number | No       | Expiration period in days. null = never expires |

**Response:**

```json
{
  "id": 7185139933124608001,
  "api_key": "nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "key_prefix": "nadfun_xxxxxxxx",
  "name": "My Trading Bot"
}
```

> **Important:** The `api_key` is only returned **once** at creation. Store it securely!

**Browser Console Method (after login to nad.fun):**

```javascript
fetch('/api-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My API Key',
    expires_in_days: 365,
  }),
})
  .then((r) => r.json())
  .then(console.log)
```

---

### 2. List API Keys (`GET /api-key`)

Retrieve your API keys. Requires session cookie.

```bash
curl https://api.nadapp.net/api-key \
  -H "Cookie: session=<your_session_cookie>"
```

**Response:**

```json
{
  "api_keys": [
    {
      "id": 7185139933124608001,
      "key_prefix": "nadfun_xxxxxxxx",
      "name": "My Trading Bot",
      "description": "External service integration",
      "owner_address": "0x1234...",
      "is_active": true,
      "created_at": "2025-02-02T10:00:00Z",
      "expires_at": "2026-02-02T10:00:00Z",
      "last_used_at": "2025-02-02T12:30:00Z",
      "request_count": 1523
    }
  ],
  "total": 1
}
```

---

### 3. Revoke API Key (`DELETE /api-key/:id`)

Deactivate an API key. Requires session cookie.

```bash
curl -X DELETE https://api.nadapp.net/api-key/7185139933124608001 \
  -H "Cookie: session=<your_session_cookie>"
```

**Response:**

```json
{
  "success": true
}
```

---

### API Key TypeScript Interfaces

```typescript
interface CreateApiKeyRequest {
  name: string
  description?: string
  expires_in_days?: number // null = never expires
}

interface CreateApiKeyResponse {
  id: number // Snowflake ID
  api_key: string // Only returned once!
  key_prefix: string
  name: string
}

interface ApiKeyInfo {
  id: number // Snowflake ID
  key_prefix: string
  name: string
  description?: string
  owner_address?: string
  is_active: boolean
  created_at: string
  expires_at?: string
  last_used_at?: string
  request_count: number
}

interface ApiKeyListResponse {
  api_keys: ApiKeyInfo[]
  total: number
}
```

---

### Rate Limit Headers

All API Key requests include these response headers:

| Header               | Value | Description                 |
| -------------------- | ----- | --------------------------- |
| `X-RateLimit-Limit`  | 60    | Requests allowed per minute |
| `X-RateLimit-Window` | 1m    | Rate limit window           |

**Rate Limit Exceeded (429):**

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 1
}
```

---

### API Key Expiration

API keys have an optional expiration date set at creation (`expires_in_days`). When an API key expires:

- All requests with the expired key return **401 Unauthorized**
- The key cannot be reactivated
- You must create a new API key via `POST /api-key` (requires login session)

**To check expiration:** Use `GET /api-key` to view `expires_at` for each key.

**To renew:** Create a new API key before the current one expires, then update your application.

---

### Security Best Practices

1. **Store securely**: API key is only shown once at creation
2. **Use environment variables**: Never hardcode in source code
3. **Set expiration**: Rotate keys periodically
4. **Revoke immediately**: If key is compromised, revoke via DELETE endpoint
5. **Monitor expiration**: Check `expires_at` regularly and renew before expiry

```bash
# Environment variable example
export NAD_API_KEY="nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

```typescript
// Usage in code
const apiKey = process.env.NAD_API_KEY
const headers = { 'X-API-Key': apiKey }
```

## Setup

```typescript
const NETWORK = 'mainnet' // 'testnet' | 'mainnet'
const CONFIG = {
  testnet: {
    apiUrl: 'https://dev-api.nad.fun',
  },
  mainnet: {
    apiUrl: 'https://api.nadapp.net',
  },
}[NETWORK]

const API_KEY = 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
const headers = { 'X-API-Key': API_KEY }
```

---

## 1. Chart Data

Retrieve OHLCV price chart data for tokens.

```typescript
interface BarResponse {
  k: string // Chart type
  t: number[] // Timestamp array (seconds)
  o: string[] // Open price array
  h: string[] // High price array
  l: string[] // Low price array
  c: string[] // Close price array
  v: string[] // Volume array
  s: string // Status: 'ok', 'error', 'no_data'
}

// Query params
interface ChartParams {
  resolution: '1' | '5' | '15' | '30' | '60' | '240' | '1D' // Required
  from: number // Unix timestamp (Required)
  to: number // Unix timestamp (Required)
  countback?: number // Maximum number of candles (default: 500, max: 3000)
  chart_type?: 'price' | 'price_usd' | 'market_cap' | 'market_cap_usd'
}

async function getChartData(tokenId: string, params: ChartParams): Promise<BarResponse> {
  const url = new URL(`${CONFIG.apiUrl}/agent/chart/${tokenId}`)
  url.search = new URLSearchParams(params as any).toString()

  const res = await fetch(url, { headers })
  return res.json()
}

// Example
const chart = await getChartData('0x1234...', {
  resolution: '60',
  from: Math.floor(Date.now() / 1000) - 86400,
  to: Math.floor(Date.now() / 1000),
})
console.log('Prices:', chart.c)
```

---

## 2. Swap History

Retrieve token swap/transaction history.

```typescript
interface SwapInfo {
  event_type: 'BUY' | 'SELL'
  native_amount: string
  token_amount: string
  native_price: string
  value: string
  transaction_hash: string
  created_at: number
}

interface AccountInfo {
  account_id: string
  nickname: string
  bio: string
  image_uri: string
}

interface TokenSwapResponse {
  swaps: Array<{
    account_info: AccountInfo
    swap_info: SwapInfo
  }>
  total_count: number
}

// Query params
interface SwapHistoryParams {
  page?: number
  limit?: number
  direction?: 'ASC' | 'DESC'
  trade_type?: 'BUY' | 'SELL' | 'ALL'
  volume_ranges?: string // 'small', 'medium', 'large' (comma separated)
  account_id?: string
}

async function getSwapHistory(
  tokenId: string,
  params?: SwapHistoryParams,
): Promise<TokenSwapResponse> {
  const url = new URL(`${CONFIG.apiUrl}/agent/swap-history/${tokenId}`)
  if (params) url.search = new URLSearchParams(params as any).toString()

  const res = await fetch(url, { headers })
  return res.json()
}

// Example
const history = await getSwapHistory('0x1234...', { limit: 20, trade_type: 'BUY' })
console.log('Recent buys:', history.swaps.length)
```

---

## 3. Market Data

Retrieve current market data for tokens.

```typescript
interface MarketInfo {
  market_type: 'CURVE' | 'DEX'
  token_id: string
  market_id: string
  reserve_native: string
  reserve_token: string
  token_price: string
  native_price: string
  price: string
  price_usd: string
  price_native: string
  total_supply: string
  volume: string
  ath_price: string
  ath_price_usd: string
  ath_price_native: string
  holder_count: number
}

interface MarketResponse {
  market_info: MarketInfo
}

async function getMarketData(tokenId: string): Promise<MarketResponse> {
  const res = await fetch(`${CONFIG.apiUrl}/agent/market/${tokenId}`, { headers })
  return res.json()
}

// Example
const market = await getMarketData('0x1234...')
console.log('Price USD:', market.market_info.price_usd)
console.log('Holders:', market.market_info.holder_count)
```

---

## 4. Trading Metrics

Retrieve trading metrics for tokens.

```typescript
interface MetricsBatchResponse {
  metrics: Array<{
    timeframe: string
    percent: number
    transactions: { buy: number; sell: number; total: number }
    volume: { buy: string; sell: string; total: string }
    makers: { buy: number; sell: number; total: number }
  }>
}

async function getMetrics(tokenId: string, timeframes: string[]): Promise<MetricsBatchResponse> {
  const url = new URL(`${CONFIG.apiUrl}/agent/metrics/${tokenId}`)
  url.searchParams.set('timeframes', timeframes.join(','))

  const res = await fetch(url, { headers })
  return res.json()
}

// Example
const metrics = await getMetrics('0x1234...', ['1', '5', '60', '1D'])
console.log('1h change:', metrics.metrics.find((m) => m.timeframe === '60')?.percent)
```

---

## 5. Token Info

Retrieve comprehensive token information.

```typescript
interface TokenInfo {
  token_id: string
  name: string
  symbol: string
  image_uri: string
  description?: string
  is_graduated: boolean
  is_nsfw: boolean
  twitter?: string
  telegram?: string
  website?: string
  created_at: number
  creator: AccountInfo
  is_cto: boolean
}

interface TokenResponse {
  token_info: TokenInfo
}

async function getTokenInfo(tokenId: string): Promise<TokenResponse> {
  const res = await fetch(`${CONFIG.apiUrl}/agent/token/${tokenId}`, { headers })
  return res.json()
}

// Example
const token = await getTokenInfo('0x1234...')
console.log('Token:', token.token_info.name, token.token_info.symbol)
```

---

## 6. User Holdings

Retrieve user token holdings.

```typescript
interface BalanceInfo {
  balance: string
  token_price: string
  native_price: string
  created_at: number
}

interface HoldTokenResponse {
  tokens: Array<{
    token_info: TokenInfo
    balance_info: BalanceInfo
    market_info: MarketInfo
  }>
  total_count: number
}

async function getHoldings(accountId: string, page = 1, limit = 20): Promise<HoldTokenResponse> {
  const url = new URL(`${CONFIG.apiUrl}/agent/holdings/${accountId}`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url, { headers })
  return res.json()
}

// Example
const holdings = await getHoldings('0xabc...')
console.log('Holding', holdings.total_count, 'tokens')
```

---

## 7. Upload Image

Upload token image.

```typescript
interface UploadImageResponse {
  is_nsfw: boolean
  image_uri: string
}

async function uploadImage(imageBuffer: Buffer, contentType: string): Promise<UploadImageResponse> {
  const res = await fetch(`${CONFIG.apiUrl}/agent/token/image`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': contentType,
    },
    body: imageBuffer,
  })
  return res.json()
}

// Example (Node.js)
import { readFileSync } from 'fs'
const imageBuffer = readFileSync('token.png')
const result = await uploadImage(imageBuffer, 'image/png')
console.log('Image URI:', result.image_uri)
```

**Restrictions:**

- Maximum file size: 5MB
- Supported formats: PNG, JPG, GIF, WEBP, SVG

---

## 8. Upload Metadata

Upload token metadata.

```typescript
interface UploadMetadataRequest {
  image_uri: string // Required: URI received from uploadImage
  name: string // Required: 1-32 characters
  symbol: string // Required: 1-10 characters, alphanumeric only
  description?: string // Maximum 500 characters
  website?: string // Starts with https://
  twitter?: string // Starts with https://x.com/
  telegram?: string // Starts with https://t.me/
}

interface UploadMetadataResponse {
  metadata_uri: string
  metadata: {
    name: string
    symbol: string
    description?: string
    image_uri: string
    website?: string
    twitter?: string
    telegram?: string
    is_nsfw: boolean
  }
}

async function uploadMetadata(data: UploadMetadataRequest): Promise<UploadMetadataResponse> {
  const res = await fetch(`${CONFIG.apiUrl}/agent/token/metadata`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return res.json()
}

// Example
const metadata = await uploadMetadata({
  image_uri: 'https://storage.nadapp.net/images/abc.png',
  name: 'My Token',
  symbol: 'MTK',
  description: 'A great token',
})
console.log('Metadata URI:', metadata.metadata_uri)
```

---

## 9. Created Tokens

Retrieve a list of tokens created by an account and their reward information.

```typescript
interface RewardInfo {
  amount: string
  claimed_amount: string
  proof: string[]
  claimable: boolean
}

interface CreatedTokensResponse {
  tokens: Array<{
    token_info: TokenInfo
    market_info: MarketInfo
    balance_info: BalanceInfo
    reward_info: RewardInfo
  }>
  total_count: number
}

async function getCreatedTokens(
  accountId: string,
  page = 1,
  limit = 10,
): Promise<CreatedTokensResponse> {
  const url = new URL(`${CONFIG.apiUrl}/agent/token/created/${accountId}`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url, { headers })
  return res.json()
}

// Example
const created = await getCreatedTokens('0xabc...')
console.log('Created', created.total_count, 'tokens')
```

---

## 10. Mine Salt

Mine salt for token address generation.

```typescript
interface MineSaltRequest {
  creator: string // Token creator address (0x + 40 hex)
  name: string // Token name (1-32 characters)
  symbol: string // Token symbol (1-10 characters, alphanumeric only)
  metadata_uri: string // Metadata URI
}

interface MineSaltResponse {
  salt: string // 0x + 64 hex
  address: string // Calculated token address
}

async function mineSalt(data: MineSaltRequest): Promise<MineSaltResponse> {
  const res = await fetch(`${CONFIG.apiUrl}/agent/salt`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return res.json()
}

// Example
const saltResult = await mineSalt({
  creator: '0x1234567890123456789012345678901234567890',
  name: 'My Token',
  symbol: 'MTK',
  metadata_uri: 'https://storage.nadapp.net/metadata/abc.json',
})
console.log('Salt:', saltResult.salt)
console.log('Token Address:', saltResult.address)
```

---

## Error Codes

| Status Code | Description                                                   |
| ----------- | ------------------------------------------------------------- |
| 200         | Success                                                       |
| 400         | Bad Request                                                   |
| 401         | Authentication Failed (API Key required, invalid, or expired) |
| 404         | Token/Account/API Key not found                               |
| 408         | Request Timeout (max salt mining iterations reached)          |
| 413         | File size exceeded (image upload)                             |
| 429         | Rate limit exceeded (60 req/min)                              |
| 500         | Internal Server Error                                         |

---

## Complete Example

```typescript
const API_KEY = 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
const BASE_URL = 'https://api.nadapp.net'
const headers = { 'X-API-Key': API_KEY }

async function analyzeToken(tokenId: string) {
  // Get token info
  const tokenRes = await fetch(`${BASE_URL}/agent/token/${tokenId}`, { headers })
  const token = await tokenRes.json()
  console.log(`Token: ${token.token_info.name} (${token.token_info.symbol})`)

  // Get market data
  const marketRes = await fetch(`${BASE_URL}/agent/market/${tokenId}`, { headers })
  const market = await marketRes.json()
  console.log(`Price: $${market.market_info.price_usd}`)
  console.log(`Holders: ${market.market_info.holder_count}`)
  console.log(`Market Type: ${market.market_info.market_type}`)

  // Get metrics
  const metricsRes = await fetch(`${BASE_URL}/agent/metrics/${tokenId}?timeframes=1,60,1D`, {
    headers,
  })
  const metrics = await metricsRes.json()

  for (const m of metrics.metrics) {
    console.log(`${m.timeframe}: ${m.percent}% (${m.transactions.total} txs)`)
  }

  // Get recent trades
  const swapsRes = await fetch(`${BASE_URL}/agent/swap-history/${tokenId}?limit=5`, { headers })
  const swaps = await swapsRes.json()

  console.log('Recent trades:')
  for (const swap of swaps.swaps) {
    console.log(`  ${swap.swap_info.event_type}: ${swap.swap_info.value} MON`)
  }
}

analyzeToken('0x1234...')
```

---

## See Also

- **CREATE.md** - Token creation with on-chain contract calls
- **QUOTE.md** - On-chain price quotes
- **TRADING.md** - On-chain trading
