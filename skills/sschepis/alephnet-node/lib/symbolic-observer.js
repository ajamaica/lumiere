/**
 * Symbolic Observer Extension
 *
 * Extends SentientObserver with symbolic processing capabilities
 * from tinyaleph 1.3.0:
 * - SemanticInference for entity extraction
 * - SymbolDatabase for symbol recognition
 * - SymbolicSMF for grounded semantic orientation
 * - SymbolicTemporalLayer for I-Ching moment classification
 * - Narrative detection for archetypal pattern recognition
 */

const { SentientObserver, SentientState } = require('./sentient-core')
const { SymbolicSMF, SMFSymbolMapper, AXIS_SYMBOL_MAPPING } = require('./symbolic-smf')
const {
  SymbolicTemporalLayer,
  SymbolicMoment,
  SymbolicPatternDetector,
  HEXAGRAM_ARCHETYPES,
} = require('./symbolic-temporal')
const { SedenionMemoryField } = require('./smf')
const { TemporalLayer, TemporalPatternDetector } = require('./temporal')

// Import from @aleph-ai/tinyaleph npm package
const tinyaleph = require('@aleph-ai/tinyaleph')

// symbolDatabase - use from tinyaleph or stub
const symbolDatabase = tinyaleph.symbolDatabase || {
  getSymbol: (id) => null,
  getSymbolsByTag: (tag) => [],
  getSymbolByPrime: (prime) => null,
  search: (query) => [],
  getById: (id) => null,
}

// SemanticInference stub
class SemanticInference {
  constructor(symbolDb) {
    this.symbolDb = symbolDb
  }

  inferSymbol(name) {
    const symbol = this.symbolDb.getSymbol(name)
    if (symbol) {
      return { method: 'exact', symbol, confidence: 1.0 }
    }
    return null
  }

  inferFromPrimes(primes, options = {}) {
    return []
  }
}

// EntityExtractor stub
class EntityExtractor {
  extract(text) {
    return []
  }
}

// CompoundBuilder stub
class CompoundBuilder {
  constructor(symbolDb) {
    this.symbolDb = symbolDb
  }

  createCompound(id, symbolIds, meaning, culturalTags) {
    const symbols = symbolIds.map((sid) => this.symbolDb?.getSymbol(sid)).filter(Boolean)
    return {
      id,
      components: symbols,
      meaning,
      culturalTags,
      toJSON: function () {
        return { id: this.id, components: this.components.map((s) => s?.id), meaning: this.meaning }
      },
    }
  }

  calculateCompoundResonance(compound) {
    return 0.5 // Default resonance
  }
}

const compoundBuilder = new CompoundBuilder(symbolDatabase)

// ResonanceCalculator - use tinyaleph's primeResonance or stub
class ResonanceCalculator {
  calculateResonance(prime1, prime2) {
    if (tinyaleph.primeResonance) {
      return tinyaleph.primeResonance(prime1, prime2)
    }
    // GCD-based resonance fallback
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))
    return gcd(prime1, prime2) > 1 ? 0.5 : 0.2
  }
}

// OBSERVER_HIERARCHY - use from tinyaleph or create default
const OBSERVER_HIERARCHY = tinyaleph.OBSERVER_HIERARCHY || [
  { name: 'Quantum', scale: 1e-15 },
  { name: 'Molecular', scale: 1e-9 },
  { name: 'Cellular', scale: 1e-6 },
  { name: 'Neural', scale: 1e-3 },
  { name: 'Cognitive', scale: 1 },
  { name: 'Social', scale: 1e3 },
  { name: 'Ecological', scale: 1e6 },
  { name: 'Planetary', scale: 1e9 },
]

// PHI constant for golden ratio operations
const PHI = (1 + Math.sqrt(5)) / 2

// Fine structure constant inverse for observer capacity
const ALPHA_INVERSE = 137
const ALPHA = 1 / ALPHA_INVERSE

/**
 * Enhanced state with symbolic information
 */
class SymbolicState extends SentientState {
  constructor(data = {}) {
    super(data)

    // Symbolic grounding
    this.groundedSymbols = data.groundedSymbols || []
    this.activeSymbolIds = data.activeSymbolIds || []

    // Moment archetype
    this.hexagramIndex = data.hexagramIndex ?? null
    this.archetypeName = data.archetypeName || null

    // Narrative context
    this.narrativePhase = data.narrativePhase || null
    this.dominantArchetypes = data.dominantArchetypes || []

    // Resonance metrics
    this.phiResonance = data.phiResonance || 0
    this.symbolicCoherence = data.symbolicCoherence || 0
  }

  toJSON() {
    return {
      ...super.toJSON(),
      groundedSymbols: this.groundedSymbols,
      activeSymbolIds: this.activeSymbolIds,
      hexagramIndex: this.hexagramIndex,
      archetypeName: this.archetypeName,
      narrativePhase: this.narrativePhase,
      dominantArchetypes: this.dominantArchetypes,
      phiResonance: this.phiResonance,
      symbolicCoherence: this.symbolicCoherence,
    }
  }
}

/**
 * Symbolic Observer - Extended SentientObserver with symbolic grounding
 */
class SymbolicObserver extends SentientObserver {
  constructor(backend, options = {}) {
    super(backend, options)

    // Symbol database (singleton)
    this.symbolDb = symbolDatabase

    // Semantic inference engine
    this.inference = new SemanticInference(this.symbolDb)

    // Entity extractor for text analysis
    this.entityExtractor = new EntityExtractor()

    // Compound builder for complex concepts (includes goal compounds)
    this.compoundBuilder = compoundBuilder

    // Resonance calculator for PHI-based operations
    this.resonanceCalc = new ResonanceCalculator()

    // Golden ratio parameters for fusions
    this.phi = PHI
    this.goldenFusionThreshold = options.goldenFusionThreshold || 0.618

    // Goal compounds (using CompoundBuilder)
    this.activeGoals = []
    this.goalHistory = []

    // Replace SMF with SymbolicSMF
    this.smf = new SymbolicSMF(this.symbolDb)
    this.smfMapper = new SMFSymbolMapper(this.symbolDb)

    // Replace temporal layer with SymbolicTemporalLayer
    this.temporal = new SymbolicTemporalLayer({
      coherenceThreshold: options.coherenceThreshold || 0.7,
      entropyMin: options.entropyMin || 0.1,
      entropyMax: options.entropyMax || 0.9,
      onMoment: (moment) => this.handleMoment(moment),
      onSymbolicMoment: (moment, classification) =>
        this.handleSymbolicMoment(moment, classification),
      onHexagramTransition: (transition) => this.handleHexagramTransition(transition),
    })

    // Symbolic pattern detector
    this.symbolicPatternDetector = new SymbolicPatternDetector()

    // Symbol extraction history
    this.extractedSymbols = []
    this.symbolCooccurrence = new Map() // Symbol pair -> count

    // Narrative tracking
    this.narrativeHistory = []
    this.currentNarrative = null

    // Symbolic callbacks
    this.onSymbolExtracted = options.onSymbolExtracted || null
    this.onNarrativeDetected = options.onNarrativeDetected || null
    this.onArchetypeTransition = options.onArchetypeTransition || null
  }

  /**
   * Enhanced text processing with symbol extraction
   */
  processText(text) {
    // First, do standard text processing
    const primeState = this.backend.textToOrderedState(text)

    // Extract symbols from text using SemanticInference
    const extracted = this.extractSymbols(text)

    // Queue for processing with symbol context
    this.inputQueue.push({
      type: 'text',
      content: text,
      primeState,
      symbols: extracted.symbols,
      inferences: extracted.inferences,
      timestamp: Date.now(),
    })

    return {
      queueLength: this.inputQueue.length,
      extractedSymbols: extracted.symbols.map((s) => s.name),
      inferences: extracted.inferences.map((i) => i.conclusion),
    }
  }

  /**
   * Extract symbols from text using SemanticInference
   */
  extractSymbols(text) {
    // Tokenize and find symbol matches
    const tokens = this.tokenize(text)
    const symbols = []
    const matchedPrimes = []

    for (const token of tokens) {
      // Try exact name match
      let symbol = this.symbolDb.getSymbol(token.toLowerCase())

      if (!symbol) {
        // Try partial match
        const matches = this.symbolDb.search(token.toLowerCase())
        if (matches.length > 0) {
          symbol = matches[0]
        }
      }

      if (symbol) {
        symbols.push({
          ...symbol,
          sourceToken: token,
          position: tokens.indexOf(token),
        })
        matchedPrimes.push(symbol.prime)
      }
    }

    // Run semantic inference on matched symbols
    const inferences = []
    for (const symbol of symbols) {
      const result = this.inference.inferSymbol(symbol.name)
      if (result) {
        inferences.push({
          type: result.method,
          symbol: result.symbol,
          confidence: result.confidence,
          source: symbol.sourceToken,
        })
      }
    }

    // Store for pattern analysis
    this.extractedSymbols.push({
      timestamp: Date.now(),
      text,
      symbols,
      inferences,
    })

    if (this.extractedSymbols.length > 1000) {
      this.extractedSymbols = this.extractedSymbols.slice(-500)
    }

    // Update co-occurrence
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const key = [symbols[i].id, symbols[j].id].sort().join(':')
        this.symbolCooccurrence.set(key, (this.symbolCooccurrence.get(key) || 0) + 1)
      }
    }

    // Emit symbol extraction event
    if (symbols.length > 0) {
      this.events.emit('symbols:extracted', {
        symbols: symbols.map((s) => ({ id: s.id, name: s.name, prime: s.prime })),
        inferences: inferences.map((i) => ({
          type: i.type,
          conclusion: i.conclusion,
          confidence: i.confidence,
        })),
      })

      if (this.onSymbolExtracted) {
        this.onSymbolExtracted(symbols, inferences)
      }
    }

    return { symbols, inferences }
  }

  /**
   * Simple tokenizer
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  }

  /**
   * Enhanced input queue processing
   */
  processInputQueue() {
    if (this.inputQueue.length === 0) return

    const input = this.inputQueue.shift()

    // Update boundary layer
    this.boundary.processInput('text_input', input.content)

    // Excite oscillators from prime state
    if (input.primeState && input.primeState.state) {
      const stateMap = input.primeState.state
      for (const prime of this.primes) {
        const amp = stateMap.get(prime)
        if (amp) {
          const osc = this.prsc.getOscillator(prime)
          if (osc) {
            const magnitude = typeof amp.norm === 'function' ? amp.norm() : Math.abs(amp)
            osc.excite(magnitude * 0.5)
            if (typeof amp.phase === 'function') {
              osc.phase = (osc.phase + amp.phase()) / 2
            }
          }
        }
      }
    }

    // Also excite from extracted symbols (symbol-specific excitation)
    if (input.symbols && input.symbols.length > 0) {
      for (const symbol of input.symbols) {
        // Excite the SMF from the symbol
        this.smf.exciteFromSymbol(symbol.id)

        // Also excite PRSC oscillator for the symbol's prime
        const osc = this.prsc.getOscillator(symbol.prime)
        if (osc) {
          osc.excite(0.4) // Stronger excitation for explicit symbols
        }
      }
    }

    // Store current input with symbol context
    this.currentState.currentInput = {
      type: input.type,
      content: input.content,
      timestamp: input.timestamp,
      symbols: input.symbols?.map((s) => s.name) || [],
      inferences: input.inferences?.map((i) => i.conclusion) || [],
    }

    // Create memory trace with symbolic context
    this.memory.store(input.content, {
      type: 'input',
      primeState: input.primeState,
      activePrimes: this.prsc.activePrimes(0.1),
      momentId: this.temporal.currentMoment?.id,
      phraseId: this.entanglement.currentPhrase?.id,
      smf: this.smf,
      importance: 0.6,
      // Symbolic additions
      symbols: input.symbols?.map((s) => s.id) || [],
      inferences: input.inferences?.map((i) => i.conclusion) || [],
    })
  }

  /**
   * Handle symbolic moment
   */
  handleSymbolicMoment(moment, classification) {
    // Update narrative tracking
    this.updateNarrative(moment, classification)

    // Emit detailed symbolic moment event
    this.events.emit('moment:symbolic', {
      id: moment.id,
      hexagram: classification.hexagramIndex,
      archetype: classification.archetype?.name,
      confidence: classification.confidence,
      phiResonance: moment.phiResonance,
      relatedSymbols: moment.relatedSymbols,
    })
  }

  /**
   * Handle hexagram transition (archetype change)
   */
  handleHexagramTransition(transition) {
    this.events.emit('archetype:transition', {
      from: {
        hexagram: transition.from,
        archetype: transition.fromArchetype?.name,
      },
      to: {
        hexagram: transition.to,
        archetype: transition.toArchetype?.name,
      },
      momentId: transition.moment.id,
    })

    if (this.onArchetypeTransition) {
      this.onArchetypeTransition(transition)
    }
  }

  /**
   * Update narrative tracking from moment sequence
   */
  updateNarrative(moment, classification) {
    if (!classification.archetype) return

    // Check for narrative patterns
    const recentMoments = this.temporal.recentMoments(10)
    const narratives = this.symbolicPatternDetector.detectNarrativePatterns(recentMoments)

    for (const narrative of narratives) {
      if (
        !this.narrativeHistory.find(
          (n) => n.type === narrative.type && n.endIndex === recentMoments.length - 1,
        )
      ) {
        this.narrativeHistory.push({
          ...narrative,
          detectedAt: Date.now(),
          endIndex: recentMoments.length - 1,
        })

        this.events.emit('narrative:detected', narrative)

        if (this.onNarrativeDetected) {
          this.onNarrativeDetected(narrative)
        }
      }
    }

    // Update current narrative phase
    if (narratives.length > 0) {
      this.currentNarrative = narratives[0]
    }

    // Trim narrative history
    if (this.narrativeHistory.length > 100) {
      this.narrativeHistory = this.narrativeHistory.slice(-50)
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // COMPOUND GOALS (#2) - Multi-symbol goal representation
  // ════════════════════════════════════════════════════════════════════

  /**
   * Create a compound goal from multiple symbols
   * Uses CompoundBuilder to create rich goal representations
   * @param {string} goalId - Unique goal identifier
   * @param {Array<string>} symbolIds - Component symbol IDs
   * @param {string} meaning - Goal description
   * @param {Object} options - Additional goal options
   */
  createGoal(goalId, symbolIds, meaning, options = {}) {
    try {
      const compound = this.compoundBuilder.createCompound(
        `goal_${goalId}`,
        symbolIds,
        meaning,
        options.culturalTags || ['goal', 'intention'],
      )

      const goal = {
        id: goalId,
        compound,
        meaning,
        priority: options.priority || 0.5,
        createdAt: Date.now(),
        progress: 0,
        status: 'active',
        resonance: this.compoundBuilder.calculateCompoundResonance(compound),
      }

      this.activeGoals.push(goal)
      this.goalHistory.push({ ...goal, event: 'created' })

      this.events.emit('goal:created', goal)
      return goal
    } catch (e) {
      console.error('Failed to create goal compound:', e.message)
      return null
    }
  }

  /**
   * Get active goals sorted by priority and resonance
   */
  getActiveGoals() {
    return this.activeGoals
      .filter((g) => g.status === 'active')
      .sort((a, b) => {
        // Sort by priority first, then resonance
        const priorityDiff = b.priority - a.priority
        if (Math.abs(priorityDiff) > 0.1) return priorityDiff
        return b.resonance - a.resonance
      })
  }

  /**
   * Update goal progress
   * @param {string} goalId - Goal to update
   * @param {number} progress - Progress value (0-1)
   */
  updateGoalProgress(goalId, progress) {
    const goal = this.activeGoals.find((g) => g.id === goalId)
    if (!goal) return null

    goal.progress = Math.max(0, Math.min(1, progress))

    if (goal.progress >= 1.0) {
      goal.status = 'completed'
      goal.completedAt = Date.now()
      this.goalHistory.push({ ...goal, event: 'completed' })
      this.events.emit('goal:completed', goal)
    }

    return goal
  }

  /**
   * Find goals resonant with current state
   */
  findResonantGoals() {
    const activePrimes = this.prsc.activePrimes(0.1)

    return this.activeGoals
      .filter((g) => g.status === 'active')
      .map((goal) => {
        // Calculate resonance between current primes and goal primes
        const goalPrimes = goal.compound.components.map((c) => c.prime)
        let resonance = 0

        for (const p1 of activePrimes) {
          for (const p2 of goalPrimes) {
            resonance += this.resonanceCalc.calculateResonance(p1, p2)
          }
        }

        return {
          goal,
          currentResonance: resonance / (activePrimes.length * goalPrimes.length || 1),
        }
      })
      .sort((a, b) => b.currentResonance - a.currentResonance)
  }

  // ════════════════════════════════════════════════════════════════════
  // GOLDEN RATIO FUSIONS (#5) - PHI-harmonic state combinations
  // ════════════════════════════════════════════════════════════════════

  /**
   * Fuse two symbol states using golden ratio weighting
   * Creates harmonically optimal combinations
   * @param {Object} symbol1 - First symbol
   * @param {Object} symbol2 - Second symbol
   * @returns {Object} Fused result with resonance metrics
   */
  goldenFusion(symbol1, symbol2) {
    const resonance = this.resonanceCalc.calculateResonance(symbol1.prime, symbol2.prime)

    // PHI-weighted contribution
    const weight1 = this.phi / (1 + this.phi) // ~0.618
    const weight2 = 1 / (1 + this.phi) // ~0.382

    // Combined prime (using log to prevent overflow)
    const logCombined = weight1 * Math.log(symbol1.prime) + weight2 * Math.log(symbol2.prime)

    // Find nearest prime to the geometric mean
    const targetPrime = Math.exp(logCombined)
    const nearestSymbol = this.symbolDb.getSymbolByPrime(Math.round(targetPrime))

    return {
      source: [symbol1.id, symbol2.id],
      weights: [weight1, weight2],
      resonance,
      fusedPrime: targetPrime,
      nearestSymbol: nearestSymbol?.name || null,
      harmonicQuality: resonance * this.phi, // PHI-scaled quality metric
    }
  }

  /**
   * Fuse SMF states using golden ratio
   * Combines two 16D orientations harmonically
   * @param {Array} smf1 - First SMF state (16-component)
   * @param {Array} smf2 - Second SMF state (16-component)
   * @returns {Array} Fused 16-component SMF state
   */
  goldenFuseSMF(smf1, smf2) {
    const weight1 = this.phi / (1 + this.phi) // ~0.618
    const weight2 = 1 / (1 + this.phi) // ~0.382

    const fused = new Array(16)
    let norm = 0

    for (let i = 0; i < 16; i++) {
      fused[i] = weight1 * (smf1[i] || 0) + weight2 * (smf2[i] || 0)
      norm += fused[i] * fused[i]
    }

    // Normalize
    norm = Math.sqrt(norm)
    if (norm > 0) {
      for (let i = 0; i < 16; i++) {
        fused[i] /= norm
      }
    }

    return fused
  }

  /**
   * Calculate golden spiral position for a sequence of symbols
   * Useful for narrative arc visualization
   * @param {Array<Object>} symbols - Sequence of symbols
   * @returns {Array<Object>} Symbols with golden spiral coordinates
   */
  goldenSpiralPlacement(symbols) {
    const goldenAngle = (Math.PI * 2) / (this.phi * this.phi) // ~137.5 degrees

    return symbols.map((symbol, index) => {
      const angle = index * goldenAngle
      const radius = Math.sqrt(index + 1) * 0.1 // Expanding spiral

      return {
        symbol,
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        angle: angle % (2 * Math.PI),
        radius,
        index,
      }
    })
  }

  /**
   * Test if two primes are in PHI-harmonic relation
   * @param {number} p1 - First prime
   * @param {number} p2 - Second prime
   * @returns {Object} Harmonic analysis
   */
  testPhiHarmony(p1, p2) {
    const ratio = Math.max(p1, p2) / Math.min(p1, p2)
    const phiDistance = Math.abs(ratio - this.phi)

    // Check for PHI powers (PHI^n proximity)
    let bestPower = 0
    let bestDistance = phiDistance

    for (let n = 2; n <= 8; n++) {
      const phiPow = Math.pow(this.phi, n)
      const dist = Math.abs(ratio - phiPow)
      if (dist < bestDistance) {
        bestDistance = dist
        bestPower = n
      }
    }

    const isHarmonic = bestDistance < this.goldenFusionThreshold

    return {
      ratio,
      phiDistance,
      harmonicPower: bestPower,
      harmonicDistance: bestDistance,
      isHarmonic,
      harmonicStrength: isHarmonic ? 1 - bestDistance / this.goldenFusionThreshold : 0,
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // EXISTING METHODS
  // ════════════════════════════════════════════════════════════════════

  /**
   * Create compound symbol from current state
   */
  createCompoundFromState(name) {
    return this.smf.createCompoundFromState(name)
  }

  /**
   * Find symbols resonant with current SMF state
   */
  findResonantSymbols(topN = 5) {
    return this.smf.findResonantSymbols(topN)
  }

  /**
   * Get I-Ching reading for current moment
   */
  getIChingReading() {
    return this.temporal.getIChingReading()
  }

  /**
   * Get dominant archetypes from recent history
   */
  getDominantArchetypes(topN = 5) {
    return this.temporal.getDominantArchetypes(topN)
  }

  /**
   * Predict next archetype based on sequence
   */
  predictNextArchetype() {
    return this.temporal.predictNextArchetype()
  }

  /**
   * Get symbol co-occurrence patterns
   */
  getSymbolPatterns(minCount = 2) {
    const patterns = []

    for (const [key, count] of this.symbolCooccurrence) {
      if (count >= minCount) {
        const [id1, id2] = key.split(':')
        const sym1 = this.symbolDb.getById(id1)
        const sym2 = this.symbolDb.getById(id2)

        if (sym1 && sym2) {
          patterns.push({
            symbols: [sym1.name, sym2.name],
            count,
            primeProduct: sym1.prime * sym2.prime,
          })
        }
      }
    }

    return patterns.sort((a, b) => b.count - a.count)
  }

  /**
   * Query symbols by semantic similarity to text
   */
  querySymbols(query, topN = 5) {
    const results = []

    // Extract query symbols
    const { symbols } = this.extractSymbols(query)

    if (symbols.length === 0) {
      // Fall back to search
      return this.symbolDb.search(query).slice(0, topN)
    }

    // Find related symbols via inference
    const primes = symbols.map((s) => s.prime)
    const inferences = this.inference.inferFromPrimes(primes, { maxDepth: 2 })

    // Collect all related symbols
    const seen = new Set(symbols.map((s) => s.id))

    for (const inf of inferences) {
      if (inf.resultSymbol && !seen.has(inf.resultSymbol.id)) {
        results.push({
          ...inf.resultSymbol,
          relation: inf.type,
          confidence: inf.confidence,
        })
        seen.add(inf.resultSymbol.id)
      }
    }

    return results.slice(0, topN)
  }

  /**
   * Override tick to update symbolic state
   */
  tick() {
    // Run parent tick
    super.tick()

    if (!this.running) return

    // Update symbolic state
    const groundedSymbols = this.smf.groundInSymbols()
    const resonantSymbols = this.smf.findResonantSymbols(3)

    const symbolicState = new SymbolicState({
      // Copy base state
      timestamp: this.currentState.timestamp,
      coherence: this.currentState.coherence,
      entropy: this.currentState.entropy,
      totalAmplitude: this.currentState.totalAmplitude,
      smfOrientation: this.currentState.smfOrientation,
      activePrimes: this.currentState.activePrimes,
      momentId: this.currentState.momentId,
      phraseId: this.currentState.phraseId,
      topFocus: this.currentState.topFocus,
      topGoal: this.currentState.topGoal,
      processingLoad: this.currentState.processingLoad,
      safetyLevel: this.currentState.safetyLevel,
      currentInput: this.currentState.currentInput,
      currentOutput: this.currentState.currentOutput,

      // Symbolic additions
      groundedSymbols: groundedSymbols.map((s) => s.name),
      activeSymbolIds: resonantSymbols.map((s) => s.symbol.id),
      hexagramIndex: this.temporal.currentMoment?.hexagramIndex,
      archetypeName: this.temporal.currentMoment?.archetype?.name,
      dominantArchetypes: this.getDominantArchetypes(3).map((a) => a.name),
      phiResonance: this.temporal.currentMoment?.phiResonance || 0,
      symbolicCoherence: this.calculateSymbolicCoherence(),
    })

    this.currentState = symbolicState
  }

  // ════════════════════════════════════════════════════════════════════
  // OBSERVER CAPACITY (108bio.pdf equation) - C_obs = α·N_osc·K̄·τ⁻¹
  // ════════════════════════════════════════════════════════════════════

  /**
   * Calculate observer capacity using 108bio.pdf formula:
   * C_obs = α · N_osc · K̄ · τ⁻¹
   *
   * Where:
   * - α = fine structure constant (~1/137)
   * - N_osc = number of active oscillators
   * - K̄ = mean coupling strength
   * - τ = characteristic response time
   *
   * Higher capacity means more information can be integrated per unit time.
   * This directly quantifies the "observer bandwidth" of the system.
   *
   * @param {Object} options - Calculation options
   * @returns {Object} Observer capacity metrics
   */
  calculateObserverCapacity(options = {}) {
    // Get oscillator count (N_osc)
    const activeThreshold = options.activeThreshold || 0.05
    const oscillators = this.prsc.oscillators || []
    let activeCount = 0
    let totalCoupling = 0
    let totalPhaseVariance = 0

    for (const osc of oscillators) {
      if (osc && osc.amplitude > activeThreshold) {
        activeCount++
        // Estimate coupling from amplitude coherence
        totalCoupling += osc.amplitude * (1 - Math.abs(osc.phase - Math.PI) / Math.PI)
      }
    }

    const N_osc = activeCount

    // Mean coupling strength (K̄)
    const K_bar = activeCount > 0 ? totalCoupling / activeCount : 0

    // Characteristic response time (τ) - derived from tick rate and coherence
    // Lower coherence = slower response, higher τ
    const coherence = this.prsc.orderParameter ? this.prsc.orderParameter() : 0.5
    const baseTickPeriod = options.tickPeriod || 100 // ms
    const tau = baseTickPeriod / (coherence + 0.1) // ms, bounded away from zero
    const tau_inverse = 1000 / tau // Hz

    // Observer capacity: C_obs = α · N_osc · K̄ · τ⁻¹
    const C_obs = ALPHA * N_osc * K_bar * tau_inverse

    // Normalize to a 0-1 scale based on theoretical maximum
    // Max would be: ALPHA * maxOscillators * 1.0 * (1000/baseTickPeriod)
    const maxOscillators = this.primes?.length || 100
    const theoreticalMax = ALPHA * maxOscillators * 1.0 * (1000 / baseTickPeriod)
    const normalizedCapacity = Math.min(1, C_obs / theoreticalMax)

    // Determine observer scale from OBSERVER_HIERARCHY
    const observerScale = this.determineObserverScale(normalizedCapacity)

    return {
      // Raw capacity metrics
      capacity: C_obs,
      normalizedCapacity,

      // Component breakdown
      alpha: ALPHA,
      N_osc,
      K_bar,
      tau,
      tau_inverse,

      // Derived metrics
      coherence,
      theoreticalMax,
      efficiency: K_bar * coherence, // Combined measure

      // Observer hierarchy placement
      observerScale,

      // Bandwidth interpretation
      bitsPerSecond: C_obs * Math.log2(Math.E), // Information-theoretic interpretation
      integrationWindow: tau, // How long to integrate inputs

      timestamp: Date.now(),
    }
  }

  /**
   * Determine which scale in OBSERVER_HIERARCHY best matches current capacity
   * @param {number} normalizedCapacity - Capacity normalized to 0-1
   * @returns {Object} Observer scale from hierarchy
   */
  determineObserverScale(normalizedCapacity) {
    if (!OBSERVER_HIERARCHY || OBSERVER_HIERARCHY.length === 0) {
      return { name: 'Unknown', scale: 0 }
    }

    // Map normalized capacity to hierarchy index
    // Lower capacity → smaller scale observers
    // Higher capacity → larger scale observers
    const scaleFactor = Math.pow(normalizedCapacity, 0.5) // Square root for better distribution
    const index = Math.min(
      OBSERVER_HIERARCHY.length - 1,
      Math.floor(scaleFactor * OBSERVER_HIERARCHY.length),
    )

    return OBSERVER_HIERARCHY[index]
  }

  /**
   * Get observer capacity trend over time
   * @param {number} samples - Number of samples to track
   * @returns {Object} Capacity trend analysis
   */
  getObserverCapacityTrend(samples = 10) {
    if (!this._capacityHistory) {
      this._capacityHistory = []
    }

    const current = this.calculateObserverCapacity()
    this._capacityHistory.push({
      capacity: current.capacity,
      normalized: current.normalizedCapacity,
      timestamp: current.timestamp,
    })

    // Keep only recent samples
    if (this._capacityHistory.length > samples) {
      this._capacityHistory = this._capacityHistory.slice(-samples)
    }

    // Calculate trend
    if (this._capacityHistory.length < 2) {
      return {
        current,
        trend: 0,
        stability: 1,
        history: this._capacityHistory,
      }
    }

    const capacities = this._capacityHistory.map((h) => h.normalized)
    const mean = capacities.reduce((a, b) => a + b, 0) / capacities.length
    const variance =
      capacities.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / capacities.length

    // Linear trend: positive = increasing capacity
    const n = capacities.length
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += capacities[i]
      sumXY += i * capacities[i]
      sumX2 += i * i
    }
    const trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    return {
      current,
      trend, // Positive = capacity increasing
      stability: 1 / (1 + Math.sqrt(variance)), // Higher = more stable
      mean,
      variance,
      history: this._capacityHistory,
    }
  }

  /**
   * Calculate symbolic coherence (alignment between PRSC, SMF, and symbols)
   */
  calculateSymbolicCoherence() {
    // Get PRSC coherence
    const prscCoherence = this.prsc.orderParameter()

    // Get SMF entropy (lower = more coherent)
    const smfEntropy = this.smf.smfEntropy()
    const smfCoherence = 1 - Math.min(1, smfEntropy / 4) // Normalize

    // Get symbolic grounding strength
    const grounded = this.smf.groundInSymbols()
    const groundingStrength =
      grounded.length > 0
        ? grounded.reduce((sum, s) => sum + s.contribution, 0) / grounded.length
        : 0

    // Weighted combination
    return prscCoherence * 0.4 + smfCoherence * 0.3 + groundingStrength * 0.3
  }

  /**
   * Get comprehensive symbolic status
   */
  getSymbolicStatus() {
    return {
      ...this.getStatus(),
      symbolic: {
        extractedSymbolCount: this.extractedSymbols.length,
        cooccurrencePatterns: this.getSymbolPatterns(3).slice(0, 10),
        currentArchetype: this.temporal.currentMoment?.archetype?.name,
        hexagramIndex: this.temporal.currentMoment?.hexagramIndex,
        dominantArchetypes: this.getDominantArchetypes(5),
        narrativeCount: this.narrativeHistory.length,
        currentNarrative: this.currentNarrative,
        prediction: this.predictNextArchetype(),
        resonantSymbols: this.findResonantSymbols(5).map((r) => ({
          name: r.symbol.name,
          score: r.score,
        })),
        symbolicCoherence: this.calculateSymbolicCoherence(),
      },
    }
  }

  /**
   * Enhanced introspection with symbolic context
   */
  introspect() {
    const base = super.introspect()

    return {
      ...base,
      symbolic: {
        groundedSymbols: this.smf.groundInSymbols(),
        resonantSymbols: this.findResonantSymbols(5),
        iching: this.getIChingReading(),
        archetypeHistory: this.temporal.getDominantArchetypes(5),
        archetypeSequences: this.temporal.detectArchetypeSequences(),
        narratives: this.narrativeHistory.slice(-5),
        prediction: this.predictNextArchetype(),
        symbolCooccurrence: this.getSymbolPatterns(3).slice(0, 5),
      },
    }
  }

  /**
   * Reset including symbolic state
   */
  reset() {
    super.reset()
    this.extractedSymbols = []
    this.symbolCooccurrence.clear()
    this.narrativeHistory = []
    this.currentNarrative = null
    this.activeGoals = []
    this.goalHistory = []
  }
}

module.exports = {
  SymbolicState,
  SymbolicObserver,
  HEXAGRAM_ARCHETYPES,
  AXIS_SYMBOL_MAPPING,
}
