/**
 * Spoke Provider Factory
 *
 * Creates spoke providers for SODAX operations.
 * Supports both local key signing and Bankr API execution.
 * 
 * Flow:
 * 1. Resolve wallet by nickname using WalletManager
 * 2. Check if wallet supports requested chain
 * 3. For local wallets: use SDK's EvmWalletProvider
 * 4. For Bankr wallets: use BankrWalletProvider (submits to Bankr API)
 */

// Official SDK wallet provider
// Import spoke providers and chain config from SDK
import { 
  EvmSpokeProvider, 
  SonicSpokeProvider,
  type SpokeProvider 
} from '@sodax/sdk';
// Import chain configuration from types
import { spokeChainConfig, type SpokeChainId } from '@sodax/types';
import { EvmWalletProvider } from '@sodax/wallet-sdk-core';

// Import wallet management
import { createBankrWalletProvider,getWalletManager, type IWalletBackend } from '../wallet';
import { getWalletAdapter } from '../wallet/skillWalletAdapter';
import { BANKR_CHAIN_IDS, getBankrChainId,normalizeChainId } from '../wallet/types';

// Cache for providers: Map<cacheKey, SpokeProvider>
const providerCache = new Map<string, SpokeProvider>();

// Sonic hub chain identifier
const SONIC_CHAIN_ID = 'sonic';

// Chain ID mapping for SDK (some chains need specific format)
const CHAIN_ID_MAP: Record<string, SpokeChainId> = {
  'sonic': 'sonic',
  'ethereum': 'ethereum',
  'arbitrum': '0xa4b1.arbitrum',
  'optimism': '0xa.optimism',
  'base': '0x2105.base',
  'polygon': '0x89.polygon',
  'bsc': '0x38.bsc',
  'avalanche': '0xa86a.avax',
  'lightlink': 'lightlink',
  'hyperevm': 'hyper',
  'hyper': 'hyper',
} as Record<string, SpokeChainId>;

/**
 * Get RPC URL for a chain
 */
async function getRpcUrl(chainId: string): Promise<string> {
  const skillAdapter = getWalletAdapter();
  return skillAdapter.getRpcUrl(chainId);
}

/**
 * Get the SDK chain ID for a given chain
 */
function getSdkChainId(chainId: string): SpokeChainId {
  return (CHAIN_ID_MAP[chainId] || chainId) as SpokeChainId;
}

/**
 * Validate that wallet supports the requested chain
 */
function validateChainSupport(wallet: IWalletBackend, chainId: string): void {
  const normalizedForWallet = normalizeChainId(chainId);
  if (!wallet.supportsChain(normalizedForWallet)) {
    throw new Error(
      `Wallet "${wallet.nickname}" doesn't support chain "${chainId}". ` +
      `Supported chains: ${wallet.supportedChains.join(', ')}. ` +
      `Try a different wallet.`
    );
  }
}

/**
 * Create a spoke provider for local key signing
 */
async function createLocalSpokeProvider(
  wallet: IWalletBackend,
  chainId: string,
  rpcUrl: string
): Promise<SpokeProvider> {
  if (!wallet.getPrivateKey) {
    throw new Error(`Wallet "${wallet.nickname}" does not support local signing`);
  }

  const privateKey = await wallet.getPrivateKey();
  const sdkChainId = getSdkChainId(chainId);

  // Get chain config from SDK
  const chainConfig = spokeChainConfig[sdkChainId];
  if (!chainConfig) {
    throw new Error(`Chain config not found for: ${sdkChainId}. Available: ${Object.keys(spokeChainConfig).join(', ')}`);
  }

  // Create wallet provider using official SDK
  const walletProvider = new EvmWalletProvider({
    privateKey,
    chainId: sdkChainId,
    rpcUrl: rpcUrl as `http${string}`,
  });

  // Use SonicSpokeProvider for Sonic hub chain, EvmSpokeProvider for others
  if (chainId === SONIC_CHAIN_ID) {
    console.log('[spokeProviderFactory] Creating SonicSpokeProvider', {
      wallet: wallet.nickname,
      chainId,
    });

    return new SonicSpokeProvider(
      walletProvider,
      chainConfig as any,
      rpcUrl
    );
  } else {
    console.log('[spokeProviderFactory] Creating EvmSpokeProvider', {
      wallet: wallet.nickname,
      chainId,
      sdkChainId,
    });

    return new EvmSpokeProvider(
      walletProvider,
      chainConfig as any,
      rpcUrl
    );
  }
}

/**
 * Create a spoke provider for Bankr wallet
 * Uses BankrWalletProvider which submits transactions to Bankr API
 */
async function createBankrSpokeProvider(
  wallet: IWalletBackend,
  chainId: string,
  rpcUrl: string
): Promise<SpokeProvider> {
  const sdkChainId = getSdkChainId(chainId);
  
  // Normalize chain ID for Bankr lookup (0x2105.base -> base)
  const normalizedChainId = normalizeChainId(chainId);
  const numericChainId = getBankrChainId(normalizedChainId);
  
  console.log('[spokeProviderFactory] Bankr chain resolution', {
    input: chainId,
    normalized: normalizedChainId,
    numeric: numericChainId,
  });

  // Get chain config from SDK
  const chainConfig = spokeChainConfig[sdkChainId];
  if (!chainConfig) {
    throw new Error(`Chain config not found for: ${sdkChainId}`);
  }

  // Get Bankr API key from environment
  const apiKey = process.env.BANKR_API_KEY;
  if (!apiKey) {
    throw new Error('BANKR_API_KEY environment variable not set');
  }

  // Get the Bankr wallet address (cached after first call)
  const walletAddress = await wallet.getAddress();

  // Create BankrWalletProvider which implements IEvmWalletProvider
  const walletProvider = createBankrWalletProvider({
    apiKey,
    apiUrl: process.env.BANKR_API_URL,
    chainId: numericChainId,
    rpcUrl,
    cachedAddress: walletAddress,
  });

  console.log('[spokeProviderFactory] Creating EvmSpokeProvider with Bankr backend', {
    wallet: wallet.nickname,
    chainId,
    sdkChainId,
    address: walletAddress?.slice(0, 10) + '...',
  });

  // Use standard EvmSpokeProvider with our BankrWalletProvider
  // The SDK doesn't care how transactions are signed - it just calls the interface methods
  return new EvmSpokeProvider(
    walletProvider as any, // BankrWalletProvider implements IEvmWalletProvider
    chainConfig as any,
    rpcUrl
  );
}

/**
 * Create a spoke provider for the given wallet and chain
 * 
 * @param walletId - Wallet nickname (e.g., "main", "bankr", "trading")
 * @param chainId - Chain identifier (e.g., "ethereum", "base")
 */
async function createSpokeProvider(
  walletId: string,
  chainId: string
): Promise<SpokeProvider> {
  // Get wallet from unified manager
  const walletManager = getWalletManager();
  const wallet = await walletManager.resolve(walletId);
  
  // Validate chain support
  validateChainSupport(wallet, chainId);

  const rpcUrl = await getRpcUrl(chainId);

  // Route based on wallet type
  if (wallet.type === 'bankr') {
    // Use BankrWalletProvider for Bankr wallets
    return createBankrSpokeProvider(wallet, chainId, rpcUrl);
  }

  // Local key signing (evm-wallet-skill or env)
  return createLocalSpokeProvider(wallet, chainId, rpcUrl);
}

/**
 * Get a spoke provider for the given wallet and chain
 * Returns cached provider if available, otherwise creates a new one
 *
 * @param walletId - The wallet identifier/nickname
 * @param chainId - The chain identifier
 * @param raw - If true, still creates full provider (raw mode not yet supported)
 * @returns The spoke provider instance
 */
export async function getSpokeProvider(
  walletId: string,
  chainId: string,
  raw = false
): Promise<SpokeProvider> {
  const cacheKey = `${walletId}:${chainId}`;

  // Check cache
  const cached = providerCache.get(cacheKey);
  if (cached) {
    console.log('[spokeProviderFactory] Using cached provider', {
      walletId,
      chainId,
    });
    return cached;
  }

  // Create new provider
  const provider = await createSpokeProvider(walletId, chainId);

  // Cache the provider
  providerCache.set(cacheKey, provider);

  return provider;
}

/**
 * Clear the provider cache
 * Useful for testing or when wallet configuration changes
 */
export function clearProviderCache(): void {
  providerCache.clear();
  console.log('[spokeProviderFactory] Provider cache cleared');
}

/**
 * Get cache statistics
 * @returns Object with cache size and keys
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: providerCache.size,
    keys: Array.from(providerCache.keys()),
  };
}

// Export the type for use in other modules
export type { SpokeProvider };
