import { type Address,formatUnits } from 'viem';

import {
  getAllStrategies,
  getClients,
  getStrategyDetails,
  getWalletBalances,
} from '../clients/blockchain.js';
import {
  calculateUsdValue,
  formatUsdValue,
  getMultipleTokenPrices,
} from '../clients/prices.js';
import { TOKENS } from '../config/tokens.js';
import type { GlobalOptions, TokenKey } from '../types/index.js';
import { MamoError } from '../utils/errors.js';
import {
  Colors,
  divider,
  header,
  info,
  isJsonMode,
  json,
  log,
} from '../utils/logger.js';

/**
 * Token holding with value
 */
export interface TokenHolding {
  symbol: string;
  balance: string;
  balanceRaw: string;
  priceUsd: number;
  valueUsd: number;
  valueUsdFormatted: string;
}

/**
 * Strategy holding with value
 */
export interface StrategyHolding {
  address: Address;
  tokenSymbol: string;
  balance: string;
  balanceRaw: string;
  priceUsd: number;
  valueUsd: number;
  valueUsdFormatted: string;
}

/**
 * Portfolio result
 */
export interface PortfolioResult {
  success: boolean;
  wallet: {
    address: Address;
    holdings: TokenHolding[];
    totalValueUsd: number;
    totalValueUsdFormatted: string;
  };
  strategies: {
    holdings: StrategyHolding[];
    totalValueUsd: number;
    totalValueUsdFormatted: string;
  };
  combined: {
    totalValueUsd: number;
    totalValueUsdFormatted: string;
  };
  pricesAvailable: boolean;
  message: string;
}

/**
 * Get portfolio overview with USD values
 */
export async function getPortfolio(_options: GlobalOptions): Promise<PortfolioResult> {
  if (!isJsonMode()) {
    header('Portfolio Overview');
  }

  const { publicClient, account } = getClients();
  const address = account.address;

  if (!isJsonMode()) {
    info(`Wallet: ${address}`);
  }

  // Get wallet balances
  const balances = await getWalletBalances(publicClient, address);

  // Get token prices
  const tokenKeys = Object.keys(TOKENS) as TokenKey[];
  const prices = await getMultipleTokenPrices(tokenKeys);

  // Check if we have any price data
  const pricesAvailable = Object.values(prices).some((p) => p > 0);

  // Calculate wallet holdings
  const walletHoldings: TokenHolding[] = [];
  let walletTotalUsd = 0;

  // ETH balance
  const ethBalance = balances.eth;
  const ethDecimals = TOKENS.eth.decimals;
  const ethPriceUsd = prices['eth'] ?? 0;
  const ethValueUsd = calculateUsdValue(ethBalance, ethDecimals, ethPriceUsd);
  walletTotalUsd += ethValueUsd;

  walletHoldings.push({
    symbol: 'ETH',
    balance: formatUnits(ethBalance, ethDecimals),
    balanceRaw: ethBalance.toString(),
    priceUsd: ethPriceUsd,
    valueUsd: ethValueUsd,
    valueUsdFormatted: formatUsdValue(ethValueUsd),
  });

  // ERC20 token balances
  for (const [key, token] of Object.entries(TOKENS) as Array<[TokenKey, typeof TOKENS[TokenKey]]>) {
    if (!token.address) continue;

    const balance = balances.tokens[key];
    const priceUsd = prices[key] ?? 0;
    const valueUsd = calculateUsdValue(balance, token.decimals, priceUsd);
    walletTotalUsd += valueUsd;

    walletHoldings.push({
      symbol: token.symbol,
      balance: formatUnits(balance, token.decimals),
      balanceRaw: balance.toString(),
      priceUsd,
      valueUsd,
      valueUsdFormatted: formatUsdValue(valueUsd),
    });
  }

  // Get strategies
  const strategyAddresses = await getAllStrategies(publicClient, address);
  const strategyHoldings: StrategyHolding[] = [];
  let strategyTotalUsd = 0;

  for (const addr of strategyAddresses) {
    const details = await getStrategyDetails(publicClient, addr);

    if (details) {
      // Find price for this token
      let priceUsd = 0;
      for (const [key, token] of Object.entries(TOKENS) as Array<[TokenKey, typeof TOKENS[TokenKey]]>) {
        if (token.address && token.address.toLowerCase() === details.tokenAddress.toLowerCase()) {
          priceUsd = prices[key] ?? 0;
          break;
        }
      }

      const valueUsd = calculateUsdValue(details.balance, details.tokenDecimals, priceUsd);
      strategyTotalUsd += valueUsd;

      strategyHoldings.push({
        address: addr,
        tokenSymbol: details.tokenSymbol,
        balance: formatUnits(details.balance, details.tokenDecimals),
        balanceRaw: details.balance.toString(),
        priceUsd,
        valueUsd,
        valueUsdFormatted: formatUsdValue(valueUsd),
      });
    }
  }

  const combinedTotalUsd = walletTotalUsd + strategyTotalUsd;

  // Output to console if not JSON mode
  if (!isJsonMode()) {
    log();

    if (!pricesAvailable) {
      log(`${Colors.yellow}[WARN] Price data unavailable. USD values shown as $0.00${Colors.reset}`);
      log();
    }

    // Wallet holdings
    log(`${Colors.bold}Wallet Holdings${Colors.reset}`);
    divider();

    for (const holding of walletHoldings) {
      if (holding.balance !== '0') {
        const balanceStr = parseFloat(holding.balance).toFixed(6);
        log(`   ${holding.symbol.padEnd(8)} ${balanceStr.padStart(18)}  ${holding.valueUsdFormatted.padStart(12)}`);
      }
    }

    log(`   ${''.padEnd(8)} ${''.padEnd(18)}  ${'-'.repeat(12)}`);
    log(`   ${'Total'.padEnd(8)} ${''.padEnd(18)}  ${formatUsdValue(walletTotalUsd).padStart(12)}`);

    log();

    // Strategy holdings
    log(`${Colors.bold}Strategy Holdings${Colors.reset}`);
    divider();

    if (strategyHoldings.length === 0) {
      log(`   ${Colors.dim}No strategies found${Colors.reset}`);
    } else {
      for (const holding of strategyHoldings) {
        const balanceStr = parseFloat(holding.balance).toFixed(6);
        log(`   ${holding.tokenSymbol.padEnd(8)} ${balanceStr.padStart(18)}  ${holding.valueUsdFormatted.padStart(12)}`);
        log(`   ${Colors.dim}${holding.address}${Colors.reset}`);
      }

      log(`   ${''.padEnd(8)} ${''.padEnd(18)}  ${'-'.repeat(12)}`);
      log(`   ${'Total'.padEnd(8)} ${''.padEnd(18)}  ${formatUsdValue(strategyTotalUsd).padStart(12)}`);
    }

    log();

    // Combined total
    log(`${Colors.bold}${Colors.green}Combined Total: ${formatUsdValue(combinedTotalUsd)}${Colors.reset}`);
    divider('=', 50);
  }

  const result: PortfolioResult = {
    success: true,
    wallet: {
      address,
      holdings: walletHoldings,
      totalValueUsd: walletTotalUsd,
      totalValueUsdFormatted: formatUsdValue(walletTotalUsd),
    },
    strategies: {
      holdings: strategyHoldings,
      totalValueUsd: strategyTotalUsd,
      totalValueUsdFormatted: formatUsdValue(strategyTotalUsd),
    },
    combined: {
      totalValueUsd: combinedTotalUsd,
      totalValueUsdFormatted: formatUsdValue(combinedTotalUsd),
    },
    pricesAvailable,
    message: 'Portfolio retrieved successfully',
  };

  return result;
}

/**
 * Commander action handler for portfolio command
 */
export async function portfolioAction(options: GlobalOptions): Promise<void> {
  try {
    const result = await getPortfolio(options);

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
