import { type Address,formatUnits, parseUnits } from 'viem';

import {
  checkGasBalance,
  estimateApproveGas,
  estimateDepositGas,
  findStrategyForToken,
  type GasEstimate,
  getClients,
  getTokenAllowance,
  getTokenBalance,
  waitForTransaction,
} from '../clients/blockchain.js';
import { formatGasCost } from '../clients/prices.js';
import { ERC20_ABI, STRATEGY_ABI } from '../config/constants.js';
import type { GlobalOptions } from '../types/index.js';
import {
  ErrorCode,
  InsufficientBalanceError,
  MamoError,
  NoStrategyFoundError,
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
import { validateToken } from '../utils/validation.js';

export interface DepositOptions extends GlobalOptions {
  amount: string;
  token: string;
}

export interface DepositResult {
  success: boolean;
  amount: string;
  token: string;
  strategyAddress?: Address;
  txHash?: string;
  approveTxHash?: string;
  gasEstimate?: {
    approveGasUnits?: string;
    approveGasCostEth?: string;
    approveGasCostUsd?: string;
    depositGasUnits: string;
    depositGasCostEth: string;
    depositGasCostUsd: string;
    totalGasCostEth: string;
    totalGasCostUsd: string;
  };
  message: string;
}

/**
 * Deposit tokens into a yield strategy
 */
export async function depositTokens(options: DepositOptions): Promise<DepositResult> {
  const { amount: amountStr, token: tokenArg, dryRun = false } = options;

  // Validate inputs
  const token = validateToken(tokenArg);

  if (!token.address) {
    throw new MamoError(
      `Cannot deposit ETH directly. Use wrapped ETH or a different token.`,
      ErrorCode.INVALID_ARGUMENT
    );
  }

  const amount = parseUnits(amountStr, token.decimals);

  if (amount <= 0n) {
    throw new MamoError('Amount must be greater than 0', ErrorCode.INVALID_ARGUMENT);
  }

  if (!isJsonMode()) {
    header(`Deposit ${amountStr} ${token.symbol}`);
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
      `No strategy found for ${token.symbol}. Run "mamo create <strategy_type>" first.`,
      token.symbol
    );
  }

  if (!isJsonMode()) {
    info(`Strategy contract: ${strategyAddress}`);
  }

  // Check token balance
  const balance = await getTokenBalance(publicClient, token.address, address);

  if (balance < amount) {
    throw new InsufficientBalanceError(token.symbol, amount, balance);
  }

  // Check ETH for gas
  await checkGasBalance(publicClient, address);

  // Check allowance to determine if approval is needed
  const currentAllowance = await getTokenAllowance(
    publicClient,
    token.address,
    address,
    strategyAddress
  );
  const needsApproval = currentAllowance < amount;

  // Estimate gas costs
  let approveGasEstimate: GasEstimate | null = null;
  let depositGasEstimate: GasEstimate | null = null;
  let totalGasCostEth = '0';
  let totalGasCostUsd = 'N/A';

  try {
    // Estimate approval gas if needed
    if (needsApproval) {
      approveGasEstimate = await estimateApproveGas(
        publicClient,
        token.address,
        strategyAddress,
        amount,
        address
      );
    }

    // Estimate deposit gas
    depositGasEstimate = await estimateDepositGas(
      publicClient,
      strategyAddress,
      amount,
      address
    );

    // Calculate total gas cost
    const approveGasEth = approveGasEstimate ? parseFloat(approveGasEstimate.gasCostEth) : 0;
    const depositGasEth = parseFloat(depositGasEstimate.gasCostEth);
    totalGasCostEth = (approveGasEth + depositGasEth).toFixed(6);

    // Calculate total USD if available
    if (depositGasEstimate.gasCostUsd !== 'N/A') {
      const approveGasUsd = approveGasEstimate && approveGasEstimate.gasCostUsd !== 'N/A'
        ? parseFloat(approveGasEstimate.gasCostUsd.replace('$', '').replace(',', ''))
        : 0;
      const depositGasUsd = parseFloat(depositGasEstimate.gasCostUsd.replace('$', '').replace(',', ''));
      totalGasCostUsd = `$${(approveGasUsd + depositGasUsd).toFixed(2)}`;
    }

    if (!isJsonMode()) {
      log();
      log(`${Colors.bold}Gas Estimate${Colors.reset}`);
      divider();
      if (needsApproval && approveGasEstimate) {
        log(`   Approve:    ${formatGasCost(approveGasEstimate.gasCostEth, approveGasEstimate.gasCostUsd)}`);
      }
      log(`   Deposit:    ${formatGasCost(depositGasEstimate.gasCostEth, depositGasEstimate.gasCostUsd)}`);
      log(`   Total:      ${formatGasCost(totalGasCostEth, totalGasCostUsd)}`);
      divider();
    }
  } catch {
    // Gas estimation failed, continue without it
    if (!isJsonMode()) {
      log();
      log(`${Colors.dim}(Gas estimation unavailable)${Colors.reset}`);
    }
  }

  if (!isJsonMode()) {
    log();
    log(`${Colors.bold}Transaction Preview${Colors.reset}`);
    divider();
    log(`Depositing:      ${amountStr} ${token.symbol}`);
    log(`Strategy:        ${strategyAddress}`);
    log(`${token.symbol} balance:   ${formatUnits(balance, token.decimals)}`);
    log(`After deposit:   ${formatUnits(balance - amount, token.decimals)} ${token.symbol}`);
    divider();
  }

  // Build gas estimate object for result
  const gasEstimateResult = depositGasEstimate ? {
    ...(approveGasEstimate ? {
      approveGasUnits: approveGasEstimate.gasUnits.toString(),
      approveGasCostEth: approveGasEstimate.gasCostEth,
      approveGasCostUsd: approveGasEstimate.gasCostUsd,
    } : {}),
    depositGasUnits: depositGasEstimate.gasUnits.toString(),
    depositGasCostEth: depositGasEstimate.gasCostEth,
    depositGasCostUsd: depositGasEstimate.gasCostUsd,
    totalGasCostEth,
    totalGasCostUsd,
  } : undefined;

  if (dryRun) {
    // Simulate deposit
    await publicClient.simulateContract({
      address: strategyAddress,
      abi: STRATEGY_ABI,
      functionName: 'deposit',
      args: [amount],
      account,
    });

    if (isJsonMode()) {
      return {
        success: true,
        amount: amountStr,
        token: token.symbol,
        strategyAddress,
        gasEstimate: gasEstimateResult,
        message: `Dry run successful${needsApproval ? ' (approval required)' : ''}`,
      };
    }

    log();
    log(`${Colors.bold}${Colors.green}[DRY RUN] Deposit would succeed${Colors.reset}`);
    if (needsApproval) {
      log(`Note: Token approval transaction would be required first`);
    }

    return {
      success: true,
      amount: amountStr,
      token: token.symbol,
      strategyAddress,
      gasEstimate: gasEstimateResult,
      message: 'Dry run successful',
    };
  }

  let approveTxHash: string | undefined;

  // Step 1: Check allowance and approve if needed
  if (needsApproval) {
    if (!isJsonMode()) {
      log();
      log(`${Colors.bold}Step 1/2: Approving ${token.symbol}...${Colors.reset}`);
    }

    const { request: approveReq } = await publicClient.simulateContract({
      address: token.address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [strategyAddress, amount],
      account,
    });

    const approveTx = await walletClient.writeContract(approveReq);
    await waitForTransaction(publicClient, approveTx);
    approveTxHash = approveTx;

    if (!isJsonMode()) {
      success('Approved');
    }
  } else {
    if (!isJsonMode()) {
      log();
      log(`${Colors.bold}Step 1/2:${Colors.reset} Already approved`);
    }
  }

  // Step 2: Deposit
  if (!isJsonMode()) {
    log();
    log(`${Colors.bold}Step 2/2: Depositing into strategy...${Colors.reset}`);
  }

  const { request: depositReq } = await publicClient.simulateContract({
    address: strategyAddress,
    abi: STRATEGY_ABI,
    functionName: 'deposit',
    args: [amount],
    account,
  });

  const depositTx = await walletClient.writeContract(depositReq);
  await waitForTransaction(publicClient, depositTx);

  if (isJsonMode()) {
    return {
      success: true,
      amount: amountStr,
      token: token.symbol,
      strategyAddress,
      txHash: depositTx,
      approveTxHash,
      gasEstimate: gasEstimateResult,
      message: 'Deposit successful',
    };
  }

  log();
  log(`${Colors.bold}${Colors.green}Deposit Complete!${Colors.reset}`);
  divider();
  log(`Amount:    ${amountStr} ${token.symbol}`);
  baseScanLink(depositTx);
  divider();

  return {
    success: true,
    amount: amountStr,
    token: token.symbol,
    strategyAddress,
    txHash: depositTx,
    approveTxHash,
    gasEstimate: gasEstimateResult,
    message: 'Deposit successful',
  };
}

/**
 * Commander action handler for deposit command
 */
export async function depositAction(
  amount: string,
  token: string,
  options: GlobalOptions
): Promise<void> {
  try {
    const result = await depositTokens({
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
