/**
 * Autonomous Learner
 *
 * Main learning loop that orchestrates autonomous learning:
 * 1. Detects curiosity signals (CuriosityEngine)
 * 2. Formulates queries (QueryFormulator)
 * 3. Sends requests to chaperone (ChaperoneAPI)
 * 4. Ingests and integrates content (ContentIngester)
 * 5. Reflects and iterates (ReflectionLoop)
 *
 * This is the core runtime of the autonomous learning system.
 */

const { EventEmitter } = require('events')
const { CuriosityEngine } = require('./curiosity')
const { QueryFormulator } = require('./query')
const { ContentIngester } = require('./ingester')
const { ReflectionLoop } = require('./reflector')
const config = require('./config')
const { createLogger } = require('../app/constants')

const log = createLogger('learning:learner')

class AutonomousLearner {
  /**
   * Create a new AutonomousLearner
   * @param {Object} observer - The SentientObserver instance
   * @param {Object} chaperone - The ChaperoneAPI instance
   * @param {Object} options - Configuration options
   */
  constructor(observer, chaperone, options = {}) {
    this.observer = observer
    this.chaperone = chaperone

    const learnerConfig = { ...config.learner, ...options }

    // Create component instances
    this.curiosityEngine = new CuriosityEngine(observer, options.curiosity)
    this.queryFormulator = new QueryFormulator(options.query)
    this.contentIngester = new ContentIngester(observer, options.ingester)
    this.reflector = new ReflectionLoop(observer, options.reflector)

    // State
    this.running = false
    this.paused = false
    this.learningSession = null

    // Timing
    this.iterationInterval = learnerConfig.iterationInterval || 30000 // 30 seconds
    this.reflectionInterval = learnerConfig.reflectionInterval || 300000 // 5 minutes
    this.maxIterationsPerSession = learnerConfig.maxIterationsPerSession || 100

    // Event emitter for eavesdropping
    this.events = new EventEmitter()

    // Session logging
    this.sessionLog = []
    this.maxLogSize = 100

    // Internal timer handles
    this._iterationTimer = null
    this._reflectionTimer = null

    log('AutonomousLearner initialized')
  }

  /**
   * Start autonomous learning
   * @returns {Promise<void>}
   */
  async start() {
    if (this.running) {
      log.warn('Learning already running')
      return
    }

    log('Starting autonomous learning')

    this.running = true
    this.paused = false

    // Initialize session
    this.learningSession = {
      id: `session_${Date.now()}`,
      startTime: Date.now(),
      iterations: 0,
      queriesMade: 0,
      contentIngested: 0,
      conceptsLearned: [],
      errors: 0,
    }

    // Reset safety filter session
    this.chaperone.resetSession()

    // Emit session start
    this.emit('session_start', this.learningSession)
    log('Learning session started:', this.learningSession.id)

    // Start the learning loop
    this._runLearningLoop()

    // Start reflection timer
    this._startReflectionTimer()
  }

  /**
   * Stop autonomous learning
   */
  stop() {
    if (!this.running) {
      log.warn('Learning not running')
      return
    }

    log('Stopping autonomous learning')

    this.running = false
    this.paused = false

    // Clear timers
    if (this._iterationTimer) {
      clearTimeout(this._iterationTimer)
      this._iterationTimer = null
    }
    if (this._reflectionTimer) {
      clearInterval(this._reflectionTimer)
      this._reflectionTimer = null
    }

    // Finalize session
    if (this.learningSession) {
      this.learningSession.endTime = Date.now()
      this.learningSession.duration = this.learningSession.endTime - this.learningSession.startTime

      this.emit('session_end', this.learningSession)
      log(
        'Learning session ended:',
        this.learningSession.id,
        'iterations:',
        this.learningSession.iterations,
        'concepts:',
        this.learningSession.conceptsLearned.length,
      )
    }
  }

  /**
   * Pause learning
   */
  pause() {
    if (!this.running || this.paused) return

    this.paused = true
    this.emit('paused', { timestamp: Date.now() })
    log('Learning paused')
  }

  /**
   * Resume learning
   */
  resume() {
    if (!this.running || !this.paused) return

    this.paused = false
    this.emit('resumed', { timestamp: Date.now() })
    log('Learning resumed')

    // Restart learning loop
    this._runLearningLoop()
  }

  /**
   * Run the main learning loop
   * @private
   */
  async _runLearningLoop() {
    while (this.running && !this.paused) {
      // Check iteration limit
      if (this.learningSession.iterations >= this.maxIterationsPerSession) {
        log('Maximum iterations reached, stopping')
        this.stop()
        break
      }

      try {
        await this._learningIteration()
      } catch (error) {
        log.error('Learning iteration error:', error.message)
        this.learningSession.errors++
        this.emit('error', { error: error.message, iteration: this.learningSession.iterations })
      }

      // Wait before next iteration
      await this._sleep(this.iterationInterval)
    }
  }

  /**
   * Perform a single learning iteration
   * @private
   */
  async _learningIteration() {
    this.learningSession.iterations++

    const iterationLog = {
      iteration: this.learningSession.iterations,
      timestamp: Date.now(),
      steps: [],
    }

    log('Starting iteration', this.learningSession.iterations)

    // Step 1: Detect curiosity
    this.emit('step', {
      phase: 'curiosity',
      status: 'detecting',
      iteration: this.learningSession.iterations,
    })

    const curiosity = this.curiosityEngine.generateCuriositySignal()

    if (!curiosity || curiosity.intensity < config.learner.curiosityThreshold) {
      const skipReason = !curiosity ? 'no_gaps' : 'low_intensity'
      this.emit('step', {
        phase: 'curiosity',
        status: 'skipped',
        reason: skipReason,
        intensity: curiosity?.intensity || 0,
      })
      iterationLog.steps.push({ phase: 'curiosity', result: 'skipped', reason: skipReason })
      log('Iteration skipped:', skipReason)
      this.sessionLog.push(iterationLog)
      return
    }

    iterationLog.steps.push({ phase: 'curiosity', result: 'detected', curiosity })
    this.emit('step', { phase: 'curiosity', status: 'detected', data: curiosity })
    // Emit dedicated curiosity event for immersive mode
    this.emit('curiosity', {
      topic: curiosity.topic,
      intensity: curiosity.intensity,
      source: curiosity.source,
      timestamp: Date.now(),
    })
    log(
      'Curiosity detected:',
      curiosity.topic.slice(0, 50),
      'intensity:',
      curiosity.intensity.toFixed(2),
    )

    // Excite field with curiosity primes to visualize the "thought"
    if (this.observer && this.observer.prsc && curiosity.primes && curiosity.primes.length > 0) {
      this.observer.prsc.excite(curiosity.primes, curiosity.intensity * 0.8)
    }

    // Step 2: Formulate query
    this.emit('step', { phase: 'query', status: 'formulating' })

    const query = await this.queryFormulator.formulate(curiosity)

    if (!query) {
      this.emit('step', { phase: 'query', status: 'failed' })
      iterationLog.steps.push({ phase: 'query', result: 'failed' })
      log.warn('Query formulation failed')
      this.sessionLog.push(iterationLog)
      return
    }

    iterationLog.steps.push({ phase: 'query', result: query })
    this.emit('step', { phase: 'query', status: 'formulated', data: query })
    // Emit dedicated question event for immersive mode
    const questionText = query.question || query.searchQuery || query.topic || ''
    if (questionText) {
      this.emit('question', {
        question: questionText,
        type: query.type,
        context: curiosity.topic,
        timestamp: Date.now(),
      })
    }
    log(
      'Query formulated:',
      query.type,
      '-',
      (query.question || query.searchQuery || '').slice(0, 50),
    )

    // Excite field with query context to visualize the "inquiry"
    if (this.observer && this.observer.prsc && query.topic) {
      // Encode topic to primes if not already available
      const topicPrimes = this.observer.backend ? this.observer.backend.encode(query.topic) : []
      if (topicPrimes.length > 0) {
        this.observer.prsc.excite(topicPrimes, 0.6)
      }
    }

    // Step 3: Send to chaperone
    this.emit('step', { phase: 'chaperone', status: 'requesting' })

    const response = await this.chaperone.processRequest(query)
    this.learningSession.queriesMade++

    iterationLog.steps.push({ phase: 'chaperone', result: response })
    this.emit('step', { phase: 'chaperone', status: 'responded', data: response })

    if (!response.success) {
      this.emit('step', { phase: 'chaperone', status: 'error', error: response.error })
      iterationLog.steps.push({ phase: 'error', result: response.error })
      log.warn('Chaperone request failed:', response.error)
      this.sessionLog.push(iterationLog)
      return
    }

    log('Chaperone responded:', response.type)

    // Excite field with response arrival (anticipation of learning)
    if (this.observer && this.observer.prsc) {
      // General excitation of current active primes to show activity
      const active = this.observer.prsc.activePrimes(0.1)
      if (active.length > 0) {
        this.observer.prsc.excite(active, 0.4)
      }
    }

    // Step 4: Ingest content
    this.emit('step', { phase: 'ingest', status: 'processing' })

    const ingested = await this.contentIngester.ingest(response)

    if (!ingested) {
      this.emit('step', { phase: 'ingest', status: 'failed' })
      iterationLog.steps.push({ phase: 'ingest', result: 'failed' })
      log.warn('Content ingestion failed')
      this.sessionLog.push(iterationLog)
      return
    }

    this.learningSession.contentIngested++
    iterationLog.steps.push({ phase: 'ingest', result: ingested })
    this.emit('step', { phase: 'ingest', status: 'completed', data: ingested })
    log('Content ingested:', ingested.chunks?.length || 0, 'chunks')

    // Step 5: Integrate into memory
    this.emit('step', { phase: 'integrate', status: 'storing' })

    const integrated = await this._integrateContent(ingested, curiosity)

    iterationLog.steps.push({ phase: 'integrate', result: integrated })
    this.emit('step', { phase: 'integrate', status: 'completed', data: integrated })
    // Emit dedicated memory event for immersive mode
    this.emit('memory', {
      topic: ingested.topic,
      traceId: integrated?.traceId,
      concept: integrated?.concept,
      success: integrated?.success,
      timestamp: Date.now(),
    })
    log('Content integrated, trace:', integrated?.traceId)

    // Track concept
    if (ingested.topic) {
      this.learningSession.conceptsLearned.push({
        topic: ingested.topic,
        timestamp: Date.now(),
      })
    }

    // Mark question as resolved if applicable
    if (curiosity.source === 'question' && curiosity.gap?.question) {
      this.curiosityEngine.resolveQuestion(curiosity.gap.question)
    }

    // Emit event for conversation topic learning (for immersive mode)
    if (curiosity.source === 'conversation_topic') {
      this.emit('conversation_topic_learned', {
        topic: curiosity.gap?.topic,
        keywords: curiosity.gap?.keywords,
        mentionCount: curiosity.gap?.mentionCount || 1,
        isDeepDive: (curiosity.gap?.mentionCount || 0) >= 2,
        timestamp: Date.now(),
      })
      log(
        'Learned from conversation topic:',
        curiosity.gap?.topic,
        'mentions:',
        curiosity.gap?.mentionCount || 1,
      )
    }

    // Store iteration log
    this.sessionLog.push(iterationLog)
    if (this.sessionLog.length > this.maxLogSize) {
      this.sessionLog = this.sessionLog.slice(-this.maxLogSize)
    }

    this.emit('iteration_complete', iterationLog)
    log('Iteration', this.learningSession.iterations, 'complete')
  }

  /**
   * Integrate learned content into observer memory
   * @param {Object} ingested - Ingested content
   * @param {Object} curiosity - Original curiosity signal
   * @returns {Object} Integration result
   */
  async _integrateContent(ingested, curiosity) {
    if (!this.observer) {
      return { success: false, error: 'No observer available' }
    }

    try {
      // Process through observer if method available
      if (typeof this.observer.processText === 'function') {
        // Process first chunk as representative
        const mainContent = ingested.fullContent || ingested.content || ''
        if (mainContent) {
          this.observer.processText(mainContent.slice(0, 2000))
        }
      }

      // Store in holographic memory if available
      if (this.observer.memory && typeof this.observer.memory.store === 'function') {
        const traceData = {
          content: ingested.content,
          fullContent: ingested.fullContent,
          source: ingested.source,
          topic: ingested.topic,
          keywords: ingested.keywords,
          chunks: ingested.chunks?.length || 1,
        }

        const metadata = {
          type: 'learned',
          source: 'autonomous_learning',
          curiositySource: curiosity.source,
          primeState: this.observer.prsc?.toSemanticState?.() || null,
          smf: this.observer.smf?.s ? Array.from(this.observer.smf.s).slice() : null,
          importance: 0.6, // Learned content starts with moderate importance
          tags: ['autonomous', 'learned', ingested.topic ? ingested.topic.slice(0, 50) : 'unknown'],
          timestamp: Date.now(),
        }

        const trace = this.observer.memory.store(traceData, metadata)

        return {
          success: true,
          traceId: trace?.id || 'unknown',
          smfDelta: this.observer.smf?.s ? Array.from(this.observer.smf.s).slice() : null,
          concept: ingested.topic,
        }
      }

      return { success: true, traceId: null, concept: ingested.topic }
    } catch (error) {
      log.error('Memory integration error:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Start the reflection timer
   * @private
   */
  _startReflectionTimer() {
    this._reflectionTimer = setInterval(async () => {
      if (this.running && !this.paused) {
        log('Triggering scheduled reflection')
        await this._triggerReflection()
      }
    }, this.reflectionInterval)
  }

  /**
   * Trigger a reflection cycle
   * @private
   */
  async _triggerReflection() {
    this.emit('step', { phase: 'reflect', status: 'starting' })

    try {
      const reflection = await this.reflector.reflect()

      this.emit('step', { phase: 'reflect', status: 'completed', data: reflection })
      // Emit dedicated reflection events for immersive mode
      if (reflection.insights && reflection.insights.length > 0) {
        for (const insight of reflection.insights) {
          this.emit('reflection', {
            insight:
              typeof insight === 'string'
                ? insight
                : insight.content || insight.text || JSON.stringify(insight),
            type: 'insight',
            timestamp: Date.now(),
          })
        }
      }
      log(
        'Reflection complete:',
        reflection.insights?.length || 0,
        'insights,',
        reflection.followUps?.length || 0,
        'follow-ups',
      )

      // Add follow-up questions to curiosity engine
      if (reflection.followUps) {
        for (const followUp of reflection.followUps) {
          this.curiosityEngine.recordUnansweredQuestion(followUp.question)
        }
      }

      return reflection
    } catch (error) {
      log.error('Reflection error:', error.message)
      this.emit('step', { phase: 'reflect', status: 'error', error: error.message })
      return null
    }
  }

  /**
   * Manually trigger a reflection
   * @returns {Promise<Object>} Reflection result
   */
  async reflect() {
    return this._triggerReflection()
  }

  /**
   * Get current learning status
   * @returns {Object} Status object
   */
  getStatus() {
    const conversationStats = this.curiosityEngine.getConversationLearningStats()

    return {
      running: this.running,
      paused: this.paused,
      session: this.learningSession,
      currentCuriosity: this.curiosityEngine.currentCuriosity,
      curiosityStatus: this.curiosityEngine.getStatus(),
      // Enhanced conversation topic info
      conversationTopics: this.curiosityEngine.getConversationTopics().slice(0, 15),
      conversationLearning: {
        totalTopics: conversationStats.totalTopics,
        recentTopics: conversationStats.recentTopics,
        exploredTopics: conversationStats.exploredTopics,
        pendingTopics: conversationStats.pendingTopics,
        deepDiveTopics: conversationStats.deepDiveTopics,
        focusedOnUserInterests: conversationStats.pendingTopics > 0,
      },
      ingesterStats: this.contentIngester.getStats(),
      reflectorStats: this.reflector.getStats(),
      safetyStats: this.chaperone.getSafetyStats(),
      recentLogs: this.sessionLog.slice(-10),
    }
  }

  /**
   * Get full session log
   * @param {number} count - Number of entries
   * @returns {Array} Session log entries
   */
  getSessionLog(count = 50) {
    return this.sessionLog.slice(-count)
  }

  /**
   * Add a question for the learner to explore
   * @param {string} question - Question to explore
   */
  addQuestion(question) {
    this.curiosityEngine.recordUnansweredQuestion(question)
    log('Question added for exploration:', question.slice(0, 50))
  }

  /**
   * Record a conversation exchange for topic extraction and learning
   * This is the key method for making the agent focus on user-discussed topics
   * @param {Object} exchange - { user: string, assistant: string }
   */
  recordConversation(exchange) {
    if (!exchange) return

    // Record user message for topic extraction (primary source)
    if (exchange.user) {
      this.curiosityEngine.recordConversationTopic(exchange.user, {
        source: 'user_message',
      })
    }

    // Record assistant message for context (may contain follow-up topics)
    if (exchange.assistant) {
      this.curiosityEngine.recordConversationTopic(exchange.assistant, {
        source: 'assistant_message',
      })
    }

    log('Conversation recorded for topic extraction')
  }

  /**
   * Record raw text for topic extraction
   * Useful for processing individual messages
   * @param {string} text - Text to extract topics from
   * @param {Object} options - Options like source type
   */
  recordText(text, options = {}) {
    if (!text || typeof text !== 'string') return

    this.curiosityEngine.recordConversationTopic(text, options)
    log('Text recorded for topic extraction:', text.slice(0, 50))
  }

  /**
   * Get currently tracked conversation topics
   * @returns {Array} Conversation topics being tracked for learning
   */
  getConversationTopics() {
    return this.curiosityEngine.getConversationTopics()
  }

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.events.on(event, callback)
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    this.events.emit(event, data)
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    this.events.off(event, callback)
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Reset all components
   */
  reset() {
    this.stop()
    this.curiosityEngine.reset()
    this.queryFormulator.reset()
    this.contentIngester.reset()
    this.reflector.reset()
    this.sessionLog = []
    this.learningSession = null
    log('AutonomousLearner reset')
  }
}

module.exports = { AutonomousLearner }
