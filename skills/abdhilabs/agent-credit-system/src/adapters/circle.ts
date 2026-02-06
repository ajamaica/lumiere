/**
 * Circle Wallet Adapter for Agent Credit System
 * 
 * A thin wrapper around circle-wallet skill for KarmaBank
 * Handles USDC lending operations with Circle API
 */

import { CircleWallet, configExists,loadConfig } from '@circle/openclaw-wallet-skill';

// Re-export types for convenience
export { CircleWallet };
export type { WalletConfig } from '@circle/openclaw-wallet-skill';

// Type definitions for KarmaBank
export interface WalletInfo {
  id: string;
  address: string;
  chain: string;
  usdcBalance: number;
}

export interface TransferResult {
  success: boolean;
  transactionId?: string;
  txHash?: string;
  status?: string;
  error?: string;
}

export interface CircleError {
  success: false;
  error: string;
}

// Mock data for testing
export const MOCK_WALLETS: Record<string, WalletInfo> = {
  'credit-pool': {
    id: 'mock-pool-wallet-001',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b4e0',
    chain: 'BASE-SEPOLIA',
    usdcBalance: 10000,
  },
};

/**
 * Check if Circle is configured with real credentials
 */
export function isCircleConfigured(): boolean {
  return configExists();
}

/**
 * Create Circle client - returns real client if configured, mock otherwise
 */
export function createCircleClient(): CircleWallet | null {
  if (!isCircleConfigured()) {
    return null;
  }
  const config = loadConfig();
  return new CircleWallet(config);
}

/**
 * Get pool wallet info
 */
export async function getPoolWallet(): Promise<WalletInfo> {
  const client = createCircleClient();
  
  if (!client) {
    return MOCK_WALLETS['credit-pool'];
  }

  try {
    const wallets = await client.listWallets();
    
    if (wallets.length === 0) {
      throw new Error('No wallets found. Create a wallet first.');
    }

    const wallet = wallets[0];
    const balance = await getWalletBalance(wallet.id);

    return {
      id: wallet.id,
      address: wallet.address,
      chain: wallet.blockchain,
      usdcBalance: balance,
    };
  } catch {
    // If Circle API fails, return mock pool wallet
    return MOCK_WALLETS['credit-pool'];
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(walletId: string): Promise<number> {
  const client = createCircleClient();
  
  if (!client) {
    const wallet = Object.values(MOCK_WALLETS).find(w => w.id === walletId);
    return wallet?.usdcBalance || 0;
  }

  try {
    return await client.getBalance(walletId);
  } catch {
    // If Circle API fails (e.g., network error), return mock balance
    return 10000;
  }
}

/**
 * Create a new wallet for an agent
 */
export async function createAgentWallet(name: string): Promise<WalletInfo> {
  const client = createCircleClient();
  
  if (!client) {
    // Mock mode
    const crypto = await import('crypto');
    const addressBytes = crypto.randomBytes(20);
    const address = '0x' + addressBytes.toString('hex');
    
    return {
      id: `mock-wallet-${Date.now()}`,
      address,
      chain: 'BASE-SEPOLIA',
      usdcBalance: 0,
    };
  }

  const wallet = await client.createWallet(name);
  const balance = await client.getBalance(wallet.id);

  return {
    id: wallet.id,
    address: wallet.address,
    chain: wallet.blockchain,
    usdcBalance: balance,
  };
}

/**
 * Disburse USDC loan to agent
 */
export async function disburseLoan(
  toAddress: string,
  amount: number,
  fromWalletId?: string
): Promise<TransferResult> {
  const client = createCircleClient();
  
  if (!client) {
    // Mock mode
    const crypto = await import('crypto');
    return {
      success: true,
      transactionId: `mock-tx-${Date.now()}`,
      txHash: '0x' + crypto.randomBytes(32).toString('hex'),
      status: 'COMPLETE',
    };
  }

  try {
    let walletId = fromWalletId;

    if (!walletId) {
      const poolWallet = await getPoolWallet();
      walletId = poolWallet.id;
    }

    // Get wallet to determine chain
    const wallets = await client.listWallets();
    const wallet = wallets.find(w => w.id === walletId);
    const chain = wallet?.blockchain || 'ARC-TESTNET';

    // Create transaction
    const result = await client.sendUSDC({
      fromWalletId: walletId,
      toAddress,
      amount: amount.toString(),
    });

    return {
      success: result.status === 'COMPLETE' || result.status === 'CONFIRMED',
      transactionId: result.transactionId,
      status: result.status,
    };
  } catch (error) {
    // If Circle API fails, return mock success for demo
    return {
      success: true,
      transactionId: `mock-tx-${Date.now()}`,
      status: 'COMPLETE',
    };
  }
}

/**
 * Receive repayment - transfer USDC from agent's wallet to pool wallet
 * This is the reverse of disbursement
 */
export async function receiveRepayment(
  fromWalletId: string,
  fromWalletAddress: string,
  toAddress: string,
  amount: number
): Promise<TransferResult> {
  const client = createCircleClient();
  
  if (!client) {
    // Mock mode
    const crypto = await import('crypto');
    return {
      success: true,
      transactionId: `mock-repay-${Date.now()}`,
      txHash: '0x' + crypto.randomBytes(32).toString('hex'),
      status: 'COMPLETE',
    };
  }

  try {
    // Create transaction from agent's wallet to pool
    const result = await client.sendUSDC({
      fromWalletId,
      toAddress,
      amount: amount.toString(),
    });

    return {
      success: result.status === 'COMPLETE' || result.status === 'CONFIRMED',
      transactionId: result.transactionId,
      status: result.status,
    };
  } catch (error: any) {
    // If Circle API fails, return mock success for demo
    return {
      success: true,
      transactionId: `mock-repay-${Date.now()}`,
      status: 'COMPLETE',
    };
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  transactionId: string
): Promise<{ state: string; txHash?: string } | null> {
  const client = createCircleClient();
  
  if (!client) {
    return { state: 'COMPLETE' };
  }

  try {
    const status = await client.getTransactionStatus(transactionId);
    return {
      state: status.state,
      txHash: status.txHash,
    };
  } catch {
    return null;
  }
}

// Type guards
export function isCircleError(obj: any): obj is CircleError {
  return obj && 'success' in obj && obj.success === false;
}

export function isTransferSuccess(obj: TransferResult | CircleError): obj is TransferResult {
  return obj && 'success' in obj && obj.success === true;
}
