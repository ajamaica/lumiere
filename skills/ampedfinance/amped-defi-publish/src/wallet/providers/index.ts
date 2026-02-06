/**
 * Wallet Providers
 * 
 * Pluggable wallet backend architecture for Amped DeFi plugin.
 * 
 * @example
 * ```typescript
 * import { AmpedWalletProvider } from './wallet/providers';
 * 
 * // Create with local private key (evm-wallet-skill compatible)
 * const provider = await AmpedWalletProvider.fromPrivateKey({
 *   privateKey: '0x...',
 *   chainId: 'lightlink',
 * });
 * 
 * // Or create with Bankr backend
 * const bankrProvider = await AmpedWalletProvider.fromBankr({
 *   bankrApiUrl: 'https://api.bankr.xyz',
 *   bankrApiKey: 'your-api-key',
 *   userAddress: '0x...',
 *   chainId: 'base',
 * });
 * ```
 */

// Main provider
export { AmpedWalletProvider } from './AmpedWalletProvider';

// Backends
export { BankrBackend, createBankrBackend } from './BankrBackend';
export { createLocalKeyBackend,LocalKeyBackend } from './LocalKeyBackend';

// Chain configuration
export {
  CHAIN_IDS,
  DEFAULT_RPC_URLS,
  getChainName,
  getDefaultRpcUrl,
  getSupportedChainIds,
  getViemChain,
  hyper,
  isChainSupported,
  resolveChainId,
  SDK_CHAIN_ID_MAP,
} from './chainConfig';

// Types
export type {
  AmpedWalletProviderConfig,
  BankrBackendConfig,
  IAmpedWalletProvider,
  IWalletBackend,
  LocalKeyBackendConfig,
  PrivyBackendConfig,
  SmartWalletBackendConfig,
  TransactionReceipt,
  TransactionRequest,
  WalletBackendBaseConfig,
  WalletBackendConfig,
  WalletBackendFactory,
  WalletBackendType,
} from './types';
