/**
 * VocabularyManager
 *
 * Tracks known vocabulary and transparently learns new words.
 * Each word is stored with its prime encoding and hypercomplex embedding.
 */

const fs = require('fs')
const path = require('path')

class VocabularyManager {
  /**
   * Create a VocabularyManager
   * @param {Object} backend - TinyAleph SemanticBackend instance
   * @param {Object} options - Configuration options
   */
  constructor(backend, options = {}) {
    this.backend = backend
    this.vocabulary = new Map()
    this.sessionWords = new Set() // Words learned this session
    this.storePath = options.storePath || null
    this.minWordLength = options.minWordLength || 3
    this.stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
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
      'it',
      'its',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'we',
      'they',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
      'all',
      'each',
      'every',
      'both',
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
      'also',
      'now',
      'here',
      'there',
      'then',
    ])

    // Load persisted vocabulary
    if (this.storePath) {
      this.load()
    }
  }

  /**
   * Check if a word is known
   * @param {string} word - Word to check
   * @returns {boolean}
   */
  isKnown(word) {
    return this.vocabulary.has(word.toLowerCase())
  }

  /**
   * Get word data
   * @param {string} word - Word to look up
   * @returns {Object|null}
   */
  get(word) {
    return this.vocabulary.get(word.toLowerCase()) || null
  }

  /**
   * Learn a new word
   * @param {string} word - Word to learn
   * @param {Object} context - Context where word was seen
   * @returns {boolean} True if word was newly learned
   */
  learn(word, context = {}) {
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '')

    // Skip if too short, stop word, or already known
    if (normalized.length < this.minWordLength) return false
    if (this.stopWords.has(normalized)) return false

    if (this.vocabulary.has(normalized)) {
      // Update existing word
      const data = this.vocabulary.get(normalized)
      data.frequency++
      data.lastSeen = Date.now()
      if (context.text) {
        data.contexts.push(context.text.substring(0, 100))
        if (data.contexts.length > 5) {
          data.contexts = data.contexts.slice(-5)
        }
      }
      return false
    }

    // Generate prime encoding
    const primes = this.backend.encode(normalized)

    // Create hypercomplex embedding
    const embedding = this.backend.textToOrderedState(normalized)
    const embeddingArray = Array.from(embedding.c)

    // Store with metadata
    this.vocabulary.set(normalized, {
      word: normalized,
      primes,
      embedding: embeddingArray,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      frequency: 1,
      contexts: context.text ? [context.text.substring(0, 100)] : [],
      source: context.source || 'conversation',
    })

    this.sessionWords.add(normalized)
    return true
  }

  /**
   * Extract and learn new words from text
   * @param {string} text - Text to process
   * @param {Object} context - Context info
   * @returns {Array<string>} Newly learned words
   */
  extractAndLearn(text, context = {}) {
    const words = text.toLowerCase().match(/\b[a-z][a-z0-9]*\b/g) || []
    const newWords = []

    for (const word of words) {
      if (this.learn(word, { ...context, text })) {
        newWords.push(word)
      }
    }

    return newWords
  }

  /**
   * Find similar words using cosine similarity
   * @param {string} word - Query word
   * @param {number} topK - Number of results
   * @returns {Array<Object>} Similar words with scores
   */
  findSimilar(word, topK = 5) {
    const queryEmbed = this.backend.textToOrderedState(word.toLowerCase())
    const results = []

    for (const [w, data] of this.vocabulary) {
      if (w === word.toLowerCase()) continue

      // Compute cosine similarity
      let dot = 0,
        magA = 0,
        magB = 0
      for (let i = 0; i < queryEmbed.c.length; i++) {
        dot += queryEmbed.c[i] * data.embedding[i]
        magA += queryEmbed.c[i] * queryEmbed.c[i]
        magB += data.embedding[i] * data.embedding[i]
      }
      const similarity = dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10)

      results.push({ word: w, similarity, data })
    }

    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, topK)
  }

  /**
   * Get words learned this session
   * @returns {Array<string>}
   */
  getSessionWords() {
    return Array.from(this.sessionWords)
  }

  /**
   * Get vocabulary statistics
   * @returns {Object}
   */
  getStats() {
    const words = Array.from(this.vocabulary.values())
    return {
      totalWords: this.vocabulary.size,
      sessionWords: this.sessionWords.size,
      avgFrequency: words.reduce((sum, w) => sum + w.frequency, 0) / (words.length || 1),
      recentWords: words
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, 10)
        .map((w) => w.word),
    }
  }

  /**
   * Export vocabulary to JSON
   * @returns {Object}
   */
  toJSON() {
    const vocab = {}
    for (const [word, data] of this.vocabulary) {
      vocab[word] = data
    }
    return vocab
  }

  /**
   * Import vocabulary from JSON
   * @param {Object} json - Vocabulary data
   */
  fromJSON(json) {
    for (const [word, data] of Object.entries(json)) {
      this.vocabulary.set(word, data)
    }
  }

  /**
   * Save vocabulary to file
   */
  save() {
    if (!this.storePath) return

    const dir = path.dirname(this.storePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(this.storePath, JSON.stringify(this.toJSON(), null, 2))
  }

  /**
   * Load vocabulary from file
   */
  load() {
    if (!this.storePath || !fs.existsSync(this.storePath)) return

    try {
      const data = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
      this.fromJSON(data)
    } catch (e) {
      console.error('Failed to load vocabulary:', e.message)
    }
  }

  /**
   * Clear session words (but keep learned vocabulary)
   */
  clearSession() {
    this.sessionWords.clear()
  }

  /**
   * Forget a word
   * @param {string} word - Word to forget
   * @returns {boolean} True if word was removed
   */
  forget(word) {
    const normalized = word.toLowerCase()
    if (this.vocabulary.has(normalized)) {
      this.vocabulary.delete(normalized)
      this.sessionWords.delete(normalized)
      return true
    }
    return false
  }
}

module.exports = { VocabularyManager }
