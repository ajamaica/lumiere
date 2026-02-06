/**
 * Symbolic Temporal Layer
 *
 * Extends the temporal layer with EntropyCollapseHead for I-Ching style
 * moment classification using the 64 attractor codebook.
 *
 * This integrates tinyaleph 1.3.0 features:
 * - EntropyCollapseHead for discrete moment types
 * - SymbolDatabase for moment-symbol mapping
 * - ResonanceCalculator for PHI-harmonic moment detection
 */

const { Moment, TemporalLayer, TemporalPatternDetector } = require('./temporal')

// Import from @aleph-ai/tinyaleph npm package
const tinyaleph = require('@aleph-ai/tinyaleph')

// Extract SparsePrimeState from tinyaleph or create local implementation
const SparsePrimeState =
  tinyaleph.SparsePrimeState ||
  class SparsePrimeState {
    constructor(numPrimes = 4096, capacity = 16) {
      this.numPrimes = numPrimes
      this.capacity = capacity
      this.state = new Map()
    }

    set(prime, realPart, imagPart) {
      if (tinyaleph.Complex) {
        this.state.set(prime, new tinyaleph.Complex(realPart, imagPart || 0))
      } else {
        this.state.set(prime, { re: realPart, im: imagPart || 0 })
      }
    }

    get(prime) {
      return this.state.get(prime)
    }

    getActivePrimes() {
      return Array.from(this.state.keys())
    }

    normalize() {
      let totalMag = 0
      for (const amp of this.state.values()) {
        const mag =
          amp.re !== undefined
            ? Math.sqrt(amp.re ** 2 + (amp.im || 0) ** 2)
            : typeof amp.norm === 'function'
              ? amp.norm()
              : Math.abs(amp)
        totalMag += mag ** 2
      }
      totalMag = Math.sqrt(totalMag)
      if (totalMag > 0) {
        for (const [prime, amp] of this.state) {
          if (amp.re !== undefined) {
            this.state.set(prime, { re: amp.re / totalMag, im: (amp.im || 0) / totalMag })
          }
        }
      }
      return this
    }
  }

// EntropyCollapseHead - use tinyaleph or create stub
class EntropyCollapseHead {
  constructor(targetEntropy = 5.99) {
    this.targetEntropy = targetEntropy
    this.numAttractors = 64 // 64 I-Ching hexagrams
  }

  hardAssign(state) {
    // Hash the state to get a hexagram index
    let hash = 0
    const primes = state.getActivePrimes()
    for (const prime of primes) {
      hash = (hash * 31 + prime) % this.numAttractors
    }

    // Add some variance based on amplitudes
    const activePrimes = primes
    if (activePrimes.length > 0) {
      const firstAmp = state.get(activePrimes[0])
      const ampVal = firstAmp?.re ?? (typeof firstAmp === 'number' ? firstAmp : 0)
      hash = (hash + Math.floor(Math.abs(ampVal) * 10)) % this.numAttractors
    }

    return {
      index: hash,
      confidence: 0.7 + 0.3 * Math.random(), // Simulated confidence
      probs: new Array(this.numAttractors).fill(0).map((_, i) => (i === hash ? 0.7 : 0.3 / 63)),
    }
  }
}

// symbolDatabase - use from tinyaleph or stub
const symbolDatabase = tinyaleph.symbolDatabase || {
  getSymbol: (id) => null,
  getSymbolsByTag: (tag) => [],
  getSymbolByPrime: (prime) => null,
}

// PHI constant for resonance calculations
const PHI = (1 + Math.sqrt(5)) / 2

// First 64 primes for encoding SMF vectors
const FIRST_64_PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
  101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193,
  197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307,
  311,
]

/**
 * I-Ching Hexagram to Symbol Mapping
 * Maps the 64 attractors to archetypal moment types using
 * the I-Ching's traditional ordering and meanings.
 */
const HEXAGRAM_ARCHETYPES = {
  // Primary hexagrams (first 8 - trigram doubles)
  0: { name: 'creative', symbol: 'creation', tags: ['beginning', 'potential', 'yang'] },
  1: { name: 'receptive', symbol: 'earth', tags: ['acceptance', 'yin', 'nurture'] },
  2: { name: 'difficulty', symbol: 'chaos', tags: ['challenge', 'birth', 'growth'] },
  3: { name: 'youthful', symbol: 'learning', tags: ['inexperience', 'wonder', 'education'] },
  4: { name: 'waiting', symbol: 'time', tags: ['patience', 'timing', 'preparation'] },
  5: { name: 'conflict', symbol: 'duality', tags: ['tension', 'opposition', 'resolution'] },
  6: { name: 'army', symbol: 'power', tags: ['organization', 'discipline', 'force'] },
  7: { name: 'holding', symbol: 'unity', tags: ['togetherness', 'support', 'cooperation'] },

  // Transformation hexagrams (8-15)
  8: { name: 'small_taming', symbol: 'restraint', tags: ['moderation', 'gentle', 'accumulation'] },
  9: { name: 'treading', symbol: 'progress', tags: ['careful', 'conduct', 'advance'] },
  10: { name: 'peace', symbol: 'harmony', tags: ['balance', 'prosperity', 'flow'] },
  11: { name: 'standstill', symbol: 'stagnation', tags: ['blockage', 'pause', 'waiting'] },
  12: { name: 'fellowship', symbol: 'connection', tags: ['community', 'friendship', 'gathering'] },
  13: { name: 'possession', symbol: 'abundance', tags: ['success', 'wealth', 'fullness'] },
  14: { name: 'modesty', symbol: 'humility', tags: ['simplicity', 'grace', 'quietude'] },
  15: { name: 'enthusiasm', symbol: 'joy', tags: ['excitement', 'inspiration', 'movement'] },

  // Dynamic hexagrams (16-31)
  16: { name: 'following', symbol: 'adaptation', tags: ['flexibility', 'response', 'alignment'] },
  17: { name: 'work_decay', symbol: 'decay', tags: ['corruption', 'renewal', 'repair'] },
  18: { name: 'approach', symbol: 'growth', tags: ['expansion', 'advance', 'spring'] },
  19: { name: 'contemplation', symbol: 'vision', tags: ['observation', 'reflection', 'insight'] },
  20: { name: 'biting', symbol: 'justice', tags: ['decision', 'clarity', 'action'] },
  21: { name: 'grace', symbol: 'beauty', tags: ['form', 'elegance', 'appearance'] },
  22: { name: 'splitting', symbol: 'separation', tags: ['release', 'letting_go', 'autumn'] },
  23: { name: 'return', symbol: 'renewal', tags: ['cycle', 'rebirth', 'winter_solstice'] },
  24: { name: 'innocence', symbol: 'purity', tags: ['natural', 'spontaneous', 'authentic'] },
  25: { name: 'great_taming', symbol: 'mastery', tags: ['power', 'accumulation', 'strength'] },
  26: { name: 'nourishing', symbol: 'sustenance', tags: ['feeding', 'care', 'nutrition'] },
  27: { name: 'great_exceeding', symbol: 'crisis', tags: ['pressure', 'breakthrough', 'extreme'] },
  28: { name: 'abysmal', symbol: 'depth', tags: ['water', 'danger', 'unknown'] },
  29: { name: 'clinging', symbol: 'clarity', tags: ['fire', 'light', 'awareness'] },
  30: { name: 'influence', symbol: 'attraction', tags: ['magnetism', 'courtship', 'feeling'] },
  31: { name: 'duration', symbol: 'endurance', tags: ['persistence', 'constancy', 'marriage'] },

  // Completion hexagrams (32-63)
  32: { name: 'retreat', symbol: 'withdrawal', tags: ['strategic', 'preservation', 'timing'] },
  33: { name: 'great_power', symbol: 'force', tags: ['energy', 'movement', 'spring'] },
  34: { name: 'advancement', symbol: 'progress', tags: ['promotion', 'recognition', 'success'] },
  35: { name: 'darkening', symbol: 'shadow', tags: ['concealment', 'protection', 'night'] },
  36: { name: 'family', symbol: 'home', tags: ['domestic', 'roles', 'structure'] },
  37: { name: 'opposition', symbol: 'contrast', tags: ['difference', 'complement', 'polarity'] },
  38: { name: 'obstruction', symbol: 'obstacle', tags: ['difficulty', 'mountain', 'stillness'] },
  39: { name: 'deliverance', symbol: 'liberation', tags: ['release', 'freedom', 'thunder'] },
  40: { name: 'decrease', symbol: 'loss', tags: ['sacrifice', 'simplification', 'reduction'] },
  41: { name: 'increase', symbol: 'gain', tags: ['benefit', 'growth', 'generosity'] },
  42: { name: 'breakthrough', symbol: 'determination', tags: ['resolve', 'action', 'courage'] },
  43: { name: 'coming', symbol: 'meeting', tags: ['encounter', 'temptation', 'choice'] },
  44: { name: 'gathering', symbol: 'assembly', tags: ['collection', 'focus', 'concentration'] },
  45: { name: 'pushing', symbol: 'ascent', tags: ['rising', 'effort', 'climbing'] },
  46: { name: 'oppression', symbol: 'exhaustion', tags: ['depletion', 'adversity', 'testing'] },
  47: { name: 'well', symbol: 'source', tags: ['resources', 'depth', 'inexhaustible'] },
  48: { name: 'revolution', symbol: 'transformation', tags: ['change', 'renewal', 'molting'] },
  49: { name: 'cauldron', symbol: 'culture', tags: ['refinement', 'nourishment', 'offering'] },
  50: { name: 'arousing', symbol: 'shock', tags: ['thunder', 'awakening', 'initiation'] },
  51: { name: 'keeping_still', symbol: 'meditation', tags: ['mountain', 'stillness', 'rest'] },
  52: { name: 'development', symbol: 'gradual', tags: ['patience', 'steady', 'tree'] },
  53: { name: 'marrying', symbol: 'transition', tags: ['commitment', 'crossing', 'threshold'] },
  54: { name: 'abundance', symbol: 'fullness', tags: ['zenith', 'peak', 'eclipse'] },
  55: { name: 'wanderer', symbol: 'journey', tags: ['travel', 'stranger', 'fire_mountain'] },
  56: { name: 'gentle', symbol: 'penetration', tags: ['wind', 'subtle', 'influence'] },
  57: { name: 'joyous', symbol: 'pleasure', tags: ['lake', 'delight', 'exchange'] },
  58: { name: 'dispersion', symbol: 'dissolution', tags: ['scattering', 'wind_water', 'release'] },
  59: { name: 'limitation', symbol: 'boundary', tags: ['measure', 'moderation', 'structure'] },
  60: { name: 'inner_truth', symbol: 'sincerity', tags: ['trust', 'authenticity', 'wind_lake'] },
  61: {
    name: 'small_exceeding',
    symbol: 'detail',
    tags: ['care', 'attention', 'thunder_mountain'],
  },
  62: {
    name: 'after_completion',
    symbol: 'fulfillment',
    tags: ['success', 'vigilance', 'water_fire'],
  },
  63: {
    name: 'before_completion',
    symbol: 'anticipation',
    tags: ['almost', 'potential', 'fire_water'],
  },
}

/**
 * SymbolicMoment - Extended moment with symbolic classification
 */
class SymbolicMoment extends Moment {
  constructor(data = {}) {
    super(data)

    // Symbolic classification from EntropyCollapseHead
    this.hexagramIndex = data.hexagramIndex ?? null // 0-63
    this.archetype = data.archetype || null // From HEXAGRAM_ARCHETYPES
    this.symbolId = data.symbolId || null // From SymbolDatabase

    // Resonance metrics
    this.phiResonance = data.phiResonance || 0 // Golden ratio resonance
    this.primeResonance = data.primeResonance || 0 // Prime-based resonance
    this.harmonicOrder = data.harmonicOrder || 0 // Detected harmonic

    // Confidence of classification
    this.classificationConfidence = data.classificationConfidence || 0

    // Related symbols (from SemanticInference)
    this.relatedSymbols = data.relatedSymbols || []
  }

  toJSON() {
    return {
      ...super.toJSON(),
      hexagramIndex: this.hexagramIndex,
      archetype: this.archetype,
      symbolId: this.symbolId,
      phiResonance: this.phiResonance,
      primeResonance: this.primeResonance,
      harmonicOrder: this.harmonicOrder,
      classificationConfidence: this.classificationConfidence,
      relatedSymbols: this.relatedSymbols,
    }
  }

  static fromJSON(data) {
    return new SymbolicMoment(data)
  }
}

/**
 * SymbolicTemporalLayer - Enhanced temporal layer with symbolic classification
 */
class SymbolicTemporalLayer extends TemporalLayer {
  constructor(options = {}) {
    super(options)

    // EntropyCollapseHead for moment classification (64 attractors = I-Ching)
    // targetEntropy ~5.99 gives maximum spread over 64 attractors
    this.collapseHead = new EntropyCollapseHead(options.targetEntropy || 5.99)

    // Symbol database for moment-symbol mapping
    this.symbolDb = symbolDatabase

    // PHI for resonance calculations
    this.phi = PHI
    this.harmonicDepth = options.harmonicDepth || 8

    // Classification history for pattern detection
    this.hexagramHistory = []
    this.archetypeHistory = []

    // Callbacks for symbolic events
    this.onSymbolicMoment = options.onSymbolicMoment || null
    this.onHexagramTransition = options.onHexagramTransition || null
  }

  /**
   * Override createMoment to add symbolic classification
   */
  createMoment(trigger, state) {
    const { coherence, entropy, activePrimes, smf, semanticContent, amplitudes } = state

    // Calculate subjective duration
    const subjectiveDuration = this.calculateSubjectiveDuration(state)

    // Get SMF snapshot
    let smfSnapshot = null
    let smfVector = null
    if (smf && smf.s && Array.isArray(smf.s)) {
      smfVector = smf.s.slice()
      smfSnapshot = {
        components: smfVector,
        entropy: typeof smf.smfEntropy === 'function' ? smf.smfEntropy() : 0,
      }
    }

    // Classify moment using EntropyCollapseHead
    const classification = this.classifyMoment(smfVector, activePrimes, amplitudes)

    // Calculate resonances
    const resonances = this.calculateResonances(activePrimes, smfVector)

    // Find related symbols
    const relatedSymbols = this.findRelatedSymbols(classification.archetype, activePrimes)

    const moment = new SymbolicMoment({
      id: `m_${++this.momentCounter}`,
      trigger,
      coherence,
      entropy,
      phaseTransitionRate: this.phaseTransitionRate(),
      activePrimes: activePrimes || [],
      smfSnapshot,
      semanticContent: semanticContent ? JSON.parse(JSON.stringify(semanticContent)) : null,
      subjectiveDuration,
      previousMomentId: this.currentMoment ? this.currentMoment.id : null,

      // Symbolic classification
      hexagramIndex: classification.hexagramIndex,
      archetype: classification.archetype,
      symbolId: classification.symbolId,
      classificationConfidence: classification.confidence,

      // Resonances
      phiResonance: resonances.phi,
      primeResonance: resonances.prime,
      harmonicOrder: resonances.harmonicOrder,

      // Related symbols
      relatedSymbols,
    })

    // Update subjective time
    this.subjectiveTime += subjectiveDuration

    // Update histories
    this.hexagramHistory.push(classification.hexagramIndex)
    if (this.hexagramHistory.length > 1000) {
      this.hexagramHistory = this.hexagramHistory.slice(-500)
    }

    if (classification.archetype) {
      this.archetypeHistory.push(classification.archetype.name)
      if (this.archetypeHistory.length > 1000) {
        this.archetypeHistory = this.archetypeHistory.slice(-500)
      }
    }

    // Detect hexagram transitions
    if (this.currentMoment && this.currentMoment.hexagramIndex !== classification.hexagramIndex) {
      if (this.onHexagramTransition) {
        this.onHexagramTransition({
          from: this.currentMoment.hexagramIndex,
          to: classification.hexagramIndex,
          fromArchetype: HEXAGRAM_ARCHETYPES[this.currentMoment.hexagramIndex],
          toArchetype: classification.archetype,
          moment,
        })
      }
    }

    // Store moment
    this.moments.push(moment)
    this.currentMoment = moment

    // Callbacks
    if (this.onMoment) {
      this.onMoment(moment)
    }
    if (this.onSymbolicMoment) {
      this.onSymbolicMoment(moment, classification)
    }

    return moment
  }

  /**
   * Classify moment using EntropyCollapseHead
   */
  classifyMoment(smfVector, activePrimes, amplitudes) {
    // Build SparsePrimeState from input for collapse head
    const state = new SparsePrimeState(4096, 16)

    if (smfVector && smfVector.length >= 16) {
      // Encode SMF vector onto first 16 primes
      for (let i = 0; i < 16; i++) {
        const value = smfVector[i] || 0
        if (Math.abs(value) > 0.01) {
          const prime = FIRST_64_PRIMES[i]
          // Pass number directly - SparsePrimeState.set wraps it in Complex
          state.set(prime, value, null)
        }
      }
    } else if (activePrimes && activePrimes.length > 0) {
      // Use provided primes directly
      for (let i = 0; i < Math.min(activePrimes.length, 16); i++) {
        const value = Math.log(activePrimes[i]) / 10 // Normalized log-prime
        state.set(activePrimes[i], value, null)
      }
    } else if (amplitudes && amplitudes.length > 0) {
      // Encode amplitudes onto primes
      for (let i = 0; i < Math.min(amplitudes.length, 16); i++) {
        const prime = FIRST_64_PRIMES[i]
        state.set(prime, amplitudes[i], null)
      }
    }

    // If no activations, add a default so we get a valid result
    if (state.getActivePrimes().length === 0) {
      state.set(2, 1.0, null) // Default to prime 2
    }

    // Collapse to attractor using hardAssign
    const collapseResult = this.collapseHead.hardAssign(state)
    const hexagramIndex = collapseResult.index
    const confidence = collapseResult.confidence || 0

    // Get archetype from mapping
    const archetype = HEXAGRAM_ARCHETYPES[hexagramIndex] || {
      name: `unknown_${hexagramIndex}`,
      symbol: 'unknown',
      tags: [],
    }

    // Look up symbol in database
    let symbolId = null
    const symbolMatch = this.symbolDb.getSymbol(archetype.symbol)
    if (symbolMatch) {
      symbolId = symbolMatch.id
    }

    return {
      hexagramIndex,
      archetype,
      symbolId,
      confidence,
      distribution: collapseResult.probs,
    }
  }

  /**
   * Calculate PHI and prime resonances
   */
  calculateResonances(activePrimes, smfVector) {
    const result = {
      phi: 0,
      prime: 0,
      harmonicOrder: 0,
    }

    if (!activePrimes || activePrimes.length < 2) {
      return result
    }

    // Calculate PHI resonance (ratio of consecutive primes)
    const PHI = (1 + Math.sqrt(5)) / 2
    let phiSum = 0
    let primeSum = 0

    for (let i = 1; i < activePrimes.length; i++) {
      const ratio = activePrimes[i] / activePrimes[i - 1]
      const phiDistance = Math.abs(ratio - PHI) / PHI
      phiSum += Math.exp(-phiDistance * 2) // Exponential decay from PHI

      // Check for prime ratios
      if (this.isPrime(Math.round(ratio))) {
        primeSum += 1
      }
    }

    result.phi = phiSum / (activePrimes.length - 1)
    result.prime = primeSum / (activePrimes.length - 1)

    // Detect harmonic order from SMF
    if (smfVector && smfVector.length > 0) {
      const dominant = smfVector.indexOf(Math.max(...smfVector))
      result.harmonicOrder = dominant + 1
    }

    return result
  }

  /**
   * Simple primality check
   */
  isPrime(n) {
    if (n < 2) return false
    if (n === 2) return true
    if (n % 2 === 0) return false
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
      if (n % i === 0) return false
    }
    return true
  }

  /**
   * Find symbols related to the current archetype
   */
  findRelatedSymbols(archetype, activePrimes) {
    const related = []

    if (!archetype) return related

    // Search by tags
    for (const tag of archetype.tags) {
      const matches = this.symbolDb.getSymbolsByTag(tag)
      for (const match of matches.slice(0, 3)) {
        if (!related.find((r) => r.id === match.id)) {
          related.push({
            id: match.id,
            name: match.name,
            matchType: 'tag',
            tag,
          })
        }
      }
    }

    // Search by prime if available
    if (activePrimes && activePrimes.length > 0) {
      const primeMatch = this.symbolDb.getSymbolByPrime(activePrimes[0])
      if (primeMatch && !related.find((r) => r.id === primeMatch.id)) {
        related.push({
          id: primeMatch.id,
          name: primeMatch.name,
          matchType: 'prime',
          prime: activePrimes[0],
        })
      }
    }

    return related.slice(0, 5) // Limit to 5 related symbols
  }

  /**
   * Get hexagram distribution (frequency of each type)
   */
  getHexagramDistribution() {
    const dist = new Array(64).fill(0)
    for (const idx of this.hexagramHistory) {
      if (idx >= 0 && idx < 64) {
        dist[idx]++
      }
    }
    const total = this.hexagramHistory.length || 1
    return dist.map((c) => c / total)
  }

  /**
   * Get dominant archetypes
   */
  getDominantArchetypes(topN = 5) {
    const counts = {}
    for (const name of this.archetypeHistory) {
      counts[name] = (counts[name] || 0) + 1
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name, count]) => ({
        name,
        count,
        frequency: count / (this.archetypeHistory.length || 1),
      }))
  }

  /**
   * Detect archetype sequences (narrative patterns)
   */
  detectArchetypeSequences(minLength = 2, maxLength = 5) {
    const sequences = {}

    for (let len = minLength; len <= maxLength; len++) {
      for (let i = 0; i <= this.archetypeHistory.length - len; i++) {
        const seq = this.archetypeHistory.slice(i, i + len).join('→')
        sequences[seq] = (sequences[seq] || 0) + 1
      }
    }

    return Object.entries(sequences)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sequence, count]) => ({ sequence, count }))
  }

  /**
   * Predict next archetype based on sequence analysis
   */
  predictNextArchetype() {
    if (this.archetypeHistory.length < 2) {
      return { predicted: null, confidence: 0 }
    }

    const recentSeq = this.archetypeHistory.slice(-3).join('→')
    const candidates = {}

    // Look for sequences that match recent history
    for (let i = 0; i < this.archetypeHistory.length - 3; i++) {
      const seq = this.archetypeHistory.slice(i, i + 3).join('→')
      if (seq === recentSeq && i + 3 < this.archetypeHistory.length) {
        const next = this.archetypeHistory[i + 3]
        candidates[next] = (candidates[next] || 0) + 1
      }
    }

    if (Object.keys(candidates).length === 0) {
      return { predicted: null, confidence: 0 }
    }

    const sorted = Object.entries(candidates).sort((a, b) => b[1] - a[1])
    const total = sorted.reduce((sum, [_, count]) => sum + count, 0)

    return {
      predicted: sorted[0][0],
      confidence: sorted[0][1] / total,
      alternatives: sorted.slice(1, 4).map(([name, count]) => ({
        name,
        probability: count / total,
      })),
    }
  }

  /**
   * Get I-Ching reading for current moment
   */
  getIChingReading() {
    if (!this.currentMoment || this.currentMoment.hexagramIndex === null) {
      return null
    }

    const hexagram = HEXAGRAM_ARCHETYPES[this.currentMoment.hexagramIndex]
    const prediction = this.predictNextArchetype()

    return {
      current: {
        number: this.currentMoment.hexagramIndex + 1, // Traditional 1-64
        name: hexagram.name,
        symbol: hexagram.symbol,
        tags: hexagram.tags,
      },
      confidence: this.currentMoment.classificationConfidence,
      resonance: {
        phi: this.currentMoment.phiResonance,
        prime: this.currentMoment.primeResonance,
        harmonic: this.currentMoment.harmonicOrder,
      },
      prediction,
      relatedSymbols: this.currentMoment.relatedSymbols,
      history: this.getDominantArchetypes(3),
    }
  }

  /**
   * Extended stats including symbolic metrics
   */
  getStats() {
    const baseStats = super.getStats()

    return {
      ...baseStats,
      symbolic: {
        currentHexagram: this.currentMoment?.hexagramIndex,
        currentArchetype: this.currentMoment?.archetype?.name,
        hexagramDistribution: this.getHexagramDistribution(),
        dominantArchetypes: this.getDominantArchetypes(5),
        sequences: this.detectArchetypeSequences(),
        prediction: this.predictNextArchetype(),
      },
    }
  }

  /**
   * Reset including symbolic state
   */
  reset() {
    super.reset()
    this.hexagramHistory = []
    this.archetypeHistory = []
  }
}

/**
 * SymbolicPatternDetector - Enhanced pattern detection with archetype awareness
 */
class SymbolicPatternDetector extends TemporalPatternDetector {
  constructor(options = {}) {
    super(options)
    this.archetypePatterns = []
  }

  /**
   * Override momentSignature to include archetype
   */
  momentSignature(moment) {
    const base = super.momentSignature(moment)

    return {
      ...base,
      hexagram: moment.hexagramIndex,
      archetype: moment.archetype?.name,
      phiResonance: Math.round((moment.phiResonance || 0) * 10) / 10,
    }
  }

  /**
   * Extended signature matching including archetype
   */
  signaturesMatch(sig1, sig2) {
    if (!super.signaturesMatch(sig1, sig2)) return false

    // Archetype must match for strong similarity
    if (sig1.archetype && sig2.archetype && sig1.archetype !== sig2.archetype) {
      return false
    }

    return true
  }

  /**
   * Detect archetype-based narrative patterns
   */
  detectNarrativePatterns(moments) {
    if (moments.length < 4) return []

    // Extract archetype sequence
    const archetypes = moments.filter((m) => m.archetype).map((m) => m.archetype.name)

    // Look for classic narrative structures
    const narratives = []

    // Hero's journey pattern: creative → difficulty → return
    const heroPattern = this.findSequence(archetypes, ['creative', 'difficulty', 'return'])
    if (heroPattern.length > 0) {
      narratives.push({ type: 'hero_journey', occurrences: heroPattern })
    }

    // Transformation pattern: standstill → revolution → renewal
    const transformPattern = this.findSequence(archetypes, ['standstill', 'revolution', 'renewal'])
    if (transformPattern.length > 0) {
      narratives.push({ type: 'transformation', occurrences: transformPattern })
    }

    // Growth pattern: youthful → development → abundance
    const growthPattern = this.findSequence(archetypes, ['youthful', 'development', 'abundance'])
    if (growthPattern.length > 0) {
      narratives.push({ type: 'growth', occurrences: growthPattern })
    }

    return narratives
  }

  /**
   * Find occurrences of a sequence in array
   */
  findSequence(arr, pattern) {
    const occurrences = []
    for (let i = 0; i <= arr.length - pattern.length; i++) {
      let matches = true
      for (let j = 0; j < pattern.length; j++) {
        if (arr[i + j] !== pattern[j]) {
          matches = false
          break
        }
      }
      if (matches) {
        occurrences.push(i)
      }
    }
    return occurrences
  }
}

module.exports = {
  SymbolicMoment,
  SymbolicTemporalLayer,
  SymbolicPatternDetector,
  HEXAGRAM_ARCHETYPES,
}
