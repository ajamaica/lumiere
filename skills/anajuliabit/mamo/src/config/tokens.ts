import type { Address } from 'viem';

import type { ResolvedToken,TokenKey, TokensConfig } from '../types/index.js';
import { ErrorCode,MamoError } from '../utils/errors.js';

export const TOKENS: TokensConfig = {
  usdc: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    decimals: 6,
    symbol: 'USDC',
  },
  cbbtc: {
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as Address,
    decimals: 8,
    symbol: 'cbBTC',
  },
  mamo: {
    address: '0x7300b37dfdfab110d83290a29dfb31b1740219fe' as Address,
    decimals: 18,
    symbol: 'MAMO',
  },
  eth: {
    address: null,
    decimals: 18,
    symbol: 'ETH',
  },
};

/**
 * Get list of available token symbols
 */
export function getAvailableTokens(): string[] {
  return Object.values(TOKENS).map((t) => t.symbol);
}

/**
 * Resolve a token argument to its configuration
 * Accepts token key (e.g., "usdc") or symbol (e.g., "USDC")
 */
export function resolveToken(tokenArg: string): ResolvedToken {
  const key = tokenArg.toLowerCase() as TokenKey;

  // Direct key match
  if (key in TOKENS) {
    const token = TOKENS[key];
    return { key, ...token };
  }

  // Try matching by symbol (case-insensitive)
  for (const [k, v] of Object.entries(TOKENS)) {
    if (v.symbol.toLowerCase() === key) {
      return { key: k, ...v };
    }
  }

  throw new MamoError(
    `Unknown token: ${tokenArg}. Available: ${getAvailableTokens().join(', ')}`,
    ErrorCode.UNKNOWN_TOKEN
  );
}

/**
 * Check if a token key is valid
 */
export function isValidTokenKey(key: string): key is TokenKey {
  return key in TOKENS;
}
