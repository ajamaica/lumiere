---
name: xclaw02
description: Make x402 payments. Pay for APIs, sell your services, handle 402 Payment Required responses with USDC on Base and other EVM chains.
metadata:
  { 'openclaw': { 'emoji': '$', 'requires': { 'anyBins': ['node', 'npx', 'python3', 'pip'] } } }
---

# xClaw02

Your entry point into x402 - the open payment standard for the agentic web.

x402 is an [open protocol](https://x402.org) enabling instant stablecoin payments over HTTP using the 402 Payment Required status code. xClaw02, built by [Primer](https://primer.systems), provides agent-friendly CLI tools and simple APIs for making and receiving payments.

## When to Use This Skill

Use xClaw02 when:

- You encounter a **402 Payment Required** HTTP response
- You need to access a **paid API or resource**
- The user asks you to **pay for something** with crypto/USDC
- You need to **check wallet balance** or manage payments
- You want to **charge for your own API** or service

## How to Respond

| User Says/Asks                    | What to Do                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "I got a 402 error"               | This is an x402 payment request. Probe the URL with `xclaw02 probe <url>`, show the price, ask if they want to pay |
| "Pay for this API"                | Use `xclaw02 pay <url> --max-amount <amount>` - always confirm amount with user first                              |
| "Check my balance"                | Run `xclaw02 wallet balance <address>`                                                                             |
| "Set up x402" / "Set up payments" | Run `xclaw02 openclaw init`                                                                                        |
| "What networks do you support?"   | List supported networks (Base is primary; also Ethereum, Arbitrum, Optimism, Polygon)                              |
| "How much does X cost?"           | Probe the URL with `xclaw02 probe <url>` to get pricing                                                            |
| "Create a wallet"                 | Run `xclaw02 wallet create` - remind user to save the private key securely                                         |
| "I want to charge for my API"     | Show the Express.js or FastAPI middleware examples                                                                 |

## Quick Setup

### Node.js

```bash
npx xclaw02 openclaw init
```

### Python

```bash
pip install xclaw02
xclaw02 openclaw init
```

This will:

1. Create a new wallet (or use existing)
2. Save config to `~/.openclaw/skills/xclaw02/`
3. Display your wallet address to fund with USDC on Base

## How x402 Works

1. **Request** - You call a paid API
2. **402 Response** - Server returns payment requirements in headers
3. **Pay & Retry** - Sign payment, retry request with `PAYMENT-SIGNATURE` header
4. **Access** - Server verifies payment, settles on-chain, returns resource

The payment is **gasless for the payer** - the facilitator handles gas fees.

## CLI Commands

| Command                               | Description                                       |
| ------------------------------------- | ------------------------------------------------- |
| `xclaw02 openclaw init`               | Set up xClaw02 for this agent                     |
| `xclaw02 openclaw status`             | Check setup status and balance                    |
| `xclaw02 probe <url>`                 | Check if URL requires payment and get price       |
| `xclaw02 pay <url>`                   | Pay for a resource (requires XCLAW02_PRIVATE_KEY) |
| `xclaw02 pay <url> --dry-run`         | Preview payment without paying                    |
| `xclaw02 pay <url> --max-amount 0.10` | Pay with spending limit                           |
| `xclaw02 wallet create`               | Create a new wallet                               |
| `xclaw02 wallet balance <address>`    | Check USDC balance on Base                        |
| `xclaw02 wallet from-mnemonic`        | Restore wallet from mnemonic                      |
| `xclaw02 networks`                    | List supported networks                           |

### Example CLI Output

```bash
$ xclaw02 probe https://api.example.com/paid
{
  "status": "payment_required",
  "price": "0.05",
  "currency": "USDC",
  "network": "base",
  "recipient": "0x1234...abcd",
  "description": "Premium API access"
}

$ xclaw02 wallet balance 0xYourAddress
{
  "address": "0xYourAddress",
  "network": "base",
  "balance": "12.50",
  "token": "USDC"
}

$ xclaw02 pay https://api.example.com/paid --max-amount 0.10
{
  "status": "success",
  "paid": "0.05",
  "txHash": "0xabc123...",
  "response": { ... }
}
```

## Using in Code

### Node.js / TypeScript

```javascript
const { createSigner, x402Fetch } = require('xclaw02')

// Private key format: 0x followed by 64 hex characters
const signer = await createSigner('eip155:8453', process.env.XCLAW02_PRIVATE_KEY)
const response = await x402Fetch('https://api.example.com/paid', signer, {
  maxAmount: '0.10', // Maximum USDC to spend
})
const data = await response.json()
```

### Python

```python
from xclaw02 import create_signer, x402_requests
import os

# Private key format: 0x followed by 64 hex characters
signer = create_signer('eip155:8453', os.environ['XCLAW02_PRIVATE_KEY'])
with x402_requests(signer, max_amount='0.10') as session:
    response = session.get('https://api.example.com/paid')
    data = response.json()
```

## Selling Your Services (Server-Side)

Want other agents to pay you? Add a paywall to your API:

### Express.js

```javascript
const express = require('express')
const { x402Express } = require('xclaw02')

const app = express()

app.use(
  x402Express('0xYourAddress', {
    '/api/premium': {
      amount: '0.05', // $0.05 USDC per request
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      network: 'eip155:8453',
    },
  }),
)

app.get('/api/premium', (req, res) => {
  res.json({ data: 'Premium content here' })
})
```

### FastAPI (Python)

```python
from fastapi import FastAPI
from xclaw02 import x402_fastapi

app = FastAPI()

app.add_middleware(x402_fastapi(
    '0xYourAddress',
    {
        '/api/premium': {
            'amount': '0.05',
            'asset': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            'network': 'eip155:8453'
        }
    }
))

@app.get("/api/premium")
async def premium_endpoint():
    return {"data": "Premium content here"}
```

## Supported Networks

| Network      | CAIP-2 ID    | Token | Notes                                  |
| ------------ | ------------ | ----- | -------------------------------------- |
| Base         | eip155:8453  | USDC  | **Primary** - fast, cheap, recommended |
| Base Sepolia | eip155:84532 | USDC  | Testnet                                |
| Ethereum     | eip155:1     | USDC  | Higher fees                            |
| Arbitrum     | eip155:42161 | USDC  |                                        |
| Optimism     | eip155:10    | USDC  |                                        |
| Polygon      | eip155:137   | USDC  |                                        |

Base is the default network. To use others, set `XCLAW02_NETWORK` environment variable.

## Facilitators

Facilitators handle payment verification and on-chain settlement. The x402 ecosystem has many independent facilitators:

| Name            | URL                                           | Notes        |
| --------------- | --------------------------------------------- | ------------ |
| Primer          | https://x402.primer.systems                   | Default      |
| Coinbase        | https://api.cdp.coinbase.com/platform/v2/x402 |              |
| x402.org        | https://x402.org/facilitator                  | Testnet only |
| PayAI           | https://facilitator.payai.network             |              |
| Corbits         | https://facilitator.corbits.dev               |              |
| Dexter          | https://x402.dexter.cash                      |              |
| Heurist         | https://facilitator.heurist.xyz               |              |
| Kobaru          | https://gateway.kobaru.io                     |              |
| Nevermined      | https://api.live.nevermined.app/api/v1/       |              |
| Openfacilitator | https://pay.openfacilitator.io                |              |
| Solpay          | https://x402.solpay.cash                      |              |
| xEcho           | https://facilitator.xechoai.xyz               |              |

To use a different facilitator, set `XCLAW02_FACILITATOR` environment variable.

## Environment Variables

| Variable              | Format                      | Description                                |
| --------------------- | --------------------------- | ------------------------------------------ |
| `XCLAW02_PRIVATE_KEY` | `0x` + 64 hex chars         | Wallet private key (required for payments) |
| `XCLAW02_NETWORK`     | `eip155:8453`, `base`, etc. | Default network (default: base)            |
| `XCLAW02_MAX_AMOUNT`  | `0.10`                      | Default max payment amount in USDC         |
| `XCLAW02_FACILITATOR` | URL                         | Facilitator URL override                   |

## Error Handling

| Error Code           | Meaning                    | What to Do                                                        |
| -------------------- | -------------------------- | ----------------------------------------------------------------- |
| `INSUFFICIENT_FUNDS` | Wallet balance too low     | Tell user to fund wallet with USDC on Base                        |
| `AMOUNT_EXCEEDS_MAX` | Payment exceeds maxAmount  | Ask user to approve higher amount, then retry with `--max-amount` |
| `SETTLEMENT_FAILED`  | On-chain settlement failed | Wait a moment and retry, or try a different facilitator           |
| `INVALID_RESPONSE`   | Malformed 402 response     | The URL may not support x402 properly                             |
| `NETWORK_MISMATCH`   | Wrong network              | Check the 402 response for required network, set XCLAW02_NETWORK  |

## Security Notes

- **Never expose private keys** in logs, chat, or output
- Use environment variables for wallet credentials
- **Always confirm** payment amounts with user before paying
- Fund wallets only with what's needed for the task
- Private key format: `0x` followed by 64 hexadecimal characters

## Alternative Implementations

x402 is an open standard with multiple implementations:

**Official Coinbase SDK** - The reference implementation with Go support and Solana (SVM) in addition to EVM chains:

- GitHub: https://github.com/coinbase/x402
- ClawHub: See the `x402` skill by @notorious-d-e-v
- Best for: Go developers, Solana payments, full spec compliance

**When to use alternatives:**

- You need **Go** support (xClaw02 is Node.js/Python only)
- You need **Solana** payments (xClaw02 is EVM only)
- You want the official reference implementation

All x402 implementations are interoperable - a client using any SDK can pay a server using any other SDK, as long as they share a supported network and facilitator.

## Links

- **x402 Protocol**: https://x402.org
- **SDK (npm)**: https://npmjs.com/package/xclaw02
- **SDK (PyPI)**: https://pypi.org/project/xclaw02
- **GitHub**: https://github.com/primer-systems/xClaw02
