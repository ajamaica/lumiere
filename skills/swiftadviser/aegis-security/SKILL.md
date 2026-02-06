---
name: aegis-security
version: 1.0.0
description: Blockchain security API for AI agents. Scan tokens, simulate transactions, check addresses for threats.
homepage: https://aegis402.xyz
metadata: {"emoji":"🛡️","category":"blockchain-security","api_base":"https://aegis402.xyz/v1"}
---

# Aegis402 Shield Protocol

Blockchain security API for AI agents. Pay-per-request with USDC on Base or Solana.

## Skill Files

| File | URL |
|------|-----|
| **SKILL.md** (this file) | `https://aegis402.xyz/skill.md` |
| **package.json** (metadata) | `https://aegis402.xyz/skill.json` |

**Base URL:** `https://aegis402.xyz/v1`

## Quick Start

```bash
npm install @x402/fetch @x402/evm
```

```typescript
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';

const client = new x402Client()
  .register('eip155:*', new ExactEvmScheme(yourEvmWallet));

const fetch402 = wrapFetchWithPayment(fetch, client);

// Payments happen automatically on Base (USDC)
const res = await fetch402('https://aegis402.xyz/v1/check-token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48?chain_id=1');
const data = await res.json();
```

**Requirements:** USDC on Base Mainnet or Solana Mainnet

---

## Pricing

| Endpoint | Price | Use Case |
|----------|-------|----------|
| `POST /simulate-tx` | $0.05 | Transaction simulation, DeFi safety |
| `GET /check-token/:address` | $0.01 | Token honeypot detection |
| `GET /check-address/:address` | $0.005 | Address reputation check |

---

## Endpoints

### Check Token ($0.01)

Scan any token for honeypots, scams, and risks.

```bash
curl "https://aegis402.xyz/v1/check-token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48?chain_id=1"
```

**Query params:**
- `chain_id` (optional): Network ID. Default: 1 (Ethereum). Use 8453 for Base.

**Response:**
```json
{
  "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "isHoneypot": false,
  "trustScore": 95,
  "risks": [],
  "_meta": { "requestId": "uuid", "duration": 320 }
}
```

### Check Address ($0.005)

Verify if address is flagged for phishing or poisoning.

```bash
curl "https://aegis402.xyz/v1/check-address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
```

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "isPoisoned": false,
  "reputation": "NEUTRAL",
  "tags": ["wallet", "established"],
  "_meta": { "requestId": "uuid", "duration": 180 }
}
```

### Simulate Transaction ($0.05)

Predict balance changes and detect threats before signing.

```bash
curl -X POST "https://aegis402.xyz/v1/simulate-tx" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0xYourWallet...",
    "to": "0xContract...",
    "value": "1000000000000000000",
    "data": "0x...",
    "chain_id": 8453
  }'
```

**Request body:**
- `from` (required): Sender address
- `to` (required): Recipient/contract address
- `value` (required): Amount in wei
- `data` (optional): Calldata hex
- `chain_id` (optional): Network ID

**Response:**
```json
{
  "isSafe": true,
  "riskLevel": "LOW",
  "simulation": {
    "balanceChanges": [
      { "asset": "USDC", "amount": "-100.00", "address": "0x..." }
    ]
  },
  "warnings": [],
  "_meta": { "requestId": "uuid", "duration": 450 }
}
```

---

## Payment Networks

| Network | Wallets |
|---------|---------|
| **Base (EVM)** | MetaMask, Coinbase Wallet |
| **Solana** | Phantom, Solflare |

### TypeScript - Base/EVM

```typescript
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const signer = privateKeyToAccount('0x...');
const client = new x402Client()
  .register('eip155:*', new ExactEvmScheme(signer));

const fetch402 = wrapFetchWithPayment(fetch, client);
```

### TypeScript - Solana

```typescript
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactSvmScheme } from '@x402/svm/exact/client';
import { createKeyPairSignerFromBytes } from '@solana/kit';
import { base58 } from '@scure/base';

const signer = await createKeyPairSignerFromBytes(base58.decode('your_base58_key'));
const client = new x402Client()
  .register('solana:*', new ExactSvmScheme(signer));

const fetch402 = wrapFetchWithPayment(fetch, client);
```

### Python

```python
pip install x402[httpx]

from x402 import x402Client
from x402.http.clients import x402HttpxClient

client = x402Client()
async with x402HttpxClient(client) as http:
    res = await http.get('https://aegis402.xyz/v1/check-token/0x...')
```

---

## Use Cases for AI Agents

### Before Swapping Tokens
```typescript
// Check if token is safe before swap
const tokenCheck = await fetch402(`https://aegis402.xyz/v1/check-token/${tokenAddress}?chain_id=8453`);
const { isHoneypot, trustScore, risks } = await tokenCheck.json();

if (isHoneypot || trustScore < 50) {
  console.log('⚠️ Risky token detected!');
}
```

### Before Signing Transactions
```typescript
// Simulate transaction before signing
const simulation = await fetch402('https://aegis402.xyz/v1/simulate-tx', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ from, to, value, data, chain_id: 8453 })
});

const { isSafe, riskLevel, warnings } = await simulation.json();

if (!isSafe || riskLevel === 'CRITICAL') {
  console.log('🚨 Dangerous transaction!', warnings);
}
```

### Validating Recipient Addresses
```typescript
// Check if address is poisoned before sending
const addressCheck = await fetch402(`https://aegis402.xyz/v1/check-address/${recipientAddress}`);
const { isPoisoned, reputation } = await addressCheck.json();

if (isPoisoned) {
  console.log('🚨 Address poisoning detected!');
}
```

---

## Risk Levels

| Level | Meaning |
|-------|---------|
| `SAFE` | No issues detected |
| `LOW` | Minor concerns, generally safe |
| `MEDIUM` | Some risks, proceed with caution |
| `HIGH` | Significant risks detected |
| `CRITICAL` | Do not proceed |

---

## Error Handling

```typescript
const response = await fetch402(url);

if (!response.ok) {
  if (response.status === 400) {
    // Invalid parameters
    const { error } = await response.json();
    console.error('Bad request:', error);
  } else if (response.status === 402) {
    // Payment failed (insufficient USDC)
    console.error('Payment required - check USDC balance');
  } else if (response.status === 500) {
    // Service error
    const { error, details } = await response.json();
    console.error('Service error:', error, details);
  }
}
```

---

## Supported Chains

| Chain | ID | check-token | check-address | simulate-tx |
|-------|-----|-------------|---------------|-------------|
| Ethereum | 1 | ✅ | ✅ | ✅ |
| Base | 8453 | ✅ | ✅ | ✅ |
| Polygon | 137 | ✅ | ✅ | ✅ |
| Arbitrum | 42161 | ✅ | ✅ | ✅ |
| Optimism | 10 | ✅ | ✅ | ✅ |
| BSC | 56 | ✅ | ✅ | ✅ |
| Avalanche | 43114 | ✅ | ✅ | ✅ |

---

## Health Check (Free)

```bash
curl https://aegis402.xyz/health
```

```json
{
  "status": "healthy",
  "circuitBreaker": { "state": "CLOSED" }
}
```

---

## Links

- **Website**: https://aegis402.xyz
- **API Docs**: https://aegis402.xyz/api.html
- **Demo**: https://aegis402.xyz/demo.html
- **x402 Protocol**: https://docs.x402.org

---

🛡️ Built for the Agentic Economy. Powered by x402 Protocol.
