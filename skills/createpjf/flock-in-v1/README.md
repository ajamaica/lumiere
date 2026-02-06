# FLock IN V1

An OpenClaw skill for autonomous FLock API Platform setup. Enables AI agents to self-provision access to FLock's distributed AI inference network.

## Quick Start

### Automatic (via OpenClaw)

```bash
npx clawhub@latest install flock-in
```

### Manual Setup

```bash
git clone https://github.com/createpjf/flock-in-v1
cd flock-in-v1
npm install
```

## Prerequisites

| Requirement  | Details                        |
| ------------ | ------------------------------ |
| Node.js      | v18+                           |
| OpenClaw CLI | Latest version                 |
| Funding      | ~$0.50 ETH on Ethereum or Base |

## Cost Breakdown

| Operation             | Cost                  | Network     |
| --------------------- | --------------------- | ----------- |
| Wallet generation     | Free                  | Local       |
| Platform registration | Free                  | —           |
| API calls (x402)      | $0.001–$0.01/request  | Base (USDC) |
| Model inference       | $0.20–$2.80/1M tokens | Via API key |

**Total startup cost: ~$0.50**

## x402 Payment Support

FLock API supports the [x402 payment protocol](https://www.x402.org/) for pay-per-request API access without traditional API keys.

### How x402 Works

```
┌─────────┐     1. Request      ┌─────────────┐
│  Agent  │ ──────────────────→ │ FLock API   │
│         │ ←────────────────── │             │
└─────────┘   2. 402 Payment    └─────────────┘
     │           Required             │
     │                                │
     │    3. Request + Payment        │
     │        Signature               │
     └───────────────────────────────→│
                                      │
              4. 200 OK + Response    │
     ←────────────────────────────────┘
```

### x402 Client Setup

```bash
npm install @x402/fetch @x402/evm
```

```typescript
import { wrapFetch } from '@x402/fetch'
import { createEVMClient } from '@x402/evm'

// Create payment-enabled fetch
const x402Fetch = wrapFetch(fetch, {
  client: createEVMClient({
    privateKey: process.env.WALLET_PRIVATE_KEY,
    network: 'base', // USDC payments on Base
  }),
})

// Use like normal fetch - payments handled automatically
const response = await x402Fetch('https://api.flock.io/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'deepseek-v3.2',
    messages: [{ role: 'user', content: 'Hello' }],
  }),
})
```

### x402 vs API Key

| Feature        | x402        | API Key         |
| -------------- | ----------- | --------------- |
| Setup          | Wallet only | Dashboard login |
| Payment        | Per-request | Prepaid balance |
| Minimum        | $0.001      | ~$5 deposit     |
| Agent-friendly | Yes         | Requires human  |

## Complete Setup Flow

### Option A: x402 (Fully Autonomous)

```
1. Agent generates wallet          → scripts/generate-wallet.js
2. User funds wallet (~$0.50 USDC) → Base network
3. Agent makes x402 requests       → Auto-payment per request
```

### Option B: API Key (Traditional)

```
1. Agent generates wallet          → scripts/generate-wallet.js
2. User funds wallet (~$0.50 ETH)  → Ethereum or Base
3. Agent checks balance            → scripts/check-balance.js
4. User logs into platform.flock.io with wallet
5. User creates API key            → Dashboard
6. Agent stores credentials        → scripts/credentials.js
7. Agent configures OpenClaw       → Environment or config
```

## Programmatic Usage

### Core Functions

```typescript
import {
  generateWallet,
  checkBalance,
  saveCredentials,
  getCredentials,
  switchModel,
} from 'flock-in'

// Generate new wallet for FLock
const wallet = await generateWallet()
// Returns: { address: '0x...', privateKey: '0x...' }

// Check funding status
const balance = await checkBalance(wallet.address)
// Returns: { ethereum: '0.5', base: '0.0' }

// Save credentials after API key creation
await saveCredentials({
  apiKey: 'flock_...',
  wallet: wallet.address,
  privateKey: wallet.privateKey,
})

// Switch active model
await switchModel('deepseek-v3.2')
```

### Natural Language Commands

```
"setup flock"           → Full setup wizard
"switch to deepseek"    → Change model to DeepSeek V3.2
"use the coding model"  → Switch to Qwen3 30B Coding
"check flock balance"   → Show wallet balance
```

### Slash Commands

| Command          | Description          |
| ---------------- | -------------------- |
| `/flock-setup`   | Full setup wizard    |
| `/flock`         | Model switcher       |
| `/flock-balance` | Check wallet balance |
| `/flock-x402`    | x402 payment status  |

## Available Models

| Model               | ID                    | Price (in/out per 1M tokens) | Best For                |
| ------------------- | --------------------- | ---------------------------- | ----------------------- |
| DeepSeek V3.2       | `deepseek-v3.2`       | $0.28 / $0.42                | General, cost-effective |
| Qwen3 30B Coding    | `qwen3-30b-coding`    | $0.20 / $0.80                | Code generation         |
| Qwen3 30B Instruct  | `qwen3-30b-instruct`  | $0.20 / $0.80                | Instructions            |
| Qwen3 235B Instruct | `qwen3-235b-instruct` | $0.70 / $2.80                | Complex reasoning       |
| Qwen3 235B Thinking | `qwen3-235b-thinking` | $0.23 / $2.30                | Deep analysis           |
| Qwen3 235B Finance  | `qwen3-235b-finance`  | $0.23 / $2.30                | Financial analysis      |
| Kimi K2 Thinking    | `kimi-k2-thinking`    | $0.60 / $2.50                | Extended thinking       |
| MiniMax M2.1        | `minimax-m2.1`        | $0.30 / $1.20                | Balanced                |

## Scripts Reference

```bash
# Generate new wallet
node scripts/generate-wallet.js
# Output: { address, privateKey }

# Check balance on multiple networks
node scripts/check-balance.js <address>
# Output: { ethereum, base, optimism }

# Credential management
node scripts/credentials.js save <api_key> [wallet] [pk]
node scripts/credentials.js get
node scripts/credentials.js path
node scripts/credentials.js delete
```

## Credentials Storage

Default locations (in priority order):

1. `~/.openclaw/flock-credentials.json`
2. `./flock-credentials.json`

```json
{
  "apiKey": "flock_...",
  "wallet": "0x...",
  "privateKey": "0x...",
  "model": "deepseek-v3.2"
}
```

> **Security**: Credentials stored as plaintext. For production, use encrypted storage or environment variables.

## Troubleshooting

| Error                  | Cause                      | Solution                              |
| ---------------------- | -------------------------- | ------------------------------------- |
| `insufficient_funds`   | Wallet needs funding       | Send ETH/USDC to wallet address       |
| `invalid_api_key`      | Key not created or expired | Generate new key at platform.flock.io |
| `402 Payment Required` | x402 payment failed        | Check USDC balance on Base            |
| `rate_limit_exceeded`  | Too many requests          | Wait 60s or upgrade plan              |
| `model_not_found`      | Invalid model ID           | Check available models table          |
| `network_error`        | RPC connection failed      | Retry with exponential backoff        |

## Architecture

```
flock-in-v1/
├── skill/              # OpenClaw skill definition
│   └── skill.json      # Skill manifest
├── agent-service/      # Agent integration layer
├── scripts/            # Standalone utilities
│   ├── generate-wallet.js
│   ├── check-balance.js
│   └── credentials.js
└── src/                # Core implementation
    ├── wallet.ts
    ├── balance.ts
    ├── credentials.ts
    └── x402.ts         # x402 payment client
```

## Environment Variables

```bash
# API Key auth (traditional)
FLOCK_API_KEY=flock_...

# x402 auth (autonomous)
FLOCK_WALLET_PRIVATE_KEY=0x...

# Optional
FLOCK_DEFAULT_MODEL=deepseek-v3.2
FLOCK_NETWORK=base
```

## Related Resources

- [x402 Protocol](https://www.x402.org/) — Payment protocol specification
- [x402 GitHub](https://github.com/coinbase/x402) — Reference implementation
- [FLock API Platform](https://platform.flock.io) — Dashboard
- [FLock Documentation](https://docs.flock.io/flock-products/api-platform/getting-started)
- [Farcaster Agent](https://github.com/rishavmukherji/farcaster-agent) — Pattern inspiration
- [OpenClaw](https://github.com/openclawd/openclaw) — Skill framework

## License

MIT
