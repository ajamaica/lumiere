/**
 * Provider Routes
 *
 * API endpoints for LLM provider management and switching.
 */

const { loggers, sendJson, readBody } = require('./utils')

const logProvider = loggers.provider || loggers.http

/**
 * Creates provider route handlers
 * @param {Object} server - SentientServer instance
 * @returns {Object} Route handlers
 */
function createProviderRoutes(server) {
  return {
    /**
     * GET /providers - List available providers
     */
    listProviders: async (req, res) => {
      if (!server.providerManager) {
        sendJson(res, { error: 'Provider manager not initialized' }, 503)
        return
      }

      const providers = server.providerManager.getAvailableProviders()
      const activeProvider = server.providerManager.getActiveProviderId()

      sendJson(res, {
        success: true,
        activeProvider,
        providers,
      })
    },

    /**
     * GET /providers/status - Get detailed provider status
     */
    getStatus: async (req, res) => {
      if (!server.providerManager) {
        sendJson(res, { error: 'Provider manager not initialized' }, 503)
        return
      }

      const status = server.providerManager.getStatus()

      // Add current model info if available (with timeout to prevent hanging)
      if (server.chat?.llm) {
        try {
          const modelPromise = server.chat.llm.getCurrentModel()
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 2000),
          )
          status.currentModel = await Promise.race([modelPromise, timeoutPromise])
        } catch (e) {
          // Use the model from provider config as fallback
          const activeProvider = server.providerManager.getActiveProviderId()
          const config = server.providerManager.getProviderConfig(activeProvider)
          status.currentModel = config?.model || 'unknown'
        }
      }

      sendJson(res, {
        success: true,
        ...status,
      })
    },

    /**
     * POST /providers/switch - Switch to a different provider
     */
    switchProvider: async (req, res) => {
      if (!server.providerManager) {
        sendJson(res, { error: 'Provider manager not initialized' }, 503)
        return
      }

      try {
        const body = await readBody(req)
        const { provider, config } = JSON.parse(body)

        if (!provider) {
          sendJson(res, { error: 'Provider ID required' }, 400)
          return
        }

        logProvider(`Switching provider to: ${provider}`)

        const result = await server.providerManager.switchProvider(provider, config)

        if (result.success) {
          // Update the chat system's LLM client
          if (server.chat) {
            server.chat.llm = result.client
            logProvider(`Chat LLM client updated to ${provider}`)
          }

          // Update chaperone's LLM client if learning is active
          if (server.chaperone && server.chaperone.llmClient) {
            server.chaperone.llmClient = result.client
            logProvider(`Chaperone LLM client updated to ${provider}`)
          }

          sendJson(res, {
            success: true,
            provider: result.provider,
            model: result.model,
            cached: result.cached,
            message: `Switched to ${result.provider}`,
          })
        } else {
          sendJson(
            res,
            {
              success: false,
              error: result.error,
            },
            400,
          )
        }
      } catch (error) {
        logProvider.error?.('Provider switch error:', error.message) ||
          console.error('Provider switch error:', error.message)
        sendJson(res, { error: error.message }, 500)
      }
    },

    /**
     * POST /providers/configure - Update provider configuration
     */
    configureProvider: async (req, res) => {
      if (!server.providerManager) {
        sendJson(res, { error: 'Provider manager not initialized' }, 503)
        return
      }

      try {
        const body = await readBody(req)
        const { provider, config } = JSON.parse(body)

        if (!provider) {
          sendJson(res, { error: 'Provider ID required' }, 400)
          return
        }

        if (!config || typeof config !== 'object') {
          sendJson(res, { error: 'Configuration object required' }, 400)
          return
        }

        server.providerManager.updateProviderConfig(provider, config)

        sendJson(res, {
          success: true,
          provider,
          message: `Configuration updated for ${provider}`,
        })
      } catch (error) {
        sendJson(res, { error: error.message }, 500)
      }
    },

    /**
     * GET /providers/:id/models - List models for a provider
     */
    listModels: async (req, res, providerId) => {
      if (!server.providerManager) {
        sendJson(res, { error: 'Provider manager not initialized' }, 503)
        return
      }

      try {
        const models = await server.providerManager.listModels(providerId)

        sendJson(res, {
          success: true,
          provider: providerId,
          models,
        })
      } catch (error) {
        sendJson(res, { error: error.message }, 500)
      }
    },

    /**
     * POST /providers/test - Test all configured providers
     */
    testProviders: async (req, res) => {
      if (!server.providerManager) {
        sendJson(res, { error: 'Provider manager not initialized' }, 503)
        return
      }

      try {
        logProvider('Testing all providers...')
        const results = await server.providerManager.testAllProviders()

        sendJson(res, {
          success: true,
          results,
        })
      } catch (error) {
        sendJson(res, { error: error.message }, 500)
      }
    },

    /**
     * POST /providers/model - Set model for active provider
     */
    setModel: async (req, res) => {
      if (!server.providerManager) {
        sendJson(res, { error: 'Provider manager not initialized' }, 503)
        return
      }

      try {
        const body = await readBody(req)
        const { model } = JSON.parse(body)

        if (!model) {
          sendJson(res, { error: 'Model name required' }, 400)
          return
        }

        const activeProvider = server.providerManager.getActiveProviderId()

        if (!activeProvider) {
          sendJson(res, { error: 'No active provider' }, 400)
          return
        }

        // Update the model in the active client
        const client = server.providerManager.getActiveClient()
        if (client) {
          client.model = model
          logProvider(`Model set to: ${model}`)
        }

        // Also update the provider config
        server.providerManager.updateProviderConfig(activeProvider, { model })

        sendJson(res, {
          success: true,
          provider: activeProvider,
          model,
          message: `Model set to ${model}`,
        })
      } catch (error) {
        sendJson(res, { error: error.message }, 500)
      }
    },
  }
}

module.exports = { createProviderRoutes }
