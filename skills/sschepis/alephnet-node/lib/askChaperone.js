/**
 * askChaperone - External LLM Query Tool
 *
 * This module provides a way for the Sentient Observer to query an external
 * "chaperone" LLM for information, guidance, or verification. The chaperone
 * acts as a trusted external oracle that can help with:
 *
 * - Factual verification
 * - Complex reasoning tasks
 * - Knowledge retrieval
 * - Safety checks
 *
 * The chaperone uses the same LLM configuration as the main agent but can
 * be configured separately for a different model or endpoint.
 */

const fs = require('fs')
const path = require('path')
const { LMStudioClient } = require('./lmstudio')
const { VertexAIClient } = require('./vertex-ai')

// Cache file for storing chaperone interactions
const CACHE_FILE = path.join(__dirname, '..', 'data', 'chaperone-cache.json')

/**
 * Initialize cache file
 */
function initCache() {
  const dir = path.dirname(CACHE_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ entries: [], stats: { queries: 0, hits: 0 } }, null, 2),
    )
  }
}

/**
 * Load cache entries
 */
function loadCache() {
  initCache()
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
  } catch (e) {
    return { entries: [], stats: { queries: 0, hits: 0 } }
  }
}

/**
 * Save cache entry
 */
function saveEntry(entry) {
  const cache = loadCache()
  cache.entries.push(entry)
  cache.stats.queries++
  // Keep only last 100 entries
  if (cache.entries.length > 100) {
    cache.entries = cache.entries.slice(-100)
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
}

/**
 * Check cache for similar queries
 */
function checkCache(prompt, maxAge = 3600000) {
  // 1 hour default
  const cache = loadCache()
  const now = Date.now()

  for (const entry of cache.entries.reverse()) {
    // Check if entry is recent enough
    const entryTime = new Date(entry.timestamp).getTime()
    if (now - entryTime > maxAge) continue

    // Simple similarity check - exact match for now
    // Could be enhanced with semantic similarity
    if (entry.prompt.toLowerCase().trim() === prompt.toLowerCase().trim()) {
      cache.stats.hits++
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
      return entry
    }
  }
  return null
}

/**
 * Chaperone client singleton
 */
let _chaperoneClient = null
let _chaperoneConfig = null

/**
 * Configure the chaperone client
 * @param {Object} options - Configuration options
 * @param {string} options.provider - LLM provider: 'lmstudio', 'vertex', 'google'
 * @param {string} options.model - Model name
 * @param {string} options.credentialsPath - Path to Google credentials (for Vertex AI)
 * @param {string} options.baseUrl - LMStudio URL
 */
function configureChaperone(options = {}) {
  _chaperoneConfig = options
  _chaperoneClient = null // Reset client so it gets recreated
  console.log('[Chaperone] Configured with provider:', options.provider || 'lmstudio')
}

/**
 * Get or create the chaperone LLM client
 */
function getChaperoneClient() {
  if (_chaperoneClient) return _chaperoneClient

  const config = _chaperoneConfig || {}
  const provider = config.provider || 'lmstudio'

  if (provider === 'vertex' || provider === 'google' || provider === 'gemini') {
    _chaperoneClient = new VertexAIClient({
      credentialsPath: config.credentialsPath,
      projectId: config.projectId,
      location: config.location || 'us-central1',
      model: config.model || 'gemini-3-pro-preview',
      temperature: 0.3, // Lower temperature for more factual responses
      maxTokens: 4096,
    })
  } else {
    _chaperoneClient = new LMStudioClient({
      baseUrl: config.baseUrl || 'http://localhost:1234/v1',
      model: config.model || 'local-model',
      temperature: 0.3,
      maxTokens: 4096,
    })
  }

  return _chaperoneClient
}

/**
 * Ask the chaperone LLM a question
 *
 * @param {string} prompt - The question or task for the chaperone
 * @param {Object} options - Additional options
 * @param {boolean} options.useCache - Whether to check cache (default: true)
 * @param {string} options.systemPrompt - Custom system prompt
 * @param {number} options.maxAge - Max cache age in ms (default: 1 hour)
 * @returns {Promise<Object>} Response object with answer and metadata
 */
async function askChaperone(prompt, options = {}) {
  const timestamp = new Date().toISOString()
  const useCache = options.useCache !== false

  // Check cache first
  if (useCache) {
    const cached = checkCache(prompt, options.maxAge)
    if (cached) {
      console.log('[Chaperone] Cache hit for query')
      return {
        success: true,
        answer: cached.answer,
        cached: true,
        cachedAt: cached.timestamp,
        source: 'cache',
      }
    }
  }

  // Get the chaperone client
  const client = getChaperoneClient()

  // Build messages
  const systemPrompt =
    options.systemPrompt ||
    `You are a knowledge oracle providing accurate, factual information.
Your role is to:
- Answer questions accurately and concisely
- Admit when you're uncertain or don't know something
- Provide sources or reasoning when possible
- Be helpful but prioritize accuracy over completeness

Respond directly to the query without unnecessary preamble.`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]

  try {
    console.log('[Chaperone] Querying LLM...')
    const startTime = Date.now()

    const response = await client.chat(messages, {
      temperature: 0.3,
      maxTokens: options.maxTokens || 32768,
    })

    const answer = response.content || ''
    const duration = Date.now() - startTime

    // Save to cache
    const entry = {
      timestamp,
      prompt,
      answer,
      duration,
      model: client.model,
      provider: _chaperoneConfig?.provider || 'lmstudio',
    }
    saveEntry(entry)

    console.log('[Chaperone] Response received in', duration, 'ms')

    return {
      success: true,
      answer,
      cached: false,
      duration,
      source: 'llm',
      model: client.model,
    }
  } catch (error) {
    console.error('[Chaperone] Error querying LLM:', error.message)
    return {
      success: false,
      error: error.message,
      cached: false,
      source: 'error',
    }
  }
}

/**
 * Get chaperone cache statistics
 */
function getChaperoneStats() {
  const cache = loadCache()
  return {
    totalQueries: cache.stats.queries,
    cacheHits: cache.stats.hits,
    hitRate:
      cache.stats.queries > 0
        ? ((cache.stats.hits / cache.stats.queries) * 100).toFixed(1) + '%'
        : '0%',
    cachedEntries: cache.entries.length,
  }
}

/**
 * Clear the chaperone cache
 */
function clearChaperoneCache() {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify({ entries: [], stats: { queries: 0, hits: 0 } }, null, 2),
  )
  console.log('[Chaperone] Cache cleared')
}

module.exports = {
  askChaperone,
  configureChaperone,
  getChaperoneStats,
  clearChaperoneCache,
}
