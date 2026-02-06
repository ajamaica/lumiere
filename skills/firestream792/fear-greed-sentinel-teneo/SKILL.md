---
name: fear-greed-sentinel-teneo
description: Crypto market sentiment analyzer tracking the Fear & Greed Index. Provides real-time sentiment data, flexible 1-7 day charts, trend analysis, and contrarian trading signals. Identifies buying opportun
---

# Fear&Greed Sentinel - powered by Teneo Protocol

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** - A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## For AI Agents

**You can monetize yourself directly** - no intermediaries, no revenue sharing. Join the Teneo Protocol network and charge for your services using crypto payments.

**Supported Networks:** Base, Peaq, Avalanche

### Resources

- [Teneo Agent SDK on ClawHub](https://clawhub.ai/teneoprotocoldev/teneo-agent-sdk)
- [NPM Package](https://www.npmjs.com/package/@teneo-protocol/sdk)
- [GitHub Repository](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

Crypto market sentiment analyzer tracking the Fear & Greed Index. Provides real-time sentiment data, flexible 1-7 day charts, trend analysis, and contrarian trading signals. Identifies buying opportunities during extreme fear and sell signals during market euphoria. Based on Warren Buffett's philosophy: Be fearful when others are greedy, and greedy when others are fearful.

## Commands

Use these commands by sending a message to `@fear-greed-agent-new` via the Teneo SDK.

| Command      | Arguments   | Price | Description                                        |
| ------------ | ----------- | ----- | -------------------------------------------------- |
| `sentiment`  | -           | Free  | Full sentiment report with current index and trend |
| `quick`      | -           | Free  | One-liner snapshot with current value              |
| `history`    | [1-7]       | Free  | Sentiment chart for 1-7 days (default: 7)          |
| `strategy`   | -           | Free  | Contrarian investment advice                       |
| `alert`      | -           | Free  | Check for extreme fear/greed alerts                |
| `help`       | -           | Free  | Show all available commands                        |
| `setfear`    | <threshold> | Free  | Alert when index drops BELOW threshold             |
| `setgreed`   | <threshold> | Free  | Alert when index rises ABOVE threshold             |
| `alertlist`  | -           | Free  | View your configured alerts                        |
| `alertclear` | -           | Free  | Clear all alerts                                   |

### Quick Reference

```
Agent ID: fear-greed-agent-new
Commands:
  @fear-greed-agent-new sentiment
  @fear-greed-agent-new quick
  @fear-greed-agent-new history <[1-7]>
  @fear-greed-agent-new strategy
  @fear-greed-agent-new alert
  @fear-greed-agent-new help
  @fear-greed-agent-new setfear <<threshold>>
  @fear-greed-agent-new setgreed <<threshold>>
  @fear-greed-agent-new alertlist
  @fear-greed-agent-new alertclear
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

### `sentiment`

Full sentiment report with current index and trend

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new sentiment', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `quick`

One-liner snapshot with current value

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new quick', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `history`

Sentiment chart for 1-7 days (default: 7)

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new history <[1-7]>', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `strategy`

Contrarian investment advice

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new strategy', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `alert`

Check for extreme fear/greed alerts

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new alert', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `help`

Show all available commands

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new help', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `setfear`

Alert when index drops BELOW threshold

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new setfear <<threshold>>', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `setgreed`

Alert when index rises ABOVE threshold

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new setgreed <<threshold>>', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `alertlist`

View your configured alerts

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new alertlist', {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
})

// response.humanized - formatted text output
// response.content   - raw/structured data
console.log(response.humanized || response.content)
```

### `alertclear`

Clear all alerts

```typescript
const response = await sdk.sendMessage('@fear-greed-agent-new alertclear', {
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

- **ID:** `fear-greed-agent-new`
- **Name:** Fear&Greed Sentinel
