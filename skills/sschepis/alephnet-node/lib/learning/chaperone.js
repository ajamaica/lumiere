/**
 * Chaperone API
 *
 * The trusted intermediary that handles ALL external requests from the autonomous learner.
 *
 * Key responsibilities:
 * - Process learning queries (Q&A with chaperone LLM)
 * - Fetch and filter web content
 * - Read local files safely
 * - Summarize content
 * - Enforce whitelists and safety rules via SafetyFilter
 * - Log all interactions for eavesdropping
 *
 * The Sentient Observer CANNOT make direct network requests - everything
 * must go through this Chaperone layer.
 */

const { EventEmitter } = require('events')
const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')
const http = require('http')

const { SafetyFilter } = require('./safety-filter')
const { LMStudioClient } = require('../lmstudio')
const config = require('./config')
const { createLogger } = require('../app/constants')

const log = createLogger('learning:chaperone')

/**
 * Clean LLM control tokens and structured output syntax from output
 * These tokens are used by some models (Qwen, LLaMA variants) for structured output
 * but should not appear in the final response
 */
function cleanControlTokens(text) {
  if (!text || typeof text !== 'string') return text

  // Pattern for control tokens like <|channel|>, <|constrain|>, <|message|>, <|im_start|>, etc.
  // Replace with a space to avoid merging adjacent words
  const controlTokenPattern = /<\|[^|>]+\|>/g

  // Clean the tokens - replace with space to preserve word boundaries
  let cleaned = text.replace(controlTokenPattern, ' ')

  // Clean concatenated structured output patterns (tokens get joined together)
  // Pattern: "commentaryto=functions/..." or "systemto=..."
  cleaned = cleaned.replace(/\b(commentary|system|user|assistant|tool)to=\S*/gi, ' ')

  // Pattern: "channel_name to=target" with space
  cleaned = cleaned.replace(/\b(commentary|system|user|assistant|tool)\s+to=[^\s]+/gi, ' ')

  // Pattern: "json{" or "json[" - constrain type immediately before JSON
  cleaned = cleaned.replace(/\bjson\s*(?=[\[{])/gi, '')

  // Pattern: "to=functions/something" anywhere (standalone)
  cleaned = cleaned.replace(/\bto=\S+/g, ' ')

  // Pattern: standalone channel names ONLY at start of line followed by colon or specific markers
  // This targets control tokens like "user:" or "assistant:" at line starts, not normal word usage
  cleaned = cleaned.replace(/^\s*(commentary|system|user|assistant|tool)\s*:/gim, ' ')

  // Pattern: channel names followed by message markers (from structured output)
  // e.g., "user message:" or "assistant response:"
  cleaned = cleaned.replace(
    /\b(commentary|system|user|assistant|tool)\s+(message|response|output|input)\s*:/gi,
    ' ',
  )

  // If the remaining content is primarily a JSON object (tool call), return empty
  const trimmed = cleaned.trim()
  if (/^\s*\{[\s\S]*\}\s*$/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed)
      if (
        parsed.path ||
        parsed.command ||
        parsed.arguments ||
        parsed.function ||
        parsed.tool ||
        parsed.name ||
        parsed.input
      ) {
        return ''
      }
    } catch (e) {
      // Not valid JSON, keep it
    }
  }

  // If content starts with JSON that looks like a tool call, remove it
  cleaned = cleaned.replace(/^\s*\{"path"\s*:\s*"[^"]*"\s*\}\s*/g, '')
  cleaned = cleaned.replace(/^\s*\{[^}]*"function"\s*:[^}]*\}\s*/g, '')

  // Clean up excessive newlines but PRESERVE internal spacing for markdown tables/code
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n') // Multiple newlines -> double

  return cleaned.trim()
}

// ════════════════════════════════════════════════════════════════════
// RATE LIMIT BACKOFF HANDLER (for 429 responses)
// ════════════════════════════════════════════════════════════════════

/**
 * RateLimitBackoff
 *
 * Implements exponential backoff with jitter for 429 rate limit responses.
 * Tracks per-endpoint rate limits and provides automatic retry logic.
 */
class RateLimitBackoff {
  /**
   * Create a RateLimitBackoff handler
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    // Backoff configuration
    this.initialDelayMs = options.initialDelayMs || 1000
    this.maxDelayMs = options.maxDelayMs || 60000
    this.maxRetries = options.maxRetries || 5
    this.jitterFactor = options.jitterFactor || 0.2

    // Track rate limits per endpoint
    this.endpointState = new Map()

    // Global rate limit state
    this.globalBackoff = {
      inBackoff: false,
      until: 0,
      attempts: 0,
    }

    // Statistics
    this.stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      rateLimitHits: 0,
      currentBackoffs: 0,
    }
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    // Exponential backoff: delay = initial * 2^attempt
    const exponentialDelay = this.initialDelayMs * Math.pow(2, attempt)

    // Cap at maximum
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs)

    // Add jitter: ±jitterFactor * delay
    const jitter = cappedDelay * this.jitterFactor * (Math.random() * 2 - 1)

    return Math.floor(cappedDelay + jitter)
  }

  /**
   * Record a rate limit hit (429 response)
   * @param {string} endpoint - The endpoint that was rate limited
   * @param {Object} response - Response info (may contain Retry-After header)
   */
  recordRateLimit(endpoint, response = {}) {
    this.stats.rateLimitHits++

    let state = this.endpointState.get(endpoint)
    if (!state) {
      state = {
        attempts: 0,
        until: 0,
        lastHit: 0,
      }
      this.endpointState.set(endpoint, state)
    }

    state.attempts++
    state.lastHit = Date.now()

    // Check for Retry-After header
    let retryAfter = 0
    if (response.retryAfter) {
      // Retry-After can be seconds or a date
      if (typeof response.retryAfter === 'number') {
        retryAfter = response.retryAfter * 1000
      } else if (typeof response.retryAfter === 'string') {
        // Try parsing as seconds first
        const seconds = parseInt(response.retryAfter)
        if (!isNaN(seconds)) {
          retryAfter = seconds * 1000
        } else {
          // Try parsing as date
          const date = new Date(response.retryAfter)
          if (!isNaN(date.getTime())) {
            retryAfter = date.getTime() - Date.now()
          }
        }
      }
    }

    // Use Retry-After if provided, otherwise calculate backoff
    const delay =
      retryAfter > 0
        ? Math.min(retryAfter, this.maxDelayMs)
        : this.calculateDelay(state.attempts - 1)

    state.until = Date.now() + delay
    this.stats.currentBackoffs++

    return {
      delay,
      until: state.until,
      attempt: state.attempts,
      endpoint,
    }
  }

  /**
   * Check if an endpoint is currently in backoff
   * @param {string} endpoint - The endpoint to check
   * @returns {Object} Backoff state
   */
  isInBackoff(endpoint) {
    const state = this.endpointState.get(endpoint)
    if (!state) {
      return { inBackoff: false }
    }

    const now = Date.now()
    if (now >= state.until) {
      // Backoff expired
      return { inBackoff: false }
    }

    return {
      inBackoff: true,
      remainingMs: state.until - now,
      until: state.until,
      attempts: state.attempts,
    }
  }

  /**
   * Wait for backoff to expire (for use with async/await)
   * @param {string} endpoint - The endpoint to wait for
   * @returns {Promise<void>}
   */
  async waitForBackoff(endpoint) {
    const state = this.isInBackoff(endpoint)
    if (!state.inBackoff) {
      return
    }

    return new Promise((resolve) => setTimeout(resolve, state.remainingMs))
  }

  /**
   * Record a successful request after rate limiting
   * @param {string} endpoint - The endpoint
   */
  recordSuccess(endpoint) {
    const state = this.endpointState.get(endpoint)
    if (state) {
      // Reset attempts on success
      state.attempts = 0
      state.until = 0
      this.stats.successfulRetries++
      this.stats.currentBackoffs = Math.max(0, this.stats.currentBackoffs - 1)
    }
  }

  /**
   * Check if max retries exceeded
   * @param {string} endpoint - The endpoint
   * @returns {boolean}
   */
  isMaxRetriesExceeded(endpoint) {
    const state = this.endpointState.get(endpoint)
    if (!state) return false
    return state.attempts >= this.maxRetries
  }

  /**
   * Reset state for an endpoint
   * @param {string} endpoint - The endpoint
   */
  reset(endpoint) {
    this.endpointState.delete(endpoint)
  }

  /**
   * Reset all state
   */
  resetAll() {
    this.endpointState.clear()
    this.globalBackoff = {
      inBackoff: false,
      until: 0,
      attempts: 0,
    }
    this.stats.currentBackoffs = 0
  }

  /**
   * Execute a function with automatic retry on rate limit
   * @param {string} endpoint - The endpoint identifier
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Options
   * @returns {Promise<*>} Result of fn
   */
  async executeWithRetry(endpoint, fn, options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Check if in backoff
      const backoffState = this.isInBackoff(endpoint)
      if (backoffState.inBackoff) {
        await this.waitForBackoff(endpoint)
      }

      try {
        const result = await fn()

        // Check if result indicates rate limit
        if (result && result.rateLimited) {
          const backoff = this.recordRateLimit(endpoint, result)
          this.stats.totalRetries++

          if (this.isMaxRetriesExceeded(endpoint)) {
            this.stats.failedRetries++
            throw new Error(`Rate limit exceeded after ${maxRetries} retries for ${endpoint}`)
          }

          // Wait and retry
          await new Promise((resolve) => setTimeout(resolve, backoff.delay))
          continue
        }

        // Success
        this.recordSuccess(endpoint)
        return result
      } catch (error) {
        // Check if error is a rate limit
        if (error.status === 429 || error.code === 'RATE_LIMITED') {
          const backoff = this.recordRateLimit(endpoint, {
            retryAfter: error.retryAfter,
          })
          this.stats.totalRetries++

          if (this.isMaxRetriesExceeded(endpoint)) {
            this.stats.failedRetries++
            throw new Error(`Rate limit exceeded after ${maxRetries} retries: ${error.message}`)
          }

          await new Promise((resolve) => setTimeout(resolve, backoff.delay))
          continue
        }

        // Non-rate-limit error, rethrow
        throw error
      }
    }

    this.stats.failedRetries++
    throw new Error(`Max retries (${maxRetries}) exceeded for ${endpoint}`)
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      endpoints: Array.from(this.endpointState.entries()).map(([endpoint, state]) => ({
        endpoint,
        attempts: state.attempts,
        inBackoff: Date.now() < state.until,
        lastHit: state.lastHit,
      })),
    }
  }
}

class ChaperoneAPI {
  /**
   * Create a new ChaperoneAPI
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    const chaperoneConfig = { ...config.chaperone, ...options }

    // LLM client for Q&A
    this.llmClient =
      options.llmClient ||
      new LMStudioClient({
        baseUrl: chaperoneConfig.llmUrl,
      })

    // Safety filter for all requests
    this.safetyFilter = options.safetyFilter || new SafetyFilter(options.safetyConfig)

    // Event emitter for eavesdropping
    this.eventEmitter = new EventEmitter()

    // Configuration
    this.rateLimit = chaperoneConfig.rateLimit || 10
    this.timeout = chaperoneConfig.timeout || 30000
    this.maxLogEntries = chaperoneConfig.maxLogEntries || 1000
    this.maxAnswerTokens = chaperoneConfig.maxAnswerTokens || 500
    this.maxSummaryTokens = chaperoneConfig.maxSummaryTokens || 300

    // Incoming directory for downloaded content
    this.incomingDir = options.incomingDir || path.join(os.homedir(), 'incoming')

    // Ensure incoming directory exists
    this._ensureIncomingDir()

    // Interaction log for eavesdropping
    this.interactionLog = []

    // Request tracking
    this.requestTimes = []

    // Rate limit backoff handler for 429 responses
    this.rateLimitBackoff = new RateLimitBackoff({
      initialDelayMs: chaperoneConfig.backoffInitialMs || 1000,
      maxDelayMs: chaperoneConfig.backoffMaxMs || 60000,
      maxRetries: chaperoneConfig.backoffMaxRetries || 5,
      jitterFactor: 0.2,
    })

    log('Chaperone API initialized, LLM:', chaperoneConfig.llmUrl)
  }

  /**
   * Ensure the incoming directory exists
   * @private
   */
  async _ensureIncomingDir() {
    try {
      await fs.promises.mkdir(this.incomingDir, { recursive: true })
      log('Incoming directory ready:', this.incomingDir)
    } catch (error) {
      log.error('Failed to create incoming directory:', error.message)
    }
  }

  /**
   * Process a learning request from the observer
   * @param {Object} request - The request object
   * @returns {Promise<Object>} Response object
   */
  async processRequest(request) {
    // Rate limiting check
    const rateCheck = this.safetyFilter.checkRateLimit()
    if (!rateCheck.allowed) {
      const response = {
        success: false,
        error: rateCheck.reason,
        retryAfter: rateCheck.retryAfter,
      }
      this._logInteraction('rate_limited', request, response)
      return response
    }

    // Log the incoming request
    const logEntry = this._logInteraction('request', request)
    this.emit('request', logEntry)

    log('Processing request type:', request.type)

    try {
      let result

      switch (request.type) {
        case 'question':
          result = await this.handleQuestion(request)
          break

        case 'fetch_content':
          result = await this.handleFetchContent(request)
          break

        case 'read_local':
          result = await this.handleReadLocal(request)
          break

        case 'summarize':
          result = await this.handleSummarize(request)
          break

        case 'search':
          result = await this.handleSearch(request)
          break

        default:
          result = {
            success: false,
            error: `Unknown request type: ${request.type}. Valid types: question, fetch_content, read_local, summarize, search`,
          }
      }

      // Log the response
      const responseLog = this._logInteraction('response', request, result)
      this.emit('response', responseLog)

      return result
    } catch (error) {
      log.error('Request processing error:', error.message)
      const errorResponse = { success: false, error: error.message }
      const errorLog = this._logInteraction('error', request, errorResponse)
      this.emit('error', errorLog)
      return errorResponse
    }
  }

  /**
   * Handle a question to the chaperone LLM
   * @param {Object} request - { question, context? }
   */
  async handleQuestion(request) {
    const { question, context } = request

    if (!question || typeof question !== 'string') {
      return { success: false, error: 'Question is required and must be a string' }
    }

    log('Handling question:', question.slice(0, 100))

    // Build the prompt
    const systemPrompt = `You are a knowledgeable research assistant helping an AI agent learn.
Provide accurate, concise answers to questions. If you're uncertain, say so.
Focus on facts and explain concepts clearly.`

    let fullPrompt = question
    if (context) {
      fullPrompt = `Context: ${JSON.stringify(context)}\n\nQuestion: ${question}`
    }

    try {
      // Use rate limit backoff for LLM requests
      const response = await this.rateLimitBackoff.executeWithRetry('llm_chat', async () => {
        try {
          const result = await this.llmClient.chat(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: fullPrompt },
            ],
            {
              maxTokens: this.maxAnswerTokens,
              temperature: 0.7,
            },
          )
          return result
        } catch (error) {
          // Check for 429 status
          if (
            error.status === 429 ||
            error.message?.includes('429') ||
            error.message?.includes('rate limit')
          ) {
            error.status = 429
            error.retryAfter = error.retryAfter || parseInt(error.headers?.['retry-after']) || null
          }
          throw error
        }
      })

      // Clean control tokens from response
      const cleanedAnswer = cleanControlTokens(response.content)

      log('Question answered, tokens used:', response.usage?.total_tokens)

      // Emit answer event for immersive mode
      this.emit('answer', {
        question: question,
        answer: cleanedAnswer,
        timestamp: Date.now(),
      })

      return {
        success: true,
        type: 'answer',
        answer: cleanedAnswer,
        sources: [],
        usage: response.usage,
        timestamp: Date.now(),
      }
    } catch (error) {
      log.error('LLM question error:', error.message)

      // Check if this was a rate limit exhaustion
      if (error.message?.includes('Rate limit exceeded')) {
        return {
          success: false,
          error: error.message,
          rateLimited: true,
          retryAfter: this.rateLimitBackoff.isInBackoff('llm_chat').remainingMs,
        }
      }

      return {
        success: false,
        error: `LLM error: ${error.message}`,
      }
    }
  }

  /**
   * Handle content fetch request from URL
   * @param {Object} request - { url, format? }
   */
  async handleFetchContent(request) {
    const { url, format } = request

    if (!url) {
      return { success: false, error: 'URL is required' }
    }

    // Safety check
    const urlCheck = this.safetyFilter.checkUrl(url)
    if (!urlCheck.allowed) {
      return { success: false, error: urlCheck.reason }
    }

    // Session file limit check
    const sessionCheck = this.safetyFilter.checkSessionFileLimit()
    if (!sessionCheck.allowed) {
      return { success: false, error: sessionCheck.reason }
    }

    log('Fetching content from:', url)

    try {
      const content = await this._fetchUrl(url)

      // Size check
      const sizeCheck = this.safetyFilter.checkContentSize(content.data.length)
      if (!sizeCheck.allowed) {
        return { success: false, error: sizeCheck.reason }
      }

      // Save to incoming directory
      const filename = this._generateFilename(url, content.mimeType)
      const filepath = path.join(this.incomingDir, filename)
      await fs.promises.writeFile(filepath, content.data)

      log('Content saved to:', filepath, 'size:', content.data.length)

      return {
        success: true,
        type: 'content',
        filepath,
        filename,
        url,
        contentType: content.mimeType,
        size: content.data.length,
        timestamp: Date.now(),
      }
    } catch (error) {
      log.error('Fetch error:', error.message)
      return {
        success: false,
        error: `Fetch failed: ${error.message}`,
      }
    }
  }

  /**
   * Handle local file read request
   * @param {Object} request - { filepath, format? }
   */
  async handleReadLocal(request) {
    const { filepath, format } = request

    if (!filepath) {
      return { success: false, error: 'Filepath is required' }
    }

    // Safety check
    const pathCheck = this.safetyFilter.checkPath(filepath)
    if (!pathCheck.allowed) {
      return { success: false, error: pathCheck.reason }
    }

    log('Reading local file:', filepath)

    try {
      // Check file exists
      await fs.promises.access(filepath, fs.constants.R_OK)

      // Read file
      const content = await fs.promises.readFile(filepath)

      // Size check
      const sizeCheck = this.safetyFilter.checkContentSize(content.length)
      if (!sizeCheck.allowed) {
        return { success: false, error: sizeCheck.reason }
      }

      // Parse based on format/extension
      const ext = path.extname(filepath).toLowerCase()
      let parsed

      switch (format || ext) {
        case '.pdf':
        case 'pdf':
          // For PDFs, we'll return raw content - actual parsing would need a library
          parsed = content.toString('utf-8')
          break

        case '.json':
          parsed = JSON.parse(content.toString('utf-8'))
          break

        case '.txt':
        case '.md':
        case '.markdown':
        case 'text':
        case 'markdown':
          parsed = content.toString('utf-8')
          break

        default:
          parsed = content.toString('utf-8')
      }

      log('Local file read, size:', content.length)

      return {
        success: true,
        type: 'local_content',
        content: parsed,
        filepath,
        filename: path.basename(filepath),
        size: content.length,
        timestamp: Date.now(),
      }
    } catch (error) {
      log.error('Local read error:', error.message)
      return {
        success: false,
        error: `File read failed: ${error.message}`,
      }
    }
  }

  /**
   * Handle summarization request
   * @param {Object} request - { content, maxLength?, focus? }
   */
  async handleSummarize(request) {
    const { content, maxLength, focus } = request

    if (!content || typeof content !== 'string') {
      return { success: false, error: 'Content is required and must be a string' }
    }

    log('Summarizing content, length:', content.length, 'focus:', focus)

    const systemPrompt =
      'You are a skilled summarizer. Create clear, accurate summaries that capture the key points.'

    const prompt = `Summarize the following content${focus ? ` focusing on ${focus}` : ''}.
Keep the summary under ${maxLength || 200} words.

Content:
${content.slice(0, 4000)}

Summary:`

    try {
      // Use rate limit backoff for LLM requests
      const response = await this.rateLimitBackoff.executeWithRetry('llm_summarize', async () => {
        try {
          const result = await this.llmClient.chat(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            {
              maxTokens: this.maxSummaryTokens,
              temperature: 0.5,
            },
          )
          return result
        } catch (error) {
          if (error.status === 429 || error.message?.includes('429')) {
            error.status = 429
          }
          throw error
        }
      })

      // Clean control tokens from summary
      const cleanedSummary = cleanControlTokens(response.content)

      log('Summary generated')

      return {
        success: true,
        type: 'summary',
        summary: cleanedSummary,
        originalLength: content.length,
        focus,
        timestamp: Date.now(),
      }
    } catch (error) {
      log.error('Summarization error:', error.message)
      return {
        success: false,
        error: `Summarization failed: ${error.message}`,
      }
    }
  }

  /**
   * Handle search request (formulates search suggestions)
   * @param {Object} request - { query, type? }
   */
  async handleSearch(request) {
    const { query, type } = request

    if (!query) {
      return { success: false, error: 'Search query is required' }
    }

    log('Handling search:', query)

    // Use LLM to formulate search URLs for whitelisted domains
    const systemPrompt = `You are a research assistant. Given a search query, suggest the best URLs from these domains:
- arxiv.org (for academic papers)
- github.com (for code and projects)
- wikipedia.org (for general knowledge)
- stackoverflow.com (for programming questions)
- docs.python.org (for Python documentation)
- developer.mozilla.org (for web documentation)

Return a JSON array of suggested URLs (maximum 3) that would be most relevant for the query.
Only suggest URLs, no explanations.`

    try {
      // Use rate limit backoff for LLM requests
      const response = await this.rateLimitBackoff.executeWithRetry('llm_search', async () => {
        try {
          const result = await this.llmClient.chat(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Query: ${query}` },
            ],
            {
              maxTokens: 200,
              temperature: 0.3,
            },
          )
          return result
        } catch (error) {
          if (error.status === 429 || error.message?.includes('429')) {
            error.status = 429
          }
          throw error
        }
      })

      // Try to parse URLs from response
      let suggestions = []
      try {
        suggestions = JSON.parse(response.content)
      } catch {
        // Try to extract URLs with regex
        const urlRegex = /https?:\/\/[^\s"'\]]+/g
        suggestions = response.content.match(urlRegex) || []
      }

      // Validate all suggestions against safety filter
      const validSuggestions = suggestions.filter((url) => this.safetyFilter.checkUrl(url).allowed)

      log('Search suggestions:', validSuggestions.length)

      return {
        success: true,
        type: 'search_results',
        query,
        suggestions: validSuggestions,
        timestamp: Date.now(),
      }
    } catch (error) {
      log.error('Search error:', error.message)
      return {
        success: false,
        error: `Search failed: ${error.message}`,
      }
    }
  }

  /**
   * Fetch content from a URL
   * @private
   */
  _fetchUrl(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const protocol = parsedUrl.protocol === 'https:' ? https : http

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'SentientObserver/1.0 (Autonomous Learning Agent)',
          Accept:
            'text/html,application/xhtml+xml,application/xml,text/plain,application/json,application/pdf',
        },
        timeout: this.timeout,
      }

      const req = protocol.request(options, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Check redirect URL against safety filter
          const redirectCheck = this.safetyFilter.checkUrl(res.headers.location)
          if (!redirectCheck.allowed) {
            reject(new Error(`Redirect blocked: ${redirectCheck.reason}`))
            return
          }

          // Follow redirect
          this._fetchUrl(res.headers.location).then(resolve).catch(reject)
          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }

        const chunks = []
        let totalSize = 0

        res.on('data', (chunk) => {
          totalSize += chunk.length
          if (totalSize > this.safetyFilter.maxContentSize) {
            req.destroy()
            reject(new Error('Content size limit exceeded during download'))
            return
          }
          chunks.push(chunk)
        })

        res.on('end', () => {
          resolve({
            data: Buffer.concat(chunks),
            mimeType: res.headers['content-type'] || 'application/octet-stream',
          })
        })
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      req.end()
    })
  }

  /**
   * Generate a unique filename for downloaded content
   * @private
   */
  _generateFilename(url, mimeType) {
    const parsedUrl = new URL(url)
    const baseName = path.basename(parsedUrl.pathname) || 'content'
    const timestamp = Date.now()

    // Determine extension from MIME type if not present
    let ext = path.extname(baseName)
    if (!ext) {
      const mimeToExt = {
        'text/html': '.html',
        'text/plain': '.txt',
        'text/markdown': '.md',
        'application/json': '.json',
        'application/pdf': '.pdf',
      }
      ext = mimeToExt[mimeType.split(';')[0]] || '.dat'
    }

    const nameWithoutExt = baseName.replace(ext, '')
    return `${nameWithoutExt}_${timestamp}${ext}`
  }

  /**
   * Log an interaction for eavesdropping
   * @private
   */
  _logInteraction(type, request, response = null) {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      request: {
        type: request.type,
        topic: request.topic || request.question || request.url || request.filepath,
        timestamp: request.timestamp || Date.now(),
      },
      response,
      timestamp: Date.now(),
    }

    this.interactionLog.push(entry)

    // Keep only recent logs
    if (this.interactionLog.length > this.maxLogEntries) {
      this.interactionLog = this.interactionLog.slice(-this.maxLogEntries)
    }

    return entry
  }

  /**
   * Get recent logs for eavesdropping
   * @param {number} count - Number of entries to return
   */
  getRecentLogs(count = 50) {
    return this.interactionLog.slice(-count)
  }

  /**
   * Get safety filter statistics
   */
  getSafetyStats() {
    return this.safetyFilter.getSessionStats()
  }

  /**
   * Get safety audit log
   */
  getSafetyAudit(count = 50) {
    return this.safetyFilter.getAuditLog(count)
  }

  /**
   * Reset session (clears rate limits and file counters)
   */
  resetSession() {
    this.safetyFilter.resetSession()
    log('Session reset')
  }

  /**
   * Subscribe to events
   */
  on(event, callback) {
    this.eventEmitter.on(event, callback)
  }

  /**
   * Emit an event
   */
  emit(event, data) {
    this.eventEmitter.emit(event, data)
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    this.eventEmitter.off(event, callback)
  }

  /**
   * Check if LLM is connected
   */
  async isConnected() {
    try {
      return await this.llmClient.isConnected()
    } catch {
      return false
    }
  }

  /**
   * Get rate limit backoff statistics
   * @returns {Object}
   */
  getRateLimitStats() {
    return this.rateLimitBackoff.getStats()
  }

  /**
   * Reset rate limit state
   */
  resetRateLimits() {
    this.rateLimitBackoff.resetAll()
  }
}

module.exports = { ChaperoneAPI, RateLimitBackoff }
