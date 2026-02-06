/**
 * ResponseProcessor
 *
 * Post-processes LLM responses to extract learning opportunities,
 * verify coherence, and update the semantic knowledge base.
 */

class ResponseProcessor {
  /**
   * Create a ResponseProcessor
   * @param {Object} core - AlephSemanticCore instance
   * @param {Object} options - Configuration options
   */
  constructor(core, options = {}) {
    this.core = core
    this.coherenceThreshold = options.coherenceThreshold || 0.6
    this.learnFromResponses = options.learnFromResponses !== false
    this.extractConcepts = options.extractConcepts !== false
  }

  /**
   * Process a complete LLM response
   * @param {string} response - LLM response text
   * @param {string} userQuery - Original user query
   * @returns {Object} Processing results
   */
  process(response, userQuery) {
    const results = {
      response,
      coherence: 0,
      newWords: [],
      concepts: [],
      quality: 'unknown',
      shouldLearn: false,
      warnings: [],
    }

    // Check coherence with user query
    const responseResult = this.core.processResponse(response, userQuery)
    results.coherence = responseResult.coherence
    results.newWords = responseResult.newWords
    results.concepts = responseResult.concepts

    // Assess quality
    results.quality = this._assessQuality(response, results.coherence)
    results.shouldLearn = results.quality !== 'low' && results.coherence >= this.coherenceThreshold

    // Check for potential issues
    results.warnings = this._checkWarnings(response, userQuery)

    // Add exchange to memory if quality is acceptable
    if (results.shouldLearn && this.learnFromResponses) {
      this.core.addExchange({
        user: userQuery,
        assistant: response,
        coherence: results.coherence,
        quality: results.quality,
      })
    }

    return results
  }

  /**
   * Assess response quality
   * @private
   */
  _assessQuality(response, coherence) {
    // Length check
    if (response.length < 10) return 'low'
    if (response.length > 5000) return 'verbose'

    // Coherence check
    if (coherence < 0.3) return 'low'
    if (coherence < 0.5) return 'medium'
    if (coherence >= 0.7) return 'high'

    return 'medium'
  }

  /**
   * Check for warning signs in response
   * @private
   */
  _checkWarnings(response, query) {
    const warnings = []
    const lower = response.toLowerCase()

    // Check for uncertainty markers
    const uncertaintyPatterns = [
      /i('m| am) not sure/,
      /i don't know/,
      /i cannot/,
      /i can't help/,
      /as an ai/,
      /i apologize/,
    ]

    for (const pattern of uncertaintyPatterns) {
      if (pattern.test(lower)) {
        warnings.push('uncertainty_detected')
        break
      }
    }

    // Check for hallucination markers (claims about real-time data)
    if (/current(ly)?|today|right now|at this moment/.test(lower)) {
      if (/price|stock|weather|news|time is/.test(lower)) {
        warnings.push('potential_temporal_hallucination')
      }
    }

    // Check for very short responses to complex queries
    if (query.length > 100 && response.length < 50) {
      warnings.push('possibly_incomplete')
    }

    // Check for repetition
    const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    const uniqueSentences = new Set(sentences.map((s) => s.toLowerCase().trim()))
    if (sentences.length > 3 && uniqueSentences.size < sentences.length * 0.7) {
      warnings.push('repetitive_content')
    }

    return warnings
  }

  /**
   * Extract structured information from response
   * @param {string} response - LLM response
   * @returns {Object} Extracted information
   */
  extractStructured(response) {
    const extracted = {
      codeBlocks: [],
      lists: [],
      keyPoints: [],
      entities: [],
    }

    // Extract code blocks
    const codePattern = /```(\w*)\n([\s\S]*?)```/g
    let match
    while ((match = codePattern.exec(response)) !== null) {
      extracted.codeBlocks.push({
        language: match[1] || 'unknown',
        code: match[2].trim(),
      })
    }

    // Extract numbered/bulleted lists
    const listPattern = /(?:^|\n)[•\-\*\d.]\s+(.+)/g
    while ((match = listPattern.exec(response)) !== null) {
      extracted.lists.push(match[1].trim())
    }

    // Extract key points (sentences with strong indicators)
    const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 20)
    for (const sentence of sentences) {
      if (/\b(key|important|main|critical|essential|primary)\b/i.test(sentence)) {
        extracted.keyPoints.push(sentence.trim())
      }
    }

    // Extract potential entities (capitalized multi-word phrases)
    const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g
    const seenEntities = new Set()
    while ((match = entityPattern.exec(response)) !== null) {
      if (!seenEntities.has(match[1])) {
        extracted.entities.push(match[1])
        seenEntities.add(match[1])
      }
    }

    return extracted
  }

  /**
   * Generate a summary of the response
   * @param {string} response - LLM response
   * @param {number} maxLength - Maximum summary length
   * @returns {string} Summary
   */
  summarize(response, maxLength = 200) {
    // Simple extractive summary - take first sentence(s) up to maxLength
    const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    let summary = ''

    for (const sentence of sentences) {
      const candidate = summary + sentence.trim() + '. '
      if (candidate.length > maxLength) break
      summary = candidate
    }

    return summary.trim() || response.substring(0, maxLength) + '...'
  }

  /**
   * Score response for various metrics
   * @param {string} response - LLM response
   * @param {string} query - User query
   * @returns {Object} Scores
   */
  scoreResponse(response, query) {
    const coherence = this.core.computeSimilarity(response, query)

    // Informativeness (response length relative to query complexity)
    const queryComplexity = query.split(/\s+/).length
    const responseLength = response.split(/\s+/).length
    const informativeness = Math.min(1, responseLength / (queryComplexity * 5))

    // Readability (average sentence length, word length)
    const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    const avgSentenceLength = responseLength / (sentences.length || 1)
    const readability = 1 - Math.min(1, Math.abs(avgSentenceLength - 15) / 20)

    // Structure (presence of formatting elements)
    const hasCode = /```/.test(response)
    const hasList = /(?:^|\n)[•\-\*\d.]\s+/.test(response)
    const structure = hasCode || hasList ? 1.0 : 0.5

    return {
      coherence,
      informativeness,
      readability,
      structure,
      overall: (coherence + informativeness + readability + structure) / 4,
    }
  }

  /**
   * Get processing configuration
   * @returns {Object}
   */
  getConfig() {
    return {
      coherenceThreshold: this.coherenceThreshold,
      learnFromResponses: this.learnFromResponses,
      extractConcepts: this.extractConcepts,
    }
  }
}

module.exports = { ResponseProcessor }
