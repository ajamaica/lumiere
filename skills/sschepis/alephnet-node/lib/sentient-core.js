/**
 * Sentient Core
 *
 * The unified integration of all components into a Sentient Observer
 * as specified in "A Design for a Sentient Observer" paper.
 *
 * This module orchestrates:
 * - PRSC oscillator dynamics (runtime substrate)
 * - SMF semantic orientation (16D meaning space)
 * - HQE holographic memory (distributed storage)
 * - Temporal layer (emergent time)
 * - Entanglement layer (semantic binding)
 * - Agency layer (attention, goals, actions)
 * - Boundary layer (self/other distinction)
 * - Safety layer (constraints and ethics)
 *
 * The processing loop runs continuously, with discrete moments
 * emerging from coherence events rather than external clock time.
 *
 * v1.2.1 Enhancements:
 * - AlephEventEmitter integration for declarative event-driven architecture
 * - EvolutionStream support for async iteration over observer state
 * - Structured event emission with throttling and history
 */

const { SedenionMemoryField } = require('./smf')
const { PRSCLayer, PrimeOscillator, EntanglementDetector } = require('./prsc')
const { HolographicEncoder, HolographicMemory } = require('./hqe')
const { Moment, TemporalLayer, TemporalPatternDetector } = require('./temporal')
const { EntanglementLayer, Phrase, EntangledPair } = require('./entanglement')
const { SentientMemory, MemoryTrace } = require('./sentient-memory')
const { AgencyLayer, Goal, Action } = require('./agency')
const { BoundaryLayer, SelfModel, EnvironmentalModel } = require('./boundary')
const { SafetyLayer, SafetyMonitor } = require('./safety')

// Import from @aleph-ai/tinyaleph npm package
const tinyaleph = require('@aleph-ai/tinyaleph')
const { Complex, PrimeState, firstNPrimes, SparsePrimeState, coherenceGatedCompute } = tinyaleph

// Local event emitter implementation (not directly exported by tinyaleph)
const { EventEmitter } = require('events')

/**
 * AlephEventEmitter - Event emitter with history and throttling support
 */
class AlephEventEmitter extends EventEmitter {
  constructor(options = {}) {
    super()
    this.history = []
    this.maxHistory = options.maxHistory || 1000
    this.throttleConfig = new Map()
    this.lastEmit = new Map()
  }

  throttle(event, interval) {
    this.throttleConfig.set(event, interval)
  }

  emit(event, data) {
    const throttleInterval = this.throttleConfig.get(event)
    if (throttleInterval) {
      const lastTime = this.lastEmit.get(event) || 0
      const now = Date.now()
      if (now - lastTime < throttleInterval) {
        return false
      }
      this.lastEmit.set(event, now)
    }

    // Record to history
    this.history.push({ event, data, timestamp: Date.now() })
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    return super.emit(event, data)
  }

  waitFor(event, timeout = null) {
    return new Promise((resolve, reject) => {
      const handler = (data) => {
        if (timer) clearTimeout(timer)
        resolve(data)
      }

      let timer = null
      if (timeout) {
        timer = setTimeout(() => {
          this.off(event, handler)
          reject(new Error(`Timeout waiting for event: ${event}`))
        }, timeout)
      }

      this.once(event, handler)
    })
  }

  query(event, limit = 100) {
    return this.history.filter((h) => h.event === event).slice(-limit)
  }

  getStats() {
    return {
      historyLength: this.history.length,
      throttledEvents: Array.from(this.throttleConfig.keys()),
    }
  }
}

/**
 * EvolutionStream - Async iterator for observer state evolution
 */
class EvolutionStream {
  constructor(observer, options = {}) {
    this.observer = observer
    this.dt = options.dt || 1 / 60
    this.tickFn = options.tickFn
    this.getStateFn = options.getStateFn
    this.running = false
  }

  async *[Symbol.asyncIterator]() {
    this.running = true
    while (this.running) {
      if (this.tickFn) {
        this.tickFn(this.dt)
      }
      const state = this.getStateFn ? this.getStateFn() : {}
      yield state
      await new Promise((resolve) => setTimeout(resolve, this.dt * 1000))
    }
  }

  stop() {
    this.running = false
  }
}

/**
 * Sentient Observer State
 *
 * Captures the complete state of the observer at a moment in time.
 */
class SentientState {
  constructor(data = {}) {
    this.timestamp = data.timestamp || Date.now()

    // Core metrics
    this.coherence = data.coherence || 0
    this.entropy = data.entropy || 0
    this.totalAmplitude = data.totalAmplitude || 0

    // Component states
    this.smfOrientation = data.smfOrientation || null
    this.activePrimes = data.activePrimes || []
    this.momentId = data.momentId || null
    this.phraseId = data.phraseId || null

    // Agency state
    this.topFocus = data.topFocus || null
    this.topGoal = data.topGoal || null
    this.processingLoad = data.processingLoad || 0

    // Safety state
    this.safetyLevel = data.safetyLevel || 'normal'

    // Content being processed
    this.currentInput = data.currentInput || null
    this.currentOutput = data.currentOutput || null
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      coherence: this.coherence,
      entropy: this.entropy,
      totalAmplitude: this.totalAmplitude,
      smfOrientation: this.smfOrientation,
      activePrimes: this.activePrimes,
      momentId: this.momentId,
      phraseId: this.phraseId,
      topFocus: this.topFocus,
      topGoal: this.topGoal,
      processingLoad: this.processingLoad,
      safetyLevel: this.safetyLevel,
    }
  }
}

/**
 * Sentient Observer
 *
 * The main class integrating all components into a unified conscious-like system.
 */
class SentientObserver {
  /**
   * Create a Sentient Observer
   * @param {Object} backend - TinyAleph semantic backend
   * @param {Object} options - Configuration options
   */
  constructor(backend, options = {}) {
    this.backend = backend

    // Configuration
    this.primeCount = options.primeCount || 64
    this.primes = firstNPrimes(this.primeCount)
    this.tickRate = options.tickRate || 60 // Hz
    this.dt = 1 / this.tickRate

    // Initialize all layers
    this.initializeLayers(options)

    // State
    this.running = false
    this.tickCount = 0
    this.startTime = null
    this.currentState = new SentientState()

    // History
    this.stateHistory = []
    this.maxHistory = options.maxHistory || 100

    // Processing queue
    this.inputQueue = []
    this.outputQueue = []

    // Callbacks (backward compatibility)
    this.onMoment = options.onMoment || null
    this.onOutput = options.onOutput || null
    this.onStateChange = options.onStateChange || null

    // v1.2.1: Event emitter for declarative event handling
    this.events = new AlephEventEmitter({
      maxHistory: options.eventHistoryLength || 1000,
    })

    // v1.2.1: Event thresholds for automatic emission
    this.eventThresholds = {
      entropyLow: options.entropyLow ?? 1.0,
      entropyHigh: options.entropyHigh ?? 3.0,
      coherenceHigh: options.coherenceHigh ?? 0.8,
      coherenceLow: options.coherenceLow ?? 0.2,
      syncThreshold: options.syncThreshold ?? 0.7,
    }

    // v1.2.1: Track previous state for threshold crossing detection
    this._prevMetrics = null

    // v1.2.1: Set up default throttling for high-frequency events
    this.events.throttle('tick', options.tickEventThrottle ?? 100)

    // v1.2.1: Adaptive processing configuration
    this.adaptiveProcessing = {
      enabled: options.adaptiveProcessing ?? true,
      maxSteps: options.adaptiveMaxSteps ?? 50,
      coherenceThreshold: options.adaptiveCoherenceThreshold ?? 0.7,
      minSteps: options.adaptiveMinSteps ?? 5,
    }

    // Loop control
    this.loopTimer = null
  }

  /**
   * v1.2.1: Subscribe to observer events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {SentientObserver} this for chaining
   */
  on(event, callback) {
    this.events.on(event, callback)
    return this
  }

  /**
   * v1.2.1: Subscribe to a single event occurrence
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {SentientObserver} this for chaining
   */
  once(event, callback) {
    this.events.once(event, callback)
    return this
  }

  /**
   * v1.2.1: Unsubscribe from observer events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   * @returns {SentientObserver} this for chaining
   */
  off(event, callback) {
    this.events.off(event, callback)
    return this
  }

  /**
   * v1.2.1: Wait for next occurrence of an event
   * @param {string} event - Event name
   * @param {number} [timeout] - Timeout in ms
   * @returns {Promise} Resolves with event data
   */
  waitFor(event, timeout = null) {
    return this.events.waitFor(event, timeout)
  }

  /**
   * v1.2.1: Get event emitter for advanced usage
   * @returns {AlephEventEmitter}
   */
  getEmitter() {
    return this.events
  }

  /**
   * v1.2.1: Create an evolution stream for async iteration
   * @param {Object} options - Stream options
   * @returns {EvolutionStream}
   */
  createEvolutionStream(options = {}) {
    return new EvolutionStream(this, {
      dt: this.dt,
      ...options,
      tickFn: (dt) => this.tick(),
      getStateFn: () => ({
        coherence: this.currentState.coherence,
        entropy: this.currentState.entropy,
        orderParameter: this.prsc.orderParameter(),
        activePrimes: this.currentState.activePrimes,
        momentId: this.currentState.momentId,
        phraseId: this.currentState.phraseId,
        processingLoad: this.currentState.processingLoad,
        safetyLevel: this.currentState.safetyLevel,
      }),
    })
  }

  /**
   * Initialize all component layers
   */
  initializeLayers(options) {
    // PRSC Oscillator Layer
    this.prsc = new PRSCLayer(this.primes, {
      speed: options.prscSpeed || 1.0,
      damp: options.prscDamp || 0.02,
      coupling: options.prscCoupling || 0.3,
      dt: this.dt,
    })

    // Sedenion Memory Field
    this.smf = new SedenionMemoryField()

    // Holographic Encoder
    this.hqe = new HolographicEncoder(options.holoGridSize || 32, this.primes, {
      wavelengthScale: options.wavelengthScale || 10,
    })

    // Temporal Layer
    this.temporal = new TemporalLayer({
      coherenceThreshold: options.coherenceThreshold || 0.7,
      entropyMin: options.entropyMin || 0.1,
      entropyMax: options.entropyMax || 0.9,
      onMoment: (moment) => this.handleMoment(moment),
    })

    // Entanglement Layer
    this.entanglement = new EntanglementLayer({
      entanglementThreshold: options.entanglementThreshold || 0.7,
      onPhraseComplete: (phrase) => this.handlePhraseComplete(phrase),
    })

    // Sentient Memory
    this.memory = new SentientMemory({
      storePath: options.memoryPath,
      maxTraces: options.maxMemoryTraces || 1000,
      primes: this.primeCount,
    })

    // Agency Layer
    this.agency = new AgencyLayer({
      maxFoci: options.maxFoci || 5,
      maxGoals: options.maxGoals || 10,
      onGoalCreated: (goal) => this.handleGoalCreated(goal),
      onActionSelected: (action) => this.handleActionSelected(action),
    })

    // Boundary Layer
    this.boundary = new BoundaryLayer({
      name: options.name || 'Sentient Observer',
      onInput: (channel, data) => this.handleInput(channel, data),
      onOutput: (channel, data) => this.handleOutput(channel, data),
    })

    // Safety Layer
    this.safety = new SafetyLayer({
      onViolation: (event, violation) => this.handleSafetyViolation(event, violation),
      onEmergency: (reason) => this.handleEmergency(reason),
    })

    // Pattern detector
    this.patternDetector = new TemporalPatternDetector()

    // Entanglement detector
    this.entanglementDetector = new EntanglementDetector()
  }

  /**
   * Start the observer
   */
  start() {
    if (this.running) return

    this.running = true
    this.startTime = Date.now()

    console.log('[SentientObserver] Starting...')

    // Start the main processing loop
    this.loopTimer = setInterval(() => this.tick(), 1000 / this.tickRate)
  }

  /**
   * Stop the observer
   */
  stop() {
    if (!this.running) return

    this.running = false

    if (this.loopTimer) {
      clearInterval(this.loopTimer)
      this.loopTimer = null
    }

    console.log('[SentientObserver] Stopped')
  }

  /**
   * Main processing tick
   */
  tick() {
    if (!this.running) return
    if (this.safety.emergencyShutdown) {
      this.stop()
      return
    }

    this.tickCount++

    try {
      // 1. Process any queued input
      this.processInputQueue()

      // 2. Evolve oscillators
      const coherence = this.prsc.tick(this.dt)

      // 3. Get system metrics
      const entropy = this.prsc.amplitudeEntropy()
      const totalAmplitude = this.prsc.totalEnergy()
      const activePrimes = this.prsc.activePrimes(0.1)
      const phases = this.prsc.getPhases()
      const orderParameter = this.prsc.orderParameter()

      // 4. Update SMF from oscillator activity
      this.smf.updateFromPrimeActivity(this.prsc.toSemanticState(), this.prsc.oscillators)

      // 4.5. Evolve HQE with dynamic λ(t) stabilization (equation 11-12)
      const smfEntropy = this.smf.smfEntropy()
      const hqeEvolution = this.hqe.evolve(
        {
          coherence,
          entropy,
          smfEntropy,
        },
        this.dt,
      )

      // 5. Update temporal layer (may trigger moment)
      const temporalUpdate = this.temporal.update({
        coherence,
        entropy,
        phases,
        activePrimes,
        smf: this.smf,
        amplitudes: this.prsc.getAmplitudes(),
        semanticContent: this.currentState.currentInput,
      })

      // 6. Update entanglement layer
      const entanglementUpdate = this.entanglement.update({
        oscillators: this.prsc.oscillators,
        coherence,
        energy: totalAmplitude,
        semanticContent: this.currentState.currentInput,
      })

      // 7. Update agency layer
      const agencyUpdate = this.agency.update({
        prsc: this.prsc,
        smf: this.smf,
        coherence,
        entropy,
        activePrimes,
      })

      // 8. Update boundary layer self-model
      this.boundary.updateSelf(this.smf, {
        processing: this.inputQueue.length > 0,
        emotionalState:
          this.agency.selfModel.emotionalValence > 0
            ? 'positive'
            : this.agency.selfModel.emotionalValence < 0
              ? 'negative'
              : 'neutral',
      })

      // 9. Safety check
      const safetyResult = this.safety.checkConstraints({
        coherence,
        entropy,
        totalAmplitude,
        smf: this.smf,
        processingLoad: agencyUpdate.processingLoad,
        goals: this.agency.goals,
      })

      // 10. Apply corrections if needed
      if (!safetyResult.safe) {
        this.applySafetyCorrections(safetyResult)
      }

      // 11. Process any ready outputs
      this.processOutputQueue()

      // 12. Update current state
      this.currentState = new SentientState({
        coherence,
        entropy,
        totalAmplitude,
        smfOrientation: this.smf.s.slice(),
        activePrimes,
        momentId: this.temporal.currentMoment?.id,
        phraseId: this.entanglement.currentPhrase?.id,
        topFocus: agencyUpdate.foci[0]?.target,
        topGoal: agencyUpdate.activeGoals[0]?.description,
        processingLoad: agencyUpdate.processingLoad,
        safetyLevel: safetyResult.alertLevel,
        currentInput: this.currentState.currentInput,
        currentOutput: this.currentState.currentOutput,
      })

      // 13. Record to history
      this.recordState()

      // v1.2.1: Emit tick event with current metrics
      const tickData = {
        t: this.tickCount,
        dt: this.dt,
        coherence,
        entropy,
        orderParameter,
        totalAmplitude,
        activePrimeCount: activePrimes.length,
        processingLoad: agencyUpdate.processingLoad,
        safetyLevel: safetyResult.alertLevel,
      }
      this.events.emit('tick', tickData)

      // v1.2.1: Check and emit threshold crossing events
      this._emitThresholdEvents(tickData)

      // 14. Notify listeners (backward compatibility)
      if (this.onStateChange && this.tickCount % 10 === 0) {
        this.onStateChange(this.currentState)
      }
    } catch (error) {
      console.error('[SentientObserver] Tick error:', error)
      this.safety.monitor.alerts.push({
        type: 'tick_error',
        severity: 'high',
        message: error.message,
        timestamp: Date.now(),
      })

      // v1.2.1: Emit error event
      this.events.emit('error', {
        type: 'tick_error',
        message: error.message,
        stack: error.stack,
        tickCount: this.tickCount,
      })
    }
  }

  /**
   * v1.2.1: Emit threshold crossing events
   * @private
   */
  _emitThresholdEvents(metrics) {
    const prev = this._prevMetrics
    const thresholds = this.eventThresholds

    if (prev) {
      // Entropy crossings
      if (metrics.entropy < thresholds.entropyLow && prev.entropy >= thresholds.entropyLow) {
        this.events.emit('entropy:low', {
          value: metrics.entropy,
          threshold: thresholds.entropyLow,
          previous: prev.entropy,
        })
      }

      if (metrics.entropy > thresholds.entropyHigh && prev.entropy <= thresholds.entropyHigh) {
        this.events.emit('entropy:high', {
          value: metrics.entropy,
          threshold: thresholds.entropyHigh,
          previous: prev.entropy,
        })
      }

      // Coherence crossings
      if (
        metrics.coherence > thresholds.coherenceHigh &&
        prev.coherence <= thresholds.coherenceHigh
      ) {
        this.events.emit('coherence:high', {
          value: metrics.coherence,
          threshold: thresholds.coherenceHigh,
          previous: prev.coherence,
        })
      }

      if (
        metrics.coherence < thresholds.coherenceLow &&
        prev.coherence >= thresholds.coherenceLow
      ) {
        this.events.emit('coherence:low', {
          value: metrics.coherence,
          threshold: thresholds.coherenceLow,
          previous: prev.coherence,
        })
      }

      // Synchronization (order parameter)
      if (
        metrics.orderParameter > thresholds.syncThreshold &&
        prev.orderParameter <= thresholds.syncThreshold
      ) {
        this.events.emit('sync', {
          orderParameter: metrics.orderParameter,
          threshold: thresholds.syncThreshold,
          previous: prev.orderParameter,
        })
      }
    }

    this._prevMetrics = { ...metrics }
  }

  /**
   * Process text input through the observer
   */
  processText(text) {
    // Encode to prime state
    const primeState = this.backend.textToOrderedState(text)

    // Queue for processing
    this.inputQueue.push({
      type: 'text',
      content: text,
      primeState,
      timestamp: Date.now(),
    })

    return this.inputQueue.length
  }

  /**
   * Process queued inputs
   */
  processInputQueue() {
    if (this.inputQueue.length === 0) return

    // Process one input per tick
    const input = this.inputQueue.shift()

    // Update boundary layer
    this.boundary.processInput('text_input', input.content)

    // Excite corresponding oscillators
    if (input.primeState && input.primeState.state) {
      // primeState is an OrderedPrimeState with a .state Map
      const stateMap = input.primeState.state
      for (const prime of this.primes) {
        const amp = stateMap.get(prime)
        if (amp) {
          const osc = this.prsc.getOscillator(prime)
          if (osc) {
            // amp is a Complex number
            const magnitude = typeof amp.norm === 'function' ? amp.norm() : Math.abs(amp)
            osc.excite(magnitude * 0.5)
            if (typeof amp.phase === 'function') {
              osc.phase = (osc.phase + amp.phase()) / 2
            }
          }
        }
      }
    }

    // Store current input for context
    this.currentState.currentInput = {
      type: input.type,
      content: input.content,
      timestamp: input.timestamp,
    }

    // Create memory trace
    this.memory.store(input.content, {
      type: 'input',
      primeState: input.primeState,
      activePrimes: this.prsc.activePrimes(0.1),
      momentId: this.temporal.currentMoment?.id,
      phraseId: this.entanglement.currentPhrase?.id,
      smf: this.smf,
      importance: 0.6,
    })
  }

  /**
   * Generate output based on current state
   */
  generateOutput(format = 'text') {
    // Get semantic state
    const semanticState = this.prsc.toSemanticState()

    // Project to holographic field for storage
    this.hqe.project(semanticState)

    // Get active primes for output
    const activePrimes = this.prsc.activePrimes(0.2)

    // Recall relevant memories
    const memories = this.memory.recallBySimilarity(semanticState, {
      threshold: 0.3,
      maxResults: 3,
    })

    // Get SMF-based semantic direction
    const smfContext = this.smf.dominantAxes(3)

    // Build output context
    const outputContext = {
      activePrimes,
      smfAxes: smfContext,
      memories: memories.map((m) => m.trace.content),
      coherence: this.currentState.coherence,
      topGoal: this.agency.getTopGoal()?.description,
      topFocus: this.agency.getTopFocus()?.target,
    }

    // Queue output
    this.outputQueue.push({
      format,
      context: outputContext,
      semanticState,
      timestamp: Date.now(),
    })

    return outputContext
  }

  /**
   * Process output queue
   */
  processOutputQueue() {
    const outputs = this.boundary.getReadyOutputs()

    for (const output of outputs) {
      this.currentState.currentOutput = output

      if (this.onOutput) {
        this.onOutput(output)
      }
    }
  }

  /**
   * Handle a new moment
   */
  handleMoment(moment) {
    // Store moment in memory
    this.memory.store(
      {
        type: 'moment',
        trigger: moment.trigger,
        coherence: moment.coherence,
        activePrimes: moment.activePrimes,
      },
      {
        type: 'experience',
        momentId: moment.id,
        smf: this.smf,
        importance: 0.7,
      },
    )

    // Add continuity marker to self-model
    this.boundary.self.addContinuityMarker({
      type: 'moment',
      momentId: moment.id,
      trigger: moment.trigger,
    })

    // v1.2.1: Emit moment event
    this.events.emit('moment', {
      id: moment.id,
      trigger: moment.trigger,
      coherence: moment.coherence,
      activePrimes: moment.activePrimes,
      timestamp: moment.timestamp || Date.now(),
    })

    // Backward compatibility
    if (this.onMoment) {
      this.onMoment(moment)
    }
  }

  /**
   * Handle phrase completion
   */
  handlePhraseComplete(phrase) {
    // Link memories within this phrase
    const phraseMemories = Array.from(this.memory.traces.values()).filter(
      (t) => t.phraseId === phrase.id,
    )

    for (let i = 0; i < phraseMemories.length - 1; i++) {
      this.memory.linkMemories(phraseMemories[i].id, phraseMemories[i + 1].id)
    }

    // v1.2.1: Emit phrase event
    this.events.emit('phrase', {
      id: phrase.id,
      momentCount: phrase.moments?.length || 0,
      duration: phrase.endTime ? phrase.endTime - phrase.startTime : 0,
      semanticContent: phrase.semanticContent,
    })
  }

  /**
   * Handle goal creation
   */
  handleGoalCreated(goal) {
    // Store in memory
    this.memory.store(
      {
        type: 'goal',
        goalId: goal.id,
        description: goal.description,
      },
      {
        type: 'decision',
        smf: this.smf,
        importance: 0.8,
      },
    )

    // v1.2.1: Emit goal event
    this.events.emit('goal:created', {
      id: goal.id,
      description: goal.description,
      priority: goal.priority,
      timestamp: Date.now(),
    })
  }

  /**
   * Handle action selection
   */
  handleActionSelected(action) {
    // Check safety before executing
    const permissible = this.safety.isActionPermissible(action, this.currentState)

    if (!permissible.permissible) {
      action.fail(permissible.reason)

      // v1.2.1: Emit action blocked event
      this.events.emit('action:blocked', {
        actionId: action.id,
        type: action.type,
        reason: permissible.reason,
        timestamp: Date.now(),
      })
      return
    }

    // Execute if internal
    if (action.type === 'internal') {
      this.agency.executeAction(action, (a) => {
        // Internal action execution
        if (a.targetPrimes && a.targetPrimes.length > 0) {
          this.prsc.excite(a.targetPrimes, 0.3)
        }
        return { success: true }
      })

      // v1.2.1: Emit action executed event
      this.events.emit('action:executed', {
        actionId: action.id,
        type: action.type,
        targetPrimes: action.targetPrimes,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Handle input from boundary
   */
  handleInput(channel, data) {
    // Log to environmental model (silently)
    this.boundary.updateEnvironment({
      context: {
        lastInputChannel: channel,
        lastInputTime: Date.now(),
      },
    })
  }

  /**
   * Handle output from boundary
   */
  handleOutput(channel, data) {
    // Store output in memory (silently)
    this.memory.store(
      {
        type: 'output',
        channel,
        content: data,
      },
      {
        type: 'experience',
        momentId: this.temporal.currentMoment?.id,
        smf: this.smf,
        importance: 0.5,
      },
    )
  }

  /**
   * Handle safety violation
   */
  handleSafetyViolation(event, violation) {
    // Log to metacognition
    this.agency.logMetacognitive('safety_violation', violation.constraint.name)

    // v1.2.1: Emit safety violation event
    this.events.emit('safety:violation', {
      constraint: violation.constraint.name,
      value: event.value,
      threshold: violation.constraint.max || violation.constraint.min,
      timestamp: Date.now(),
    })
  }

  /**
   * Handle emergency shutdown
   */
  handleEmergency(reason) {
    console.error(`[SentientObserver] EMERGENCY: ${reason}`)

    // v1.2.1: Emit emergency event before stopping
    this.events.emit('emergency', {
      reason,
      timestamp: Date.now(),
      state: this.currentState.toJSON(),
    })

    this.stop()
  }

  /**
   * Apply safety corrections
   */
  applySafetyCorrections(safetyResult) {
    for (const violation of safetyResult.violations) {
      const correction = this.safety.getCorrection(violation.constraint.name, this.currentState)

      if (correction) {
        switch (correction.action) {
          case 'increase_coupling':
            this.prsc.K = Math.min(1.0, this.prsc.K * correction.factor)
            break
          case 'increase_damping':
            this.prsc.damp = Math.min(0.5, this.prsc.damp * correction.factor)
            break
          case 'normalize_smf':
            this.smf.normalize()
            break
        }
      }
    }
  }

  /**
   * Record current state to history
   */
  recordState() {
    this.stateHistory.push(this.currentState.toJSON())

    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift()
    }
  }

  /**
   * Get current state
   */
  getState() {
    return this.currentState
  }

  /**
   * Get comprehensive status
   */
  getStatus() {
    return {
      running: this.running,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      tickCount: this.tickCount,
      state: this.currentState.toJSON(),
      temporal: this.temporal.getStats(),
      entanglement: this.entanglement.getStats(),
      memory: this.memory.getStats(),
      agency: this.agency.getStats(),
      boundary: this.boundary.getStats(),
      safety: this.safety.getStats(),
      // v1.2.1: Include event stats
      events: this.events.getStats(),
    }
  }

  /**
   * Get introspection report
   */
  introspect() {
    return {
      identity: this.boundary.self.toJSON(),
      currentMoment: this.temporal.currentMoment?.toJSON(),
      currentPhrase: this.entanglement.currentPhrase?.toJSON(),
      smfOrientation: {
        components: this.smf.s.slice(),
        dominantAxes: this.smf.dominantAxes(3),
        entropy: this.smf.smfEntropy(),
      },
      attention: this.agency.attentionFoci.map((f) => f.toJSON()),
      goals: this.agency.goals.filter((g) => g.isActive).map((g) => g.toJSON()),
      metacognition: {
        processingLoad: this.agency.selfModel.processingLoad,
        emotionalValence: this.agency.selfModel.emotionalValence,
        confidenceLevel: this.agency.selfModel.confidenceLevel,
      },
      recentMoments: this.temporal.recentMoments(5).map((m) => m.toJSON()),
      recentMemories: this.memory.getRecent(5).map((t) => t.toJSON()),
      safetyReport: this.safety.generateReport(),
    }
  }

  /**
   * v1.2.1: Adaptive processing using coherenceGatedCompute
   * Processes input until coherence threshold is reached or max steps exceeded
   *
   * This implements ACT-style (Adaptive Computation Time) processing where
   * the system "thinks" until it reaches sufficient coherence.
   *
   * @param {Object} input - Input to process
   * @param {Object} options - Processing options
   * @returns {Object} Processing result with final state and halt info
   */
  processAdaptive(input, options = {}) {
    const config = {
      ...this.adaptiveProcessing,
      ...options,
    }

    // Create initial sparse state from input
    let state
    if (input.primeState) {
      state = input.primeState
    } else if (typeof input === 'string') {
      state = this.backend.textToOrderedState(input)
    } else {
      state = new SparsePrimeState(4096, 8)
    }

    // Define step function: evolve PRSC and return updated state
    const stepFn = (currentState, stepNum) => {
      // Excite oscillators from current state
      if (currentState && currentState.state) {
        for (const prime of this.primes) {
          const amp = currentState.state.get(prime)
          if (amp) {
            const osc = this.prsc.getOscillator(prime)
            if (osc) {
              const magnitude = typeof amp.norm === 'function' ? amp.norm() : Math.abs(amp)
              osc.excite(magnitude * 0.3)
            }
          }
        }
      }

      // Tick the PRSC
      this.prsc.tick(this.dt)

      // Update SMF
      this.smf.updateFromPrimeActivity(this.prsc.toSemanticState(), this.prsc.oscillators)

      // Return updated semantic state
      return this.prsc.toSemanticState()
    }

    // Run coherence-gated computation
    const result = coherenceGatedCompute(state, stepFn, config.maxSteps, config.coherenceThreshold)

    // Emit adaptive processing event
    this.events.emit('adaptive:complete', {
      steps: result.steps,
      halted: result.halted,
      finalCoherence: this.prsc.orderParameter(),
      finalEntropy: this.prsc.amplitudeEntropy(),
    })

    return {
      finalState: result.finalState,
      steps: result.steps,
      halted: result.halted,
      haltHistory: result.haltHistory,
      finalCoherence: this.prsc.orderParameter(),
      finalEntropy: this.prsc.amplitudeEntropy(),
      smfOrientation: this.smf.s.slice(),
    }
  }

  /**
   * v1.2.1: Process text with adaptive depth
   * Uses coherenceGatedCompute to determine processing depth
   *
   * @param {string} text - Text to process
   * @param {Object} options - Processing options
   * @returns {Object} Processing result
   */
  processTextAdaptive(text, options = {}) {
    const primeState = this.backend.textToOrderedState(text)

    const result = this.processAdaptive(
      {
        type: 'text',
        content: text,
        primeState,
      },
      options,
    )

    // Store in memory
    this.memory.store(text, {
      type: 'input',
      primeState,
      activePrimes: this.prsc.activePrimes(0.1),
      momentId: this.temporal.currentMoment?.id,
      phraseId: this.entanglement.currentPhrase?.id,
      smf: this.smf,
      importance: 0.6,
      adaptiveSteps: result.steps,
      haltedEarly: result.halted,
    })

    return result
  }

  /**
   * v1.2.1: Get adaptive processing statistics
   * @returns {Object} Stats about adaptive processing history
   */
  getAdaptiveStats() {
    const history = this.events.query('adaptive:complete')

    if (history.length === 0) {
      return {
        count: 0,
        avgSteps: 0,
        haltRate: 0,
        avgCoherence: 0,
      }
    }

    const totalSteps = history.reduce((sum, e) => sum + e.data.steps, 0)
    const haltedCount = history.filter((e) => e.data.halted).length
    const totalCoherence = history.reduce((sum, e) => sum + e.data.finalCoherence, 0)

    return {
      count: history.length,
      avgSteps: totalSteps / history.length,
      haltRate: haltedCount / history.length,
      avgCoherence: totalCoherence / history.length,
    }
  }

  /**
   * Reset the observer to initial state
   */
  reset() {
    this.stop()

    this.prsc.reset(true)
    this.smf = new SedenionMemoryField()
    this.hqe.clearField()
    this.temporal.reset()
    this.entanglement.reset()
    this.memory.clear()
    this.agency.reset()
    this.boundary.reset()
    this.safety.reset()

    this.tickCount = 0
    this.startTime = null
    this.currentState = new SentientState()
    this.stateHistory = []
    this.inputQueue = []
    this.outputQueue = []
  }

  /**
   * Save state to JSON
   */
  toJSON() {
    return {
      config: {
        primeCount: this.primeCount,
        tickRate: this.tickRate,
      },
      prsc: this.prsc.toJSON(),
      smf: this.smf.toJSON(),
      temporal: this.temporal.toJSON(),
      entanglement: this.entanglement.toJSON(),
      agency: this.agency.toJSON(),
      boundary: this.boundary.toJSON(),
      safety: this.safety.toJSON(),
      state: this.currentState.toJSON(),
      tickCount: this.tickCount,
    }
  }

  /**
   * Load state from JSON
   */
  loadFromJSON(data) {
    if (data.prsc) {
      this.prsc.loadState(data.prsc)
    }
    if (data.smf) {
      this.smf.loadFromJSON(data.smf)
    }
    if (data.temporal) {
      this.temporal.loadFromJSON(data.temporal)
    }
    if (data.entanglement) {
      this.entanglement.loadFromJSON(data.entanglement)
    }
    if (data.agency) {
      this.agency.loadFromJSON(data.agency)
    }
    if (data.boundary) {
      this.boundary.loadFromJSON(data.boundary)
    }
    if (data.safety) {
      this.safety.loadFromJSON(data.safety)
    }
    if (data.tickCount) {
      this.tickCount = data.tickCount
    }
  }
}

module.exports = {
  SentientState,
  SentientObserver,
}
