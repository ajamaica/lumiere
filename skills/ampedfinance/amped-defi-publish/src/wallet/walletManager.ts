/**
 * Unified Wallet Manager
 * 
 * Manages multiple wallet sources with nicknames:
 * - evm-wallet-skill (main)
 * - Bankr (bankr)
 * - Environment variables (custom names)
 * 
 * Auto-discovery order:
 * 1. wallets.json config file
 * 2. ~/.evm-wallet.json (evm-wallet-skill) → "main"
 * 3. BANKR_API_KEY env → "bankr"
 * 4. AMPED_OC_WALLETS_JSON env → named wallets
 */

import { existsSync, mkdirSync,readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname,join } from 'path';
import type { Address } from 'viem';

import { 
  createBankrBackend, 
  createEnvBackend,
  createEvmWalletSkillBackend, 
  loadWalletsFromEnv 
} from './backends';
import type { IWalletBackend, WalletConfig,WalletInfo, WalletsConfigFile } from './types';

/**
 * Config file path
 */
const CONFIG_PATH = join(homedir(), '.openclaw', 'extensions', 'amped-defi', 'wallets.json');
const EVM_WALLET_PATH = join(homedir(), '.evm-wallet.json');

/**
 * Singleton WalletManager instance
 */
let instance: WalletManager | null = null;

/**
 * Unified wallet manager
 */
export class WalletManager {
  private wallets = new Map<string, IWalletBackend>();
  private defaultWallet: string | null = null;
  private initialized = false;

  /**
   * Initialize the wallet manager
   * Auto-discovers wallets from all sources
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('[WalletManager] Initializing...');
    
    // 1. Load from config file if exists
    await this.loadConfigFile();
    
    // 2. Auto-discover from environment
    await this.autoDiscover();
    
    // 3. Set default
    this.determineDefault();
    
    this.initialized = true;
    
    console.log(`[WalletManager] Initialized with ${this.wallets.size} wallet(s)`);
    if (this.defaultWallet) {
      console.log(`[WalletManager] Default wallet: ${this.defaultWallet}`);
    }
  }

  /**
   * Load wallets from config file
   */
  private async loadConfigFile(): Promise<void> {
    if (!existsSync(CONFIG_PATH)) return;
    
    try {
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(content) as WalletsConfigFile;
      
      for (const [name, walletConfig] of Object.entries(config.wallets)) {
        const backend = this.createBackendFromConfig(name, walletConfig);
        if (backend) {
          this.wallets.set(name.toLowerCase(), backend);
          console.log(`[WalletManager] Loaded wallet "${name}" from config`);
        }
      }
      
      if (config.default) {
        this.defaultWallet = config.default.toLowerCase();
      }
    } catch (error) {
      console.warn(`[WalletManager] Failed to load config: ${error}`);
    }
  }

  /**
   * Create backend from config entry
   */
  private createBackendFromConfig(name: string, config: WalletConfig): IWalletBackend | null {
    try {
      switch (config.source) {
        case 'evm-wallet-skill':
          return createEvmWalletSkillBackend({
            nickname: name,
            path: config.path,
            chains: config.chains,
          });
          
        case 'bankr':
          if (!config.apiKey) {
            console.warn(`[WalletManager] Bankr wallet "${name}" missing apiKey`);
            return null;
          }
          return createBankrBackend({
            nickname: name,
            apiKey: config.apiKey,
            apiUrl: config.apiUrl,
          });
          
        case 'env':
          return createEnvBackend({
            nickname: name,
            address: config.address,
            privateKey: config.privateKey,
            envVar: config.envVar,
            chains: config.chains,
          });
          
        default:
          console.warn(`[WalletManager] Unknown wallet source: ${config.source}`);
          return null;
      }
    } catch (error) {
      console.warn(`[WalletManager] Failed to create backend for "${name}": ${error}`);
      return null;
    }
  }

  /**
   * Auto-discover wallets from environment
   */
  private async autoDiscover(): Promise<void> {
    // evm-wallet-skill (if not already configured)
    if (!this.wallets.has('main') && existsSync(EVM_WALLET_PATH)) {
      try {
        const backend = createEvmWalletSkillBackend({ nickname: 'main' });
        if (await backend.isReady()) {
          this.wallets.set('main', backend);
          console.log('[WalletManager] Auto-discovered: evm-wallet-skill → "main"');
        }
      } catch (error) {
        console.debug(`[WalletManager] evm-wallet-skill not available: ${error}`);
      }
    }
    
    // Bankr (if API key present and not already configured)
    const bankrApiKey = process.env.BANKR_API_KEY;
    if (!this.wallets.has('bankr') && bankrApiKey) {
      console.log('[WalletManager] Found BANKR_API_KEY, attempting to add Bankr wallet...');
      try {
        const backend = createBankrBackend({
          nickname: 'bankr',
          apiKey: bankrApiKey,
          apiUrl: process.env.BANKR_API_URL,
        });
        const ready = await backend.isReady();
        if (ready) {
          this.wallets.set('bankr', backend);
          console.log('[WalletManager] Auto-discovered: BANKR_API_KEY → "bankr"');
        } else {
          console.warn('[WalletManager] Bankr API key present but connectivity check failed');
        }
      } catch (error) {
        console.warn(`[WalletManager] Bankr auto-discovery failed: ${error}`);
      }
    }
    
    // Environment variable wallets
    const envWallets = loadWalletsFromEnv();
    for (const [name, backend] of envWallets) {
      if (!this.wallets.has(name)) {
        this.wallets.set(name, backend);
        console.log(`[WalletManager] Auto-discovered: AMPED_OC_WALLETS_JSON → "${name}"`);
      }
    }
  }

  /**
   * Determine default wallet
   */
  private determineDefault(): void {
    // If already set from config, verify it exists
    if (this.defaultWallet && this.wallets.has(this.defaultWallet)) {
      return;
    }
    
    // Priority: main > first available
    if (this.wallets.has('main')) {
      this.defaultWallet = 'main';
    } else if (this.wallets.size > 0) {
      this.defaultWallet = Array.from(this.wallets.keys())[0];
    } else {
      this.defaultWallet = null;
    }
  }

  /**
   * Resolve a wallet by nickname
   * @param nickname Optional wallet nickname (uses default if not provided)
   */
  async resolve(nickname?: string): Promise<IWalletBackend> {
    await this.initialize();
    
    const name = (nickname || this.defaultWallet)?.toLowerCase();
    
    if (!name) {
      throw new Error(
        'No wallet configured.\n\n' +
        'To set up a wallet, install evm-wallet-skill:\n' +
        '  git clone https://github.com/amped-finance/evm-wallet-skill.git ~/.openclaw/skills/evm-wallet-skill\n' +
        '  cd ~/.openclaw/skills/evm-wallet-skill && npm install\n' +
        '  node src/setup.js'
      );
    }
    
    const wallet = this.wallets.get(name);
    if (!wallet) {
      const available = Array.from(this.wallets.keys()).join(', ') || '(none)';
      throw new Error(`Wallet "${name}" not found. Available wallets: ${available}`);
    }
    
    return wallet;
  }

  /**
   * Check if a wallet exists
   */
  async has(nickname: string): Promise<boolean> {
    await this.initialize();
    return this.wallets.has(nickname.toLowerCase());
  }

  /**
   * List all available wallets
   */
  async listWallets(): Promise<WalletInfo[]> {
    await this.initialize();
    
    const wallets: WalletInfo[] = [];
    
    for (const [name, backend] of this.wallets) {
      try {
        // Add timeout for slow backends (like Bankr)
        const addressPromise = backend.getAddress();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        
        const address = await Promise.race([addressPromise, timeoutPromise]);
        
        // Get Solana address for Bankr wallets
        let solanaAddress: string | undefined;
        if (backend.type === 'bankr' && (backend as any).getSolanaAddress) {
          try {
            solanaAddress = await (backend as any).getSolanaAddress() || undefined;
          } catch (e) {
            console.warn(`[WalletManager] Failed to get Solana address for ${name}`);
          }
        }
        
        wallets.push({
          nickname: name,
          type: backend.type,
          address,
          chains: [...backend.supportedChains],
          isDefault: name === this.defaultWallet,
          solanaAddress,
        });
      } catch (error) {
        // Include wallet with placeholder address if we can't get it
        console.warn(`[WalletManager] Failed to get address for "${name}": ${error}`);
        wallets.push({
          nickname: name,
          type: backend.type,
          address: '0x...' as Address, // Placeholder
          chains: [...backend.supportedChains],
          isDefault: name === this.defaultWallet,
        });
      }
    }
    
    return wallets;
  }

  /**
   * Get the default wallet nickname
   */
  async getDefaultWalletName(): Promise<string | null> {
    await this.initialize();
    return this.defaultWallet;
  }

  /**
   * Register a new wallet backend
   */
  registerWallet(nickname: string, backend: IWalletBackend): void {
    this.wallets.set(nickname.toLowerCase(), backend);
    console.log(`[WalletManager] Registered wallet: ${nickname}`);
  }

  /**
   * Get available wallet IDs (nicknames)
   * Synchronous version - requires prior initialization
   */
  getAvailableWalletIds(): string[] {
    return Array.from(this.wallets.keys());
  }

  /**
   * Add a new wallet to the config file
   */
  async addWallet(nickname: string, config: WalletConfig): Promise<void> {
    await this.initialize();
    
    const normalizedName = nickname.toLowerCase();
    
    // Check if wallet already exists
    if (this.wallets.has(normalizedName)) {
      throw new Error(`Wallet "${nickname}" already exists. Use rename to change it.`);
    }
    
    // Create the backend to validate config
    const backend = this.createBackendFromConfig(normalizedName, config);
    if (!backend) {
      throw new Error(`Failed to create wallet backend for "${nickname}"`);
    }
    
    // Validate the backend works
    const ready = await backend.isReady();
    if (!ready) {
      throw new Error(`Wallet "${nickname}" configuration is invalid or not accessible`);
    }
    
    // Load existing config
    const fileConfig = this.loadConfigFromFile();
    
    // Add new wallet
    fileConfig.wallets[normalizedName] = config;
    
    // Save config
    this.saveConfigToFile(fileConfig);
    
    // Register in memory
    this.wallets.set(normalizedName, backend);
    
    console.log(`[WalletManager] Added wallet "${nickname}"`);
  }

  /**
   * Rename a wallet
   */
  async renameWallet(currentNickname: string, newNickname: string): Promise<void> {
    await this.initialize();
    
    const currentName = currentNickname.toLowerCase();
    const newName = newNickname.toLowerCase();
    
    // Check source exists
    if (!this.wallets.has(currentName)) {
      throw new Error(`Wallet "${currentNickname}" not found`);
    }
    
    // Check target doesn't exist
    if (this.wallets.has(newName)) {
      throw new Error(`Wallet "${newNickname}" already exists`);
    }
    
    // Load config
    const fileConfig = this.loadConfigFromFile();
    
    // Move wallet config
    if (fileConfig.wallets[currentName]) {
      fileConfig.wallets[newName] = fileConfig.wallets[currentName];
      delete fileConfig.wallets[currentName];
    } else {
      // Wallet was auto-discovered, need to add it to config
      const backend = this.wallets.get(currentName)!;
      const config = await this.backendToConfig(backend);
      fileConfig.wallets[newName] = config;
    }
    
    // Update default if needed
    if (fileConfig.default === currentName) {
      fileConfig.default = newName;
    }
    if (this.defaultWallet === currentName) {
      this.defaultWallet = newName;
    }
    
    // Save config
    this.saveConfigToFile(fileConfig);
    
    // Update in-memory
    const backend = this.wallets.get(currentName)!;
    this.wallets.delete(currentName);
    this.wallets.set(newName, backend);
    
    console.log(`[WalletManager] Renamed wallet "${currentNickname}" to "${newNickname}"`);
  }

  /**
   * Remove a wallet from config
   */
  async removeWallet(nickname: string): Promise<void> {
    await this.initialize();
    
    const name = nickname.toLowerCase();
    
    if (!this.wallets.has(name)) {
      throw new Error(`Wallet "${nickname}" not found`);
    }
    
    // Load config
    const fileConfig = this.loadConfigFromFile();
    
    // Remove from config
    delete fileConfig.wallets[name];
    
    // Update default if needed
    if (fileConfig.default === name) {
      delete fileConfig.default;
    }
    if (this.defaultWallet === name) {
      this.defaultWallet = null;
      this.determineDefault();
    }
    
    // Save config
    this.saveConfigToFile(fileConfig);
    
    // Remove from memory
    this.wallets.delete(name);
    
    console.log(`[WalletManager] Removed wallet "${nickname}"`);
  }

  /**
   * Set the default wallet
   */
  async setDefaultWallet(nickname: string): Promise<void> {
    await this.initialize();
    
    const name = nickname.toLowerCase();
    
    if (!this.wallets.has(name)) {
      throw new Error(`Wallet "${nickname}" not found`);
    }
    
    // Load config
    const fileConfig = this.loadConfigFromFile();
    
    // Update default
    fileConfig.default = name;
    this.defaultWallet = name;
    
    // Save config
    this.saveConfigToFile(fileConfig);
    
    console.log(`[WalletManager] Set default wallet to "${nickname}"`);
  }

  /**
   * Load config from file (creates empty if doesn't exist)
   */
  private loadConfigFromFile(): WalletsConfigFile {
    if (!existsSync(CONFIG_PATH)) {
      return { wallets: {} };
    }
    
    try {
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(content) as WalletsConfigFile;
    } catch {
      return { wallets: {} };
    }
  }

  /**
   * Save config to file
   */
  private saveConfigToFile(config: WalletsConfigFile): void {
    // Ensure directory exists
    const dir = dirname(CONFIG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`[WalletManager] Config saved to ${CONFIG_PATH}`);
  }

  /**
   * Convert a backend to config (for saving auto-discovered wallets)
   */
  private async backendToConfig(backend: IWalletBackend): Promise<WalletConfig> {
    const config: WalletConfig = {
      source: backend.type,
      chains: [...backend.supportedChains],
    };
    
    // For evm-wallet-skill, just reference the default path
    if (backend.type === 'evm-wallet-skill') {
      config.path = EVM_WALLET_PATH;
    }
    
    // For env backends, we need address (privateKey should NOT be saved)
    if (backend.type === 'env') {
      config.address = await backend.getAddress();
      // Note: We don't save privateKey to config for security
    }
    
    // For bankr, we need the API key
    if (backend.type === 'bankr') {
      config.apiKey = process.env.BANKR_API_KEY;
    }
    
    return config;
  }

  /**
   * Reset the manager (for testing)
   */
  reset(): void {
    this.wallets.clear();
    this.defaultWallet = null;
    this.initialized = false;
  }
}

/**
 * Get the singleton WalletManager instance
 */
export function getWalletManager(): WalletManager {
  if (!instance) {
    instance = new WalletManager();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetWalletManager(): void {
  if (instance) {
    instance.reset();
    instance = null;
  }
}
