/**
 * Dialect Markets & Positions API Types
 * Full coverage of Dialect Standard Blinks Library (SBL)
 */

// ============================================
// Protocol Definitions
// ============================================

export type ProtocolId =
  | 'kamino'
  | 'marginfi'
  | 'jupiter'
  | 'raydium'
  | 'orca'
  | 'meteora'
  | 'drift'
  | 'lulo'
  | 'save'
  | 'defituna'
  | 'deficarrot'
  | 'dflow'

export type MarketType = 'lending' | 'yield' | 'loop' | 'perpetual' | 'prediction'

export interface Provider {
  id: ProtocolId
  name: string
  icon: string
}

export interface Token {
  address: string
  symbol: string
  decimals: number
  icon?: string
  name?: string
}

// ============================================
// Rewards
// ============================================

export interface Reward {
  type: 'deposit' | 'borrow'
  apy: number
  token: Token
  marketAction?: string
}

export interface PositionReward {
  tokenAddress: string
  amount: number
  amountUsd: number
}

// ============================================
// Actions / Blinks
// ============================================

export interface BlinkAction {
  blinkUrl: string
}

export interface MarketActions {
  deposit?: BlinkAction
  withdraw?: BlinkAction
  borrow?: BlinkAction
  repay?: BlinkAction
  repayWithCollateral?: BlinkAction
  claimRewards?: BlinkAction
  setup?: BlinkAction // For loop markets
}

export interface PositionActions extends MarketActions {}

// ============================================
// Base Market Interface
// ============================================

export interface BaseMarket {
  id: string
  type: MarketType
  provider: Provider
  websiteUrl?: string
  additionalData?: Record<string, unknown>
  actions: MarketActions
}

// ============================================
// Yield Market (Kamino Lend, Jupiter Earn, Lulo, DeFiTuna, DeFiCarrot)
// ============================================

export interface YieldMarket extends BaseMarket {
  type: 'yield'
  token: Token
  productName?: string

  // APY metrics
  depositApy: number
  baseDepositApy?: number
  baseDepositApy30d?: number
  baseDepositApy90d?: number
  baseDepositApy180d?: number

  // Liquidity
  totalDeposit?: number
  totalDepositUsd?: number
  maxDeposit?: number

  // Rewards
  rewards?: Reward[]
}

// ============================================
// Lending Market (Kamino Borrow, MarginFi, Jupiter Lend Borrow)
// ============================================

export interface LendingMarket extends BaseMarket {
  type: 'lending'
  token: Token
  borrowToken?: Token // For Jupiter when collateral differs

  // Deposit APY
  depositApy: number
  baseDepositApy?: number
  baseDepositApy30d?: number
  baseDepositApy90d?: number
  baseDepositApy180d?: number

  // Borrow APY
  borrowApy: number
  baseBorrowApy?: number
  baseBorrowApy30d?: number
  baseBorrowApy90d?: number
  baseBorrowApy180d?: number

  // Liquidity
  totalDeposit?: number
  totalDepositUsd?: number
  totalBorrow?: number
  totalBorrowUsd?: number
  maxDeposit?: number
  maxBorrow?: number

  // Risk parameters
  maxLtv?: number
  liquidationLtv?: number
  liquidationPenalty?: number

  // Rewards
  rewards?: Reward[]
}

// ============================================
// Loop Market (Kamino Multiply/Leverage)
// ============================================

export interface LoopMarket extends BaseMarket {
  type: 'loop'
  tokenA: Token // Collateral
  tokenB: Token // Debt/borrow

  // APY (net after leverage & borrowing costs)
  depositApy: number

  // Leverage parameters
  maxLeverage: number
  maxLtv: number
  liquidationLtv: number
}

// ============================================
// Perpetual Market (Drift Strategy Vaults)
// ============================================

export interface PerpetualMarket extends BaseMarket {
  type: 'perpetual'
  token: Token

  depositApy?: number
  totalDeposit?: number
  totalDepositUsd?: number
}

// ============================================
// Prediction Market (DFlow)
// ============================================

export interface PredictionMarket extends BaseMarket {
  type: 'prediction'
  token?: Token

  // Market-specific data in additionalData
}

// ============================================
// Union Type
// ============================================

export type Market = YieldMarket | LendingMarket | LoopMarket | PerpetualMarket | PredictionMarket

// ============================================
// Positions
// ============================================

export interface Position {
  id: string
  type: MarketType
  marketId: string
  ownerAddress: string
  bundleId?: string
  websiteUrl?: string
  side: 'deposit' | 'borrow' | 'long' | 'short'

  // Value
  amount: number
  amountUsd: number

  // Risk (for lending/loop)
  ltv?: number
  liquidationPrice?: number

  // Rewards
  rewards?: PositionReward[]

  // Actions
  actions: PositionActions
  additionalData?: Record<string, unknown>

  // Embedded market data
  market?: Market
}

// ============================================
// API Responses
// ============================================

export interface MarketsResponse {
  markets: Market[]
}

export interface MarketsGroupedResponse {
  yield?: YieldMarket[]
  lending?: LendingMarket[]
  loop?: LoopMarket[]
  perpetual?: PerpetualMarket[]
  prediction?: PredictionMarket[]
}

export interface PositionsResponse {
  positions: Position[]
}

export interface HistoricalPositionSnapshot {
  timestamp: string
  positions: Position[]
}

export interface HistoricalPositionsResponse {
  snapshots: HistoricalPositionSnapshot[]
}

// ============================================
// Blinks Execution Types
// ============================================

export interface BlinkMetadata {
  icon?: string
  title?: string
  description?: string
  label?: string
  disabled?: boolean
  error?: {
    message: string
  }
  links?: {
    actions?: BlinkLinkAction[]
  }
}

export interface BlinkLinkAction {
  label: string
  href: string
  parameters?: BlinkParameter[]
}

export interface BlinkParameter {
  name: string
  label?: string
  required?: boolean
  type?: 'text' | 'number' | 'select'
  options?: { label: string; value: string }[]
  pattern?: string
  patternDescription?: string
  min?: number
  max?: number
}

export interface BlinkTransaction {
  transaction: string // Base64 encoded transaction
  message?: string
}

// ============================================
// CLI Output Types
// ============================================

export type OutputFormat = 'json' | 'table' | 'minimal'

export interface CLIConfig {
  rpcUrl?: string
  walletPath?: string
  format?: OutputFormat
  dialectApiUrl?: string
}

// ============================================
// Wallet Types
// ============================================

export interface WalletBalance {
  token: string
  mint: string
  balance: number
  balanceUsd?: number
  decimals: number
}

// ============================================
// Query Filters
// ============================================

export interface MarketFilter {
  type?: MarketType | MarketType[]
  provider?: ProtocolId | ProtocolId[]
  token?: string
  minApy?: number
  maxApy?: number
  minTvl?: number
}

export interface PositionFilter {
  type?: MarketType | MarketType[]
  provider?: ProtocolId | ProtocolId[]
  side?: 'deposit' | 'borrow'
}
