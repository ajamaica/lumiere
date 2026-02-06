import {
  type Address,
  type Chain,
  createPublicClient,
  createWalletClient,
  type Hash,
  http,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import { type PrivateKeyAccount,privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

import {
  DEFAULT_RPC_URL,
  ERC20_ABI,
  FACTORY_ABI,
  MIN_GAS_ETH,
  REGISTRY_ABI,
  REGISTRY_ADDRESS,
  STRATEGY_ABI,
} from '../config/constants.js';
import { TOKENS } from '../config/tokens.js';
import type { StrategyDetails,TokenKey, WalletBalances } from '../types/index.js';
import { InsufficientGasError, MissingEnvVarError, TransactionFailedError } from '../utils/errors.js';
import { info } from '../utils/logger.js';
import { getLocalStrategyAddresses } from '../utils/storage.js';
import { formatUsdValue, type GasEstimate,getEthPriceUsd } from './prices.js';

// Re-export GasEstimate type
export type { GasEstimate };

/**
 * Blockchain client interface
 */
export interface BlockchainClients {
  publicClient: PublicClient<Transport, Chain>;
  walletClient: WalletClient<Transport, Chain, PrivateKeyAccount>;
  account: PrivateKeyAccount;
}

/**
 * Get the private key from environment
 */
export function getPrivateKey(): `0x${string}` {
  const key = process.env['MAMO_WALLET_KEY'];
  if (!key) {
    throw new MissingEnvVarError('MAMO_WALLET_KEY');
  }
  return (key.startsWith('0x') ? key : `0x${key}`) as `0x${string}`;
}

/**
 * Get the RPC URL from environment or use default
 */
export function getRpcUrl(): string {
  return process.env['MAMO_RPC_URL'] ?? DEFAULT_RPC_URL;
}

/**
 * Create blockchain clients (public and wallet)
 */
export function getClients(): BlockchainClients {
  const account = privateKeyToAccount(getPrivateKey());
  const transport = http(getRpcUrl());

  const publicClient = createPublicClient({
    chain: base,
    transport,
  });

  const walletClient = createWalletClient({
    chain: base,
    transport,
    account,
  });

  return {
    publicClient: publicClient as PublicClient<Transport, Chain>,
    walletClient: walletClient as WalletClient<Transport, Chain, PrivateKeyAccount>,
    account,
  };
}

/**
 * Wait for a transaction to be confirmed
 */
export async function waitForTransaction(
  publicClient: PublicClient<Transport, Chain>,
  hash: Hash,
  confirmations = 1
): Promise<{ gasUsed: bigint; blockNumber: bigint }> {
  info(`Tx: ${hash}`);
  info('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations,
  });

  if (receipt.status !== 'success') {
    throw new TransactionFailedError(hash);
  }

  return {
    gasUsed: receipt.gasUsed,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Check if wallet has sufficient ETH for gas
 */
export async function checkGasBalance(
  publicClient: PublicClient<Transport, Chain>,
  address: Address
): Promise<void> {
  const balance = await publicClient.getBalance({ address });

  if (balance < MIN_GAS_ETH) {
    throw new InsufficientGasError(balance);
  }
}

/**
 * Get all strategies for a user from both on-chain registry and local storage
 */
export async function getAllStrategies(
  publicClient: PublicClient<Transport, Chain>,
  walletAddress: Address
): Promise<Address[]> {
  const results: Address[] = [];

  // 1. Check on-chain registry
  try {
    const onChain = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'getUserStrategies',
      args: [walletAddress],
    });

    for (const addr of onChain) {
      results.push(addr);
    }
  } catch {
    // Registry may be inaccessible, continue with local storage
  }

  // 2. Merge local strategies
  const localAddresses = getLocalStrategyAddresses(walletAddress);
  for (const addr of localAddresses) {
    if (!results.some((a) => a.toLowerCase() === addr.toLowerCase())) {
      results.push(addr);
    }
  }

  return results;
}

/**
 * Find a strategy address for a specific token
 */
export async function findStrategyForToken(
  publicClient: PublicClient<Transport, Chain>,
  walletAddress: Address,
  tokenAddress: Address | null
): Promise<Address | null> {
  if (!tokenAddress) return null;

  const strategies = await getAllStrategies(publicClient, walletAddress);

  for (const addr of strategies) {
    try {
      const stratToken = await publicClient.readContract({
        address: addr,
        abi: STRATEGY_ABI,
        functionName: 'token',
      });

      if (stratToken.toLowerCase() === tokenAddress.toLowerCase()) {
        return addr;
      }
    } catch {
      // Skip non-matching or erroring strategies
    }
  }

  return null;
}

/**
 * Get wallet balances for ETH and all tokens
 */
export async function getWalletBalances(
  publicClient: PublicClient<Transport, Chain>,
  address: Address
): Promise<WalletBalances> {
  const eth = await publicClient.getBalance({ address });

  const tokens: Record<TokenKey, bigint> = {
    usdc: 0n,
    cbbtc: 0n,
    mamo: 0n,
    eth: eth,
  };

  for (const [key, token] of Object.entries(TOKENS) as Array<[TokenKey, typeof TOKENS[TokenKey]]>) {
    if (!token.address) continue;

    try {
      const balance = await publicClient.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      tokens[key] = balance;
    } catch {
      // Skip on error
    }
  }

  return { eth, tokens };
}

/**
 * Get detailed information about a strategy
 */
export async function getStrategyDetails(
  publicClient: PublicClient<Transport, Chain>,
  strategyAddress: Address
): Promise<StrategyDetails | null> {
  try {
    const tokenAddress = await publicClient.readContract({
      address: strategyAddress,
      abi: STRATEGY_ABI,
      functionName: 'token',
    });

    const [symbol, decimals, typeId, balance] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      publicClient.readContract({
        address: strategyAddress,
        abi: STRATEGY_ABI,
        functionName: 'strategyTypeId',
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [strategyAddress],
      }),
    ]);

    return {
      address: strategyAddress,
      tokenAddress,
      tokenSymbol: symbol,
      tokenDecimals: Number(decimals),
      typeId,
      balance,
    };
  } catch {
    return null;
  }
}

/**
 * Get the owner of a strategy
 */
export async function getStrategyOwner(
  publicClient: PublicClient<Transport, Chain>,
  strategyAddress: Address
): Promise<Address> {
  return publicClient.readContract({
    address: strategyAddress,
    abi: STRATEGY_ABI,
    functionName: 'owner',
  });
}

/**
 * Get ERC20 token balance
 */
export async function getTokenBalance(
  publicClient: PublicClient<Transport, Chain>,
  tokenAddress: Address,
  account: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account],
  });
}

/**
 * Get ERC20 token allowance
 */
export async function getTokenAllowance(
  publicClient: PublicClient<Transport, Chain>,
  tokenAddress: Address,
  owner: Address,
  spender: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  });
}

/**
 * Get current gas price from the network
 */
export async function getGasPrice(
  publicClient: PublicClient<Transport, Chain>
): Promise<bigint> {
  return publicClient.getGasPrice();
}

/**
 * Estimate gas for a contract call
 */
export async function estimateContractGas(
  publicClient: PublicClient<Transport, Chain>,
  params: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    account: Address;
    value?: bigint;
  }
): Promise<bigint> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return publicClient.estimateContractGas(params as any);
}

/**
 * Calculate gas estimate with ETH and USD costs
 */
export async function calculateGasEstimate(
  publicClient: PublicClient<Transport, Chain>,
  gasUnits: bigint
): Promise<GasEstimate> {
  const gasPrice = await getGasPrice(publicClient);
  const gasCostWei = gasUnits * gasPrice;

  // Convert to ETH (18 decimals)
  const gasCostEthNum = Number(gasCostWei) / 1e18;
  const gasCostEth = gasCostEthNum.toFixed(6);

  // Get ETH price and calculate USD cost
  let gasCostUsd = 'N/A';
  try {
    const ethPrice = await getEthPriceUsd();
    if (ethPrice > 0) {
      const usdCost = gasCostEthNum * ethPrice;
      gasCostUsd = formatUsdValue(usdCost);
    }
  } catch {
    // Keep as N/A if price fetch fails
  }

  return {
    gasUnits,
    gasCostWei,
    gasCostEth,
    gasCostUsd,
  };
}

/**
 * Estimate gas for strategy creation
 */
export async function estimateCreateStrategyGas(
  publicClient: PublicClient<Transport, Chain>,
  factoryAddress: Address,
  userAddress: Address
): Promise<GasEstimate> {
  const gasUnits = await estimateContractGas(publicClient, {
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'createStrategyForUser',
    args: [userAddress],
    account: userAddress,
  });

  return calculateGasEstimate(publicClient, gasUnits);
}

/**
 * Estimate gas for deposit transaction
 */
export async function estimateDepositGas(
  publicClient: PublicClient<Transport, Chain>,
  strategyAddress: Address,
  amount: bigint,
  userAddress: Address
): Promise<GasEstimate> {
  const gasUnits = await estimateContractGas(publicClient, {
    address: strategyAddress,
    abi: STRATEGY_ABI,
    functionName: 'deposit',
    args: [amount],
    account: userAddress,
  });

  return calculateGasEstimate(publicClient, gasUnits);
}

/**
 * Estimate gas for approval transaction
 */
export async function estimateApproveGas(
  publicClient: PublicClient<Transport, Chain>,
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
  userAddress: Address
): Promise<GasEstimate> {
  const gasUnits = await estimateContractGas(publicClient, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
    account: userAddress,
  });

  return calculateGasEstimate(publicClient, gasUnits);
}

/**
 * Estimate gas for withdraw transaction
 */
export async function estimateWithdrawGas(
  publicClient: PublicClient<Transport, Chain>,
  strategyAddress: Address,
  amount: bigint,
  userAddress: Address
): Promise<GasEstimate> {
  const gasUnits = await estimateContractGas(publicClient, {
    address: strategyAddress,
    abi: STRATEGY_ABI,
    functionName: 'withdraw',
    args: [amount],
    account: userAddress,
  });

  return calculateGasEstimate(publicClient, gasUnits);
}

/**
 * Estimate gas for withdrawAll transaction
 */
export async function estimateWithdrawAllGas(
  publicClient: PublicClient<Transport, Chain>,
  strategyAddress: Address,
  userAddress: Address
): Promise<GasEstimate> {
  const gasUnits = await estimateContractGas(publicClient, {
    address: strategyAddress,
    abi: STRATEGY_ABI,
    functionName: 'withdrawAll',
    args: [],
    account: userAddress,
  });

  return calculateGasEstimate(publicClient, gasUnits);
}
