import { type Address, type Hash,parseUnits } from 'viem';

import {
  checkGasBalance,
  estimateWithdrawAllGas,
  estimateWithdrawGas,
  findStrategyForToken,
  type GasEstimate,
  getClients,
  getStrategyOwner,
  waitForTransaction,
} from '../clients/blockchain.js';
import { formatGasCost } from '../clients/prices.js';
import { STRATEGY_ABI } from '../config/constants.js';
import type { GlobalOptions } from '../types/index.js';
import {
  ErrorCode,
  MamoError,
  NoStrategyFoundError,
  NotOwnerError,
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
  success,
} from '../utils/logger.js';
import { isWithdrawAll,validateToken } from '../utils/validation.js';

export interface WithdrawOptions extends GlobalOptions {
  amount: string;
  token: string;
}

export interface WithdrawResult {
  success: boolean;
  amount: string;
  token: string;
  strategyAddress?: Address;
  txHash?: string;
  withdrawAll: boolean;
  gasEstimate?: {
    gasUnits: string;
    gasCostEth: string;
    gasCostUsd: string;
  };
  message: string;
}

/**
 * Withdraw tokens from a yield strategy
 */
export async function withdrawTokens(options: WithdrawOptions): Promise<WithdrawResult> {
  const { amount: amountStr, token: tokenArg, dryRun = false } = options;

  // Validate inputs
  const token = validateToken(tokenArg);
  const withdrawAll = isWithdrawAll(amountStr);

  if (!token.address) {
    throw new MamoError(
      `Cannot withdraw native ETH. This strategy may use wrapped ETH.`,
      ErrorCode.INVALID_ARGUMENT
    );
  }

  if (!isJsonMode()) {
    header(`Withdraw ${withdrawAll ? 'ALL' : amountStr} ${token.symbol}`);
  }

  const { publicClient, walletClient, account } = getClients();
  const address = account.address;

  if (!isJsonMode()) {
    info(`Wallet: ${address}`);
  }

  // Find the strategy for this token
  const strategyAddress = await findStrategyForToken(publicClient, address, token.address);

  if (!strategyAddress) {
    throw new NoStrategyFoundError(
      `No strategy found for ${token.symbol}.`,
      token.symbol
    );
  }

  if (!isJsonMode()) {
    info(`Strategy contract: ${strategyAddress}`);
  }

  // Verify ownership
  const owner = await getStrategyOwner(publicClient, strategyAddress);
  if (owner.toLowerCase() !== address.toLowerCase()) {
    throw new NotOwnerError(strategyAddress, owner);
  }

  // Check ETH for gas
  await checkGasBalance(publicClient, address);

  // Parse amount for gas estimation (if not withdrawAll)
  const parsedAmount = withdrawAll ? 0n : parseUnits(amountStr, token.decimals);
  if (!withdrawAll && parsedAmount <= 0n) {
    throw new MamoError('Amount must be greater than 0', ErrorCode.INVALID_ARGUMENT);
  }

  // Estimate gas cost
  let gasEstimate: GasEstimate | null = null;
  try {
    if (withdrawAll) {
      gasEstimate = await estimateWithdrawAllGas(publicClient, strategyAddress, address);
    } else {
      gasEstimate = await estimateWithdrawGas(publicClient, strategyAddress, parsedAmount, address);
    }

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

  // Build gas estimate result object
  const gasEstimateResult = gasEstimate ? {
    gasUnits: gasEstimate.gasUnits.toString(),
    gasCostEth: gasEstimate.gasCostEth,
    gasCostUsd: gasEstimate.gasCostUsd,
  } : undefined;

  if (dryRun) {
    if (withdrawAll) {
      await publicClient.simulateContract({
        address: strategyAddress,
        abi: STRATEGY_ABI,
        functionName: 'withdrawAll',
        args: [],
        account,
      });
    } else {
      await publicClient.simulateContract({
        address: strategyAddress,
        abi: STRATEGY_ABI,
        functionName: 'withdraw',
        args: [parsedAmount],
        account,
      });
    }

    if (isJsonMode()) {
      return {
        success: true,
        amount: withdrawAll ? 'all' : amountStr,
        token: token.symbol,
        strategyAddress,
        withdrawAll,
        gasEstimate: gasEstimateResult,
        message: 'Dry run successful',
      };
    }

    log();
    log(`${Colors.bold}${Colors.green}[DRY RUN] Withdrawal would succeed${Colors.reset}`);

    return {
      success: true,
      amount: withdrawAll ? 'all' : amountStr,
      token: token.symbol,
      strategyAddress,
      withdrawAll,
      gasEstimate: gasEstimateResult,
      message: 'Dry run successful',
    };
  }

  let txHash: Hash;

  if (withdrawAll) {
    if (!isJsonMode()) {
      log();
      log(`${Colors.bold}Withdrawing all ${token.symbol}...${Colors.reset}`);
    }

    const { request } = await publicClient.simulateContract({
      address: strategyAddress,
      abi: STRATEGY_ABI,
      functionName: 'withdrawAll',
      args: [],
      account,
    });

    txHash = await walletClient.writeContract(request);
    await waitForTransaction(publicClient, txHash as Hash);

    if (!isJsonMode()) {
      success(`Withdrew all ${token.symbol}`);
      baseScanLink(txHash as string);
    }
  } else {
    if (!isJsonMode()) {
      log();
      log(`${Colors.bold}Withdrawing ${amountStr} ${token.symbol}...${Colors.reset}`);
    }

    const { request } = await publicClient.simulateContract({
      address: strategyAddress,
      abi: STRATEGY_ABI,
      functionName: 'withdraw',
      args: [parsedAmount],
      account,
    });

    txHash = await walletClient.writeContract(request);
    await waitForTransaction(publicClient, txHash as Hash);

    if (!isJsonMode()) {
      success(`Withdrew ${amountStr} ${token.symbol}`);
      baseScanLink(txHash as string);
    }
  }

  if (isJsonMode()) {
    return {
      success: true,
      amount: withdrawAll ? 'all' : amountStr,
      token: token.symbol,
      strategyAddress,
      txHash,
      withdrawAll,
      gasEstimate: gasEstimateResult,
      message: 'Withdrawal successful',
    };
  }

  return {
    success: true,
    amount: withdrawAll ? 'all' : amountStr,
    token: token.symbol,
    strategyAddress,
    txHash,
    withdrawAll,
    gasEstimate: gasEstimateResult,
    message: 'Withdrawal successful',
  };
}

/**
 * Commander action handler for withdraw command
 */
export async function withdrawAction(
  amount: string,
  token: string,
  options: GlobalOptions
): Promise<void> {
  try {
    const result = await withdrawTokens({
      amount,
      token,
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
