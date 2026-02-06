/**
 * SRIA Engine - Summonable Resonant Intelligent Agent
 *
 * Core engine for agent lifecycle management with prime-based memory,
 * free energy minimization, and multi-layer perception.
 *
 * @module lib/sria/engine
 */

const crypto = require('crypto')
const EventEmitter = require('events')
const {
  SummonableLayer,
  LAYER_CONFIGS,
  LIGHT_GUIDE_TEMPLATE,
  DEFAULT_PERCEPTION_CONFIG,
  DEFAULT_GOAL_PRIORS,
  DEFAULT_ATTRACTOR_BIASES,
  DEFAULT_COLLAPSE_DYNAMICS,
  DEFAULT_QUARANTINE_ZONES,
} = require('./types')
const {
  LifecycleState,
  LifecycleEventType,
  initializeAttention,
  computeAwakening,
  perceiveMultiLayer,
  decide,
  learn,
  consolidate,
  transition,
} = require('./lifecycle')

/**
 * SRIA Engine class
 * Manages the complete lifecycle of a Summonable Resonant Intelligent Agent
 *
 * @extends EventEmitter
 */
class SRIAEngine extends EventEmitter {
  /**
   * Create a new SRIA Engine
   * @param {Object} options - Engine options
   * @param {number[]} [options.bodyPrimes] - Prime number address space
   * @param {string} [options.name] - Agent name
   * @param {Object} [options.perceptionConfig] - Perception configuration
   * @param {Object[]} [options.goalPriors] - Goal prior configuration
   * @param {Object} [options.attractorBiases] - Attractor bias configuration
   * @param {Object} [options.collapseDynamics] - Collapse dynamics configuration
   * @param {Object} [options.quarantineZones] - Quarantine zone configuration
   * @param {Object[]} [options.safetyConstraints] - Safety constraints
   */
  constructor(options = {}) {
    super()

    // Initialize body primes (agent identity)
    this.bodyPrimes = options.bodyPrimes || [...LIGHT_GUIDE_TEMPLATE.bodyPrimes]
    this.name = options.name || 'unnamed_sria'

    // Memory phases per prime
    this.memoryPhases = {}
    for (const prime of this.bodyPrimes) {
      this.memoryPhases[prime] = []
    }

    // Quaternion state (4D agent state representation)
    this.quaternionState = { w: 1, x: 0, y: 0, z: 0 }

    // Perception and decision configuration
    this.perceptionConfig = options.perceptionConfig || { ...DEFAULT_PERCEPTION_CONFIG }
    this.goalPriors = options.goalPriors || [...DEFAULT_GOAL_PRIORS]
    this.attractorBiases = options.attractorBiases || { ...DEFAULT_ATTRACTOR_BIASES }
    this.collapseDynamics = options.collapseDynamics || { ...DEFAULT_COLLAPSE_DYNAMICS }
    this.quarantineZones = options.quarantineZones || { ...DEFAULT_QUARANTINE_ZONES }
    this.safetyConstraints = options.safetyConstraints || []

    // Current epoch (learning cycle)
    this.currentEpoch = 0

    // Current lifecycle state
    this.lifecycleState = LifecycleState.DORMANT

    // Active session
    this.session = null

    // Beacon history
    this.beacons = []

    // Layer activation cache
    this.layerCache = new Map()
  }

  /**
   * Generate body hash from primes
   * @returns {string} Body hash
   */
  generateBodyHash() {
    const data = this.bodyPrimes.join(':')
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16)
  }

  /**
   * Compute resonance key from observation
   * @param {string} observation - Input observation
   * @returns {Object} Resonance key with primes and hash
   */
  computeResonanceKey(observation) {
    // Extract ASCII values and find prime factors
    const values = []
    for (let i = 0; i < Math.min(observation.length, 100); i++) {
      values.push(observation.charCodeAt(i))
    }

    // Generate primes from observation
    const primes = []
    const hash = crypto.createHash('sha256').update(observation).digest('hex')

    for (let i = 0; i < 5; i++) {
      const num = parseInt(hash.slice(i * 4, i * 4 + 4), 16)
      const prime = this._findNearestPrime(num % 1000)
      primes.push(prime)
    }

    return {
      primes,
      hash: hash.slice(0, 16),
      timestamp: Date.now(),
    }
  }

  /**
   * Find nearest prime to a number
   * @private
   * @param {number} n - Number to find prime near
   * @returns {number} Nearest prime
   */
  _findNearestPrime(n) {
    if (n < 2) return 2

    const isPrime = (num) => {
      if (num < 2) return false
      if (num === 2) return true
      if (num % 2 === 0) return false
      for (let i = 3; i <= Math.sqrt(num); i += 2) {
        if (num % i === 0) return false
      }
      return true
    }

    if (isPrime(n)) return n

    let lower = n - 1
    let upper = n + 1

    while (true) {
      if (lower > 1 && isPrime(lower)) return lower
      if (isPrime(upper)) return upper
      lower--
      upper++
    }
  }

  /**
   * Verify resonance between key and body
   * @param {Object} resonanceKey - Resonance key
   * @returns {Object} Verification result
   */
  verifyResonance(resonanceKey) {
    const intersection = this.bodyPrimes.filter((p) => resonanceKey.primes.includes(p))
    const union = new Set([...this.bodyPrimes, ...resonanceKey.primes])
    const strength = intersection.length / union.size

    return {
      verified: strength >= 0.1,
      strength,
      matchingPrimes: intersection,
      alignment: intersection.length / this.bodyPrimes.length,
    }
  }

  /**
   * Encode a percept using body primes
   * @param {string} observation - Raw observation
   * @param {number[]} [primes] - Primes to use for encoding
   * @returns {Object} Encoded percept
   */
  encodePercept(observation, primes = null) {
    const usePrimes = primes || this.bodyPrimes.slice(0, 5)
    const phases = []

    // Compute hash for stable encoding
    const hash = crypto.createHash('sha256').update(observation).digest('hex')

    for (let i = 0; i < usePrimes.length; i++) {
      const prime = usePrimes[i]
      const hashSegment = parseInt(hash.slice(i * 4, i * 4 + 4), 16)
      const phase = ((hashSegment % (prime * 100)) / (prime * 100)) * 2 * Math.PI
      phases.push(phase)
    }

    // Compute magnitude from observation properties
    const magnitude =
      Math.min(1, observation.length / 500) *
      (1 + 0.1 * Math.sin(phases.reduce((a, b) => a + b, 0)))

    return {
      raw: observation,
      timestamp: Date.now(),
      encoded: {
        primes: usePrimes,
        phases,
        magnitude,
      },
    }
  }

  /**
   * Update beliefs based on new evidence
   * @param {Object[]} currentBeliefs - Current belief state
   * @param {Object} percept - New percept
   * @param {Object} evidence - Evidence object
   * @returns {Object[]} Updated beliefs
   */
  updateBeliefs(currentBeliefs, percept, evidence) {
    const updated = currentBeliefs.map((belief) => {
      // Compute likelihood based on prime overlap
      const perceptPrimes = percept.encoded.primes
      const beliefPrimes = belief.primeFactors || []
      const overlap = beliefPrimes.filter((p) => perceptPrimes.includes(p)).length
      const likelihood = overlap / Math.max(beliefPrimes.length, 1) + 0.1

      // Bayesian update
      const newProbability = belief.probability * likelihood

      // Entropy update based on magnitude
      const newEntropy = belief.entropy * (1 - percept.encoded.magnitude * 0.1)

      return {
        ...belief,
        probability: newProbability,
        entropy: Math.max(0.01, newEntropy),
      }
    })

    // Normalize probabilities
    const total = updated.reduce((sum, b) => sum + b.probability, 0)
    return updated.map((b) => ({
      ...b,
      probability: b.probability / (total || 1),
    }))
  }

  /**
   * Minimize free energy (core decision algorithm)
   * @param {Object[]} beliefs - Current beliefs
   * @param {Object} percept - Current percept
   * @param {Object[]} possibleActions - Available actions
   * @returns {Object} Free energy result
   */
  minimizeFreeEnergy(beliefs, percept, possibleActions) {
    return decide(beliefs, percept, this, possibleActions)
  }

  /**
   * Summon a layer
   * @param {string} layer - Layer to summon
   * @returns {Object} Layer activation result
   */
  summonLayer(layer) {
    if (!Object.values(SummonableLayer).includes(layer)) {
      throw new Error(`Unknown layer: ${layer}`)
    }

    const config = LAYER_CONFIGS[layer]

    // Check cache
    if (this.layerCache.has(layer)) {
      const cached = this.layerCache.get(layer)
      if (Date.now() - cached.timestamp < 60000) {
        return { ...cached, fromCache: true }
      }
    }

    // Compute layer activation
    const activation = {
      layer,
      config,
      timestamp: Date.now(),
      bodyAlignment:
        this.bodyPrimes.reduce(
          (sum, p) =>
            sum + ((p + config.primeOffset) % config.phaseMultiplier) / config.phaseMultiplier,
          0,
        ) / this.bodyPrimes.length,
      entropyContribution: config.entropyWeight * this.quaternionState.w,
      fromCache: false,
    }

    this.layerCache.set(layer, activation)
    this.emit('layer_summoned', activation)

    return activation
  }

  /**
   * Generate beacon fingerprint
   * @returns {Object} Beacon
   */
  generateBeaconFingerprint() {
    const data = JSON.stringify({
      bodyPrimes: this.bodyPrimes,
      epoch: this.currentEpoch,
      quaternion: this.quaternionState,
      memoryPhaseCounts: Object.fromEntries(
        Object.entries(this.memoryPhases).map(([k, v]) => [k, v.length]),
      ),
    })

    const hash = crypto.createHash('sha256').update(data).digest('hex')

    const beacon = {
      fingerprint: `beacon_${this.currentEpoch}_${hash.slice(0, 12)}`,
      epoch: this.currentEpoch,
      timestamp: Date.now(),
      bodyHash: this.generateBodyHash(),
      signature: hash.slice(0, 32),
    }

    this.beacons.push(beacon)

    return beacon
  }

  /**
   * Summon the agent (initialize session)
   * @param {Object} [options] - Summon options
   * @returns {Object} Summon result
   */
  summon(options = {}) {
    if (this.lifecycleState !== LifecycleState.DORMANT) {
      return {
        success: false,
        error: `Cannot summon from state: ${this.lifecycleState}`,
      }
    }

    this.lifecycleState = transition({ state: this.lifecycleState }, 'summon')

    // Generate resonance key from options or use default
    const resonanceKey =
      options.resonanceKey || this.computeResonanceKey(options.initialContext || 'awakening')

    // Compute awakening
    const awakening = computeAwakening(this, resonanceKey.primes)

    if (!awakening.success) {
      this.lifecycleState = LifecycleState.DORMANT
      return {
        success: false,
        error: 'Resonance verification failed',
        resonanceStrength: awakening.resonanceStrength,
      }
    }

    // Initialize session
    this.session = {
      id: crypto.randomUUID(),
      summonedAt: new Date().toISOString(),
      currentBeliefs: awakening.initialBeliefs,
      attention: initializeAttention(this),
      entropyTrajectory: [],
      actionHistory: [],
      freeEnergy: 1.0,
    }

    this.lifecycleState = LifecycleState.PERCEIVING

    this.emit('summoned', {
      sessionId: this.session.id,
      resonanceStrength: awakening.resonanceStrength,
      activeLayers: awakening.activeLayers,
    })

    return {
      success: true,
      sessionId: this.session.id,
      resonanceStrength: awakening.resonanceStrength,
      initialBeliefs: awakening.initialBeliefs,
    }
  }

  /**
   * Execute one full step: Perceive → Decide → Act → Learn
   * @param {string} observation - Input observation
   * @param {Object[]} possibleActions - Available actions
   * @returns {Object} Step result
   */
  fullStep(observation, possibleActions) {
    if (!this.session) {
      return { success: false, error: 'Agent not summoned' }
    }

    // === PERCEIVE ===
    this.lifecycleState = LifecycleState.PERCEIVING

    const perception = perceiveMultiLayer(
      observation,
      this,
      this.session.attention,
      (obs, primes) => this.encodePercept(obs, primes),
    )

    // Update attention
    this.session.attention = perception.attentionUpdate

    // Track entropy
    this.session.entropyTrajectory.push(perception.entropyEstimate)

    this.emit('perceived', {
      dominantLayer: perception.dominantLayer,
      entropy: perception.entropyEstimate,
    })

    // === DECIDE ===
    this.lifecycleState = LifecycleState.DECIDING

    const decision = this.minimizeFreeEnergy(
      this.session.currentBeliefs,
      perception.aggregatedPercept,
      possibleActions,
    )

    this.emit('decided', {
      action: decision.selectedAction,
      freeEnergy: decision.freeEnergy.value,
    })

    // === ACT ===
    this.lifecycleState = LifecycleState.ACTING

    const actionResult = {
      action: decision.selectedAction,
      timestamp: Date.now(),
      success: true, // Actual execution would happen here
    }

    this.session.actionHistory.push(actionResult)

    this.emit('acted', actionResult)

    // === LEARN ===
    this.lifecycleState = LifecycleState.LEARNING

    const learning = learn(
      this,
      this.session,
      perception.aggregatedPercept,
      actionResult,
      decision.freeEnergy,
    )

    // Apply learning updates
    this.memoryPhases = learning.memoryPhaseUpdates
    this.quaternionState = learning.newQuaternionState
    this.session.currentBeliefs = learning.consolidatedBeliefs
    this.session.freeEnergy = decision.freeEnergy.value

    if (learning.epochAdvance) {
      this.currentEpoch++
      this.emit('epoch_advanced', { epoch: this.currentEpoch })
    }

    this.emit('learned', {
      quaternionDelta: learning.quaternionDelta,
      epochAdvance: learning.epochAdvance,
    })

    // Return to perceiving
    this.lifecycleState = LifecycleState.PERCEIVING

    return {
      success: true,
      perception: {
        dominantLayer: perception.dominantLayer,
        entropy: perception.entropyEstimate,
      },
      decision: {
        action: decision.selectedAction,
        alternatives: decision.alternativeActions,
        freeEnergy: decision.freeEnergy.value,
      },
      learning: {
        quaternionDelta: learning.quaternionDelta,
        epochAdvance: learning.epochAdvance,
        beliefCount: learning.consolidatedBeliefs.length,
      },
    }
  }

  /**
   * Dismiss the agent (end session)
   * @returns {Object} Dismiss result
   */
  dismiss() {
    if (!this.session) {
      return { success: false, error: 'Agent not summoned' }
    }

    // === CONSOLIDATE ===
    this.lifecycleState = LifecycleState.CONSOLIDATING

    const consolidation = consolidate(this, this.session)

    this.emit('consolidating', consolidation)

    // === SLEEP ===
    this.lifecycleState = LifecycleState.SLEEPING

    // Generate final beacon
    const beacon = this.generateBeaconFingerprint()

    this.emit('beacon', beacon)

    // Store session summary
    const sessionSummary = {
      id: this.session.id,
      duration: consolidation.sessionDuration,
      actionCount: this.session.actionHistory.length,
      entropyReduction: consolidation.memorySummary.entropyReduction,
      finalBeliefs: consolidation.finalBeliefs,
      beacon,
    }

    // Clear session
    this.session = null
    this.lifecycleState = LifecycleState.DORMANT

    this.emit('dismissed', sessionSummary)

    return {
      success: true,
      ...sessionSummary,
    }
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return {
      name: this.name,
      bodyPrimes: this.bodyPrimes,
      bodyHash: this.generateBodyHash(),
      quaternionState: this.quaternionState,
      lifecycleState: this.lifecycleState,
      currentEpoch: this.currentEpoch,
      session: this.session
        ? {
            id: this.session.id,
            summonedAt: this.session.summonedAt,
            beliefCount: this.session.currentBeliefs.length,
            actionCount: this.session.actionHistory.length,
            currentEntropy: this.session.entropyTrajectory.slice(-1)[0] || 0,
          }
        : null,
      beaconCount: this.beacons.length,
    }
  }

  /**
   * Serialize the engine state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      name: this.name,
      bodyPrimes: this.bodyPrimes,
      memoryPhases: this.memoryPhases,
      quaternionState: this.quaternionState,
      perceptionConfig: this.perceptionConfig,
      goalPriors: this.goalPriors,
      attractorBiases: this.attractorBiases,
      collapseDynamics: this.collapseDynamics,
      quarantineZones: this.quarantineZones,
      safetyConstraints: this.safetyConstraints,
      currentEpoch: this.currentEpoch,
      beacons: this.beacons,
    }
  }

  /**
   * Create engine from serialized state
   * @param {Object} data - Serialized state
   * @returns {SRIAEngine} Engine instance
   */
  static deserialize(data) {
    const engine = new SRIAEngine({
      name: data.name,
      bodyPrimes: data.bodyPrimes,
      perceptionConfig: data.perceptionConfig,
      goalPriors: data.goalPriors,
      attractorBiases: data.attractorBiases,
      collapseDynamics: data.collapseDynamics,
      quarantineZones: data.quarantineZones,
      safetyConstraints: data.safetyConstraints,
    })

    engine.memoryPhases = data.memoryPhases || {}
    engine.quaternionState = data.quaternionState || { w: 1, x: 0, y: 0, z: 0 }
    engine.currentEpoch = data.currentEpoch || 0
    engine.beacons = data.beacons || []

    return engine
  }
}

module.exports = {
  SRIAEngine,
}
