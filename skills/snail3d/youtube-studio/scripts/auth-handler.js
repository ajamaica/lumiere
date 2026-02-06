/**
 * OAuth 2.0 Authentication Handler
 * Manages Google authentication and token refresh
 */

const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')
const { google } = require('googleapis')
const { logger } = require('./utils')

// OAuth2 scopes
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
]

/**
 * Authenticate with Google and save tokens
 * @param {string} credentialsPath - Path to credentials.json
 * @param {string} tokensPath - Path to save tokens
 * @returns {Promise<Object>} Authentication result
 */
async function authenticate(credentialsPath, tokensPath) {
  try {
    logger.info('Starting OAuth authentication')

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found: ${credentialsPath}`)
    }

    const credentialsData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
    const { client_id, client_secret, redirect_uris } = credentialsData.installed

    // Check if tokens already exist and are valid
    if (fs.existsSync(tokensPath)) {
      try {
        const existingTokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))
        if (existingTokens.refresh_token) {
          logger.info('Using existing refresh token')
          return { refreshToken: existingTokens.refresh_token }
        }
      } catch (e) {
        logger.warn('Existing tokens invalid, re-authenticating')
      }
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

    // Get authorization code
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    })

    console.log('\n🔐 Opening browser for authentication...')
    console.log(`If browser doesn't open, visit: ${authUrl}`)

    // Open browser and get auth code
    const authCode = await getAuthorizationCode(authUrl)

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(authCode)
    logger.info('Tokens obtained from Google')

    // Save tokens
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2))
    logger.info(`Tokens saved to ${tokensPath}`)

    return {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresIn: tokens.expiry_date,
    }
  } catch (error) {
    logger.error('Authentication failed', error)
    throw error
  }
}

/**
 * Get authorization code via OAuth flow
 * @param {string} authUrl - Authorization URL
 * @returns {Promise<string>} Authorization code
 */
async function getAuthorizationCode(authUrl) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true)
      const query = parsedUrl.query

      if (query.code) {
        // Success
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`
          <html>
            <head><title>Authorization Successful</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>✅ Authorization Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
              <p>YouTube Studio is now connected.</p>
            </body>
          </html>
        `)
        server.close()
        resolve(query.code)
      } else if (query.error) {
        // Error
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`
          <html>
            <head><title>Authorization Failed</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>❌ Authorization Failed</h1>
              <p>Error: ${query.error}</p>
              <p>${query.error_description || ''}</p>
            </body>
          </html>
        `)
        server.close()
        reject(new Error(query.error_description || query.error))
      }
    })

    server.listen(8888, () => {
      // Try to open browser
      const openUrl = (url) => {
        const { spawn } = require('child_process')
        const platform = process.platform

        if (platform === 'darwin') {
          spawn('open', [url])
        } else if (platform === 'win32') {
          spawn('cmd', ['/c', `start ${url}`])
        } else {
          spawn('xdg-open', [url])
        }
      }

      openUrl(authUrl)

      setTimeout(() => {
        if (!server.listening) return // Already resolved
        logger.warn('No response from browser, waiting...')
      }, 5000)
    })

    server.on('error', reject)
  })
}

/**
 * Get or refresh access token
 * @param {string} tokensPath - Path to tokens file
 * @returns {Promise<string>} Valid access token
 */
async function getValidAccessToken(tokensPath) {
  try {
    if (!fs.existsSync(tokensPath)) {
      throw new Error('No tokens found. Run auth command first.')
    }

    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))

    // Check if token is expired
    const now = Date.now()
    const expiryDate = tokens.expiry_date || 0

    if (expiryDate > now + 60000) {
      // Token still valid for > 1 minute
      logger.info('Using cached access token')
      return tokens.access_token
    }

    // Refresh token
    logger.info('Refreshing access token')
    const refreshToken = tokens.refresh_token

    if (!refreshToken) {
      throw new Error('No refresh token found. Re-authenticate.')
    }

    // Get credentials
    const credentialsPath = path.join(process.env.HOME, '.clawd-youtube', 'credentials.json')

    if (!fs.existsSync(credentialsPath)) {
      throw new Error('Credentials file not found.')
    }

    const credentialsData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
    const { client_id, client_secret, redirect_uris } = credentialsData.installed

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const { credentials } = await oauth2Client.refreshAccessToken()

    // Update tokens file
    const updatedTokens = {
      ...tokens,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
    }

    fs.writeFileSync(tokensPath, JSON.stringify(updatedTokens, null, 2))
    logger.info('Access token refreshed and saved')

    return credentials.access_token
  } catch (error) {
    logger.error('Failed to get valid access token', error)
    throw error
  }
}

/**
 * Get authenticated OAuth2 client
 * @returns {Promise<Object>} Google OAuth2 client
 */
async function getOAuth2Client() {
  try {
    const credentialsPath = path.join(process.env.HOME, '.clawd-youtube', 'credentials.json')
    const tokensPath = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials not found at ${credentialsPath}`)
    }

    const credentialsData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
    const { client_id, client_secret, redirect_uris } = credentialsData.installed

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

    // Get valid token
    const accessToken = await getValidAccessToken(tokensPath)
    oauth2Client.setCredentials({ access_token: accessToken })

    return oauth2Client
  } catch (error) {
    logger.error('Failed to get OAuth2 client', error)
    throw error
  }
}

/**
 * Check if authenticated
 * @returns {boolean} True if tokens exist
 */
function isAuthenticated() {
  const tokensPath = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')
  return fs.existsSync(tokensPath)
}

/**
 * Clear authentication (logout)
 */
function logout() {
  try {
    const tokensPath = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')
    if (fs.existsSync(tokensPath)) {
      fs.unlinkSync(tokensPath)
      logger.info('Logged out successfully')
    }
  } catch (error) {
    logger.error('Failed to logout', error)
  }
}

module.exports = {
  authenticate,
  getValidAccessToken,
  getOAuth2Client,
  isAuthenticated,
  logout,
}
