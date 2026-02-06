/**
 * Wallet Provider Types
 * 
 * Interfaces for the pluggable wallet backend architecture.
 * Allows the same AmpedWalletProvider to work with:
 * - Local private keys (evm-wallet-skill)
 * - Bankr execution API
 * - Future: Privy, smart contract wallets, etc.
 */

import type { 
  EvmRawTransaction, 
  EvmRawTransactionReceipt,
  IEvmWalletProvider 
} from '@sodax/types';
import type { Address,Hash } from 'viem';
import { createPublicClient } from 'viem';

/**
 * Wallet backend type identifiers
 */
export type WalletBackendType = 'localKey' | 'bankr' | 'privy' | 'smartWallet';

/**
 * Base configuration for all backends
 */
export interface WalletBackendBaseConfig {
  type: WalletBackendType;
  chainId: string | number;
  rpcUrl?: string;
}

/**
 * Configuration for local private key backend
 */
export interface LocalKeyBackendConfig extends WalletBackendBaseConfig {
  type: 'localKey';
  privateKey: `0x${string}`;
}

/**
 * Configuration for Bankr execution backend
 */
export interface BankrBackendConfig extends WalletBackendBaseConfig {
  type: 'bankr';
  bankrApiUrl: string;
  bankrApiKey: string;
  userAddress: Address;
  /** Optional: policy limits for transactions */
  policy?: {
    maxValuePerTx?: bigint;
    maxDailyVolume?: bigint;
    allowedContracts?: Address[];
  };
}

/**
 * Configuration for Privy server wallet backend (future)
 */
export interface PrivyBackendConfig extends WalletBackendBaseConfig {
  type: 'privy';
  appId: string;
  appSecret: string;
  walletId: string;
}

/**
 * Configuration for smart contract wallet backend (future)
 */
export interface SmartWalletBackendConfig extends WalletBackendBaseConfig {
  type: 'smartWallet';
  walletAddress: Address;
  sessionKey: `0x${string}`;
  entryPointAddress: Address;
}

/**
 * Union of all backend configurations
 */
export type WalletBackendConfig = 
  | LocalKeyBackendConfig 
  | BankrBackendConfig
  | PrivyBackendConfig
  | SmartWalletBackendConfig;

/**
 * Transaction request (simplified)
 */
export interface TransactionRequest {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

/**
 * Transaction receipt (simplified)
 */
export interface TransactionReceipt {
  transactionHash: Hash;
  blockNumber: bigint;
  blockHash: Hash;
  from: Address;
  to: Address | null;
  gasUsed: bigint;
  status: 'success' | 'reverted';
  logs: Array<{
    address: Address;
    topics: `0x${string}`[];
    data: `0x${string}`;
  }>;
}

/**
 * Wallet backend interface
 * 
 * All wallet backends must implement this interface.
 * This allows AmpedWalletProvider to delegate to different backends
 * without changing its own implementation.
 */
export interface IWalletBackend {
  /** Backend type identifier */
  readonly type: WalletBackendType;
  
  /** Get the wallet address */
  getAddress(): Promise<Address>;
  
  /** 
   * Send a transaction and return the transaction hash
   * The backend is responsible for signing and submitting the transaction.
   */
  sendTransaction(tx: TransactionRequest): Promise<Hash>;
  
  /**
   * Wait for a transaction to be confirmed
   * Returns when the transaction is included in a block.
   */
  waitForTransaction(txHash: Hash): Promise<TransactionReceipt>;
  
  /**
   * Check if the backend can execute transactions
   * (e.g., Bankr backend may need API connectivity)
   */
  isReady(): Promise<boolean>;
  
  /**
   * Get the numeric chain ID this backend is configured for
   */
  getChainId(): number;
}

/**
 * Factory function type for creating backends
 */
export type WalletBackendFactory = (config: WalletBackendConfig) => Promise<IWalletBackend>;

/**
 * Amped Wallet Provider configuration
 */
export interface AmpedWalletProviderConfig {
  /** Backend configuration */
  backend: WalletBackendConfig;
  /** Optional custom RPC URL (overrides chain default) */
  rpcUrl?: string;
}

/**
 * Extended IEvmWalletProvider with Amped-specific methods
 */
export interface IAmpedWalletProvider extends IEvmWalletProvider {
  /** Get the underlying backend */
  getBackend(): IWalletBackend;
  
  /** Get the backend type */
  getBackendType(): WalletBackendType;
  
  /** Check if ready for transactions */
  isReady(): Promise<boolean>;
  
  /** Get chain ID */
  getChainId(): number;
}
