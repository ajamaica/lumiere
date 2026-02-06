# Trading Basics

> ⚠️ **GATED SECTION** — Trading operations require running a local API and understanding risk. Read [safety-first.md](safety-first.md) first.

This guide covers the fundamentals of placing orders, managing positions, and understanding the 01.xyz trading mechanics. **Only proceed after setting up your local API and completing testnet validation.**

## Prerequisites Checklist

☐ Read [safety-first.md](safety-first.md) and acknowledged risks  
☐ Set up local API following [sdk-reference.md](sdk-reference.md)  
☐ Tested on devnet with fake funds  
☐ Understand margin requirements and liquidation mechanics  
☐ Have stop-loss strategy in place

---

## Table of Contents

1. [Market IDs Reference](#market-ids-reference)
2. [Order Types](#order-types)
3. [Position Lifecycle](#position-lifecycle)
4. [Margin Requirements](#margin-requirements)
5. [Order Placement](#order-placement)
6. [Post-Order Monitoring](#post-order-monitoring)

---

## Market IDs Reference

01.xyz uses **numeric market IDs** in all API calls. Symbols are for display only.

### Common Markets

| ID  | Symbol  | Name        | Max Leverage | Min Size  | Tick Size | Maint. Margin |
| --- | ------- | ----------- | ------------ | --------- | --------- | ------------- |
| 0   | BTCUSD  | Bitcoin     | 20x          | 0.001 BTC | $0.50     | 5%            |
| 1   | ETHUSD  | Ethereum    | 20x          | 0.01 ETH  | $0.10     | 5%            |
| 2   | SOLUSD  | Solana      | 20x          | 0.1 SOL   | $0.01     | 5%            |
| 3   | HYPEUSD | Hyperliquid | 10x          | 1 HYPE    | $0.001    | 10%           |
| 4   | JUPUSD  | Jupiter     | 10x          | 1 JUP     | $0.0001   | 10%           |
| 5   | JTOUSD  | Jito        | 10x          | 0.1 JTO   | $0.01     | 10%           |

### Getting Full Market List

```javascript
const markets = await fetch('https://zo-mainnet.n1.xyz/info').json()
console.table(
  markets.markets.map((m) => ({
    id: m.id,
    symbol: m.symbol,
    maxLeverage: m.maxLeverage,
    tickSize: m.tickSize,
  })),
)
```

**Important:**

- Always verify the market ID before placing orders
- IDs can change; fetch from `/info` periodically
- Trading with wrong ID = trading wrong asset!

---

## Order Types

01.xyz supports multiple order types for different trading strategies.

### Limit Order

**Purpose**: Buy/sell at specific price or better  
**Use When**: You want control over entry price

```javascript
{
  marketId: 2,
  side: 'buy',        // 'buy' or 'sell'
  size: 10.0,         // In base asset (SOL)
  price: 145.00,      // Limit price
  orderType: 'limit',
  postOnly: false,    // true = maker only, rejects if would fill
  reduceOnly: false   // true = can only close positions
}
```

### Market Order

**Purpose**: Immediate fill at best available price  
**Use When**: Speed matters more than price precision  
**Warning**: Can have significant slippage in thin markets

```javascript
{
  marketId: 2,
  side: 'buy',
  size: 10.0,
  orderType: 'market'
}
```

### IOC (Immediate-or-Cancel)

**Purpose**: Fill immediately or cancel unfilled portion  
**Use When**: You don't want resting orders

```javascript
{
  marketId: 2,
  side: 'buy',
  size: 10.0,
  price: 145.50,
  orderType: 'ioc'
}
```

### Post-Only

**Purpose**: Ensure maker rebate (limit order that can't fill as taker)  
**Use When**: Providing liquidity, want lower fees

```javascript
{
  marketId: 2,
  side: 'buy',
  size: 10.0,
  price: 144.80,      // Below best ask
  orderType: 'limit',
  postOnly: true
}
```

### Reduce-Only

**Purpose**: Only close/reduce existing position, never increase  
**Use When**: Closing positions, taking profit, stop-losses

```javascript
{
  marketId: 2,
  side: 'sell',
  size: 100.0,
  price: 150.00,
  orderType: 'limit',
  reduceOnly: true    // Won't open new short if no long position
}
```

### Trigger Orders (Stop-Loss / Take-Profit)

**Purpose**: Execute when price reaches trigger level  
**Use When**: Setting stop-losses, take-profit levels

```typescript
// Stop-loss: trigger when price falls below $140
{
  marketId: 2,
  side: 'sell',
  size: 10.0,
  orderType: 'stopLimit',
  triggerPrice: 140.00,
  price: 139.50,      // Execution price after trigger
  reduceOnly: true
}

// Take-profit: trigger when price rises above $160
{
  marketId: 2,
  side: 'sell',
  size: 10.0,
  orderType: 'takeProfitLimit',
  triggerPrice: 160.00,
  price: 159.50,
  reduceOnly: true
}
```

### Order Type Summary

| Type            | Time Priority | Partial Fills | Resting | Typical Use                |
| --------------- | ------------- | ------------- | ------- | -------------------------- |
| **Limit**       | Price-time    | Yes           | Yes     | Entry orders, maker orders |
| **Market**      | Immediate     | Yes           | No      | Quick entry/exit           |
| **IOC**         | Immediate     | Yes           | No      | Quick fill, no resting     |
| **Post-Only**   | Price-time    | Yes           | Yes     | Guaranteed maker           |
| **Reduce-Only** | Any           | Yes           | Varies  | Closing positions          |
| **Stop Market** | Trigger-based | Yes           | No      | Stop-loss                  |
| **Stop Limit**  | Trigger-based | Yes           | Yes     | Controlled stop-loss       |

---

## Position Lifecycle

### Opening a Position

```
1. Check account status
   ↓
2. Calculate margin requirement
   ↓
3. Place order (limit/market)
   ↓
4. Monitor fills
   ↓
5. Position opened
```

### Position States

| State          | Description                         | PnL Realized? |
| -------------- | ----------------------------------- | ------------- |
| **Open**       | Active position, subject to funding | No            |
| **Closing**    | Order placed to close, pending fill | No            |
| **Closed**     | Position fully closed               | Yes           |
| **Liquidated** | Forcibly closed by system           | Yes (loss)    |

### Monitoring Open Positions

```javascript
async function monitorPosition(walletAddress) {
  const account = await nord.getAccount(walletAddress)

  for (const position of account.positions) {
    const market = await nord.getMarket(position.marketId)
    const stats = await nord.getMarketStats(position.marketId)

    const unrealizedPnl = position.size * (stats.mark_price - position.entryPrice)
    const fundingPaid = position.cumulativeFunding
    const netPnl = unrealizedPnl - fundingPaid

    console.log(`${market.symbol} Position:`)
    console.log(`  Size: ${position.size} (${position.side})`)
    console.log(`  Entry: $${position.entryPrice}`)
    console.log(`  Mark: $${stats.mark_price}`)
    console.log(`  Unrealized PnL: $${unrealizedPnl.toFixed(2)}`)
    console.log(`  Funding Paid: $${fundingPaid.toFixed(2)}`)
    console.log(`  Net PnL: $${netPnl.toFixed(2)}`)
    console.log(`  Liquidation: $${position.liquidationPrice}`)
  }
}
```

### Closing Positions

```javascript
// Method 1: Market close (quick exit)
await nord.placeOrder({
  marketId: 2,
  side: 'sell', // Opposite of position
  size: 10.0, // Full position size
  orderType: 'market',
  reduceOnly: true,
})

// Method 2: Limit close (target exit price)
await nord.placeOrder({
  marketId: 2,
  side: 'sell',
  size: 10.0,
  price: 150.0,
  orderType: 'limit',
  reduceOnly: true,
})
```

---

## Margin Requirements

### Key Metrics

| Metric                 | Formula                                   | Safe Zone | Danger Zone |
| ---------------------- | ----------------------------------------- | --------- | ----------- |
| **Margin Fraction**    | `Account Value / Total Position Notional` | > 20%     | < 10%       |
| **Maintenance Margin** | Market-specific (5-10%)                   | N/A       | < Required  |
| **Leverage**           | `Position Size / Collateral`              | < 10x     | > 20x       |

### Margin Fraction Explained

```
Margin Fraction = (Collateral + Unrealized PnL) / Position Notional

Example:
- Collateral: $10,000
- Position: 100 SOL @ $150 = $15,000 notional
- Unrealized PnL: -$500

Margin Fraction = ($10,000 - $500) / $15,000 = 63.3%
Leverage = $15,000 / $9,500 = 1.58x
```

### Checking Account Health

```javascript
async function checkHealth(walletAddress) {
  const account = await nord.getAccount(walletAddress)

  const health = {
    marginFraction: account.marginFraction,
    totalCollateral: account.totalCollateral,
    freeCollateral: account.freeCollateral,
    totalPositionValue: account.totalPositionValue,
    maintenanceMargin: account.maintenanceMarginRequired,
    liquidationRisk: 'NONE',
  }

  if (health.marginFraction < 0.1) {
    health.liquidationRisk = 'CRITICAL'
  } else if (health.marginFraction < 0.15) {
    health.liquidationRisk = 'HIGH'
  } else if (health.marginFraction < 0.2) {
    health.liquidationRisk = 'MODERATE'
  }

  return health
}
```

### Adding Collateral

If margin fraction drops too low, add collateral:

```javascript
// Depositing USDC as collateral
await nord.deposit({
  token: 'USDC',
  amount: 5000.0,
})
```

---

## Order Placement

### Using Nord SDK

```typescript
import { Nord } from '@n1xyz/nord-ts'

// Initialize with local API connection
const nord = await Nord.new({
  app: 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5',
  solanaConnection: connection,
  webServerUrl: 'https://zo-mainnet.n1.xyz',
  // Local API handles signing
})

// Place a limit buy order
const order = await nord.placeOrder({
  marketId: 2, // SOLUSD
  side: 'buy',
  size: 10.0,
  price: 140.0,
  orderType: 'limit',
  postOnly: false,
  reduceOnly: false,
})

console.log('Order placed:', order.id)
```

### Order Validation

Before placing any order, validate:

```javascript
function validateOrder(order, account, market) {
  const errors = []

  // 1. Check market exists
  if (!market) errors.push('Invalid market ID')

  // 2. Check size >= min
  if (order.size < market.minOrderSize) {
    errors.push(`Size below minimum (${market.minOrderSize})`)
  }

  // 3. Check price tick alignment
  if (order.price % market.tickSize !== 0) {
    errors.push(`Price not aligned to tick size (${market.tickSize})`)
  }

  // 4. Check free collateral (if not reduceOnly)
  if (!order.reduceOnly) {
    const marginRequired = (order.size * order.price) / market.maxLeverage
    if (marginRequired > account.freeCollateral) {
      errors.push(`Insufficient free collateral (need $${marginRequired.toFixed(2)})`)
    }
  }

  // 5. Check position limit
  const totalPosition = account.positions
    .filter((p) => p.marketId === order.marketId)
    .reduce((sum, p) => sum + Math.abs(p.size), 0)

  if (totalPosition + order.size > market.maxPositionSize) {
    errors.push('Position would exceed maximum allowed')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
```

### Cancelling Orders

```javascript
// Cancel specific order
await nord.cancelOrder(orderId)

// Cancel all orders in market
await nord.cancelAllOrders(marketId)

// Cancel all orders across all markets
await nord.cancelAllOrders()
```

---

## Post-Order Monitoring

### Tracking Order Status

```javascript
async function monitorOrder(orderId) {
  const order = await nord.getOrder(orderId)

  switch (order.status) {
    case 'open':
      console.log(`Order ${orderId} resting at ${order.price}`)
      break
    case 'filled':
      console.log(`Order ${orderId} filled: ${order.filledSize} @ ${order.avgPrice}`)
      break
    case 'partially_filled':
      console.log(`Order ${orderId} partially filled: ${order.filledSize}/${order.size}`)
      break
    case 'cancelled':
      console.log(`Order ${orderId} cancelled`)
      break
    default:
      console.log(`Order ${orderId} status: ${order.status}`)
  }

  return order
}
```

### Fill Notifications

```javascript
// Poll for fills
setInterval(async () => {
  const fills = await nord.getFills({ since: lastCheckTime })

  for (const fill of fills) {
    console.log(`💰 Fill: ${fill.size} ${fill.symbol} @ $${fill.price}`)
    console.log(`   Fee: $${fill.fee} | PnL: $${fill.realizedPnl || 0}`)
  }

  lastCheckTime = Date.now()
}, 5000)
```

---

## Local API Setup Required Note

⚠️ **Important**: All trading operations require running the 01.xyz local API.

### Why Local API?

| Feature              | Local API         | Direct HTTP   |
| -------------------- | ----------------- | ------------- |
| Signing transactions | ✅ Yes            | ❌ No         |
| Private key access   | ✅ Secure (local) | ❌ Impossible |
| Account data         | ✅ Yes            | ❌ No         |
| Public market data   | ✅ Yes            | ✅ Yes        |

### Quick Setup

```bash
# Install local API (check 01.xyz docs for latest)
npm install -g @n1xyz/local-api

# Configure (requires your Solana wallet)
nord-local-api config

# Start server
nord-local-api start --port 3000

# Test connection
curl http://localhost:3000/health
```

### Environment Variables

```bash
# .env
LOCAL_API_URL=http://localhost:3000
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_ADDRESS=YourAddressHere
```

---

## Summary

### Key Takeaways

1. **Market IDs** — Always verify numeric IDs, not symbols
2. **Order types** — Choose appropriate type for your strategy
3. **Reduce-only** — Use when closing positions to avoid accidents
4. **Margin health** — Monitor margin fraction, add collateral if needed
5. **Test on devnet** — Always validate before mainnet

### Safety Checklist (Before Every Trade)

☐ Double-check market ID  
☐ Verify order size and price  
☐ Confirm order type (limit/market/ioc)  
☐ Check margin impact  
☐ Set reduceOnly if closing  
☐ Have stop-loss planned  
☐ Tested same logic on devnet

---

_Next: Read [risk-management.md](risk-management.md) for comprehensive risk strategies._
