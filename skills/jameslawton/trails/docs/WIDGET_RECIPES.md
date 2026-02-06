# Widget Recipes

Ready-to-use examples for the Trails Widget component.

> **Note**: React 19.1+ is recommended for best compatibility with Trails. React 18+ is supported but may have compatibility issues.

## Basic Setup

### 1. Get Your API Key

👉 **Visit [https://dashboard.trails.build](https://dashboard.trails.build)** to get your API key, then set it as an environment variable:

```bash
NEXT_PUBLIC_TRAILS_API_KEY=your_api_key
```

### 2. Install

```bash
pnpm add @0xtrails/trails
# or
npm install @0xtrails/trails
# or
yarn add @0xtrails/trails
```

### 3. Provider Wiring

Wrap your app with both `WagmiProvider` and `TrailsProvider`:

```tsx
// app/providers.tsx (Next.js App Router)
'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TrailsProvider } from '@0xtrails/trails'
import { wagmiConfig } from './wagmi-config'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TrailsProvider trailsApiKey={process.env.NEXT_PUBLIC_TRAILS_API_KEY!}>
          {children}
        </TrailsProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## Pay Mode (Exact Output)

Use for payments where the recipient needs an exact amount.

```tsx
import { TrailsWidget } from '@0xtrails/trails'

function CheckoutPage() {
  return (
    <TrailsWidget
      mode="pay"
      destinationChainId={8453} // Base
      destinationTokenAddress="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC
      destinationAmount="10000000" // 10 USDC (6 decimals)
      destinationRecipient="0xMerchantAddress"
      onSuccess={(receipt) => {
        console.log('Payment complete:', receipt)
        // Redirect to success page
      }}
      onError={(error) => {
        console.error('Payment failed:', error)
      }}
    />
  )
}
```

### Pay Mode Props

| Prop                      | Type       | Required | Description                      |
| ------------------------- | ---------- | -------- | -------------------------------- |
| `mode`                    | `"pay"`    | Yes      | Sets Pay mode                    |
| `destinationChainId`      | `number`   | Yes      | Target chain ID                  |
| `destinationTokenAddress` | `string`   | Yes      | Token to receive                 |
| `destinationAmount`       | `string`   | Yes      | Exact amount (in smallest units) |
| `destinationRecipient`    | `string`   | Yes      | Address to receive payment       |
| `onSuccess`               | `function` | No       | Callback on success              |
| `onError`                 | `function` | No       | Callback on error                |

---

## Swap Mode

Use for token exchanges.

```tsx
import { TrailsWidget } from '@0xtrails/trails'

function SwapPage() {
  return (
    <TrailsWidget
      mode="swap"
      // Optional: preset destination
      destinationChainId={42161} // Arbitrum
      destinationTokenAddress="0xaf88d065e77c8cC2239327C5EDb3A432268e5831" // USDC
    />
  )
}
```

### Swap with Preset Source

```tsx
<TrailsWidget
  mode="swap"
  sourceChainId={1}
  sourceTokenAddress="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  destinationChainId={8453}
  destinationTokenAddress="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
/>
```

---

## Fund Mode (Exact Input)

Use for deposits where the user picks their input amount.

```tsx
import { TrailsWidget } from '@0xtrails/trails'

function DepositPage() {
  return (
    <TrailsWidget
      mode="fund"
      destinationChainId={42161}
      destinationTokenAddress="0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
      destinationRecipient="0xVaultContractAddress"
    />
  )
}
```

### Fund Mode with Calldata

Execute a contract function after bridging:

```tsx
import { TrailsWidget } from '@0xtrails/trails'
import { encodeFunctionData } from 'viem'

const vaultAbi = [
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

// Placeholder for dynamic amount (Trails fills this)
const PLACEHOLDER = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

const calldata = encodeFunctionData({
  abi: vaultAbi,
  functionName: 'deposit',
  args: [BigInt(PLACEHOLDER), '0xUserAddress'],
})

function VaultDepositPage() {
  return (
    <TrailsWidget
      mode="fund"
      destinationChainId={42161}
      destinationTokenAddress="0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
      destinationRecipient="0xVaultContractAddress"
      destinationCalldata={calldata}
    />
  )
}
```

---

## Earn Mode

Use for DeFi protocol deposits.

```tsx
import { TrailsWidget } from '@0xtrails/trails'

function EarnPage() {
  return (
    <TrailsWidget
      mode="earn"
      // Protocol-specific configuration
      destinationChainId={42161}
      destinationTokenAddress="0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    />
  )
}
```

---

## Theming

Customize the widget appearance with CSS variables:

```tsx
<TrailsWidget
  mode="swap"
  style={
    {
      '--trails-primary': '#6366f1',
      '--trails-background': '#0f0f0f',
      '--trails-surface': '#1a1a1a',
      '--trails-text': '#ffffff',
      '--trails-border-radius': '12px',
    } as React.CSSProperties
  }
/>
```

Or in your global CSS:

```css
:root {
  --trails-primary: #6366f1;
  --trails-background: #0f0f0f;
  --trails-surface: #1a1a1a;
  --trails-text: #ffffff;
  --trails-border-radius: 12px;
}
```

---

## Event Handlers

```tsx
<TrailsWidget
  mode="pay"
  destinationChainId={8453}
  destinationTokenAddress="0x..."
  destinationAmount="10000000"
  destinationRecipient="0x..."
  onSuccess={(receipt) => {
    // Intent completed successfully
    console.log('Intent ID:', receipt.intentId)
    console.log('Tx Hash:', receipt.transactionHash)
  }}
  onError={(error) => {
    // Handle error
    console.error('Error:', error.message)
  }}
  onClose={() => {
    // Widget closed (if in modal mode)
    console.log('Widget closed')
  }}
/>
```

---

## Full Example: E-commerce Checkout

```tsx
'use client'

import { useState } from 'react'
import { TrailsWidget } from '@0xtrails/trails'
import { useAccount } from 'wagmi'

interface Product {
  id: string
  name: string
  priceUSDC: string // In smallest units (6 decimals)
}

export function Checkout({ product }: { product: Product }) {
  const { isConnected } = useAccount()
  const [status, setStatus] = useState<'idle' | 'paying' | 'success'>('idle')

  if (!isConnected) {
    return <p>Please connect your wallet to checkout.</p>
  }

  if (status === 'success') {
    return <p>Thank you for your purchase!</p>
  }

  return (
    <div>
      <h2>Checkout: {product.name}</h2>
      <TrailsWidget
        mode="pay"
        destinationChainId={8453}
        destinationTokenAddress="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        destinationAmount={product.priceUSDC}
        destinationRecipient={process.env.NEXT_PUBLIC_MERCHANT_ADDRESS!}
        onSuccess={(receipt) => {
          setStatus('success')
          // Call your backend to confirm order
          fetch('/api/confirm-order', {
            method: 'POST',
            body: JSON.stringify({
              productId: product.id,
              intentId: receipt.intentId,
            }),
          })
        }}
        onError={(error) => {
          console.error('Payment failed:', error)
          setStatus('idle')
        }}
      />
    </div>
  )
}
```
