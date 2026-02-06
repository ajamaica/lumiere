/**
 * Utility Functions
 * Logging, formatting, and helpers
 */

const fs = require('fs')
const path = require('path')

// Logger instance
let logger = null

/**
 * Initialize logger
 */
function initLogger() {
  const logDir = path.join(process.env.HOME, '.clawd-youtube', 'logs')

  // Create log directory
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  const logFile = path.join(logDir, `youtube-studio-${new Date().toISOString().split('T')[0]}.log`)
  const logLevel = process.env.LOG_LEVEL || 'info'

  logger = {
    debug: (msg, data) => logToFile('DEBUG', msg, data, logFile),
    info: (msg, data) => logToFile('INFO', msg, data, logFile),
    warn: (msg, data) => logToFile('WARN', msg, data, logFile),
    error: (msg, data) => logToFile('ERROR', msg, data, logFile),
  }

  return logger
}

/**
 * Log to file
 * @param {string} level - Log level
 * @param {string} msg - Message
 * @param {*} data - Optional data
 * @param {string} logFile - Log file path
 */
function logToFile(level, msg, data, logFile) {
  const timestamp = new Date().toISOString()
  let logEntry = `[${timestamp}] ${level}: ${msg}`

  if (data) {
    if (typeof data === 'object') {
      logEntry += `\n${JSON.stringify(data, null, 2)}`
    } else {
      logEntry += `\n${data}`
    }
  }

  try {
    fs.appendFileSync(logFile, logEntry + '\n\n')
  } catch (error) {
    console.error('Failed to write to log file:', error)
  }

  // Also log to console for visible levels
  if (level === 'ERROR' || level === 'WARN') {
    console.error(`[${level}] ${msg}`)
  }
}

/**
 * Format file size
 * @param {number} bytes - Bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Format duration in seconds to HH:MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * Parse ISO 8601 duration (PT1H30M20S) to seconds
 * @param {string} duration - Duration string
 * @returns {number} Duration in seconds
 */
function parseDurationToSeconds(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  let seconds = 0

  if (match[1]) seconds += parseInt(match[1]) * 3600
  if (match[2]) seconds += parseInt(match[2]) * 60
  if (match[3]) seconds += parseInt(match[3])

  return seconds
}

/**
 * Get relative time (e.g., "2 days ago")
 * @param {Date} date - Date to compare
 * @returns {string} Relative time
 */
function getRelativeTime(date) {
  const now = new Date()
  const diffMs = now - new Date(date)
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

/**
 * Validate video metadata
 * @param {Object} metadata - Video metadata
 * @returns {Object} {valid: boolean, errors: []}
 */
function validateVideoMetadata(metadata) {
  const errors = []

  if (!metadata.title) {
    errors.push('Title is required')
  } else if (metadata.title.length > 100) {
    errors.push('Title must be 100 characters or less')
  }

  if (metadata.description && metadata.description.length > 5000) {
    errors.push('Description must be 5000 characters or less')
  }

  if (metadata.tags) {
    const tagString = Array.isArray(metadata.tags) ? metadata.tags.join(',') : metadata.tags
    if (tagString.length > 500) {
      errors.push('Tags must total 500 characters or less')
    }
  }

  if (
    metadata.privacyStatus &&
    !['public', 'unlisted', 'private'].includes(metadata.privacyStatus)
  ) {
    errors.push('Invalid privacy status')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Parse YouTube URL to extract video ID
 * @param {string} youtubeUrl - YouTube URL
 * @returns {string|null} Video ID or null
 */
function extractVideoId(youtubeUrl) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = youtubeUrl.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Max length
 * @returns {string} Truncated string
 */
function truncate(str, maxLength = 100) {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Clean text for display (remove HTML entities, etc.)
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text) return ''

  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n/g, ' ')
    .trim()
}

/**
 * Validate email address
 * @param {string} email - Email
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Deep merge objects
 * @param {Object} target - Target object
 * @param {...Object} sources - Source objects
 * @returns {Object} Merged object
 */
function deepMerge(target, ...sources) {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        deepMerge(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return deepMerge(target, ...sources)
}

/**
 * Check if value is object
 * @param {*} item - Item to check
 * @returns {boolean}
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Max attempts
 * @param {number} initialDelayMs - Initial delay in ms
 * @returns {Promise<*>} Function result
 */
async function retryWithBackoff(fn, maxAttempts = 3, initialDelayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

module.exports = {
  initLogger,
  logger: () => logger,
  formatBytes,
  formatDuration,
  parseDurationToSeconds,
  getRelativeTime,
  validateVideoMetadata,
  extractVideoId,
  truncate,
  cleanText,
  isValidEmail,
  deepMerge,
  retryWithBackoff,
}

// Export logger instance
Object.defineProperty(module.exports, 'logger', {
  get() {
    return logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
  },
})
