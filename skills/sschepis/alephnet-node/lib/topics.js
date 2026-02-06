/**
 * TopicTracker
 *
 * Tracks current and historical conversation topics using hypercomplex embeddings.
 * Detects topic shifts and maintains topic continuity.
 */

class TopicTracker {
  /**
   * Create a TopicTracker
   * @param {Object} backend - TinyAleph SemanticBackend instance
   * @param {Object} options - Configuration options
   */
  constructor(backend, options = {}) {
    this.backend = backend
    this.dimension = options.dimension || 16
    this.maxTopics = options.maxTopics || 10
    this.topicThreshold = options.topicThreshold || 0.6
    this.decayRate = options.decayRate || 0.95

    // Active topics with weights
    this.topics = new Map()

    // Topic history
    this.history = []
  }

  /**
   * Update topics based on new text
   * @param {string} text - Text to analyze
   * @returns {Object} Topic update info
   */
  updateTopic(text) {
    const embedding = this.backend.textToOrderedState(text)
    const embeddingArray = Array.from(embedding.c)

    // Extract key phrases as potential topics
    const phrases = this._extractPhrases(text)

    // Check for existing topic matches
    let bestMatch = null
    let bestScore = 0

    for (const [topic, data] of this.topics) {
      const similarity = this._cosineSimilarity(embeddingArray, data.embedding)
      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = topic
      }
    }

    // Decay all topic weights
    for (const [topic, data] of this.topics) {
      data.weight *= this.decayRate
      if (data.weight < 0.1) {
        this.topics.delete(topic)
      }
    }

    // Update or create topics
    const result = {
      isNewTopic: false,
      dominantTopic: null,
      matchedTopic: null,
      topics: [],
    }

    if (bestScore > this.topicThreshold && bestMatch) {
      // Reinforce existing topic
      const data = this.topics.get(bestMatch)
      data.weight = Math.min(1, data.weight + 0.3)
      data.lastSeen = Date.now()
      data.mentions++
      result.matchedTopic = bestMatch
    } else if (phrases.length > 0) {
      // Create new topic from primary phrase
      const newTopic = phrases[0]
      const topicEmbed = this.backend.textToOrderedState(newTopic)

      this.topics.set(newTopic, {
        embedding: Array.from(topicEmbed.c),
        weight: 0.5,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        mentions: 1,
        relatedPhrases: phrases.slice(1, 4),
      })

      result.isNewTopic = true
      result.matchedTopic = newTopic
    }

    // Trim to max topics
    if (this.topics.size > this.maxTopics) {
      const sorted = Array.from(this.topics.entries()).sort((a, b) => b[1].weight - a[1].weight)
      this.topics = new Map(sorted.slice(0, this.maxTopics))
    }

    // Find dominant topic
    let maxWeight = 0
    for (const [topic, data] of this.topics) {
      if (data.weight > maxWeight) {
        maxWeight = data.weight
        result.dominantTopic = topic
      }
    }

    // Record in history
    if (result.matchedTopic) {
      this.history.push({
        topic: result.matchedTopic,
        isNew: result.isNewTopic,
        timestamp: Date.now(),
      })
      if (this.history.length > 100) {
        this.history = this.history.slice(-100)
      }
    }

    result.topics = this.getCurrentTopics()
    return result
  }

  /**
   * Extract key phrases from text
   * @private
   */
  _extractPhrases(text) {
    const phrases = []
    const lower = text.toLowerCase()

    // Common topic patterns
    const patterns = [
      /\b(?:about|regarding|concerning|discussing)\s+(\w+(?:\s+\w+)?)/gi,
      /\b(?:how|what|why)\s+(?:is|are|does|do)\s+(\w+(?:\s+\w+)?)/gi,
      /\b(\w+(?:\s+\w+)?)\s+(?:works?|functions?|means?)/gi,
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(lower)) !== null) {
        if (match[1] && match[1].length > 3) {
          phrases.push(match[1].trim())
        }
      }
    }

    // Also extract noun-like phrases (capitalized words, technical terms)
    const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || []
    for (const word of words) {
      if (word.length > 3 && !phrases.includes(word.toLowerCase())) {
        phrases.push(word.toLowerCase())
      }
    }

    // Technical terms (camelCase, snake_case, etc.)
    const techTerms = text.match(/\b[a-z]+(?:[A-Z][a-z]+)+\b|\b[a-z]+_[a-z]+\b/g) || []
    phrases.push(...techTerms.map((t) => t.toLowerCase()))

    return [...new Set(phrases)].slice(0, 5)
  }

  /**
   * Compute cosine similarity
   * @private
   */
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

  /**
   * Get current active topics
   * @returns {Array<Object>}
   */
  getCurrentTopics() {
    const topics = Array.from(this.topics.entries())
      .map(([topic, data]) => ({
        topic,
        weight: data.weight,
        mentions: data.mentions,
      }))
      .sort((a, b) => b.weight - a.weight)

    return topics
  }

  /**
   * Get topic relevance for text
   * @param {string} text - Text to check
   * @returns {Object} Relevance scores per topic
   */
  getTopicRelevance(text) {
    const embedding = this.backend.textToOrderedState(text)
    const embeddingArray = Array.from(embedding.c)
    const relevance = {}

    for (const [topic, data] of this.topics) {
      relevance[topic] = this._cosineSimilarity(embeddingArray, data.embedding)
    }

    return relevance
  }

  /**
   * Check if there's been a topic shift
   * @returns {boolean}
   */
  hasTopicShift() {
    if (this.history.length < 2) return false

    const recent = this.history.slice(-3)
    const topics = new Set(recent.map((h) => h.topic))

    // Multiple distinct topics in recent history suggests shift
    return topics.size > 1 && recent[recent.length - 1].isNew
  }

  /**
   * Get topic summary for context
   * @returns {string}
   */
  getTopicSummary() {
    const topics = this.getCurrentTopics().slice(0, 3)
    if (topics.length === 0) return ''

    return 'Current topics: ' + topics.map((t) => t.topic).join(', ')
  }

  /**
   * Export topics to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      topics: Object.fromEntries(this.topics),
      history: this.history.slice(-50),
    }
  }

  /**
   * Import topics from JSON
   * @param {Object} json - Topic data
   */
  fromJSON(json) {
    if (json.topics) {
      this.topics = new Map(Object.entries(json.topics))
    }
    if (json.history) {
      this.history = json.history
    }
  }

  /**
   * Clear all topics
   */
  clear() {
    this.topics.clear()
    this.history = []
  }
}

module.exports = { TopicTracker }
