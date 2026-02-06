/**
 * LLM Prompt Cache
 *
 * Addresses network latency and redundant LLM calls in the learning module:
 * - Semantic similarity-based caching (not just exact match)
 * - TTL-based expiration for freshness
 * - Batch request coalescing
 * - Local embedding cache for similarity search
 * - Request deduplication for concurrent identical prompts
 *
 * This reduces LLM API costs and improves response latency for the
 * curiosity engine and learning system.
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')

/**
 * Simple text embedding for similarity (without external API)
 * Uses TF-IDF-like approach with local computation
 */
class LocalEmbedder {
  constructor() {
    // Common English stop words
    this.stopWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'dare',
      'ought',
      'used',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'under',
      'again',
      'further',
      'then',
      'once',
      'here',
      'there',
      'when',
      'where',
      'why',
      'how',
      'all',
      'each',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'nor',
      'not',
      'only',
      'own',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
      'and',
      'but',
      'if',
      'or',
      'because',
      'until',
      'while',
      'although',
      'this',
      'that',
      'these',
      'those',
      'what',
      'which',
      'who',
    ])

    // Global vocabulary for consistent embeddings
    this.vocabulary = new Map()
    this.vocabSize = 0
    this.idfScores = new Map()
    this.documentCount = 0
  }

  /**
   * Tokenize and normalize text
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.stopWords.has(word))
  }

  /**
   * Update vocabulary with new document
   */
  updateVocabulary(tokens) {
    const uniqueTokens = new Set(tokens)

    for (const token of uniqueTokens) {
      if (!this.vocabulary.has(token)) {
        this.vocabulary.set(token, this.vocabSize++)
      }

      // Update document frequency for IDF
      this.idfScores.set(token, (this.idfScores.get(token) || 0) + 1)
    }

    this.documentCount++
  }

  /**
   * Compute TF-IDF vector for text
   */
  embed(text) {
    const tokens = this.tokenize(text)
    this.updateVocabulary(tokens)

    // Term frequency
    const tf = new Map()
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1)
    }

    // Create sparse vector
    const vector = new Map()
    let magnitude = 0

    for (const [token, count] of tf) {
      const vocabIndex = this.vocabulary.get(token)
      if (vocabIndex === undefined) continue

      // TF-IDF = tf * log(N / df)
      const df = this.idfScores.get(token) || 1
      const idf = Math.log((this.documentCount + 1) / (df + 1)) + 1
      const tfidf = (count / tokens.length) * idf

      vector.set(vocabIndex, tfidf)
      magnitude += tfidf * tfidf
    }

    // Normalize
    magnitude = Math.sqrt(magnitude)
    if (magnitude > 0) {
      for (const [idx, val] of vector) {
        vector.set(idx, val / magnitude)
      }
    }

    return vector
  }

  /**
   * Compute cosine similarity between two sparse vectors
   */
  similarity(vec1, vec2) {
    let dotProduct = 0

    for (const [idx, val1] of vec1) {
      const val2 = vec2.get(idx)
      if (val2 !== undefined) {
        dotProduct += val1 * val2
      }
    }

    return dotProduct // Already normalized, so just dot product
  }

  /**
   * Serialize embedding state
   */
  toJSON() {
    return {
      vocabulary: Array.from(this.vocabulary.entries()),
      idfScores: Array.from(this.idfScores.entries()),
      documentCount: this.documentCount,
      vocabSize: this.vocabSize,
    }
  }

  /**
   * Restore from serialized state
   */
  fromJSON(data) {
    this.vocabulary = new Map(data.vocabulary || [])
    this.idfScores = new Map(data.idfScores || [])
    this.documentCount = data.documentCount || 0
    this.vocabSize = data.vocabSize || 0
  }
}

/**
 * Cache Entry
 */
class CacheEntry {
  constructor(prompt, response, embedding, options = {}) {
    this.id = crypto.randomBytes(8).toString('hex')
    this.prompt = prompt
    this.promptHash = this._hashPrompt(prompt)
    this.response = response
    this.embedding = embedding
    this.createdAt = Date.now()
    this.lastAccessedAt = Date.now()
    this.accessCount = 1
    this.ttl = options.ttl || 3600000 // 1 hour default
    this.metadata = options.metadata || {}
  }

  _hashPrompt(prompt) {
    return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16)
  }

  isExpired() {
    return Date.now() - this.createdAt > this.ttl
  }

  access() {
    this.lastAccessedAt = Date.now()
    this.accessCount++
  }

  toJSON() {
    return {
      id: this.id,
      prompt: this.prompt,
      promptHash: this.promptHash,
      response: this.response,
      embedding: Array.from(this.embedding.entries()),
      createdAt: this.createdAt,
      lastAccessedAt: this.lastAccessedAt,
      accessCount: this.accessCount,
      ttl: this.ttl,
      metadata: this.metadata,
    }
  }

  static fromJSON(data, embedder) {
    const entry = new CacheEntry(data.prompt, data.response, new Map(data.embedding || []), {
      ttl: data.ttl,
      metadata: data.metadata,
    })
    entry.id = data.id
    entry.promptHash = data.promptHash
    entry.createdAt = data.createdAt
    entry.lastAccessedAt = data.lastAccessedAt
    entry.accessCount = data.accessCount
    return entry
  }
}

/**
 * Pending Request Tracker for deduplication
 */
class PendingRequest {
  constructor(prompt) {
    this.prompt = prompt
    this.promise = null
    this.resolve = null
    this.reject = null
    this.waiters = 0

    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }

  addWaiter() {
    this.waiters++
    return this.promise
  }

  complete(response) {
    this.resolve(response)
  }

  fail(error) {
    this.reject(error)
  }
}

/**
 * LLM Prompt Cache
 */
class PromptCache extends EventEmitter {
  constructor(options = {}) {
    super()

    // Configuration
    this.maxEntries = options.maxEntries || 1000
    this.defaultTTL = options.defaultTTL || 3600000 // 1 hour
    this.similarityThreshold = options.similarityThreshold || 0.85
    this.persistPath = options.persistPath || null
    this.autoSave = options.autoSave ?? true
    this.saveInterval = options.saveInterval || 60000 // 1 minute

    // Core state
    this.entries = new Map() // id -> CacheEntry
    this.hashIndex = new Map() // promptHash -> id (for exact match)
    this.embedder = new LocalEmbedder()

    // Request deduplication
    this.pendingRequests = new Map() // promptHash -> PendingRequest

    // Batch queue
    this.batchQueue = []
    this.batchTimeout = null
    this.batchMaxSize = options.batchMaxSize || 5
    this.batchWaitMs = options.batchWaitMs || 100

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      similarHits: 0,
      deduplicatedRequests: 0,
      batchedRequests: 0,
      evictions: 0,
    }

    // Auto-save timer
    if (this.autoSave && this.persistPath) {
      this.saveTimer = setInterval(() => this.save(), this.saveInterval)
    }

    // Load persisted cache
    if (this.persistPath) {
      this.load()
    }
  }

  /**
   * Get cached response or null
   * Checks for exact match first, then similarity match
   */
  get(prompt) {
    const promptHash = this._hashPrompt(prompt)

    // Exact match
    const exactId = this.hashIndex.get(promptHash)
    if (exactId) {
      const entry = this.entries.get(exactId)
      if (entry && !entry.isExpired()) {
        entry.access()
        this.stats.hits++
        this.emit('cache_hit', { type: 'exact', entry })
        return entry.response
      }
    }

    // Similarity match
    const embedding = this.embedder.embed(prompt)
    const similar = this._findSimilar(embedding)

    if (similar && !similar.entry.isExpired()) {
      similar.entry.access()
      this.stats.similarHits++
      this.emit('cache_hit', {
        type: 'similar',
        entry: similar.entry,
        similarity: similar.similarity,
      })
      return similar.entry.response
    }

    this.stats.misses++
    return null
  }

  /**
   * Check if a prompt is in the cache
   */
  has(prompt) {
    return this.get(prompt) !== null
  }

  /**
   * Store a prompt-response pair
   */
  set(prompt, response, options = {}) {
    const embedding = this.embedder.embed(prompt)
    const entry = new CacheEntry(prompt, response, embedding, {
      ttl: options.ttl || this.defaultTTL,
      metadata: options.metadata,
    })

    // Check for eviction
    if (this.entries.size >= this.maxEntries) {
      this._evict()
    }

    // Store
    this.entries.set(entry.id, entry)
    this.hashIndex.set(entry.promptHash, entry.id)

    this.emit('cache_set', { entry })

    return entry
  }

  /**
   * Request with caching and deduplication
   * @param {string} prompt - The prompt to send
   * @param {Function} fetcher - Async function to call LLM if not cached
   * @param {Object} options - Cache options
   */
  async request(prompt, fetcher, options = {}) {
    // Check cache first
    const cached = this.get(prompt)
    if (cached !== null) {
      return cached
    }

    const promptHash = this._hashPrompt(prompt)

    // Check for pending identical request
    if (this.pendingRequests.has(promptHash)) {
      this.stats.deduplicatedRequests++
      const pending = this.pendingRequests.get(promptHash)
      return pending.addWaiter()
    }

    // Create pending request
    const pending = new PendingRequest(prompt)
    this.pendingRequests.set(promptHash, pending)

    try {
      const response = await fetcher(prompt)

      // Cache the result
      this.set(prompt, response, options)

      // Complete pending request
      pending.complete(response)

      return response
    } catch (error) {
      pending.fail(error)
      throw error
    } finally {
      this.pendingRequests.delete(promptHash)
    }
  }

  /**
   * Batch multiple prompts together
   * @param {string} prompt - The prompt
   * @param {Function} batchFetcher - Function that handles batch of prompts
   * @param {Object} options - Options
   */
  async batchRequest(prompt, batchFetcher, options = {}) {
    // Check cache first
    const cached = this.get(prompt)
    if (cached !== null) {
      return cached
    }

    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        prompt,
        options,
        resolve,
        reject,
      })

      this.stats.batchedRequests++

      // Clear existing timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout)
      }

      // Execute batch if full
      if (this.batchQueue.length >= this.batchMaxSize) {
        this._executeBatch(batchFetcher)
      } else {
        // Wait for more requests
        this.batchTimeout = setTimeout(() => {
          this._executeBatch(batchFetcher)
        }, this.batchWaitMs)
      }
    })
  }

  /**
   * Execute batched requests
   */
  async _executeBatch(batchFetcher) {
    if (this.batchQueue.length === 0) return

    const batch = this.batchQueue.splice(0)

    try {
      // Check for duplicates within batch
      const uniquePrompts = []
      const promptToRequests = new Map()

      for (const req of batch) {
        const hash = this._hashPrompt(req.prompt)
        if (!promptToRequests.has(hash)) {
          promptToRequests.set(hash, [])
          uniquePrompts.push(req.prompt)
        }
        promptToRequests.get(hash).push(req)
      }

      // Fetch all unique prompts
      const responses = await batchFetcher(uniquePrompts)

      // Distribute responses
      for (let i = 0; i < uniquePrompts.length; i++) {
        const prompt = uniquePrompts[i]
        const response = responses[i]
        const hash = this._hashPrompt(prompt)

        // Cache
        this.set(prompt, response)

        // Resolve all waiters
        for (const req of promptToRequests.get(hash)) {
          req.resolve(response)
        }
      }
    } catch (error) {
      // Reject all
      for (const req of batch) {
        req.reject(error)
      }
    }
  }

  /**
   * Find similar cached entry
   */
  _findSimilar(embedding) {
    let bestMatch = null
    let bestSimilarity = this.similarityThreshold

    for (const entry of this.entries.values()) {
      if (entry.isExpired()) continue

      const similarity = this.embedder.similarity(embedding, entry.embedding)
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity
        bestMatch = entry
      }
    }

    return bestMatch ? { entry: bestMatch, similarity: bestSimilarity } : null
  }

  /**
   * Hash a prompt for exact matching
   */
  _hashPrompt(prompt) {
    return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16)
  }

  /**
   * Evict least valuable entries
   */
  _evict() {
    // First remove expired entries
    for (const [id, entry] of this.entries) {
      if (entry.isExpired()) {
        this.entries.delete(id)
        this.hashIndex.delete(entry.promptHash)
        this.stats.evictions++
      }
    }

    // If still over limit, remove LRU
    if (this.entries.size >= this.maxEntries) {
      const sorted = Array.from(this.entries.values()).sort((a, b) => {
        // Score by recency and access count
        const scoreA = a.lastAccessedAt + a.accessCount * 60000
        const scoreB = b.lastAccessedAt + b.accessCount * 60000
        return scoreA - scoreB
      })

      // Remove bottom 10%
      const toRemove = Math.ceil(this.entries.size * 0.1)
      for (let i = 0; i < toRemove && i < sorted.length; i++) {
        const entry = sorted[i]
        this.entries.delete(entry.id)
        this.hashIndex.delete(entry.promptHash)
        this.stats.evictions++
      }
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    let removed = 0

    for (const [id, entry] of this.entries) {
      if (entry.isExpired()) {
        this.entries.delete(id)
        this.hashIndex.delete(entry.promptHash)
        removed++
      }
    }

    this.emit('cleanup', { removed })
    return removed
  }

  /**
   * Clear all cache
   */
  clear() {
    this.entries.clear()
    this.hashIndex.clear()
    this.embedder = new LocalEmbedder()
    this.stats = {
      hits: 0,
      misses: 0,
      similarHits: 0,
      deduplicatedRequests: 0,
      batchedRequests: 0,
      evictions: 0,
    }
    this.emit('cleared')
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits + this.stats.similarHits) /
          (this.stats.hits + this.stats.similarHits + this.stats.misses)
        : 0

    return {
      ...this.stats,
      entryCount: this.entries.size,
      hitRate: hitRate,
      vocabularySize: this.embedder.vocabSize,
    }
  }

  /**
   * Save cache to disk
   */
  save() {
    if (!this.persistPath) return

    try {
      const dir = path.dirname(this.persistPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const data = {
        version: 1,
        timestamp: Date.now(),
        stats: this.stats,
        embedder: this.embedder.toJSON(),
        entries: Array.from(this.entries.values()).map((e) => e.toJSON()),
      }

      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2))
      this.emit('saved', { path: this.persistPath, entryCount: this.entries.size })
    } catch (error) {
      this.emit('save_error', { error })
    }
  }

  /**
   * Load cache from disk
   */
  load() {
    if (!this.persistPath || !fs.existsSync(this.persistPath)) return

    try {
      const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf8'))

      if (data.embedder) {
        this.embedder.fromJSON(data.embedder)
      }

      if (data.stats) {
        this.stats = { ...this.stats, ...data.stats }
      }

      if (data.entries) {
        for (const entryData of data.entries) {
          const entry = CacheEntry.fromJSON(entryData, this.embedder)
          if (!entry.isExpired()) {
            this.entries.set(entry.id, entry)
            this.hashIndex.set(entry.promptHash, entry.id)
          }
        }
      }

      this.emit('loaded', { path: this.persistPath, entryCount: this.entries.size })
    } catch (error) {
      this.emit('load_error', { error })
    }
  }

  /**
   * Stop auto-save and cleanup
   */
  close() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    // Final save
    if (this.autoSave && this.persistPath) {
      this.save()
    }
  }
}

/**
 * Wrapper for LLM providers with caching
 */
class CachedLLMProvider {
  constructor(provider, cache, options = {}) {
    this.provider = provider
    this.cache = cache || new PromptCache(options.cache)
    this.defaultTTL = options.defaultTTL || 3600000
    this.enableBatching = options.enableBatching ?? false
  }

  /**
   * Complete a prompt with caching
   */
  async complete(prompt, options = {}) {
    const cacheOptions = {
      ttl: options.cacheTTL || this.defaultTTL,
      metadata: options.metadata,
    }

    if (this.enableBatching) {
      return this.cache.batchRequest(
        prompt,
        async (prompts) => {
          const results = []
          for (const p of prompts) {
            results.push(await this.provider.complete(p, options))
          }
          return results
        },
        cacheOptions,
      )
    }

    return this.cache.request(prompt, async (p) => this.provider.complete(p, options), cacheOptions)
  }

  /**
   * Get cache stats
   */
  getStats() {
    return this.cache.getStats()
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }
}

module.exports = {
  PromptCache,
  CachedLLMProvider,
  LocalEmbedder,
  CacheEntry,
}
