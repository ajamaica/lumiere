/**
 * Chain Configuration for Amped Wallet Provider
 *
 * Complete chain configuration for all SODAX-supported EVM chains.
 * 
 * Note: We maintain our own chain definitions to avoid viem version
 * mismatches with @sodax/wallet-sdk-core. The SDK's getEvmViemChain()
 * is used as a fallback for future chain additions.
 */

import { type Chain,defineChain } from 'viem';
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  lightlinkPhoenix,
  mainnet,
  optimism,
  polygon,
  sonic,
} from 'viem/chains';

/**
 * Chain ID constants matching @sodax/types
 */
export const CHAIN_IDS = {
  ETHEREUM: 1,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  POLYGON: 137,
  BSC: 56,
  AVALANCHE: 43114,
  SONIC: 146,
  LIGHTLINK: 1890,
  HYPEREVM: 999,
  KAIA: 8217,
} as const;

/**
 * SDK chain ID format mapping (e.g., 'ethereum', '0x2105.base')
 */
export const SDK_CHAIN_ID_MAP: Record<string, number> = {
  'ethereum': CHAIN_IDS.ETHEREUM,
  'arbitrum': CHAIN_IDS.ARBITRUM,
  '0xa4b1.arbitrum': CHAIN_IDS.ARBITRUM,
  'optimism': CHAIN_IDS.OPTIMISM,
  '0xa.optimism': CHAIN_IDS.OPTIMISM,
  'base': CHAIN_IDS.BASE,
  '0x2105.base': CHAIN_IDS.BASE,
  'polygon': CHAIN_IDS.POLYGON,
  '0x89.polygon': CHAIN_IDS.POLYGON,
  'bsc': CHAIN_IDS.BSC,
  '0x38.bsc': CHAIN_IDS.BSC,
  'avalanche': CHAIN_IDS.AVALANCHE,
  'avax': CHAIN_IDS.AVALANCHE,
  '0xa86a.avax': CHAIN_IDS.AVALANCHE,
  'sonic': CHAIN_IDS.SONIC,
  'lightlink': CHAIN_IDS.LIGHTLINK,
  'hyperevm': CHAIN_IDS.HYPEREVM,
  'hyper': CHAIN_IDS.HYPEREVM,
  'kaia': CHAIN_IDS.KAIA,
  '0x2019.kaia': CHAIN_IDS.KAIA,
};

/**
 * HyperEVM chain definition
 * Matches @sodax/wallet-sdk-core hyper definition
 */
export const hyper = defineChain({
  id: CHAIN_IDS.HYPEREVM,
  name: 'HyperEVM',
  nativeCurrency: { decimals: 18, name: 'HYPE', symbol: 'HYPE' },
  rpcUrls: { default: { http: ['https://rpc.hyperliquid.xyz/evm'] } },
  blockExplorers: { default: { name: 'HyperEVMScan', url: 'https://hyperevmscan.io/' } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11', blockCreated: 13051 } },
});

/**
 * Kaia chain definition
 */
export const kaia = defineChain({
  id: CHAIN_IDS.KAIA,
  name: 'Kaia',
  nativeCurrency: { decimals: 18, name: 'KAIA', symbol: 'KAIA' },
  rpcUrls: { default: { http: ['https://public-en.node.kaia.io'] } },
  blockExplorers: { default: { name: 'KaiaScan', url: 'https://kaiascan.io/' } },
});

/**
 * Chain configuration by numeric ID
 */
const CHAIN_CONFIG: Record<number, Chain> = {
  [CHAIN_IDS.ETHEREUM]: mainnet,
  [CHAIN_IDS.ARBITRUM]: arbitrum,
  [CHAIN_IDS.OPTIMISM]: optimism,
  [CHAIN_IDS.BASE]: base,
  [CHAIN_IDS.POLYGON]: polygon,
  [CHAIN_IDS.BSC]: bsc,
  [CHAIN_IDS.AVALANCHE]: avalanche,
  [CHAIN_IDS.SONIC]: sonic,
  [CHAIN_IDS.LIGHTLINK]: lightlinkPhoenix,
  [CHAIN_IDS.HYPEREVM]: hyper,
  [CHAIN_IDS.KAIA]: kaia,
};

/**
 * Default RPC URLs for all supported chains
 */
/**
 * FALLBACK RPC URLs for all supported chains
 * Primary RPCs should come from evm-wallet-skill (chains.js)
 * @see https://github.com/amped-finance/evm-wallet-skill
 */
export const DEFAULT_RPC_URLS: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: 'https://ethereum.publicnode.com',
  [CHAIN_IDS.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
  [CHAIN_IDS.OPTIMISM]: 'https://mainnet.optimism.io',
  [CHAIN_IDS.BASE]: 'https://mainnet.base.org',
  [CHAIN_IDS.POLYGON]: 'https://polygon-bor-rpc.publicnode.com',
  [CHAIN_IDS.BSC]: 'https://bsc-dataseed.binance.org',
  [CHAIN_IDS.AVALANCHE]: 'https://api.avax.network/ext/bc/C/rpc',
  [CHAIN_IDS.SONIC]: 'https://rpc.soniclabs.com',
  [CHAIN_IDS.LIGHTLINK]: 'https://replicator.phoenix.lightlink.io/rpc/v1',
  [CHAIN_IDS.HYPEREVM]: 'https://rpc.hyperliquid.xyz/evm',
  [CHAIN_IDS.KAIA]: 'https://public-en.node.kaia.io',
};

/**
 * Resolve SDK chain ID format to numeric chain ID
 */
export function resolveChainId(sdkChainId: string | number): number {
  if (typeof sdkChainId === 'number') return sdkChainId;

  const lower = sdkChainId.toLowerCase();
  if (SDK_CHAIN_ID_MAP[lower] !== undefined) return SDK_CHAIN_ID_MAP[lower];

  if (lower.startsWith('0x')) {
    const parsed = parseInt(lower, 16);
    if (!isNaN(parsed)) return parsed;
  }

  const parsed = parseInt(sdkChainId, 10);
  if (!isNaN(parsed)) return parsed;

  throw new Error(`Unable to resolve chain ID: ${sdkChainId}`);
}

/**
 * Get viem Chain configuration for a chain ID
 */
export function getViemChain(chainId: string | number): Chain {
  const numericId = resolveChainId(chainId);
  const chain = CHAIN_CONFIG[numericId];
  if (!chain) throw new Error(`Unsupported chain ID: ${chainId} (resolved to ${numericId})`);
  return chain;
}

/**
 * Get default RPC URL for a chain
 */
export function getDefaultRpcUrl(chainId: string | number): string {
  const numericId = resolveChainId(chainId);
  const rpcUrl = DEFAULT_RPC_URLS[numericId];
  if (!rpcUrl) throw new Error(`No default RPC URL for chain ID: ${chainId}`);
  return rpcUrl;
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: string | number): boolean {
  try {
    getViemChain(chainId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(CHAIN_CONFIG).map(Number);
}

/**
 * Get chain name
 */
export function getChainName(chainId: string | number): string {
  return getViemChain(chainId).name;
}
