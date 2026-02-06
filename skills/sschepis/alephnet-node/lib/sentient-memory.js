/**
 * Sentient Memory System
 *
 * Enhanced memory for the Sentient Observer integrating:
 * - Holographic Quantum Encoding (HQE) for distributed storage
 * - Moment-based temporal indexing
 * - Entanglement-based associative recall
 * - SMF-tagged memories for semantic orientation
 *
 * v1.2.1 Enhancements:
 * - PRGraphMemory integration for resonance-based retrieval
 * - SparsePrimeState support for quaternionic memory traces
 * - Entropy-locked stable memories
 *
 * Builds upon the existing ContextMemory system.
 */

const fs = require('fs')
const path = require('path')
const { HolographicMemory, HolographicEncoder } = require('./hqe')
const { EntangledPair, Phrase } = require('./entanglement')
const { Moment } = require('./temporal')

// Import from @aleph-ai/tinyaleph npm package
const tinyaleph = require('@aleph-ai/tinyaleph')
const { Complex, PrimeState, SparsePrimeState } = tinyaleph

// PRGraphMemory and resonanceScore - create local implementation using tinyaleph primitives
class PRGraphMemory {
  constructor(numPrimes = 4096, lockThreshold = 0.8) {
    this.numPrimes = numPrimes
    this.lockThreshold = lockThreshold
    this.entries = new Map()
  }

  put(key, state, metadata = {}) {
    this.entries.set(key, {
      state,
      metadata,
      entropy: 1.0,
      accessCount: 0,
      locked: false,
    })
  }

  get(queryState, topK = 10) {
    const results = []
    for (const [key, entry] of this.entries) {
      const score = this._resonanceScore(queryState, entry.state)
      entry.accessCount++
      if (entry.entropy < this.lockThreshold && entry.accessCount > 5) {
        entry.locked = true
      }
      results.push({ key, score, ...entry })
    }
    return results.sort((a, b) => b.score - a.score).slice(0, topK)
  }

  _resonanceScore(state1, state2) {
    // Simple overlap-based resonance
    let overlap = 0
    if (state1 && state1.state && state2 && state2.state) {
      for (const [prime, amp1] of state1.state) {
        const amp2 = state2.state.get(prime)
        if (amp2) {
          const m1 = typeof amp1.norm === 'function' ? amp1.norm() : Math.abs(amp1)
          const m2 = typeof amp2.norm === 'function' ? amp2.norm() : Math.abs(amp2)
          overlap += m1 * m2
        }
      }
    }
    return overlap
  }

  getLockedMemories() {
    return Array.from(this.entries.values()).filter((e) => e.locked)
  }

  stats() {
    const entries = Array.from(this.entries.values())
    return {
      total: entries.length,
      locked: entries.filter((e) => e.locked).length,
      avgEntropy:
        entries.length > 0 ? entries.reduce((sum, e) => sum + e.entropy, 0) / entries.length : 0,
    }
  }
}

// PrimeonZLadderMulti - simplified hierarchical memory ladder
class PrimeonZLadderMulti {
  constructor(options = {}) {
    this.N = options.N || 64
    this.J = options.J || 0.25
    this.channels = new Map()

    for (const channelDef of options.zChannels || []) {
      this.channels.set(channelDef.name, {
        name: channelDef.name,
        leak: channelDef.leak || 0,
        decay: channelDef.decay || 0,
        amplitudes: new Float64Array(this.N),
        phases: new Float64Array(this.N),
        totalFlux: 0,
      })
    }

    this.coreAmplitudes = new Float64Array(this.N)
    this.corePhases = new Float64Array(this.N)
  }

  excitePrimes(primes, strength = 1.0) {
    for (const p of primes) {
      const idx = p % this.N
      this.coreAmplitudes[idx] += strength
    }
  }

  run(steps, dt) {
    const trajectory = []
    for (let i = 0; i < steps; i++) {
      // Simple decay and propagation
      for (let j = 0; j < this.N; j++) {
        this.coreAmplitudes[j] *= 1 - 0.01 * dt
      }

      // Propagate to channels
      for (const channel of this.channels.values()) {
        for (let j = 0; j < this.N; j++) {
          const flux = this.coreAmplitudes[j] * channel.leak * dt
          channel.amplitudes[j] += flux
          channel.amplitudes[j] *= 1 - channel.decay * dt
          channel.totalFlux += Math.abs(flux)
        }
      }

      trajectory.push(this.coreMetrics())
    }
    return trajectory
  }

  coreMetrics() {
    let totalEnergy = 0
    for (let i = 0; i < this.N; i++) {
      totalEnergy += this.coreAmplitudes[i] ** 2
    }
    return {
      entropy: -Math.log(totalEnergy + 1e-10) / Math.log(this.N),
      coherence: totalEnergy / this.N,
      energy: totalEnergy,
    }
  }

  channelMetrics() {
    const metrics = {}
    for (const [name, channel] of this.channels) {
      let totalEnergy = 0
      for (let i = 0; i < this.N; i++) {
        totalEnergy += channel.amplitudes[i] ** 2
      }
      metrics[name] = {
        entropy: -Math.log(totalEnergy + 1e-10) / Math.log(this.N),
        coherence: totalEnergy / this.N,
        totalFlux: channel.totalFlux,
      }
    }
    return metrics
  }

  rungProbabilities() {
    let total = 0
    for (let i = 0; i < this.N; i++) {
      total += this.coreAmplitudes[i] ** 2
    }
    return Array.from(this.coreAmplitudes).map((a) => (a * a) / (total + 1e-10))
  }

  entanglementEntropy() {
    const probs = this.rungProbabilities()
    let entropy = 0
    for (const p of probs) {
      if (p > 0) entropy -= p * Math.log(p)
    }
    return entropy
  }

  getChannel(name) {
    return this.channels.get(name)
  }

  metrics() {
    return {
      core: this.coreMetrics(),
      channels: this.channelMetrics(),
      totalZEntropy: this.entanglementEntropy(),
    }
  }

  measure() {
    const probs = this.rungProbabilities()
    const r = Math.random()
    let cumulative = 0
    for (let i = 0; i < this.N; i++) {
      cumulative += probs[i]
      if (r < cumulative) {
        return { outcome: i, probability: probs[i], metricsAfter: this.metrics() }
      }
    }
    return { outcome: this.N - 1, probability: probs[this.N - 1], metricsAfter: this.metrics() }
  }

  reset() {
    this.coreAmplitudes.fill(0)
    this.corePhases.fill(0)
    for (const channel of this.channels.values()) {
      channel.amplitudes.fill(0)
      channel.phases.fill(0)
      channel.totalFlux = 0
    }
  }
}

/**
 * Memory Trace - A single experiential memory
 *
 * Stores content along with its holographic projection,
 * temporal moment, SMF orientation, and entanglement context.
 */
class MemoryTrace {
  constructor(data = {}) {
    this.id = data.id || MemoryTrace.generateId()
    this.timestamp = data.timestamp || Date.now()

    // Content
    this.content = data.content || null
    this.type = data.type || 'experience' // 'experience' | 'insight' | 'emotion' | 'decision'

    // Prime-semantic representation
    this.primeState = data.primeState || null // PrimeState or serialized form
    this.activePrimes = data.activePrimes || []

    // Holographic field snapshot (compressed)
    this.holographicSnapshot = data.holographicSnapshot || null

    // Temporal context
    this.momentId = data.momentId || null
    this.subjectiveDuration = data.subjectiveDuration || 0

    // SMF orientation
    this.smfOrientation = data.smfOrientation || null // 16-component array

    // Entanglement context
    this.phraseId = data.phraseId || null
    this.entangledMemories = data.entangledMemories || [] // IDs of related memories

    // Retrieval metadata
    this.accessCount = data.accessCount || 0
    this.lastAccessed = data.lastAccessed || null
    this.strength = data.strength || 1.0

    // Tags and annotations
    this.tags = data.tags || []
    this.importance = data.importance || 0.5
  }

  static generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Access this memory (updates metadata)
   */
  access() {
    this.accessCount++
    this.lastAccessed = Date.now()
    // Strengthen with access
    this.strength = Math.min(1.0, this.strength + 0.05)
  }

  /**
   * Decay this memory
   */
  decay(rate = 0.01) {
    this.strength *= 1 - rate
  }

  /**
   * Get age in milliseconds
   */
  get age() {
    return Date.now() - this.timestamp
  }

  /**
   * Get recency score (0-1, 1 = recent)
   */
  get recency() {
    const hourMs = 60 * 60 * 1000
    return Math.exp(-this.age / (24 * hourMs)) // Decay over 24 hours
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      content: this.content,
      type: this.type,
      activePrimes: this.activePrimes,
      holographicSnapshot: this.holographicSnapshot,
      momentId: this.momentId,
      subjectiveDuration: this.subjectiveDuration,
      smfOrientation: this.smfOrientation,
      phraseId: this.phraseId,
      entangledMemories: this.entangledMemories,
      accessCount: this.accessCount,
      lastAccessed: this.lastAccessed,
      strength: this.strength,
      tags: this.tags,
      importance: this.importance,
    }
  }

  static fromJSON(data) {
    return new MemoryTrace(data)
  }
}

/**
 * Holographic Memory Bank
 *
 * Stores memories using holographic interference patterns
 * for content-addressable, distributed storage.
 */
class HolographicMemoryBank {
  constructor(options = {}) {
    this.gridSize = options.gridSize || 32
    this.primes = options.primes || 64

    this.holoMemory = new HolographicMemory(this.gridSize, this.primes, {
      maxMemories: options.maxHoloMemories || 100,
    })

    this.encoder = new HolographicEncoder(this.gridSize, this.primes)
  }

  /**
   * Store a memory trace holographically
   */
  store(trace, primeState) {
    // Get holographic snapshot
    this.encoder.project(primeState)
    trace.holographicSnapshot = this.encoder.getState()

    // Store in holographic memory
    this.holoMemory.store(primeState, {
      traceId: trace.id,
      timestamp: trace.timestamp,
      type: trace.type,
    })
  }

  /**
   * Recall similar memories
   */
  recall(primeState, threshold = 0.3) {
    return this.holoMemory.findSimilar(primeState, threshold)
  }

  /**
   * Decode a holographic snapshot back to prime state
   */
  decode(snapshot) {
    this.encoder.loadState(snapshot)
    return this.encoder.reconstructToState()
  }

  /**
   * Apply decay to all stored patterns
   */
  decay() {
    this.holoMemory.decay()
  }

  get count() {
    return this.holoMemory.count
  }

  toJSON() {
    return this.holoMemory.toJSON()
  }

  loadFromJSON(data) {
    this.holoMemory = HolographicMemory.fromJSON(data)
  }
}

/**
 * Temporal Memory Index
 *
 * Indexes memories by moments and subjective time.
 */
class TemporalMemoryIndex {
  constructor() {
    // Moment ID -> Memory IDs
    this.momentIndex = new Map()

    // Subjective time range -> Memory IDs
    this.timelineIndex = []
  }

  /**
   * Index a memory by its moment
   */
  indexByMoment(memory) {
    if (!memory.momentId) return

    if (!this.momentIndex.has(memory.momentId)) {
      this.momentIndex.set(memory.momentId, [])
    }
    this.momentIndex.get(memory.momentId).push(memory.id)
  }

  /**
   * Index by subjective time
   */
  indexByTime(memory, subjectiveTime) {
    this.timelineIndex.push({
      memoryId: memory.id,
      subjectiveTime,
      timestamp: memory.timestamp,
    })

    // Keep sorted by subjective time
    this.timelineIndex.sort((a, b) => a.subjectiveTime - b.subjectiveTime)
  }

  /**
   * Get memories from a moment
   */
  getByMoment(momentId) {
    return this.momentIndex.get(momentId) || []
  }

  /**
   * Get memories in subjective time range
   */
  getByTimeRange(startTime, endTime) {
    return this.timelineIndex
      .filter((e) => e.subjectiveTime >= startTime && e.subjectiveTime <= endTime)
      .map((e) => e.memoryId)
  }

  /**
   * Get recent memories by subjective time
   */
  getRecent(count = 10) {
    return this.timelineIndex.slice(-count).map((e) => e.memoryId)
  }

  clear() {
    this.momentIndex.clear()
    this.timelineIndex = []
  }

  toJSON() {
    return {
      momentIndex: Array.from(this.momentIndex.entries()),
      timelineIndex: this.timelineIndex,
    }
  }

  loadFromJSON(data) {
    if (data.momentIndex) {
      this.momentIndex = new Map(data.momentIndex)
    }
    if (data.timelineIndex) {
      this.timelineIndex = data.timelineIndex
    }
  }
}

/**
 * Entanglement Memory Index
 *
 * Indexes memories by entangled primes and phrases.
 */
class EntanglementMemoryIndex {
  constructor() {
    // Prime -> Memory IDs that involve this prime
    this.primeIndex = new Map()

    // Phrase ID -> Memory IDs
    this.phraseIndex = new Map()

    // Memory ID -> Memory IDs (entanglement links)
    this.entanglementGraph = new Map()
  }

  /**
   * Index a memory by its primes
   */
  indexByPrimes(memory) {
    for (const prime of memory.activePrimes) {
      if (!this.primeIndex.has(prime)) {
        this.primeIndex.set(prime, [])
      }
      this.primeIndex.get(prime).push(memory.id)
    }
  }

  /**
   * Index by phrase
   */
  indexByPhrase(memory) {
    if (!memory.phraseId) return

    if (!this.phraseIndex.has(memory.phraseId)) {
      this.phraseIndex.set(memory.phraseId, [])
    }
    this.phraseIndex.get(memory.phraseId).push(memory.id)
  }

  /**
   * Link two memories as entangled
   */
  linkMemories(memId1, memId2) {
    if (!this.entanglementGraph.has(memId1)) {
      this.entanglementGraph.set(memId1, new Set())
    }
    if (!this.entanglementGraph.has(memId2)) {
      this.entanglementGraph.set(memId2, new Set())
    }

    this.entanglementGraph.get(memId1).add(memId2)
    this.entanglementGraph.get(memId2).add(memId1)
  }

  /**
   * Get memories involving specific primes
   */
  getByPrimes(primes) {
    const memoryIds = new Set()
    for (const prime of primes) {
      const mems = this.primeIndex.get(prime) || []
      for (const id of mems) {
        memoryIds.add(id)
      }
    }
    return Array.from(memoryIds)
  }

  /**
   * Get memories from a phrase
   */
  getByPhrase(phraseId) {
    return this.phraseIndex.get(phraseId) || []
  }

  /**
   * Get entangled memories
   */
  getEntangled(memoryId) {
    const links = this.entanglementGraph.get(memoryId)
    return links ? Array.from(links) : []
  }

  /**
   * Spread activation through entanglement graph
   */
  spreadActivation(startIds, depth = 2) {
    const activation = new Map()
    let frontier = new Set(startIds)

    // Initial activation
    for (const id of startIds) {
      activation.set(id, 1.0)
    }

    for (let d = 0; d < depth; d++) {
      const newFrontier = new Set()
      const decay = Math.pow(0.5, d + 1)

      for (const id of frontier) {
        const linked = this.entanglementGraph.get(id)
        if (!linked) continue

        for (const linkedId of linked) {
          const current = activation.get(linkedId) || 0
          activation.set(linkedId, current + decay)
          newFrontier.add(linkedId)
        }
      }

      frontier = newFrontier
    }

    return Array.from(activation.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, strength]) => ({ id, strength }))
  }

  clear() {
    this.primeIndex.clear()
    this.phraseIndex.clear()
    this.entanglementGraph.clear()
  }

  toJSON() {
    return {
      primeIndex: Array.from(this.primeIndex.entries()),
      phraseIndex: Array.from(this.phraseIndex.entries()),
      entanglementGraph: Array.from(this.entanglementGraph.entries()).map(([k, v]) => [
        k,
        Array.from(v),
      ]),
    }
  }

  loadFromJSON(data) {
    if (data.primeIndex) {
      this.primeIndex = new Map(data.primeIndex)
    }
    if (data.phraseIndex) {
      this.phraseIndex = new Map(data.phraseIndex)
    }
    if (data.entanglementGraph) {
      this.entanglementGraph = new Map(data.entanglementGraph.map(([k, v]) => [k, new Set(v)]))
    }
  }
}

/**
 * Sentient Memory System
 *
 * Complete memory system for the sentient observer integrating
 * holographic, temporal, and entanglement-based memory.
 */
class SentientMemory {
  constructor(options = {}) {
    // Core storage
    this.traces = new Map() // id -> MemoryTrace
    this.maxTraces = options.maxTraces || 1000

    // Holographic memory
    this.holographicBank = new HolographicMemoryBank({
      gridSize: options.holoGridSize || 32,
      primes: options.primes || 64,
    })

    // v1.2.1: PRGraph resonance memory
    this.prGraphMemory = new PRGraphMemory(options.numPrimes || 4096, options.lockThreshold || 0.8)

    // v1.2.1: Multi-Z Channel Ladder for hierarchical memory
    // Three memory channels: fast (working), slow (episodic), permanent (semantic)
    this.zLadder = new PrimeonZLadderMulti({
      N: options.ladderRungs || 64,
      d: 1,
      J: options.ladderCoupling || 0.25,
      zChannels: options.zChannels || [
        { name: 'working', dz: 1, leak: 0.2, decay: 0.05 }, // Fast decay - working memory
        { name: 'episodic', dz: 1, leak: 0.02, decay: 0.005 }, // Medium decay - episodic memory
        { name: 'semantic', dz: 1, leak: 0.002, decay: 0 }, // No decay - semantic memory
      ],
      periodic: true,
    })

    // Temporal index
    this.temporalIndex = new TemporalMemoryIndex()

    // Entanglement index
    this.entanglementIndex = new EntanglementMemoryIndex()

    // SMF-based semantic index (orientation -> memory IDs)
    this.smfIndex = []

    // Current subjective time
    this.subjectiveTime = 0

    // Persistence
    this.storePath = options.storePath

    // Decay settings
    this.decayRate = options.decayRate || 0.001
    this.minStrength = options.minStrength || 0.1

    // Load if path exists
    if (this.storePath) {
      this.load()
    }
  }

  /**
   * Store a new memory
   * @param {Object} content - Memory content
   * @param {Object} context - Context including primeState, moment, smf, etc.
   */
  store(content, context = {}) {
    const trace = new MemoryTrace({
      content,
      type: context.type || 'experience',
      activePrimes: context.activePrimes || [],
      momentId: context.momentId,
      subjectiveDuration: context.subjectiveDuration || 0,
      phraseId: context.phraseId,
      tags: context.tags || [],
      importance: context.importance || 0.5,
    })

    // Store SMF orientation
    if (context.smf) {
      trace.smfOrientation = Array.isArray(context.smf) ? context.smf : context.smf.s.slice()
    }

    // Holographic encoding
    if (context.primeState) {
      this.holographicBank.store(trace, context.primeState)
    }

    // v1.2.1: Store in PRGraph memory for resonance-based retrieval
    if (context.activePrimes && context.activePrimes.length > 0) {
      const sparseState = this._createSparseState(context.activePrimes, context.primeState)
      this.prGraphMemory.put(trace.id, sparseState, {
        traceId: trace.id,
        type: trace.type,
        importance: trace.importance,
        timestamp: trace.timestamp,
      })

      // v1.2.1: Excite Z-ladder with active primes for hierarchical storage
      this.zLadder.excitePrimes(context.activePrimes, trace.importance)
      // Run a few steps to allow memory propagation to channels
      this.zLadder.run(10, 0.01)
    }

    // Update subjective time
    this.subjectiveTime += trace.subjectiveDuration

    // Index
    this.temporalIndex.indexByMoment(trace)
    this.temporalIndex.indexByTime(trace, this.subjectiveTime)
    this.entanglementIndex.indexByPrimes(trace)
    this.entanglementIndex.indexByPhrase(trace)

    // SMF index (store orientation for similarity search)
    if (trace.smfOrientation) {
      this.smfIndex.push({
        memoryId: trace.id,
        orientation: trace.smfOrientation,
      })
    }

    // Store trace
    this.traces.set(trace.id, trace)

    // Prune if necessary
    if (this.traces.size > this.maxTraces) {
      this.prune()
    }

    return trace
  }

  /**
   * v1.2.1: Create SparsePrimeState from active primes
   * @private
   */
  _createSparseState(activePrimes, primeState) {
    const sparseState = new SparsePrimeState(4096, activePrimes.length)

    for (let i = 0; i < activePrimes.length; i++) {
      const prime = activePrimes[i]
      let amplitude = null

      // Try to get amplitude from primeState if available
      if (primeState && primeState.state) {
        amplitude = primeState.state.get(prime)
      }

      if (!amplitude) {
        // Create default amplitude with phase based on position
        const phase = (2 * Math.PI * i) / activePrimes.length
        amplitude = new Complex(
          Math.cos(phase) / Math.sqrt(activePrimes.length),
          Math.sin(phase) / Math.sqrt(activePrimes.length),
        )
      }

      sparseState.set(prime, amplitude)
    }

    return sparseState.normalize()
  }

  /**
   * Recall memories by holographic similarity
   */
  recallBySimilarity(primeState, options = {}) {
    const threshold = options.threshold || 0.3
    const maxResults = options.maxResults || 10

    const holoResults = this.holographicBank.recall(primeState, threshold)

    const results = []
    for (const result of holoResults.slice(0, maxResults)) {
      const trace = this.traces.get(result.metadata?.traceId)
      if (trace) {
        trace.access()
        results.push({
          trace,
          score: result.score,
          strength: result.strength,
          source: 'holographic',
        })
      }
    }

    return results
  }

  /**
   * v1.2.1: Recall memories by resonance score
   * Uses PRGraphMemory for prime-resonance-based retrieval
   * @param {Array<number>} activePrimes - Query primes
   * @param {Object} options - Retrieval options
   */
  recallByResonance(activePrimes, options = {}) {
    const topK = options.maxResults || 10

    // Create query state from active primes
    const queryState = this._createSparseState(activePrimes)

    // Query PRGraph memory
    const prResults = this.prGraphMemory.get(queryState, topK)

    const results = []
    for (const result of prResults) {
      const trace = this.traces.get(result.metadata?.traceId || result.key)
      if (trace) {
        trace.access()
        results.push({
          trace,
          score: result.score,
          entropy: result.entropy,
          locked: result.locked,
          source: 'resonance',
        })
      }
    }

    return results
  }

  /**
   * v1.2.1: Combined recall using both holographic and resonance methods
   * Merges results and deduplicates by trace ID
   * @param {Object} primeState - Prime state for holographic recall
   * @param {Array<number>} activePrimes - Active primes for resonance recall
   * @param {Object} options - Retrieval options
   */
  recallCombined(primeState, activePrimes, options = {}) {
    const maxResults = options.maxResults || 10
    const holoWeight = options.holoWeight ?? 0.5
    const resonanceWeight = 1 - holoWeight

    // Get results from both sources
    const holoResults = this.recallBySimilarity(primeState, {
      maxResults: maxResults * 2,
      threshold: options.threshold || 0.3,
    })

    const resonanceResults = this.recallByResonance(activePrimes, {
      maxResults: maxResults * 2,
    })

    // Merge and score
    const scoreMap = new Map()

    for (const result of holoResults) {
      const id = result.trace.id
      const existing = scoreMap.get(id) || { trace: result.trace, holoScore: 0, resScore: 0 }
      existing.holoScore = result.score
      scoreMap.set(id, existing)
    }

    for (const result of resonanceResults) {
      const id = result.trace.id
      const existing = scoreMap.get(id) || { trace: result.trace, holoScore: 0, resScore: 0 }
      existing.resScore = result.score
      existing.locked = result.locked
      scoreMap.set(id, existing)
    }

    // Compute combined scores
    const combined = Array.from(scoreMap.values()).map((entry) => ({
      trace: entry.trace,
      combinedScore: holoWeight * entry.holoScore + resonanceWeight * entry.resScore,
      holoScore: entry.holoScore,
      resonanceScore: entry.resScore,
      locked: entry.locked,
      source: 'combined',
    }))

    // Sort by combined score
    combined.sort((a, b) => b.combinedScore - a.combinedScore)

    return combined.slice(0, maxResults)
  }

  /**
   * v1.2.1: Get locked (stable) memories from PRGraph
   * These are memories that have been accessed frequently and have low entropy
   */
  getLockedMemories() {
    const lockedEntries = this.prGraphMemory.getLockedMemories()

    return lockedEntries
      .map((entry) => ({
        trace: this.traces.get(entry.metadata?.traceId || entry.key),
        entropy: entry.entropy,
        accessCount: entry.accessCount,
      }))
      .filter((result) => result.trace)
  }

  /**
   * v1.2.1: Get hierarchical memory state from Z-ladder channels
   * Returns the current state of working, episodic, and semantic memory channels
   */
  getHierarchicalMemoryState() {
    const metrics = this.zLadder.channelMetrics()
    const rungProbs = this.zLadder.rungProbabilities()

    return {
      working: metrics.working,
      episodic: metrics.episodic,
      semantic: metrics.semantic,
      coreCoherence: this.zLadder.coreMetrics().coherence,
      rungDistribution: rungProbs,
      entanglementEntropy: this.zLadder.entanglementEntropy(),
    }
  }

  /**
   * v1.2.1: Query a specific memory channel
   * @param {string} channelName - 'working', 'episodic', or 'semantic'
   */
  queryChannel(channelName) {
    const channel = this.zLadder.getChannel(channelName)
    if (!channel) {
      throw new Error(`Unknown memory channel: ${channelName}`)
    }
    return channel.metrics()
  }

  /**
   * v1.2.1: Consolidate memory from working to episodic to semantic
   * Simulates sleep-like memory consolidation process
   * @param {number} steps - Number of consolidation steps
   */
  consolidateMemory(steps = 100) {
    // Run the Z-ladder to allow natural flow from fast to slow channels
    const trajectory = this.zLadder.run(steps, 0.01)

    // Return the final state and trajectory summary
    const finalMetrics = this.zLadder.metrics()

    return {
      stepsRun: steps,
      finalState: finalMetrics,
      trajectoryEntropy: trajectory.map((m) => m.core.entropy),
      workingToEpisodicFlux: this.zLadder.getChannel('episodic')?.totalFlux || 0,
      episodicToSemanticFlux: this.zLadder.getChannel('semantic')?.totalFlux || 0,
    }
  }

  /**
   * v1.2.1: Prime-based recall from Z-ladder
   * Excites specific primes and measures which channels respond
   * @param {Array<number>} primes - Primes to query
   */
  recallFromHierarchy(primes) {
    // Excite the ladder with query primes
    this.zLadder.excitePrimes(primes, 0.5)

    // Run to let the system respond
    this.zLadder.run(20, 0.01)

    // Sample the most active rungs
    const rungProbs = this.zLadder.rungProbabilities()

    // Get top responding rungs (these correspond to primes in memory)
    const topRungs = rungProbs
      .map((prob, idx) => ({ rung: idx, probability: prob }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10)

    // Get channel contributions
    const channels = this.getHierarchicalMemoryState()

    return {
      topRungs,
      channels,
      coreMetrics: this.zLadder.coreMetrics(),
    }
  }

  /**
   * v1.2.1: Measure memory and collapse to most probable rung
   * Returns the collapsed rung and associated memories
   */
  measureAndCollapse() {
    const result = this.zLadder.measure()

    // Find memories associated with the measured rung (prime)
    const measuredPrime = result.outcome
    const associatedMemories = this.entanglementIndex.getByPrimes([measuredPrime])

    return {
      collapsedRung: result.outcome,
      probability: result.probability,
      associatedMemoryIds: associatedMemories.slice(0, 10),
      metricsAfter: result.metricsAfter,
    }
  }

  /**
   * Recall by SMF orientation similarity
   */
  recallBySMFOrientation(orientation, options = {}) {
    const threshold = options.threshold || 0.5
    const maxResults = options.maxResults || 10

    const results = []

    for (const entry of this.smfIndex) {
      const similarity = this.smfSimilarity(orientation, entry.orientation)
      if (similarity > threshold) {
        const trace = this.traces.get(entry.memoryId)
        if (trace) {
          results.push({ trace, similarity })
        }
      }
    }

    results.sort((a, b) => b.similarity - a.similarity)

    for (const result of results.slice(0, maxResults)) {
      result.trace.access()
    }

    return results.slice(0, maxResults)
  }

  /**
   * Compute SMF orientation similarity (cosine)
   */
  smfSimilarity(o1, o2) {
    if (o1.length !== o2.length) return 0

    let dot = 0,
      mag1 = 0,
      mag2 = 0
    for (let i = 0; i < o1.length; i++) {
      dot += o1[i] * o2[i]
      mag1 += o1[i] * o1[i]
      mag2 += o2[i] * o2[i]
    }

    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2) + 1e-10)
  }

  /**
   * Recall by entangled primes
   */
  recallByPrimes(primes, options = {}) {
    const maxResults = options.maxResults || 10
    const memoryIds = this.entanglementIndex.getByPrimes(primes)

    const results = []
    for (const id of memoryIds.slice(0, maxResults)) {
      const trace = this.traces.get(id)
      if (trace) {
        trace.access()
        results.push(trace)
      }
    }

    return results
  }

  /**
   * Recall by spreading activation from seed memories
   */
  recallByAssociation(seedIds, options = {}) {
    const depth = options.depth || 2
    const maxResults = options.maxResults || 10

    const activated = this.entanglementIndex.spreadActivation(seedIds, depth)

    const results = []
    for (const { id, strength } of activated.slice(0, maxResults)) {
      const trace = this.traces.get(id)
      if (trace) {
        trace.access()
        results.push({ trace, activationStrength: strength })
      }
    }

    return results
  }

  /**
   * Recall by moment
   */
  recallByMoment(momentId) {
    const ids = this.temporalIndex.getByMoment(momentId)
    return ids.map((id) => this.traces.get(id)).filter((t) => t)
  }

  /**
   * Recall by subjective time range
   */
  recallByTimeRange(startTime, endTime) {
    const ids = this.temporalIndex.getByTimeRange(startTime, endTime)
    return ids.map((id) => this.traces.get(id)).filter((t) => t)
  }

  /**
   * Get recent memories
   */
  getRecent(count = 10) {
    const ids = this.temporalIndex.getRecent(count)
    return ids.map((id) => this.traces.get(id)).filter((t) => t)
  }

  /**
   * Link two memories as entangled
   */
  linkMemories(id1, id2) {
    this.entanglementIndex.linkMemories(id1, id2)

    const trace1 = this.traces.get(id1)
    const trace2 = this.traces.get(id2)

    if (trace1 && !trace1.entangledMemories.includes(id2)) {
      trace1.entangledMemories.push(id2)
    }
    if (trace2 && !trace2.entangledMemories.includes(id1)) {
      trace2.entangledMemories.push(id1)
    }
  }

  /**
   * Apply decay to all memories
   */
  decay() {
    for (const trace of this.traces.values()) {
      trace.decay(this.decayRate)
    }
    this.holographicBank.decay()
  }

  /**
   * Prune weak memories
   */
  prune() {
    const toRemove = []

    for (const [id, trace] of this.traces) {
      if (trace.strength < this.minStrength && trace.importance < 0.7) {
        toRemove.push(id)
      }
    }

    // If still over capacity, remove oldest weak memories
    if (this.traces.size - toRemove.length > this.maxTraces) {
      const sorted = Array.from(this.traces.values())
        .filter((t) => !toRemove.includes(t.id))
        .sort((a, b) => {
          // Score by strength, importance, recency
          const scoreA = a.strength * 0.3 + a.importance * 0.3 + a.recency * 0.4
          const scoreB = b.strength * 0.3 + b.importance * 0.3 + b.recency * 0.4
          return scoreA - scoreB
        })

      const removeCount = this.traces.size - this.maxTraces
      for (let i = 0; i < removeCount && i < sorted.length; i++) {
        toRemove.push(sorted[i].id)
      }
    }

    for (const id of toRemove) {
      this.traces.delete(id)
    }
  }

  /**
   * Get memory by ID
   */
  get(id) {
    return this.traces.get(id)
  }

  /**
   * Import a trace from an external source (e.g., another node)
   * @param {Object} data - Trace data from external source
   */
  importTrace(data) {
    const trace = new MemoryTrace({
      content: data.content,
      type: data.type || 'imported',
      timestamp: data.originalTimestamp || Date.now(),
      tags: ['imported', data.sourceNode ? `from:${data.sourceNode}` : 'external'].filter(Boolean),
      importance: 0.4, // Lower importance for imported traces
      strength: 0.7, // Start with slightly lower strength
    })

    // If quaternion orientation is provided, use it as SMF approximation
    if (data.quaternion && Array.isArray(data.quaternion)) {
      // Quaternion is 4-component, expand to 16 by padding with zeros
      trace.smfOrientation = [...data.quaternion, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].slice(0, 16)
    }

    // Store the trace
    this.traces.set(trace.id, trace)

    // Index temporally
    this.temporalIndex.indexByTime(trace, this.subjectiveTime)

    // SMF index if orientation available
    if (trace.smfOrientation) {
      this.smfIndex.push({
        memoryId: trace.id,
        orientation: trace.smfOrientation,
      })
    }

    return trace
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalStrength = 0
    let totalImportance = 0
    const typeCount = {}

    for (const trace of this.traces.values()) {
      totalStrength += trace.strength
      totalImportance += trace.importance
      typeCount[trace.type] = (typeCount[trace.type] || 0) + 1
    }

    // v1.2.1: Include PRGraph stats
    const prGraphStats = this.prGraphMemory.stats()

    // v1.2.1: Get Z-ladder metrics
    const zLadderMetrics = this.zLadder.metrics()

    return {
      traceCount: this.traces.size,
      holographicCount: this.holographicBank.count,
      averageStrength: this.traces.size > 0 ? totalStrength / this.traces.size : 0,
      averageImportance: this.traces.size > 0 ? totalImportance / this.traces.size : 0,
      subjectiveTime: this.subjectiveTime,
      typeDistribution: typeCount,
      // v1.2.1: PRGraph memory stats
      prGraph: {
        total: prGraphStats.total,
        locked: prGraphStats.locked,
        avgEntropy: prGraphStats.avgEntropy,
      },
      // v1.2.1: Z-ladder hierarchical memory stats
      zLadder: {
        coreEntropy: zLadderMetrics.core.entropy,
        coreCoherence: zLadderMetrics.core.coherence,
        totalZEntropy: zLadderMetrics.totalZEntropy,
        channels: Object.entries(zLadderMetrics.channels).reduce((acc, [name, m]) => {
          acc[name] = { entropy: m.entropy, coherence: m.coherence, flux: m.totalFlux }
          return acc
        }, {}),
      },
    }
  }

  /**
   * Save to disk
   */
  save() {
    if (!this.storePath) return

    const dir = path.dirname(this.storePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const data = {
      traces: Array.from(this.traces.values()).map((t) => t.toJSON()),
      temporalIndex: this.temporalIndex.toJSON(),
      entanglementIndex: this.entanglementIndex.toJSON(),
      smfIndex: this.smfIndex,
      subjectiveTime: this.subjectiveTime,
    }

    fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2))
  }

  /**
   * Load from disk
   */
  load() {
    if (!this.storePath || !fs.existsSync(this.storePath)) return

    try {
      const data = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))

      if (data.traces) {
        for (const traceData of data.traces) {
          const trace = MemoryTrace.fromJSON(traceData)
          this.traces.set(trace.id, trace)
        }
      }

      if (data.temporalIndex) {
        this.temporalIndex.loadFromJSON(data.temporalIndex)
      }

      if (data.entanglementIndex) {
        this.entanglementIndex.loadFromJSON(data.entanglementIndex)
      }

      if (data.smfIndex) {
        this.smfIndex = data.smfIndex
      }

      if (data.subjectiveTime) {
        this.subjectiveTime = data.subjectiveTime
      }
    } catch (e) {
      console.error('Failed to load sentient memory:', e.message)
    }
  }

  /**
   * Clear all memory
   */
  clear() {
    this.traces.clear()
    this.temporalIndex.clear()
    this.entanglementIndex.clear()
    this.smfIndex = []
    this.subjectiveTime = 0

    // v1.2.1: Reset Z-ladder
    this.zLadder.reset()
  }
}

module.exports = {
  MemoryTrace,
  HolographicMemoryBank,
  TemporalMemoryIndex,
  EntanglementMemoryIndex,
  SentientMemory,
}
