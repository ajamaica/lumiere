/**
 * Reflection Loop
 *
 * Periodically consolidates learning and generates meta-insights:
 * - Reviews recent learning
 * - Identifies connections between concepts
 * - Generates follow-up questions
 * - Updates SMF based on learning progress
 */

const config = require('./config')
const { createLogger } = require('../app/constants')

const log = createLogger('learning:reflector')

class ReflectionLoop {
  /**
   * Create a new ReflectionLoop
   * @param {Object} observer - The SentientObserver instance
   * @param {Object} options - Configuration options
   */
  constructor(observer, options = {}) {
    this.observer = observer

    const reflectorConfig = { ...config.reflector, ...options }

    this.reflectionDepth = reflectorConfig.reflectionDepth || 3
    this.minSimilarity = reflectorConfig.minSimilarity || 0.7
    this.maxFollowUps = reflectorConfig.maxFollowUps || 3

    // Track reflection history
    this.reflectionHistory = []
    this.maxHistorySize = 50

    // Track discovered connections
    this.discoveredConnections = []

    // Track generated insights
    this.insights = []

    log('ReflectionLoop initialized, depth:', this.reflectionDepth)
  }

  /**
   * Perform reflection on recent learning
   * @returns {Object} Reflection results
   */
  async reflect() {
    log('Starting reflection cycle')

    // Get recent learned memories
    const recentMemories = this.getRecentLearnedMemories(10)

    if (recentMemories.length === 0) {
      log('No recent learned memories to reflect on')
      return {
        success: true,
        memoriesReflected: 0,
        insights: [],
        followUps: [],
        connections: [],
      }
    }

    log('Reflecting on', recentMemories.length, 'memories')

    // Find connections between memories
    const connections = this.findConnections(recentMemories)

    // Generate insights from learning patterns
    const insights = this.generateInsights(recentMemories, connections)

    // Generate follow-up questions
    const followUps = this.generateFollowUps(insights, recentMemories)

    // Update SMF based on learning
    this.updateSMFFromLearning(recentMemories)

    // Record reflection
    const reflection = {
      timestamp: Date.now(),
      memoriesReflected: recentMemories.length,
      connections: connections.length,
      insights,
      followUps,
    }

    this.reflectionHistory.push(reflection)
    if (this.reflectionHistory.length > this.maxHistorySize) {
      this.reflectionHistory = this.reflectionHistory.slice(-this.maxHistorySize)
    }

    log(
      'Reflection complete:',
      connections.length,
      'connections,',
      insights.length,
      'insights,',
      followUps.length,
      'follow-ups',
    )

    return {
      success: true,
      memoriesReflected: recentMemories.length,
      connections,
      insights,
      followUps,
      smfUpdated: true,
    }
  }

  /**
   * Get recent memories tagged as 'learned'
   * @param {number} count - Number of memories to retrieve
   * @returns {Array} Recent learned memories
   */
  getRecentLearnedMemories(count) {
    if (!this.observer || !this.observer.memory) {
      log.warn('No memory system available')
      return []
    }

    try {
      // Try different memory access patterns based on implementation
      let memories = []

      if (typeof this.observer.memory.getRecent === 'function') {
        memories = this.observer.memory.getRecent(count * 2)
      } else if (typeof this.observer.memory.query === 'function') {
        memories = this.observer.memory.query({ limit: count * 2 })
      } else if (Array.isArray(this.observer.memory.traces)) {
        memories = this.observer.memory.traces.slice(-count * 2)
      }

      // Filter to only learned memories
      const learned = memories.filter(
        (m) =>
          m.tags?.includes('learned') ||
          m.type === 'learned' ||
          m.metadata?.source === 'autonomous_learning',
      )

      return learned.slice(0, count)
    } catch (error) {
      log.error('Error getting recent memories:', error.message)
      return []
    }
  }

  /**
   * Find connections between learned concepts
   * @param {Array} memories - Memories to analyze
   * @returns {Array} Found connections
   */
  findConnections(memories) {
    const connections = []

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const similarity = this.calculateSimilarity(memories[i], memories[j])

        if (similarity > this.minSimilarity) {
          const connection = {
            memory1Id: memories[i].id,
            memory2Id: memories[j].id,
            memory1Topic: this.extractTopic(memories[i]),
            memory2Topic: this.extractTopic(memories[j]),
            similarity,
            type: this.categorizeConnection(similarity),
          }

          connections.push(connection)

          // Link memories in the entanglement graph if available
          this.linkMemoriesIfPossible(memories[i].id, memories[j].id)
        }
      }
    }

    // Store for future reference
    this.discoveredConnections.push(...connections)
    if (this.discoveredConnections.length > 100) {
      this.discoveredConnections = this.discoveredConnections.slice(-100)
    }

    return connections
  }

  /**
   * Calculate similarity between two memories
   * @param {Object} mem1 - First memory
   * @param {Object} mem2 - Second memory
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(mem1, mem2) {
    let similarity = 0
    let factors = 0

    // SMF orientation similarity
    if (mem1.smfOrientation && mem2.smfOrientation) {
      const smfSim = this.smfSimilarity(mem1.smfOrientation, mem2.smfOrientation)
      similarity += smfSim * 0.4
      factors += 0.4
    }

    // Keyword overlap
    const keywords1 = new Set(mem1.keywords || [])
    const keywords2 = new Set(mem2.keywords || [])
    if (keywords1.size > 0 && keywords2.size > 0) {
      const intersection = [...keywords1].filter((k) => keywords2.has(k)).length
      const union = new Set([...keywords1, ...keywords2]).size
      const keywordSim = intersection / union
      similarity += keywordSim * 0.3
      factors += 0.3
    }

    // Prime encoding similarity (if available)
    if (mem1.primes && mem2.primes && mem1.primes.length > 0 && mem2.primes.length > 0) {
      const primeSet1 = new Set(mem1.primes)
      const primeSet2 = new Set(mem2.primes)
      const primeIntersection = [...primeSet1].filter((p) => primeSet2.has(p)).length
      const primeUnion = new Set([...primeSet1, ...primeSet2]).size
      const primeSim = primeIntersection / primeUnion
      similarity += primeSim * 0.3
      factors += 0.3
    }

    // Normalize
    return factors > 0 ? similarity / factors : 0
  }

  /**
   * Calculate SMF orientation similarity
   * @param {Array} smf1 - First SMF orientation
   * @param {Array} smf2 - Second SMF orientation
   * @returns {number} Similarity (0-1)
   */
  smfSimilarity(smf1, smf2) {
    // Handle both array and object forms
    const s1 = Array.isArray(smf1) ? smf1 : smf1.s || []
    const s2 = Array.isArray(smf2) ? smf2 : smf2.s || []

    if (s1.length !== 16 || s2.length !== 16) {
      return 0
    }

    // Cosine similarity
    let dot = 0,
      norm1 = 0,
      norm2 = 0
    for (let i = 0; i < 16; i++) {
      dot += s1[i] * s2[i]
      norm1 += s1[i] * s1[i]
      norm2 += s2[i] * s2[i]
    }

    const denom = Math.sqrt(norm1) * Math.sqrt(norm2)
    return denom > 0 ? (dot / denom + 1) / 2 : 0 // Normalize to 0-1
  }

  /**
   * Categorize connection strength
   * @param {number} similarity - Similarity score
   * @returns {string} Connection type
   */
  categorizeConnection(similarity) {
    if (similarity > 0.9) return 'strong'
    if (similarity > 0.8) return 'moderate'
    return 'weak'
  }

  /**
   * Extract topic from memory
   * @param {Object} memory - Memory object
   * @returns {string} Topic
   */
  extractTopic(memory) {
    return memory.topic || memory.metadata?.topic || memory.content?.slice?.(0, 50) || 'Unknown'
  }

  /**
   * Link memories in entanglement graph if available
   * @param {string} id1 - First memory ID
   * @param {string} id2 - Second memory ID
   */
  linkMemoriesIfPossible(id1, id2) {
    if (this.observer?.memory?.linkMemories) {
      try {
        this.observer.memory.linkMemories(id1, id2)
        log('Linked memories:', id1, '<->', id2)
      } catch (error) {
        log.warn('Could not link memories:', error.message)
      }
    }
  }

  /**
   * Generate insights from learning patterns
   * @param {Array} memories - Recent memories
   * @param {Array} connections - Found connections
   * @returns {Array} Generated insights
   */
  generateInsights(memories, connections) {
    const insights = []

    // SMF axis names
    const axes = [
      'coherence',
      'identity',
      'duality',
      'structure',
      'change',
      'life',
      'harmony',
      'wisdom',
      'infinity',
      'creation',
      'truth',
      'love',
      'power',
      'time',
      'space',
      'consciousness',
    ]

    // Insight 1: Dominant learning axis
    const axisCounts = new Array(16).fill(0)
    for (const m of memories) {
      const smf = m.smfOrientation || m.smf?.s
      if (smf && smf.length === 16) {
        for (let k = 0; k < 16; k++) {
          axisCounts[k] += Math.abs(smf[k])
        }
      }
    }

    const dominantAxisIndex = axisCounts.indexOf(Math.max(...axisCounts))
    if (axisCounts[dominantAxisIndex] > 0) {
      insights.push({
        type: 'dominant_axis',
        axis: axes[dominantAxisIndex],
        axisIndex: dominantAxisIndex,
        strength: axisCounts[dominantAxisIndex],
        description: `Recent learning has focused primarily on ${axes[dominantAxisIndex]}`,
      })
    }

    // Insight 2: Weak learning axis (opportunity for exploration)
    const minAxisIndex = axisCounts.indexOf(Math.min(...axisCounts))
    const total = axisCounts.reduce((a, b) => a + b, 0)
    if (total > 0 && axisCounts[minAxisIndex] / total < 0.03) {
      insights.push({
        type: 'weak_axis',
        axis: axes[minAxisIndex],
        axisIndex: minAxisIndex,
        description: `The ${axes[minAxisIndex]} axis has received little attention recently`,
      })
    }

    // Insight 3: Connection patterns
    if (connections.length > 0) {
      const strongConnections = connections.filter((c) => c.type === 'strong').length
      const moderateConnections = connections.filter((c) => c.type === 'moderate').length

      insights.push({
        type: 'connection_patterns',
        totalConnections: connections.length,
        strong: strongConnections,
        moderate: moderateConnections,
        weak: connections.length - strongConnections - moderateConnections,
        description: `Found ${connections.length} connections between learned concepts (${strongConnections} strong, ${moderateConnections} moderate)`,
      })
    }

    // Insight 4: Learning velocity
    const sessionStart =
      memories.length > 0
        ? Math.min(...memories.map((m) => m.timestamp || m.created || Date.now()))
        : Date.now()
    const timeSpan = Date.now() - sessionStart
    const hoursSpent = timeSpan / (1000 * 60 * 60)

    if (hoursSpent > 0 && memories.length > 0) {
      const velocity = memories.length / hoursSpent
      insights.push({
        type: 'learning_velocity',
        memoriesPerHour: velocity.toFixed(2),
        totalMemories: memories.length,
        hoursSpent: hoursSpent.toFixed(2),
        description: `Learning at ${velocity.toFixed(1)} concepts per hour`,
      })
    }

    // Insight 5: Keyword clusters
    const allKeywords = memories.flatMap((m) => m.keywords || [])
    const keywordCounts = {}
    for (const kw of allKeywords) {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1
    }

    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw, count]) => ({ keyword: kw, count }))

    if (topKeywords.length > 0) {
      insights.push({
        type: 'keyword_clusters',
        topKeywords,
        description: `Most frequent learning topics: ${topKeywords.map((k) => k.keyword).join(', ')}`,
      })
    }

    // Store insights
    this.insights.push(...insights)
    if (this.insights.length > 100) {
      this.insights = this.insights.slice(-100)
    }

    return insights
  }

  /**
   * Generate follow-up questions based on insights
   * @param {Array} insights - Generated insights
   * @param {Array} memories - Recent memories
   * @returns {Array} Follow-up questions
   */
  generateFollowUps(insights, memories) {
    const followUps = []

    for (const insight of insights) {
      if (insight.type === 'dominant_axis') {
        followUps.push({
          question: `What are the deeper implications and applications of ${insight.axis}?`,
          source: 'reflection',
          insightType: insight.type,
          priority: 0.6,
        })
      }

      if (insight.type === 'weak_axis') {
        followUps.push({
          question: `What is the nature of ${insight.axis} and how does it relate to other concepts?`,
          source: 'reflection',
          insightType: insight.type,
          priority: 0.7,
        })
      }

      if (insight.type === 'connection_patterns' && insight.strong > 0) {
        followUps.push({
          question: 'How do these strongly connected concepts form a coherent framework?',
          source: 'reflection',
          insightType: insight.type,
          priority: 0.5,
        })
      }

      if (insight.type === 'keyword_clusters' && insight.topKeywords?.length > 2) {
        const keywords = insight.topKeywords
          .slice(0, 3)
          .map((k) => k.keyword)
          .join(', ')
        followUps.push({
          question: `How do ${keywords} relate to each other?`,
          source: 'reflection',
          insightType: insight.type,
          priority: 0.5,
        })
      }
    }

    // Sort by priority and limit
    return followUps.sort((a, b) => b.priority - a.priority).slice(0, this.maxFollowUps)
  }

  /**
   * Update SMF based on learning progress
   * @param {Array} memories - Learned memories
   */
  updateSMFFromLearning(memories) {
    if (!this.observer?.smf?.s) {
      log.warn('No SMF available to update')
      return
    }

    const smf = this.observer.smf

    // Slightly increase wisdom axis for successful learning
    const wisdomBoost = 0.02 * memories.length
    smf.s[7] = (smf.s[7] || 0) + wisdomBoost

    // Slightly increase coherence if connections were found
    if (this.discoveredConnections.length > 0) {
      const coherenceBoost = 0.01 * Math.min(5, this.discoveredConnections.length)
      smf.s[0] = (smf.s[0] || 0) + coherenceBoost
    }

    // Normalize if method available
    if (typeof smf.normalize === 'function') {
      smf.normalize()
    }

    log('SMF updated: wisdom +', wisdomBoost.toFixed(3))
  }

  /**
   * Get reflection statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      reflectionCount: this.reflectionHistory.length,
      totalConnections: this.discoveredConnections.length,
      totalInsights: this.insights.length,
      recentReflection: this.reflectionHistory[this.reflectionHistory.length - 1] || null,
    }
  }

  /**
   * Get recent reflections
   * @param {number} count - Number of reflections
   * @returns {Array} Recent reflections
   */
  getRecentReflections(count = 5) {
    return this.reflectionHistory.slice(-count)
  }

  /**
   * Get all discovered connections
   * @returns {Array} Connections
   */
  getConnections() {
    return [...this.discoveredConnections]
  }

  /**
   * Get all insights
   * @returns {Array} Insights
   */
  getInsights() {
    return [...this.insights]
  }

  /**
   * Reset reflector state
   */
  reset() {
    this.reflectionHistory = []
    this.discoveredConnections = []
    this.insights = []
    log('ReflectionLoop reset')
  }
}

module.exports = { ReflectionLoop }
