---
name: 01xyz-developer
description: AI-powered 01.xyz exchange development skill for monitoring, trading strategies, and N1 blockchain integration. Covers REST API (FTX-inspired), Nord.ts SDK (@n1xyz/nord-ts), non-custodial trading patterns, and market making on Solana.
version: 1.0.0
author: OpenClaw Community
capabilities:
  - monitor-positions
  - track-orderbook
  - analyze-markets
  - fetch-funding-rates
  - read-only-integration
  - sdk-integration
  - risk-analysis
  - trading-automation
license: MIT
tags:
  - solana
  - defi
  - perp-trading
  - n1-blockchain
  - non-custodial
---

# 01.xyz Exchange Developer Skill

> Non-custodial perpetual futures on Solana. Built by traders, for traders.

## What this Skill is for

Use this Skill when the user asks for:

- **Market Monitoring**: Orderbook depth, mark prices, funding rates, 24h stats
- **Account Tracking**: Position monitoring, margin health, liquidation risk
- **Trading Strategies**: Market making, DCA, grid trading, trend following
- **SDK Integration**: Setting up Nord.ts (@n1xyz/nord-ts) for TypeScript/Python
- **API Development**: Building on the FTX-inspired REST API
- **Risk Management**: Position sizing, circuit breakers, margin calculations
- **N1 Protocol**: Understanding the N1 blockchain and ZO protocol architecture

## Overview

01.xyz is a **non-custodial perpetual futures exchange** built on the **N1 blockchain** (evolution of the ZO protocol). It enables fully self-custodied derivatives trading with up to 20x leverage on major crypto assets.

### Key Design Principles

| Feature              | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| **Non-custodial**    | Your private keys never leave your machine. No central counterparty risk.        |
| **FTX-inspired API** | Familiar REST patterns for easy migration from centralized exchanges.            |
| **Local Signing**    | Users run a local API that signs transactions — funds remain under user control. |
| **High Performance** | Sub-second finality on N1 blockchain with Solana settlement.                     |
| **Deep Liquidity**   | Professional market makers and tight spreads on major pairs.                     |

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User/Developer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   AI Agent   │  │  Local API   │  │   Browser    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │ (signed txs)    │
          │                 ▼                 │
          │        ┌──────────────┐           │
          │        │  N1 Network  │           │
          │        │  (L2 chain)  │           │
          │        └──────┬───────┘           │
          │               │                   │
          │    ┌──────────▼──────────┐        │
          └────►  zo-mainnet.n1.xyz  ◄────────┘
               │    REST/WebSocket    │
               └──────────┬───────────┘
                          │
               ┌──────────▼──────────┐
               │   Solana L1         │
               │   (settlement)      │
               └─────────────────────┘
```

### Network Endpoints

| Network     | Base URL                    | Purpose                  | Status      |
| ----------- | --------------------------- | ------------------------ | ----------- |
| **Mainnet** | `https://zo-mainnet.n1.xyz` | Live trading, real funds | Production  |
| **Devnet**  | `https://zo-devnet.n1.xyz`  | Testing, dev work        | Development |

## Default Stack Decisions

These are opinionated defaults. Adjust for your specific use case.

### 1. Data Access Pattern

| Use Case                           | Recommended Approach             | Auth Required |
| ---------------------------------- | -------------------------------- | ------------- |
| Market data (prices, orderbook)    | Direct HTTP to public endpoints  | ❌ No         |
| Account data (positions, balances) | Local API or Nord SDK            | ✅ Yes        |
| Order placement                    | Local API with user confirmation | ✅ Yes        |

### 2. SDK Selection

| Language       | Package           | Use When                                  |
| -------------- | ----------------- | ----------------------------------------- |
| **TypeScript** | `@n1xyz/nord-ts`  | Full-featured trading, complex strategies |
| **Python**     | `n1-sdk` (pip)    | Quant research, ML models, backtesting    |
| **Raw HTTP**   | Direct REST calls | Simple monitoring, language-agnostic      |

### 3. Security Model

- **AI only reads public data** — Never expose private keys to AI systems
- **Local signing mandatory** — All transactions signed by user's local instance
- **Explicit confirmation** — Trading actions require human approval
- **Testnet first** — Always validate on devnet before mainnet

### 4. Development Priority

1. **Read-only monitoring** ✅ — Start here, safe for all users
2. **Account health tracking** ✅ — Requires wallet address only
3. **Paper trading simulation** ⚠️ — Test strategies without real funds
4. **Live trading** ⚠️ — Requires local API + explicit user consent

## Operating Procedure

When working with 01.xyz integration:

### Phase 1: Discovery

1. **Identify the task type**:
   - `MONITORING` — Market data, public stats
   - `ACCOUNT` — Position/balance queries
   - `TRADING` — Order placement, strategy execution
   - `RISK` — Health checks, liquidation analysis

2. **Determine authentication needs**:
   - Public endpoints: No auth needed
   - Account data: Wallet address sufficient
   - Trading: Local API with signing required

### Phase 2: Data Collection

3. **For market data**:

   ```javascript
   // Direct HTTP — no auth required
   const markets = await fetch('https://zo-mainnet.n1.xyz/info').json()
   ```

4. **For account data**:
   ```javascript
   // Via local API or SDK
   const account = await nord.getAccount(walletAddress)
   ```

### Phase 3: Safety Validation

5. **Before any trading action**:
   - ☐ Verify account health (margin fraction > 10%)
   - ☐ Check open orders for conflicts
   - ☐ Calculate position impact on margin
   - ☐ Confirm funding rate direction
   - ☐ Get explicit user confirmation

### Phase 4: Execution

6. **Execute with monitoring**:
   - Submit order via local API
   - Track fill status
   - Update position state
   - Log all actions

## Progressive Disclosure

Read these files when the topic comes up:

| File                                       | Read When                            | Safety Level     |
| ------------------------------------------ | ------------------------------------ | ---------------- |
| [safety-first.md](safety-first.md)         | **FIRST — before anything else**     | ⚠️ Mandatory     |
| [monitoring-guide.md](monitoring-guide.md) | Getting market data, checking prices | ✅ Safe          |
| [risk-management.md](risk-management.md)   | Managing leverage, liquidation risk  | ✅ Read-only     |
| [trading-basics.md](trading-basics.md)     | Understanding order types, markets   | ⚠️ Gated         |
| [sdk-reference.md](sdk-reference.md)       | Setting up Nord.ts SDK               | ✅ Documentation |
| [README.md](README.md)                     | Project overview, installation       | ✅ General       |

### Examples Directory

Working code samples in [examples/](examples/):

- [monitor-wallet.js](examples/monitor-wallet.js) — Read-only wallet monitoring
- [check-funding-rates.js](examples/check-funding-rates.js) — Market analysis
- [simple-order.js](examples/simple-order.js) — Basic order placement (requires local API)

## Quick Reference

### Market IDs Reference

01.xyz uses **numeric market IDs** (not symbols):

| ID  | Market               | Max Leverage | Tick Size |
| --- | -------------------- | ------------ | --------- |
| 0   | BTCUSD               | 20x          | $0.50     |
| 1   | ETHUSD               | 20x          | $0.10     |
| 2   | SOLUSD               | 20x          | $0.01     |
| 3   | HYPEUSD              | 10x          | $0.01     |
| ... | See `/info` endpoint |              |           |

### HTTP Endpoints

**Public (no auth):**

```
GET /info                    # All markets
GET /market/{id}/orderbook   # L2 orderbook
GET /market/{id}/stats       # 24h stats, funding
GET /trades                  # Recent trades
```

**Private (requires local API):**

```
GET /account/{address}       # Positions, balances
POST /action                 # Submit orders
```

### Common SDK Operations

```typescript
import { Nord } from '@n1xyz/nord-ts'

// Initialize
const nord = await Nord.new({
  app: 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5',
  solanaConnection: connection,
  webServerUrl: 'https://zo-mainnet.n1.xyz',
})

// Get markets
const markets = await nord.getMarkets()

// Get orderbook
const orderbook = await nord.getOrderbook(2) // SOLUSD

// Place order (requires auth)
const order = await nord.placeOrder({
  marketId: 2,
  side: 'buy',
  size: 1.0,
  price: 150.0,
  orderType: 'limit',
})
```

## Safety & Risk Checklist

### Pre-Trading Checklist

☐ **Read [safety-first.md](safety-first.md)** — Non-custodial reality check  
☐ **Verify on devnet first** — Test all logic with fake funds  
☐ **Check account health** — Margin fraction > 10% (ideally > 20%)  
☐ **Review funding rates** — Can flip PnL significantly  
☐ **Calculate liquidation price** — Know your liquidation level  
☐ **Set stop-losses** — Use trigger orders for downside protection  
☐ **Confirm market ID** — Numeric IDs, not symbols

### In-Flight Monitoring

☐ **Monitor margin fraction** — Alert if < 15%  
☐ **Track funding payments** — Every 8 hours  
☐ **Watch for liquidations** — Cascading effects in volatile markets  
☐ **Log all operations** — Audit trail for debugging

### Emergency Procedures

- **Approaching liquidation**: Reduce position size immediately or add collateral
- **API unresponsive**: Check local API status, verify network connectivity
- **Unexpected fills**: Review order history, check for stale orders
- **Wrong market ID**: Cancel all pending orders, verify symbol mapping

## Resources

### Official Documentation

- **01.xyz**: https://01.xyz
- **Developer Docs**: https://docs.01.xyz
- **API Reference**: https://api.01.xyz
- **N1 Blockchain**: https://docs.n1.xyz

### SDKs & Tools

- **Nord TypeScript**: `npm install @n1xyz/nord-ts`
- **Nord Python**: `pip install n1-sdk`
- **GitHub**: https://github.com/n1-exchange

### Community

- **Discord**: N1 Exchange Community
- **Twitter/X**: @01_exchange

## Updates

- **Version**: 1.0.0
- **Last Updated**: 2026-02-04
- **API Version**: 2026-01
- **Compatibility**: N1 Mainnet, Devnet

---

_This Skill follows the OpenClaw Skill Specification. For more information on creating Skills, see the Skill documentation._
