/**
 * Environment Variable Backend
 * 
 * Loads wallet from environment variables:
 * - AMPED_OC_WALLETS_JSON: JSON with wallet configs
 * - Or individual env vars for address/privateKey
 */

import type { Address } from 'viem';

import type { IWalletBackend } from '../types';
import { SODAX_SUPPORTED_CHAINS } from '../types';

/**
 * Wallet entry from AMPED_OC_WALLETS_JSON
 */
interface EnvWalletEntry {
  address: string;
  privateKey: string;
}

/**
 * Environment variable backend configuration
 */
export interface EnvBackendConfig {
  nickname: string;
  address?: Address;
  privateKey?: `0x${string}`;
  envVar?: string;  // Name of env var containing JSON
  chains?: string[];
}

/**
 * Environment variable wallet backend
 * Supports all SODAX chains (local key signing)
 */
export class EnvBackend implements IWalletBackend {
  readonly type = 'env' as const;
  readonly nickname: string;
  readonly supportedChains: readonly string[];
  
  private address: Address | null = null;
  private privateKey: `0x${string}` | null = null;
  private envVar: string | null = null;

  constructor(config: EnvBackendConfig) {
    this.nickname = config.nickname;
    this.supportedChains = config.chains || [...SODAX_SUPPORTED_CHAINS];
    
    if (config.address && config.privateKey) {
      // Direct address/key provided
      this.address = config.address;
      this.privateKey = config.privateKey;
    } else if (config.envVar) {
      // Will load from env var
      this.envVar = config.envVar;
    }
  }

  /**
   * Load wallet from environment variable if needed
   */
  private loadFromEnv(): { address: Address; privateKey: `0x${string}` } {
    if (this.address && this.privateKey) {
      return { address: this.address, privateKey: this.privateKey };
    }

    if (this.envVar) {
      const envValue = process.env[this.envVar];
      if (!envValue) {
        throw new Error(`Environment variable ${this.envVar} not set`);
      }
      
      try {
        const data = JSON.parse(envValue) as EnvWalletEntry;
        this.address = data.address as Address;
        this.privateKey = (data.privateKey.startsWith('0x') 
          ? data.privateKey 
          : `0x${data.privateKey}`) as `0x${string}`;
        return { address: this.address, privateKey: this.privateKey };
      } catch (error) {
        throw new Error(`Failed to parse ${this.envVar}: ${error}`);
      }
    }

    throw new Error(`No wallet configuration for "${this.nickname}"`);
  }

  async getAddress(): Promise<Address> {
    const { address } = this.loadFromEnv();
    return address;
  }

  supportsChain(chainId: string): boolean {
    return this.supportedChains.includes(chainId);
  }

  async getPrivateKey(): Promise<`0x${string}`> {
    const { privateKey } = this.loadFromEnv();
    return privateKey;
  }

  async isReady(): Promise<boolean> {
    try {
      this.loadFromEnv();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create env backend from direct config
 */
export function createEnvBackend(config: EnvBackendConfig): EnvBackend {
  return new EnvBackend(config);
}

/**
 * Load wallets from AMPED_OC_WALLETS_JSON environment variable
 * Returns multiple backends keyed by wallet name
 */
export function loadWalletsFromEnv(): Map<string, EnvBackend> {
  const wallets = new Map<string, EnvBackend>();
  
  const walletsJson = process.env.AMPED_OC_WALLETS_JSON;
  if (!walletsJson) return wallets;
  
  try {
    const parsed = JSON.parse(walletsJson) as Record<string, EnvWalletEntry>;
    
    for (const [name, wallet] of Object.entries(parsed)) {
      const backend = new EnvBackend({
        nickname: name,
        address: wallet.address as Address,
        privateKey: (wallet.privateKey.startsWith('0x') 
          ? wallet.privateKey 
          : `0x${wallet.privateKey}`) as `0x${string}`,
      });
      wallets.set(name.toLowerCase(), backend);
    }
    
    console.log(`[EnvBackend] Loaded ${wallets.size} wallet(s) from AMPED_OC_WALLETS_JSON`);
  } catch (error) {
    console.warn(`[EnvBackend] Failed to parse AMPED_OC_WALLETS_JSON: ${error}`);
  }
  
  return wallets;
}
