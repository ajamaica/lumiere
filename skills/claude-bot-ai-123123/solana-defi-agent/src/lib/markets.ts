/**
 * Dialect Markets API Client
 * Fetch market data and blink URLs from Dialect's Standard Blinks Library
 *
 * Docs: https://docs.dialect.to/markets
 *
 * The Markets API aggregates data from multiple DeFi protocols and provides
 * ready-to-use blink URLs for actions like deposit, withdraw, etc.
 */

import type { Market, MarketType, Position, ProtocolId, YieldMarket } from '../types/index.js'

// Base URL for the Dialect Markets API
// Note: The exact base URL needs to be confirmed from the Dialect docs
const MARKETS_API_BASE = 'https://api.dialect.to/v1'

/**
 * Market data from the Dialect API
 */
export interface DialectMarket {
  id: string
  type: MarketType
  productName?: string
  provider: {
    id: string
    name: string
    icon: string
  }
  token: {
    address: string
    symbol: string
    decimals: number
    icon: string
  }
  borrowToken?: {
    address: string
    symbol: string
    decimals: number
    icon: string
  }
  websiteUrl: string
  depositApy: number
  baseDepositApy: number
  baseDepositApy30d?: number
  baseDepositApy90d?: number
  baseDepositApy180d?: number
  borrowApy?: number
  baseBorrowApy?: number
  totalDeposit: number
  totalDepositUsd: number
  totalBorrow?: number
  totalBorrowUsd?: number
  maxDeposit?: number
  maxBorrow?: number
  rewards?: Array<{
    type: string
    apy: number
    token: {
      address: string
      symbol: string
      decimals: number
      icon: string
    }
    marketAction: string
  }>
  maxLtv?: number
  liquidationLtv?: number
  liquidationPenalty?: number
  additionalData?: Record<string, unknown>
  actions: {
    deposit?: { blinkUrl: string }
    withdraw?: { blinkUrl: string }
    borrow?: { blinkUrl: string }
    repay?: { blinkUrl: string }
    claimRewards?: { blinkUrl: string }
  }
}

/**
 * Position data from the Dialect API
 */
export interface DialectPosition {
  id: string
  marketId: string
  market: DialectMarket
  walletAddress: string
  depositedAmount: number
  depositedAmountUsd: number
  borrowedAmount?: number
  borrowedAmountUsd?: number
  healthFactor?: number
  accumulatedYield?: number
  accumulatedYieldUsd?: number
  rewards?: Array<{
    token: {
      address: string
      symbol: string
    }
    amount: number
    amountUsd: number
  }>
}

export interface MarketsResponse {
  markets: DialectMarket[]
}

export interface PositionsResponse {
  positions: DialectPosition[]
}

/**
 * Markets API Client
 */
export class MarketsClient {
  private baseUrl: string
  private timeout: number

  constructor(options?: { baseUrl?: string; timeout?: number }) {
    this.baseUrl = options?.baseUrl || MARKETS_API_BASE
    this.timeout = options?.timeout || 30000
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SolanaBlinksSDK/1.0',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Markets API error: ${response.status} ${response.statusText}`)
      }

      return response.json() as Promise<T>
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * List all markets
   */
  async listMarkets(options?: {
    provider?: ProtocolId
    type?: MarketType
    token?: string
    limit?: number
  }): Promise<DialectMarket[]> {
    const params: Record<string, string> = {}
    if (options?.provider) params.provider = options.provider
    if (options?.type) params.type = options.type
    if (options?.token) params.token = options.token
    if (options?.limit) params.limit = String(options.limit)

    const response = await this.fetch<MarketsResponse>('/markets', params)
    return response.markets
  }

  /**
   * List markets grouped by type
   */
  async listMarketsGrouped(): Promise<Record<MarketType, DialectMarket[]>> {
    const response = await this.fetch<{ groups: Record<MarketType, DialectMarket[]> }>(
      '/markets/grouped',
    )
    return response.groups
  }

  /**
   * Get positions for a wallet address
   */
  async getPositions(
    walletAddress: string,
    options?: {
      provider?: ProtocolId
      type?: MarketType
    },
  ): Promise<DialectPosition[]> {
    const params: Record<string, string> = { wallet: walletAddress }
    if (options?.provider) params.provider = options.provider
    if (options?.type) params.type = options.type

    const response = await this.fetch<PositionsResponse>('/positions', params)
    return response.positions
  }

  /**
   * Get historical position snapshots
   */
  async getPositionHistory(
    walletAddress: string,
    options?: {
      startDate?: string
      endDate?: string
      provider?: ProtocolId
    },
  ): Promise<DialectPosition[]> {
    const params: Record<string, string> = { wallet: walletAddress }
    if (options?.startDate) params.startDate = options.startDate
    if (options?.endDate) params.endDate = options.endDate
    if (options?.provider) params.provider = options.provider

    const response = await this.fetch<PositionsResponse>('/positions/history', params)
    return response.positions
  }

  /**
   * Find the best yield markets for a token
   */
  async findBestYield(
    tokenSymbol: string,
    options?: {
      minApy?: number
      minTvl?: number
      providers?: ProtocolId[]
    },
  ): Promise<DialectMarket[]> {
    const markets = await this.listMarkets({
      token: tokenSymbol,
      type: 'yield',
    })

    return markets
      .filter((m) => {
        if (options?.minApy && m.depositApy < options.minApy) return false
        if (options?.minTvl && m.totalDepositUsd < options.minTvl) return false
        if (options?.providers && !options.providers.includes(m.provider.id as ProtocolId))
          return false
        return true
      })
      .sort((a, b) => b.depositApy - a.depositApy)
  }

  /**
   * Get blink URL for a market action
   */
  getBlinkUrl(
    market: DialectMarket,
    action: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'claimRewards',
  ): string | null {
    const actionData = market.actions[action]
    if (!actionData) return null

    // Remove the 'blink:' prefix if present
    const blinkUrl = actionData.blinkUrl
    if (blinkUrl.startsWith('blink:')) {
      return blinkUrl.slice(6)
    }
    return blinkUrl
  }

  /**
   * Convert Dialect market to our internal YieldMarket type
   */
  toInternalMarket(market: DialectMarket): YieldMarket {
    return {
      id: market.id,
      type: 'yield',
      provider: {
        id: market.provider.id as ProtocolId,
        name: market.provider.name,
        icon: market.provider.icon,
      },
      token: {
        address: market.token.address,
        symbol: market.token.symbol,
        decimals: market.token.decimals,
        icon: market.token.icon,
      },
      websiteUrl: market.websiteUrl,
      depositApy: market.depositApy,
      baseDepositApy: market.baseDepositApy,
      baseDepositApy30d: market.baseDepositApy30d,
      baseDepositApy90d: market.baseDepositApy90d,
      baseDepositApy180d: market.baseDepositApy180d,
      totalDeposit: market.totalDeposit,
      totalDepositUsd: market.totalDepositUsd,
      maxDeposit: market.maxDeposit,
      rewards: market.rewards?.map((r) => ({
        type: r.type as 'deposit' | 'borrow',
        apy: r.apy,
        token: {
          address: r.token.address,
          symbol: r.token.symbol,
          decimals: r.token.decimals,
          icon: r.token.icon,
        },
        marketAction: r.marketAction,
      })),
      actions: {
        deposit: market.actions.deposit,
        withdraw: market.actions.withdraw,
        claimRewards: market.actions.claimRewards,
      },
    }
  }
}

/**
 * Create a MarketsClient instance
 */
export function createMarketsClient(options?: {
  baseUrl?: string
  timeout?: number
}): MarketsClient {
  return new MarketsClient(options)
}

// Convenience functions

/**
 * Get all markets
 */
export async function getMarkets(options?: {
  provider?: ProtocolId
  type?: MarketType
  token?: string
}): Promise<DialectMarket[]> {
  const client = createMarketsClient()
  return client.listMarkets(options)
}

/**
 * Get positions for a wallet
 */
export async function getPositions(walletAddress: string): Promise<DialectPosition[]> {
  const client = createMarketsClient()
  return client.getPositions(walletAddress)
}

/**
 * Find best yield for a token
 */
export async function findBestYield(tokenSymbol: string): Promise<DialectMarket[]> {
  const client = createMarketsClient()
  return client.findBestYield(tokenSymbol)
}

export default MarketsClient
