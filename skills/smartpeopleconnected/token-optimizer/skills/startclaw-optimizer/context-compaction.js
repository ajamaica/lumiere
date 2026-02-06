/**
 * SubagentContextCompactor
 *
 * Manages conversation context by tracking tokens across sessions
 * and compacting information when thresholds are exceeded.
 */

const { encoding_for_model } = require('tiktoken')

class SubagentContextCompactor {
  constructor(options = {}) {
    this.tokenThreshold = options.tokenThreshold || 50000
    this.summaryModel = options.summaryModel || 'claude-3-5-haiku'
    this.preserveLastN = options.preserveLastN || 5
    this.sessionMap = new Map()

    // Critical information patterns to preserve
    this.criticalPatterns = options.criticalPatterns || [
      /task objective/i,
      /error message/i,
      /code reference/i,
      /important:/i,
      /critical:/i,
      /must not forget/i,
      /key decision/i,
    ]

    // Initialize tokenizer
    try {
      this.encoder = encoding_for_model('gpt-4')
    } catch {
      this.encoder = null
    }
  }

  /**
   * Count tokens in text
   */
  countTokens(text) {
    if (this.encoder) {
      return this.encoder.encode(text).length
    }
    // Fallback: estimate ~4 chars per token
    return Math.ceil(text.length / 4)
  }

  /**
   * Count tokens in message array
   */
  countMessageTokens(messages) {
    return messages.reduce((total, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      return total + this.countTokens(content) + 4 // +4 for message overhead
    }, 0)
  }

  /**
   * Track session token usage
   */
  trackSession(sessionKey, messages) {
    const tokenCount = this.countMessageTokens(messages)
    const existing = this.sessionMap.get(sessionKey) || { tokens: 0, compactions: 0 }

    this.sessionMap.set(sessionKey, {
      tokens: tokenCount,
      compactions: existing.compactions,
      lastUpdate: Date.now(),
    })

    return tokenCount
  }

  /**
   * Check if compaction is needed
   */
  needsCompaction(sessionKey) {
    const session = this.sessionMap.get(sessionKey)
    return session && session.tokens >= this.tokenThreshold
  }

  /**
   * Extract critical messages that must be preserved
   */
  extractCriticalMessages(messages) {
    return messages.filter((msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)

      return this.criticalPatterns.some((pattern) => pattern.test(content))
    })
  }

  /**
   * Generate summary of older messages using Haiku
   */
  async generateSummary(messages, anthropic) {
    const content = messages
      .map(
        (m) =>
          `[${m.role}]: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`,
      )
      .join('\n\n')

    try {
      const response = await anthropic.messages.create({
        model: this.summaryModel,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Summarize this conversation, preserving:
1. Key decisions and their reasoning
2. Important facts and data
3. Current task objectives
4. Any errors or blockers mentioned
5. Action items and next steps

Conversation:
${content}

Provide a concise summary that maintains all critical context.`,
          },
        ],
      })

      return response.content[0].text
    } catch (error) {
      console.error('Summary generation failed:', error)
      return null
    }
  }

  /**
   * Compact messages by summarizing older content
   */
  async compactMessages(messages, anthropic) {
    const totalMessages = messages.length

    // Preserve recent messages
    const recentMessages = messages.slice(-this.preserveLastN)
    const olderMessages = messages.slice(0, -this.preserveLastN)

    if (olderMessages.length === 0) {
      return messages
    }

    // Extract critical messages from older ones
    const criticalMessages = this.extractCriticalMessages(olderMessages)

    // Generate summary of older messages
    const summary = await this.generateSummary(olderMessages, anthropic)

    if (!summary) {
      // Fallback: just return recent messages
      return recentMessages
    }

    // Build compacted message array
    const compacted = [
      {
        role: 'system',
        content: `[CONTEXT SUMMARY - Compacted from ${olderMessages.length} messages]\n\n${summary}`,
      },
      ...criticalMessages.slice(-3), // Keep last 3 critical messages
      ...recentMessages,
    ]

    return compacted
  }

  /**
   * Prepare context for subagent spawning
   */
  async prepareForSubagent(fullContext, sessionKey, anthropic) {
    // Track current token usage
    const tokenCount = this.trackSession(sessionKey, fullContext)

    // Check if compaction needed
    if (tokenCount < this.tokenThreshold) {
      return fullContext
    }

    console.log(`[Compactor] Session ${sessionKey}: ${tokenCount} tokens exceeds threshold`)

    // Perform compaction
    const compacted = await this.compactMessages(fullContext, anthropic)
    const newTokenCount = this.countMessageTokens(compacted)

    // Update session tracking
    const session = this.sessionMap.get(sessionKey)
    this.sessionMap.set(sessionKey, {
      tokens: newTokenCount,
      compactions: session.compactions + 1,
      lastUpdate: Date.now(),
    })

    // Log telemetry
    console.log(`[Compactor] Compaction complete:`, {
      sessionKey,
      originalTokens: tokenCount,
      compactedTokens: newTokenCount,
      reduction: `${Math.round((1 - newTokenCount / tokenCount) * 100)}%`,
    })

    return compacted
  }

  /**
   * Get session statistics
   */
  getStats(sessionKey) {
    return this.sessionMap.get(sessionKey) || null
  }

  /**
   * Clear session data
   */
  clearSession(sessionKey) {
    this.sessionMap.delete(sessionKey)
  }
}

module.exports = { SubagentContextCompactor }
