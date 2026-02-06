/**
 * Symbolic SMF Layer
 *
 * Enhances SedenionMemoryField with tinyaleph 1.3.0 symbolic features:
 * - Symbol database integration (400+ symbols)
 * - Semantic inference for grounding SMF in archetypes
 * - Cultural tag mapping to SMF axes
 * - Compound symbol formation from dominant axes
 *
 * This module connects abstract 16-dimensional SMF orientation
 * to culturally-grounded archetypal symbols.
 */

const { SedenionMemoryField, SMF_AXES, AXIS_INDEX } = require('./smf')

// Import from @aleph-ai/tinyaleph npm package
const tinyaleph = require('@aleph-ai/tinyaleph')

// Safely extract exports with fallbacks for missing items
const symbolDatabase = tinyaleph.symbolDatabase || {
  getSymbol: () => null,
  getSymbolsByCategory: () => [],
  getAllSymbols: () => [],
}

const SymbolCategory = tinyaleph.SymbolCategory || {
  ARCHETYPE: 'archetype',
  ELEMENT: 'element',
  PLACE: 'place',
  OBJECT: 'object',
  ABSTRACT: 'abstract',
  MYTHOLOGICAL: 'mythological',
  TAROT: 'tarot',
  ICHING: 'iching',
}

// SemanticInference - stub if not available from tinyaleph
class SemanticInference {
  constructor(symbolDb) {
    this.symbolDb = symbolDb
  }

  inferWithResonance(text, options = {}) {
    // Simple keyword matching for symbols
    const words = text.toLowerCase().split(/\s+/)
    const results = []

    const allSymbols = this.symbolDb.getAllSymbols?.() || []
    for (const symbol of allSymbols.slice(0, options.maxCandidates || 10)) {
      if (symbol && symbol.id) {
        const match = words.some((w) => symbol.id.includes(w) || w.includes(symbol.id))
        if (match) {
          results.push({
            symbol,
            confidence: 0.7,
            attentionWeight: 1.0,
          })
        }
      }
    }
    return results
  }
}

// CompoundBuilder - stub if not available from tinyaleph
class CompoundBuilder {
  constructor(symbolDb) {
    this.symbolDb = symbolDb
  }

  createCompoundFromSymbols(id, symbols, meaning, culturalTags) {
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
}

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

// ═══════════════════════════════════════════════════════════════════
// SMF Axis to Symbol Category Mapping
// ═══════════════════════════════════════════════════════════════════

/**
 * Maps SMF axes to symbol categories and archetypal symbols
 */
const AXIS_SYMBOL_MAPPING = {
  0: { category: 'abstract', archetypes: ['unity', 'light', 'order'] }, // coherence
  1: { category: 'archetype', archetypes: ['hero', 'self', 'everyman'] }, // identity
  2: { category: 'abstract', archetypes: ['duality', 'yin_yang', 'mirror'] }, // duality
  3: { category: 'abstract', archetypes: ['structure', 'order', 'temple'] }, // structure
  4: { category: 'abstract', archetypes: ['transformation', 'change', 'wheel'] }, // change
  5: { category: 'element', archetypes: ['tree', 'life', 'flower'] }, // life
  6: { category: 'abstract', archetypes: ['harmony', 'peace', 'balance'] }, // harmony
  7: { category: 'archetype', archetypes: ['sage', 'wisdom_concept', 'guru'] }, // wisdom
  8: { category: 'abstract', archetypes: ['infinity', 'void', 'stars'] }, // infinity
  9: { category: 'abstract', archetypes: ['creation', 'genesis', 'birth'] }, // creation
  10: { category: 'abstract', archetypes: ['truth', 'light', 'sun'] }, // truth
  11: { category: 'abstract', archetypes: ['love', 'heart', 'connection'] }, // love
  12: { category: 'abstract', archetypes: ['power', 'lightning', 'thunder'] }, // power
  13: { category: 'abstract', archetypes: ['time', 'hourglass', 'wheel'] }, // time
  14: { category: 'place', archetypes: ['space', 'void', 'cosmos'] }, // space
  15: { category: 'abstract', archetypes: ['consciousness', 'eye', 'light'] }, // consciousness
}

/**
 * Cultural tag to SMF axis mapping
 */
const TAG_TO_AXIS = {
  // Universal tags
  universal: 0,
  unity: 0,
  oneness: 0,

  // Identity tags
  self: 1,
  individual: 1,
  jungian: 1,
  archetype: 1,

  // Duality tags
  duality: 2,
  opposites: 2,
  polarity: 2,
  eastern: 2,

  // Structure tags
  order: 3,
  form: 3,
  architecture: 3,
  sacred_geometry: 3,

  // Change tags
  transformation: 4,
  alchemy: 4,
  metamorphosis: 4,
  cycle: 4,

  // Life tags
  nature: 5,
  growth: 5,
  organic: 5,
  vitality: 5,

  // Harmony tags
  balance: 6,
  peace: 6,
  music: 6,
  resonance: 6,

  // Wisdom tags
  knowledge: 7,
  wisdom: 7,
  insight: 7,
  philosophy: 7,

  // Infinity tags
  infinity: 8,
  eternal: 8,
  cosmic: 8,
  transcendence: 8,

  // Creation tags
  creation: 9,
  genesis: 9,
  origin: 9,
  birth: 9,

  // Truth tags
  truth: 10,
  reality: 10,
  clarity: 10,

  // Love tags
  love: 11,
  heart: 11,
  connection: 11,
  emotion: 11,

  // Power tags
  power: 12,
  strength: 12,
  force: 12,
  authority: 12,

  // Time tags
  time: 13,
  temporal: 13,
  history: 13,
  future: 13,

  // Space tags
  space: 14,
  place: 14,
  location: 14,
  realm: 14,

  // Consciousness tags
  consciousness: 15,
  awareness: 15,
  mind: 15,
  spirit: 15,
}

// ═══════════════════════════════════════════════════════════════════
// Symbolic SMF Enhancement Class
// ═══════════════════════════════════════════════════════════════════

/**
 * SymbolicSMF extends SedenionMemoryField with symbolic grounding
 */
class SymbolicSMF extends SedenionMemoryField {
  /**
   * Create a SymbolicSMF
   * @param {Float64Array|Array|null} components - Initial components
   * @param {Object} options - Configuration options
   */
  constructor(components = null, options = {}) {
    super(components)

    this.inference = options.inference || new SemanticInference(symbolDatabase)
    this.compoundBuilder = options.compoundBuilder || new CompoundBuilder(symbolDatabase)
    this.resonanceCalc = options.resonanceCalc || new ResonanceCalculator()

    // Active symbols (derived from SMF state)
    this.activeSymbols = []

    // Symbol activation history
    this.symbolHistory = []
    this.maxHistory = options.maxHistory || 100

    // Compound representing current state
    this.currentCompound = null
  }

  /**
   * Create from base SedenionMemoryField
   */
  static fromSMF(smf, options = {}) {
    const symbolic = new SymbolicSMF(smf.s, options)
    return symbolic
  }

  /**
   * Map cultural tag to SMF axis index
   * @param {string} tag - Cultural tag
   * @returns {number} Axis index or -1 if not found
   */
  tagToAxis(tag) {
    const normalized = tag.toLowerCase().trim()
    return TAG_TO_AXIS[normalized] ?? -1
  }

  /**
   * Get the archetypal symbol for a given axis
   * @param {number|string} axis - Axis index or name
   * @returns {Object|null} Symbol or null
   */
  getAxisArchetype(axis) {
    const idx = typeof axis === 'string' ? AXIS_INDEX[axis] : axis
    const mapping = AXIS_SYMBOL_MAPPING[idx]

    if (!mapping) return null

    // Try each archetype until we find one
    for (const archetypeId of mapping.archetypes) {
      const symbol = symbolDatabase.getSymbol(archetypeId)
      if (symbol) return symbol
    }

    return null
  }

  /**
   * Ground current SMF orientation in archetypal symbols
   * Returns the symbols most aligned with the dominant axes
   *
   * @param {number} count - Number of symbols to return
   * @returns {Array} Array of {axis, symbol, alignment} objects
   */
  groundInSymbols(count = 3) {
    const dominant = this.dominantAxes(count)
    const grounded = []

    for (const axis of dominant) {
      const symbol = this.getAxisArchetype(axis.index)
      if (symbol) {
        grounded.push({
          axis: axis.name,
          axisValue: axis.value,
          symbol: symbol,
          alignment: Math.abs(axis.value), // How strongly aligned
          isPositive: axis.value >= 0,
        })
      }
    }

    this.activeSymbols = grounded.map((g) => g.symbol)
    return grounded
  }

  /**
   * Excite SMF from a symbol activation
   * Maps symbol's prime and cultural tags to SMF axes
   *
   * @param {string} symbolId - Symbol ID to activate
   * @param {number} intensity - Activation intensity (0-1)
   * @returns {boolean} True if symbol was found and applied
   */
  exciteFromSymbol(symbolId, intensity = 0.3) {
    const symbol = symbolDatabase.getSymbol(symbolId)
    if (!symbol) return false

    // Primary axis: map prime to axis via log2
    const primaryAxis = Math.floor(Math.log2(symbol.prime)) % 16
    this.s[primaryAxis] = Math.min(1, this.s[primaryAxis] + intensity)

    // Secondary axes from cultural tags
    const tagIntensity = intensity * 0.3
    for (const tag of symbol.culturalTags.slice(0, 5)) {
      const axisIdx = this.tagToAxis(tag)
      if (axisIdx >= 0 && axisIdx !== primaryAxis) {
        this.s[axisIdx] = Math.min(1, this.s[axisIdx] + tagIntensity)
      }
    }

    // Category-based axis (from mapping)
    const categoryAxis = this.categoryToAxis(symbol.category)
    if (categoryAxis >= 0 && categoryAxis !== primaryAxis) {
      this.s[categoryAxis] = Math.min(1, this.s[categoryAxis] + tagIntensity)
    }

    this.normalize()

    // Record to history
    this.symbolHistory.push({
      symbolId,
      symbol,
      intensity,
      timestamp: Date.now(),
      primaryAxis,
      smfSnapshot: this.s.slice(),
    })

    if (this.symbolHistory.length > this.maxHistory) {
      this.symbolHistory.shift()
    }

    return true
  }

  /**
   * Map symbol category to primary axis
   */
  categoryToAxis(category) {
    const mapping = {
      [SymbolCategory.ARCHETYPE]: 1, // identity
      [SymbolCategory.ELEMENT]: 5, // life
      [SymbolCategory.PLACE]: 14, // space
      [SymbolCategory.OBJECT]: 3, // structure
      [SymbolCategory.ABSTRACT]: 0, // coherence
      [SymbolCategory.MYTHOLOGICAL]: 12, // power
      [SymbolCategory.TAROT]: 4, // change
      [SymbolCategory.ICHING]: 2, // duality
    }
    return mapping[category] ?? 0
  }

  /**
   * Excite SMF from multiple symbols simultaneously
   * Uses resonance weighting to determine relative intensities
   *
   * @param {Array<string>} symbolIds - Array of symbol IDs
   * @param {number} baseIntensity - Base intensity for each
   */
  exciteFromSymbols(symbolIds, baseIntensity = 0.2) {
    const symbols = symbolIds.map((id) => symbolDatabase.getSymbol(id)).filter(Boolean)

    if (symbols.length === 0) return

    // Calculate resonance weights
    const weights = []
    for (let i = 0; i < symbols.length; i++) {
      let totalResonance = 0
      for (let j = 0; j < symbols.length; j++) {
        if (i !== j) {
          totalResonance += this.resonanceCalc.calculateResonance(
            symbols[i].prime,
            symbols[j].prime,
          )
        }
      }
      weights.push(1 + totalResonance / symbols.length)
    }

    // Normalize weights
    const maxWeight = Math.max(...weights)
    const normalizedWeights = weights.map((w) => w / maxWeight)

    // Apply excitations with resonance weighting
    for (let i = 0; i < symbols.length; i++) {
      this.exciteFromSymbol(symbols[i].id, baseIntensity * normalizedWeights[i])
    }
  }

  /**
   * Infer symbols from text and excite SMF
   *
   * @param {string} text - Text to process
   * @param {number} intensity - Activation intensity
   * @returns {Array} Inferred symbols
   */
  exciteFromText(text, intensity = 0.3) {
    const results = this.inference.inferWithResonance(text, {
      maxCandidates: 10,
      useAttention: true,
    })

    for (const result of results) {
      this.exciteFromSymbol(
        result.symbol.id,
        intensity * result.confidence * (result.attentionWeight || 1),
      )
    }

    return results
  }

  /**
   * Create a compound symbol from current SMF state
   * Combines the active symbols into a unified concept
   *
   * @param {string} id - ID for the compound
   * @param {string} meaning - Meaning description
   * @returns {CompoundSymbol|null} Created compound or null
   */
  createCompoundFromState(id, meaning = null) {
    const grounded = this.groundInSymbols(4)

    if (grounded.length < 2) return null

    const symbols = grounded.map((g) => g.symbol)
    const culturalTags = ['smf-derived', ...grounded.map((g) => g.axis)]

    const defaultMeaning = `SMF compound: ${grounded
      .map((g) => `${g.axis}(${g.symbol.id})`)
      .join(' + ')}`

    try {
      this.currentCompound = this.compoundBuilder.createCompoundFromSymbols(
        id,
        symbols,
        meaning || defaultMeaning,
        culturalTags,
      )
      return this.currentCompound
    } catch (e) {
      console.debug('Failed to create compound:', e.message)
      return null
    }
  }

  /**
   * Calculate resonance between SMF state and a symbol
   *
   * @param {string} symbolId - Symbol to check
   * @returns {number} Resonance score 0-1
   */
  resonanceWithSymbol(symbolId) {
    const symbol = symbolDatabase.getSymbol(symbolId)
    if (!symbol) return 0

    // Get axis activations from symbol
    const primaryAxis = Math.floor(Math.log2(symbol.prime)) % 16
    let resonance = Math.abs(this.s[primaryAxis])

    // Add tag-based resonance
    let tagResonance = 0
    let tagCount = 0
    for (const tag of symbol.culturalTags) {
      const axisIdx = this.tagToAxis(tag)
      if (axisIdx >= 0) {
        tagResonance += Math.abs(this.s[axisIdx])
        tagCount++
      }
    }

    if (tagCount > 0) {
      resonance = resonance * 0.6 + (tagResonance / tagCount) * 0.4
    }

    return Math.min(1, resonance)
  }

  /**
   * Find most resonant symbols with current SMF state
   *
   * @param {number} count - Number of symbols to return
   * @param {string} category - Optional category filter
   * @returns {Array} Array of {symbol, resonance} objects
   */
  findResonantSymbols(count = 5, category = null) {
    const candidates = category
      ? symbolDatabase.getSymbolsByCategory(category) || []
      : symbolDatabase.getAllSymbols()

    const scored = candidates.map((symbol) => ({
      symbol,
      resonance: this.resonanceWithSymbol(symbol.id),
    }))

    scored.sort((a, b) => b.resonance - a.resonance)
    return scored.slice(0, count)
  }

  /**
   * Get symbol history statistics
   */
  getSymbolStats() {
    if (this.symbolHistory.length === 0) {
      return {
        totalActivations: 0,
        uniqueSymbols: 0,
        mostActive: [],
        recentSymbols: [],
      }
    }

    const symbolCounts = new Map()
    for (const entry of this.symbolHistory) {
      const count = symbolCounts.get(entry.symbolId) || 0
      symbolCounts.set(entry.symbolId, count + 1)
    }

    const sorted = Array.from(symbolCounts.entries()).sort((a, b) => b[1] - a[1])

    return {
      totalActivations: this.symbolHistory.length,
      uniqueSymbols: symbolCounts.size,
      mostActive: sorted.slice(0, 5).map(([id, count]) => ({
        symbolId: id,
        symbol: symbolDatabase.getSymbol(id),
        count,
      })),
      recentSymbols: this.symbolHistory.slice(-5).map((h) => ({
        symbolId: h.symbolId,
        intensity: h.intensity,
        timestamp: h.timestamp,
      })),
    }
  }

  /**
   * Clear symbol history
   */
  clearHistory() {
    this.symbolHistory = []
    this.activeSymbols = []
    this.currentCompound = null
  }

  /**
   * Enhanced JSON serialization
   */
  toJSON() {
    const base = super.toJSON()
    const grounded = this.groundInSymbols(3)

    return {
      ...base,
      symbolic: {
        groundedSymbols: grounded.map((g) => ({
          axis: g.axis,
          symbolId: g.symbol.id,
          symbolUnicode: g.symbol.unicode,
          alignment: g.alignment,
        })),
        currentCompound: this.currentCompound?.toJSON() || null,
        historyStats: this.getSymbolStats(),
      },
    }
  }

  /**
   * String representation with symbols
   */
  toString() {
    const grounded = this.groundInSymbols(3)
    const symbols = grounded.map((g) => g.symbol.unicode).join('')
    const axes = grounded.map((g) => `${g.axis}:${g.axisValue.toFixed(2)}`).join(', ')
    return `SymbolicSMF(${symbols} | ${axes})`
  }
}

// ═══════════════════════════════════════════════════════════════════
// SMF Symbol Mapper (Utility Class)
// ═══════════════════════════════════════════════════════════════════

/**
 * Utility class for mapping between symbols and SMF orientations
 */
class SMFSymbolMapper {
  constructor() {
    this.resonanceCalc = new ResonanceCalculator()
  }

  /**
   * Create SMF orientation from a symbol
   * @param {Object} symbol - Symbol object
   * @returns {SymbolicSMF} SMF oriented toward symbol
   */
  symbolToSMF(symbol) {
    const smf = new SymbolicSMF()
    smf.s.fill(0)
    smf.exciteFromSymbol(symbol.id, 1.0)
    return smf
  }

  /**
   * Create SMF from multiple symbols with resonance weighting
   * @param {Array} symbols - Array of symbol objects
   * @returns {SymbolicSMF} Combined SMF
   */
  symbolsToSMF(symbols) {
    const smf = new SymbolicSMF()
    smf.s.fill(0)
    smf.exciteFromSymbols(
      symbols.map((s) => s.id),
      0.5,
    )
    return smf
  }

  /**
   * Create SMF from compound symbol
   * @param {CompoundSymbol} compound - Compound symbol
   * @returns {SymbolicSMF} SMF from compound components
   */
  compoundToSMF(compound) {
    return this.symbolsToSMF(compound.components)
  }

  /**
   * Create SMF from symbol sequence (with temporal weighting)
   * @param {SymbolSequence} sequence - Symbol sequence
   * @param {number} recencyBias - How much to weight recent symbols (0-1)
   * @returns {SymbolicSMF} SMF with recency-weighted symbols
   */
  sequenceToSMF(sequence, recencyBias = 0.3) {
    const smf = new SymbolicSMF()
    smf.s.fill(0)

    const symbols = sequence.symbols
    const n = symbols.length

    for (let i = 0; i < n; i++) {
      // Weight increases with position (recency)
      const position = i / (n - 1 || 1) // 0 to 1
      const weight = 1 - recencyBias + recencyBias * position
      smf.exciteFromSymbol(symbols[i].id, 0.3 * weight)
    }

    return smf
  }

  /**
   * Find best matching symbol for an SMF orientation
   * @param {SedenionMemoryField} smf - SMF to match
   * @param {string} category - Optional category filter
   * @returns {Object|null} Best matching symbol
   */
  findBestMatch(smf, category = null) {
    const symbolic = smf instanceof SymbolicSMF ? smf : SymbolicSMF.fromSMF(smf)

    const resonant = symbolic.findResonantSymbols(1, category)
    return resonant.length > 0 ? resonant[0].symbol : null
  }

  /**
   * Calculate symbolic distance between two SMFs
   * Uses symbol-grounded comparison
   * @param {SedenionMemoryField} smf1 - First SMF
   * @param {SedenionMemoryField} smf2 - Second SMF
   * @returns {number} Distance 0-1 (0 = same, 1 = opposite)
   */
  symbolicDistance(smf1, smf2) {
    const s1 = smf1 instanceof SymbolicSMF ? smf1 : SymbolicSMF.fromSMF(smf1)
    const s2 = smf2 instanceof SymbolicSMF ? smf2 : SymbolicSMF.fromSMF(smf2)

    const g1 = s1.groundInSymbols(5)
    const g2 = s2.groundInSymbols(5)

    // Compare symbol sets
    const primes1 = new Set(g1.map((g) => g.symbol.prime))
    const primes2 = new Set(g2.map((g) => g.symbol.prime))

    // Jaccard similarity on prime sets
    const intersection = new Set([...primes1].filter((p) => primes2.has(p)))
    const union = new Set([...primes1, ...primes2])

    const jaccard = union.size > 0 ? intersection.size / union.size : 0

    // Also use standard coherence
    const coherence = s1.coherence(s2)

    // Combined metric
    return 1 - (0.5 * jaccard + 0.5 * Math.abs(coherence))
  }
}

// Singleton instance
const smfMapper = new SMFSymbolMapper()

module.exports = {
  SymbolicSMF,
  SMFSymbolMapper,
  smfMapper,

  // Mappings (for external use)
  AXIS_SYMBOL_MAPPING,
  TAG_TO_AXIS,

  // Convenience functions
  createSymbolicSMF: (components, options) => new SymbolicSMF(components, options),
  fromSMF: (smf, options) => SymbolicSMF.fromSMF(smf, options),
  symbolToSMF: (symbol) => smfMapper.symbolToSMF(symbol),
  symbolsToSMF: (symbols) => smfMapper.symbolsToSMF(symbols),
}
