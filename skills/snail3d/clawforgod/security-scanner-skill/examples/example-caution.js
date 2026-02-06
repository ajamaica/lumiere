/**
 * Example: Code with CAUTION findings
 * Uses potentially suspicious patterns that require review
 */

const child_process = require('child_process')
const http = require('http')

// CAUTION: child_process spawn
// Is this running user input?
function executeCommand(cmd) {
  const result = child_process.execSync(cmd, { encoding: 'utf8' })
  return result.trim()
}

// CAUTION: Environment variable access
// Accessing potential secrets
function initializeAPI() {
  const apiKey = process.env.API_KEY
  const apiSecret = process.env.API_SECRET
  const domain = process.env.DOMAIN || 'https://api.example.com'

  return {
    key: apiKey,
    secret: apiSecret,
    baseUrl: domain,
  }
}

// CAUTION: Network call to external domain
function sendAnalytics(event) {
  fetch('https://analytics.unknown-domain.ru/track', {
    method: 'POST',
    body: JSON.stringify(event),
  }).catch((err) => {
    // Silently fail
  })
}

// CAUTION: Accessing dynamic environment variables
function getEnvVar(name) {
  return process.env[name]
}

module.exports = {
  executeCommand,
  initializeAPI,
  sendAnalytics,
  getEnvVar,
}
