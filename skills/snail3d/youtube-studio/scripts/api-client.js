/**
 * YouTube API Client with Rate Limiting & Error Recovery
 * Handles quota tracking, exponential backoff, and request batching
 */

const { google } = require('googleapis')
const { getOAuth2Client } = require('./auth-handler')
const { logger } = require('./utils')
const fs = require('fs')
const path = require('path')

// Rate limiting state
let quotaState = {
  dailyQuota: 1000000,
  used: 0,
  resetTime: new Date().toISOString(),
}

const QUOTA_FILE = path.join(process.env.HOME, '.clawd-youtube', 'quota-tracking.json')
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second

/**
 * Get authenticated YouTube API client
 * @returns {Promise<Object>} YouTube API client
 */
async function getAuthenticatedClient() {
  try {
    const auth = await getOAuth2Client()
    const youtube = google.youtube({
      version: 'v3',
      auth,
    })

    return youtube
  } catch (error) {
    logger.error('Failed to get authenticated client', error)
    throw error
  }
}

/**
 * Make a quota-aware API request with retry logic
 * @param {Function} requestFn - Function that makes the API request
 * @param {number} quotaCost - Quota units this request costs
 * @param {number} retries - Current retry count
 * @returns {Promise<Object>} API response
 */
async function makeQuotaAwareRequest(requestFn, quotaCost = 1, retries = 0) {
  try {
    // Check quota before making request
    const quota = await getQuotaStatus()

    if (quota.remaining < quotaCost) {
      const resetTime = new Date(quota.resetTime)
      const now = new Date()
      const minutesUntilReset = Math.ceil((resetTime - now) / 60000)

      const error = new Error(
        `Quota exceeded. Used ${quota.used}/${quota.dailyQuota}. Resets in ${minutesUntilReset} minutes.`,
      )
      error.code = 'QUOTA_EXCEEDED'
      throw error
    }

    // Make the request
    logger.info(`Making API request (quota: ${quota.used}/${quota.dailyQuota})`)
    const response = await requestFn()

    // Record quota usage
    await recordQuotaUsage(quotaCost)

    return response
  } catch (error) {
    // Handle specific errors
    if (error.code === 'QUOTA_EXCEEDED') {
      throw error // Don't retry quota exceeded
    }

    if (error.status === 401) {
      // Unauthorized - try refreshing token
      logger.warn('Unauthorized (401), attempting token refresh')
      const { getValidAccessToken } = require('./auth-handler')
      const tokensPath = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')

      try {
        await getValidAccessToken(tokensPath)
        if (retries < MAX_RETRIES) {
          return makeQuotaAwareRequest(requestFn, quotaCost, retries + 1)
        }
      } catch (refreshError) {
        logger.error('Token refresh failed', refreshError)
        throw error
      }
    }

    if (error.status === 429 || error.status === 503) {
      // Rate limited or service unavailable - exponential backoff
      if (retries < MAX_RETRIES) {
        const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, retries)
        logger.warn(
          `Rate limited (${error.status}), retrying in ${delayMs}ms (attempt ${retries + 1}/${MAX_RETRIES})`,
        )

        await sleep(delayMs)
        return makeQuotaAwareRequest(requestFn, quotaCost, retries + 1)
      }
    }

    if (error.status >= 500) {
      // Server error - retry
      if (retries < MAX_RETRIES) {
        const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, retries)
        logger.warn(
          `Server error (${error.status}), retrying in ${delayMs}ms (attempt ${retries + 1}/${MAX_RETRIES})`,
        )

        await sleep(delayMs)
        return makeQuotaAwareRequest(requestFn, quotaCost, retries + 1)
      }
    }

    // Other errors - throw immediately
    logger.error('API request failed', error)
    throw error
  }
}

/**
 * Batch multiple requests together
 * @param {Array} requests - Array of {fn, quotaCost}
 * @param {number} batchSize - Max requests per batch (YouTube: 50)
 * @returns {Promise<Array>} Responses array
 */
async function batchRequests(requests, batchSize = 50) {
  const results = []

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    logger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(requests.length / batchSize)}`,
    )

    const batchResponses = await Promise.all(
      batch.map((req) =>
        makeQuotaAwareRequest(req.fn, req.quotaCost).catch((err) => ({
          error: err.message,
        })),
      ),
    )

    results.push(...batchResponses)
  }

  return results
}

/**
 * Get current quota status
 * @returns {Promise<Object>} {dailyQuota, used, remaining, resetTime}
 */
async function getQuotaStatus() {
  try {
    loadQuotaState()

    const now = new Date()
    const resetTime = new Date(quotaState.resetTime)

    // Reset at midnight UTC
    if (now.getUTCDate() !== resetTime.getUTCDate()) {
      quotaState.used = 0
      quotaState.resetTime = now.toISOString()
      saveQuotaState()
    }

    return {
      dailyQuota: quotaState.dailyQuota,
      used: quotaState.used,
      remaining: quotaState.dailyQuota - quotaState.used,
      resetTime: quotaState.resetTime,
      percentUsed: ((quotaState.used / quotaState.dailyQuota) * 100).toFixed(1),
    }
  } catch (error) {
    logger.error('Failed to get quota status', error)
    return {
      dailyQuota: 1000000,
      used: 0,
      remaining: 1000000,
    }
  }
}

/**
 * Record quota usage
 * @param {number} units - Units consumed
 */
async function recordQuotaUsage(units) {
  try {
    loadQuotaState()
    quotaState.used += units
    saveQuotaState()

    const percentUsed = (quotaState.used / quotaState.dailyQuota) * 100

    if (percentUsed > 95) {
      logger.error(`⚠️ CRITICAL: Quota usage at ${percentUsed.toFixed(1)}%`)
    } else if (percentUsed > 80) {
      logger.warn(`⚠️ Warning: Quota usage at ${percentUsed.toFixed(1)}%`)
    }
  } catch (error) {
    logger.error('Failed to record quota usage', error)
  }
}

/**
 * Load quota state from disk
 */
function loadQuotaState() {
  try {
    if (fs.existsSync(QUOTA_FILE)) {
      const data = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf8'))
      quotaState = { ...quotaState, ...data }
    }
  } catch (error) {
    logger.warn('Failed to load quota state', error)
  }
}

/**
 * Save quota state to disk
 */
function saveQuotaState() {
  try {
    const dir = path.dirname(QUOTA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(QUOTA_FILE, JSON.stringify(quotaState, null, 2))
  } catch (error) {
    logger.error('Failed to save quota state', error)
  }
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Circuit breaker for failing endpoints
 */
class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold
    this.resetTimeout = resetTimeout
    this.failures = 0
    this.lastFailureTime = null
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime
      if (timeSinceLastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN'
        logger.info('Circuit breaker: HALF_OPEN, attempting request')
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
      logger.error(`Circuit breaker: OPEN after ${this.failures} failures`)
    }
  }
}

module.exports = {
  getAuthenticatedClient,
  makeQuotaAwareRequest,
  batchRequests,
  getQuotaStatus,
  recordQuotaUsage,
  CircuitBreaker,
}
