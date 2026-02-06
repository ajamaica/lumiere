import type { Address, Hash, Hex } from 'viem'

// ═══════════════════════════════════════════════════════════════
// Token Types
// ═══════════════════════════════════════════════════════════════

export interface TokenConfig {
  address: Address | null
  decimals: number
  symbol: string
}

export interface ResolvedToken extends TokenConfig {
  key: string
}

export type TokenKey = 'usdc' | 'cbbtc' | 'mamo' | 'eth'

export type TokensConfig = Record<TokenKey, TokenConfig>

// ═══════════════════════════════════════════════════════════════
// Strategy Types
// ═══════════════════════════════════════════════════════════════

export interface StrategyConfig {
  token: TokenKey
  label: string
  factory: Address | null
}

export type StrategyKey = 'usdc_stablecoin' | 'cbbtc_lending' | 'mamo_staking' | 'eth_lending'

export type StrategiesConfig = Record<StrategyKey, StrategyConfig>

export interface LocalStrategyEntry {
  address: Address
  txHash: Hash
  createdAt: string
}

export type LocalStrategiesData = Record<string, Record<string, LocalStrategyEntry>>

// ═══════════════════════════════════════════════════════════════
// API Types
// ═══════════════════════════════════════════════════════════════

export interface ApyReward {
  symbol: string
  apr: number
}

export interface ApyResponse {
  totalApy?: number
  baseApy?: number
  rewardsApy?: number
  rewards?: ApyReward[]
}

export interface AccountData {
  address: Address
  strategies?: Address[]
  [key: string]: unknown
}

// ═══════════════════════════════════════════════════════════════
// Auth Types
// ═══════════════════════════════════════════════════════════════

export interface AuthData {
  address: Address
  signature: Hex
  message: string
  timestamp: string
  apiResponse?: unknown
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// CLI Types
// ═══════════════════════════════════════════════════════════════

export interface GlobalOptions {
  dryRun?: boolean
  json?: boolean
}

export interface CommandResult {
  success: boolean
  message: string
  data?: unknown
}

// ═══════════════════════════════════════════════════════════════
// Blockchain Types
// ═══════════════════════════════════════════════════════════════

export interface TransactionResult {
  hash: Hash
  gasUsed: bigint
  blockNumber: bigint
}

export interface StrategyDetails {
  address: Address
  tokenAddress: Address
  tokenSymbol: string
  tokenDecimals: number
  typeId: bigint
  balance: bigint
}

export interface WalletBalances {
  eth: bigint
  tokens: Record<TokenKey, bigint>
}

// ═══════════════════════════════════════════════════════════════
// Error Types
// ═══════════════════════════════════════════════════════════════

export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  MISSING_ENV_VAR = 'MISSING_ENV_VAR',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  NO_STRATEGY_FOUND = 'NO_STRATEGY_FOUND',
  STRATEGY_EXISTS = 'STRATEGY_EXISTS',
  NOT_OWNER = 'NOT_OWNER',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  API_ERROR = 'API_ERROR',
  UNKNOWN_TOKEN = 'UNKNOWN_TOKEN',
  UNKNOWN_STRATEGY = 'UNKNOWN_STRATEGY',
}
