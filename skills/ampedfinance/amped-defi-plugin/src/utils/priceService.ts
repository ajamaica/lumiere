/**
 * Price Service - Fetches USD prices from SODAX reserves
 *
 * Uses the money market reserve data to get accurate USD prices
 * for tokens supported by the protocol.
 *
 * @module utils/priceService
 */

import { getSodaxClient } from '../sodax/client'

// ============================================================================
// Types
// ============================================================================

export interface TokenPrice {
  symbol: string
  priceUsd: number
  underlyingAsset: string
}

export interface PriceMap {
  /** Map of symbol (lowercase) to USD price */
  bySymbol: Map<string, number>
  /** Map of address (lowercase) to USD price */
  byAddress: Map<string, number>
  /** Last update timestamp */
  timestamp: number
}

// ============================================================================
// Cache
// ============================================================================

let cachedPrices: PriceMap | null = null
const CACHE_TTL_MS = 60_000 // 1 minute cache

// ============================================================================
// Price Fetching
// ============================================================================

/**
 * Fetch token prices from SODAX money market reserves
 *
 * The reserves contain `priceInMarketReferenceCurrency` which represents
 * the price in 8 decimal USD (100000000 = $1.00)
 */
export async function fetchTokenPrices(): Promise<PriceMap> {
  // Return cached if fresh
  if (cachedPrices && Date.now() - cachedPrices.timestamp < CACHE_TTL_MS) {
    return cachedPrices
  }

  console.log('[priceService] Fetching token prices from SODAX reserves')

  const sodax = await getSodaxClient()
  const reserves = await sodax.moneyMarket.data.getReservesHumanized()

  const bySymbol = new Map<string, number>()
  const byAddress = new Map<string, number>()

  // Market reference currency decimals (typically 8)
  const PRICE_DECIMALS = 8

  for (const reserve of reserves.reservesData) {
    // priceInMarketReferenceCurrency is a string representing the raw value
    const priceRaw = BigInt(reserve.priceInMarketReferenceCurrency)
    const priceUsd = Number(priceRaw) / Math.pow(10, PRICE_DECIMALS)

    // Use symbol for matching (e.g., "sodaUSDC" -> "USDC")
    const symbol = reserve.symbol.toLowerCase()
    const normalizedSymbol = normalizeSymbol(reserve.symbol)
    const address = reserve.underlyingAsset.toLowerCase()

    bySymbol.set(symbol, priceUsd)
    bySymbol.set(normalizedSymbol, priceUsd)
    byAddress.set(address, priceUsd)

    console.log(`[priceService] ${reserve.symbol}: $${priceUsd.toFixed(4)}`)
  }

  cachedPrices = {
    bySymbol,
    byAddress,
    timestamp: Date.now(),
  }

  console.log(`[priceService] Cached ${bySymbol.size} token prices`)

  return cachedPrices
}

/**
 * Normalize SODAX symbol to standard symbol
 * e.g., "sodaUSDC" -> "usdc", "sodaETH" -> "eth"
 */
function normalizeSymbol(symbol: string): string {
  const lower = symbol.toLowerCase()
  if (lower.startsWith('soda')) {
    return lower.slice(4) // Remove 'soda' prefix
  }
  return lower
}

/**
 * Get USD price for a token by symbol
 */
export async function getTokenPriceBySymbol(symbol: string): Promise<number | null> {
  const prices = await fetchTokenPrices()
  const normalizedSymbol = symbol.toLowerCase()

  // Try exact match first
  if (prices.bySymbol.has(normalizedSymbol)) {
    return prices.bySymbol.get(normalizedSymbol)!
  }

  // Try with 'soda' prefix
  const sodaSymbol = 'soda' + normalizedSymbol
  if (prices.bySymbol.has(sodaSymbol)) {
    return prices.bySymbol.get(sodaSymbol)!
  }

  return null
}

/**
 * Get USD price for a token by address
 */
export async function getTokenPriceByAddress(address: string): Promise<number | null> {
  const prices = await fetchTokenPrices()
  return prices.byAddress.get(address.toLowerCase()) ?? null
}

/**
 * Calculate USD value for a token amount
 */
export async function calculateUsdValue(
  symbol: string,
  amount: string | number,
): Promise<number | null> {
  const price = await getTokenPriceBySymbol(symbol)
  if (price === null) return null

  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount
  return amountNum * price
}

/**
 * Clear the price cache (useful for testing)
 */
export function clearPriceCache(): void {
  cachedPrices = null
}
