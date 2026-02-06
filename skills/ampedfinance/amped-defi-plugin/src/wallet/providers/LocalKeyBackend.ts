/**
 * Local Key Backend
 * 
 * Wallet backend implementation using local private keys.
 * Compatible with evm-wallet-skill's key storage.
 * 
 * Uses viem for transaction signing and submission.
 */

import {
  type Address,
  type Chain,
  createPublicClient,
  createWalletClient,
  type Hash,
  http,
} from 'viem';
import { type PrivateKeyAccount,privateKeyToAccount } from 'viem/accounts';

import { getDefaultRpcUrl, getViemChain, resolveChainId } from './chainConfig';
import type { 
  IWalletBackend, 
  LocalKeyBackendConfig, 
  TransactionReceipt, 
  TransactionRequest} from './types';

/**
 * Local private key wallet backend
 * 
 * Signs transactions locally using the provided private key.
 * This is the standard backend for self-custody wallets.
 */
export class LocalKeyBackend implements IWalletBackend {
  readonly type = 'localKey' as const;
  
  private readonly account: PrivateKeyAccount;
  private readonly walletClient: ReturnType<typeof createWalletClient>;
  private readonly _publicClient: ReturnType<typeof createPublicClient>;
  private readonly chainId: number;
  private readonly chain: Chain;

  constructor(config: LocalKeyBackendConfig) {
    // Resolve chain configuration
    this.chainId = resolveChainId(config.chainId);
    this.chain = getViemChain(this.chainId);
    
    // Get RPC URL (custom or default)
    const rpcUrl = config.rpcUrl || getDefaultRpcUrl(this.chainId);
    
    // Create account from private key
    this.account = privateKeyToAccount(config.privateKey);
    
    // Create viem clients
    this._publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    });
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(rpcUrl),
    });
    
    console.log(`[LocalKeyBackend] Initialized for chain ${this.chain.name} (${this.chainId})`);
    console.log(`[LocalKeyBackend] Address: ${this.account.address}`);
  }

  /**
   * Get the wallet address
   */
  async getAddress(): Promise<Address> {
    return this.account.address;
  }

  /**
   * Send a transaction
   * 
   * Signs locally and submits via RPC.
   */
  async sendTransaction(tx: TransactionRequest): Promise<Hash> {
    console.log(`[LocalKeyBackend] Sending transaction to ${tx.to}`);
    
    // Build transaction params
    const txParams: any = {
      account: this.account,
      chain: this.chain,
      to: tx.to,
      value: tx.value || 0n,
      data: tx.data,
    };
    
    // Add optional gas parameters
    if (tx.gasLimit) txParams.gas = tx.gasLimit;
    if (tx.gasPrice) txParams.gasPrice = tx.gasPrice;
    if (tx.maxFeePerGas) txParams.maxFeePerGas = tx.maxFeePerGas;
    if (tx.maxPriorityFeePerGas) txParams.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
    if (tx.nonce !== undefined) txParams.nonce = tx.nonce;
    
    const hash = await this.walletClient.sendTransaction(txParams);
    
    console.log(`[LocalKeyBackend] Transaction sent: ${hash}`);
    return hash;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: Hash): Promise<TransactionReceipt> {
    console.log(`[LocalKeyBackend] Waiting for transaction: ${txHash}`);
    
    const receipt = await this._publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    
    console.log(`[LocalKeyBackend] Transaction confirmed in block ${receipt.blockNumber}`);
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      from: receipt.from,
      to: receipt.to,
      gasUsed: receipt.gasUsed,
      status: receipt.status === 'success' ? 'success' : 'reverted',
      logs: receipt.logs.map((log: any) => ({
        address: log.address,
        topics: [...(log.topics || [])] as `0x${string}`[],
        data: log.data,
      })),
    };
  }

  /**
   * Check if backend is ready
   * 
   * For local key backend, we verify RPC connectivity.
   */
  async isReady(): Promise<boolean> {
    try {
      await this._publicClient.getChainId();
      return true;
    } catch (error) {
      console.error('[LocalKeyBackend] RPC connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Get the chain ID
   */
  getChainId(): number {
    return this.chainId;
  }

  /**
   * Get the public client (for external use)
   */
  getPublicClient(): ReturnType<typeof createPublicClient> {
    return this._publicClient;
  }

  /**
   * Get the wallet client (for advanced use cases)
   */
  getWalletClient(): ReturnType<typeof createWalletClient> {
    return this.walletClient;
  }
}

/**
 * Create a LocalKeyBackend from configuration
 */
export async function createLocalKeyBackend(config: LocalKeyBackendConfig): Promise<LocalKeyBackend> {
  const backend = new LocalKeyBackend(config);
  
  // Verify connectivity
  const ready = await backend.isReady();
  if (!ready) {
    console.warn('[LocalKeyBackend] Backend created but RPC connectivity check failed');
  }
  
  return backend;
}
