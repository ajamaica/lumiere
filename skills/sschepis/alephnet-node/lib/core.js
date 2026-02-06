/**
 * AlephSemanticCore
 *
 * The semantic heart of AlephChat. Combines TinyAleph's SemanticBackend
 * with vocabulary learning, style profiling, topic tracking, and concept graphs.
 */

const { VocabularyManager } = require('./vocabulary')
const { StyleProfiler } = require('./style')
const { TopicTracker } = require('./topics')
const { ConceptGraph } = require('./concepts')
const { ContextMemory } = require('./memory')

class AlephSemanticCore {
  /**
   * Create an AlephSemanticCore
   * @param {Object} backend - TinyAleph SemanticBackend instance
   * @param {Object} options - Configuration options
   */
  constructor(backend, options = {}) {
    this.backend = backend
    this.dimension = options.dimension || 16
    this.dataPath = options.dataPath || './data'

    // Initialize sub-components
    this.vocabulary = new VocabularyManager(backend, {
      storePath: options.vocabularyPath || `${this.dataPath}/vocabulary.json`,
    })

    this.styleProfiler = new StyleProfiler(backend, {
      dimension: this.dimension,
      learningRate: options.learningRate || 0.1,
      storePath: options.stylePath || `${this.dataPath}/style-profile.json`,
    })

    this.topicTracker = new TopicTracker(backend, {
      dimension: this.dimension,
    })

    this.conceptGraph = new ConceptGraph(backend, {
      storePath: options.conceptsPath || `${this.dataPath}/concepts.json`,
    })

    this.memory = new ContextMemory(backend, {
      immediateSize: options.immediateSize || 10,
      persistPath: options.memoryPath || `${this.dataPath}/memory.json`,
    })
  }

  /**
   * Process user input through all semantic layers
   * @param {string} text - User input
   * @returns {Object} Processing results
   */
  processUserInput(text) {
    const results = {
      embedding: null,
      newWords: [],
      topicUpdate: null,
      styleUpdate: null,
      concepts: [],
    }

    // Generate embedding
    results.embedding = this.backend.textToOrderedState(text)

    // Learn new vocabulary
    results.newWords = this.vocabulary.extractAndLearn(text, {
      source: 'user',
    })

    // Update topics
    results.topicUpdate = this.topicTracker.updateTopic(text)

    // Update style profile
    this.styleProfiler.updateStyle(text)
    results.styleUpdate = this.styleProfiler.getMetrics()

    // Extract concepts
    const conceptResult = this.conceptGraph.extractAndStore(text)
    results.concepts = conceptResult.newConcepts

    return results
  }

  /**
   * Process assistant response through semantic layers
   * @param {string} text - Assistant response
   * @param {string} userQuery - Original user query
   * @returns {Object} Processing results
   */
  processResponse(text, userQuery) {
    const results = {
      embedding: null,
      coherence: 0,
      newWords: [],
      concepts: [],
    }

    // Generate embedding
    results.embedding = this.backend.textToOrderedState(text)

    // Check coherence with user query
    const queryEmbed = this.backend.textToOrderedState(userQuery)
    results.coherence = this._cosineSimilarity(
      Array.from(results.embedding.c),
      Array.from(queryEmbed.c),
    )

    // Learn vocabulary from response
    results.newWords = this.vocabulary.extractAndLearn(text, {
      source: 'assistant',
    })

    // Extract concepts
    const conceptResult = this.conceptGraph.extractAndStore(text)
    results.concepts = conceptResult.newConcepts

    return results
  }

  /**
   * Get semantic context for a query
   * @param {string} query - User query
   * @returns {Object} Context information
   */
  getSemanticContext(query) {
    return {
      topics: this.topicTracker.getCurrentTopics(),
      topicSummary: this.topicTracker.getTopicSummary(),
      styleHints: this.styleProfiler.getStyleHints(),
      relevantConcepts: this.conceptGraph.findSimilar(query, 5),
      memoryContext: this.memory.getRelevantContext(query),
    }
  }

  /**
   * Compute semantic similarity between two texts
   * @param {string} a - First text
   * @param {string} b - Second text
   * @returns {number} Similarity score (0-1)
   */
  computeSimilarity(a, b) {
    const embedA = this.backend.textToOrderedState(a)
    const embedB = this.backend.textToOrderedState(b)
    return this._cosineSimilarity(Array.from(embedA.c), Array.from(embedB.c))
  }

  /**
   * Cosine similarity helper
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
   * Add an exchange to memory
   * @param {Object} exchange - { user, assistant }
   */
  addExchange(exchange) {
    this.memory.addExchange(exchange)
  }

  /**
   * Get session statistics
   * @returns {Object}
   */
  getStats() {
    return {
      vocabulary: this.vocabulary.getStats(),
      style: this.styleProfiler.getMetrics(),
      topics: this.topicTracker.getCurrentTopics(),
      concepts: this.conceptGraph.getStats(),
      memory: this.memory.getStats(),
    }
  }

  /**
   * Save all persistent data
   */
  save() {
    this.vocabulary.save()
    this.styleProfiler.save()
    this.conceptGraph.save()
  }

  /**
   * Load all persistent data
   */
  load() {
    this.vocabulary.load()
    this.styleProfiler.load()
    this.conceptGraph.load()
  }

  /**
   * Clear session data (keep persistent)
   */
  clearSession() {
    this.vocabulary.clearSession()
    this.topicTracker.clear()
    this.memory.clearSession()
  }

  /**
   * Reset everything
   */
  reset() {
    this.vocabulary = new VocabularyManager(this.backend, {
      storePath: `${this.dataPath}/vocabulary.json`,
    })
    this.styleProfiler.reset()
    this.topicTracker.clear()
    this.conceptGraph.clear()
    this.memory.clearAll()
  }
}

module.exports = { AlephSemanticCore }
