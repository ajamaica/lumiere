const fs = require('fs')
const path = require('path')
const https = require('https')
// Try to load .env from cwd or project root, but don't crash if missing (Env vars might be injected)
require('dotenv').config()

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
// Use process.cwd() to find memory folder, assuming running from workspace root
const TOKEN_CACHE_FILE = path.resolve(process.cwd(), 'memory/feishu_token.json')

// --- Upstream Logic Injection (Simplified) ---
// Upstream uses @larksuiteoapi/node-sdk but we are lightweight.
// We replicate the robustness, not the dependency.

/**
 * Robust Fetch with Retry (Exponential Backoff)
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  const timeoutMs = options.timeout || 15000

  for (let i = 0; i < retries; i++) {
    let timeoutId
    try {
      const controller = new AbortController()
      timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      const fetchOptions = { ...options, signal: controller.signal }
      delete fetchOptions.timeout

      const res = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      if (!res.ok) {
        // Rate Limiting (429)
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After')
          let waitMs = 1000 * Math.pow(2, i)
          if (retryAfter) waitMs = parseInt(retryAfter, 10) * 1000
          console.warn(`[FeishuClient] Rate limited. Waiting ${waitMs}ms...`)
          await new Promise((r) => setTimeout(r, waitMs))
          continue
        }

        // Do not retry 4xx errors (except 429), usually auth or param errors
        if (res.status >= 400 && res.status < 500) {
          const errBody = await res.text()
          throw new Error(`HTTP ${res.status}: ${errBody}`)
        }
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
      return res
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId)
      if (e.name === 'AbortError') e.message = `Timeout (${timeoutMs}ms)`

      // Don't retry if it's a permanent error
      if (e.message.includes('HTTP 4') && !e.message.includes('429')) throw e

      if (i === retries - 1) throw e
      const delay = 1000 * Math.pow(2, i)
      console.warn(`[FeishuClient] Fetch failed (${e.message}). Retrying in ${delay}ms...`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}

/**
 * Get Tenant Access Token (Cached)
 */
async function getToken(forceRefresh = false) {
  const now = Math.floor(Date.now() / 1000)

  if (!forceRefresh && fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'))
      if (cached.token && cached.expire > now + 60) return cached.token
    } catch (e) {}
  }

  try {
    const res = await fetchWithRetry(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
      },
    )
    const data = await res.json()

    if (data.code !== 0) throw new Error(`API Error: ${data.msg}`)

    try {
      const cacheData = { token: data.tenant_access_token, expire: now + data.expire }
      const cacheDir = path.dirname(TOKEN_CACHE_FILE)
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
      fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cacheData, null, 2))
    } catch (e) {}

    return data.tenant_access_token
  } catch (e) {
    console.error('[FeishuClient] Failed to get token:', e.message)
    throw e
  }
}

/**
 * Authenticated Fetch with Auto-Refresh
 */
async function fetchWithAuth(url, options = {}) {
  let token = await getToken()
  let headers = { ...options.headers, Authorization: `Bearer ${token}` }

  try {
    let res = await fetchWithRetry(url, { ...options, headers })

    // Handle JSON Logic Errors (200 OK but code != 0)
    const clone = res.clone()
    try {
      const data = await clone.json()
      // Codes for invalid token: 99991663, 99991664, 99991661, 99991668
      if ([99991663, 99991664, 99991661, 99991668].includes(data.code)) {
        throw new Error('TokenExpired')
      }
    } catch (jsonErr) {
      // If response isn't JSON or TokenExpired, ignore here
      if (jsonErr.message === 'TokenExpired') throw jsonErr
    }

    return res
  } catch (e) {
    if (e.message.includes('HTTP 401') || e.message === 'TokenExpired') {
      console.warn(`[FeishuClient] Token expired. Refreshing...`)
      token = await getToken(true)
      headers = { ...options.headers, Authorization: `Bearer ${token}` }
      return await fetchWithRetry(url, { ...options, headers })
    }
    throw e
  }
}

module.exports = { getToken, fetchWithRetry, fetchWithAuth }
