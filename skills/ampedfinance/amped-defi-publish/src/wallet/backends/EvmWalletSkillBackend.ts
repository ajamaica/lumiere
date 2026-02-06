/**
 * EVM Wallet Skill Backend
 * 
 * Loads wallet from ~/.evm-wallet.json (created by evm-wallet-skill)
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { Address } from 'viem';

import type { IWalletBackend } from '../types';
import { SODAX_SUPPORTED_CHAINS } from '../types';

/**
 * Default path to evm-wallet-skill wallet file
 */
const DEFAULT_WALLET_PATH = join(homedir(), '.evm-wallet.json');

/**
 * EVM Wallet Skill wallet file structure
 */
interface EvmWalletFile {
  address: string;
  privateKey: string;
}

/**
 * Backend for evm-wallet-skill wallets
 * Supports all SODAX chains (local key signing)
 */
export class EvmWalletSkillBackend implements IWalletBackend {
  readonly type = 'evm-wallet-skill' as const;
  readonly nickname: string;
  readonly supportedChains: readonly string[];
  
  private walletPath: string;
  private cachedWallet: EvmWalletFile | null = null;

  constructor(options: {
    nickname: string;
    path?: string;
    chains?: string[];
  }) {
    this.nickname = options.nickname;
    this.walletPath = options.path || DEFAULT_WALLET_PATH;
    this.supportedChains = options.chains || [...SODAX_SUPPORTED_CHAINS];
  }

  /**
   * Load wallet from file (cached)
   */
  private loadWallet(): EvmWalletFile {
    if (this.cachedWallet) return this.cachedWallet;
    
    if (!existsSync(this.walletPath)) {
      throw new Error(
        `Wallet file not found: ${this.walletPath}\n` +
        `Run: git clone https://github.com/amped-finance/evm-wallet-skill.git ~/.openclaw/skills/evm-wallet-skill\n` +
        `     cd ~/.openclaw/skills/evm-wallet-skill && npm install && node src/setup.js`
      );
    }
    
    try {
      const content = readFileSync(this.walletPath, 'utf-8');
      this.cachedWallet = JSON.parse(content) as EvmWalletFile;
      return this.cachedWallet;
    } catch (error) {
      throw new Error(`Failed to load wallet from ${this.walletPath}: ${error}`);
    }
  }

  async getAddress(): Promise<Address> {
    const wallet = this.loadWallet();
    return wallet.address as Address;
  }

  supportsChain(chainId: string): boolean {
    return this.supportedChains.includes(chainId);
  }

  async getPrivateKey(): Promise<`0x${string}`> {
    const wallet = this.loadWallet();
    const key = wallet.privateKey;
    return key.startsWith('0x') ? key as `0x${string}` : `0x${key}` as `0x${string}`;
  }

  async isReady(): Promise<boolean> {
    try {
      this.loadWallet();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create an evm-wallet-skill backend
 */
export function createEvmWalletSkillBackend(options: {
  nickname?: string;
  path?: string;
  chains?: string[];
} = {}): EvmWalletSkillBackend {
  return new EvmWalletSkillBackend({
    nickname: options.nickname || 'main',
    path: options.path,
    chains: options.chains,
  });
}
