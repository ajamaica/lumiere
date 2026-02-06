# API Recipes

Server-side integration with the Trails Direct API.

## When to Use Direct API

- Backend services and automation
- Non-React applications
- Batch processing
- Full control over the signing pipeline
- Server-to-server settlement

---

## Setup

### 1. Get Your API Key

👉 **Visit [https://dashboard.trails.build](https://dashboard.trails.build)** to get your API key, then set it as an environment variable:

```bash
TRAILS_API_KEY=your_api_key
```

### 2. Install

```bash
pnpm add @0xtrails/trails-api
# or
npm install @0xtrails/trails-api
```

### 3. Initialize Client

```typescript
import { TrailsAPI } from '@0xtrails/trails-api'

const trails = new TrailsAPI({
  apiKey: process.env.TRAILS_API_KEY!,
  // Optional: custom endpoint
  // baseUrl: 'https://api.trails.build',
})
```

---

## Raw HTTP/Fetch API (For AI Agents & Universal Clients)

**Use this approach when:**

- Integrating with AI agents (OpenClaw, AutoGPT, etc.)
- Working without npm/Node.js
- Building in languages other than JavaScript/TypeScript
- Need direct HTTP access

### Base Configuration

```typescript
const TRAILS_API_URL = 'https://api.trails.build'
const API_KEY = process.env.TRAILS_API_KEY!

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
}
```

### 1. Quote Intent (GET Price & Route)

```typescript
async function quoteIntent(params) {
  const response = await fetch(`${TRAILS_API_URL}/quote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sourceChainId: 1, // Ethereum
      sourceTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      destinationChainId: 8453, // Base
      destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      amount: '1000000000', // 1000 USDC (6 decimals)
      tradeType: 'EXACT_INPUT',
      userAddress: '0xUserWalletAddress',
      ...params,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Quote failed: ${error.message}`)
  }

  return await response.json()
  // Returns: { quoteId, estimatedOutput, route, expiresAt, ... }
}
```

### 2. Commit Intent (Lock Quote)

```typescript
async function commitIntent(quoteId) {
  const response = await fetch(`${TRAILS_API_URL}/intent/commit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ quoteId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Commit failed: ${error.message}`)
  }

  return await response.json()
  // Returns: { intentId, status, sourceTransaction, ... }
}
```

### 3. Execute Intent (Trigger Execution)

```typescript
async function executeIntent(intentId, signature) {
  const response = await fetch(`${TRAILS_API_URL}/intent/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      intentId,
      signature, // User's wallet signature
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Execute failed: ${error.message}`)
  }

  return await response.json()
  // Returns: { transactionHash, status, ... }
}
```

### 4. Get Intent Status (Poll for Completion)

```typescript
async function getIntentStatus(intentId) {
  const response = await fetch(`${TRAILS_API_URL}/intent/${intentId}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Status check failed: ${error.message}`)
  }

  return await response.json()
  // Returns: { intentId, status, sourceTransactionHash, destinationTransactionHash, ... }
}
```

### 5. Wait for Completion (Polling Helper)

```typescript
async function waitForIntentCompletion(intentId, timeoutMs = 120000) {
  const startTime = Date.now()
  const pollInterval = 3000 // 3 seconds

  while (Date.now() - startTime < timeoutMs) {
    const status = await getIntentStatus(intentId)

    if (status.status === 'COMPLETED') {
      return status
    }

    if (status.status === 'FAILED') {
      throw new Error(`Intent failed: ${status.error || 'Unknown error'}`)
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new Error('Intent timed out')
}
```

### Complete Raw Fetch Example

```typescript
async function executeCrossChainTransfer() {
  try {
    // 1. Get quote
    console.log('Getting quote...')
    const quote = await quoteIntent({
      sourceChainId: 1,
      sourceTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      destinationChainId: 8453,
      destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: '1000000000',
      tradeType: 'EXACT_INPUT',
      userAddress: '0xYourAddress',
    })
    console.log('Quote received:', quote.quoteId)

    // 2. Commit intent
    console.log('Committing intent...')
    const intent = await commitIntent(quote.quoteId)
    console.log('Intent created:', intent.intentId)

    // 3. Execute (requires user signature)
    console.log('Executing intent...')
    const userSignature = await getUserSignature(intent) // Your signing logic
    const execution = await executeIntent(intent.intentId, userSignature)
    console.log('Execution started:', execution.transactionHash)

    // 4. Wait for completion
    console.log('Waiting for completion...')
    const result = await waitForIntentCompletion(intent.intentId)
    console.log('Transfer complete!')
    console.log('Destination tx:', result.destinationTransactionHash)

    return result
  } catch (error) {
    console.error('Transfer failed:', error)
    throw error
  }
}
```

### Python Example (For AI Agents)

```python
import requests
import time

TRAILS_API_URL = "https://api.trails.build"
API_KEY = "your_api_key"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

def quote_intent(params):
    response = requests.post(f"{TRAILS_API_URL}/quote", json=params, headers=headers)
    response.raise_for_status()
    return response.json()

def commit_intent(quote_id):
    response = requests.post(f"{TRAILS_API_URL}/intent/commit",
                            json={"quoteId": quote_id}, headers=headers)
    response.raise_for_status()
    return response.json()

def get_intent_status(intent_id):
    response = requests.get(f"{TRAILS_API_URL}/intent/{intent_id}", headers=headers)
    response.raise_for_status()
    return response.json()

def wait_for_completion(intent_id, timeout=120):
    start_time = time.time()
    while time.time() - start_time < timeout:
        status = get_intent_status(intent_id)
        if status["status"] == "COMPLETED":
            return status
        if status["status"] == "FAILED":
            raise Exception(f"Intent failed: {status.get('error')}")
        time.sleep(3)
    raise Exception("Intent timed out")

# Usage
quote = quote_intent({
    "sourceChainId": 1,
    "destinationChainId": 8453,
    "amount": "1000000000",
    "tradeType": "EXACT_INPUT",
    "userAddress": "0x..."
})
intent = commit_intent(quote["quoteId"])
result = wait_for_completion(intent["intentId"])
print(f"Complete! Tx: {result['destinationTransactionHash']}")
```

---

## SDK Client (For Node.js/TypeScript Projects)

If you're building a Node.js/TypeScript application, the SDK client provides a more convenient interface:

### Core Flow: Quote → Commit → Execute → Wait

```typescript
import { TrailsAPI } from '@0xtrails/trails-api'

const trails = new TrailsAPI({ apiKey: process.env.TRAILS_API_KEY! })

async function executeIntent() {
  // 1. QUOTE - Get pricing and route
  const quote = await trails.quoteIntent({
    sourceChainId: 1, // Ethereum
    sourceTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    destinationChainId: 8453, // Base
    destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    amount: '1000000000', // 1000 USDC
    tradeType: 'EXACT_INPUT',
    userAddress: '0xUserWalletAddress',
  })

  console.log('Quote ID:', quote.quoteId)
  console.log('Estimated output:', quote.estimatedOutput)
  console.log('Expires at:', quote.expiresAt)

  // 2. COMMIT - Lock the quote and create intent
  const intent = await trails.commitIntent({
    quoteId: quote.quoteId,
  })

  console.log('Intent ID:', intent.intentId)
  console.log('Status:', intent.status)

  // 3. EXECUTE - Trigger the cross-chain flow
  // This requires the user to sign or you to provide a signer
  const execution = await trails.executeIntent({
    intentId: intent.intentId,
    // Signature or signer configuration depends on your setup
    signature: '0x...', // User's signature
  })

  console.log('Execution started:', execution.transactionHash)

  // 4. WAIT - Poll for completion
  const receipt = await trails.waitIntentReceipt({
    intentId: intent.intentId,
    timeout: 120000, // 2 minutes
    pollInterval: 3000, // Check every 3 seconds
  })

  console.log('Intent complete!')
  console.log('Final status:', receipt.status)
  console.log('Destination tx:', receipt.destinationTransactionHash)

  return receipt
}
```

---

## API Methods Reference

### quoteIntent

Get a price quote for a cross-chain operation.

```typescript
const quote = await trails.quoteIntent({
  // Required
  sourceChainId: 1,
  sourceTokenAddress: '0x...',
  destinationChainId: 8453,
  destinationTokenAddress: '0x...',
  amount: '1000000000',
  tradeType: 'EXACT_INPUT', // or 'EXACT_OUTPUT'
  userAddress: '0x...',

  // Optional
  destinationRecipient: '0x...', // If different from userAddress
  destinationCalldata: '0x...', // For contract calls
  slippageTolerance: 0.5, // Percentage
})
```

### commitIntent

Lock a quote and create an intent.

```typescript
const intent = await trails.commitIntent({
  quoteId: quote.quoteId,
})
```

### executeIntent

Start execution of a committed intent.

```typescript
const execution = await trails.executeIntent({
  intentId: intent.intentId,
  signature: '0x...', // Required: user's signature
})
```

### waitIntentReceipt

Poll for intent completion.

```typescript
const receipt = await trails.waitIntentReceipt({
  intentId: intent.intentId,
  timeout: 120000, // Max wait time in ms
  pollInterval: 3000, // Poll frequency in ms
})
```

### getIntent

Fetch intent details by ID.

```typescript
const intent = await trails.getIntent({
  intentId: 'intent_abc123',
})
```

### getIntentReceipt

Get the receipt for a completed intent.

```typescript
const receipt = await trails.getIntentReceipt({
  intentId: 'intent_abc123',
})
```

### searchIntents

Query intents with filters.

```typescript
const results = await trails.searchIntents({
  userAddress: '0x...',
  status: 'COMPLETED',
  sourceChainId: 1,
  limit: 10,
  offset: 0,
})
```

### getIntentHistory

Get a user's intent history.

```typescript
const history = await trails.getIntentHistory({
  userAddress: '0x...',
  limit: 20,
})
```

### getTokenPrices

Fetch current token prices.

```typescript
const prices = await trails.getTokenPrices({
  tokens: [
    { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  ],
})
```

---

## Error Handling

```typescript
import { TrailsAPI, TrailsError } from '@0xtrails/trails-api';

const trails = new TrailsAPI({ apiKey: process.env.TRAILS_API_KEY! });

async function safeExecute() {
  try {
    const quote = await trails.quoteIntent({ ... });
    const intent = await trails.commitIntent({ quoteId: quote.quoteId });
    const receipt = await trails.waitIntentReceipt({
      intentId: intent.intentId,
      timeout: 120000,
    });
    return receipt;
  } catch (error) {
    if (error instanceof TrailsError) {
      console.error('Trails error:', error.code, error.message);

      // Handle specific error codes
      switch (error.code) {
        case 'QUOTE_EXPIRED':
          console.log('Quote expired, fetching new quote...');
          break;
        case 'INSUFFICIENT_BALANCE':
          console.log('User has insufficient balance');
          break;
        case 'ROUTE_NOT_FOUND':
          console.log('No route available for this trade');
          break;
        default:
          console.log('Unknown error');
      }
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

---

## Batch Processing Example

```typescript
import { TrailsAPI } from '@0xtrails/trails-api'

const trails = new TrailsAPI({ apiKey: process.env.TRAILS_API_KEY! })

interface Settlement {
  recipient: string
  amount: string
  chainId: number
  tokenAddress: string
}

async function processSettlements(settlements: Settlement[]) {
  const results = []

  for (const settlement of settlements) {
    try {
      // Quote
      const quote = await trails.quoteIntent({
        sourceChainId: 1,
        sourceTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        destinationChainId: settlement.chainId,
        destinationTokenAddress: settlement.tokenAddress,
        amount: settlement.amount,
        tradeType: 'EXACT_OUTPUT', // Recipient gets exact amount
        userAddress: process.env.TREASURY_ADDRESS!,
        destinationRecipient: settlement.recipient,
      })

      // Commit
      const intent = await trails.commitIntent({ quoteId: quote.quoteId })

      // Execute (assumes you have signing infrastructure)
      await trails.executeIntent({
        intentId: intent.intentId,
        signature: await signIntent(intent), // Your signing logic
      })

      // Wait
      const receipt = await trails.waitIntentReceipt({
        intentId: intent.intentId,
        timeout: 300000, // 5 minutes for batch
      })

      results.push({
        recipient: settlement.recipient,
        status: 'success',
        intentId: intent.intentId,
        txHash: receipt.destinationTransactionHash,
      })
    } catch (error) {
      results.push({
        recipient: settlement.recipient,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}
```

---

## Webhook Integration (Polling Alternative)

If you prefer webhooks over polling:

```typescript
// In your webhook handler (e.g., Next.js API route)
import { NextRequest, NextResponse } from 'next/server'
import { verifyTrailsWebhook } from '@0xtrails/trails-api'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-trails-signature')!

  // Verify webhook signature
  const isValid = verifyTrailsWebhook(body, signature, process.env.TRAILS_WEBHOOK_SECRET!)

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  switch (event.type) {
    case 'intent.completed':
      console.log('Intent completed:', event.data.intentId)
      // Update your database, notify user, etc.
      break
    case 'intent.failed':
      console.log('Intent failed:', event.data.intentId, event.data.error)
      break
  }

  return NextResponse.json({ received: true })
}
```

---

## Express.js Example

```typescript
import express from 'express'
import { TrailsAPI } from '@0xtrails/trails-api'

const app = express()
app.use(express.json())

const trails = new TrailsAPI({ apiKey: process.env.TRAILS_API_KEY! })

app.post('/api/quote', async (req, res) => {
  try {
    const quote = await trails.quoteIntent(req.body)
    res.json(quote)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

app.post('/api/execute', async (req, res) => {
  try {
    const { quoteId, signature } = req.body

    const intent = await trails.commitIntent({ quoteId })
    await trails.executeIntent({ intentId: intent.intentId, signature })

    const receipt = await trails.waitIntentReceipt({
      intentId: intent.intentId,
      timeout: 120000,
    })

    res.json(receipt)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```
