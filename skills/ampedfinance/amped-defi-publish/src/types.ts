/**
 * Common types for Amped DeFi plugin
 */

import { Static, TSchema } from '@sinclair/typebox'

/**
 * Tool handler function type
 */
export type ToolHandler<T extends TSchema> = (params: Static<T>) => Promise<unknown>

/**
 * Agent tools registry interface
 */
export interface AgentTools {
  register: <T extends TSchema>(tool: {
    name: string
    summary: string
    description?: string
    schema: T
    handler: ToolHandler<T>
  }) => void
}

/**
 * Alternative registration interface with input/output schemas
 */
export interface AgentToolsTyped {
  register<T extends TSchema, R extends TSchema>(config: {
    name: string
    summary: string
    description?: string
    schema: {
      input: T
      output?: R
    }
    handler: (input: Static<T>) => Promise<Static<R>>
  }): void
}

/**
 * Standard tool result wrapper
 */
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Transaction status
 */
export type TransactionStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'unknown'

/**
 * Intent status from SODAX
 */
export interface IntentStatus {
  intentHash: string
  status: 'pending' | 'filled' | 'cancelled' | 'expired' | 'failed'
  spokeTxHash?: string
  hubTxHash?: string
  filledAmount?: string
  error?: string
  createdAt?: number
  updatedAt?: number
}

/**
 * Quote result
 */
export interface QuoteResult {
  quoteId: string
  srcChainId: string
  dstChainId: string
  srcToken: string
  dstToken: string
  srcAmount: string
  dstAmount: string
  minDstAmount?: string
  slippageBps: number
  deadline: number
  fees: {
    solverFee?: string
    partnerFee?: string
    gasFee?: string
  }
  route?: unknown
}

/**
 * Bridge result
 */
export interface BridgeResult {
  spokeTxHash: string
  hubTxHash?: string
  status: TransactionStatus
}

/**
 * Money market position
 */
export interface MoneyMarketPosition {
  token: string
  supplied: string
  borrowed: string
  supplyApy: number
  borrowApy: number
  collateralFactor: number
}

/**
 * Money market reserve
 */
export interface MoneyMarketReserve {
  token: string
  totalSupplied: string
  totalBorrowed: string
  supplyApy: number
  borrowApy: number
  utilizationRate: number
  collateralFactor: number
  liquidationThreshold: number
}

/**
 * Chain configuration
 */
export interface ChainConfig {
  chainId: string
  name: string
  isHub: boolean
  nativeCurrency: {
    symbol: string
    decimals: number
  }
  rpcUrl?: string
}

/**
 * Token configuration
 */
export interface TokenConfig {
  address: string
  symbol: string
  name: string
  decimals: number
  chainId: string
}

/**
 * Wallet information (safe to log)
 */
export interface WalletInfo {
  walletId: string
  address: string
  mode: 'execute' | 'prepare'
  chains: string[]
}

/**
 * Operation context for logging
 */
export interface OperationContext {
  requestId: string
  agentId?: string
  walletId: string
  operation: string
  chainIds: string[]
  tokenAddresses?: string[]
  timestamp: number
}

/**
 * Bridge operation parameters
 */
export interface BridgeOperation {
  walletId: string
  srcChainId: string
  dstChainId: string
  srcToken: string
  dstToken: string
  amount: string
  recipient?: string
  timeoutMs?: number
  policyId?: string
}

/**
 * Wallet configuration
 */
export interface WalletConfig {
  address: string
  privateKey?: string
}

/**
 * Policy configuration
 */
export interface PolicyConfig {
  /** Maximum USD value for swap inputs */
  maxSwapInputUsd?: number
  /** Maximum per-token amount for swap inputs */
  maxSwapInputToken?: Record<string, number>
  /** Maximum per-token amount for bridge operations */
  maxBridgeAmountToken?: Record<string, number>
  /** Maximum USD value for borrows */
  maxBorrowUsd?: number
  /** Maximum per-token amount for borrows */
  maxBorrowToken?: Record<string, number>
  /** Allowed chain IDs for operations */
  allowedChains?: string[]
  /** Allowed tokens per chain */
  allowedTokensByChain?: Record<string, string[]>
  /** Blocked recipient addresses */
  blockedRecipients?: string[]
  /** Maximum slippage in basis points (100 = 1%) */
  maxSlippageBps?: number
  /** Whether to require transaction simulation */
  requireSimulation?: boolean
}
