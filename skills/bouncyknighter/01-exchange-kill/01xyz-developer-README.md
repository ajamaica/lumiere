# 01.xyz Developer Skill

> AI-powered development tools for the 01.xyz non-custodial perpetual futures exchange on Solana.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Powered%20by-Solana-9945FF?logo=solana)](https://solana.com)
[![N1](https://img.shields.io/badge/Built%20on-N1-00C853)](https://docs.n1.xyz)

## Overview

This Skill provides comprehensive guidance for building trading tools, monitoring systems, and strategies on [01.xyz](https://01.xyz) — a non-custodial perpetual futures exchange powered by the N1 blockchain.

### Key Features

- ✅ **Read-Only Monitoring** — Market data, orderbooks, funding rates (no auth required)
- ✅ **SDK Integration** — Complete Nord.ts (@n1xyz/nord-ts) reference
- ⚠️ **Trading Operations** — Order placement with comprehensive risk management
- 📊 **Risk Management** — Margin calculations, circuit breakers, position sizing
- 🔒 **Safety First** — Non-custodial patterns, testnet validation, emergency procedures

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  01.xyz Skill (AI Assistant)                                │
│  ├── Public Data (No Auth)                                  │
│  │   └── Market Data, Orderbooks, Funding Rates             │
│  ├── Account Monitoring (Wallet Address)                    │
│  │   └── Positions, Health, Risk Metrics                    │
│  └── Trading (Local API Required)                           │
│      └── Order Placement, Risk Management                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Your Local Machine                                         │
│  ├── Local API (signs transactions)                         │
│  └── Nord SDK (@n1xyz/nord-ts)                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  01.xyz Exchange (N1 Blockchain)                            │
│  └── REST API + WebSocket                                   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Installation

```bash
# Clone or copy this skill to your skills directory
cp -r 01xyz-developer /path/to/your/skills/

# Install SDK (if building trading tools)
npm install @n1xyz/nord-ts @solana/web3.js
```

### 2. Safe Monitoring (No Setup Required)

```javascript
// examples/monitor-wallet.js style - safe, read-only
const BASE_URL = 'https://zo-mainnet.n1.xyz'

// Get market data
const markets = await fetch(`${BASE_URL}/info`).json()
const solStats = await fetch(`${BASE_URL}/market/2/stats`).json()

console.log('SOL Price:', solStats.perpStats.mark_price)
console.log('Funding Rate:', solStats.perpStats.funding_rate)
```

### 3. Trading Setup (Requires Local API)

```bash
# Install local API
npm install -g @n1xyz/local-api

# Configure (interactively sets up your wallet)
nord-local-api config

# Start local API
nord-local-api start --port 3000

# Test connection
curl http://localhost:3000/health
```

```typescript
// Connect via SDK
import { Nord } from '@n1xyz/nord-ts'

const nord = await Nord.new({
  app: 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5',
  solanaConnection: connection,
  webServerUrl: 'https://zo-mainnet.n1.xyz',
})
```

## Skill Structure

| File                                       | Purpose                               | Safety Level             |
| ------------------------------------------ | ------------------------------------- | ------------------------ |
| [SKILL.md](SKILL.md)                       | Main entry point, overview            | Start here               |
| [safety-first.md](safety-first.md)         | Non-custodial reality check           | ⚠️ **Mandatory reading** |
| [monitoring-guide.md](monitoring-guide.md) | Public API, market data               | ✅ Safe                  |
| [risk-management.md](risk-management.md)   | Margin, liquidation, circuit breakers | ✅ Read-only             |
| [trading-basics.md](trading-basics.md)     | Orders, positions, market IDs         | ⚠️ Gated                 |
| [sdk-reference.md](sdk-reference.md)       | Nord.ts SDK reference                 | ✅ Documentation         |
| [examples/](examples/)                     | Working code samples                  | Varies                   |

## Usage Examples

### Monitor Markets (Safe)

See [examples/check-funding-rates.js](examples/check-funding-rates.js):

```javascript
const rates = await getAllFundingRates()
console.table(rates)
```

### Monitor Wallet (Read-Only)

See [examples/monitor-wallet.js](examples/monitor-wallet.js):

```javascript
const account = await nord.getAccount(walletAddress)
console.log('Margin:', account.marginFraction)
console.log('Positions:', account.positions.length)
```

### Place Order (Requires Local API)

See [examples/simple-order.js](examples/simple-order.js):

```javascript
const order = await nord.placeOrder({
  marketId: 2, // SOLUSD
  side: 'buy',
  size: 10.0,
  price: 145.0,
  orderType: 'limit',
})
```

## Network Endpoints

| Network     | Base URL                    | Purpose      |
| ----------- | --------------------------- | ------------ |
| **Mainnet** | `https://zo-mainnet.n1.xyz` | Live trading |
| **Devnet**  | `https://zo-devnet.n1.xyz`  | Testing      |

## Market IDs

01.xyz uses numeric market IDs:

| ID  | Symbol  | Max Leverage |
| --- | ------- | ------------ |
| 0   | BTCUSD  | 20x          |
| 1   | ETHUSD  | 20x          |
| 2   | SOLUSD  | 20x          |
| 3   | HYPEUSD | 10x          |

Fetch current list: `GET https://zo-mainnet.n1.xyz/info`

## Safety & Risk

### The Non-Custodial Model

- ✅ **You hold the keys** — Private keys never leave your machine
- ✅ **You sign transactions** — Local API handles signing
- ✅ **AI cannot spend funds** — No trading without your explicit confirmation
- ⚠️ **You are responsible** — For understanding risks, margin, liquidation

### Required Reading

1. [safety-first.md](safety-first.md) — Before anything else
2. Test all code on **devnet** before mainnet
3. Never risk more than you can afford to lose

## Contributing

This Skill is part of the OpenClaw ecosystem. Contributions welcome!

### How to Contribute

1. **Report Issues** — Documentation errors, broken examples
2. **Add Examples** — Working code for common patterns
3. **Update Docs** — Keep pace with 01.xyz API changes
4. **Improve Safety** — Better risk management patterns

### Development Setup

```bash
# Clone this repository
git clone https://github.com/your-org/01xyz-developer-skill
cd 01xyz-developer-skill

# Validate examples work
node examples/monitor-wallet.js
node examples/check-funding-rates.js

# Test SDK integration
npm install
node -e "require('@n1xyz/nord-ts')"
```

### Pull Request Guidelines

- Follow existing structure and style
- Test on devnet before submitting
- Update SKILL.md if adding capabilities
- Add safety warnings for gated features

## Resources

- **01.xyz**: https://01.xyz
- **Documentation**: https://docs.01.xyz
- **API Reference**: https://api.01.xyz
- **N1 Blockchain**: https://docs.n1.xyz
- **Nord SDK (npm)**: https://www.npmjs.com/package/@n1xyz/nord-ts
- **Discord**: N1 Exchange Community

## License

MIT License — See LICENSE file for details.

## Disclaimer

This Skill is for educational purposes only. Trading perpetual futures carries substantial risk of loss. Always:

- Read [safety-first.md](safety-first.md)
- Test on devnet first
- Never risk more than you can afford to lose
- Understand liquidation mechanics
- Use stop-losses

**The authors and contributors are not responsible for any trading losses.**

---

<p align="center">
  Built for the OpenClaw Community
</p>
