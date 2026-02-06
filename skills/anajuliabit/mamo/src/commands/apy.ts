import { fetchApy } from '../clients/api.js';
import { getAvailableStrategies, isValidStrategyKey,STRATEGIES } from '../config/strategies.js';
import type { ApyResponse, GlobalOptions, StrategyKey } from '../types/index.js';
import { ApiError,MamoError } from '../utils/errors.js';
import {
  Colors,
  header,
  isJsonMode,
  json,
  log,
  warn,
} from '../utils/logger.js';

export interface ApyResult {
  success: boolean;
  strategies: Array<{
    key: string;
    label: string;
    apy?: ApyResponse;
    error?: string;
  }>;
  message: string;
}

/**
 * Format APY value for display
 */
function formatApy(value: number): string {
  return value.toFixed(2);
}

/**
 * Get APY information for strategies
 */
export async function getApy(
  strategyType: string | undefined,
  _options: GlobalOptions
): Promise<ApyResult> {
  if (!isJsonMode()) {
    header('Current APY Rates');
  }

  // Determine which strategies to check
  const types: string[] = strategyType
    ? [strategyType]
    : getAvailableStrategies();

  const results: ApyResult['strategies'] = [];

  for (const st of types) {
    if (!isValidStrategyKey(st)) {
      if (!isJsonMode()) {
        warn(`Unknown strategy: ${st}`);
      }
      results.push({
        key: st,
        label: st,
        error: 'Unknown strategy',
      });
      continue;
    }

    const strategy = STRATEGIES[st as StrategyKey];

    try {
      const data = await fetchApy(st);

      if (!data) {
        results.push({
          key: st,
          label: strategy.label,
          error: 'No APY data available',
        });

        if (!isJsonMode()) {
          log(`   ${Colors.yellow}${strategy.label}:${Colors.reset} ${Colors.dim}(no data available)${Colors.reset}`);
        }
        continue;
      }

      results.push({
        key: st,
        label: strategy.label,
        apy: data,
      });

      if (!isJsonMode()) {
        log();
        log(`   ${Colors.bold}${strategy.label}${Colors.reset}`);

        if (typeof data === 'object' && data !== null) {
          if (data.totalApy !== undefined) {
            log(`   Total APY:   ${Colors.green}${Colors.bold}${formatApy(data.totalApy)}%${Colors.reset}`);

            if (data.baseApy !== undefined) {
              log(`   Base APY:    ${formatApy(data.baseApy)}%`);
            }

            if (data.rewardsApy !== undefined) {
              log(`   Rewards APY: ${formatApy(data.rewardsApy)}%`);
            }

            if (Array.isArray(data.rewards)) {
              for (const reward of data.rewards) {
                if (reward.symbol && reward.apr !== undefined) {
                  log(`   ${Colors.dim}  - ${reward.symbol}: ${formatApy(reward.apr)}%${Colors.reset}`);
                }
              }
            }
          } else {
            log(`   ${JSON.stringify(data, null, 2)}`);
          }
        } else {
          log(`   APY: ${Colors.green}${data}${Colors.reset}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? `API error ${error.statusCode}: ${error.message}`
        : error instanceof Error
        ? error.message
        : 'Unknown error';

      results.push({
        key: st,
        label: strategy.label,
        error: errorMessage,
      });

      if (!isJsonMode()) {
        log(`   ${Colors.yellow}${strategy.label}:${Colors.reset} ${Colors.dim}(${errorMessage})${Colors.reset}`);
      }
    }
  }

  return {
    success: true,
    strategies: results,
    message: 'APY rates retrieved',
  };
}

/**
 * Commander action handler for apy command
 */
export async function apyAction(
  strategyType: string | undefined,
  options: GlobalOptions
): Promise<void> {
  try {
    const result = await getApy(strategyType, options);

    if (isJsonMode()) {
      json(result);
    }
  } catch (error) {
    if (error instanceof MamoError) {
      if (isJsonMode()) {
        json({ success: false, error: error.toJSON() });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
    process.exit(1);
  }
}
