/**
 * EVM Wallet Skill Adapter
 * 
 * Integrates with the evm-wallet-skill to reuse existing wallet configuration
 * instead of requiring custom AMPED_OC_WALLETS_JSON.
 * 
 * Supports multiple wallet sources:
 * - ~/.evm-wallet.json (evm-wallet-skill default location)
 * - EVM_WALLETS_JSON environment variable
 * - WALLET_CONFIG_JSON environment variable
 * 
 * @see https://github.com/surfer77/evm-wallet-skill
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AmpedDefiError,ErrorCode } from '../utils/errors';
import { normalizeChainId } from './types';

// Try to import viem for address derivation
let privateKeyToAccount: ((key: `0x${string}`) => { address: string }) | null = null;
try {
  const viem = require('viem/accounts');
  privateKeyToAccount = viem.privateKeyToAccount;
} catch {
  // viem not available, will use address from config
}

/**
 * FALLBACK RPC URLs - primary RPCs come from evm-wallet-skill
 * These are only used when evm-wallet-skill does not provide an RPC
 */
const FALLBACK_RPCS: Record<string, string> = {
  // SODAX supported spoke chains
  ethereum: 'https://ethereum.publicnode.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  base: 'https://mainnet.base.org',
  optimism: 'https://mainnet.optimism.io',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  bsc: 'https://bsc-dataseed.binance.org',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
  // Sonic hub chain
  sonic: 'https://rpc.soniclabs.com',
  // Additional chains (may not be SODAX-supported but useful)
  lightlink: 'https://replicator.phoenix.lightlink.io/rpc/v1',
};

/**
 * Wallet information from evm-wallet-skill
 */
export interface EvmWalletInfo {
  id: string;
  address: string;
  chainId?: number;
  provider?: 'privateKey' | 'kms' | 'hardware' | 'web3Auth';
}

/**
 * Wallet adapter options
 */
export interface WalletAdapterOptions {
  preferSkill?: boolean;
  walletId?: string;
}

/**
 * EVM Wallet Skill Adapter
 */
export class EvmWalletSkillAdapter {
  private skillWallets: Map<string, EvmWalletInfo> = new Map();
  private skillRpcs: Map<string, string> = new Map();
  private useSkill: boolean;

  constructor(options: WalletAdapterOptions = {}) {
    this.useSkill = options.preferSkill !== false;
    if (this.useSkill) {
      this.loadSkillConfig();
    }
  }

  /**
   * Load configuration from evm-wallet-skill
   * Checks multiple sources in order:
   * 1. ~/.evm-wallet.json (evm-wallet-skill default)
   * 2. EVM_WALLETS_JSON environment variable
   * 3. WALLET_CONFIG_JSON environment variable
   */
  private loadSkillConfig(): void {
    // 1. Try ~/.evm-wallet.json first (evm-wallet-skill default location)
    this.loadEvmWalletFile();
    
    // 2. Try environment variables
    this.loadEnvWallets();
    
    // 3. Load RPC URLs from environment
    this.loadEnvRpcs();
  }

  /**
   * Load wallet from ~/.evm-wallet.json (evm-wallet-skill format)
   */
  private loadEvmWalletFile(): void {
    try {
      const walletPath = path.join(os.homedir(), '.evm-wallet.json');
      
      if (!fs.existsSync(walletPath)) {
        return;
      }

      const content = fs.readFileSync(walletPath, 'utf-8');
      const walletData = JSON.parse(content);

      // evm-wallet-skill stores: { privateKey: "0x..." } or { privateKey: "0x...", address: "0x..." }
      if (walletData.privateKey) {
        let address = walletData.address;
        
        // Derive address from private key if not provided
        if (!address && privateKeyToAccount) {
          try {
            const account = privateKeyToAccount(walletData.privateKey as `0x${string}`);
            address = account.address;
          } catch (e) {
            console.warn('[walletAdapter] Failed to derive address from private key');
          }
        }

        if (address) {
          this.skillWallets.set('default', {
            id: 'default',
            address,
            provider: 'privateKey',
          });
          // Store private key for later use
          (this.skillWallets.get('default') as any).privateKey = walletData.privateKey;
          console.log(`[walletAdapter] Loaded wallet from ~/.evm-wallet.json (${address.slice(0, 8)}...)`);
        }
      }
    } catch (error) {
      // Silently ignore - file may not exist
    }
  }

  /**
   * Load wallets from environment variables
   */
  private loadEnvWallets(): void {
    try {
      const skillWalletsJson = process.env.EVM_WALLETS_JSON || process.env.WALLET_CONFIG_JSON;

      if (skillWalletsJson) {
        const wallets = JSON.parse(skillWalletsJson);
        
        if (Array.isArray(wallets)) {
          wallets.forEach(w => {
            this.skillWallets.set(w.id || w.name || 'default', {
              id: w.id || w.name || 'default',
              address: w.address,
              chainId: w.chainId,
              provider: w.provider || w.type,
            });
          });
        } else if (typeof wallets === 'object') {
          Object.entries(wallets).forEach(([id, config]: [string, any]) => {
            this.skillWallets.set(id, {
              id,
              address: config.address,
              chainId: config.chainId,
              provider: config.provider || 'privateKey',
            });
          });
        }

        console.log(`[walletAdapter] Loaded ${this.skillWallets.size} wallets from environment`);
      }
    } catch (error) {
      console.warn('[walletAdapter] Failed to parse wallet environment variables:', error);
    }
  }

  /**
   * Load RPC URLs - uses defaults, then overrides with environment variables
   */
  private loadEnvRpcs(): void {
    // Start with default RPCs
    Object.entries(FALLBACK_RPCS).forEach(([chain, url]) => {
      this.skillRpcs.set(chain.toLowerCase(), url);
    });

    // Override with environment variables if provided
    try {
      const skillRpcsJson = process.env.AMPED_OC_RPC_URLS_JSON || 
                            process.env.EVM_RPC_URLS_JSON || 
                            process.env.RPC_URLS_JSON;

      if (skillRpcsJson) {
        const rpcs = JSON.parse(skillRpcsJson);
        Object.entries(rpcs).forEach(([chain, url]) => {
          this.skillRpcs.set(String(chain).toLowerCase(), url as string);
        });
        console.log(`[walletAdapter] Custom RPC URLs configured for: ${Object.keys(rpcs).join(', ')}`);
      }
    } catch (error) {
      console.warn('[walletAdapter] Failed to parse RPC environment variables:', error);
    }

    console.log(`[walletAdapter] ${this.skillRpcs.size} RPC URLs available (includes defaults)`);
  }

  /**
   * Get wallet address - tries skill first, then legacy config
   */
  async getWalletAddress(walletId?: string): Promise<string> {
    // Try skill wallets
    if (this.skillWallets.size > 0) {
      const wallet = this.skillWallets.get(walletId || 'default') || 
                     Array.from(this.skillWallets.values())[0];
      if (wallet) return wallet.address;
    }

    // Fallback to AMPED_OC_WALLETS_JSON
    const legacy = process.env.AMPED_OC_WALLETS_JSON;
    if (legacy) {
      const config = JSON.parse(legacy);
      const wallet = config[walletId || 'main'] || config.default || Object.values(config)[0];
      if (wallet?.address) return wallet.address;
    }

    throw new AmpedDefiError(
      ErrorCode.WALLET_NOT_FOUND,
      `Wallet not found: ${walletId || 'default'}`,
      { remediation: 'Configure ~/.evm-wallet.json, EVM_WALLETS_JSON, or AMPED_OC_WALLETS_JSON' }
    );
  }

  /**
   * Get wallet private key - for signing transactions
   */
  async getPrivateKey(walletId?: string): Promise<string | null> {
    // Try skill wallets
    if (this.skillWallets.size > 0) {
      const wallet = this.skillWallets.get(walletId || 'default') || 
                     Array.from(this.skillWallets.values())[0];
      if (wallet && (wallet as any).privateKey) {
        return (wallet as any).privateKey;
      }
    }

    // Fallback to AMPED_OC_WALLETS_JSON
    const legacy = process.env.AMPED_OC_WALLETS_JSON;
    if (legacy) {
      const config = JSON.parse(legacy);
      const wallet = config[walletId || 'main'] || config.default || Object.values(config)[0];
      if (wallet?.privateKey) return wallet.privateKey;
    }

    return null;
  }

  /**
   * Get full wallet config (address + privateKey if available)
   */
  async getWalletConfig(walletId?: string): Promise<{ address: string; privateKey?: string }> {
    const address = await this.getWalletAddress(walletId);
    const privateKey = await this.getPrivateKey(walletId);
    return { address, privateKey: privateKey || undefined };
  }

  /**
   * Get RPC URL - tries skill first, then legacy config
   */
  async getRpcUrl(chainId: string | number): Promise<string> {
    const key = normalizeChainId(String(chainId)).toLowerCase();

    // Try skill RPCs
    if (this.skillRpcs.has(key)) {
      return this.skillRpcs.get(key)!;
    }

    // Fallback to AMPED_OC_RPC_URLS_JSON
    const legacy = process.env.AMPED_OC_RPC_URLS_JSON;
    if (legacy) {
      const config = JSON.parse(legacy);
      if (config[key] || config[chainId]) return config[key] || config[chainId];
    }

    throw new AmpedDefiError(
      ErrorCode.RPC_URL_NOT_CONFIGURED,
      `RPC URL not configured for chain: ${chainId}`,
      { remediation: 'Configure EVM_RPC_URLS_JSON or AMPED_OC_RPC_URLS_JSON' }
    );
  }

  /**
   * Check if using skill wallets
   */
  isUsingSkillWallets(): boolean {
    return this.skillWallets.size > 0;
  }

  /**
   * Check if using skill RPCs
   */
  isUsingSkillRpcs(): boolean {
    return this.skillRpcs.size > 0;
  }

  /**
   * Get all skill wallet IDs
   */
  getWalletIds(): string[] {
    return Array.from(this.skillWallets.keys());
  }

  /**
   * Get all skill RPC chain IDs
   */
  getRpcChainIds(): string[] {
    return Array.from(this.skillRpcs.keys());
  }
}

// Singleton
let adapter: EvmWalletSkillAdapter | null = null;

export function getWalletAdapter(options?: WalletAdapterOptions): EvmWalletSkillAdapter {
  if (!adapter) {
    adapter = new EvmWalletSkillAdapter(options);
  }
  return adapter;
}

export function resetWalletAdapter(): void {
  adapter = null;
}
