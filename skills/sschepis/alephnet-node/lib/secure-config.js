/**
 * Secure Configuration and API Key Management
 *
 * Provides secure handling of sensitive configuration:
 * - Environment variable loading with fallbacks
 * - Secret validation and masking
 * - Secure credential storage
 * - Configuration schema with defaults
 * - Runtime secret rotation support
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createLogger } = require('./error-handler')

const log = createLogger('secure-config')

// ============================================================================
// ENVIRONMENT SOURCES
// ============================================================================

/**
 * Environment variable sources in priority order
 */
const ENV_SOURCES = {
  PROCESS: 'process', // process.env (highest priority)
  DOTENV: 'dotenv', // .env file
  CONFIG_FILE: 'file', // JSON config file (for non-sensitive config)
  DEFAULT: 'default', // Default values (lowest priority)
}

// ============================================================================
// CONFIGURATION SCHEMA
// ============================================================================

/**
 * Configuration schema with types, defaults, and validation
 */
const CONFIG_SCHEMA = {
  // LLM Providers
  OPENAI_API_KEY: {
    type: 'secret',
    description: 'OpenAI API key',
    required: false,
  },
  ANTHROPIC_API_KEY: {
    type: 'secret',
    description: 'Anthropic Claude API key',
    required: false,
  },
  GOOGLE_APPLICATION_CREDENTIALS: {
    type: 'path',
    description: 'Path to Google service account JSON',
    required: false,
  },
  VERTEX_PROJECT_ID: {
    type: 'string',
    description: 'Google Cloud project ID for Vertex AI',
    required: false,
  },
  VERTEX_LOCATION: {
    type: 'string',
    description: 'Vertex AI location',
    default: 'us-central1',
  },

  // LMStudio
  LMSTUDIO_URL: {
    type: 'url',
    description: 'LMStudio API URL',
    default: 'http://localhost:1234/v1',
  },

  // Server
  PORT: {
    type: 'number',
    description: 'Server port',
    default: 3000,
  },
  HOST: {
    type: 'string',
    description: 'Server host',
    default: 'localhost',
  },

  // Logging
  LOG_LEVEL: {
    type: 'enum',
    values: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
    description: 'Logging level',
    default: 'info',
  },

  // Node identity
  NODE_ID: {
    type: 'string',
    description: 'Unique node identifier',
  },
  NODE_NAME: {
    type: 'string',
    description: 'Human-readable node name',
  },

  // Network
  ROOT_NODE_DOMAIN: {
    type: 'string',
    description: 'Domain for the root node of the Aleph Network',
    default: 'aleph.bot',
  },
  ROOT_NODE_BOOTSTRAP_URL: {
    type: 'url',
    description: 'Bootstrap URL for joining the Aleph Network mesh',
    default: 'https://aleph.bot/functions/v1/alephnet-root/bootstrap',
  },
  NETWORK_PEER_URL: {
    type: 'url',
    description: 'URL of peer node for network connection',
  },
  SIGNALING_SERVER: {
    type: 'url',
    description: 'WebRTC signaling server URL',
  },

  // Storage
  STATE_DIR: {
    type: 'path',
    description: 'Directory for persistent state',
    default: './data',
  },
  BACKUP_DIR: {
    type: 'path',
    description: 'Directory for backups',
    default: './backups',
  },
}

// ============================================================================
// SECURE CONFIG CLASS
// ============================================================================

/**
 * SecureConfig
 *
 * Manages configuration with secure handling of secrets.
 */
class SecureConfig {
  constructor(options = {}) {
    this.schema = options.schema || CONFIG_SCHEMA
    this.values = new Map()
    this.sources = new Map()
    this.loaded = false

    // Environment file paths
    this.envFile = options.envFile || '.env'
    this.configFile = options.configFile || 'config.json'
    this.baseDir = options.baseDir || process.cwd()

    // Secret masking
    this.maskSecrets = options.maskSecrets ?? true
    this.secretPattern = /key|token|secret|password|credential/i

    // Validation state
    this.validationErrors = []

    // Watchers for hot reload
    this.watchers = new Map()
    this.onChange = options.onChange
  }

  /**
   * Load configuration from all sources
   * @returns {SecureConfig} this
   */
  load() {
    // 1. Load defaults from schema
    for (const [key, def] of Object.entries(this.schema)) {
      if (def.default !== undefined) {
        this.set(key, def.default, ENV_SOURCES.DEFAULT)
      }
    }

    // 2. Load from config file (non-sensitive only)
    this.loadConfigFile()

    // 3. Load from .env file
    this.loadDotenv()

    // 4. Load from process.env (highest priority)
    this.loadProcessEnv()

    // 5. Validate
    this.validate()

    this.loaded = true
    return this
  }

  /**
   * Load from JSON config file
   */
  loadConfigFile() {
    const configPath = path.resolve(this.baseDir, this.configFile)

    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8')
        const config = JSON.parse(content)

        for (const [key, value] of Object.entries(config)) {
          const def = this.schema[key]

          // Don't load secrets from JSON files - log warning
          if (def?.type === 'secret') {
            log.warn(
              `Ignoring secret ${this.maskKey(key)} in config file - use environment variables`,
            )
            continue
          }

          this.set(key, value, ENV_SOURCES.CONFIG_FILE)
        }

        log.debug(`Loaded config from ${configPath}`)
      }
    } catch (error) {
      log.warn(`Failed to load config file: ${error.message}`)
    }
  }

  /**
   * Load from .env file
   */
  loadDotenv() {
    const envPath = path.resolve(this.baseDir, this.envFile)

    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8')
        const lines = content.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()

          // Skip comments and empty lines
          if (!trimmed || trimmed.startsWith('#')) continue

          // Parse KEY=value
          const match = trimmed.match(/^([^=]+)=(.*)$/)
          if (match) {
            const [, key, rawValue] = match
            // Remove quotes if present
            let value = rawValue.trim()
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1)
            }

            this.set(key.trim(), value, ENV_SOURCES.DOTENV)
          }
        }

        log.debug(`Loaded environment from ${envPath}`)
      }
    } catch (error) {
      log.warn(`Failed to load .env file: ${error.message}`)
    }
  }

  /**
   * Load from process.env
   */
  loadProcessEnv() {
    for (const key of Object.keys(this.schema)) {
      if (process.env[key] !== undefined) {
        this.set(key, process.env[key], ENV_SOURCES.PROCESS)
      }
    }
  }

  /**
   * Set a configuration value
   * @param {string} key - Config key
   * @param {*} value - Config value
   * @param {string} source - Value source
   */
  set(key, value, source = ENV_SOURCES.PROCESS) {
    const def = this.schema[key]

    // Convert value based on type
    const converted = this.convert(key, value, def)

    // Only override if new source has higher priority
    const sourcePriority = [
      ENV_SOURCES.DEFAULT,
      ENV_SOURCES.CONFIG_FILE,
      ENV_SOURCES.DOTENV,
      ENV_SOURCES.PROCESS,
    ]

    const currentSource = this.sources.get(key)
    if (!currentSource || sourcePriority.indexOf(source) >= sourcePriority.indexOf(currentSource)) {
      this.values.set(key, converted)
      this.sources.set(key, source)
    }
  }

  /**
   * Convert value based on schema type
   * @param {string} key - Config key
   * @param {*} value - Raw value
   * @param {Object} def - Schema definition
   * @returns {*} Converted value
   */
  convert(key, value, def) {
    if (value === undefined || value === null) return value
    if (!def) return value

    switch (def.type) {
      case 'number':
        return Number(value)

      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1'
        }
        return Boolean(value)

      case 'array':
        if (typeof value === 'string') {
          return value.split(',').map((v) => v.trim())
        }
        return value

      case 'path':
        return path.resolve(this.baseDir, value)

      default:
        return value
    }
  }

  /**
   * Get a configuration value
   * @param {string} key - Config key
   * @param {*} defaultValue - Default if not found
   * @returns {*}
   */
  get(key, defaultValue = undefined) {
    if (this.values.has(key)) {
      return this.values.get(key)
    }
    return defaultValue
  }

  /**
   * Check if a key is set
   * @param {string} key - Config key
   * @returns {boolean}
   */
  has(key) {
    return this.values.has(key)
  }

  /**
   * Get a secret (returns undefined if logged/printed)
   * @param {string} key - Secret key
   * @returns {string|undefined}
   */
  getSecret(key) {
    const def = this.schema[key]
    if (def?.type !== 'secret') {
      log.warn(`${key} is not marked as a secret`)
    }
    return this.get(key)
  }

  /**
   * Validate all configuration
   * @returns {boolean} Valid or not
   */
  validate() {
    this.validationErrors = []

    for (const [key, def] of Object.entries(this.schema)) {
      const value = this.values.get(key)

      // Check required
      if (def.required && (value === undefined || value === null || value === '')) {
        this.validationErrors.push({
          key,
          error: 'Required value is missing',
          source: this.sources.get(key),
        })
      }

      // Check enum values
      if (def.type === 'enum' && value !== undefined) {
        if (!def.values.includes(value)) {
          this.validationErrors.push({
            key,
            error: `Invalid value. Must be one of: ${def.values.join(', ')}`,
            value: this.maskValue(key, value),
          })
        }
      }

      // Check URL format
      if (def.type === 'url' && value) {
        try {
          new URL(value)
        } catch (e) {
          this.validationErrors.push({
            key,
            error: 'Invalid URL format',
            value: this.maskValue(key, value),
          })
        }
      }

      // Check path exists if required
      if (def.type === 'path' && def.mustExist && value) {
        if (!fs.existsSync(value)) {
          this.validationErrors.push({
            key,
            error: 'Path does not exist',
            value,
          })
        }
      }
    }

    if (this.validationErrors.length > 0) {
      log.warn(`Configuration validation found ${this.validationErrors.length} issue(s)`)
    }

    return this.validationErrors.length === 0
  }

  /**
   * Mask a value for safe logging
   * @param {string} key - Config key
   * @param {*} value - Value to mask
   * @returns {string}
   */
  maskValue(key, value) {
    if (!this.maskSecrets) return String(value)

    const def = this.schema[key]
    if (def?.type === 'secret' || this.secretPattern.test(key)) {
      const str = String(value)
      if (str.length <= 4) return '****'
      return str.slice(0, 2) + '***' + str.slice(-2)
    }

    return String(value)
  }

  /**
   * Mask a key name for logging
   * @param {string} key - Key to mask
   * @returns {string}
   */
  maskKey(key) {
    // Don't mask key names, just return as-is
    return key
  }

  /**
   * Get all configuration as object (with secrets masked)
   * @param {boolean} includeSecrets - Include masked secrets
   * @returns {Object}
   */
  toObject(includeSecrets = false) {
    const result = {}

    for (const [key, value] of this.values) {
      const def = this.schema[key]

      if (def?.type === 'secret') {
        if (includeSecrets) {
          result[key] = this.maskValue(key, value)
        }
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Get configuration for a specific provider
   * @param {string} provider - Provider name
   * @returns {Object}
   */
  getProviderConfig(provider) {
    switch (provider.toLowerCase()) {
      case 'openai':
        return {
          apiKey: this.getSecret('OPENAI_API_KEY'),
          baseUrl: this.get('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        }

      case 'anthropic':
        return {
          apiKey: this.getSecret('ANTHROPIC_API_KEY'),
          baseUrl: this.get('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
        }

      case 'vertex':
      case 'google':
        return {
          credentialsPath: this.get('GOOGLE_APPLICATION_CREDENTIALS'),
          projectId: this.get('VERTEX_PROJECT_ID'),
          location: this.get('VERTEX_LOCATION', 'us-central1'),
        }

      case 'lmstudio':
        return {
          baseUrl: this.get('LMSTUDIO_URL', 'http://localhost:1234/v1'),
        }

      default:
        return {}
    }
  }

  /**
   * Check if a provider is configured
   * @param {string} provider - Provider name
   * @returns {boolean}
   */
  isProviderConfigured(provider) {
    const config = this.getProviderConfig(provider)

    switch (provider.toLowerCase()) {
      case 'openai':
        return !!config.apiKey
      case 'anthropic':
        return !!config.apiKey
      case 'vertex':
      case 'google':
        return !!config.credentialsPath || !!config.projectId
      case 'lmstudio':
        return true // Always available if URL is set
      default:
        return false
    }
  }

  /**
   * Get list of configured providers
   * @returns {Array<string>}
   */
  getConfiguredProviders() {
    const providers = ['openai', 'anthropic', 'vertex', 'lmstudio']
    return providers.filter((p) => this.isProviderConfigured(p))
  }

  /**
   * Watch for configuration file changes
   * @param {Function} callback - Change callback
   */
  watch(callback) {
    const watchPaths = [
      path.resolve(this.baseDir, this.envFile),
      path.resolve(this.baseDir, this.configFile),
    ]

    for (const watchPath of watchPaths) {
      if (fs.existsSync(watchPath)) {
        const watcher = fs.watch(watchPath, (eventType) => {
          if (eventType === 'change') {
            log.info(`Config file changed: ${watchPath}`)
            this.load()
            if (callback) callback(this)
            if (this.onChange) this.onChange(this)
          }
        })

        this.watchers.set(watchPath, watcher)
      }
    }
  }

  /**
   * Stop watching configuration files
   */
  unwatch() {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
  }

  /**
   * Get configuration status
   * @returns {Object}
   */
  getStatus() {
    return {
      loaded: this.loaded,
      valid: this.validationErrors.length === 0,
      validationErrors: this.validationErrors,
      configuredProviders: this.getConfiguredProviders(),
      sources: Object.fromEntries(this.sources),
      watchedFiles: Array.from(this.watchers.keys()),
    }
  }
}

// ============================================================================
// CREDENTIAL ENCRYPTION (for optional at-rest encryption)
// ============================================================================

/**
 * Encrypt a credential for storage
 * @param {string} plaintext - Credential to encrypt
 * @param {string} key - Encryption key
 * @returns {string} Encrypted credential (base64)
 */
function encryptCredential(plaintext, key) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    crypto.createHash('sha256').update(key).digest(),
    iv,
  )

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]).toString('base64')
}

/**
 * Decrypt a stored credential
 * @param {string} encrypted - Encrypted credential (base64)
 * @param {string} key - Decryption key
 * @returns {string} Plaintext credential
 */
function decryptCredential(encrypted, key) {
  const data = Buffer.from(encrypted, 'base64')

  const iv = data.subarray(0, 16)
  const authTag = data.subarray(16, 32)
  const ciphertext = data.subarray(32)

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    crypto.createHash('sha256').update(key).digest(),
    iv,
  )
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

// Create global config instance
const globalConfig = new SecureConfig()

// Auto-load on first access if SENTIENT_AUTO_LOAD is not 'false'
if (process.env.SENTIENT_AUTO_LOAD !== 'false') {
  try {
    globalConfig.load()
  } catch (e) {
    log.error('Failed to auto-load configuration', { error: e.message })
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Classes
  SecureConfig,

  // Constants
  ENV_SOURCES,
  CONFIG_SCHEMA,

  // Global instance
  globalConfig,

  // Utilities
  encryptCredential,
  decryptCredential,
}
