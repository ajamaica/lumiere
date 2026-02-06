/**
 * StyleProfiler
 *
 * Builds and maintains a profile of the user's communication style.
 * Uses hypercomplex embeddings to track style patterns over time.
 */

const fs = require('fs')
const path = require('path')

class StyleProfiler {
  /**
   * Create a StyleProfiler
   * @param {Object} backend - TinyAleph SemanticBackend instance
   * @param {Object} options - Configuration options
   */
  constructor(backend, options = {}) {
    this.backend = backend
    this.dimension = options.dimension || 16
    this.learningRate = options.learningRate || 0.1
    this.storePath = options.storePath || null

    // Style vector (running average of user embeddings)
    this.styleVector = new Float64Array(this.dimension)

    // Style metrics
    this.metrics = {
      avgLength: 0,
      avgWordLength: 0,
      technicalLevel: 0.5,
      formalityScore: 0.5,
      questionRatio: 0,
      vocabularyRichness: 0,
      sampleCount: 0,
    }

    // Word frequency for vocabulary richness
    this.wordFrequency = new Map()
    this.totalWords = 0

    // Load persisted style
    if (this.storePath) {
      this.load()
    }
  }

  /**
   * Update style profile with new user text
   * @param {string} text - User's text input
   */
  updateStyle(text) {
    if (!text || text.trim().length === 0) return

    // Update embedding-based style vector
    const embedding = this.backend.textToOrderedState(text)
    for (let i = 0; i < this.dimension; i++) {
      this.styleVector[i] =
        (1 - this.learningRate) * this.styleVector[i] + this.learningRate * embedding.c[i]
    }

    // Update metrics
    this._updateMetrics(text)
  }

  /**
   * Update style metrics
   * @private
   */
  _updateMetrics(text) {
    const n = this.metrics.sampleCount
    const alpha = 1 / (n + 1) // Diminishing learning rate

    // Text length
    this.metrics.avgLength = this._updateAvg(this.metrics.avgLength, text.length, alpha)

    // Word-level analysis
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || []
    if (words.length > 0) {
      const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / words.length
      this.metrics.avgWordLength = this._updateAvg(this.metrics.avgWordLength, avgWordLen, alpha)

      // Track word frequency for vocabulary richness
      for (const word of words) {
        this.wordFrequency.set(word, (this.wordFrequency.get(word) || 0) + 1)
        this.totalWords++
      }

      // Vocabulary richness (type-token ratio, adjusted)
      this.metrics.vocabularyRichness = this.wordFrequency.size / Math.sqrt(this.totalWords)
    }

    // Technical level (based on word length and specific patterns)
    const technicalIndicators = (text.match(/\b[a-z]{8,}\b/gi) || []).length
    const codePatterns = (
      text.match(/[{}()\[\]<>]|->|=>|::|function|class|def|const|let|var/g) || []
    ).length
    const technicalScore = Math.min(
      1,
      (technicalIndicators + codePatterns * 2) / (words.length + 1),
    )
    this.metrics.technicalLevel = this._updateAvg(
      this.metrics.technicalLevel,
      technicalScore,
      alpha,
    )

    // Formality score
    const informalPatterns = (
      text.match(/\b(gonna|wanna|gotta|kinda|sorta|yeah|ok|cool|hey|hi|lol|omg)\b/gi) || []
    ).length
    const contractions = (text.match(/\b\w+'\w+\b/g) || []).length
    const formalIndicators = (
      text.match(/\b(therefore|however|furthermore|consequently|nevertheless)\b/gi) || []
    ).length
    const formalityScore = Math.max(
      0,
      Math.min(
        1,
        0.5 + ((formalIndicators - informalPatterns - contractions * 0.5) / (words.length + 1)) * 5,
      ),
    )
    this.metrics.formalityScore = this._updateAvg(
      this.metrics.formalityScore,
      formalityScore,
      alpha,
    )

    // Question ratio
    const isQuestion =
      text.includes('?') ||
      /^(what|who|when|where|why|how|is|are|can|could|would|will|do|does)\b/i.test(text)
    this.metrics.questionRatio = this._updateAvg(
      this.metrics.questionRatio,
      isQuestion ? 1 : 0,
      alpha,
    )

    this.metrics.sampleCount++
  }

  /**
   * Update running average
   * @private
   */
  _updateAvg(current, newValue, alpha) {
    return (1 - alpha) * current + alpha * newValue
  }

  /**
   * Get the current style vector
   * @returns {Float64Array}
   */
  getStyleVector() {
    return this.styleVector
  }

  /**
   * Get style metrics
   * @returns {Object}
   */
  getMetrics() {
    return { ...this.metrics }
  }

  /**
   * Check how well a response matches the user's style
   * @param {string} response - Response to check
   * @returns {Object} Match score and analysis
   */
  matchStyle(response) {
    const responseEmbed = this.backend.textToOrderedState(response)

    // Compute cosine similarity to style vector
    let dot = 0,
      magA = 0,
      magB = 0
    for (let i = 0; i < this.dimension; i++) {
      dot += this.styleVector[i] * responseEmbed.c[i]
      magA += this.styleVector[i] * this.styleVector[i]
      magB += responseEmbed.c[i] * responseEmbed.c[i]
    }
    const similarity = dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10)

    // Analyze response metrics
    const words = response.toLowerCase().match(/\b[a-z]+\b/g) || []
    const responseMetrics = {
      length: response.length,
      avgWordLength:
        words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0,
    }

    // Length match
    const lengthRatio =
      Math.min(response.length, this.metrics.avgLength) /
      Math.max(response.length, this.metrics.avgLength, 1)

    return {
      embeddingSimilarity: similarity,
      lengthMatch: lengthRatio,
      overallMatch: (similarity + lengthRatio) / 2,
      responseMetrics,
    }
  }

  /**
   * Generate style hints for prompt engineering
   * @returns {Object} Style hints
   */
  getStyleHints() {
    const hints = []

    if (this.metrics.sampleCount < 5) {
      return { hints: ['Style still learning...'], confidence: 'low' }
    }

    // Length preference
    if (this.metrics.avgLength < 50) {
      hints.push('User prefers brief responses')
    } else if (this.metrics.avgLength > 200) {
      hints.push('User tends toward detailed communication')
    }

    // Technical level
    if (this.metrics.technicalLevel > 0.7) {
      hints.push('User is technically sophisticated')
    } else if (this.metrics.technicalLevel < 0.3) {
      hints.push('User prefers non-technical language')
    }

    // Formality
    if (this.metrics.formalityScore > 0.7) {
      hints.push('User prefers formal communication')
    } else if (this.metrics.formalityScore < 0.3) {
      hints.push('User prefers casual, conversational tone')
    }

    // Question behavior
    if (this.metrics.questionRatio > 0.7) {
      hints.push('User asks many questions - be thorough')
    }

    return {
      hints,
      confidence:
        this.metrics.sampleCount > 20 ? 'high' : this.metrics.sampleCount > 10 ? 'medium' : 'low',
      metrics: this.getMetrics(),
    }
  }

  /**
   * Export style profile to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      styleVector: Array.from(this.styleVector),
      metrics: this.metrics,
      wordFrequency: Object.fromEntries(this.wordFrequency),
      totalWords: this.totalWords,
    }
  }

  /**
   * Import style profile from JSON
   * @param {Object} json - Style data
   */
  fromJSON(json) {
    if (json.styleVector) {
      this.styleVector = new Float64Array(json.styleVector)
    }
    if (json.metrics) {
      this.metrics = { ...this.metrics, ...json.metrics }
    }
    if (json.wordFrequency) {
      this.wordFrequency = new Map(Object.entries(json.wordFrequency))
    }
    if (json.totalWords) {
      this.totalWords = json.totalWords
    }
  }

  /**
   * Save style profile to file
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
   * Load style profile from file
   */
  load() {
    if (!this.storePath || !fs.existsSync(this.storePath)) return

    try {
      const data = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
      this.fromJSON(data)
    } catch (e) {
      console.error('Failed to load style profile:', e.message)
    }
  }

  /**
   * Reset style profile
   */
  reset() {
    this.styleVector = new Float64Array(this.dimension)
    this.metrics = {
      avgLength: 0,
      avgWordLength: 0,
      technicalLevel: 0.5,
      formalityScore: 0.5,
      questionRatio: 0,
      vocabularyRichness: 0,
      sampleCount: 0,
    }
    this.wordFrequency.clear()
    this.totalWords = 0
  }
}

module.exports = { StyleProfiler }
