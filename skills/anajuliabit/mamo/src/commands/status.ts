import { type Address,formatUnits } from 'viem';

import { fetchAccountData } from '../clients/api.js';
import {
  getAllStrategies,
  getClients,
  getStrategyDetails,
  getWalletBalances,
} from '../clients/blockchain.js';
import { TOKENS } from '../config/tokens.js';
import type { GlobalOptions, TokenKey } from '../types/index.js';
import { MamoError } from '../utils/errors.js';
import {
  Colors,
  header,
  info,
  isJsonMode,
  json,
  log,
} from '../utils/logger.js';

export interface StatusResult {
  success: boolean;
  wallet: {
    address: Address;
    balances: {
      eth: string;
      tokens: Record<string, string>;
    };
  };
  strategies: Array<{
    address: Address;
    tokenSymbol: string;
    tokenAddress: Address;
    typeId: string;
    balance: string;
  }>;
  apiData?: unknown;
  message: string;
}

/**
 * Get account status including balances and strategies
 */
export async function getStatus(_options: GlobalOptions): Promise<StatusResult> {
  if (!isJsonMode()) {
    header('Account Status');
  }

  const { publicClient, account } = getClients();
  const address = account.address;

  if (!isJsonMode()) {
    info(`Wallet: ${address}`);
  }

  // Get wallet balances
  const balances = await getWalletBalances(publicClient, address);

  // Format balances for output
  const formattedBalances: Record<string, string> = {};
  for (const [key, token] of Object.entries(TOKENS) as Array<[TokenKey, typeof TOKENS[TokenKey]]>) {
    if (key === 'eth') {
      formattedBalances[token.symbol] = formatUnits(balances.eth, token.decimals);
    } else {
      formattedBalances[token.symbol] = formatUnits(balances.tokens[key], token.decimals);
    }
  }

  if (!isJsonMode()) {
    log();
    log(`${Colors.bold}Wallet Balances${Colors.reset}`);
    log(`   ETH:   ${formatUnits(balances.eth, 18)}`);

    for (const [key, token] of Object.entries(TOKENS) as Array<[TokenKey, typeof TOKENS[TokenKey]]>) {
      if (!token.address) continue;
      const bal = balances.tokens[key];
      log(`   ${token.symbol.padEnd(6)} ${formatUnits(bal, token.decimals)}`);
    }
  }

  // Get strategies
  const strategyAddresses = await getAllStrategies(publicClient, address);
  const strategies: StatusResult['strategies'] = [];

  if (!isJsonMode()) {
    log();
    log(`${Colors.bold}Mamo Strategies${Colors.reset}`);
  }

  if (strategyAddresses.length === 0) {
    if (!isJsonMode()) {
      log(`   ${Colors.dim}No strategies found. Run "mamo create <strategy>" to get started.${Colors.reset}`);
    }
  } else {
    for (const addr of strategyAddresses) {
      const details = await getStrategyDetails(publicClient, addr);

      if (details) {
        strategies.push({
          address: details.address,
          tokenSymbol: details.tokenSymbol,
          tokenAddress: details.tokenAddress,
          typeId: details.typeId.toString(),
          balance: formatUnits(details.balance, details.tokenDecimals),
        });

        if (!isJsonMode()) {
          log();
          log(`   ${Colors.cyan}Strategy: ${addr}${Colors.reset}`);
          log(`   Token:      ${details.tokenSymbol} (${details.tokenAddress})`);
          log(`   Type ID:    ${details.typeId.toString()}`);
          log(`   Idle bal:   ${formatUnits(details.balance, details.tokenDecimals)} ${details.tokenSymbol}`);
        }
      } else {
        strategies.push({
          address: addr,
          tokenSymbol: 'unknown',
          tokenAddress: '0x0' as Address,
          typeId: '0',
          balance: '0',
        });

        if (!isJsonMode()) {
          log();
          log(`   ${Colors.yellow}Strategy: ${addr}${Colors.reset}`);
          log(`   ${Colors.dim}(could not read details)${Colors.reset}`);
        }
      }
    }
  }

  // Try to get API data
  let apiData: unknown = undefined;
  try {
    const data = await fetchAccountData(address);
    if (data) {
      apiData = data;

      if (!isJsonMode()) {
        log();
        log(`${Colors.bold}API Account Data${Colors.reset}`);
        log(JSON.stringify(data, null, 2));
      }
    }
  } catch {
    // API not available, that's ok
  }

  const result: StatusResult = {
    success: true,
    wallet: {
      address,
      balances: {
        eth: formatUnits(balances.eth, 18),
        tokens: formattedBalances,
      },
    },
    strategies,
    apiData,
    message: 'Status retrieved successfully',
  };

  return result;
}

/**
 * Commander action handler for status command
 */
export async function statusAction(options: GlobalOptions): Promise<void> {
  try {
    const result = await getStatus(options);

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
