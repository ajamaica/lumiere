/**
 * Trails Headless SDK Integration - React/Next.js
 *
 * Build custom UIs with Trails hooks for programmatic control.
 * Requires TrailsProvider and TrailsHookModal.
 *
 * SETUP:
 * 1. Get your API key from https://dashboard.trails.build
 * 2. Install: npm install @0xtrails/trails (or pnpm/yarn)
 * 3. Set NEXT_PUBLIC_TRAILS_API_KEY in your environment variables
 */

// ============================================
// 1. PROVIDER SETUP (Required for headless)
// ============================================

'use client'

import { TrailsHookModal, TrailsProvider } from '@0xtrails/trails'
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
          {/* IMPORTANT: TrailsHookModal is REQUIRED for headless hooks */}
          <TrailsHookModal />
          {children}
        </TrailsProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// ============================================
// 2. BASIC SEND TRANSACTION
// ============================================

import { useQuote } from '@0xtrails/trails'

export function SendButton() {
  const { quote, isPending, isSuccess, isError, error } = useQuote({
    destinationChainId: 8453,
    destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    destinationAmount: '10000000', // 10 USDC
    destinationRecipient: '0xRecipientAddress',
  })

  return (
    <div>
      <button disabled={isPending || isSuccess}>
        {isPending ? 'Processing...' : isSuccess ? 'Sent!' : 'Send 10 USDC'}
      </button>
      {isSuccess && <p>Success! Intent ID: {quote?.intentId}</p>}
      {isError && <p>Error: {error?.message}</p>}
    </div>
  )
}

// ============================================
// 3. CHAIN DISCOVERY
// ============================================

import { useSupportedChains } from '@0xtrails/trails'

export function ChainSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (chainId: number) => void
}) {
  const { data: chains, isLoading, error } = useSupportedChains()

  if (isLoading) return <p>Loading chains...</p>
  if (error) return <p>Error loading chains</p>

  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {chains?.map((chain) => (
        <option key={chain.chainId} value={chain.chainId}>
          {chain.name}
        </option>
      ))}
    </select>
  )
}

// ============================================
// 4. TOKEN DISCOVERY
// ============================================

import { useSupportedTokens } from '@0xtrails/trails'

export function TokenSelector({
  chainId,
  value,
  onChange,
}: {
  chainId: number
  value: string
  onChange: (address: string) => void
}) {
  const { data: tokens, isLoading } = useSupportedTokens({ chainId })

  if (isLoading) return <p>Loading tokens...</p>

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select token</option>
      {tokens?.map((token) => (
        <option key={token.address} value={token.address}>
          {token.symbol} - {token.name}
        </option>
      ))}
    </select>
  )
}

// ============================================
// 5. FULL CUSTOM SWAP UI
// ============================================

import { useState } from 'react'
import { parseUnits } from 'viem'
import { useAccount } from 'wagmi'

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

  const { quote, isPending, isSuccess, error } = useQuote(
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
      {error && <p>Error: {error.message}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}

// ============================================
// 6. WITH CALLDATA (Vault Deposit)
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

// Placeholder for EXACT_INPUT flows
const PLACEHOLDER_AMOUNT = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
)

export function VaultDeposit({
  vaultAddress,
  userAddress,
}: {
  vaultAddress: `0x${string}`
  userAddress: `0x${string}`
}) {
  const [amount, setAmount] = useState('')

  const calldata = amount
    ? encodeFunctionData({
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [PLACEHOLDER_AMOUNT, userAddress],
      })
    : undefined

  const { quote, isPending, isSuccess } = useQuote(
    amount && calldata
      ? {
          destinationChainId: 42161,
          destinationTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          destinationRecipient: vaultAddress,
          destinationCalldata: calldata,
          sourceAmount: parseUnits(amount, 6).toString(), // USDC has 6 decimals
        }
      : null,
  )

  return (
    <div>
      <h3>Deposit to Vault</h3>
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

// ============================================
// 7. INTENT HISTORY
// ============================================

import { useIntentHistory } from '@0xtrails/trails'

export function TransactionHistory() {
  const { address } = useAccount()
  const { data: history, isLoading } = useIntentHistory({
    address: address ?? undefined,
  })

  if (!address) return <p>Connect wallet to view history</p>
  if (isLoading) return <p>Loading history...</p>

  return (
    <div>
      <h3>Transaction History</h3>
      <ul>
        {history?.intents.map((intent) => (
          <li key={intent.intentId}>
            <strong>{intent.status}</strong> — {intent.sourceAmount} {intent.sourceToken.symbol} →{' '}
            {intent.destinationAmount} {intent.destinationToken.symbol}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================
// 8. ERROR HANDLING PATTERN
// ============================================

export function RobustSendButton() {
  const { quote, isPending, isSuccess, error, refetch } = useQuote({
    destinationChainId: 8453,
    destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    destinationAmount: '10000000',
    destinationRecipient: '0xRecipientAddress',
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
