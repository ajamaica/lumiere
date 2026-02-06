/**
 * Context Optimizer
 *
 * Advanced context management with multiple pruning strategies
 * optimized for large context windows (64k+ tokens).
 */

const { encoding_for_model } = require('tiktoken')

class ContextOptimizer {
  constructor(options = {}) {
    this.contextLimit = options.contextLimit || 64000
    this.autoPrune = options.autoPrune !== false

    this.thresholds = {
      warning: options.warningThreshold || 0.7,
      prune: options.pruneThreshold || 0.8,
      emergency: options.emergencyThreshold || 0.95,
    }

    this.relevanceDecay = options.relevanceDecay || 0.05
    this.batchSize = options.batchSize || 5
    this.maxCompactionRatio = options.maxCompactionRatio || 0.5

    // Priority weights by role
    this.roleWeights = {
      system: 10,
      user: 6,
      assistant: 5,
    }

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
    return Math.ceil(text.length / 4)
  }

  /**
   * Count total tokens in messages
   */
  countMessageTokens(messages) {
    return messages.reduce((total, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      return total + this.countTokens(content) + 4
    }, 0)
  }

  /**
   * Get health status of context
   */
  getHealth(messages) {
    const tokens = this.countMessageTokens(messages)
    const percentage = tokens / this.contextLimit

    let level
    if (percentage >= this.thresholds.emergency) {
      level = 'emergency'
    } else if (percentage >= this.thresholds.prune) {
      level = 'prune'
    } else if (percentage >= this.thresholds.warning) {
      level = 'warning'
    } else {
      level = 'healthy'
    }

    return {
      tokens,
      limit: this.contextLimit,
      percentage: Math.round(percentage * 100),
      level,
      needsPrune: percentage >= this.thresholds.prune,
    }
  }

  /**
   * Calculate message priority score
   */
  calculatePriority(message, index, total) {
    let score = 0

    // Role weight
    score += this.roleWeights[message.role] || 3

    // Recency bonus (newer = higher)
    const recencyScore = (index / total) * 5
    score += recencyScore

    // Content length penalty (very long = lower priority)
    const content =
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    if (content.length > 2000) {
      score -= 2
    }

    // Important keyword bonus
    const importantPatterns = [
      /important/i,
      /critical/i,
      /error/i,
      /must/i,
      /decision/i,
      /objective/i,
      /task/i,
    ]
    if (importantPatterns.some((p) => p.test(content))) {
      score += 3
    }

    return score
  }

  /**
   * Temporal pruning - remove older messages
   */
  temporalPrune(messages, targetTokens) {
    const health = this.getHealth(messages)
    if (!health.needsPrune) return messages

    // Always preserve system messages and recent messages
    const systemMessages = messages.filter((m) => m.role === 'system')
    const nonSystemMessages = messages.filter((m) => m.role !== 'system')

    // Keep removing oldest until under target
    let pruned = [...nonSystemMessages]
    while (
      this.countMessageTokens([...systemMessages, ...pruned]) > targetTokens &&
      pruned.length > 5
    ) {
      pruned.shift() // Remove oldest
    }

    return [...systemMessages, ...pruned]
  }

  /**
   * Priority-based pruning
   */
  priorityPrune(messages, targetTokens) {
    // Score all messages
    const scored = messages.map((msg, idx) => ({
      message: msg,
      priority: this.calculatePriority(msg, idx, messages.length),
      index: idx,
    }))

    // Sort by priority (highest first)
    scored.sort((a, b) => b.priority - a.priority)

    // Keep adding messages until we hit target
    const kept = []
    let currentTokens = 0

    for (const item of scored) {
      const msgTokens = this.countMessageTokens([item.message])
      if (currentTokens + msgTokens <= targetTokens) {
        kept.push(item)
        currentTokens += msgTokens
      }
    }

    // Restore original order
    kept.sort((a, b) => a.index - b.index)
    return kept.map((item) => item.message)
  }

  /**
   * Semantic deduplication (simplified - removes near-duplicates)
   */
  semanticDedupe(messages) {
    const seen = new Set()
    const deduped = []

    for (const msg of messages) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)

      // Create simple hash (first 100 chars normalized)
      const hash = content.toLowerCase().replace(/\s+/g, ' ').slice(0, 100)

      if (!seen.has(hash)) {
        seen.add(hash)
        deduped.push(msg)
      }
    }

    return deduped
  }

  /**
   * Main prune function with strategy selection
   */
  async prune(messages, options = {}) {
    const strategy = options.strategy || 'adaptive'
    const targetRatio = options.targetRatio || 0.7
    const targetTokens = Math.floor(this.contextLimit * targetRatio)

    const health = this.getHealth(messages)

    console.log(`[ContextOptimizer] Health: ${health.level} (${health.percentage}%)`)

    if (!health.needsPrune) {
      return messages
    }

    let result

    switch (strategy) {
      case 'temporal':
        result = this.temporalPrune(messages, targetTokens)
        break

      case 'priority':
        result = this.priorityPrune(messages, targetTokens)
        break

      case 'semantic':
        result = this.semanticDedupe(messages)
        if (this.getHealth(result).needsPrune) {
          result = this.temporalPrune(result, targetTokens)
        }
        break

      case 'adaptive':
      default:
        // Start with deduplication
        result = this.semanticDedupe(messages)

        // If still over, use priority pruning
        if (this.getHealth(result).needsPrune) {
          result = this.priorityPrune(result, targetTokens)
        }

        // Emergency: temporal as last resort
        if (this.getHealth(result).needsPrune) {
          result = this.temporalPrune(result, targetTokens)
        }
        break
    }

    const newHealth = this.getHealth(result)
    console.log(`[ContextOptimizer] Pruned: ${messages.length} → ${result.length} messages`)
    console.log(`[ContextOptimizer] Tokens: ${health.tokens} → ${newHealth.tokens}`)

    return result
  }
}

module.exports = { ContextOptimizer }
