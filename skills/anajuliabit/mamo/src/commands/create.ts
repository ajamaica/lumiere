import type { Address } from 'viem';

import {
  checkGasBalance,
  estimateCreateStrategyGas,
  type GasEstimate,
  getAllStrategies,
  getClients,
  waitForTransaction,
} from '../clients/blockchain.js';
import { formatGasCost } from '../clients/prices.js';
import { FACTORY_ABI, STRATEGY_ABI } from '../config/constants.js';
import { getStrategy } from '../config/strategies.js';
import { TOKENS } from '../config/tokens.js';
import type { GlobalOptions } from '../types/index.js';
import {
  ErrorCode,
  MamoError,
} from '../utils/errors.js';
import {
  baseScanLink,
  Colors,
  divider,
  header,
  info,
  isJsonMode,
  json,
  log,
  warn,
} from '../utils/logger.js';
import { addLocalStrategy, getStrategiesPath } from '../utils/storage.js';
import { validateStrategyType } from '../utils/validation.js';

export interface CreateOptions extends GlobalOptions {
  strategyType: string;
}

export interface CreateResult {
  success: boolean;
  strategyType: string;
  strategyAddress?: Address;
  txHash?: string;
  gasUsed?: string;
  gasEstimate?: {
    gasUnits: string;
    gasCostEth: string;
    gasCostUsd: string;
  };
  message: string;
}

/**
 * Create a new yield strategy on-chain
 */
export async function createStrategy(options: CreateOptions): Promise<CreateResult> {
  const { strategyType, dryRun = false } = options;

  // Validate strategy type
  validateStrategyType(strategyType);
  const strategy = getStrategy(strategyType);

  if (!strategy.factory) {
    throw new MamoError(
      `Strategy "${strategyType}" does not have a factory contract configured yet.`,
      ErrorCode.INVALID_ARGUMENT
    );
  }

  if (!isJsonMode()) {
    header(`Create Strategy: ${strategy.label}`);
  }

  const { publicClient, walletClient, account } = getClients();
  const address = account.address;

  if (!isJsonMode()) {
    info(`Wallet: ${address}`);
    info(`Factory: ${strategy.factory}`);
  }

  // Check if user already has this strategy type
  const existingStrategies = await getAllStrategies(publicClient, address);
  const token = TOKENS[strategy.token];

  for (const stratAddr of existingStrategies) {
    try {
      const stratToken = await publicClient.readContract({
        address: stratAddr,
        abi: STRATEGY_ABI,
        functionName: 'token',
      });

      if (token.address && stratToken.toLowerCase() === token.address.toLowerCase()) {
        if (isJsonMode()) {
          return {
            success: false,
            strategyType,
            strategyAddress: stratAddr,
            message: `Strategy already exists at ${stratAddr}`,
          };
        }

        warn(`You already have a ${strategy.label} strategy at ${stratAddr}`);
        warn('Skipping creation. Use "mamo deposit" to add funds.');

        return {
          success: false,
          strategyType,
          strategyAddress: stratAddr,
          message: `Strategy already exists`,
        };
      }
    } catch {
      // Skip unreadable strategies
    }
  }

  // Check ETH balance for gas
  await checkGasBalance(publicClient, address);

  // Estimate gas cost
  let gasEstimate: GasEstimate | null = null;
  try {
    gasEstimate = await estimateCreateStrategyGas(publicClient, strategy.factory, address);
    if (!isJsonMode()) {
      log();
      log(`${Colors.bold}Gas Estimate${Colors.reset}`);
      divider();
      log(`   Gas units:  ${gasEstimate.gasUnits.toString()}`);
      log(`   Cost:       ${formatGasCost(gasEstimate.gasCostEth, gasEstimate.gasCostUsd)}`);
      divider();
    }
  } catch {
    // Gas estimation failed, continue without it
    if (!isJsonMode()) {
      log();
      log(`${Colors.dim}(Gas estimation unavailable)${Colors.reset}`);
    }
  }

  if (dryRun) {
    if (!isJsonMode()) {
      info('Simulating createStrategyForUser...');
    }

    const { result } = await publicClient.simulateContract({
      address: strategy.factory,
      abi: FACTORY_ABI,
      functionName: 'createStrategyForUser',
      args: [address],
      account,
    });

    if (isJsonMode()) {
      return {
        success: true,
        strategyType,
        strategyAddress: result,
        gasEstimate: gasEstimate ? {
          gasUnits: gasEstimate.gasUnits.toString(),
          gasCostEth: gasEstimate.gasCostEth,
          gasCostUsd: gasEstimate.gasCostUsd,
        } : undefined,
        message: 'Dry run successful - strategy would be created at this address',
      };
    }

    log();
    log(`${Colors.bold}${Colors.green}[DRY RUN] Strategy would be created${Colors.reset}`);
    divider();
    log(`Type:      ${strategy.label}`);
    log(`Address:   ${result}`);
    log(`Owner:     ${address}`);
    divider();

    return {
      success: true,
      strategyType,
      strategyAddress: result,
      gasEstimate: gasEstimate ? {
        gasUnits: gasEstimate.gasUnits.toString(),
        gasCostEth: gasEstimate.gasCostEth,
        gasCostUsd: gasEstimate.gasCostUsd,
      } : undefined,
      message: 'Dry run successful',
    };
  }

  // Execute the transaction
  if (!isJsonMode()) {
    info('Simulating createStrategyForUser...');
  }

  const { result, request } = await publicClient.simulateContract({
    address: strategy.factory,
    abi: FACTORY_ABI,
    functionName: 'createStrategyForUser',
    args: [address],
    account,
  });

  if (!isJsonMode()) {
    info(`Strategy will deploy at: ${result}`);
    info('Sending transaction...');
  }

  const hash = await walletClient.writeContract(request);
  const receipt = await waitForTransaction(publicClient, hash);

  // Save locally (registry may not be updated due to access control)
  addLocalStrategy(address, strategyType, result, hash);

  if (isJsonMode()) {
    return {
      success: true,
      strategyType,
      strategyAddress: result,
      txHash: hash,
      gasUsed: receipt.gasUsed.toString(),
      gasEstimate: gasEstimate ? {
        gasUnits: gasEstimate.gasUnits.toString(),
        gasCostEth: gasEstimate.gasCostEth,
        gasCostUsd: gasEstimate.gasCostUsd,
      } : undefined,
      message: 'Strategy created successfully',
    };
  }

  log();
  log(`${Colors.bold}${Colors.green}Strategy Created!${Colors.reset}`);
  divider('=', 50);
  log(`Type:      ${strategy.label}`);
  log(`Address:   ${result}`);
  log(`Owner:     ${address}`);
  log(`Gas used:  ${receipt.gasUsed.toString()}`);
  baseScanLink(hash);
  divider('=', 50);
  log(`${Colors.dim}Strategy saved to ${getStrategiesPath()}${Colors.reset}`);

  return {
    success: true,
    strategyType,
    strategyAddress: result,
    txHash: hash,
    gasUsed: receipt.gasUsed.toString(),
    gasEstimate: gasEstimate ? {
      gasUnits: gasEstimate.gasUnits.toString(),
      gasCostEth: gasEstimate.gasCostEth,
      gasCostUsd: gasEstimate.gasCostUsd,
    } : undefined,
    message: 'Strategy created successfully',
  };
}

/**
 * Commander action handler for create command
 */
export async function createAction(
  strategyType: string,
  options: GlobalOptions
): Promise<void> {
  try {
    const result = await createStrategy({
      strategyType,
      ...options,
    });

    if (isJsonMode()) {
      json(result);
    }

    if (!result.success) {
      process.exit(1);
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
