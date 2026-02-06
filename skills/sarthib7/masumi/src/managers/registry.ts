import { EventEmitter } from 'events'

import type { Network } from '../../../shared/types/config'
import { ApiClient } from '../utils/api-client'

/**
 * Agent capability definition
 */
export interface AgentCapability {
  name: string
  version: string
  description?: string
}

/**
 * Agent author information
 */
export interface AgentAuthor {
  name: string
  contactEmail?: string
  website?: string
}

/**
 * Pricing configuration
 */
export interface AgentPricing {
  pricingType: 'Fixed' | 'Variable' | 'Free'
  amounts?: Array<{
    amount: string // in lovelace
    unit: string
  }>
  description?: string
}

/**
 * Agent registration parameters
 */
export interface RegisterAgentParams {
  network: Network
  name: string
  description: string
  apiBaseUrl: string
  Capability: AgentCapability
  Author: AgentAuthor
  Pricing: AgentPricing
  tags?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Registered agent response
 */
export interface RegisteredAgent {
  agentIdentifier: string
  state: 'Pending' | 'Active' | 'Suspended' | 'Inactive'
  network: Network
  name: string
  description: string
  apiBaseUrl: string
  Capability: AgentCapability
  Author: AgentAuthor
  Pricing: AgentPricing
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

/**
 * Agent search/filter options
 */
export interface AgentSearchOptions {
  network?: Network
  capability?: string
  tags?: string[]
  pricingType?: 'Fixed' | 'Variable' | 'Free'
  state?: 'Pending' | 'Active' | 'Suspended' | 'Inactive'
  limit?: number
  offset?: number
}

/**
 * Agent update parameters
 */
export interface UpdateAgentParams {
  agentIdentifier: string
  network: Network
  description?: string
  apiBaseUrl?: string
  Capability?: AgentCapability
  Pricing?: AgentPricing
  tags?: string[]
  metadata?: Record<string, unknown>
  state?: 'Active' | 'Inactive'
}

/**
 * RegistryManager configuration
 */
export interface RegistryManagerConfig {
  network: Network
  registryServiceUrl?: string
  registryApiKey: string
}

/**
 * RegistryManager Events
 */
export interface RegistryManagerEvents {
  'agent:registered': (agent: RegisteredAgent) => void
  'agent:updated': (agent: RegisteredAgent) => void
  'agent:state_changed': (data: {
    agentIdentifier: string
    previousState: string
    newState: string
  }) => void
  'registry:error': (error: Error) => void
}

/**
 * RegistryManager - Handles agent registration and discovery on Masumi network
 *
 * Features:
 * - Register agents on Masumi registry
 * - Get agent details
 * - Search and discover agents
 * - Update agent metadata
 * - Event-driven architecture
 *
 * @example
 * ```typescript
 * const registry = new RegistryManager({
 *   network: 'Preprod',
 *   registryApiKey: process.env.MASUMI_PAYMENT_API_KEY,
 * });
 *
 * // Register agent
 * const agent = await registry.registerAgent({
 *   network: 'Preprod',
 *   name: 'MyAgent',
 *   description: 'AI agent for data analysis',
 *   apiBaseUrl: 'https://myagent.com',
 *   Capability: { name: 'general-purpose', version: '1.0.0' },
 *   Author: { name: 'Agent Team', contactEmail: 'team@example.com' },
 *   Pricing: { pricingType: 'Fixed', amounts: [{ amount: '1000000', unit: 'lovelace' }] },
 * });
 *
 * console.log('Agent registered:', agent.agentIdentifier);
 * ```
 */
export class RegistryManager extends EventEmitter {
  private config: RegistryManagerConfig
  private client: ApiClient
  private registeredAgents: Map<string, RegisteredAgent> = new Map()

  constructor(config: RegistryManagerConfig) {
    super()

    // Set default registry service URL if not provided (use payment service URL)
    // NO centralized default - user must provide their own service URL
    const registryServiceUrl = config.registryServiceUrl || config.paymentServiceUrl

    if (!registryServiceUrl) {
      throw new Error(
        'Registry service URL not configured. ' +
          'You must provide MASUMI_PAYMENT_SERVICE_URL (your self-hosted payment service URL). ' +
          'Example: http://localhost:3000/api/v1 or https://your-service.railway.app/api/v1',
      )
    }

    this.config = {
      ...config,
      registryServiceUrl,
    }

    // Initialize API client
    this.client = new ApiClient({
      baseUrl: registryServiceUrl,
      apiKey: config.registryApiKey,
      additionalHeaders: {
        token: config.registryApiKey,
      },
    })
  }

  /**
   * Register a new agent on the Masumi network
   *
   * @param params - Agent registration parameters
   * @returns Registered agent details including agentIdentifier
   *
   * @example
   * ```typescript
   * const agent = await registry.registerAgent({
   *   network: 'Preprod',
   *   name: 'DataAnalysisAgent',
   *   description: 'AI agent specialized in data analysis',
   *   apiBaseUrl: 'https://my-agent-api.com',
   *   Capability: {
   *     name: 'data-analysis',
   *     version: '1.0.0',
   *   },
   *   Author: {
   *     name: 'AI Team',
   *     contactEmail: 'team@example.com',
   *   },
   *   Pricing: {
   *     pricingType: 'Fixed',
   *     amounts: [{ amount: '1000000', unit: 'lovelace' }],
   *   },
   * });
   * ```
   */
  async registerAgent(params: RegisterAgentParams): Promise<RegisteredAgent> {
    try {
      // API returns: { status: string, data: RegistryEntry }
      const response = await this.client.post<{
        status: string
        data: {
          agentIdentifier: string | null
          name: string
          description: string | null
          apiBaseUrl: string
          Capability: { name: string | null; version: string | null }
          Author: {
            name: string
            contactEmail: string | null
            contactOther: string | null
            organization: string | null
          }
          state: string
          Tags: string[]
          [key: string]: unknown
        }
      }>('/registry', params)

      const registryEntry = response.data

      // Map RegistryEntry to RegisteredAgent format
      const agent: RegisteredAgent = {
        agentIdentifier: registryEntry.agentIdentifier || '',
        state: registryEntry.state as RegisteredAgent['state'],
        network: params.network,
        name: registryEntry.name,
        description: registryEntry.description || '',
        apiBaseUrl: registryEntry.apiBaseUrl,
        Capability: {
          name: registryEntry.Capability.name || '',
          version: registryEntry.Capability.version || '',
        },
        Author: {
          name: registryEntry.Author.name,
          contactEmail: registryEntry.Author.contactEmail || undefined,
          website: registryEntry.Author.contactOther || undefined,
        },
        Pricing: {
          pricingType: params.Pricing.pricingType === 'Free' ? 'Free' : 'Fixed',
          amounts:
            params.Pricing.pricingType === 'Fixed' ? params.Pricing.amounts || [] : undefined,
        },
        tags: params.tags,
      }

      // Store in local cache
      this.registeredAgents.set(agent.agentIdentifier, agent)

      // Emit event
      this.emit('agent:registered', agent)

      return agent
    } catch (error) {
      this.emit('registry:error', error as Error)
      throw error
    }
  }

  /**
   * Get details of a specific agent
   *
   * @param agentIdentifier - The agent identifier
   * @param network - Network the agent is on (Preprod or Mainnet)
   * @returns Agent details
   *
   * @example
   * ```typescript
   * const agent = await registry.getAgent('agent_abc123xyz', 'Preprod');
   * console.log('Agent state:', agent.state);
   * ```
   */
  async getAgent(agentIdentifier: string, network: Network): Promise<RegisteredAgent> {
    try {
      // The API doesn't have GET /registry/{agentIdentifier}
      // Instead, we need to search and filter by agentIdentifier
      // Or use GET /registry/wallet if we have the walletVkey
      // For now, we'll search and find the matching agent
      const response = await this.client.get<{
        status: string
        data: {
          Assets: Array<{
            agentIdentifier: string | null
            name: string
            description: string | null
            apiBaseUrl: string
            Capability: { name: string | null; version: string | null }
            Author: {
              name: string
              contactEmail: string | null
              contactOther: string | null
              organization: string | null
            }
            state: string
            Tags: string[]
            [key: string]: unknown
          }>
        }
      }>('/registry', {
        network,
      })

      // Find the agent by identifier
      const registryEntry = response.data?.Assets?.find(
        (asset) => asset.agentIdentifier === agentIdentifier,
      )

      if (!registryEntry) {
        throw new Error(`Agent not found: ${agentIdentifier}`)
      }

      // Map RegistryEntry to RegisteredAgent format
      const agent: RegisteredAgent = {
        agentIdentifier: registryEntry.agentIdentifier!,
        state: registryEntry.state as RegisteredAgent['state'],
        network,
        name: registryEntry.name,
        description: registryEntry.description || '',
        apiBaseUrl: registryEntry.apiBaseUrl,
        Capability: {
          name: registryEntry.Capability.name || '',
          version: registryEntry.Capability.version || '',
        },
        Author: {
          name: registryEntry.Author.name,
          contactEmail: registryEntry.Author.contactEmail || undefined,
          website: registryEntry.Author.contactOther || undefined,
        },
        Pricing: {
          pricingType: 'Fixed', // Default, actual pricing comes from registry metadata
          amounts: [],
        },
        tags: registryEntry.Tags,
      }

      // Update local cache
      this.registeredAgents.set(agent.agentIdentifier, agent)

      return agent
    } catch (error) {
      this.emit('registry:error', error as Error)
      throw error
    }
  }

  /**
   * Search for agents on the network
   *
   * @param options - Search filters and pagination
   * @returns List of matching agents
   *
   * @example
   * ```typescript
   * // Search for data analysis agents
   * const agents = await registry.searchAgents({
   *   network: 'Preprod',
   *   capability: 'data-analysis',
   *   state: 'Active',
   *   limit: 10,
   * });
   *
   * agents.forEach(agent => {
   *   console.log(`${agent.name}: ${agent.description}`);
   * });
   * ```
   */
  async searchAgents(options: AgentSearchOptions = {}): Promise<RegisteredAgent[]> {
    try {
      const queryParams: Record<string, string> = {}

      if (options.network) queryParams.network = options.network
      if (options.capability) queryParams.capability = options.capability
      if (options.pricingType) queryParams.pricingType = options.pricingType
      if (options.state) queryParams.state = options.state
      if (options.limit) queryParams.limit = options.limit.toString()
      if (options.offset) queryParams.offset = options.offset.toString()
      if (options.tags) queryParams.tags = options.tags.join(',')

      // API returns: { status: string, data: { Assets: RegistryEntry[] } }
      const response = await this.client.get<{
        status: string
        data: {
          Assets: Array<{
            agentIdentifier: string | null
            name: string
            description: string | null
            apiBaseUrl: string
            Capability: { name: string | null; version: string | null }
            Author: {
              name: string
              contactEmail: string | null
              contactOther: string | null
              organization: string | null
            }
            state: string
            Tags: string[]
            AgentPricing: {
              pricingType: 'Fixed' | 'Free'
              Pricing?: Array<{ amount: string; unit: string }>
            }
            [key: string]: unknown
          }>
        }
      }>('/registry', queryParams)

      // Map RegistryEntry[] to RegisteredAgent[]
      return (response.data?.Assets || []).map((entry) => ({
        agentIdentifier: entry.agentIdentifier || '',
        state: entry.state as RegisteredAgent['state'],
        network: options.network || 'Preprod',
        name: entry.name,
        description: entry.description || '',
        apiBaseUrl: entry.apiBaseUrl,
        Capability: {
          name: entry.Capability.name || '',
          version: entry.Capability.version || '',
        },
        Author: {
          name: entry.Author.name,
          contactEmail: entry.Author.contactEmail || undefined,
          website: entry.Author.contactOther || undefined,
        },
        Pricing: {
          pricingType: entry.AgentPricing.pricingType === 'Free' ? 'Free' : 'Fixed',
          amounts: entry.AgentPricing.Pricing || [],
        },
        tags: entry.Tags,
      }))
    } catch (error) {
      this.emit('registry:error', error as Error)
      throw error
    }
  }

  /**
   * List all agents (paginated)
   *
   * @param network - Network to filter by
   * @param limit - Maximum number of agents to return
   * @param offset - Offset for pagination
   * @returns List of agents
   *
   * @example
   * ```typescript
   * const agents = await registry.listAgents('Preprod', 20, 0);
   * console.log(`Found ${agents.length} agents`);
   * ```
   */
  async listAgents(network: Network, limit = 10, offset = 0): Promise<RegisteredAgent[]> {
    return this.searchAgents({ network, limit, offset })
  }

  /**
   * Update agent metadata
   *
   * NOTE: The Masumi API does not support PATCH /registry/{id} endpoint.
   * To update an agent, you must re-register it with updated metadata.
   * This method will throw an error to indicate that updates are not supported.
   *
   * @param params - Update parameters
   * @returns Updated agent details
   *
   * @example
   * ```typescript
   * // Updates are not supported - must re-register
   * // Use registerAgent() with updated information instead
   * ```
   */
  async updateAgent(params: UpdateAgentParams): Promise<RegisteredAgent> {
    // The Masumi API does not have a PATCH endpoint for registry updates
    // Agents must be re-registered with updated metadata
    throw new Error(
      'Agent metadata updates are not supported via API. ' +
        'To update an agent, you must re-register it using registerAgent() with updated information. ' +
        'Alternatively, use the Masumi Explorer or payment service admin interface.',
    )
  }

  /**
   * Activate an agent (set state to Active)
   *
   * @param agentIdentifier - The agent identifier
   * @param network - Network the agent is on
   * @returns Updated agent
   */
  async activateAgent(agentIdentifier: string, network: Network): Promise<RegisteredAgent> {
    return this.updateAgent({
      agentIdentifier,
      network,
      state: 'Active',
    })
  }

  /**
   * Deactivate an agent (set state to Inactive)
   *
   * @param agentIdentifier - The agent identifier
   * @param network - Network the agent is on
   * @returns Updated agent
   */
  async deactivateAgent(agentIdentifier: string, network: Network): Promise<RegisteredAgent> {
    return this.updateAgent({
      agentIdentifier,
      network,
      state: 'Inactive',
    })
  }

  /**
   * Get locally cached agents
   *
   * @returns Map of cached agents
   */
  getCachedAgents(): Map<string, RegisteredAgent> {
    return new Map(this.registeredAgents)
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.registeredAgents.clear()
  }

  /**
   * Close the registry manager and clean up resources
   */
  async close(): Promise<void> {
    this.clearCache()
    this.removeAllListeners()
  }
}
