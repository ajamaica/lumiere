/**
 * Next Step Suggestion Generator
 *
 * Analyzes conversation context to generate logical next-step suggestions
 * that users can quickly select to continue the conversation.
 */

/**
 * NextStepGenerator - Generates contextual follow-up suggestions
 */
class NextStepGenerator {
  constructor(options = {}) {
    this.maxSuggestions = options.maxSuggestions || 4
    this.minSuggestions = options.minSuggestions || 2

    // Patterns that indicate specific types of responses
    this.patterns = {
      explanation: /(?:explained|describes?|is a|are|means?|definition|concept)/i,
      howTo: /(?:how to|steps?|guide|tutorial|instructions?|process)/i,
      codeChange: /(?:created?|modified?|updated?|fixed?|implemented?|added?|removed?)/i,
      listing: /(?:list|options?|alternatives?|types? of|kinds? of|examples?)/i,
      comparison: /(?:compare|difference|vs\.?|versus|better|worse|pros|cons)/i,
      error: /(?:error|bug|issue|problem|failed?|exception)/i,
      incomplete: /(?:cannot|can't|unable|don't know|not sure|unclear)/i,
    }

    // Template suggestions by response type
    this.templates = {
      explanation: [
        'Can you give me an example?',
        'How does this work in practice?',
        'What are the limitations?',
        'When should I use this?',
        'What are related concepts?',
      ],
      howTo: [
        'Show me the code for this',
        'What if I need to customize this?',
        'What are common mistakes to avoid?',
        'Can you explain step {n} in more detail?',
        'Are there alternative approaches?',
      ],
      codeChange: [
        'Can you explain what changed?',
        'How do I test this?',
        'What other files might need updates?',
        'Are there any edge cases to handle?',
        'Can you add error handling?',
      ],
      listing: [
        'Tell me more about {item}',
        'Which one is best for my use case?',
        'Can you compare these options?',
        'Are there any others?',
        'What are the trade-offs?',
      ],
      comparison: [
        'Which one should I choose?',
        'Show me examples of each',
        'What are the performance differences?',
        'When would I prefer one over the other?',
        'Can you go deeper on the pros/cons?',
      ],
      error: [
        'How do I fix this?',
        'What caused this error?',
        'Show me the corrected code',
        'Are there similar issues to watch for?',
        'How can I prevent this in the future?',
      ],
      incomplete: [
        'What information do you need?',
        'Let me provide more context',
        'Can you try a different approach?',
        'What are you able to help with?',
      ],
      general: [
        'Tell me more about this',
        'Can you elaborate?',
        'What should I do next?',
        'Are there any best practices?',
        'What are potential issues to watch for?',
      ],
    }
  }

  /**
   * Generate next-step suggestions based on conversation context
   * @param {Object} context - Conversation context
   * @param {string} context.userMessage - The user's original message
   * @param {string} context.assistantResponse - The AI's response
   * @param {Array} context.conversationHistory - Previous messages
   * @param {Array} context.topics - Current topics from CuriosityEngine
   * @param {Object} context.toolResults - Results of any tools executed
   * @returns {Array<Object>} Array of suggestion objects with text and metadata
   */
  generateSuggestions(context) {
    const {
      userMessage,
      assistantResponse,
      conversationHistory = [],
      topics = [],
      toolResults = [],
    } = context

    const suggestions = []

    // Detect response type
    const responseType = this.detectResponseType(assistantResponse, toolResults)

    // Get template suggestions for this response type
    const templateSuggestions = this.getTemplateSuggestions(responseType, context)
    suggestions.push(...templateSuggestions)

    // Generate topic-based suggestions
    const topicSuggestions = this.generateTopicSuggestions(topics, userMessage)
    suggestions.push(...topicSuggestions)

    // Generate follow-up action suggestions
    const actionSuggestions = this.generateActionSuggestions(
      userMessage,
      assistantResponse,
      toolResults,
    )
    suggestions.push(...actionSuggestions)

    // Generate drill-down suggestions based on mentioned concepts
    const conceptSuggestions = this.generateConceptSuggestions(assistantResponse)
    suggestions.push(...conceptSuggestions)

    // Deduplicate and rank suggestions
    const rankedSuggestions = this.rankAndDeduplicate(suggestions, userMessage, assistantResponse)

    // Return top N suggestions
    return rankedSuggestions.slice(0, this.maxSuggestions)
  }

  /**
   * Detect the type of response to tailor suggestions
   */
  detectResponseType(response, toolResults = []) {
    // Check if tools were executed
    if (toolResults && toolResults.length > 0) {
      const hasCodeTools = toolResults.some((r) =>
        ['write_file', 'edit_file', 'apply_diff'].includes(r.tool),
      )
      if (hasCodeTools) return 'codeChange'
    }

    // Check response content patterns
    for (const [type, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(response)) {
        return type
      }
    }

    return 'general'
  }

  /**
   * Get suggestions from templates based on response type
   */
  getTemplateSuggestions(responseType, context) {
    const templates = this.templates[responseType] || this.templates.general
    const suggestions = []

    // Pick 2 relevant templates
    const selected = templates.slice(0, 2)

    for (const template of selected) {
      let text = template

      // Replace placeholders if possible
      if (template.includes('{item}')) {
        const items = this.extractListItems(context.assistantResponse)
        if (items.length > 0) {
          text = template.replace('{item}', items[0])
        } else {
          continue // Skip if no items found
        }
      }

      if (template.includes('{n}')) {
        text = template.replace('{n}', '2') // Default to step 2
      }

      suggestions.push({
        text,
        type: 'template',
        responseType,
        priority: 3,
      })
    }

    return suggestions
  }

  /**
   * Generate suggestions based on current topics from CuriosityEngine
   */
  generateTopicSuggestions(topics, userMessage) {
    if (!topics || topics.length === 0) return []

    const suggestions = []

    // Get top 2 topics that aren't in the user message
    const userWords = new Set(userMessage.toLowerCase().split(/\s+/))
    const relevantTopics = topics.filter((t) => !userWords.has(t.topic.toLowerCase())).slice(0, 2)

    for (const topic of relevantTopics) {
      suggestions.push({
        text: `How does this relate to ${topic.topic}?`,
        type: 'topic',
        topic: topic.topic,
        priority: topic.count > 2 ? 4 : 2,
      })
    }

    return suggestions
  }

  /**
   * Generate action-oriented suggestions
   */
  generateActionSuggestions(userMessage, assistantResponse, toolResults) {
    const suggestions = []

    // Check for code-related content
    if (this.containsCode(assistantResponse)) {
      suggestions.push({
        text: 'Run this code',
        type: 'action',
        action: 'execute',
        priority: 4,
      })

      suggestions.push({
        text: 'Save this to a file',
        type: 'action',
        action: 'save',
        priority: 3,
      })
    }

    // Check for file modifications
    if (toolResults.some((r) => r.tool === 'write_file' || r.tool === 'apply_diff')) {
      suggestions.push({
        text: 'Show me the complete file',
        type: 'action',
        action: 'read_file',
        priority: 4,
      })

      suggestions.push({
        text: 'Test these changes',
        type: 'action',
        action: 'test',
        priority: 3,
      })
    }

    // Check for incomplete or partial responses
    if (assistantResponse.includes('...') || assistantResponse.includes('etc.')) {
      suggestions.push({
        text: 'Continue from where you left off',
        type: 'action',
        action: 'continue',
        priority: 5,
      })
    }

    return suggestions
  }

  /**
   * Generate suggestions to drill down on mentioned concepts
   */
  generateConceptSuggestions(response) {
    const suggestions = []

    // Extract potential concepts (capitalized terms, quoted terms, technical terms)
    const concepts = this.extractConcepts(response)

    // Pick top 2 concepts
    const topConcepts = concepts.slice(0, 2)

    for (const concept of topConcepts) {
      suggestions.push({
        text: `Explain ${concept} in more detail`,
        type: 'concept',
        concept,
        priority: 2,
      })
    }

    return suggestions
  }

  /**
   * Extract list items from a response
   */
  extractListItems(response) {
    const items = []

    // Match numbered lists: 1. Item, 2. Item
    const numberedMatches = response.match(/\d+\.\s+([^\n]+)/g)
    if (numberedMatches) {
      items.push(...numberedMatches.map((m) => m.replace(/^\d+\.\s+/, '').trim()))
    }

    // Match bullet lists: - Item, * Item
    const bulletMatches = response.match(/^[-*]\s+([^\n]+)/gm)
    if (bulletMatches) {
      items.push(...bulletMatches.map((m) => m.replace(/^[-*]\s+/, '').trim()))
    }

    return items
  }

  /**
   * Check if response contains code blocks
   */
  containsCode(response) {
    return (
      response.includes('```') ||
      response.includes('    ') || // Indented code
      /`[^`]+`/.test(response)
    ) // Inline code
  }

  /**
   * Extract technical concepts from response
   */
  extractConcepts(response) {
    const concepts = new Set()

    // Extract quoted terms
    const quotedMatches = response.match(/["']([^"']+)["']/g)
    if (quotedMatches) {
      quotedMatches.forEach((m) => {
        const term = m.slice(1, -1)
        if (term.length > 2 && term.length < 30) {
          concepts.add(term)
        }
      })
    }

    // Extract backtick terms
    const backtickMatches = response.match(/`([^`]+)`/g)
    if (backtickMatches) {
      backtickMatches.forEach((m) => {
        const term = m.slice(1, -1)
        if (term.length > 2 && term.length < 30 && !term.includes(' ')) {
          concepts.add(term)
        }
      })
    }

    // Extract capitalized terms (likely proper nouns/technologies)
    const capitalizedMatches = response.match(/\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?\b/g)
    if (capitalizedMatches) {
      capitalizedMatches.forEach((term) => {
        if (term.length > 2 && term.length < 30) {
          // Filter out common sentence starters
          if (
            ![
              'The',
              'This',
              'That',
              'These',
              'Those',
              'It',
              'If',
              'When',
              'What',
              'How',
              'Why',
              'Where',
              'Who',
            ].includes(term)
          ) {
            concepts.add(term)
          }
        }
      })
    }

    return Array.from(concepts)
  }

  /**
   * Rank and deduplicate suggestions
   */
  rankAndDeduplicate(suggestions, userMessage, assistantResponse) {
    // Deduplicate by text similarity
    const seen = new Set()
    const unique = []

    for (const suggestion of suggestions) {
      const normalized = suggestion.text.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!seen.has(normalized)) {
        seen.add(normalized)
        unique.push(suggestion)
      }
    }

    // Sort by priority (higher first)
    unique.sort((a, b) => (b.priority || 0) - (a.priority || 0))

    // Ensure diversity - don't have all same type
    const diversified = this.ensureDiversity(unique)

    return diversified
  }

  /**
   * Ensure suggestion diversity by type
   */
  ensureDiversity(suggestions) {
    const result = []
    const typeCount = {}

    for (const suggestion of suggestions) {
      const type = suggestion.type || 'general'
      typeCount[type] = (typeCount[type] || 0) + 1

      // Allow max 2 of same type
      if (typeCount[type] <= 2) {
        result.push(suggestion)
      }
    }

    return result
  }
}

/**
 * Create a NextStepGenerator instance
 */
function createNextStepGenerator(options) {
  return new NextStepGenerator(options)
}

module.exports = {
  NextStepGenerator,
  createNextStepGenerator,
}
