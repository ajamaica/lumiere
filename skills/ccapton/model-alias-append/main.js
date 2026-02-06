/**
 * Model Alias Append Skill with Integrated Hook
 * Combines both hook management and direct response processing
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

class ModelAliasAppendSkill {
  constructor() {
    this.modelAliases = {}
    this.lastConfigRead = 0
    this.configPath = this.findConfigPath()
    this.lastConfigHash = null
    this.configChangeDetected = false
    this.updateNotificationEnabled = true // Enable update notifications by default

    // Load model aliases initially
    this.loadModelAliases()

    // Set up a basic refresh mechanism to periodically check for config changes
    setInterval(() => {
      this.checkAndReloadConfigIfNeeded()
    }, 30000) // Check every 30 seconds
  }

  /**
   * Find the openclaw.json configuration file
   */
  findConfigPath() {
    const possiblePaths = [
      '~/.openclaw/openclaw.json',
      './.openclaw/openclaw.json',
      '../.openclaw/openclaw.json',
      '~/openclaw.json',
      './openclaw.json',
    ]

    // Replace ~ with actual home directory
    const homeDir = require('os').homedir()
    const resolvedPaths = possiblePaths.map((p) =>
      p.startsWith('~') ? p.replace('~', homeDir) : p,
    )

    for (const configPath of resolvedPaths) {
      if (fs.existsSync(configPath)) {
        return configPath
      }
    }

    // Return the most common path if none found
    return '~/.openclaw/openclaw.json'.replace('~', homeDir)
  }

  /**
   * Calculate hash of config file to detect changes
   */
  calculateConfigHash() {
    try {
      if (!this.configPath || !fs.existsSync(this.configPath)) {
        return null
      }

      const configContent = fs.readFileSync(this.configPath, 'utf8')
      return crypto.createHash('md5').update(configContent).digest('hex')
    } catch (error) {
      console.debug('Could not calculate config hash:', error.message)
      return null
    }
  }

  /**
   * Check if config file has been modified and reload if needed
   */
  checkAndReloadConfigIfNeeded() {
    try {
      if (!this.configPath || !fs.existsSync(this.configPath)) {
        return
      }

      const stats = fs.statSync(this.configPath)
      const currentModifiedTime = stats.mtime.getTime()
      const currentHash = this.calculateConfigHash()

      // Check if file was modified OR if hash changed (even if mod time didn't change)
      if (
        currentModifiedTime > this.lastConfigRead ||
        (currentHash && this.lastConfigHash && currentHash !== this.lastConfigHash)
      ) {
        this.loadModelAliases()
        this.lastConfigRead = currentModifiedTime
        this.lastConfigHash = currentHash
        this.configChangeDetected = true

        console.log('Skill configuration reloaded due to file change')
      }
    } catch (error) {
      // Silently ignore errors to prevent impacting normal operation
      console.debug('Could not check skill config file changes:', error.message)
    }
  }

  /**
   * Load model aliases from openclaw.json configuration file
   */
  loadModelAliases() {
    try {
      if (!this.configPath || !fs.existsSync(this.configPath)) {
        return
      }

      const configFile = fs.readFileSync(this.configPath, 'utf8')
      const configData = JSON.parse(configFile)

      // Update last read time
      this.lastConfigRead = fs.statSync(this.configPath).mtime.getTime()

      if (
        configData &&
        configData.agents &&
        configData.agents.defaults &&
        configData.agents.defaults.models
      ) {
        // Extract model aliases from the configuration
        const configModels = configData.agents.defaults.models
        this.modelAliases = {} // Reset the mapping

        for (const [fullModelId, modelConfig] of Object.entries(configModels)) {
          if (modelConfig.alias) {
            this.modelAliases[modelConfig.alias] = fullModelId
          }
        }

        // Also add direct mappings where the key itself might be an alias
        for (const [modelId, modelConfig] of Object.entries(configModels)) {
          if (!modelConfig.alias) {
            // If no explicit alias, use the model ID itself
            this.modelAliases[modelId] = modelId
          }
        }
      }
      // If no config found, leave modelAliases empty
    } catch (error) {
      console.error('Error loading model aliases from configuration:', error)
      // If there's an error, leave modelAliases empty
      this.modelAliases = {}
    }
  }

  /**
   * Get the appropriate model alias based on the current model
   */
  getModelAlias(currentModel) {
    if (!currentModel) {
      return ''
    }

    // If the current model is already an alias, return it
    if (Object.keys(this.modelAliases).includes(currentModel)) {
      return currentModel
    }

    // Try to find the model in our aliases
    for (const [alias, fullModelId] of Object.entries(this.modelAliases)) {
      if (currentModel.includes(fullModelId) || fullModelId.includes(currentModel)) {
        return alias
      }
    }

    // Try to match against the keys of the aliases map
    for (const [alias, fullModelId] of Object.entries(this.modelAliases)) {
      if (currentModel.includes(alias) || alias.includes(currentModel)) {
        return alias
      }
    }

    // Additional pattern matching for common model patterns
    if (typeof currentModel === 'string') {
      // Handle full model identifiers like 'qwen-portal/coder-model'
      if (currentModel.includes('/')) {
        const parts = currentModel.split('/')
        const modelName = parts[1] || parts[0]

        for (const [alias, fullModelId] of Object.entries(this.modelAliases)) {
          if (modelName.includes(alias) || fullModelId.includes(modelName)) {
            return alias
          }
        }
      } else {
        // Direct model name
        for (const [alias, fullModelId] of Object.entries(this.modelAliases)) {
          if (currentModel.includes(alias) || fullModelId.includes(currentModel)) {
            return alias
          }
        }
      }
    }

    // If we can't find a match, return empty string
    return ''
  }

  /**
   * Process the response to append model alias
   */
  processResponse(response, context = {}) {
    // Check if config needs reloading before processing
    this.checkAndReloadConfigIfNeeded()

    try {
      // Get the model used for this response
      const modelUsed = context.model || this.getCurrentModel()
      const modelAlias = this.getModelAlias(modelUsed)

      // Only append if we have a valid model alias
      if (modelAlias && modelAlias !== '') {
        // Check if the response already ends with a model alias pattern
        if (!response.trim().endsWith(`**${modelAlias}**`)) {
          // Append the model alias to the response
          // Preserve any reply tags at the end
          let processedResponse = response.trim()
          const replyTagMatch = processedResponse.match(/\[\[(reply_to.*?|reply_to:[^|\]]+)\]\]/)

          if (replyTagMatch) {
            // Extract reply tag and put it at the end after model alias
            const replyTag = replyTagMatch[0]
            processedResponse = processedResponse.replace(replyTag, '').trim()
            return `${processedResponse}\n\n**${modelAlias}**${replyTag}`
          } else {
            return `${processedResponse}\n\n**${modelAlias}**`
          }
        }
      }

      // Return original response if no model alias to append
      return response
    } catch (error) {
      console.error('Error appending model alias:', error)
      return response
    }
  }

  /**
   * Get current model from context
   */
  getCurrentModel() {
    // This would be implemented based on the specific OpenClaw context
    // For now, return a placeholder
    return 'qwen' // Default fallback
  }

  /**
   * Enable the response-alias-injector hook
   */
  async enableHook() {
    try {
      const { spawnSync } = require('child_process')
      const result = spawnSync('node', [`${__dirname}/scripts/manage-hook.js`, 'enable'], {
        stdio: 'pipe',
        encoding: 'utf-8',
      })

      if (result.status === 0) {
        console.log('Hook response-alias-injector enabled successfully.')
        return true
      } else {
        console.error('Failed to enable hook:', result.stderr)
        return false
      }
    } catch (error) {
      console.error('Error enabling hook:', error)
      return false
    }
  }

  /**
   * Disable the response-alias-injector hook
   */
  async disableHook() {
    try {
      const { spawnSync } = require('child_process')
      const result = spawnSync('node', [`${__dirname}/scripts/manage-hook.js`, 'disable'], {
        stdio: 'pipe',
        encoding: 'utf-8',
      })

      if (result.status === 0) {
        console.log('Hook response-alias-injector disabled successfully.')
        return true
      } else {
        console.error('Failed to disable hook:', result.stderr)
        return false
      }
    } catch (error) {
      console.error('Error disabling hook:', error)
      return false
    }
  }

  /**
   * Initialize the skill
   */
  async initialize() {
    console.log('Model Alias Append skill with integrated hook initialized')
    return true
  }

  /**
   * Execute the skill on a response
   */
  async execute(response, context = {}) {
    return this.processResponse(response, context)
  }

  /**
   * Get status information about the skill
   */
  getStatus() {
    return {
      configLoaded: this.lastConfigRead > 0,
      lastConfigRead: new Date(this.lastConfigRead).toISOString(),
      modelAliasCount: Object.keys(this.modelAliases).length,
      configChangeDetected: this.configChangeDetected,
      updateNotificationEnabled: this.updateNotificationEnabled,
    }
  }
}

// Export the skill
module.exports = ModelAliasAppendSkill
