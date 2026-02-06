/**
 * Token Resolution Utility
 * 
 * Resolves token symbols to addresses using the SODAX SDK config service.
 * Supports case-insensitive symbol lookup with caching.
 * Handles both EVM (0x) and Solana (base58) address formats.
 */

import type { Token } from '@sodax/types';

import { getSodaxClient } from '../sodax/client';
import { toSodaxChainId } from '../wallet/types';

// Cache tokens per chain to avoid repeated lookups
const tokenCache = new Map<string, Token[]>();

// Native token addresses
const EVM_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
const SOLANA_NATIVE_ADDRESS = '11111111111111111111111111111111';

// Native token configs per chain (18 decimals for all EVM chains, 9 for Solana)
const NATIVE_TOKENS: Record<string, { symbol: string; name: string; decimals: number; address: string }> = {
  sonic: { symbol: 'S', name: 'Sonic', decimals: 18, address: EVM_NATIVE_ADDRESS },
  ethereum: { symbol: 'ETH', name: 'Ether', decimals: 18, address: EVM_NATIVE_ADDRESS },
  '0xa4b1.arbitrum': { symbol: 'ETH', name: 'Ether', decimals: 18, address: EVM_NATIVE_ADDRESS },
  '0x2105.base': { symbol: 'ETH', name: 'Ether', decimals: 18, address: EVM_NATIVE_ADDRESS },
  '0xa.optimism': { symbol: 'ETH', name: 'Ether', decimals: 18, address: EVM_NATIVE_ADDRESS },
  '0x38.bsc': { symbol: 'BNB', name: 'BNB', decimals: 18, address: EVM_NATIVE_ADDRESS },
  '0x89.polygon': { symbol: 'POL', name: 'POL', decimals: 18, address: EVM_NATIVE_ADDRESS },
  '0xa86a.avax': { symbol: 'AVAX', name: 'Avalanche', decimals: 18, address: EVM_NATIVE_ADDRESS },
  hyper: { symbol: 'HYPE', name: 'Hyperliquid', decimals: 18, address: EVM_NATIVE_ADDRESS },
  lightlink: { symbol: 'ETH', name: 'Ether', decimals: 18, address: EVM_NATIVE_ADDRESS },
  solana: { symbol: 'SOL', name: 'Solana', decimals: 9, address: SOLANA_NATIVE_ADDRESS },
};

// Fallback token list for common chains when SDK config is unavailable
const FALLBACK_TOKENS: Record<string, { address: string; symbol: string; name: string; decimals: number }[]> = {
  '0x2105.base': [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: EVM_NATIVE_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18 },
  ],
  'ethereum': [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: EVM_NATIVE_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18 },
  ],
  '0xa4b1.arbitrum': [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: EVM_NATIVE_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18 },
  ],
  'sonic': [
    { address: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x6047828dc181963ba44974801FF68e538dA5eaF9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: EVM_NATIVE_ADDRESS, symbol: 'S', name: 'Sonic', decimals: 18 },
  ],
  'solana': [
    { address: SOLANA_NATIVE_ADDRESS, symbol: 'SOL', name: 'Solana', decimals: 9 },
    { address: '3rSPCLNEF7Quw4wX8S1NyKivELoyij8eYA2gJwBgt4V5', symbol: 'bnUSD', name: 'bnUSD', decimals: 9 },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
};

// Chain type detection
const SOLANA_CHAINS = new Set(['solana']);

function isSolanaChain(chainId: string): boolean {
  return SOLANA_CHAINS.has(chainId.toLowerCase());
}

/**
 * Check if an address is a native token for the given chain
 */
function isNativeToken(address: string, chainId?: string): boolean {
  const addrLower = address.toLowerCase();
  if (chainId && isSolanaChain(chainId)) {
    return addrLower === SOLANA_NATIVE_ADDRESS.toLowerCase();
  }
  return addrLower === EVM_NATIVE_ADDRESS;
}

/**
 * Get native token info for a chain
 */
function getNativeTokenInfo(chainId: string): { address: string; symbol: string; name: string; decimals: number } | null {
  const native = NATIVE_TOKENS[chainId];
  if (!native) return null;
  return { ...native };
}

/**
 * Check if a string is a valid EVM address (0x format)
 */
function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(value);
}

/**
 * Check if a string is a valid Solana address (base58 format)
 * Solana addresses are 32-44 characters, base58 encoded
 */
function isSolanaAddress(value: string): boolean {
  // Base58 charset: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  // Excludes: 0, O, I, l
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

/**
 * Check if a string is a valid token address (EVM or Solana)
 */
function isValidTokenAddress(value: string, chainId?: string): boolean {
  if (chainId && isSolanaChain(chainId)) {
    return isSolanaAddress(value);
  }
  // For EVM chains or unknown chains, check both formats
  return isEvmAddress(value) || isSolanaAddress(value);
}

/**
 * Populate the token cache for a chain from SDK config service
 * This is the canonical way to get tokens - used by both resolveToken and getTokenInfo
 */
function populateTokenCache(chainId: string): Token[] {
  // Convert to SDK chain ID format (e.g., "base" -> "0x2105.base")
  const sdkChainId = toSodaxChainId(chainId);
  let tokens = tokenCache.get(chainId);
  if (tokens) return tokens;
  
  try {
    const client = getSodaxClient();
    const configService = (client as any).config;
    
    if (configService?.getSupportedSwapTokensByChainId) {
      // Preferred method - returns readonly Token[]
      tokens = [...configService.getSupportedSwapTokensByChainId(sdkChainId)] as Token[];
    } else if (configService?.getSwapTokensByChainId) {
      tokens = configService.getSwapTokensByChainId(sdkChainId) as Token[];
    } else if (configService?.getSwapTokens) {
      const allTokens = configService.getSwapTokens();
      tokens = allTokens[sdkChainId] || [];
    } else {
      console.warn(`[tokenResolver] configService not available for chain ${chainId}`);
      tokens = [];
    }
    
    // Log what we got from SDK
    if (tokens && tokens.length > 0) {
      console.log(`[tokenResolver] Loaded ${tokens.length} tokens from SDK for ${chainId}`);
    }
  } catch (err) {
    console.error(`[tokenResolver] Failed to fetch tokens for chain ${chainId}:`, err);
    tokens = [];
  }
  
  // Use fallback tokens if SDK returned empty list
  if ((!tokens || tokens.length === 0) && FALLBACK_TOKENS[chainId] || FALLBACK_TOKENS[sdkChainId]) {
    console.log(`[tokenResolver] Using fallback token list for ${chainId}`);
    tokens = FALLBACK_TOKENS[chainId] || FALLBACK_TOKENS[sdkChainId] as unknown as Token[];
  }
  
  tokenCache.set(chainId, tokens || []);
  return tokens || [];
}

/**
 * Resolve a token symbol or address to a normalized address
 * 
 * @param chainId - The chain ID to resolve the token on
 * @param tokenInput - Token symbol (e.g., "USDC") or address
 * @returns The token address (lowercase for EVM, original case for Solana)
 * @throws Error if token symbol is not found on the chain
 */
export async function resolveToken(
  chainId: string,
  tokenInput: string
): Promise<string> {
  // If already a valid address, normalize and return
  if (isValidTokenAddress(tokenInput, chainId)) {
    // EVM addresses are lowercased, Solana addresses preserve case
    return isEvmAddress(tokenInput) ? tokenInput.toLowerCase() : tokenInput;
  }

  // Get tokens from cache or SDK
  const tokens = populateTokenCache(chainId);

  // Find by symbol (case-insensitive)
  const symbolUpper = tokenInput.toUpperCase();
  const token = tokens.find(t => t.symbol.toUpperCase() === symbolUpper);
  
  if (!token) {
    // Build helpful error message with available tokens
    const available = tokens.length > 0 
      ? tokens.map(t => t.symbol).join(', ')
      : 'No tokens loaded';
    throw new Error(
      `Unknown token "${tokenInput}" on chain ${chainId}. ` +
      `Available: ${available}. ` +
      `Alternatively, provide the token address directly.`
    );
  }

  return isEvmAddress(token.address) ? token.address.toLowerCase() : token.address;
}

/**
 * Resolve multiple tokens at once (for efficiency)
 * 
 * @param chainId - The chain ID
 * @param tokenInputs - Array of token symbols or addresses
 * @returns Array of resolved addresses
 */
export async function resolveTokens(
  chainId: string,
  tokenInputs: string[]
): Promise<string[]> {
  return Promise.all(tokenInputs.map(t => resolveToken(chainId, t)));
}

/**
 * Get token info by symbol or address
 * Returns null if not found
 */
export async function getTokenInfo(
  chainId: string,
  tokenInput: string
): Promise<Token | null> {
  const sdkChainId = toSodaxChainId(chainId);
  // Handle native tokens first
  if (isValidTokenAddress(tokenInput, chainId) && isNativeToken(tokenInput, chainId)) {
    const nativeInfo = getNativeTokenInfo(chainId);
    if (nativeInfo) {
      return nativeInfo as unknown as Token;
    }
  }

  // Get tokens from cache or SDK (same path as resolveToken)
  const tokens = populateTokenCache(chainId);

  // Find by address or symbol
  if (isValidTokenAddress(tokenInput, chainId)) {
    // Normalize address for comparison
    const addrNorm = isEvmAddress(tokenInput) ? tokenInput.toLowerCase() : tokenInput;
    const found = tokens.find(t => {
      const tokenAddr = isEvmAddress(t.address) ? t.address.toLowerCase() : t.address;
      return tokenAddr === addrNorm;
    });
    if (found) {
      return found;
    }
    // Check fallback tokens even if SDK tokens were loaded
    const fallback = FALLBACK_TOKENS[chainId] || FALLBACK_TOKENS[sdkChainId];
    if (fallback) {
      const fallbackToken = fallback.find(t => {
        const tokenAddr = isEvmAddress(t.address) ? t.address.toLowerCase() : t.address;
        return tokenAddr === addrNorm;
      });
      if (fallbackToken) {
        console.log(`[tokenResolver] Found ${fallbackToken.symbol} in fallback for ${chainId}`);
        return fallbackToken as unknown as Token;
      }
    }
    return null;
  } else {
    const symbolUpper = tokenInput.toUpperCase();
    return tokens.find(t => t.symbol.toUpperCase() === symbolUpper) || null;
  }
}

/**
 * Clear the token cache (useful for testing or after config refresh)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Get all cached tokens for a chain
 */
export function getCachedTokens(chainId: string): Token[] | undefined {
  return tokenCache.get(chainId);
}

// Export address validation utilities for use by other modules
export { isEvmAddress, isSolanaAddress, isSolanaChain,isValidTokenAddress };
