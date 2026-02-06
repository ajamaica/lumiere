import type { Address } from 'viem';
import { isAddress, parseUnits } from 'viem';

import { isValidStrategyKey } from '../config/strategies.js';
import { resolveToken } from '../config/tokens.js';
import type { ResolvedToken } from '../types/index.js';
import { InvalidArgumentError } from './errors.js';

/**
 * Validate that a value is a valid Ethereum address
 */
export function validateAddress(value: string, fieldName = 'address'): Address {
  if (!value) {
    throw new InvalidArgumentError(`${fieldName} is required`);
  }

  if (!isAddress(value)) {
    throw new InvalidArgumentError(`Invalid ${fieldName}: ${value}`);
  }

  return value as Address;
}

/**
 * Validate and parse an amount string to bigint
 */
export function validateAmount(
  amountStr: string,
  decimals: number,
  fieldName = 'amount'
): bigint {
  if (!amountStr) {
    throw new InvalidArgumentError(`${fieldName} is required`);
  }

  // Handle "all" case
  if (amountStr.toLowerCase() === 'all') {
    return BigInt(-1); // Sentinel value for "all"
  }

  try {
    const amount = parseUnits(amountStr, decimals);

    if (amount <= 0n) {
      throw new InvalidArgumentError(`${fieldName} must be greater than 0`);
    }

    return amount;
  } catch (error) {
    if (error instanceof InvalidArgumentError) throw error;
    throw new InvalidArgumentError(`Invalid ${fieldName}: ${amountStr}`);
  }
}

/**
 * Check if amount string represents "all"
 */
export function isWithdrawAll(amountStr: string): boolean {
  return amountStr.toLowerCase() === 'all';
}

/**
 * Validate a token argument and return resolved token config
 */
export function validateToken(tokenArg: string): ResolvedToken {
  if (!tokenArg) {
    throw new InvalidArgumentError('Token is required');
  }

  return resolveToken(tokenArg);
}

/**
 * Validate a strategy type argument
 */
export function validateStrategyType(strategyType: string): string {
  if (!strategyType) {
    throw new InvalidArgumentError('Strategy type is required');
  }

  if (!isValidStrategyKey(strategyType)) {
    throw new InvalidArgumentError(
      `Unknown strategy: ${strategyType}. Use --help to see available strategies.`
    );
  }

  return strategyType;
}

/**
 * Validate that a private key is properly formatted
 */
export function validatePrivateKey(key: string): `0x${string}` {
  if (!key) {
    throw new InvalidArgumentError('Private key is required');
  }

  const normalizedKey = key.startsWith('0x') ? key : `0x${key}`;

  // Basic validation: should be 66 characters (0x + 64 hex chars)
  if (!/^0x[a-fA-F0-9]{64}$/.test(normalizedKey)) {
    throw new InvalidArgumentError('Invalid private key format');
  }

  return normalizedKey as `0x${string}`;
}

/**
 * Validate RPC URL format
 */
export function validateRpcUrl(url: string): string {
  if (!url) {
    throw new InvalidArgumentError('RPC URL is required');
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return url;
  } catch {
    throw new InvalidArgumentError(`Invalid RPC URL: ${url}`);
  }
}

/**
 * Ensure a string is not empty
 */
export function requireNonEmpty(value: string | undefined, fieldName: string): string {
  if (!value || value.trim() === '') {
    throw new InvalidArgumentError(`${fieldName} is required`);
  }
  return value.trim();
}
