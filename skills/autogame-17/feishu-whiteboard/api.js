const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Unified Token Cache (Shared with feishu-doc, feishu-card, etc.)
const TOKEN_CACHE_FILE = path.resolve(__dirname, '../../memory/feishu_token.json')

let tokenCache = {
  token: null,
  expireTime: 0,
}

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json')
  let config = {}
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    } catch (e) {
      // Ignore
    }
  }

  return {
    app_id: process.env.FEISHU_APP_ID || config.app_id,
    app_secret: process.env.FEISHU_APP_SECRET || config.app_secret,
  }
}

async function getTenantAccessToken(forceRefresh = false) {
  const now = Math.floor(Date.now() / 1000)

  // Try to load from disk first
  if (!forceRefresh && !tokenCache.token && fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'))
      // Handle both 'expire' (standard) and 'expireTime' (legacy)
      const expiry = saved.expire || saved.expireTime
      if (saved.token && expiry > now) {
        tokenCache.token = saved.token
        tokenCache.expireTime = expiry
      }
    } catch (e) {
      // Ignore corrupted cache
    }
  }

  // Force Refresh: Delete memory cache and file cache
  if (forceRefresh) {
    tokenCache.token = null
    tokenCache.expireTime = 0
  }

  if (tokenCache.token && tokenCache.expireTime > now) {
    return tokenCache.token
  }

  const config = loadConfig()
  if (!config.app_id || !config.app_secret) {
    throw new Error('Missing app_id or app_secret.')
  }

  const response = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: config.app_id,
        app_secret: config.app_secret,
      }),
    },
  )

  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`Failed to get tenant_access_token: ${data.msg}`)
  }

  tokenCache.token = data.tenant_access_token
  tokenCache.expireTime = now + data.expire - 60

  try {
    const cacheDir = path.dirname(TOKEN_CACHE_FILE)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    fs.writeFileSync(
      TOKEN_CACHE_FILE,
      JSON.stringify(
        {
          token: tokenCache.token,
          expire: tokenCache.expireTime,
        },
        null,
        2,
      ),
    )
  } catch (e) {
    console.error('Failed to save token cache:', e.message)
  }

  return tokenCache.token
}

async function apiRequest(method, endpoint, body = null) {
  let token = await getTenantAccessToken()
  const url = `https://open.feishu.cn${endpoint}`

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=utf-8',
  }

  let response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })

  // Handle token expiry (code 99991663 or similar auth errors)
  // Simple check: if 401, retry once
  if (response.status === 401) {
    token = await getTenantAccessToken(true)
    headers['Authorization'] = `Bearer ${token}`
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    })
  }

  const rawText = await response.text()
  let data
  try {
    data = JSON.parse(rawText)
  } catch (e) {
    throw new Error(`Failed to parse API response: ${rawText.substring(0, 200)}...`)
  }

  if (data.code !== 0) {
    throw new Error(`API Error [${endpoint}]: ${data.msg} (Code: ${data.code})`)
  }
  return data.data
}

module.exports = {
  getTenantAccessToken,
  apiRequest,
}
