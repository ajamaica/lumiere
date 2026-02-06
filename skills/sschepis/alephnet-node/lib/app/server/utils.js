/**
 * Server Utilities
 *
 * Common utilities for the HTTP server including logging, CORS, and response helpers.
 */

const { createLogger, colors } = require('../constants')

// Create loggers for different subsystems
const loggers = {
  http: createLogger('server:http'),
  node: createLogger('server:node'),
  stream: createLogger('server:stream'),
  tool: createLogger('server:tool'),
  sse: createLogger('server:sse'),
  learn: createLogger('learning:server'),
  webrtc: createLogger('webrtc:server'),
  provider: createLogger('server:provider'),
}

/**
 * Set CORS headers on response
 * @param {Object} res - HTTP response
 * @param {Object} options - Server options (optional, defaults to enabling CORS)
 */
function setCorsHeaders(res, options = { cors: true }) {
  if (!options || options.cors !== false) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
}

/**
 * Send JSON response
 * @param {Object} res - HTTP response
 * @param {*} data - Data to send
 * @param {number} status - HTTP status code
 */
function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

/**
 * Read request body
 * @param {Object} req - HTTP request
 * @returns {Promise<string>} Body content
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

/**
 * Generate a unique node ID
 * @returns {string} Node ID
 */
function generateNodeId() {
  const crypto = require('crypto')
  const hostname = require('os').hostname()
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(4).toString('hex')
  return `${hostname}-${timestamp}-${random}`
}

/**
 * Get a summary string for a sense reading
 * @param {string} name - Sense name
 * @param {Object} reading - Sense reading
 * @returns {string} Summary string
 */
function getSenseSummary(name, reading) {
  switch (name) {
    case 'chrono':
      if (!reading.uptime) return 'Initializing...'
      const mins = Math.floor(reading.uptime / 60000)
      return mins > 0 ? `Up ${mins}m` : `Up ${Math.floor(reading.uptime / 1000)}s`

    case 'proprio':
      if (!reading.coherence) return 'No data'
      return `C=${(reading.coherence * 100).toFixed(0)}% H=${(reading.entropy * 100).toFixed(0)}%`

    case 'filesystem':
      if (!reading.files) return 'Scanning...'
      return `${reading.files} files`

    case 'git':
      if (!reading.branch) return 'No repo'
      return reading.isDirty ? `${reading.branch} (dirty)` : reading.branch

    case 'process':
      if (!reading.memory) return 'Loading...'
      const mb = Math.floor(reading.memory / (1024 * 1024))
      return `${mb}MB | CPU ${(reading.cpu * 100).toFixed(0)}%`

    case 'network':
      if (reading.connected === false) return 'Disconnected'
      if (!reading.latency) return 'Connected'
      return `${reading.latency.toFixed(0)}ms`

    case 'user':
      if (!reading.idleDuration) return 'Active'
      const idle = reading.idleDuration
      if (idle < 60000) return `Idle ${Math.floor(idle / 1000)}s`
      return `Idle ${Math.floor(idle / 60000)}m`

    default:
      return 'Unknown'
  }
}

/**
 * SMF axis names
 */
const SMF_AXES = [
  'coherence',
  'identity',
  'duality',
  'structure',
  'change',
  'life',
  'harmony',
  'wisdom',
  'infinity',
  'creation',
  'truth',
  'love',
  'power',
  'time',
  'space',
  'consciousness',
]

/**
 * SMF axis descriptions
 */
const SMF_AXIS_DESCRIPTIONS = [
  'internal consistency',
  'self-continuity',
  'complementarity',
  'organization',
  'transformation',
  'vitality',
  'balance',
  'insight',
  'boundlessness',
  'genesis',
  'verity',
  'connection',
  'capacity',
  'temporality',
  'extension',
  'awareness',
]

module.exports = {
  loggers,
  colors,
  setCorsHeaders,
  sendJson,
  readBody,
  generateNodeId,
  getSenseSummary,
  SMF_AXES,
  SMF_AXIS_DESCRIPTIONS,
}
