/**
 * Safety Filter for Autonomous Learning
 *
 * Enforces security policies for autonomous learning:
 * - URL whitelists (domains, protocols)
 * - MIME type restrictions
 * - File path sandboxing
 * - Content size limits
 * - Session rate limiting
 *
 * All external access MUST pass through this filter.
 */

const path = require('path')
const os = require('os')
const config = require('./config')
const { createLogger } = require('../app/constants')

const log = createLogger('learning:safety')

class SafetyFilter {
  /**
   * Create a new SafetyFilter
   * @param {Object} options - Override default configuration
   */
  constructor(options = {}) {
    const safetyConfig = { ...config.safety, ...options }

    // Allowed domains for web access
    this.allowedDomains = new Set(safetyConfig.allowedDomains || [])

    // Allowed protocols (HTTPS preferred for security)
    this.allowedProtocols = new Set(safetyConfig.allowedProtocols || ['https:'])

    // Allowed MIME types for content
    this.allowedMimeTypes = new Set(safetyConfig.allowedMimeTypes || [])

    // Allowed local filesystem paths
    this.allowedPaths = safetyConfig.allowedPaths || []

    // Content limits
    this.maxContentSize = safetyConfig.maxContentSize || 10 * 1024 * 1024
    this.maxFilesPerSession = safetyConfig.maxFilesPerSession || 50
    this.maxRequestsPerMinute = safetyConfig.maxRequestsPerMinute || 10

    // Session tracking
    this.filesThisSession = 0
    this.requestTimestamps = []

    // Audit log
    this.auditLog = []

    log(
      'Safety filter initialized with',
      this.allowedDomains.size,
      'domains,',
      this.allowedPaths.length,
      'paths',
    )
  }

  /**
   * Check if a URL is allowed for fetching
   * @param {string} urlString - URL to check
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  checkUrl(urlString) {
    try {
      const url = new URL(urlString)

      // Protocol check
      if (!this.allowedProtocols.has(url.protocol)) {
        const result = {
          allowed: false,
          reason: `Protocol "${url.protocol}" not allowed. Only ${Array.from(this.allowedProtocols).join(', ')} permitted.`,
        }
        this._audit('url_blocked', { url: urlString, reason: result.reason })
        log.warn('URL blocked:', result.reason)
        return result
      }

      // Domain check - normalize by removing www prefix
      const domain = url.hostname.replace(/^www\./, '')
      const domainAllowed = Array.from(this.allowedDomains).some((allowed) => {
        // Exact match or subdomain match
        return domain === allowed || domain.endsWith('.' + allowed)
      })

      if (!domainAllowed) {
        const result = {
          allowed: false,
          reason: `Domain "${domain}" not in whitelist. Allowed: ${Array.from(this.allowedDomains).slice(0, 5).join(', ')}...`,
        }
        this._audit('url_blocked', { url: urlString, reason: result.reason })
        log.warn('URL blocked:', result.reason)
        return result
      }

      // URL is allowed
      this._audit('url_allowed', { url: urlString, domain })
      log('URL allowed:', domain)
      return { allowed: true, domain }
    } catch (error) {
      const result = {
        allowed: false,
        reason: `Invalid URL: ${error.message}`,
      }
      this._audit('url_error', { url: urlString, error: error.message })
      log.error('URL check error:', error.message)
      return result
    }
  }

  /**
   * Check if a local filesystem path is allowed
   * @param {string} filepath - Path to check
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  checkPath(filepath) {
    try {
      // Normalize path - handle various formats
      let normalizedPath = filepath

      // Handle /workspace/* paths by mapping to current working directory
      if (filepath.startsWith('/workspace/')) {
        // Map /workspace/X to the current workspace
        const relativePart = filepath.slice('/workspace/'.length)
        normalizedPath = path.join(process.cwd(), relativePart)
        log('Normalized /workspace path:', filepath, '->', normalizedPath)
      } else if (filepath.startsWith('/workspace')) {
        normalizedPath = process.cwd()
      }

      // Resolve to absolute path
      const resolved = path.resolve(normalizedPath)

      // Check against allowed paths
      const pathAllowed = this.allowedPaths.some((allowedPath) => {
        try {
          const resolvedAllowed = path.resolve(allowedPath)
          return resolved.startsWith(resolvedAllowed)
        } catch {
          return false
        }
      })

      if (!pathAllowed) {
        const result = {
          allowed: false,
          reason: `Path not allowed: ${filepath}\nResolved to: ${resolved}\nAllowed: ${this.allowedPaths.slice(0, 3).join(' or ')}`,
        }
        this._audit('path_blocked', { path: filepath, resolved, reason: result.reason })
        log.warn('Path blocked:', result.reason)
        return result
      }

      // Check for path traversal attempts
      if (filepath.includes('..')) {
        const result = {
          allowed: false,
          reason: 'Path traversal (..) not allowed',
        }
        this._audit('path_blocked', { path: filepath, reason: result.reason })
        log.warn('Path blocked:', result.reason)
        return result
      }

      this._audit('path_allowed', { path: filepath, resolved })
      log('Path allowed:', resolved)
      return { allowed: true, resolved }
    } catch (error) {
      const result = {
        allowed: false,
        reason: `Invalid path: ${error.message}`,
      }
      this._audit('path_error', { path: filepath, error: error.message })
      log.error('Path check error:', error.message)
      return result
    }
  }

  /**
   * Check if a MIME type is allowed
   * @param {string} mimeType - MIME type to check
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  checkMimeType(mimeType) {
    // Normalize MIME type (remove parameters like charset)
    const normalized = mimeType.split(';')[0].trim().toLowerCase()

    if (!this.allowedMimeTypes.has(normalized)) {
      const result = {
        allowed: false,
        reason: `MIME type "${normalized}" not allowed. Allowed: ${Array.from(this.allowedMimeTypes).join(', ')}`,
      }
      this._audit('mime_blocked', { mimeType, normalized, reason: result.reason })
      log.warn('MIME type blocked:', result.reason)
      return result
    }

    this._audit('mime_allowed', { mimeType: normalized })
    return { allowed: true }
  }

  /**
   * Check if content size is within limits
   * @param {number} size - Content size in bytes
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  checkContentSize(size) {
    if (size > this.maxContentSize) {
      const sizeMB = (size / 1024 / 1024).toFixed(2)
      const maxMB = (this.maxContentSize / 1024 / 1024).toFixed(2)
      const result = {
        allowed: false,
        reason: `Content size ${sizeMB}MB exceeds limit of ${maxMB}MB`,
      }
      this._audit('size_blocked', { size, maxSize: this.maxContentSize, reason: result.reason })
      log.warn('Size blocked:', result.reason)
      return result
    }

    return { allowed: true }
  }

  /**
   * Check and consume a file slot from the session limit
   * @returns {Object} { allowed: boolean, reason?: string, remaining?: number }
   */
  checkSessionFileLimit() {
    if (this.filesThisSession >= this.maxFilesPerSession) {
      const result = {
        allowed: false,
        reason: `Session file limit of ${this.maxFilesPerSession} reached. Reset session to continue.`,
      }
      this._audit('session_limit', {
        filesUsed: this.filesThisSession,
        limit: this.maxFilesPerSession,
      })
      log.warn('Session limit reached:', this.filesThisSession, '/', this.maxFilesPerSession)
      return result
    }

    this.filesThisSession++
    const remaining = this.maxFilesPerSession - this.filesThisSession

    this._audit('file_consumed', { filesUsed: this.filesThisSession, remaining })
    log('File slot consumed:', this.filesThisSession, '/', this.maxFilesPerSession)

    return { allowed: true, remaining }
  }

  /**
   * Check rate limit (requests per minute)
   * @returns {Object} { allowed: boolean, reason?: string, retryAfter?: number }
   */
  checkRateLimit() {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > oneMinuteAgo)

    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      // Calculate when the oldest request will expire
      const oldestTimestamp = this.requestTimestamps[0]
      const retryAfter = Math.ceil((oldestTimestamp + 60000 - now) / 1000)

      const result = {
        allowed: false,
        reason: `Rate limit of ${this.maxRequestsPerMinute} requests/minute exceeded`,
        retryAfter,
      }
      this._audit('rate_limited', { requestsInWindow: this.requestTimestamps.length, retryAfter })
      log.warn('Rate limited, retry after:', retryAfter, 'seconds')
      return result
    }

    this.requestTimestamps.push(now)

    return {
      allowed: true,
      requestsRemaining: this.maxRequestsPerMinute - this.requestTimestamps.length,
    }
  }

  /**
   * Perform comprehensive check for a fetch request
   * @param {Object} request - Request details
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  checkFetchRequest(request) {
    // Rate limit check
    const rateCheck = this.checkRateLimit()
    if (!rateCheck.allowed) return rateCheck

    // Session limit check
    const sessionCheck = this.checkSessionFileLimit()
    if (!sessionCheck.allowed) return sessionCheck

    // URL check (if URL provided)
    if (request.url) {
      const urlCheck = this.checkUrl(request.url)
      if (!urlCheck.allowed) return urlCheck
    }

    // Path check (if local path provided)
    if (request.filepath) {
      const pathCheck = this.checkPath(request.filepath)
      if (!pathCheck.allowed) return pathCheck
    }

    return { allowed: true }
  }

  /**
   * Add a domain to the whitelist
   * @param {string} domain - Domain to add
   */
  addDomain(domain) {
    this.allowedDomains.add(domain)
    this._audit('domain_added', { domain })
    log('Domain added to whitelist:', domain)
  }

  /**
   * Add a path to the allowed paths
   * @param {string} newPath - Path to add
   */
  addPath(newPath) {
    const resolved = path.resolve(newPath)
    this.allowedPaths.push(resolved)
    this._audit('path_added', { path: resolved })
    log('Path added to whitelist:', resolved)
  }

  /**
   * Reset session counters (typically called when starting a new learning session)
   */
  resetSession() {
    this.filesThisSession = 0
    this.requestTimestamps = []
    this._audit('session_reset', { timestamp: Date.now() })
    log('Session counters reset')
  }

  /**
   * Get current session statistics
   * @returns {Object} Session stats
   */
  getSessionStats() {
    return {
      filesUsed: this.filesThisSession,
      filesRemaining: this.maxFilesPerSession - this.filesThisSession,
      requestsInWindow: this.requestTimestamps.length,
      requestsRemaining: this.maxRequestsPerMinute - this.requestTimestamps.length,
    }
  }

  /**
   * Get recent audit log entries
   * @param {number} count - Number of entries to return
   * @returns {Array} Recent audit entries
   */
  getAuditLog(count = 50) {
    return this.auditLog.slice(-count)
  }

  /**
   * Record an audit log entry
   * @private
   */
  _audit(event, data) {
    const entry = {
      timestamp: Date.now(),
      event,
      data,
    }

    this.auditLog.push(entry)

    // Keep only recent entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000)
    }
  }

  /**
   * Get current configuration
   * @returns {Object} Current filter configuration
   */
  getConfig() {
    return {
      allowedDomains: Array.from(this.allowedDomains),
      allowedProtocols: Array.from(this.allowedProtocols),
      allowedMimeTypes: Array.from(this.allowedMimeTypes),
      allowedPaths: this.allowedPaths,
      maxContentSize: this.maxContentSize,
      maxFilesPerSession: this.maxFilesPerSession,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
    }
  }
}

module.exports = { SafetyFilter }
