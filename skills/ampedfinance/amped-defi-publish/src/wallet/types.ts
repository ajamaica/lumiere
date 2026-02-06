/**
 * Wallet Types - Multi-source wallet management
 *
 * Supports:
 * - evm-wallet-skill (local key from ~/.evm-wallet.json)
 * - Bankr (API-based, limited chains)
 * - Environment variables (AMPED_OC_WALLETS_JSON)
 */

import type { Address, Hash } from 'viem'

/**
 * Supported wallet backend types
 */
export type WalletBackendType = 'evm-wallet-skill' | 'bankr' | 'env'

/**
 * Raw transaction for Bankr submission
 */
export interface RawTransaction {
  to: Address
  data: `0x${string}`
  value: string // Wei as string
  chainId: number
}

/**
 * Wallet info returned by list operations
 */
export interface WalletInfo {
  nickname: string
  type: WalletBackendType
  address: Address
  chains: string[]
  isDefault: boolean
  /** Solana address (if wallet has one, e.g., Bankr) */
  solanaAddress?: string
}

/**
 * Wallet backend interface
 * Different implementations for different sources
 */
export interface IWalletBackend {
  readonly type: WalletBackendType
  readonly nickname: string
  readonly supportedChains: readonly string[]

  /**
   * Get the wallet address
   */
  getAddress(): Promise<Address>

  /**
   * Check if this wallet supports a specific chain
   */
  supportsChain(chainId: string): boolean

  /**
   * Get private key (for local/env wallets)
   * Returns undefined for Bankr (no local key access)
   */
  getPrivateKey?(): Promise<`0x${string}`>

  /**
   * Send raw transaction via Bankr API
   * Only available for Bankr backend
   */
  sendRawTransaction?(tx: RawTransaction): Promise<Hash>

  /**
   * Check if backend is ready/configured
   */
  isReady(): Promise<boolean>
}

/**
 * Wallet configuration from wallets.json
 */
export interface WalletConfig {
  source: WalletBackendType

  // For evm-wallet-skill
  path?: string

  // For Bankr
  apiKey?: string
  apiUrl?: string

  // For env
  envVar?: string
  address?: Address
  privateKey?: `0x${string}`

  // Chain restrictions (optional)
  chains?: string[]
}

/**
 * Wallets config file structure
 */
export interface WalletsConfigFile {
  wallets: Record<string, WalletConfig>
  default?: string
}

/**
 * Chain IDs for Bankr submission
 */
export const BANKR_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  base: 8453,
  unichain: 130,
}

/**
 * Chains supported by Bankr
 */
export const BANKR_SUPPORTED_CHAINS = ['ethereum', 'polygon', 'base'] as const

/**
 * All SODAX-supported EVM chains
 * NOTE: Keep in sync with SODAX SDK supported chains
 * Non-EVM chains (solana, sui, stellar, injective) are excluded
 */
export const SODAX_SUPPORTED_CHAINS = [
  'ethereum',
  'base',
  'polygon',
  'arbitrum',
  'optimism',
  'sonic',
  'avalanche',
  'bsc',
  'lightlink',
  'hyper',
  'kaia',
] as const

/**
 * SODAX to simple chain ID mapping
 * SODAX uses prefixed format: 0x2105.base, 0x89.polygon
 * Simple format: base, polygon, ethereum
 */
export const SODAX_TO_SIMPLE_CHAIN: Record<string, string> = {
  // SODAX format -> simple
  '0x2105.base': 'base',
  '0x89.polygon': 'polygon',
  '0xa4b1.arbitrum': 'arbitrum',
  '0xa.optimism': 'optimism',
  '0x38.bsc': 'bsc',
  '0xa86a.avax': 'avalanche',
  '0x2019.kaia': 'kaia',
  // These don't have prefixes in SODAX
  ethereum: 'ethereum',
  sonic: 'sonic',
  lightlink: 'lightlink',
  hyper: 'hyperevm',
  kaia: 'kaia',
}

/**
 * Simple to SODAX chain ID mapping
 */
export const SIMPLE_TO_SODAX_CHAIN: Record<string, string> = {
  // Simple -> SODAX format
  base: '0x2105.base',
  polygon: '0x89.polygon',
  arbitrum: '0xa4b1.arbitrum',
  optimism: '0xa.optimism',
  bsc: '0x38.bsc',
  avalanche: '0xa86a.avax',
  kaia: '0x2019.kaia',
  // No prefix needed
  ethereum: 'ethereum',
  sonic: 'sonic',
  lightlink: 'lightlink',
  hyperevm: 'hyper',
  hyper: 'hyper',
}

/**
 * Normalize chain ID to simple format (base, polygon, ethereum)
 * Handles both SODAX prefixed format and simple format
 */
export function normalizeChainId(chainId: string): string {
  // Already in mapping
  if (SODAX_TO_SIMPLE_CHAIN[chainId]) {
    return SODAX_TO_SIMPLE_CHAIN[chainId]
  }

  // Check if it's already simple format
  if (SIMPLE_TO_SODAX_CHAIN[chainId]) {
    return chainId
  }

  // Try to extract from prefixed format (0xNNN.name -> name)
  const match = chainId.match(/^0x[a-fA-F0-9]+\.(.+)$/)
  if (match) {
    return match[1]
  }

  // Return as-is
  return chainId
}

/**
 * Convert simple chain ID to SODAX format
 */
export function toSodaxChainId(chainId: string): string {
  // Already in SODAX format
  if (chainId.startsWith('0x') && chainId.includes('.')) {
    return chainId
  }

  return SIMPLE_TO_SODAX_CHAIN[chainId] || chainId
}

/**
 * Check if two chain IDs refer to the same chain
 * Handles format differences between SODAX and simple
 */
export function isSameChain(chainId1: string, chainId2: string): boolean {
  return normalizeChainId(chainId1) === normalizeChainId(chainId2)
}

/**
 * Check if a chain is supported by Bankr
 * Handles both SODAX and simple chain ID formats
 */
export function isBankrSupportedChain(chainId: string): boolean {
  const normalized = normalizeChainId(chainId)
  return BANKR_SUPPORTED_CHAINS.includes(normalized as any)
}

/**
 * Get numeric chain ID for Bankr
 * Handles both SODAX and simple chain ID formats
 */
export function getBankrChainId(chainId: string): number {
  const normalized = normalizeChainId(chainId)
  const id = BANKR_CHAIN_IDS[normalized]
  if (!id) {
    throw new Error(
      `Chain ${chainId} (normalized: ${normalized}) not supported by Bankr. Supported: ${BANKR_SUPPORTED_CHAINS.join(', ')}`,
    )
  }
  return id
}
