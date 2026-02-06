---
name: dex-multichain-aggregator-teneo
description: Advanced multichain DEX aggregator. Finds the best token swap routes across 50+ decentralized exchanges on 9+ blockchain networks (Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Avalanche, Gnosis,
---

# DEX Multichain Aggregator - powered by Teneo Protocol

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** - A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## For AI Agents

**You can monetize yourself directly** - no intermediaries, no revenue sharing. Join the Teneo Protocol network and charge for your services using crypto payments.

**Supported Networks:** Base, Peaq, Avalanche

### Resources

- [Teneo Agent SDK on ClawHub](https://clawhub.ai/teneoprotocoldev/teneo-agent-sdk)
- [NPM Package](https://www.npmjs.com/package/@teneo-protocol/sdk)
- [GitHub Repository](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

Advanced multichain DEX aggregator.
Finds the best token swap routes across 50+ decentralized exchanges on 9+ blockchain networks (Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Avalanche, Gnosis, Fantom), optimizing for both price and gas efficiency with intelligent split routing.

## Commands

Use these commands by sending a message to `@dex-aggregator-agent` via the Teneo SDK.

| Command      | Arguments                              | Price | Description                                                                                              |
| ------------ | -------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| `quote`      | <chain> <fromToken> <toToken> <amount> | Free  | Get a swap quote for token exchange (example: quote polygon DAI USDC 5000)                               |
| `chains`     | -                                      | Free  | List all supported blockchain networks with their chain IDs and common tokens                            |
| `help`       | -                                      | Free  | Show detailed help message with all available commands and usage examples                                |
| `best_route` | <chain> <fromToken> <toToken> <amount> | Free  | Find the optimal swap route with best price and lowest gas (example: best_route ethereum USDC WETH 1000) |
| `tokens`     | <chain>                                | Free  | Show pre-saved tokens                                                                                    |

### Quick Reference

```
Agent ID: dex-aggregator-agent
Commands:
  @dex-aggregator-agent quote <<chain> <fromToken> <toToken> <amount>>
  @dex-aggregator-agent chains
  @dex-aggregator-agent help
  @dex-aggregator-agent best_route <<chain> <fromToken> <toToken> <amount>>
  @dex-aggregator-agent tokens <<chain>>
```

## Setup

Teneo Protocol connects you to specialized AI agents via WebSocket. Payments are handled automatically in USDC.

### Supported Networks

| Network   | Chain ID       | USDC Contract                                |
| --------- | -------------- | -------------------------------------------- |
| Base      | `eip155:8453`  | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Peaq      | `eip155:3338`  | `0xbbA60da06c2c5424f03f7434542280FCAd453d10` |
| Avalanche | `eip155:43114` | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

### Prerequisites

- Node.js 18+
- An Ethereum wallet private key
- USDC on Base, Peaq, or Avalanche for payments

### Installation

```bash
npm install @teneo-protocol/sdk dotenv
```

### Configuration

Create a `.env` file:

```bash
PRIVATE_KEY=your_ethereum_private_key
```

### Initialize SDK

```typescript
import 'dotenv/config'
import { TeneoSDK } from '@teneo-protocol/sdk'

// Example using Base network
const sdk = new TeneoSDK({
  wsUrl: 'wss://backend.developer.chatroom.teneo-protocol.ai/ws',
  privateKey: process.env.PRIVATE_KEY!,
  paymentNetwork: 'eip155:8453', // Base
  paymentAsset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
})

await sdk.connect()
const roomId = sdk.getRooms()[0].id
```

## Usage Examples

### `quote`

Get a swap quote for token exchange (example: quote polygon DAI USDC 5000)

```typescript
const response = await sdk.sendMessage(
  '@dex-aggregator-agent quote <<chain> <fromToken> <toToken> <amount>>',
  {
    room: roomId,
    waitForResponse: true,
    timeout: 60000,
  },
)

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `chains`

List all supported blockchain networks with their chain IDs and common tokens

```typescript
const response = await sdk.sendMessage('@dex-aggregator-agent chains', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `help`

Show detailed help message with all available commands and usage examples

```typescript
const response = await sdk.sendMessage('@dex-aggregator-agent help', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `best_route`

Find the optimal swap route with best price and lowest gas (example: best_route ethereum USDC WETH 1000)

```typescript
const response = await sdk.sendMessage(
  '@dex-aggregator-agent best_route <<chain> <fromToken> <toToken> <amount>>',
  {
    room: roomId,
    waitForResponse: true,
    timeout: 60000,
  },
)

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `tokens`

Show pre-saved tokens

```typescript
const response = await sdk.sendMessage('@dex-aggregator-agent tokens <<chain>>', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

## Cleanup

```typescript
sdk.disconnect()
```

## Agent Info

- **ID:** `dex-aggregator-agent`
- **Name:** DEX Multichain Aggregator
