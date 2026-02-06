/**
 * Portfolio Summary Tool
 *
 * Provides a unified view of all wallet balances and positions.
 * Queries native tokens and major stablecoins via RPC, plus money market positions.
 *
 * @module tools/portfolio
 */

import { Static,Type } from '@sinclair/typebox';
import { type Address,createPublicClient, formatUnits, http, type PublicClient } from 'viem';

import { aggregateCrossChainPositions, formatHealthFactor, getHealthFactorStatus } from '../utils/positionAggregator';
import { fetchTokenPrices, getTokenPriceBySymbol } from '../utils/priceService';
import { getWalletManager } from '../wallet';
import { 
  CHAIN_IDS,
  getDefaultRpcUrl, 
  getViemChain, 
  resolveChainId,
} from '../wallet/providers/chainConfig';

// ============================================================================
// TypeBox Schema
// ============================================================================

/**
 * Schema for amped_portfolio_summary
 */
export const PortfolioSummarySchema = Type.Object({
  walletId: Type.Optional(Type.String({
    description: 'Specific wallet to query (defaults to all wallets)',
  })),
  chains: Type.Optional(Type.Array(Type.String(), {
    description: 'Specific chains to query (defaults to all supported chains)',
  })),
  includeZeroBalances: Type.Optional(Type.Boolean({
    description: 'Include tokens with zero balance',
    default: false,
  })),
});

type PortfolioSummaryParams = Static<typeof PortfolioSummarySchema>;

// ============================================================================
// Token Configuration
// ============================================================================

interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
}

/**
 * Major tokens to check on each chain
 */
const MAJOR_TOKENS: Record<number, TokenConfig[]> = {
  [CHAIN_IDS.ETHEREUM]: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
  ],
  [CHAIN_IDS.BASE]: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
  ],
  [CHAIN_IDS.ARBITRUM]: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },
  ],
  [CHAIN_IDS.OPTIMISM]: [
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6 },
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
  ],
  [CHAIN_IDS.POLYGON]: [
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6 },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
    { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18 },
  ],
  [CHAIN_IDS.BSC]: [
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18 },
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },
    { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'WETH', decimals: 18 },
  ],
  [CHAIN_IDS.AVALANCHE]: [
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', decimals: 6 },
    { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', decimals: 6 },
    { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', symbol: 'WETH', decimals: 18 },
  ],
    [CHAIN_IDS.SONIC]: [
    { address: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894', symbol: 'USDC', decimals: 6 },
  ],
  [CHAIN_IDS.LIGHTLINK]: [
    { address: '0xbCF8C1B03bBDDA88D579330BDF236B58F8bb2cFd', symbol: 'USDC', decimals: 6 },
  ],
};

/**
 * Native token symbols by chain
 */
const NATIVE_SYMBOLS: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: 'ETH',
  [CHAIN_IDS.ARBITRUM]: 'ETH',
  [CHAIN_IDS.OPTIMISM]: 'ETH',
  [CHAIN_IDS.BASE]: 'ETH',
  [CHAIN_IDS.POLYGON]: 'POL',
  [CHAIN_IDS.BSC]: 'BNB',
  [CHAIN_IDS.AVALANCHE]: 'AVAX',
  [CHAIN_IDS.SONIC]: 'S',
  [CHAIN_IDS.LIGHTLINK]: 'ETH',
  [CHAIN_IDS.HYPEREVM]: 'HYPE',
  [CHAIN_IDS.KAIA]: 'KAIA',
};

/**
 * Chain ID to name mapping
 */
const CHAIN_NAMES: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: 'Ethereum',
  [CHAIN_IDS.ARBITRUM]: 'Arbitrum',
  [CHAIN_IDS.OPTIMISM]: 'Optimism',
  [CHAIN_IDS.BASE]: 'Base',
  [CHAIN_IDS.POLYGON]: 'Polygon',
  [CHAIN_IDS.BSC]: 'BSC',
  [CHAIN_IDS.AVALANCHE]: 'Avalanche',
  [CHAIN_IDS.SONIC]: 'Sonic',
  [CHAIN_IDS.LIGHTLINK]: 'LightLink',
  [CHAIN_IDS.HYPEREVM]: 'HyperEVM',
  [CHAIN_IDS.KAIA]: 'Kaia',
};

/**
 * Chain name strings for wallet support check
 */
const CHAIN_NAME_STRINGS: Record<number, string[]> = {
  [CHAIN_IDS.ETHEREUM]: ['ethereum'],
  [CHAIN_IDS.BASE]: ['base'],
  [CHAIN_IDS.ARBITRUM]: ['arbitrum'],
  [CHAIN_IDS.OPTIMISM]: ['optimism'],
  [CHAIN_IDS.POLYGON]: ['polygon'],
  [CHAIN_IDS.BSC]: ['bsc'],
  [CHAIN_IDS.AVALANCHE]: ['avalanche', 'avax'],
  [CHAIN_IDS.SONIC]: ['sonic'],
  [CHAIN_IDS.LIGHTLINK]: ['lightlink'],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a viem public client for a chain
 */
function createClient(chainId: number): PublicClient {
  const chain = getViemChain(chainId);
  const rpcUrl = getDefaultRpcUrl(chainId);
  return createPublicClient({
    chain,
    transport: http(rpcUrl, { timeout: 10000 }),
  }) as PublicClient;
}

/**
 * Get native balance for a wallet on a chain
 */
async function getNativeBalance(
  client: PublicClient,
  address: Address,
  chainId: number
): Promise<{ symbol: string; balance: string; balanceRaw: bigint }> {
  try {
    const balance = await client.getBalance({ address });
    return {
      symbol: NATIVE_SYMBOLS[chainId] || 'ETH',
      balance: formatUnits(balance, 18),
      balanceRaw: balance,
    };
  } catch (error) {
    console.error(`[portfolio] Failed to get native balance on chain ${chainId}:`, error);
    return { symbol: NATIVE_SYMBOLS[chainId] || 'ETH', balance: '0', balanceRaw: 0n };
  }
}

/**
 * Get ERC20 token balance using eth_call directly (avoids viem type issues)
 */
async function getTokenBalance(
  rpcUrl: string,
  walletAddress: string,
  tokenAddress: string,
  decimals: number,
  symbol: string
): Promise<{ symbol: string; balance: string; balanceRaw: bigint; address: string }> {
  try {
    // balanceOf(address) selector: 0x70a08231
    const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, '0');
    const callData = `0x70a08231${paddedAddress}`;

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: tokenAddress, data: callData }, 'latest'],
        id: 1,
      }),
    });

    const json = await response.json() as { result?: string };
    const result = json.result;

    if (!result || result === '0x' || result === '0x0') {
      return { symbol, balance: '0', balanceRaw: 0n, address: tokenAddress };
    }

    const balanceRaw = BigInt(result);
    const balance = formatUnits(balanceRaw, decimals);

    return { symbol, balance, balanceRaw, address: tokenAddress };
  } catch (error) {
    console.error(`[portfolio] Failed to get ${symbol} balance:`, error);
    return { symbol, balance: '0', balanceRaw: 0n, address: tokenAddress };
  }
}

/**
 * Query all balances for a wallet on a specific chain
 */
async function getChainBalances(
  address: Address,
  chainId: number,
  includeZeroBalances: boolean
): Promise<{
  chainId: string;
  chainName: string;
  native: { symbol: string; balance: string; usdValue?: string };
  tokens: Array<{ symbol: string; balance: string; address: string; usdValue?: string }>; chainTotalUsd?: string;
}> {
  const client = createClient(chainId);
  const rpcUrl = getDefaultRpcUrl(chainId);
  const chainName = CHAIN_NAMES[chainId] || `Chain ${chainId}`;

  // Get native balance
  const native = await getNativeBalance(client, address, chainId);

  // Get token balances
  const tokenConfigs = MAJOR_TOKENS[chainId] || [];
  const tokenPromises = tokenConfigs.map((t) =>
    getTokenBalance(rpcUrl, address, t.address, t.decimals, t.symbol)
  );
  const tokenResults = await Promise.all(tokenPromises);

  // Filter zero balances if requested
  const tokens = includeZeroBalances
    ? tokenResults.map((t) => ({ symbol: t.symbol, balance: t.balance, address: t.address }))
    : tokenResults
        .filter((t) => t.balanceRaw > 0n)
        .map((t) => ({ symbol: t.symbol, balance: t.balance, address: t.address }));

  return {
    chainId: chainId.toString(),
    chainName,
    native: {
      symbol: native.symbol,
      balance: parseFloat(native.balance).toFixed(6),
    },
    tokens,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

interface WalletBalanceResult {
  wallet: {
    nickname: string;
    address: string;
    type: string;
  };
  balances: Array<{
    chainId: string;
    chainName: string;
    native: { symbol: string; balance: string; usdValue?: string };
    tokens: Array<{ symbol: string; balance: string; address: string; usdValue?: string }>;
    chainTotalUsd?: string;
  }>;
  moneyMarket?: {
    totalSupplyUsd: string;
    totalBorrowUsd: string;
    netWorthUsd: string;
    healthFactor: string;
    healthStatus: { status: string; color: string };
    /** Per-chain breakdown - CRITICAL: each chain has independent health factor */
    chainBreakdown: Array<{
      chainId: string;
      supplyUsd: string;
      borrowUsd: string;
      healthFactor: string;
      healthStatus: { status: string; color: string };
    }>;
  };
  walletTotalUsd?: string;
}

/**
 * Handle portfolio summary request
 */
export async function handlePortfolioSummary(
  params: PortfolioSummaryParams
): Promise<unknown> {
  const { walletId, chains, includeZeroBalances = false } = params;

  console.log('[portfolio:summary] Fetching portfolio summary', {
    walletId: walletId || 'all',
    chains: chains || 'all',
    includeZeroBalances,
  });

  // Fetch token prices from SODAX (cached, 1 min TTL)
  let priceMap: Awaited<ReturnType<typeof fetchTokenPrices>> | null = null;
  try {
    priceMap = await fetchTokenPrices();
  } catch (err) {
    console.warn('[portfolio] Failed to fetch prices, USD values will be unavailable:', err);
  }

  const walletManager = getWalletManager();
  const allWallets = await walletManager.listWallets();

  // Filter to specific wallet if requested
  const walletsToQuery = walletId
    ? allWallets.filter((w) => w.nickname === walletId)
    : allWallets;

  if (walletsToQuery.length === 0) {
    return {
      success: false,
      error: walletId ? `Wallet not found: ${walletId}` : 'No wallets configured',
    };
  }

  // Determine chains to query
  // Query all chains with configured tokens by default
  const defaultChains = [
    CHAIN_IDS.BASE,
    CHAIN_IDS.ETHEREUM,
    CHAIN_IDS.ARBITRUM,
    CHAIN_IDS.OPTIMISM,
    CHAIN_IDS.POLYGON,
    CHAIN_IDS.SONIC,
    CHAIN_IDS.BSC,
    CHAIN_IDS.AVALANCHE,
    CHAIN_IDS.LIGHTLINK,
  ];
  const chainIdsToQuery = chains
    ? chains.map((c) => resolveChainId(c))
    : defaultChains;

  const results: WalletBalanceResult[] = [];
  let totalValueUsd = 0;

  // Helper to get USD price for a symbol
  const getPrice = (symbol: string): number | null => {
    if (!priceMap) return null;
    const lower = symbol.toLowerCase();
    return priceMap.bySymbol.get(lower) ?? priceMap.bySymbol.get('soda' + lower) ?? null;
  };

  for (const wallet of walletsToQuery) {
    // Skip wallets without known addresses
    if (wallet.address === '0x...') {
      console.log(`[portfolio] Skipping wallet ${wallet.nickname} - address not resolved`);
      continue;
    }

    const address = wallet.address as Address;

    // Filter chains to those the wallet supports
    const supportedChains = wallet.chains || [];
    const chainsForWallet = chainIdsToQuery.filter((cid) => {
      const names = CHAIN_NAME_STRINGS[cid] || [];
      return supportedChains.length === 0 || names.some((n) => supportedChains.includes(n));
    });

    // Query balances for each chain (in parallel)
    const balancePromises = chainsForWallet.map((cid) =>
      getChainBalances(address, cid, includeZeroBalances).catch((err) => {
        console.error(`[portfolio] Failed to query chain ${cid}:`, err);
        return null;
      })
    );
    const balanceResults = (await Promise.all(balancePromises)).filter(
      (b): b is NonNullable<typeof b> => b !== null
    );

    // Filter out chains with no balances if not including zeros
    const filteredBalances = includeZeroBalances
      ? balanceResults
      : balanceResults.filter(
          (b) => parseFloat(b.native.balance) > 0 || b.tokens.length > 0
        );

    // Add USD values to balances
    let walletBalanceUsd = 0;
    const balancesWithUsd = filteredBalances.map((chainBalance) => {
      let chainTotalUsd = 0;

      // Native token USD value
      const nativePrice = getPrice(chainBalance.native.symbol);
      const nativeBalance = parseFloat(chainBalance.native.balance);
      const nativeUsdValue = nativePrice ? nativeBalance * nativePrice : null;
      if (nativeUsdValue) chainTotalUsd += nativeUsdValue;

      // Token USD values
      const tokensWithUsd = chainBalance.tokens.map((token) => {
        const price = getPrice(token.symbol);
        const balance = parseFloat(token.balance);
        const usdValue = price ? balance * price : null;
        if (usdValue) chainTotalUsd += usdValue;
        return {
          ...token,
          usdValue: usdValue ? `$${usdValue.toFixed(2)}` : undefined,
        };
      });

      walletBalanceUsd += chainTotalUsd;

      return {
        chainId: chainBalance.chainId,
        chainName: chainBalance.chainName,
        native: {
          symbol: chainBalance.native.symbol,
          balance: chainBalance.native.balance,
          usdValue: nativeUsdValue ? `$${nativeUsdValue.toFixed(2)}` : undefined,
        },
        tokens: tokensWithUsd,
        chainTotalUsd: chainTotalUsd > 0 ? `$${chainTotalUsd.toFixed(2)}` : undefined,
      };
    });

    // Query Solana balances if wallet has a Solana address
    // Bankr wallets have a separate Solana address that can be cached
    const solanaAddress = (wallet as any).solanaAddress;
    if (solanaAddress) {
      try {
        const solanaBalances = await getSolanaWalletBalances(solanaAddress, includeZeroBalances);
        if (solanaBalances) {
          // Add USD values for Solana
          let solanaTotalUsd = 0;
          const solPrice = getPrice('SOL');
          const nativeBalance = parseFloat(solanaBalances.native.balance);
          const nativeUsdValue = solPrice ? nativeBalance * solPrice : null;
          if (nativeUsdValue) solanaTotalUsd += nativeUsdValue;
          
          const tokensWithUsd = solanaBalances.tokens.map((token) => {
            const price = getPrice(token.symbol);
            const balance = parseFloat(token.balance);
            const usdValue = price ? balance * price : null;
            if (usdValue) solanaTotalUsd += usdValue;
            return { ...token, usdValue: usdValue ? `${usdValue.toFixed(2)}` : undefined };
          });
          
          walletBalanceUsd += solanaTotalUsd;
          balancesWithUsd.push({
            chainId: 'solana',
            chainName: 'Solana',
            native: {
              symbol: solanaBalances.native.symbol,
              balance: solanaBalances.native.balance,
              usdValue: nativeUsdValue ? `${nativeUsdValue.toFixed(2)}` : undefined,
            },
            tokens: tokensWithUsd,
            chainTotalUsd: solanaTotalUsd > 0 ? `${solanaTotalUsd.toFixed(2)}` : undefined,
          });
        }
      } catch (err) {
        console.error(`[portfolio] Failed to get Solana balances for ${wallet.nickname}:`, err);
      }
    }

    // Get money market positions (aggregate)
    let mmSummary: WalletBalanceResult['moneyMarket'] | undefined;
    try {
      const positions = await aggregateCrossChainPositions(wallet.nickname);
      if (positions && (positions.summary.totalSupplyUsd > 0 || positions.summary.totalBorrowUsd > 0)) {
        const hfStatus = getHealthFactorStatus(positions.summary.healthFactor);
        // Build per-chain breakdown with individual health factors
        const chainBreakdown = positions.chainSummaries.map(cs => ({
          chainId: cs.chainId,
          supplyUsd: cs.supplyUsd.toFixed(2),
          borrowUsd: cs.borrowUsd.toFixed(2),
          healthFactor: formatHealthFactor(cs.healthFactor),
          healthStatus: getHealthFactorStatus(cs.healthFactor),
        }));
        mmSummary = {
          totalSupplyUsd: positions.summary.totalSupplyUsd.toFixed(2),
          totalBorrowUsd: positions.summary.totalBorrowUsd.toFixed(2),
          netWorthUsd: positions.summary.netWorthUsd.toFixed(2),
          healthFactor: formatHealthFactor(positions.summary.healthFactor),
          healthStatus: hfStatus,
          chainBreakdown,
        };
        // MM net worth is already USD - add to wallet total
        walletBalanceUsd += positions.summary.netWorthUsd;
      }
    } catch (err) {
      console.error(`[portfolio] Failed to get MM positions for ${wallet.nickname}:`, err);
    }

    totalValueUsd += walletBalanceUsd;

    results.push({
      wallet: {
        nickname: wallet.nickname,
        address: wallet.address,
        type: wallet.type,
      },
      balances: balancesWithUsd as WalletBalanceResult['balances'],
      moneyMarket: mmSummary,
      walletTotalUsd: walletBalanceUsd > 0 ? `$${walletBalanceUsd.toFixed(2)}` : undefined,
    } as WalletBalanceResult);
  }

  // Build summary
  const summary = {
    walletCount: results.length,
    chainsQueried: chainIdsToQuery.length,
    timestamp: new Date().toISOString(),
    estimatedTotalUsd: totalValueUsd > 0 ? `$${totalValueUsd.toFixed(2)}` : 'No positions',
    priceSource: priceMap ? 'SODAX' : 'unavailable',
  };

  return {
    success: true,
    summary,
    wallets: results,
  };
}

// ============================================================================
// Solana Balance Functions
// ============================================================================

const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

/**
 * Major SPL tokens to check on Solana
 */
const SOLANA_TOKENS: Array<{ mint: string; symbol: string; decimals: number }> = [
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6 },
  { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6 },
];

/**
 * Get native SOL balance for a Solana wallet
 */
async function getSolanaBalance(
  address: string
): Promise<{ symbol: string; balance: string; balanceRaw: bigint }> {
  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });
    const json = await response.json() as { result?: { value: number } };
    const lamports = BigInt(json.result?.value || 0);
    // SOL has 9 decimals
    const balance = Number(lamports) / 1e9;
    return {
      symbol: 'SOL',
      balance: balance.toFixed(6),
      balanceRaw: lamports,
    };
  } catch (error) {
    console.error('[portfolio] Failed to get SOL balance:', error);
    return { symbol: 'SOL', balance: '0', balanceRaw: 0n };
  }
}

/**
 * Get SPL token balances for a Solana wallet
 */
async function getSolanaTokenBalances(
  address: string
): Promise<Array<{ symbol: string; balance: string; address: string }>> {
  const results: Array<{ symbol: string; balance: string; address: string }> = [];
  
  try {
    // Query all token accounts owned by this wallet
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          address,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' },
        ],
      }),
    });
    
    const json = await response.json() as {
      result?: {
        value: Array<{
          account: {
            data: {
              parsed: {
                info: {
                  mint: string;
                  tokenAmount: { uiAmount: number; decimals: number };
                };
              };
            };
          };
        }>;
      };
    };
    
    const accounts = json.result?.value || [];
    
    // Match against known tokens
    for (const tokenConfig of SOLANA_TOKENS) {
      const account = accounts.find(
        (a) => a.account.data.parsed.info.mint === tokenConfig.mint
      );
      if (account) {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        if (amount > 0) {
          results.push({
            symbol: tokenConfig.symbol,
            balance: amount.toFixed(6),
            address: tokenConfig.mint,
          });
        }
      }
    }
  } catch (error) {
    console.error('[portfolio] Failed to get Solana token balances:', error);
  }
  
  return results;
}

/**
 * Get all Solana balances for a wallet
 */
export async function getSolanaWalletBalances(
  address: string,
  includeZeroBalances: boolean = false
): Promise<{
  chainId: string;
  chainName: string;
  native: { symbol: string; balance: string; usdValue?: string };
  tokens: Array<{ symbol: string; balance: string; address: string; usdValue?: string }>;
  chainTotalUsd?: string;
} | null> {
  // Validate Solana address format (base58, 32-44 chars)
  if (!address || address.startsWith('0x') || address.length < 32 || address.length > 44) {
    return null;
  }
  
  try {
    const native = await getSolanaBalance(address);
    const tokens = await getSolanaTokenBalances(address);
    
    // Skip if no balances and not including zeros
    if (!includeZeroBalances && native.balanceRaw === 0n && tokens.length === 0) {
      return null;
    }
    
    return {
      chainId: 'solana',
      chainName: 'Solana',
      native: {
        symbol: native.symbol,
        balance: native.balance,
      },
      tokens,
    };
  } catch (error) {
    console.error('[portfolio] Failed to get Solana balances:', error);
    return null;
  }
}
