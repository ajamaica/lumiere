/**
 * LLM Provider Management
 *
 * Manages multiple LLM providers (LMStudio, Vertex AI, etc.)
 * and allows runtime switching between them.
 */

const { LMStudioClient } = require('../lmstudio')
const { VertexAIClient } = require('../vertex-ai')

/**
 * Provider configuration registry
 */
const PROVIDER_REGISTRY = {
  lmstudio: {
    name: 'LMStudio',
    description: 'Local LLM inference via LMStudio',
    clientClass: LMStudioClient,
    requiresCredentials: false,
    defaultConfig: {
      baseUrl: 'http://localhost:1234/v1',
      model: 'local-model',
    },
  },
  vertex: {
    name: 'Google Vertex AI',
    description: 'Google Cloud Vertex AI Gemini models',
    clientClass: VertexAIClient,
    requiresCredentials: true,
    aliases: ['google', 'gemini'],
    defaultConfig: {
      location: 'global',
      model: 'gemini-3-pro-preview',
    },
  },
  openai: {
    name: 'OpenAI',
    description: 'OpenAI GPT models (API compatible)',
    clientClass: LMStudioClient, // Uses OpenAI-compatible API
    requiresCredentials: true,
    defaultConfig: {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
    },
  },
  anthropic: {
    name: 'Anthropic Claude',
    description: 'Anthropic Claude models (via OpenAI-compatible proxy)',
    clientClass: LMStudioClient,
    requiresCredentials: true,
    defaultConfig: {
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-opus-20240229',
    },
  },
}

/**
 * ProviderManager - Manages LLM provider instances and switching
 */
class ProviderManager {
  /**
   * Create a ProviderManager
   * @param {Object} options - Configuration options
   * @param {Object} options.providers - Provider-specific configurations
   * @param {string} options.defaultProvider - Default provider to use
   * @param {Function} options.onProviderChange - Callback when provider changes
   */
  constructor(options = {}) {
    this.providerConfigs = options.providers || {}
    this.defaultProvider = options.defaultProvider || 'lmstudio'
    this.onProviderChange = options.onProviderChange || null

    // Active provider tracking
    this.activeProviderId = null
    this.activeClient = null

    // Cache of initialized clients
    this.clientCache = new Map()

    // Provider status tracking
    this.providerStatus = new Map()
  }

  /**
   * Get list of available providers
   * @returns {Array<Object>} Array of provider info objects
   */
  getAvailableProviders() {
    return Object.entries(PROVIDER_REGISTRY).map(([id, info]) => ({
      id,
      name: info.name,
      description: info.description,
      requiresCredentials: info.requiresCredentials,
      isConfigured: this._isProviderConfigured(id),
      isActive: id === this.activeProviderId,
      status: this.providerStatus.get(id) || 'unknown',
    }))
  }

  /**
   * Check if a provider is configured
   * @private
   */
  _isProviderConfigured(providerId) {
    const config = this.providerConfigs[providerId]
    const registry = PROVIDER_REGISTRY[providerId]

    if (!registry) return false

    // Non-credential providers are always configured
    if (!registry.requiresCredentials) return true

    // Check for required credentials
    if (providerId === 'vertex') {
      return !!(config?.credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS)
    }

    if (providerId === 'openai') {
      return !!(config?.apiKey || process.env.OPENAI_API_KEY)
    }

    if (providerId === 'anthropic') {
      return !!(config?.apiKey || process.env.ANTHROPIC_API_KEY)
    }

    return !!config
  }

  /**
   * Resolve provider ID from aliases
   * @private
   */
  _resolveProviderId(id) {
    if (PROVIDER_REGISTRY[id]) return id

    // Check aliases
    for (const [providerId, info] of Object.entries(PROVIDER_REGISTRY)) {
      if (info.aliases && info.aliases.includes(id)) {
        return providerId
      }
    }

    return null
  }

  /**
   * Get provider configuration
   * @param {string} providerId - Provider identifier
   * @returns {Object} Merged configuration
   */
  getProviderConfig(providerId) {
    const resolvedId = this._resolveProviderId(providerId)
    if (!resolvedId) return null

    const registry = PROVIDER_REGISTRY[resolvedId]
    const userConfig = this.providerConfigs[resolvedId] || {}

    return {
      ...registry.defaultConfig,
      ...userConfig,
    }
  }

  /**
   * Create a client instance for a provider
   * @private
   */
  _createClient(providerId, config) {
    const resolvedId = this._resolveProviderId(providerId)
    if (!resolvedId) {
      throw new Error(`Unknown provider: ${providerId}`)
    }

    const registry = PROVIDER_REGISTRY[resolvedId]
    return new registry.clientClass(config)
  }

  /**
   * Initialize a provider and test connection
   * @param {string} providerId - Provider identifier
   * @param {Object} config - Optional config override
   * @returns {Promise<Object>} Result with client and status
   */
  async initializeProvider(providerId, config = null) {
    const resolvedId = this._resolveProviderId(providerId)
    if (!resolvedId) {
      return { success: false, error: `Unknown provider: ${providerId}` }
    }

    const mergedConfig = config || this.getProviderConfig(resolvedId)

    try {
      console.log(`[ProviderManager] Initializing ${resolvedId}...`)
      const client = this._createClient(resolvedId, mergedConfig)

      // Test connection
      const connected = await client.isConnected()

      if (connected) {
        this.clientCache.set(resolvedId, client)
        this.providerStatus.set(resolvedId, 'connected')
        console.log(`[ProviderManager] ${resolvedId} connected successfully`)

        // Get model info if available
        let modelName = mergedConfig.model || 'unknown'
        try {
          const currentModel = await client.getCurrentModel()
          if (currentModel) modelName = currentModel
        } catch (e) {
          // Ignore model fetch errors
        }

        return {
          success: true,
          client,
          model: modelName,
          provider: resolvedId,
        }
      } else {
        this.providerStatus.set(resolvedId, 'disconnected')
        return { success: false, error: 'Connection failed' }
      }
    } catch (error) {
      this.providerStatus.set(resolvedId, 'error')
      console.error(`[ProviderManager] ${resolvedId} initialization failed:`, error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Switch to a different provider
   * @param {string} providerId - Provider identifier
   * @param {Object} config - Optional config override
   * @returns {Promise<Object>} Result with new client
   */
  async switchProvider(providerId, config = null) {
    const resolvedId = this._resolveProviderId(providerId)
    if (!resolvedId) {
      return { success: false, error: `Unknown provider: ${providerId}` }
    }

    // Check if already cached
    if (this.clientCache.has(resolvedId) && !config) {
      const client = this.clientCache.get(resolvedId)

      // Verify still connected
      try {
        const connected = await client.isConnected()
        if (connected) {
          const previousProvider = this.activeProviderId
          this.activeProviderId = resolvedId
          this.activeClient = client

          if (this.onProviderChange) {
            this.onProviderChange({
              previousProvider,
              newProvider: resolvedId,
              client,
            })
          }

          console.log(`[ProviderManager] Switched to cached ${resolvedId}`)
          return { success: true, client, provider: resolvedId, cached: true }
        }
      } catch (e) {
        // Cached client no longer valid, reinitialize
        this.clientCache.delete(resolvedId)
      }
    }

    // Initialize provider
    const result = await this.initializeProvider(resolvedId, config)

    if (result.success) {
      const previousProvider = this.activeProviderId
      this.activeProviderId = resolvedId
      this.activeClient = result.client

      if (this.onProviderChange) {
        this.onProviderChange({
          previousProvider,
          newProvider: resolvedId,
          client: result.client,
        })
      }

      return { ...result, cached: false }
    }

    return result
  }

  /**
   * Get the active client
   * @returns {Object|null} Active LLM client
   */
  getActiveClient() {
    return this.activeClient
  }

  /**
   * Get the active provider ID
   * @returns {string|null} Active provider identifier
   */
  getActiveProviderId() {
    return this.activeProviderId
  }

  /**
   * Get current provider status
   * @returns {Object} Provider status info
   */
  getStatus() {
    return {
      activeProvider: this.activeProviderId,
      providers: this.getAvailableProviders(),
      clientReady: this.activeClient !== null,
    }
  }

  /**
   * Update provider configuration
   * @param {string} providerId - Provider identifier
   * @param {Object} config - New configuration
   */
  updateProviderConfig(providerId, config) {
    const resolvedId = this._resolveProviderId(providerId)
    if (!resolvedId) {
      throw new Error(`Unknown provider: ${providerId}`)
    }

    this.providerConfigs[resolvedId] = {
      ...this.providerConfigs[resolvedId],
      ...config,
    }

    // Clear cached client for this provider
    this.clientCache.delete(resolvedId)
    this.providerStatus.set(resolvedId, 'unknown')

    console.log(`[ProviderManager] Updated config for ${resolvedId}`)
  }

  /**
   * List available models for a provider
   * @param {string} providerId - Provider identifier (or active if not specified)
   * @returns {Promise<Array>} List of models
   */
  async listModels(providerId = null) {
    const resolvedId = providerId ? this._resolveProviderId(providerId) : this.activeProviderId

    if (!resolvedId) {
      return []
    }

    // Get client (cached or create new)
    let client = this.clientCache.get(resolvedId)

    if (!client) {
      const result = await this.initializeProvider(resolvedId)
      if (!result.success) return []
      client = result.client
    }

    try {
      return await client.listModels()
    } catch (e) {
      console.error(`[ProviderManager] Failed to list models:`, e.message)
      return []
    }
  }

  /**
   * Test all configured providers
   * @returns {Promise<Object>} Test results for each provider
   */
  async testAllProviders() {
    const results = {}

    for (const providerId of Object.keys(PROVIDER_REGISTRY)) {
      if (this._isProviderConfigured(providerId)) {
        const result = await this.initializeProvider(providerId)
        results[providerId] = {
          success: result.success,
          error: result.error,
          model: result.model,
        }
      } else {
        results[providerId] = {
          success: false,
          error: 'Not configured',
          model: null,
        }
      }
    }

    return results
  }
}

/**
 * Create a ProviderManager instance
 * @param {Object} options - Configuration options
 * @returns {ProviderManager}
 */
function createProviderManager(options) {
  return new ProviderManager(options)
}

module.exports = {
  ProviderManager,
  createProviderManager,
  PROVIDER_REGISTRY,
}
