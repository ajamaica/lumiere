/**
 * Centralized Error Handling and Logging
 *
 * Provides a unified error handling system with:
 * - Structured logging with log levels
 * - Error categorization and classification
 * - Automatic retry logic for transient errors
 * - Error aggregation and reporting
 * - User-friendly error messages
 * - Async error boundary wrappers
 */

const { EventEmitter } = require('events')

// ============================================================================
// LOG LEVELS
// ============================================================================

const LogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
  SILENT: 6,
}

const LogLevelNames = Object.fromEntries(Object.entries(LogLevel).map(([k, v]) => [v, k]))

// ============================================================================
// ERROR CATEGORIES
// ============================================================================

const ErrorCategory = {
  NETWORK: 'network', // Network/transport errors
  AUTHENTICATION: 'auth', // Auth/credential errors
  VALIDATION: 'validation', // Input validation errors
  RESOURCE: 'resource', // Resource not found/unavailable
  PERMISSION: 'permission', // Permission denied
  TIMEOUT: 'timeout', // Operation timeouts
  RATE_LIMIT: 'rate_limit', // Rate limiting
  INTERNAL: 'internal', // Internal/unexpected errors
  EXTERNAL: 'external', // External service errors
  USER: 'user', // User-caused errors
  CONFIGURATION: 'config', // Configuration errors
  LLM: 'llm', // LLM-specific errors
  MEMORY: 'memory', // Memory/SMF errors
  OSCILLATOR: 'oscillator', // PRSC/oscillator errors
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Base error class with category and metadata
 */
class SentientError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'SentientError'
    this.category = options.category || ErrorCategory.INTERNAL
    this.code = options.code || 'UNKNOWN_ERROR'
    this.retryable = options.retryable ?? false
    this.metadata = options.metadata || {}
    this.originalError = options.cause || null
    this.timestamp = Date.now()
    this.userMessage = options.userMessage || this.getDefaultUserMessage()

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SentientError)
    }
  }

  getDefaultUserMessage() {
    switch (this.category) {
      case ErrorCategory.NETWORK:
        return 'Network connection error. Please check your connection.'
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your credentials.'
      case ErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait a moment.'
      case ErrorCategory.TIMEOUT:
        return 'Operation timed out. Please try again.'
      case ErrorCategory.LLM:
        return 'AI service error. Please try again later.'
      default:
        return 'An unexpected error occurred.'
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      code: this.code,
      retryable: this.retryable,
      metadata: this.metadata,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      stack: this.stack,
    }
  }
}

/**
 * Network-related errors
 */
class NetworkError extends SentientError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: ErrorCategory.NETWORK,
      retryable: options.retryable ?? true,
    })
    this.name = 'NetworkError'
    this.statusCode = options.statusCode
  }
}

/**
 * LLM-related errors
 */
class LLMError extends SentientError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: ErrorCategory.LLM,
    })
    this.name = 'LLMError'
    this.provider = options.provider
    this.model = options.model
  }
}

/**
 * Validation errors
 */
class ValidationError extends SentientError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: ErrorCategory.VALIDATION,
      retryable: false,
    })
    this.name = 'ValidationError'
    this.fields = options.fields || []
  }
}

/**
 * Timeout errors
 */
class TimeoutError extends SentientError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: ErrorCategory.TIMEOUT,
      retryable: true,
    })
    this.name = 'TimeoutError'
    this.timeout = options.timeout
    this.operation = options.operation
  }
}

// ============================================================================
// LOGGER
// ============================================================================

/**
 * Structured Logger
 */
class Logger extends EventEmitter {
  constructor(options = {}) {
    super()

    this.name = options.name || 'sentient'
    this.level = options.level ?? LogLevel.INFO
    this.format = options.format || 'text' // text, json
    this.colorize = options.colorize ?? true
    this.includeTimestamp = options.includeTimestamp ?? true
    this.includeLevel = options.includeLevel ?? true

    // Output streams
    this.stdout = options.stdout || process.stdout
    this.stderr = options.stderr || process.stderr

    // Log history for error aggregation
    this.history = []
    this.maxHistory = options.maxHistory || 1000

    // Child loggers
    this.children = new Map()

    // Colors
    this.colors = {
      trace: '\x1b[90m',
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      fatal: '\x1b[35m',
      reset: '\x1b[0m',
    }
  }

  /**
   * Create a child logger with a specific namespace
   * @param {string} namespace - Child namespace
   * @returns {Logger}
   */
  child(namespace) {
    if (this.children.has(namespace)) {
      return this.children.get(namespace)
    }

    const child = new Logger({
      name: `${this.name}:${namespace}`,
      level: this.level,
      format: this.format,
      colorize: this.colorize,
      stdout: this.stdout,
      stderr: this.stderr,
    })

    // Forward events to parent
    child.on('log', (entry) => {
      this.history.push(entry)
      if (this.history.length > this.maxHistory) {
        this.history.shift()
      }
      this.emit('log', entry)
    })

    this.children.set(namespace, child)
    return child
  }

  /**
   * Log at a specific level
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(level, message, data = {}) {
    if (level < this.level) return

    const entry = {
      timestamp: new Date().toISOString(),
      level: LogLevelNames[level].toLowerCase(),
      name: this.name,
      message,
      data: Object.keys(data).length > 0 ? data : undefined,
    }

    // Add to history
    this.history.push(entry)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Format output
    const output = this.formatEntry(entry)

    // Write to appropriate stream
    const stream = level >= LogLevel.ERROR ? this.stderr : this.stdout
    stream.write(output + '\n')

    // Emit event
    this.emit('log', entry)

    return entry
  }

  /**
   * Format a log entry
   * @param {Object} entry - Log entry
   * @returns {string}
   */
  formatEntry(entry) {
    if (this.format === 'json') {
      return JSON.stringify(entry)
    }

    const parts = []

    if (this.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`)
    }

    if (this.includeLevel) {
      const levelStr = entry.level.toUpperCase().padEnd(5)
      if (this.colorize) {
        const color = this.colors[entry.level] || ''
        parts.push(`${color}${levelStr}${this.colors.reset}`)
      } else {
        parts.push(levelStr)
      }
    }

    parts.push(`[${entry.name}]`)
    parts.push(entry.message)

    if (entry.data) {
      parts.push(JSON.stringify(entry.data))
    }

    return parts.join(' ')
  }

  // Convenience methods
  trace(message, data) {
    return this.log(LogLevel.TRACE, message, data)
  }
  debug(message, data) {
    return this.log(LogLevel.DEBUG, message, data)
  }
  info(message, data) {
    return this.log(LogLevel.INFO, message, data)
  }
  warn(message, data) {
    return this.log(LogLevel.WARN, message, data)
  }
  error(message, data) {
    return this.log(LogLevel.ERROR, message, data)
  }
  fatal(message, data) {
    return this.log(LogLevel.FATAL, message, data)
  }

  /**
   * Set log level
   * @param {number|string} level - New level
   */
  setLevel(level) {
    if (typeof level === 'string') {
      this.level = LogLevel[level.toUpperCase()] ?? LogLevel.INFO
    } else {
      this.level = level
    }
  }

  /**
   * Get recent log entries
   * @param {number} count - Number of entries
   * @param {string} level - Optional level filter
   * @returns {Array}
   */
  getRecent(count = 100, level = null) {
    let entries = this.history.slice(-count)
    if (level) {
      entries = entries.filter((e) => e.level === level)
    }
    return entries
  }

  /**
   * Get error summary
   * @returns {Object}
   */
  getErrorSummary() {
    const errors = this.history.filter((e) => e.level === 'error' || e.level === 'fatal')
    const categories = {}

    for (const error of errors) {
      const cat = error.data?.category || 'unknown'
      categories[cat] = (categories[cat] || 0) + 1
    }

    return {
      totalErrors: errors.length,
      byCategory: categories,
      recentErrors: errors.slice(-10),
    }
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Centralized Error Handler
 */
class ErrorHandler extends EventEmitter {
  constructor(options = {}) {
    super()

    this.logger = options.logger || new Logger({ name: 'error-handler' })

    // Error aggregation
    this.errors = []
    this.maxErrors = options.maxErrors || 1000

    // Error rate tracking
    this.errorRates = new Map() // category -> count in window
    this.rateWindow = options.rateWindow || 60000 // 1 minute

    // User message handlers
    this.userMessageHandlers = new Map()

    // Recovery handlers
    this.recoveryHandlers = new Map()

    // Setup default handlers
    this.setupDefaultHandlers()
  }

  setupDefaultHandlers() {
    // Register recovery handlers for retryable errors
    this.registerRecoveryHandler(ErrorCategory.NETWORK, async (error, context) => {
      // Default: wait and retry
      await new Promise((r) => setTimeout(r, 1000))
      return { retry: true }
    })

    this.registerRecoveryHandler(ErrorCategory.RATE_LIMIT, async (error, context) => {
      // Wait for rate limit reset
      const waitTime = error.metadata?.retryAfter || 5000
      await new Promise((r) => setTimeout(r, waitTime))
      return { retry: true }
    })
  }

  /**
   * Handle an error
   * @param {Error} error - Error to handle
   * @param {Object} context - Error context
   * @returns {Object} Handler result
   */
  async handle(error, context = {}) {
    // Normalize to SentientError
    const sentientError = this.normalize(error)

    // Log the error
    this.logger.error(sentientError.message, {
      category: sentientError.category,
      code: sentientError.code,
      retryable: sentientError.retryable,
      metadata: sentientError.metadata,
      stack: sentientError.stack,
    })

    // Record error
    this.recordError(sentientError)

    // Update error rate
    this.updateErrorRate(sentientError.category)

    // Emit event
    this.emit('error', sentientError, context)

    // Try recovery if retryable
    if (sentientError.retryable && context.canRetry !== false) {
      const recovery = await this.attemptRecovery(sentientError, context)
      if (recovery.retry) {
        return { handled: true, retry: true, error: sentientError }
      }
    }

    return {
      handled: true,
      retry: false,
      error: sentientError,
      userMessage: sentientError.userMessage,
    }
  }

  /**
   * Normalize any error to SentientError
   * @param {Error} error - Error to normalize
   * @returns {SentientError}
   */
  normalize(error) {
    if (error instanceof SentientError) {
      return error
    }

    // Classify based on error properties
    let category = ErrorCategory.INTERNAL
    // Respect original error's retryable flag if set
    let retryable = error.retryable ?? false
    let code = 'UNKNOWN_ERROR'

    // Check for network errors
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNRESET' ||
      error.message.includes('network')
    ) {
      category = ErrorCategory.NETWORK
      retryable = true
      code = error.code || 'NETWORK_ERROR'
    }

    // Check for timeout errors
    if (
      error.name === 'TimeoutError' ||
      error.code === 'ETIMEDOUT' ||
      error.message.includes('timeout')
    ) {
      category = ErrorCategory.TIMEOUT
      retryable = true
      code = 'TIMEOUT'
    }

    // Check for rate limit errors
    if (error.status === 429 || error.message.includes('rate limit')) {
      category = ErrorCategory.RATE_LIMIT
      retryable = true
      code = 'RATE_LIMITED'
    }

    // Check for auth errors
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.message.includes('unauthorized') ||
      error.message.includes('forbidden')
    ) {
      category = ErrorCategory.AUTHENTICATION
      code = 'AUTH_FAILED'
    }

    return new SentientError(error.message, {
      category,
      code,
      retryable,
      cause: error,
      metadata: { originalName: error.name, originalCode: error.code },
    })
  }

  /**
   * Record error for aggregation
   * @param {SentientError} error - Error to record
   */
  recordError(error) {
    this.errors.push({
      ...error.toJSON(),
      handledAt: Date.now(),
    })

    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }
  }

  /**
   * Track an error - alias for updateErrorRate
   * @param {string} category - Error category
   */
  trackError(category) {
    this.updateErrorRate(category)
  }

  /**
   * Update error rate tracking
   * @param {string} category - Error category
   */
  updateErrorRate(category) {
    const now = Date.now()
    const key = `${category}:${Math.floor(now / this.rateWindow)}`

    this.errorRates.set(key, (this.errorRates.get(key) || 0) + 1)

    // Clean old windows
    for (const [k] of this.errorRates) {
      const windowTime = parseInt(k.split(':')[1]) * this.rateWindow
      if (now - windowTime > this.rateWindow * 2) {
        this.errorRates.delete(k)
      }
    }
  }

  /**
   * Get current error rate for a category
   * @param {string} category - Error category
   * @returns {number}
   */
  getErrorRate(category) {
    const now = Date.now()
    const currentWindow = Math.floor(now / this.rateWindow)
    const key = `${category}:${currentWindow}`
    return this.errorRates.get(key) || 0
  }

  /**
   * Register a recovery handler for a category
   * @param {string} category - Error category
   * @param {Function} handler - Recovery handler
   */
  registerRecoveryHandler(category, handler) {
    this.recoveryHandlers.set(category, handler)
  }

  /**
   * Attempt recovery for an error
   * @param {SentientError} error - Error to recover from
   * @param {Object} context - Error context
   * @returns {Promise<Object>}
   */
  async attemptRecovery(error, context) {
    const handler = this.recoveryHandlers.get(error.category)

    if (!handler) {
      return { retry: false }
    }

    try {
      return await handler(error, context)
    } catch (recoveryError) {
      this.logger.warn('Recovery failed', {
        originalError: error.code,
        recoveryError: recoveryError.message,
      })
      return { retry: false }
    }
  }

  /**
   * Get error statistics
   * @returns {Object}
   */
  getStats() {
    const categories = {}
    for (const error of this.errors) {
      categories[error.category] = (categories[error.category] || 0) + 1
    }

    return {
      totalErrors: this.errors.length,
      byCategory: categories,
      recentErrors: this.errors.slice(-10),
      errorRates: Object.fromEntries(this.errorRates),
    }
  }
}

// ============================================================================
// ASYNC WRAPPERS
// ============================================================================

/**
 * Wrap an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {ErrorHandler} handler - Error handler
 * @param {Object} options - Options
 * @returns {Function}
 */
function withErrorHandling(fn, handler, options = {}) {
  const maxRetries = options.maxRetries || 3
  const context = options.context || {}

  return async function (...args) {
    let lastError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn.apply(this, args)
      } catch (error) {
        lastError = error

        const result = await handler.handle(error, {
          ...context,
          attempt,
          maxRetries,
          canRetry: attempt < maxRetries,
        })

        if (!result.retry) {
          throw handler.normalize(error)
        }

        // Apply backoff
        const backoff = options.backoff || ((a) => Math.pow(2, a) * 100)
        await new Promise((r) => setTimeout(r, backoff(attempt)))
      }
    }

    throw handler.normalize(lastError)
  }
}

/**
 * Create an async error boundary
 * @param {Function} fn - Async function
 * @param {Object} options - Options
 * @returns {Promise}
 */
async function errorBoundary(fn, options = {}) {
  const handler = options.handler || globalErrorHandler
  const fallback = options.fallback

  try {
    return await fn()
  } catch (error) {
    const result = await handler.handle(error, options.context)

    if (fallback !== undefined) {
      return typeof fallback === 'function' ? fallback(error) : fallback
    }

    throw result.error
  }
}

/**
 * Wrap a promise with timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeout - Timeout in ms
 * @param {string} operation - Operation name
 * @returns {Promise}
 */
function withTimeout(promise, timeout, operation = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new TimeoutError(`${operation} timed out after ${timeout}ms`, {
            timeout,
            operation,
          }),
        )
      }, timeout)
    }),
  ])
}

// ============================================================================
// GLOBAL INSTANCES
// ============================================================================

// Create global logger
const globalLogger = new Logger({
  name: 'sentient',
  level: process.env.LOG_LEVEL ? LogLevel[process.env.LOG_LEVEL.toUpperCase()] : LogLevel.INFO,
})

// Create global error handler
const globalErrorHandler = new ErrorHandler({
  logger: globalLogger.child('errors'),
})

/**
 * Create a namespaced logger
 * @param {string} namespace - Logger namespace
 * @returns {Logger}
 */
function createLogger(namespace) {
  return globalLogger.child(namespace)
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Levels and categories
  LogLevel,
  LogLevelNames,
  ErrorCategory,

  // Error classes
  SentientError,
  NetworkError,
  LLMError,
  ValidationError,
  TimeoutError,

  // Logger
  Logger,
  createLogger,
  globalLogger,

  // Error handler
  ErrorHandler,
  globalErrorHandler,

  // Utilities
  withErrorHandling,
  errorBoundary,
  withTimeout,
}
