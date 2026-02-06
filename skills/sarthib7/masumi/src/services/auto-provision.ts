import {
  AutoProvisionParams,
  MasumiPluginConfig,
  PricingTier,
  ProvisionedAgent,
} from '../../../shared/types/config'
import { ApiClient } from '../utils/api-client'

/**
 * Agent identity for auto-provisioning
 */
interface AgentIdentity {
  id: string
  name: string
  description?: string
}

/**
 * Wallet credentials (encrypted)
 */
interface WalletCredentials {
  address: string
  vkey: string
  seed?: string // Encrypted seed phrase
}

/**
 * Pricing configuration
 */
interface PricingConfig {
  pricingType: 'Fixed' | 'Free'
  amounts?: Array<{ amount: string; unit: string }>
}

/**
 * AutoProvisionService - THE KEY DIFFERENTIATOR
 *
 * This service enables zero-config agent onboarding by:
 * 1. Generating/retrieving agent identity
 * 2. Provisioning a Cardano wallet
 * 3. Registering the agent on Masumi
 * 4. Linking MoltBook identity (optional)
 * 5. Securely storing credentials
 *
 * USAGE:
 *   const service = new AutoProvisionService(config);
 *   const agent = await service.provision();
 *   // Agent is now ready to accept payments!
 */
export class AutoProvisionService {
  private config: MasumiPluginConfig
  private registryClient: ApiClient

  constructor(config: MasumiPluginConfig) {
    this.config = config

    // Use user's own service URL (no centralized default)
    const serviceUrl = config.registryServiceUrl || config.paymentServiceUrl
    if (!serviceUrl) {
      throw new Error(
        'Payment service URL is required. ' +
          'You must provide YOUR self-hosted payment service URL via MASUMI_PAYMENT_SERVICE_URL. ' +
          'Examples: http://localhost:3000/api/v1 (local) or https://your-service.railway.app/api/v1 (Railway).',
      )
    }

    this.registryClient = new ApiClient({
      baseUrl: serviceUrl,
      apiKey: config.registryApiKey || config.paymentApiKey,
    })
  }

  /**
   * One-click agent provisioning
   *
   * Returns everything needed to start accepting payments
   */
  async provision(params: AutoProvisionParams = {}): Promise<ProvisionedAgent> {
    // Step 1: Resolve or generate identity
    const identity = await this.resolveIdentity(params)

    // Step 2: Provision wallet (Cardano HD wallet)
    const wallet = await this.provisionWallet(identity.id)

    // Step 3: Register on Masumi
    const registration = await this.registerAgent({
      identity,
      wallet,
      capabilities: params.capabilities || (await this.detectCapabilities()),
      pricing: this.getDefaultPricing(params.pricingTier),
    })

    // Step 4: Link MoltBook (if available)
    if (params.moltbookToken) {
      await this.linkMoltBook(registration.agentIdentifier, params.moltbookToken)
    }

    // Step 5: Encrypt and store credentials
    const credentials = await this.secureStore({
      agentIdentifier: registration.agentIdentifier,
      wallet,
      apiKey: this.config.paymentApiKey || 'auto-generated', // TODO: Generate API key
    })

    return {
      agentIdentifier: registration.agentIdentifier,
      walletAddress: wallet.address,
      registryUrl: `https://sokosumi.com/agents/${registration.agentIdentifier}`,
      status: 'active',
      credentialsPath: credentials.path,
    }
  }

  /**
   * Step 1: Resolve or generate agent identity
   */
  private async resolveIdentity(params: AutoProvisionParams): Promise<AgentIdentity> {
    // If name provided, use it
    if (params.agentName) {
      return {
        id: this.generateAgentId(params.agentName),
        name: params.agentName,
      }
    }

    // Try to get from config
    if (this.config.agentName) {
      return {
        id: this.generateAgentId(this.config.agentName),
        name: this.config.agentName,
        description: this.config.agentDescription,
      }
    }

    // Generate default name
    const defaultName = `Agent-${Date.now().toString(36)}`
    return {
      id: this.generateAgentId(defaultName),
      name: defaultName,
      description: 'Auto-provisioned OpenClaw agent',
    }
  }

  /**
   * Generate agent identifier from name
   */
  private generateAgentId(name: string): string {
    return `agent_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`
  }

  /**
   * Step 2: Provision Cardano wallet
   *
   * Generates a new Cardano wallet using Mesh SDK:
   * - Creates 24-word BIP39 mnemonic
   * - Derives HD wallet address
   * - Extracts verification key (vkey)
   *
   * Uses the exact same method as Masumi Payment Service.
   */
  private async provisionWallet(agentId: string): Promise<WalletCredentials> {
    const { generateWallet } = await import('../utils/wallet-generator')

    // Generate new wallet
    const wallet = await generateWallet(this.config.network)

    console.log(`Wallet generated for ${agentId}`)
    console.log(`  Address: ${wallet.address}`)
    console.log(`  VKey: ${wallet.vkey}`)
    console.log(`  Network: ${wallet.network}`)
    console.log(`  IMPORTANT: Backup your mnemonic securely!`)

    return {
      address: wallet.address,
      vkey: wallet.vkey,
      seed: wallet.mnemonic, // Will be encrypted in secureStore
    }
  }

  /**
   * Step 3: Register agent on Masumi using RegistryManager
   */
  private async registerAgent(params: {
    identity: AgentIdentity
    wallet: WalletCredentials
    capabilities: string[]
    pricing: PricingConfig
  }): Promise<{ agentIdentifier: string; state: string }> {
    const { RegistryManager } = await import('../managers/registry')

    const registry = new RegistryManager({
      network: this.config.network,
      registryApiKey: this.config.registryApiKey || this.config.paymentApiKey || '',
    })

    try {
      const agent = await registry.registerAgent({
        network: this.config.network,
        name: params.identity.name,
        description:
          params.identity.description || 'Auto-provisioned OpenClaw agent with Masumi payments',
        apiBaseUrl: 'https://api.example.com', // TODO: Get from OpenClaw context
        Capability: {
          name: params.capabilities.join(', '),
          version: '1.0.0',
        },
        Author: {
          name: 'OpenClaw Agent',
          contactEmail: '',
        },
        Pricing: params.pricing,
      })

      console.log(`Agent registered on Masumi network`)
      console.log(`  Identifier: ${agent.agentIdentifier}`)
      console.log(`  State: ${agent.state}`)

      return {
        agentIdentifier: agent.agentIdentifier,
        state: agent.state,
      }
    } finally {
      await registry.close()
    }
  }

  /**
   * Step 4: Link MoltBook identity
   */
  private async linkMoltBook(agentIdentifier: string, moltbookToken: string): Promise<void> {
    // TODO: Implement MoltBook linking
    // This would involve calling the Masumi API to associate the MoltBook identity
    // with the Masumi agent identifier

    console.log(`Linking MoltBook identity for agent ${agentIdentifier}`)
    // Placeholder - needs implementation
  }

  /**
   * Step 5: Securely store credentials
   *
   * Encrypts and stores credentials in ~/.openclaw/credentials/masumi/
   * - Mnemonic is encrypted with AES-256-GCM
   * - File permissions set to 600 (owner read/write only)
   * - Network-specific files for safety
   */
  private async secureStore(credentials: {
    agentIdentifier: string
    wallet: WalletCredentials
    apiKey: string
  }): Promise<{ path: string }> {
    const { saveCredentials } = await import('../utils/credential-store')

    const path = await saveCredentials({
      agentIdentifier: credentials.agentIdentifier,
      network: this.config.network,
      walletAddress: credentials.wallet.address,
      walletVkey: credentials.wallet.vkey,
      mnemonic: credentials.wallet.seed || '',
      apiKey: credentials.apiKey,
      registryUrl: `https://sokosumi.com/agents/${credentials.agentIdentifier}`,
    })

    console.log(`Credentials stored securely at: ${path}`)
    console.log(`  File permissions: 600 (owner read/write only)`)
    console.log(`  Mnemonic: Encrypted with AES-256-GCM`)

    return { path }
  }

  /**
   * Auto-detect agent capabilities from skills/tools
   */
  private async detectCapabilities(): Promise<string[]> {
    // TODO: Integrate with OpenClaw to detect installed skills/tools
    // For now, return default capabilities
    return ['general-purpose', 'text-processing', 'api-integration']
  }

  /**
   * Get default pricing based on tier
   */
  private getDefaultPricing(tier: PricingTier = 'free'): PricingConfig {
    const tiers: Record<PricingTier, PricingConfig> = {
      free: {
        pricingType: 'Free',
        amounts: [],
      },
      basic: {
        pricingType: 'Fixed',
        amounts: [{ amount: '1000000', unit: 'lovelace' }], // 1 ADA
      },
      premium: {
        pricingType: 'Fixed',
        amounts: [{ amount: '5000000', unit: 'lovelace' }], // 5 ADA
      },
    }

    return tiers[tier]
  }

  /**
   * Check if agent is already provisioned
   *
   * Checks both config and credential store
   */
  async isProvisioned(): Promise<boolean> {
    // Check config first
    if (this.config.agentIdentifier && this.config.sellerVkey && this.config.paymentApiKey) {
      return true
    }

    // Check credential store
    if (this.config.agentIdentifier) {
      const { credentialsExist } = await import('../utils/credential-store')
      return await credentialsExist(this.config.agentIdentifier, this.config.network)
    }

    return false
  }

  /**
   * Get existing provision status
   *
   * Loads credentials from store if available
   */
  async getProvisionStatus(): Promise<ProvisionedAgent | null> {
    if (!(await this.isProvisioned())) {
      return null
    }

    // Try to load from credential store
    if (this.config.agentIdentifier) {
      try {
        const { loadCredentials } = await import('../utils/credential-store')
        const creds = await loadCredentials(this.config.agentIdentifier, this.config.network)

        return {
          agentIdentifier: creds.agentIdentifier,
          walletAddress: creds.walletAddress,
          registryUrl: creds.registryUrl || `https://sokosumi.com/agents/${creds.agentIdentifier}`,
          status: 'active',
        }
      } catch (error) {
        // Fall back to config
        return {
          agentIdentifier: this.config.agentIdentifier,
          walletAddress: 'addr1...', // Can't derive from config alone
          registryUrl: `https://sokosumi.com/agents/${this.config.agentIdentifier}`,
          status: 'active',
        }
      }
    }

    return null
  }
}
