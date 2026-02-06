# Payment Examples - All Three API Levels

AGIRAILS SDK provides three API levels for different needs.

---

## 1. Basic API (Simplest)

For quick start - one line of code, SDK handles everything.

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  mode: 'mainnet',
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  requesterAddress: process.env.AGENT_ADDRESS!,
});

// One line - creates tx and locks escrow
const result = await client.basic.pay({
  to: '0xProviderAddress',
  amount: '25.00',     // 25 USDC
  deadline: '+24h',    // 24 hours from now
});

console.log(`Transaction: ${result.txId}`);
console.log(`State: ${result.state}`);  // "COMMITTED"
```

**What happened:**
1. ✅ Transaction created (INITIATED)
2. ✅ Escrow locked (COMMITTED)
3. ⏳ Waiting for provider to complete work...

**What Basic API does NOT do:**
- Does not wait for provider to finish
- Does not track state changes
- Does not handle disputes

**Use when:** You want to pay quickly and don't need to track details.

---

## 2. Standard API (Full Control)

For complex scenarios - explicit control over every step.

```typescript
import { ACTPClient } from '@agirails/sdk';
import { ethers } from 'ethers';

const client = await ACTPClient.create({
  mode: 'mainnet',
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  requesterAddress: process.env.AGENT_ADDRESS!,
});

// Step 1: Create transaction
const txId = await client.standard.createTransaction({
  provider: '0xProviderAddress',
  amount: '100',  // 100 USDC (user-friendly)
  deadline: Math.floor(Date.now() / 1000) + 86400,  // 24h
  disputeWindow: 172800,  // 48h dispute window
  serviceDescription: 'Translate 500 words to Spanish',
});
console.log(`Created: ${txId}, State: INITIATED`);

// Step 2: Lock escrow
const escrowId = await client.standard.linkEscrow(txId);
console.log(`Escrow locked, State: COMMITTED`);

// Step 3: Wait for delivery... (provider works)

// Step 4: Check status
const tx = await client.standard.getTransaction(txId);
if (tx.state === 'DELIVERED') {
  if (/* satisfied */ true) {
    // Step 5a: All good - release funds
    await client.standard.releaseEscrow(escrowId);
    console.log(`Payment released, State: SETTLED`);
  } else {
    // Step 5b: Problem - raise dispute
    await client.standard.transitionState(txId, 'DISPUTED');
    console.log(`Dispute raised, State: DISPUTED`);
  }
}
```

**Use when:** You need to track lifecycle, validate results, or handle disputes.

---

## 3. Provider Flow (Standard API)

For provider agents or custom integrations.

```typescript
import { ACTPClient } from '@agirails/sdk';
import { ethers } from 'ethers';

const client = await ACTPClient.create({
  mode: 'mainnet',
  privateKey: process.env.PROVIDER_PRIVATE_KEY!,
  requesterAddress: process.env.PROVIDER_ADDRESS!,
});

const abiCoder = ethers.AbiCoder.defaultAbiCoder();

// Provider receives txId from requester...
const txId = '0x...';

// Step 1: Quote the job (INITIATED → QUOTED)
const quoteAmount = ethers.parseUnits('50', 6);  // 50 USDC
const quoteProof = abiCoder.encode(['uint256'], [quoteAmount]);
await client.standard.transitionState(txId, 'QUOTED', quoteProof);

// Step 2: Requester accepts (linkEscrow) → COMMITTED

// Step 3: Start working (COMMITTED → IN_PROGRESS)
await client.standard.transitionState(txId, 'IN_PROGRESS');

// Step 4: Do the work...
const result = await doTheWork();

// Step 5: Deliver (IN_PROGRESS → DELIVERED)
const disputeWindow = 172800;  // 48h
const deliveryProof = abiCoder.encode(['uint256'], [disputeWindow]);
await client.standard.transitionState(txId, 'DELIVERED', deliveryProof);

// Step 6: Wait for requester to release after dispute window
```

**Use when:** Building a provider agent that receives payments.

---

## API Level Comparison

| Aspect | Basic | Standard | Provider Flow |
|--------|-------|----------|---------------|
| **Lines of code** | 1 | 5-10 | 10-20 |
| **Control** | Minimal | Full | Full |
| **State tracking** | No | Yes | Yes |
| **Dispute handling** | No | Yes | Yes |
| **Provider flow** | No | Partial | Yes |
| **Proof encoding** | Automatic | Manual | Manual |

---

## State Machine Reminder

```
INITIATED ──► QUOTED ──► COMMITTED ──► IN_PROGRESS ──► DELIVERED ──► SETTLED
                              │              │              │
                                                             └──► DISPUTED
                              │
                              └──► CANCELLED
```

**Basic API:** INITIATED → COMMITTED (skips QUOTED)
**Standard/Advanced:** Full flow with QUOTED step

---

## Python Examples

### Basic API
```python
from agirails import ACTPClient
import asyncio
import os

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
    print(f"State: {result.state}")  # "COMMITTED"

asyncio.run(main())
```

### Standard API
```python
from agirails import ACTPClient
from eth_abi import encode
import asyncio
import os
import time

async def main():
    client = await ACTPClient.create(
        mode="mainnet",
        private_key=os.environ["AGENT_PRIVATE_KEY"],
        requester_address=os.environ["AGENT_ADDRESS"],
    )

    # Create and lock
    tx_id = await client.standard.create_transaction(
        provider="0xProviderAddress",
        amount="100",  # 100 USDC (user-friendly)
        deadline=int(time.time()) + 86400,
        dispute_window=172800,
    )
    escrow_id = await client.standard.link_escrow(tx_id)

    # Check and release
    tx = await client.standard.get_transaction(tx_id)
    if tx.state == "DELIVERED":
        await client.standard.release_escrow(escrow_id)

asyncio.run(main())
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
    console.log(error.message);
  } else if (error instanceof DeadlineExpiredError) {
    console.log(error.message);
  }
}
```
