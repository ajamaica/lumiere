import { existsSync, mkdirSync,readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { Address, Hash } from 'viem';

import type { AuthData,LocalStrategiesData, LocalStrategyEntry } from '../types/index.js';

/**
 * Get the Mamo configuration directory path
 * Creates the directory if it doesn't exist
 */
export function getConfigDir(): string {
  const dir = join(homedir(), '.config', 'mamo');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get the path to the auth token file
 */
export function getTokenPath(): string {
  return join(getConfigDir(), 'auth.json');
}

/**
 * Get the path to the local strategies file
 */
export function getStrategiesPath(): string {
  return join(getConfigDir(), 'strategies.json');
}

// ═══════════════════════════════════════════════════════════════
// Auth Token Storage
// ═══════════════════════════════════════════════════════════════

/**
 * Save authentication data to local storage
 */
export function saveAuthToken(data: AuthData): void {
  writeFileSync(getTokenPath(), JSON.stringify(data, null, 2));
}

/**
 * Load authentication data from local storage
 */
export function loadAuthToken(): AuthData | null {
  const path = getTokenPath();
  if (!existsSync(path)) return null;

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as AuthData;
  } catch {
    return null;
  }
}

/**
 * Check if auth token exists
 */
export function hasAuthToken(): boolean {
  return existsSync(getTokenPath());
}

// ═══════════════════════════════════════════════════════════════
// Local Strategies Storage
// ═══════════════════════════════════════════════════════════════

/**
 * Save all local strategies data
 */
export function saveLocalStrategies(data: LocalStrategiesData): void {
  writeFileSync(getStrategiesPath(), JSON.stringify(data, null, 2));
}

/**
 * Load all local strategies data
 */
export function loadLocalStrategies(): LocalStrategiesData {
  const path = getStrategiesPath();
  if (!existsSync(path)) return {};

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as LocalStrategiesData;
  } catch {
    return {};
  }
}

/**
 * Add a strategy to local storage for a wallet
 */
export function addLocalStrategy(
  walletAddress: Address,
  strategyType: string,
  strategyAddress: Address,
  txHash: Hash
): void {
  const data = loadLocalStrategies();
  const key = walletAddress.toLowerCase();

  if (!data[key]) {
    data[key] = {};
  }

  const entry: LocalStrategyEntry = {
    address: strategyAddress,
    txHash,
    createdAt: new Date().toISOString(),
  };

  data[key][strategyType] = entry;
  saveLocalStrategies(data);
}

/**
 * Get all local strategies for a wallet
 */
export function getLocalStrategiesForWallet(walletAddress: Address): Record<string, LocalStrategyEntry> {
  const data = loadLocalStrategies();
  return data[walletAddress.toLowerCase()] ?? {};
}

/**
 * Get a specific strategy for a wallet by type
 */
export function getLocalStrategy(
  walletAddress: Address,
  strategyType: string
): LocalStrategyEntry | null {
  const strategies = getLocalStrategiesForWallet(walletAddress);
  return strategies[strategyType] ?? null;
}

/**
 * Check if a wallet has a local strategy of a given type
 */
export function hasLocalStrategy(walletAddress: Address, strategyType: string): boolean {
  return getLocalStrategy(walletAddress, strategyType) !== null;
}

/**
 * Get all strategy addresses for a wallet from local storage
 */
export function getLocalStrategyAddresses(walletAddress: Address): Address[] {
  const strategies = getLocalStrategiesForWallet(walletAddress);
  return Object.values(strategies).map((entry) => entry.address);
}

/**
 * Remove a strategy from local storage
 */
export function removeLocalStrategy(walletAddress: Address, strategyType: string): boolean {
  const data = loadLocalStrategies();
  const key = walletAddress.toLowerCase();

  if (!data[key] || !data[key][strategyType]) {
    return false;
  }

  delete data[key][strategyType];

  // Clean up empty wallet entries
  if (Object.keys(data[key]).length === 0) {
    delete data[key];
  }

  saveLocalStrategies(data);
  return true;
}

/**
 * Clear all local strategies for a wallet
 */
export function clearLocalStrategies(walletAddress: Address): void {
  const data = loadLocalStrategies();
  delete data[walletAddress.toLowerCase()];
  saveLocalStrategies(data);
}
