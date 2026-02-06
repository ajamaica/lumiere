# Headless SDK Recipes

Build custom UIs with Trails hooks and programmatic control.

> **Note**: React 19.1+ is recommended for best compatibility with Trails. React 18+ is supported but may have compatibility issues.

## Setup Requirements

### 1. Get Your API Key

👉 **Visit [https://dashboard.trails.build](https://dashboard.trails.build)** to get your API key, then set it as an environment variable:

```bash
NEXT_PUBLIC_TRAILS_API_KEY=your_api_key
```

### 2. Install

```bash
pnpm add @0xtrails/trails
```

### 3. Provider + Modal (Required)

The headless SDK requires:

- `TrailsProvider` for configuration
- `TrailsHookModal` for transaction signing UI

```tsx
// app/providers.tsx
'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TrailsProvider, TrailsHookModal } from '@0xtrails/trails'
import { wagmiConfig } from './wagmi-config'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TrailsProvider trailsApiKey={process.env.NEXT_PUBLIC_TRAILS_API_KEY!}>
          <TrailsHookModal />
          {children}
        </TrailsProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

> **Important**: `TrailsHookModal` must be rendered inside both `WagmiProvider` and `TrailsProvider`.

---

## Core Hook: useQuote

The primary hook for executing Trails intents. Executes automatically when ready.

```tsx
import { useQuote } from '@0xtrails/trails'

function SendButton() {
  const { quote, isPending, isSuccess, isError, error } = useQuote({
    destinationChainId: 8453,
    destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    destinationAmount: '10000000', // 10 USDC
    destinationRecipient: '0xRecipientAddress',
  })

  return (
    <div>
      <button disabled={isPending || isSuccess}>
        {isPending ? 'Processing...' : isSuccess ? 'Sent!' : 'Send'}
      </button>
      {isSuccess && <p>Success! Intent ID: {quote?.intentId}</p>}
      {isError && <p>Error: {error?.message}</p>}
    </div>
  )
}
```

---

## Token & Chain Discovery

### useSupportedChains

```tsx
import { useSupportedChains } from '@0xtrails/trails'

function ChainSelector() {
  const { data: chains, isLoading, error } = useSupportedChains()

  if (isLoading) return <p>Loading chains...</p>
  if (error) return <p>Error loading chains</p>

  return (
    <select>
      {chains?.map((chain) => (
        <option key={chain.chainId} value={chain.chainId}>
          {chain.name}
        </option>
      ))}
    </select>
  )
}
```

### useSupportedTokens

```tsx
import { useSupportedTokens } from '@0xtrails/trails'

function TokenSelector({ chainId }: { chainId: number }) {
  const { data: tokens, isLoading } = useSupportedTokens({ chainId })

  if (isLoading) return <p>Loading tokens...</p>

  return (
    <select>
      {tokens?.map((token) => (
        <option key={token.address} value={token.address}>
          {token.symbol} - {token.name}
        </option>
      ))}
    </select>
  )
}
```

### useTokenList

Get a combined token list for UI display:

```tsx
import { useTokenList } from '@0xtrails/trails'

function TokenList() {
  const { data: tokenList } = useTokenList()

  return (
    <ul>
      {tokenList?.tokens.map((token) => (
        <li key={`${token.chainId}-${token.address}`}>
          {token.symbol} on chain {token.chainId}
        </li>
      ))}
    </ul>
  )
}
```

---

## Building a Custom Swap UI

```tsx
'use client'

import { useState } from 'react'
import { useQuote, useSupportedChains, useSupportedTokens } from '@0xtrails/trails'
import { useAccount } from 'wagmi'
import { parseUnits } from 'viem'

export function CustomSwapUI() {
  const { address } = useAccount()
  const { data: chains } = useSupportedChains()

  const [sourceChain, setSourceChain] = useState<number>(1)
  const [destChain, setDestChain] = useState<number>(8453)
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState('')

  const { data: destTokens } = useSupportedTokens({ chainId: destChain })

  const token = destTokens?.find((t) => t.address === selectedToken)
  const parsedAmount = amount && token ? parseUnits(amount, token.decimals ?? 18) : undefined

  const { quote, isPending, isSuccess } = useQuote(
    parsedAmount && selectedToken && address
      ? {
          destinationChainId: destChain,
          destinationTokenAddress: selectedToken,
          destinationAmount: parsedAmount.toString(),
          destinationRecipient: address,
        }
      : null,
  )

  return (
    <div className="swap-container">
      <h2>Cross-Chain Swap</h2>

      {/* Source Chain */}
      <label>
        From Chain:
        <select value={sourceChain} onChange={(e) => setSourceChain(Number(e.target.value))}>
          {chains?.map((c) => (
            <option key={c.chainId} value={c.chainId}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* Destination Chain */}
      <label>
        To Chain:
        <select value={destChain} onChange={(e) => setDestChain(Number(e.target.value))}>
          {chains?.map((c) => (
            <option key={c.chainId} value={c.chainId}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* Destination Token */}
      <label>
        Receive Token:
        <select value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)}>
          <option value="">Select token</option>
          {destTokens?.map((t) => (
            <option key={t.address} value={t.address}>
              {t.symbol}
            </option>
          ))}
        </select>
      </label>

      {/* Amount */}
      <label>
        Amount:
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
        />
      </label>

      <button disabled={isPending || isSuccess}>
        {isPending ? 'Swapping...' : isSuccess ? 'Complete!' : 'Swap'}
      </button>

      {isSuccess && <p>Swap successful!</p>}
    </div>
  )
}
```

---

## Intent History

```tsx
import { useIntentHistory } from '@0xtrails/trails'
import { useAccount } from 'wagmi'

function TransactionHistory() {
  const { address } = useAccount()
  const { data: history, isLoading } = useIntentHistory({ address })

  if (isLoading) return <p>Loading history...</p>

  return (
    <ul>
      {history?.intents.map((intent) => (
        <li key={intent.intentId}>
          {intent.status} - {intent.sourceAmount} {intent.sourceToken.symbol}→{' '}
          {intent.destinationAmount} {intent.destinationToken.symbol}
        </li>
      ))}
    </ul>
  )
}
```

---

## With Calldata (Destination Contract Call)

```tsx
import { useQuote } from '@0xtrails/trails'
import { encodeFunctionData } from 'viem'
import { useState } from 'react'

const VAULT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [],
  },
] as const

function VaultDeposit({
  vaultAddress,
  userAddress,
}: {
  vaultAddress: `0x${string}`
  userAddress: `0x${string}`
}) {
  const [amount, setAmount] = useState('')

  // Use placeholder for Fund mode (EXACT_INPUT)
  const PLACEHOLDER = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

  const calldata = amount
    ? encodeFunctionData({
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [PLACEHOLDER, userAddress],
      })
    : undefined

  const { quote, isPending, isSuccess } = useQuote(
    amount && calldata
      ? {
          destinationChainId: 42161,
          destinationTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          destinationRecipient: vaultAddress,
          destinationCalldata: calldata,
          // Source amount is what user is sending (EXACT_INPUT)
          sourceAmount: amount,
        }
      : null,
  )

  return (
    <div>
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (USDC)"
      />
      <button disabled={isPending || isSuccess}>
        {isPending ? 'Depositing...' : isSuccess ? 'Complete!' : 'Deposit'}
      </button>
      {isSuccess && <p>Deposit successful!</p>}
    </div>
  )
}
```

---

## Programmatic Functions (Non-Hook)

For server components or non-React contexts:

```typescript
import { getSupportedChains, getSupportedTokens, getChainInfo } from '@0xtrails/trails'

// Get all supported chains
const chains = await getSupportedChains()

// Get tokens for a specific chain
const tokens = await getSupportedTokens({ chainId: 8453 })

// Get chain info
const baseInfo = await getChainInfo(8453)
```

---

## Error Handling Pattern

```tsx
import { useQuote } from '@0xtrails/trails'

function RobustSendButton() {
  const { quote, isPending, isSuccess, error, refetch } = useQuote({
    destinationChainId: 8453,
    destinationTokenAddress: '0x...',
    destinationAmount: '10000000',
    destinationRecipient: '0x...',
  })

  return (
    <div>
      <button disabled={isPending || isSuccess}>
        {isPending ? 'Sending...' : isSuccess ? 'Sent!' : 'Send'}
      </button>
      {error && (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={() => refetch()}>Try Again</button>
        </div>
      )}
      {isSuccess && <p>Transaction complete!</p>}
    </div>
  )
}
```
