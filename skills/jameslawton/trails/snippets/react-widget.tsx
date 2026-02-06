/**
 * Trails Widget Integration - React/Next.js
 *
 * This snippet shows how to integrate the Trails Widget for
 * drop-in Pay, Swap, Fund, or Earn flows.
 *
 * SETUP:
 * 1. Get your API key from https://dashboard.trails.build
 * 2. Install: npm install @0xtrails/trails (or pnpm/yarn)
 * 3. Set NEXT_PUBLIC_TRAILS_API_KEY in your environment variables
 */

// ============================================
// 1. PROVIDER SETUP (app/providers.tsx)
// ============================================

'use client'

import { TrailsProvider } from '@0xtrails/trails'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { arbitrum, base, mainnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum],
  connectors: [injected(), walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! })],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
  },
})

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

// ============================================
// 2. PAY MODE - Exact output for payments
// ============================================

import { TrailsWidget } from '@0xtrails/trails'

export function PaymentWidget() {
  return (
    <TrailsWidget
      mode="pay"
      destinationChainId={8453} // Base
      destinationTokenAddress="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC
      destinationAmount="10000000" // 10 USDC (6 decimals)
      destinationRecipient="0xYourMerchantAddress"
      onSuccess={(receipt) => {
        console.log('Payment successful:', receipt.intentId)
      }}
      onError={(error) => {
        console.error('Payment failed:', error)
      }}
    />
  )
}

// ============================================
// 3. SWAP MODE - Token exchange
// ============================================

export function SwapWidget() {
  return (
    <TrailsWidget
      mode="swap"
      destinationChainId={42161} // Arbitrum
      destinationTokenAddress="0xaf88d065e77c8cC2239327C5EDb3A432268e5831" // USDC
    />
  )
}

// ============================================
// 4. FUND MODE - Input-driven deposits
// ============================================

export function FundWidget() {
  return (
    <TrailsWidget
      mode="fund"
      destinationChainId={42161}
      destinationTokenAddress="0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
      destinationRecipient="0xVaultContractAddress"
    />
  )
}

// ============================================
// 5. FUND MODE WITH CALLDATA - Contract execution
// ============================================

import { encodeFunctionData } from 'viem'

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

// Placeholder amount - Trails replaces with actual output
const PLACEHOLDER_AMOUNT = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
)

export function VaultDepositWidget({ userAddress }: { userAddress: `0x${string}` }) {
  const calldata = encodeFunctionData({
    abi: VAULT_ABI,
    functionName: 'deposit',
    args: [PLACEHOLDER_AMOUNT, userAddress],
  })

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

// ============================================
// 6. THEMING
// ============================================

export function ThemedWidget() {
  return (
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
  )
}

// ============================================
// 7. FULL CHECKOUT EXAMPLE
// ============================================

import { useState } from 'react'
import { useAccount } from 'wagmi'

interface Product {
  id: string
  name: string
  priceUSDC: string
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
