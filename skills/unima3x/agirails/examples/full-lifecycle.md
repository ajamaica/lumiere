# Full Transaction Lifecycle

Complete example showing all 8 states and transitions.

## Scenario

- **Requester Agent**: Needs text translated
- **Provider Agent**: Offers translation service at $0.01/word
- **Task**: Translate 500 words (~$5.00)

## Complete TypeScript Implementation

```typescript
import { ACTPClient } from '@agirails/sdk';
import { ethers } from 'ethers';

const abiCoder = ethers.AbiCoder.defaultAbiCoder();

// ===========================================
// REQUESTER AGENT
// ===========================================

async function requesterWorkflow() {
  const client = await ACTPClient.create({
    mode: 'mainnet',
    privateKey: process.env.REQUESTER_PRIVATE_KEY!,
    requesterAddress: process.env.REQUESTER_ADDRESS!,
  });

  // Step 1: Create transaction (State: INITIATED)
  const txId = await client.standard.createTransaction({
    provider: process.env.PROVIDER_ADDRESS!,
    amount: '10',  // Max budget: $10 USDC (user-friendly)
    deadline: Math.floor(Date.now() / 1000) + 86400,  // 24h
    disputeWindow: 172800,  // 48h dispute window
    serviceDescription: 'Translate 500 words English to Spanish',
  });
  console.log(`[INITIATED] Transaction created: ${txId}`);

  // Step 2: Wait for provider quote...
  // (Provider transitions to QUOTED)

  // Step 3: Accept quote by locking escrow (State: COMMITTED)
  // Quote amount should be provided out-of-band (or via your own indexer)
  const quotedAmount = ethers.parseUnits('5', 6); // Example quote
  let escrowId: string;
  if (quotedAmount <= ethers.parseUnits('10', 6)) {
    escrowId = await client.standard.linkEscrow(txId);
    console.log(`[COMMITTED] Accepted quote, escrow locked`);
  } else {
    await client.standard.transitionState(txId, 'CANCELLED');
    console.log(`Quote too high, cancelled`);
    return;
  }

  // Step 4-5: Wait for provider to work and deliver...
  // (Provider transitions: IN_PROGRESS → DELIVERED)

  // Step 6: Verify delivery and release payment (State: SETTLED)
  const status = await client.basic.checkStatus(txId);
  if (status.state === 'DELIVERED') {
    // Validate the result off-chain (result location is app-specific)
    const resultValid = await validateTranslation('ipfs://...or https://...');

    if (resultValid) {
      // Use the escrowId captured earlier
      await client.standard.releaseEscrow(escrowId);
      console.log(`[SETTLED] Payment released to provider`);
    } else {
      await client.standard.transitionState(txId, 'DISPUTED');
      console.log(`[DISPUTED] Quality issue, raised dispute`);
    }
  }
}

// ===========================================
// PROVIDER AGENT
// ===========================================

async function providerWorkflow(txId: string) {
  const client = await ACTPClient.create({
    mode: 'mainnet',
    privateKey: process.env.PROVIDER_PRIVATE_KEY!,
    requesterAddress: process.env.PROVIDER_ADDRESS!,
  });

  // Step 1: Calculate and send quote (State: QUOTED)
  const wordCount = 500;
  const pricePerWord = ethers.parseUnits('0.01', 6);  // $0.01
  const totalPrice = pricePerWord * BigInt(wordCount);

  const quoteProof = abiCoder.encode(['uint256'], [totalPrice]);
  await client.standard.transitionState(txId, 'QUOTED', quoteProof);
  console.log(`[QUOTED] Sent quote: ${ethers.formatUnits(totalPrice, 6)} USDC`);

  // Step 2: Wait for requester to commit...

  // Step 3: Start work (State: IN_PROGRESS) - REQUIRED!
  await client.standard.transitionState(txId, 'IN_PROGRESS');
  console.log(`[IN_PROGRESS] Started working...`);

  // Step 4: Do the actual work
  const translation = await performTranslation('...');

  // Step 5: Deliver with proof (State: DELIVERED)
  const disputeWindow = 172800;  // 48 hours
  const deliveryProof = abiCoder.encode(['uint256'], [disputeWindow]);
  await client.standard.transitionState(txId, 'DELIVERED', deliveryProof);
  console.log(`[DELIVERED] Work delivered, waiting for payment`);

  // Step 6: Wait for requester to release after dispute window
}

// ===========================================
// DISPUTE RESOLUTION (Mediator)
// ===========================================

async function mediatorResolve(txId: string) {
  const client = await ACTPClient.create({
    mode: 'mainnet',
    privateKey: process.env.MEDIATOR_PRIVATE_KEY!,
    requesterAddress: process.env.MEDIATOR_ADDRESS!,
  });

  // Split funds: 30% to requester, 65% to provider, 5% mediator fee
  const totalAmount = ethers.parseUnits('5', 6);  // $5 USDC

  const requesterAmount = ethers.parseUnits('1.50', 6);   // 30%
  const providerAmount = ethers.parseUnits('3.25', 6);    // 65%
  const mediatorFee = ethers.parseUnits('0.25', 6);       // 5%

  const resolutionProof = abiCoder.encode(
    ['uint256', 'uint256', 'address', 'uint256'],
    [requesterAmount, providerAmount, process.env.MEDIATOR_ADDRESS!, mediatorFee]
  );

  await client.standard.transitionState(txId, 'SETTLED', resolutionProof);
  console.log(`[SETTLED] Dispute resolved - funds distributed`);
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

async function validateTranslation(resultUrl: string): Promise<boolean> {
  // Your validation logic here
  // - Check translation quality
  // - Verify word count
  // - Run through quality scorer
  return true;
}

async function performTranslation(text: string): Promise<string> {
  // Your translation logic here
  // - Call GPT-4, Claude, DeepL, etc.
  return 'Translated text...';
}

// ===========================================
// TIMELINE
// ===========================================

/*
Time    State           Action
-----   -----           ------
T+0     INITIATED       Requester creates transaction
T+1m    QUOTED          Provider sends quote ($5.00)
T+2m    COMMITTED       Requester accepts, escrow locked
T+3m    IN_PROGRESS     Provider starts work (REQUIRED!)
T+1h    DELIVERED       Provider delivers translation
T+1h    [dispute window starts - 48 hours]
T+49h   SETTLED         Requester releases after dispute window

Alternative path:
T+2h    DISPUTED        Requester raises quality dispute
T+3h    SETTLED         Mediator resolves (30/65/5 split)
*/
```

## State Verification

```typescript
// Check current state at any time
const status = await client.basic.checkStatus(txId);

console.log(`State: ${status.state}`);
console.log(`Can dispute: ${status.canDispute}`);
```

## Key Points

1. **IN_PROGRESS is mandatory** - Contract rejects COMMITTED → DELIVERED
2. **Proofs must be ABI-encoded** - Use `ethers.AbiCoder`
3. **Dispute window protects both parties** - Default 48 hours
4. **Manual settlement** - Requester releases after dispute window
5. **Mediator has final say** - Can split funds any way during dispute
