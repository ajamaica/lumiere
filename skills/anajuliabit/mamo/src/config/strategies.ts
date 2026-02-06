import type { Address } from 'viem';

import type { StrategiesConfig, StrategyConfig,StrategyKey } from '../types/index.js';
import { ErrorCode,MamoError } from '../utils/errors.js';

export const STRATEGIES: StrategiesConfig = {
  usdc_stablecoin: {
    token: 'usdc',
    label: 'USDC Stablecoin',
    factory: '0x5967ea71cC65d610dc6999d7dF62bfa512e62D07' as Address,
  },
  cbbtc_lending: {
    token: 'cbbtc',
    label: 'cbBTC Lending',
    factory: '0xE23c8E37F256Ba5783351CBb7B6673FE68248712' as Address,
  },
  mamo_staking: {
    token: 'mamo',
    label: 'MAMO Staking',
    factory: null, // Uses MamoStakingStrategyFactory
  },
  eth_lending: {
    token: 'eth',
    label: 'ETH Lending',
    factory: '0x14bA47Ef0286B345E2B74d26243767268290eE28' as Address,
  },
};

/**
 * Get list of available strategy keys
 */
export function getAvailableStrategies(): string[] {
  return Object.keys(STRATEGIES);
}

/**
 * Get strategy configuration by key
 */
export function getStrategy(strategyKey: string): StrategyConfig {
  if (!isValidStrategyKey(strategyKey)) {
    throw new MamoError(
      `Unknown strategy: ${strategyKey}. Available: ${getAvailableStrategies().join(', ')}`,
      ErrorCode.UNKNOWN_STRATEGY
    );
  }

  return STRATEGIES[strategyKey];
}

/**
 * Check if a strategy key is valid
 */
export function isValidStrategyKey(key: string): key is StrategyKey {
  return key in STRATEGIES;
}

/**
 * Get all strategies with their labels for display
 */
export function getStrategiesForDisplay(): Array<{ key: string; label: string; token: string }> {
  return Object.entries(STRATEGIES).map(([key, config]) => ({
    key,
    label: config.label,
    token: config.token,
  }));
}
