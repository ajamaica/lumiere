# SDK Reference: Nord.ts

> Complete reference for the @n1xyz/nord-ts TypeScript SDK.

The Nord SDK provides type-safe, ergonomic access to the 01.xyz trading infrastructure.

## Table of Contents

1. [Installation](#installation)
2. [Basic Initialization](#basic-initialization)
3. [Configuration](#configuration)
4. [Core Operations](#core-operations)
5. [Streaming Data](#streaming-data)
6. [Error Handling](#error-handling)
7. [Advanced Patterns](#advanced-patterns)

---

## Installation

### npm

```bash
npm install @n1xyz/nord-ts
```

### yarn

```bash
yarn add @n1xyz/nord-ts
```

### pnpm

```bash
pnpm install @n1xyz/nord-ts
```

### Peer Dependencies

```bash
npm install @solana/web3.js
```

---

## Basic Initialization

### Quick Start

```typescript
import { Nord } from '@n1xyz/nord-ts'
import { Connection } from '@solana/web3.js'

// 1. Create Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com')

// 2. Initialize Nord
const nord = await Nord.new({
  app: 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5', // 01 Exchange App ID
  solanaConnection: connection,
  webServerUrl: 'https://zo-mainnet.n1.xyz',
})

console.log('✅ Nord initialized')

// 3. Fetch market data
const markets = await nord.getMarkets()
console.log(`Loaded ${markets.length} markets`)
```

### Devnet Initialization

```typescript
const nord = await Nord.new({
  app: 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5',
  solanaConnection: new Connection('https://api.devnet.solana.com'),
  webServerUrl: 'https://zo-devnet.n1.xyz', // Devnet URL
})
```

### With Custom Local API

```typescript
const nord = await Nord.new({
  app: 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5',
  solanaConnection: connection,
  webServerUrl: 'https://zo-mainnet.n1.xyz',
  localApiUrl: 'http://localhost:3000', // Your local API
})
```

---

## Configuration

### NordConfig Interface

```typescript
interface NordConfig {
  // Required
  app: string // 01 Exchange App ID
  solanaConnection: Connection // Solana web3.js connection

  // Optional
  webServerUrl?: string // Default: mainnet
  localApiUrl?: string // Default: http://localhost:3000
  timeout?: number // Request timeout (ms)
  retryAttempts?: number // Retry failed requests
}
```

### Environment-based Configuration

```typescript
// config.ts
import { Nord } from '@n1xyz/nord-ts'
import { Connection } from '@solana/web3.js'

const IS_DEV = process.env.NODE_ENV === 'development'

export const config = {
  app: process.env.NORD_APP_ID || 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5',
  solanaRpc: IS_DEV
    ? 'https://api.devnet.solana.com'
    : process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  webServerUrl: IS_DEV
    ? 'https://zo-devnet.n1.xyz'
    : process.env.NORD_WEBSERVER || 'https://zo-mainnet.n1.xyz',
  localApiUrl: process.env.LOCAL_API_URL || 'http://localhost:3000',
}

export async function createNordClient() {
  return Nord.new({
    app: config.app,
    solanaConnection: new Connection(config.solanaRpc),
    webServerUrl: config.webServerUrl,
    localApiUrl: config.localApiUrl,
  })
}
```

---

## Core Operations

### Markets

#### Get All Markets

```typescript
const markets = await nord.getMarkets()

// Market structure
interface Market {
  id: number // Numeric market ID
  symbol: string // e.g., "SOLUSD"
  name: string // e.g., "Solana"
  baseAsset: string // e.g., "SOL"
  quoteAsset: string // e.g., "USD"
  maxLeverage: number // e.g., 20
  minOrderSize: number // Minimum order quantity
  tickSize: number // Price increment
  maintenanceMargin: number // Liquidation threshold
}
```

#### Get Single Market

```typescript
const market = await nord.getMarket(2) // SOLUSD
console.log(market.symbol, market.maxLeverage)
```

### Market Data

#### Get Orderbook

```typescript
const orderbook = await nord.getOrderbook(2)

interface Orderbook {
  marketId: number
  symbol: string
  bids: Array<[number, number]> // [[price, size], ...]
  asks: Array<[number, number]>
  timestamp: number
}

// Access best bid/ask
const bestBid = orderbook.bids[0] // [price, size]
const bestAsk = orderbook.asks[0]
const spread = bestAsk[0] - bestBid[0]
```

#### Get Market Stats

```typescript
const stats = await nord.getMarketStats(2)

interface MarketStats {
  marketId: number
  symbol: string
  perpStats: {
    mark_price: number
    index_price: number
    funding_rate: number // Per 8-hour period
    volume_24h: number // USD volume
    open_interest: number // USD OI
    change_24h: number // 24h return
    high_24h: number
    low_24h: number
  }
  timestamp: number
}
```

### Account Operations

#### Get Account (requires local API)

```typescript
const account = await nord.getAccount(walletAddress)

interface Account {
  address: string
  totalCollateral: number
  freeCollateral: number
  totalPositionValue: number
  totalAccountValue: number
  marginFraction: number
  maintenanceMarginRequired: number
  positions: Position[]
  openOrders: Order[]
}

interface Position {
  marketId: number
  side: 'long' | 'short'
  size: number // Positive for long, negative for short
  entryPrice: number
  markPrice: number
  unrealizedPnl: number
  realizedPnl: number
  liquidationPrice: number
  cumulativeFunding: number
}
```

#### Get Account Summary

```typescript
const summary = await nord.getAccountSummary(walletAddress)
// Quick overview without full position details
```

### Orders

#### Place Order

```typescript
const order = await nord.placeOrder({
  marketId: 2, // SOLUSD
  side: 'buy', // 'buy' or 'sell'
  size: 10.0, // Size in base asset
  price: 145.0, // Limit price (omit for market)

  // Optional
  orderType: 'limit', // 'limit' | 'market' | 'ioc'
  postOnly: false, // Maker-only order
  reduceOnly: false, // Can only reduce position
  clientId: 'my-id-123', // Custom ID for tracking
})

interface Order {
  id: string
  clientId?: string
  marketId: number
  side: 'buy' | 'sell'
  size: number
  price: number
  orderType: string
  status: 'open' | 'filled' | 'partially_filled' | 'cancelled'
  filledSize: number
  remainingSize: number
  avgPrice: number
  createdAt: number
}
```

#### Market Order

```typescript
const order = await nord.placeOrder({
  marketId: 2,
  side: 'buy',
  size: 10.0,
  orderType: 'market',
})
```

#### Stop-Loss / Take-Profit

```typescript
// Stop-loss limit
const stopLoss = await nord.placeOrder({
  marketId: 2,
  side: 'sell',
  size: 10.0,
  orderType: 'stopLimit',
  triggerPrice: 140.0, // Trigger when price <= 140
  price: 139.5, // Execute at this price
  reduceOnly: true,
})

// Take-profit limit
const takeProfit = await nord.placeOrder({
  marketId: 2,
  side: 'sell',
  size: 10.0,
  orderType: 'takeProfitLimit',
  triggerPrice: 160.0, // Trigger when price >= 160
  price: 159.5,
  reduceOnly: true,
})
```

#### Cancel Orders

```typescript
// Cancel by ID
await nord.cancelOrder(orderId)

// Cancel all in market
await nord.cancelAllOrders(2)

// Cancel all globally
await nord.cancelAllOrders()

// Cancel by client ID
await nord.cancelByClientId('my-id-123')
```

#### Get Orders

```typescript
// Get all open orders
const openOrders = await nord.getOpenOrders()

// Get order by ID
const order = await nord.getOrder(orderId)

// Get order history
const history = await nord.getOrderHistory({
  limit: 100,
  startTime: Date.now() - 86400000, // Last 24h
})
```

### Fills

```typescript
// Get recent fills
const fills = await nord.getFills({
  limit: 50,
  marketId: 2,
})

interface Fill {
  id: string
  orderId: string
  marketId: number
  side: 'buy' | 'sell'
  size: number
  price: number
  fee: number
  feeRate: number
  realizedPnl?: number
  time: number
}
```

### Position Management

```typescript
// Close specific position
await nord.closePosition(2) // Close SOL position

// Close all positions
await nord.closeAllPositions()

// Modify position (reduce only)
await nord.reducePosition({
  marketId: 2,
  targetSize: 5.0, // Reduce to 5 SOL
})
```

### Deposits/Withdrawals

```typescript
// Deposit collateral
declare const deposit: (params: { token: string; amount: number }) => Promise<{
  signature: string
  status: string
}>

await nord.deposit({
  token: 'USDC',
  amount: 10000.0,
})

// Withdraw
declare const withdraw: (params: { token: string; amount: number }) => Promise<{
  signature: string
  status: string
}>

await nord.withdraw({
  token: 'USDC',
  amount: 5000.0,
})
```

---

## Streaming Data

### WebSocket Connection (if supported)

```typescript
// Subscribe to orderbook updates
const unsubscribe = nord.subscribeOrderbook(2, (update) => {
  console.log('Orderbook update:', update)
})

// Subscribe to trades
nord.subscribeTrades(2, (trade) => {
  console.log('Trade:', trade.price, trade.size)
})

// Subscribe to account updates
nord.subscribeAccount(walletAddress, (account) => {
  console.log('Account update:', account.marginFraction)
})

// Cleanup
unsubscribe()
```

### Polling Fallback

```typescript
class DataPoller {
  constructor(nord, interval = 5000) {
    this.nord = nord
    this.interval = interval
    this.subscribers = new Map()
  }

  subscribe(key, fetchFn, callback) {
    this.subscribers.set(key, { fetchFn, callback, lastData: null })
  }

  start() {
    this.timer = setInterval(async () => {
      for (const [key, sub] of this.subscribers) {
        try {
          const data = await sub.fetchFn()
          if (JSON.stringify(data) !== JSON.stringify(sub.lastData)) {
            sub.callback(data)
            sub.lastData = data
          }
        } catch (err) {
          console.error(`Poll error for ${key}:`, err)
        }
      }
    }, this.interval)
  }

  stop() {
    clearInterval(this.timer)
  }
}

// Usage
const poller = new DataPoller(nord)

poller.subscribe(
  'sol-ob',
  () => nord.getOrderbook(2),
  (ob) => console.log('SOL orderbook updated'),
)

poller.subscribe(
  'account',
  () => nord.getAccount(wallet),
  (acc) => console.log('Account updated'),
)

poller.start()
```

---

## Error Handling

### NordError Types

```typescript
import { NordError, NordValidationError, NordNetworkError, NordAuthError } from '@n1xyz/nord-ts';

try {
  const order = await nord.placeOrder({...});
} catch (error) {
  if (error instanceof NordValidationError) {
    console.error('Validation failed:', error.field, error.message);
    // Fix and retry
  } else if (error instanceof NordNetworkError) {
    console.error('Network issue:', error.code);
    // Retry with backoff
  } else if (error instanceof NordAuthError) {
    console.error('Authentication failed - check local API');
    // Check local API status
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Common Error Codes

| Error                 | Cause                 | Solution                  |
| --------------------- | --------------------- | ------------------------- |
| `INSUFFICIENT_MARGIN` | Not enough collateral | Add margin or reduce size |
| `INVALID_MARKET`      | Wrong market ID       | Check market list         |
| `ORDER_TOO_SMALL`     | Below min order size  | Increase order size       |
| `PRICE_TICK`          | Price not aligned     | Round to tick size        |
| `RATE_LIMIT`          | Too many requests     | Slow down, add backoff    |
| `LOCAL_API_ERROR`     | Local API unreachable | Check connection          |

### Retry Logic

```typescript
async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      // Only retry network errors
      if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
        const delay = Math.pow(2, i) * 1000
        console.log(`Retry ${i + 1}/${maxRetries} in ${delay}ms...`)
        await new Promise((r) => setTimeout(r, delay))
      } else {
        throw error // Don't retry validation errors
      }
    }
  }
}

// Usage
const order = await withRetry(() =>
  nord.placeOrder({ marketId: 2, side: 'buy', size: 10, orderType: 'market' }),
)
```

---

## Advanced Patterns

### Batch Operations

```typescript
// Place multiple orders atomically
const orders = await nord.placeOrders([
  { marketId: 2, side: 'buy', size: 10, price: 140, orderType: 'limit' },
  { marketId: 2, side: 'sell', size: 10, price: 160, orderType: 'limit' },
  { marketId: 1, side: 'buy', size: 1, price: 3500, orderType: 'limit' },
])

// All succeed or all fail (atomic)
```

### Bracket Orders

```typescript
async function placeBracketOrder(nord, params) {
  const { marketId, side, size, entryPrice, stopLoss, takeProfit } = params

  // 1. Entry order
  const entry = await nord.placeOrder({
    marketId,
    side,
    size,
    price: entryPrice,
    orderType: 'limit',
  })

  // 2. Stop-loss (triggered when entry fills)
  const stopSide = side === 'buy' ? 'sell' : 'buy'
  const stop = await nord.placeOrder({
    marketId,
    side: stopSide,
    size,
    orderType: 'stopLimit',
    triggerPrice: stopLoss,
    price: stopSide === 'sell' ? stopLoss * 0.995 : stopLoss * 1.005,
    reduceOnly: true,
  })

  // 3. Take-profit
  const profit = await nord.placeOrder({
    marketId,
    side: stopSide,
    size,
    orderType: 'takeProfitLimit',
    triggerPrice: takeProfit,
    price: stopSide === 'sell' ? takeProfit * 0.995 : takeProfit * 1.005,
    reduceOnly: true,
  })

  return { entry, stop, profit }
}

// Usage
const bracket = await placeBracketOrder(nord, {
  marketId: 2,
  side: 'buy',
  size: 10,
  entryPrice: 145,
  stopLoss: 140,
  takeProfit: 155,
})
```

### Position Builder

```typescript
class PositionBuilder {
  constructor(nord) {
    this.nord = nord
    this.intendedPositions = []
  }

  add(marketId, side, size, leverage = 1) {
    this.intendedPositions.push({ marketId, side, size, leverage })
    return this
  }

  async validate(account, markets) {
    const totalValue = account.totalCollateral
    let requiredMargin = 0

    for (const pos of this.intendedPositions) {
      const market = markets.find((m) => m.id === pos.marketId)
      const notional = pos.size * market.markPrice
      const margin = notional / pos.leverage
      requiredMargin += margin

      if (pos.leverage > market.maxLeverage) {
        throw new Error(`${market.symbol} exceeds max leverage ${market.maxLeverage}`)
      }
    }

    if (requiredMargin > totalValue * 0.8) {
      throw new Error(`Required margin $${requiredMargin} exceeds 80% of collateral`)
    }

    return { valid: true, requiredMargin }
  }

  async execute() {
    const account = await this.nord.getAccount()
    const markets = await this.nord.getMarkets()

    await this.validate(account, markets)

    const orders = this.intendedPositions.map((pos) => ({
      marketId: pos.marketId,
      side: pos.side,
      size: pos.size,
      orderType: 'market', // Or use limit for precise entry
    }))

    return await this.nord.placeOrders(orders)
  }
}

// Usage
const builder = new PositionBuilder(nord)
const result = await builder
  .add(2, 'buy', 10, 5) // 10 SOL at 5x
  .add(1, 'sell', 2, 3) // Short 2 ETH at 3x
  .execute()
```

---

## Summary

### Quick Command Reference

| Operation      | Method                          |
| -------------- | ------------------------------- |
| Initialize     | `Nord.new(config)`              |
| Markets        | `nord.getMarkets()`             |
| Orderbook      | `nord.getOrderbook(id)`         |
| Stats          | `nord.getMarketStats(id)`       |
| Account        | `nord.getAccount(address)`      |
| Place Order    | `nord.placeOrder(params)`       |
| Cancel Order   | `nord.cancelOrder(id)`          |
| Close Position | `nord.closePosition(marketId)`  |
| Deposits       | `nord.deposit({token, amount})` |

### TypeScript Tips

1. **Enable strict mode** in tsconfig.json for best type safety
2. **Use discriminated unions** for order status handling
3. **Define custom types** for your specific strategies
4. **Add runtime validation** with zod or io-ts

### Resources

- [npm Package](https://www.npmjs.com/package/@n1xyz/nord-ts)
- [01.xyz Docs](https://docs.01.xyz)
- [GitHub](https://github.com/n1-exchange)

---

_Next: See [examples/](examples/) for working code samples._
