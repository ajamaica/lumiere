import { ApiError } from '../utils/errors.js'

/**
 * CoinGecko API base URL (free tier)
 */
const COINGECKO_API = 'https://api.coingecko.com/api/v3'

/**
 * Token ID mappings for CoinGecko
 */
export const COINGECKO_IDS: Record<string, string> = {
  eth: 'ethereum',
  usdc: 'usd-coin',
  cbbtc: 'coinbase-wrapped-btc',
  mamo: 'mamo', // May not exist on CoinGecko, will handle gracefully
}

/**
 * Price data for a token
 */
export interface TokenPrice {
  usd: number
  usd_24h_change?: number
}

/**
 * Price response from CoinGecko
 */
export interface PriceResponse {
  [tokenId: string]: TokenPrice
}

/**
 * Gas price data
 */
export interface GasPriceData {
  gasPrice: bigint
  ethPrice: number
}

/**
 * Estimated gas cost
 */
export interface GasEstimate {
  gasUnits: bigint
  gasCostWei: bigint
  gasCostEth: string
  gasCostUsd: string
}

/**
 * Cache for price data to avoid rate limiting
 */
interface PriceCache {
  data: PriceResponse
  timestamp: number
}

let priceCache: PriceCache | null = null
const CACHE_TTL_MS = 60_000 // 1 minute cache

/**
 * Fetch token prices from CoinGecko
 * Uses caching to avoid rate limits on free tier
 */
export async function fetchTokenPrices(
  tokenIds: string[] = Object.values(COINGECKO_IDS),
): Promise<PriceResponse> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS) {
    return priceCache.data
  }

  const ids = tokenIds.join(',')
  const endpoint = `/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`

  try {
    const response = await fetch(`${COINGECKO_API}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - return cached data if available
        if (priceCache) {
          return priceCache.data
        }
        throw new ApiError(endpoint, 'Rate limited by CoinGecko API', 429)
      }
      throw new ApiError(endpoint, `CoinGecko API error: ${response.status}`, response.status)
    }

    const data = (await response.json()) as PriceResponse

    // Update cache
    priceCache = {
      data,
      timestamp: Date.now(),
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) throw error

    // On network error, return cached data if available
    if (priceCache) {
      return priceCache.data
    }

    throw new ApiError(endpoint, error instanceof Error ? error.message : 'Failed to fetch prices')
  }
}

/**
 * Get the USD price for a specific token
 * Returns 0 if price is not available (graceful degradation)
 */
export async function getTokenPriceUsd(tokenKey: string): Promise<number> {
  const geckoId = COINGECKO_IDS[tokenKey.toLowerCase()]
  if (!geckoId) {
    return 0
  }

  try {
    const prices = await fetchTokenPrices()
    return prices[geckoId]?.usd ?? 0
  } catch {
    return 0
  }
}

/**
 * Get ETH price in USD
 */
export async function getEthPriceUsd(): Promise<number> {
  return getTokenPriceUsd('eth')
}

/**
 * Get prices for multiple tokens at once
 * Returns a map of token key to USD price
 */
export async function getMultipleTokenPrices(tokenKeys: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}

  try {
    const prices = await fetchTokenPrices()

    for (const key of tokenKeys) {
      const geckoId = COINGECKO_IDS[key.toLowerCase()]
      if (geckoId && prices[geckoId]) {
        result[key] = prices[geckoId].usd
      } else {
        result[key] = 0
      }
    }
  } catch {
    // Return zeros on error
    for (const key of tokenKeys) {
      result[key] = 0
    }
  }

  return result
}

/**
 * Calculate USD value from token amount and decimals
 */
export function calculateUsdValue(amount: bigint, decimals: number, priceUsd: number): number {
  if (amount === 0n || priceUsd === 0) {
    return 0
  }

  // Convert to number with proper decimal handling
  const divisor = 10 ** decimals
  const tokenAmount = Number(amount) / divisor
  return tokenAmount * priceUsd
}

/**
 * Format USD value for display
 */
export function formatUsdValue(value: number): string {
  if (value === 0) {
    return '$0.00'
  }

  if (value < 0.01) {
    return '<$0.01'
  }

  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Format gas cost with ETH and USD values
 */
export function formatGasCost(gasCostEth: string, gasCostUsd: string): string {
  return `${gasCostEth} ETH (~${gasCostUsd})`
}

/**
 * Clear the price cache (useful for testing)
 */
export function clearPriceCache(): void {
  priceCache = null
}
