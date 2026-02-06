---
name: AGIRAILS Payments
version: 2.1.0
description: Official ACTP (Agent Commerce Transaction Protocol) SDK — the first trustless payment layer for AI agents. Pay for services or receive payments through blockchain-secured USDC escrow on Base L2. Use when agent needs to make payments, receive payments, check transaction status, or handle disputes.
author: AGIRAILS Inc.
homepage: https://agirails.io
repository: https://github.com/agirails/openclaw-skill
license: MIT
tags:
  - payments
  - blockchain
  - escrow
  - agent-commerce
  - base-l2
  - usdc
  - web3
keywords:
  - AI agent payments
  - trustless escrow
  - ACTP protocol
  - agent-to-agent commerce
  - USDC payments
metadata:
  openclaw:
    emoji: "💸"
    minVersion: "1.0.0"
    requires:
      env:
        - AGENT_PRIVATE_KEY
        - AGENT_ADDRESS
---

# AGIRAILS — Trustless Payments for AI Agents

Enable your AI agent to **pay for services** or **receive payments** through blockchain-secured USDC escrow on Base L2.

## 🚀 Quick Start

**Just say:** *"Pay 10 USDC to 0xProvider for translation service"*

The agent will:
1. Initialize ACTP client
2. Create transaction with escrow
3. Track state through completion
4. Handle disputes if needed

---

## Prerequisites

| Requirement | Check | Install |
|-------------|-------|---------|
| **Node.js 18+** | `node --version` | [nodejs.org](https://nodejs.org) |
| **Private Key** | `echo $AGENT_PRIVATE_KEY` | Export wallet key |
| **USDC Balance** | Check wallet | Bridge USDC to Base via [bridge.base.org](https://bridge.base.org) |

### Environment Variables

```bash
export AGENT_PRIVATE_KEY="0x..."   # Wallet private key
export AGENT_ADDRESS="0x..."       # Wallet address
```

> **Note:** SDK includes default RPC endpoints. For high-volume production use, set up your own RPC via [Alchemy](https://alchemy.com) or [QuickNode](https://quicknode.com) and pass `rpcUrl` to client config.

### Installation

```bash
# TypeScript/Node.js
npm install @agirails/sdk

# Python
pip install agirails
```

---

## How It Works

ACTP uses an **8-state machine** with blockchain-secured escrow:

```
Human/Agent requests service
        ↓
   INITIATED ──► Provider quotes price
        ↓
     QUOTED ──► Requester accepts, locks USDC
        ↓
   COMMITTED ──► Provider starts work
        ↓
  IN_PROGRESS ──► Provider delivers (REQUIRED step!)
        ↓
   DELIVERED ──► Dispute window (48h default)
        ↓
    SETTLED ◄── Manual release (requester calls releaseEscrow)

   DISPUTED ──► Mediator resolves (splits funds)
   CANCELLED ──► Refund to requester
```

### Key Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Escrow Solvency** | Vault always holds ≥ active transaction amounts |
| **State Monotonicity** | States only move forward, never backwards |
| **Deadline Enforcement** | No delivery after deadline passes |
| **Dispute Protection** | 48h window to raise issues before settlement |

---

## Actions

| Action | Who | Description |
|--------|-----|-------------|
| `pay` | Requester | Simple payment (create + escrow lock) |
| `checkStatus` | Anyone | Get transaction state |
| `createTransaction` | Requester | Create with custom params |
| `linkEscrow` | Requester | Lock funds in escrow |
| `transitionState` | Provider | Quote, start, deliver |
| `releaseEscrow` | Requester | Release funds to provider |
| `transitionState('DISPUTED')` | Either | Raise dispute for mediation |

---

## Requester Flow (Paying for Services)

### Simple Payment

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  mode: 'mainnet',
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  requesterAddress: process.env.AGENT_ADDRESS!,
});

// One-liner payment
const result = await client.basic.pay({
  to: '0xProviderAddress',
  amount: '25.00',     // USDC
  deadline: '+24h',    // 24 hours from now
});

console.log(`Transaction: ${result.txId}`);
console.log(`State: ${result.state}`);
```

### Advanced Payment (Full Control)

```typescript
// 1. Create transaction
const txId = await client.standard.createTransaction({
  provider: '0xProviderAddress',
  amount: '100',  // 100 USDC (user-friendly)
  deadline: Math.floor(Date.now() / 1000) + 86400,
  disputeWindow: 172800,  // 48 hours
  serviceDescription: 'Translate 500 words to Spanish',
});

// 2. Lock funds in escrow
const escrowId = await client.standard.linkEscrow(txId);

// 3. Wait for delivery... then release
// ...wait for DELIVERED
await client.standard.releaseEscrow(escrowId);
```

---

## Provider Flow (Receiving Payments)

```typescript
import { ethers } from 'ethers';
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

// 1. Quote the job (encode amount as proof)
const quoteAmount = ethers.parseUnits('50', 6);
const quoteProof = abiCoder.encode(['uint256'], [quoteAmount]);
await client.standard.transitionState(txId, 'QUOTED', quoteProof);

// 2. Start work (REQUIRED before delivery!)
await client.standard.transitionState(txId, 'IN_PROGRESS');

// 3. Deliver with dispute window proof
const disputeWindow = 172800;  // 48 hours
const deliveryProof = abiCoder.encode(['uint256'], [disputeWindow]);
await client.standard.transitionState(txId, 'DELIVERED', deliveryProof);

// 4. Requester releases after dispute window (or earlier if satisfied)
```

**⚠️ CRITICAL:** `IN_PROGRESS` is **required** before `DELIVERED`. Contract rejects direct `COMMITTED → DELIVERED`.

---

## Proof Encoding

All proofs must be ABI-encoded hex strings:

| Transition | Proof Format | Example |
|------------|--------------|---------|
| QUOTED | `['uint256']` amount | `encode(['uint256'], [parseUnits('50', 6)])` |
| DELIVERED | `['uint256']` dispute window | `encode(['uint256'], [172800])` |
| SETTLED (dispute) | `['uint256', 'uint256', 'address', 'uint256']` | `[reqAmt, provAmt, mediator, fee]` |

```typescript
import { ethers } from 'ethers';
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

// Quote proof
const quoteProof = abiCoder.encode(['uint256'], [ethers.parseUnits('100', 6)]);

// Delivery proof
const deliveryProof = abiCoder.encode(['uint256'], [172800]);

// Resolution proof (mediator only)
const resolutionProof = abiCoder.encode(
  ['uint256', 'uint256', 'address', 'uint256'],
  [requesterAmount, providerAmount, mediatorAddress, mediatorFee]
);
```

---

## Checking Status

```typescript
const status = await client.basic.checkStatus(txId);

console.log(`State: ${status.state}`);
console.log(`Can dispute: ${status.canDispute}`);
```

---

## Disputes

Either party can raise a dispute before settlement:

```typescript
// Raise dispute
await client.standard.transitionState(txId, 'DISPUTED');

// Mediator resolves (admin only)
const resolution = abiCoder.encode(
  ['uint256', 'uint256', 'address', 'uint256'],
  [
    ethers.parseUnits('30', 6),   // requester gets 30 USDC
    ethers.parseUnits('65', 6),   // provider gets 65 USDC
    mediatorAddress,
    ethers.parseUnits('5', 6),    // mediator fee
  ]
);
await client.standard.transitionState(txId, 'SETTLED', resolution);
```

---

## Protocol Fees

| Fee Type | Amount |
|----------|--------|
| Platform fee | 1% of transaction |
| Minimum fee | $0.05 USDC |
| Maximum cap | 5% (governance limit) |

Provider receives: `amount - max(amount * 0.01, $0.05)`

---

## Client Modes

| Mode | Network | Use Case |
|------|---------|----------|
| `mock` | Local simulation | Development, testing |
| `testnet` | Base Sepolia | Integration testing |
| `mainnet` | Base | Production |

```typescript
// Development
const client = await ACTPClient.create({
  mode: 'mock',
  requesterAddress: '0x...',
});
await client.mintTokens('0x...', '1000000000');  // Mint test USDC

// Production
const client = await ACTPClient.create({
  mode: 'mainnet',
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  requesterAddress: process.env.AGENT_ADDRESS!,
});
```

---

## Error Handling

```typescript
import {
  InsufficientFundsError,
  InvalidStateTransitionError,
  DeadlineExpiredError,
} from '@agirails/sdk';

try {
  await client.basic.pay({...});
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.log(error.message);
  } else if (error instanceof InvalidStateTransitionError) {
    console.log(`Invalid state transition`);
  }
}
```

---

## Python Example

```python
import asyncio
import os
from agirails import ACTPClient

async def main():
    client = await ACTPClient.create(
        mode="mainnet",
        private_key=os.environ["AGENT_PRIVATE_KEY"],
        requester_address=os.environ["AGENT_ADDRESS"],
    )

    result = await client.basic.pay({
        "to": "0xProviderAddress",
        "amount": "25.00",
        "deadline": "24h",
    })

    print(f"Transaction: {result.tx_id}")
    print(f"State: {result.state}")

asyncio.run(main())
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `COMMITTED → DELIVERED` reverts | Missing IN_PROGRESS | Add `transitionState(txId, 'IN_PROGRESS')` first |
| Invalid proof error | Wrong encoding | Use `ethers.AbiCoder` with correct types |
| Insufficient balance | Not enough USDC | Bridge USDC to Base via [bridge.base.org](https://bridge.base.org) |
| Deadline expired | Too slow | Create new transaction with longer deadline |

---

## Files

| File | Purpose |
|------|---------|
| `{baseDir}/references/requester-template.md` | Full requester agent template |
| `{baseDir}/references/provider-template.md` | Full provider agent template |
| `{baseDir}/references/state-machine.md` | Detailed state transitions |
| `{baseDir}/examples/simple-payment.md` | Minimal payment example |
| `{baseDir}/examples/full-lifecycle.md` | Complete transaction lifecycle |

---

## OpenClaw Integration

Ready-to-use templates for OpenClaw agents.

### Quick Setup (5 minutes)

```bash
# Run setup script
bash {baseDir}/scripts/setup.sh

# Add agent config to openclaw.json (see agent-config.json)
# Set environment variables
# Restart OpenClaw
```

See `{baseDir}/openclaw/QUICKSTART.md` for detailed guide.

### OpenClaw Files

| File | Purpose |
|------|---------|
| `{baseDir}/openclaw/QUICKSTART.md` | 5-minute setup guide |
| `{baseDir}/openclaw/agent-config.json` | Ready-to-use agent configs |
| `{baseDir}/openclaw/SOUL-treasury.md` | Treasury agent template (buyer) |
| `{baseDir}/openclaw/SOUL-provider.md` | Merchant agent template (seller) |
| `{baseDir}/openclaw/cron-examples.json` | Automation cron jobs |
| `{baseDir}/openclaw/validation-patterns.md` | Delivery validation helpers |
| `{baseDir}/openclaw/security-checklist.md` | Pre-launch security audit |

### Scripts

| Script | Purpose |
|--------|---------|
| `{baseDir}/scripts/setup.sh` | Automated workspace setup |
| `{baseDir}/scripts/test-balance.ts` | Check wallet balance |
| `{baseDir}/scripts/test-purchase.ts` | Test purchase on testnet |

---

## Resources

- **Documentation**: https://docs.agirails.io
- **SDK Repository**: https://github.com/agirails/sdk
- **Discord**: https://discord.gg/nuhCt75qe4
- **Support**: support@agirails.io
