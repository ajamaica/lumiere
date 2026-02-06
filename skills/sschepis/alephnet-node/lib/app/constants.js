/**
 * Constants for the Sentient Observer application
 *
 * Contains ANSI color codes, MIME types for static file serving, and logging utilities.
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgMagenta: '\x1b[45m',
}

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

/**
 * Debug logger - controlled via DEBUG environment variable
 *
 * Usage:
 *   DEBUG=* node index.js --server          # All logs
 *   DEBUG=server node index.js --server     # Server logs only
 *   DEBUG=server:http,server:node           # HTTP and node logs
 *
 * Namespaces:
 *   server:http    - HTTP requests/responses
 *   server:node    - Node connections (inbound/outbound)
 *   server:stream  - Streaming chat operations
 *   server:tool    - Tool executions
 *   server:sse     - Server-sent events
 */
function createLogger(namespace) {
  // Check if this namespace is enabled - DYNAMIC check on each call
  // This is necessary because DEBUG may be set after module load
  const isEnabled = () => {
    const debugEnv = process.env.DEBUG || ''
    const patterns = debugEnv
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p)

    if (patterns.length === 0) return false
    if (patterns.includes('*')) return true

    return patterns.some((pattern) => {
      if (pattern === namespace) return true
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1)
        return namespace.startsWith(prefix)
      }
      return false
    })
  }

  const getColor = () => {
    // Generate consistent color based on namespace
    const colorKeys = ['cyan', 'magenta', 'yellow', 'blue', 'green']
    let hash = 0
    for (let i = 0; i < namespace.length; i++) {
      hash = (hash << 5) - hash + namespace.charCodeAt(i)
    }
    return colors[colorKeys[Math.abs(hash) % colorKeys.length]]
  }

  const color = getColor()

  const log = (...args) => {
    if (!isEnabled()) return
    const timestamp = new Date().toISOString().slice(11, 23)
    console.log(
      `${colors.dim}${timestamp}${colors.reset} ${color}${namespace}${colors.reset}`,
      ...args,
    )
  }

  // Dynamic property that checks current state
  Object.defineProperty(log, 'enabled', {
    get: () => isEnabled(),
  })

  log.error = (...args) => {
    if (!isEnabled()) return
    const timestamp = new Date().toISOString().slice(11, 23)
    console.error(
      `${colors.dim}${timestamp}${colors.reset} ${colors.red}${namespace}${colors.reset}`,
      ...args,
    )
  }

  log.warn = (...args) => {
    if (!isEnabled()) return
    const timestamp = new Date().toISOString().slice(11, 23)
    console.warn(
      `${colors.dim}${timestamp}${colors.reset} ${colors.yellow}${namespace}${colors.reset}`,
      ...args,
    )
  }

  return log
}

export { colors, createLogger, MIME_TYPES }

export default {
  colors,
  MIME_TYPES,
  createLogger,
}
