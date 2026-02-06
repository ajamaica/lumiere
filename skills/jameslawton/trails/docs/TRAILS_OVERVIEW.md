# Trails Overview

> **Authoritative source**: For the latest information, use the Trails Docs MCP at `https://docs.trails.build/mcp` with the `SearchTrails` tool.

## What is Trails?

Trails is cross-chain infrastructure that enables:

- **Token transfers** across chains
- **Swaps** (same-chain or cross-chain)
- **Smart contract execution** at destination (calldata)
- **DeFi deposits** (Earn mode)
- **Payments** with any token (Pay mode)

## Getting Started

### Prerequisites

- **React/Next.js integrations**: React 19.1+ (recommended for best compatibility)
  - React 18+ is supported but React 19.1+ works best with Trails
- **Direct API**: Node.js 18+ or any runtime with fetch support

### 1. Get Your API Key

Before using Trails, you'll need an API key:

👉 **Visit [https://dashboard.trails.build](https://dashboard.trails.build)** to create an account and generate your key.

Then set it as an environment variable:

```bash
# For client-side (Widget/Headless SDK)
NEXT_PUBLIC_TRAILS_API_KEY=your_api_key

# For server-side (Direct API)
TRAILS_API_KEY=your_api_key
```

### 2. Install the Package

```bash
# Widget or Headless SDK
pnpm add @0xtrails/trails

# Direct API
pnpm add @0xtrails/trails-api
```

---

## Core Concepts

### Intent Lifecycle

1. **Quote** — Get a price quote for the desired operation
2. **Commit** — Lock the quote and create an intent
3. **Execute** — User signs and submits the transaction
4. **Receipt** — Wait for cross-chain confirmation

### Modes

| Mode     | Use Case                                           | Trade Type                  |
| -------- | -------------------------------------------------- | --------------------------- |
| **Pay**  | Checkout/payments — merchant receives exact amount | EXACT_OUTPUT                |
| **Swap** | Token exchange — user picks direction              | EXACT_INPUT or EXACT_OUTPUT |
| **Fund** | Deposits — user picks input amount                 | EXACT_INPUT                 |
| **Earn** | DeFi protocol deposits                             | EXACT_INPUT                 |

### Trade Types

- **EXACT_INPUT**: User specifies input amount, output is calculated
- **EXACT_OUTPUT**: User specifies desired output, input is calculated

## Integration Methods

### 1. Widget (React UI)

Drop-in React component with pre-built UI. Supports theming via CSS variables.

```tsx
import { TrailsWidget } from '@0xtrails/trails'

;<TrailsWidget mode="swap" destinationChainId={8453} destinationTokenAddress="0x..." />
```

### 2. Headless SDK (React Hooks)

Programmatic control with your own UI. Requires `TrailsProvider` and `TrailsHookModal`.

```tsx
import { useQuote } from '@0xtrails/trails'

const { quote, isPending, isSuccess } = useQuote({ ...params })
// Executes automatically when quote is ready
```

### 3. Direct API

Server-side or non-React. Full control over the intent lifecycle.

```typescript
import { TrailsAPI } from '@0xtrails/trails-api';

const trails = new TrailsAPI({ apiKey: '...' });
const quote = await trails.quoteIntent({ ... });
```

## Provider Configuration

The SDK requires `TrailsProvider` wrapping your app:

```tsx
<TrailsProvider
  trailsApiKey="your_api_key" // Required
  trailsApiUrl="..." // Optional: custom API endpoint
  sequenceIndexerUrl="..." // Optional
  sequenceNodeGatewayUrl="..." // Optional
>
  {children}
</TrailsProvider>
```

## Token & Chain Discovery

### Hooks

```tsx
import { useSupportedChains, useSupportedTokens, useTokenList } from '@0xtrails/trails'

const { data: chains } = useSupportedChains()
const { data: tokens } = useSupportedTokens({ chainId: 8453 })
```

### Functions

```typescript
import { getSupportedChains, getSupportedTokens, getChainInfo } from '@0xtrails/trails'

const chains = await getSupportedChains()
const tokens = await getSupportedTokens({ chainId: 8453 })
```

## API SDK Methods

| Method              | Description                  |
| ------------------- | ---------------------------- |
| `quoteIntent`       | Get a price quote            |
| `commitIntent`      | Lock quote and create intent |
| `executeIntent`     | Trigger execution            |
| `waitIntentReceipt` | Poll for completion          |
| `getIntent`         | Fetch intent by ID           |
| `getIntentReceipt`  | Get execution receipt        |
| `searchIntents`     | Query intent history         |
| `getIntentHistory`  | User's intent history        |
| `getTokenPrices`    | Fetch token prices           |

## Links

- [Trails Docs](https://docs.trails.build)
- [API Reference](https://docs.trails.build/api)
- [SDK Reference](https://docs.trails.build/sdk)
