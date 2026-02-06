/**
 * Query Formulator
 *
 * Transforms curiosity signals into actionable queries for the Chaperone API.
 *
 * Responsibilities:
 * - Determine query type (question, fetch, local read, search)
 * - Formulate natural language questions
 * - Build search queries for content fetching
 * - Add context from observer state
 */

const config = require('./config')
const { createLogger } = require('../app/constants')

const log = createLogger('learning:query')

class QueryFormulator {
  /**
   * Create a new QueryFormulator
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    const queryConfig = { ...config.query, ...options }

    this.maxQueryLength = queryConfig.maxQueryLength || 200
    this.maxContextItems = queryConfig.maxContextItems || 5

    // Track query history for diversity
    this.queryHistory = []
    this.maxHistorySize = 50

    log('QueryFormulator initialized')
  }

  /**
   * Formulate a query from a curiosity signal
   * @param {Object} curiosity - Curiosity signal from CuriosityEngine
   * @returns {Object} Formatted query for ChaperoneAPI
   */
  async formulate(curiosity) {
    if (!curiosity || !curiosity.topic) {
      log.warn('Invalid curiosity signal, cannot formulate query')
      return null
    }

    // Determine query type based on curiosity source
    const queryType = this.determineQueryType(curiosity)

    log('Formulating query, type:', queryType, 'source:', curiosity.source)

    // Build base query
    const query = {
      type: queryType,
      topic: curiosity.topic,
      context: this.buildContext(curiosity),
      timestamp: Date.now(),
      curiositySource: curiosity.source,
      intensity: curiosity.intensity,
    }

    // Add type-specific fields
    switch (queryType) {
      case 'question':
        query.question = this.formulateQuestion(curiosity)
        break

      case 'fetch_content':
        query.searchQuery = this.formulateSearch(curiosity)
        query.url = this.suggestUrl(curiosity)
        break

      case 'read_local':
        query.filepath = this.suggestLocalFile(curiosity)
        break

      case 'search':
        query.query = this.formulateSearch(curiosity)
        break
    }

    // Ensure query diversity
    query.isNovel = this.checkNovelty(query)

    // Record in history
    this.recordQuery(query)

    log(
      'Query formulated:',
      queryType,
      '-',
      (query.question || query.searchQuery || query.query || '').slice(0, 50),
    )

    return query
  }

  /**
   * Determine the best query type based on curiosity source
   * @param {Object} curiosity - Curiosity signal
   * @returns {string} Query type
   */
  determineQueryType(curiosity) {
    switch (curiosity.source) {
      case 'conversation_topic':
        // User-discussed topic - prioritize learning about it
        // Could be question or search depending on topic nature
        if (this.isConcreteQuestion(curiosity.topic)) {
          return 'search'
        }
        return 'question'

      case 'question':
        // Direct question - ask the chaperone
        return 'question'

      case 'memory_miss':
        // Missing knowledge - could be search or question
        // Prefer search for concrete topics, question for abstract
        if (this.isConcreteQuestion(curiosity.topic)) {
          return 'search'
        }
        return 'question'

      case 'coherence_drop':
        // Confusion - ask for clarification
        return 'question'

      case 'smf_imbalance':
        // Conceptual gap - question about the concept
        return 'question'

      default:
        return 'question'
    }
  }

  /**
   * Check if a topic is concrete enough for a search
   * @param {string} topic - Topic string
   * @returns {boolean} True if concrete
   */
  isConcreteQuestion(topic) {
    // Concrete topics typically contain:
    // - Proper nouns (capitalized words)
    // - Technical terms
    // - Specific phrases like "how to", "example of"

    const concretePatterns = [
      /\b[A-Z][a-z]+\s+[A-Z]/, // Multiple capitalized words
      /\b(python|javascript|react|node|api|http|json|xml)\b/i, // Tech terms
      /\bhow to\b/i,
      /\bexample of\b/i,
      /\btutorial\b/i,
      /\bdocumentation\b/i,
    ]

    return concretePatterns.some((pattern) => pattern.test(topic))
  }

  /**
   * Formulate a natural language question
   * @param {Object} curiosity - Curiosity signal
   * @returns {string} Formatted question
   */
  formulateQuestion(curiosity) {
    let question = curiosity.topic

    // Already a question?
    if (question.endsWith('?')) {
      return question.slice(0, this.maxQueryLength)
    }

    // Check if it starts with question words
    const questionStarters = [
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
      'which',
      'can',
      'could',
      'would',
      'should',
      'is',
      'are',
      'do',
      'does',
    ]
    const startsWithQuestion = questionStarters.some((w) =>
      question.toLowerCase().startsWith(w + ' '),
    )

    if (startsWithQuestion) {
      return (question + '?').slice(0, this.maxQueryLength)
    }

    // Transform statement into question based on source
    switch (curiosity.source) {
      case 'conversation_topic':
        // User-discussed topic - formulate a deeper learning question
        return this.formulateConversationTopicQuestion(question, curiosity.gap)

      case 'smf_imbalance':
        // Already a question from AXIS_QUERIES
        return question.slice(0, this.maxQueryLength)

      case 'memory_miss':
        return `What is ${question}? Please explain in detail.`.slice(0, this.maxQueryLength)

      case 'coherence_drop':
        return `Can you help me understand how these concepts connect: ${question}?`.slice(
          0,
          this.maxQueryLength,
        )

      default:
        return `What can you tell me about ${question}?`.slice(0, this.maxQueryLength)
    }
  }

  /**
   * Formulate a question for a conversation topic
   * Creates learning-focused questions about user-discussed topics
   * @param {string} topic - The topic text
   * @param {Object} gap - The gap object with context
   * @returns {string} Formatted question
   */
  formulateConversationTopicQuestion(topic, gap) {
    // If the topic already ends with ?, use it directly
    if (topic.endsWith('?')) {
      return topic.slice(0, this.maxQueryLength)
    }

    // Check if gap has additional context from keywords
    const keywords = gap?.keywords || []
    const context = gap?.context || ''

    // Generate learning-focused questions based on the topic
    const templates = [
      `What are the key concepts and best practices for ${topic}?`,
      `Can you explain ${topic} in depth, including important details and common patterns?`,
      `What should I understand about ${topic}? Please provide a comprehensive explanation.`,
      `How does ${topic} work and what are the important considerations?`,
      `What are the fundamentals of ${topic} and how can I learn more about it?`,
    ]

    // Select template based on topic characteristics
    let templateIndex = 0

    // If topic mentions learning/understanding, use explanation template
    if (/\b(learn|understand|explain|how)\b/i.test(topic)) {
      templateIndex = 1
    }
    // If topic mentions work/use, use practical template
    else if (/\b(work|use|implement|create|build)\b/i.test(topic)) {
      templateIndex = 3
    }
    // If topic has multiple keywords, use comprehensive template
    else if (keywords.length > 2) {
      templateIndex = 2
    }
    // Otherwise use varied template based on topic hash
    else {
      const hash = topic.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      templateIndex = hash % templates.length
    }

    return templates[templateIndex].slice(0, this.maxQueryLength)
  }

  /**
   * Formulate a search query for content fetching
   * @param {Object} curiosity - Curiosity signal
   * @returns {string} Search query
   */
  formulateSearch(curiosity) {
    const topic = curiosity.topic

    // Remove question words and punctuation
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
      'which',
      'can',
      'could',
      'would',
      'should',
      'do',
      'does',
      'did',
      'please',
      'explain',
      'tell',
      'me',
      'about',
      'understand',
    ])

    const words = topic
      .replace(/[?.,!;:'"()[\]{}]/g, '')
      .split(/\s+/)
      .filter((w) => !stopWords.has(w.toLowerCase()) && w.length > 1)

    // Take top keywords (max 5 for focused search)
    const keywords = words.slice(0, 5)

    return keywords.join(' ')
  }

  /**
   * Suggest a URL for fetching based on curiosity
   * @param {Object} curiosity - Curiosity signal
   * @returns {string|null} Suggested URL or null
   */
  suggestUrl(curiosity) {
    const topic = curiosity.topic.toLowerCase()

    // Simple heuristics for URL suggestion
    if (topic.includes('paper') || topic.includes('research') || topic.includes('academic')) {
      return null // Will use search instead
    }

    if (topic.includes('python')) {
      return 'https://docs.python.org/3/'
    }

    if (topic.includes('javascript') || topic.includes('web')) {
      return 'https://developer.mozilla.org/en-US/docs/Web/JavaScript'
    }

    // Default: no specific URL, use search
    return null
  }

  /**
   * Suggest a local file path based on curiosity
   * @param {Object} curiosity - Curiosity signal
   * @returns {string|null} Suggested filepath or null
   */
  suggestLocalFile(curiosity) {
    // This would need integration with filesystem awareness
    // For now, return null to indicate no specific file suggestion
    return null
  }

  /**
   * Build context from curiosity signal
   * @param {Object} curiosity - Curiosity signal
   * @returns {Object} Context object
   */
  buildContext(curiosity) {
    const context = {
      source: curiosity.source,
      intensity: curiosity.intensity,
      primes: curiosity.primes?.slice(0, 10), // Top 10 primes
      timestamp: curiosity.timestamp,
    }

    // Add gap-specific context
    if (curiosity.gap) {
      context.gapType = curiosity.gap.type

      if (curiosity.gap.type === 'smf_imbalance') {
        context.axis = curiosity.gap.axis
        context.axisValue = curiosity.gap.value
      }

      if (curiosity.gap.type === 'coherence_drop') {
        context.coherence = curiosity.gap.coherence
      }

      if (curiosity.gap.type === 'memory_miss') {
        context.missCount = curiosity.gap.missCount
      }

      // NEW: Add conversation topic context
      if (curiosity.gap.type === 'conversation_topic') {
        context.conversationTopic = curiosity.gap.topic
        context.conversationKeywords = curiosity.gap.keywords
        context.conversationContext = curiosity.gap.context
        context.mentionCount = curiosity.gap.mentionCount
        context.isUserTopic = true // Flag that this came from user conversation
      }
    }

    // Add related gaps for broader context
    if (curiosity.allGaps && curiosity.allGaps.length > 1) {
      context.relatedTopics = curiosity.allGaps
        .slice(1, this.maxContextItems)
        .map((g) => g.description || g.suggestedQuery)
        .filter(Boolean)
    }

    return context
  }

  /**
   * Check if a query is novel (not too similar to recent queries)
   * @param {Object} query - Query to check
   * @returns {boolean} True if novel
   */
  checkNovelty(query) {
    if (this.queryHistory.length === 0) {
      return true
    }

    const queryText = (query.question || query.searchQuery || query.topic || '').toLowerCase()

    // Check against recent queries
    for (const histQuery of this.queryHistory.slice(-10)) {
      const histText = (
        histQuery.question ||
        histQuery.searchQuery ||
        histQuery.topic ||
        ''
      ).toLowerCase()

      // Simple similarity check (overlap of words)
      const queryWords = new Set(queryText.split(/\s+/).filter((w) => w.length > 2))
      const histWords = new Set(histText.split(/\s+/).filter((w) => w.length > 2))

      let overlap = 0
      for (const word of queryWords) {
        if (histWords.has(word)) overlap++
      }

      const similarity = overlap / Math.max(queryWords.size, 1)

      if (similarity > 0.7) {
        // Too similar to a recent query
        log('Query too similar to recent query, similarity:', similarity.toFixed(2))
        return false
      }
    }

    // Also check if the exact same question was asked recently (strict check)
    if (query.question) {
      const recentQuestions = this.queryHistory
        .slice(-20)
        .map((q) => q.question)
        .filter(Boolean)

      if (recentQuestions.includes(query.question)) {
        log('Query identical to recent question, rejecting')
        return false
      }
    }

    return true
  }

  /**
   * Record a query in history
   * @param {Object} query - Query to record
   */
  recordQuery(query) {
    this.queryHistory.push({
      type: query.type,
      question: query.question,
      searchQuery: query.searchQuery,
      topic: query.topic,
      timestamp: query.timestamp,
    })

    // Keep history manageable
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory = this.queryHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Get query history
   * @param {number} count - Number of entries
   * @returns {Array} Recent queries
   */
  getHistory(count = 10) {
    return this.queryHistory.slice(-count)
  }

  /**
   * Clear query history
   */
  reset() {
    this.queryHistory = []
    log('QueryFormulator reset')
  }
}

module.exports = { QueryFormulator }
