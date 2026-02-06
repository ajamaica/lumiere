/**
 * ContextMemory
 *
 * Multi-tiered memory system for conversation context.
 * - Immediate: Ring buffer of recent exchanges
 * - Session: Full session with semantic indexing
 * - Persistent: Cross-session storage
 */

const fs = require('fs')
const path = require('path')

/**
 * Ring buffer for immediate context
 */
class ImmediateBuffer {
  constructor(size = 10) {
    this.size = size
    this.buffer = []
  }

  add(exchange) {
    this.buffer.push({
      ...exchange,
      timestamp: Date.now(),
    })
    if (this.buffer.length > this.size) {
      this.buffer.shift()
    }
  }

  getAll() {
    return [...this.buffer]
  }

  getLast(n = 5) {
    return this.buffer.slice(-n)
  }

  clear() {
    this.buffer = []
  }

  toMessages() {
    const messages = []
    for (const ex of this.buffer) {
      messages.push({ role: 'user', content: ex.user })
      messages.push({ role: 'assistant', content: ex.assistant })
    }
    return messages
  }
}

/**
 * Session memory with semantic indexing
 */
class SessionMemory {
  constructor(backend) {
    this.backend = backend
    this.exchanges = []
    this.index = new Map() // embedding hash -> exchange index
  }

  add(exchange) {
    const idx = this.exchanges.length
    const embedding = this.backend.textToOrderedState(exchange.user)

    this.exchanges.push({
      ...exchange,
      embedding: Array.from(embedding.c),
      index: idx,
      timestamp: Date.now(),
    })
  }

  /**
   * Find semantically similar past exchanges
   * @param {string} query - Query text
   * @param {number} topK - Number of results
   * @returns {Array<Object>}
   */
  findSimilar(query, topK = 3) {
    if (this.exchanges.length === 0) return []

    const queryEmbed = this.backend.textToOrderedState(query)
    const results = []

    for (const ex of this.exchanges) {
      const similarity = this._cosineSimilarity(Array.from(queryEmbed.c), ex.embedding)
      results.push({ ...ex, similarity })
    }

    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, topK)
  }

  _cosineSimilarity(a, b) {
    let dot = 0,
      magA = 0,
      magB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      magA += a[i] * a[i]
      magB += b[i] * b[i]
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10)
  }

  getCount() {
    return this.exchanges.length
  }

  clear() {
    this.exchanges = []
    this.index.clear()
  }

  toJSON() {
    return this.exchanges
  }

  fromJSON(json) {
    this.exchanges = json || []
  }
}

/**
 * Persistent memory for cross-session storage
 */
class PersistentMemory {
  constructor(storePath) {
    this.storePath = storePath
    this.data = {
      notableExchanges: [],
      summaries: [],
      metadata: {},
    }
    this.load()
  }

  /**
   * Save a notable exchange
   * @param {Object} exchange - Exchange to save
   * @param {string} reason - Why it's notable
   */
  saveNotable(exchange, reason = 'user-marked') {
    this.data.notableExchanges.push({
      ...exchange,
      reason,
      savedAt: Date.now(),
    })

    // Trim to reasonable size
    if (this.data.notableExchanges.length > 100) {
      this.data.notableExchanges = this.data.notableExchanges.slice(-100)
    }

    this.save()
  }

  /**
   * Add a session summary
   * @param {Object} summary - Summary object
   */
  addSummary(summary) {
    this.data.summaries.push({
      ...summary,
      timestamp: Date.now(),
    })

    if (this.data.summaries.length > 50) {
      this.data.summaries = this.data.summaries.slice(-50)
    }

    this.save()
  }

  /**
   * Get recent summaries
   * @param {number} n - Number to retrieve
   */
  getRecentSummaries(n = 5) {
    return this.data.summaries.slice(-n)
  }

  /**
   * Get notable exchanges
   */
  getNotableExchanges() {
    return this.data.notableExchanges
  }

  /**
   * Set metadata
   */
  setMetadata(key, value) {
    this.data.metadata[key] = value
    this.save()
  }

  /**
   * Get metadata
   */
  getMetadata(key) {
    return this.data.metadata[key]
  }

  save() {
    if (!this.storePath) return

    const dir = path.dirname(this.storePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2))
  }

  load() {
    if (!this.storePath || !fs.existsSync(this.storePath)) return

    try {
      this.data = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
    } catch (e) {
      console.error('Failed to load persistent memory:', e.message)
    }
  }

  clear() {
    this.data = {
      notableExchanges: [],
      summaries: [],
      metadata: {},
    }
    this.save()
  }
}

/**
 * Main ContextMemory class
 */
class ContextMemory {
  /**
   * Create a ContextMemory
   * @param {Object} backend - TinyAleph SemanticBackend
   * @param {Object} options - Configuration options
   */
  constructor(backend, options = {}) {
    this.backend = backend
    this.immediate = new ImmediateBuffer(options.immediateSize || 10)
    this.session = new SessionMemory(backend)
    this.persistent = new PersistentMemory(options.persistPath)
  }

  /**
   * Add an exchange to memory
   * @param {Object} exchange - { user, assistant }
   */
  addExchange(exchange) {
    this.immediate.add(exchange)
    this.session.add(exchange)
  }

  /**
   * Get immediate context as messages
   * @param {number} n - Number of exchanges
   * @returns {Array<Object>}
   */
  getImmediateContext(n = 5) {
    return this.immediate.getLast(n)
  }

  /**
   * Get relevant context for a query
   * @param {string} query - User query
   * @param {Object} options - Options
   * @returns {Object} Context data
   */
  getRelevantContext(query, options = {}) {
    const immediate = this.immediate.getLast(options.immediateCount || 3)
    const similar = this.session.findSimilar(query, options.similarCount || 2)

    // Filter out immediate exchanges from similar results
    const immediateSet = new Set(immediate.map((e) => e.timestamp))
    const filteredSimilar = similar.filter((s) => !immediateSet.has(s.timestamp))

    return {
      immediate,
      similar: filteredSimilar,
      recentSummaries: this.persistent.getRecentSummaries(2),
    }
  }

  /**
   * Build context messages for LLM
   * @param {string} query - Current query
   * @param {Object} options - Options
   * @returns {Array<Object>} Messages array
   */
  buildContextMessages(query, options = {}) {
    const context = this.getRelevantContext(query, options)
    const messages = []

    // Add similar context first (if any)
    if (context.similar.length > 0) {
      const contextText = context.similar.map((s) => `Q: ${s.user}\nA: ${s.assistant}`).join('\n\n')
      messages.push({
        role: 'system',
        content: `Relevant previous exchanges:\n${contextText}`,
      })
    }

    // Add immediate context
    for (const ex of context.immediate) {
      messages.push({ role: 'user', content: ex.user })
      messages.push({ role: 'assistant', content: ex.assistant })
    }

    return messages
  }

  /**
   * Mark an exchange as notable
   * @param {Object} exchange - Exchange to mark
   * @param {string} reason - Why it's notable
   */
  markNotable(exchange, reason) {
    this.persistent.saveNotable(exchange, reason)
  }

  /**
   * End session and save summary
   * @param {Object} summary - Session summary
   */
  endSession(summary) {
    this.persistent.addSummary({
      ...summary,
      exchangeCount: this.session.getCount(),
    })
  }

  /**
   * Get memory statistics
   * @returns {Object}
   */
  getStats() {
    return {
      immediateCount: this.immediate.buffer.length,
      sessionCount: this.session.getCount(),
      notableCount: this.persistent.data.notableExchanges.length,
      summaryCount: this.persistent.data.summaries.length,
    }
  }

  /**
   * Clear session memory (keep persistent)
   */
  clearSession() {
    this.immediate.clear()
    this.session.clear()
  }

  /**
   * Clear all memory
   */
  clearAll() {
    this.immediate.clear()
    this.session.clear()
    this.persistent.clear()
  }
}

module.exports = {
  ContextMemory,
  ImmediateBuffer,
  SessionMemory,
  PersistentMemory,
}
