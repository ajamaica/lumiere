/**
 * Distributed Sentience Network (Section 7 of Whitepaper)
 *
 * Implements the network layer for distributed observer communication:
 * - Prime-Resonant Resonance Channel (PRRC) for inter-node communication
 * - Global Memory Field (GMF) for shared memory
 * - Coherent-Commit Protocol for consensus
 * - Offline-first synchronization with eventual coherence
 *
 * Intelligence Scaling Features:
 * - Node Specialization: Semantic domain assignment and prime partitioning
 * - Intelligent Routing: Expertise-based proposal routing
 * - Collective Amplification: Wisdom aggregation for weighted voting
 *
 * Key architectural elements:
 * - Local Field (LF): node's live state
 * - Global Memory Field (GMF): network-maintained shared field
 * - Proposal Log (PL): append-only local log of proposals
 */

const EventEmitter = require('events')
const crypto = require('crypto')

// Import local modules
const { SedenionMemoryField } = require('./smf')
const { PrimeCalculusVerifier, SemanticObject } = require('./prime-calculus')
const { EnochianEncoder, EnochianDecoder, isTwistClosed } = require('./enochian')

// Try to load telemetry for metrics
let telemetry = null
try {
  telemetry = require('./telemetry')
} catch (e) {
  // Telemetry not available
}

// Try to load resolang for WASM-accelerated operations
let resolang = null
try {
  resolang = require('@sschepis/resolang')
} catch (e) {
  // Will use JS fallback
}

// ============================================================================
// NETWORK METRICS (OpenTelemetry/Prometheus Integration)
// ============================================================================

/**
 * NetworkMetrics
 *
 * Collects and exposes metrics for the Distributed Sentience Network.
 * Integrates with the global telemetry registry for Prometheus/OpenTelemetry export.
 */
class NetworkMetrics {
  constructor(options = {}) {
    this.enabled = options.enabled !== false && telemetry !== null
    this.prefix = options.prefix || 'dsn_'

    if (!this.enabled) {
      this._createNoOpMetrics()
      return
    }

    this.registry = options.registry || telemetry.globalRegistry
    this._createMetrics()
  }

  _createMetrics() {
    this.peersConnected = this.registry.gauge(`${this.prefix}peers_connected`, {
      help: 'Number of currently connected peers',
    })
    this.peersTotal = this.registry.counter(`${this.prefix}peers_total`, {
      help: 'Total peer connections',
      labels: ['action'],
    })
    this.messagesTotal = this.registry.counter(`${this.prefix}messages_total`, {
      help: 'Total messages',
      labels: ['direction', 'type'],
    })
    this.messageBytes = this.registry.counter(`${this.prefix}message_bytes_total`, {
      help: 'Total message bytes',
      labels: ['direction'],
    })
    this.messageLatency = this.registry.histogram(`${this.prefix}message_latency_seconds`, {
      help: 'Message latency',
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    })
    this.proposalsTotal = this.registry.counter(`${this.prefix}proposals_total`, {
      help: 'Total proposals',
      labels: ['status'],
    })
    this.proposalVotes = this.registry.counter(`${this.prefix}proposal_votes_total`, {
      help: 'Total votes',
      labels: ['vote'],
    })
    this.proposalRedundancy = this.registry.histogram(`${this.prefix}proposal_redundancy`, {
      help: 'Proposal redundancy scores',
      buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    })
    this.gmfObjects = this.registry.gauge(`${this.prefix}gmf_objects`, {
      help: 'Objects in Global Memory Field',
    })
    this.gmfInserts = this.registry.counter(`${this.prefix}gmf_inserts_total`, {
      help: 'Total GMF inserts',
    })
    this.channelHandshakes = this.registry.counter(`${this.prefix}channel_handshakes_total`, {
      help: 'Channel handshakes',
      labels: ['status'],
    })
    this.channelBroadcasts = this.registry.counter(`${this.prefix}channel_broadcasts_total`, {
      help: 'Total broadcasts',
    })
    this.syncOperations = this.registry.counter(`${this.prefix}sync_operations_total`, {
      help: 'Sync operations',
      labels: ['type'],
    })
    this.networkOnline = this.registry.gauge(`${this.prefix}network_online`, {
      help: 'Network online status (1=online, 0=offline)',
    })
  }

  _createNoOpMetrics() {
    const noOp = { inc: () => {}, dec: () => {}, set: () => {}, observe: () => {}, get: () => 0 }
    this.peersConnected = noOp
    this.peersTotal = noOp
    this.messagesTotal = noOp
    this.messageBytes = noOp
    this.messageLatency = noOp
    this.proposalsTotal = noOp
    this.proposalVotes = noOp
    this.proposalRedundancy = noOp
    this.gmfObjects = noOp
    this.gmfInserts = noOp
    this.channelHandshakes = noOp
    this.channelBroadcasts = noOp
    this.syncOperations = noOp
    this.networkOnline = noOp
  }

  recordPeerConnection(action) {
    this.peersTotal.inc(1, { action })
    if (action === 'connect') this.peersConnected.inc()
    else if (action === 'disconnect') this.peersConnected.dec()
  }

  setPeerCount(count) {
    this.peersConnected.set(count)
  }

  recordMessage(direction, type, bytes = 0) {
    this.messagesTotal.inc(1, { direction, type })
    if (bytes > 0) this.messageBytes.inc(bytes, { direction })
  }

  recordMessageLatency(latencyMs) {
    this.messageLatency.observe(latencyMs / 1000)
  }

  recordProposalSubmitted() {
    this.proposalsTotal.inc(1, { status: 'submitted' })
  }

  recordProposalAccepted(redundancy = 0) {
    this.proposalsTotal.inc(1, { status: 'accepted' })
    if (redundancy > 0) this.proposalRedundancy.observe(redundancy)
  }

  recordProposalRejected() {
    this.proposalsTotal.inc(1, { status: 'rejected' })
  }

  recordProposalVote(agree) {
    this.proposalVotes.inc(1, { vote: agree ? 'agree' : 'disagree' })
  }

  recordGMFInsert() {
    this.gmfInserts.inc()
  }

  setGMFObjectCount(count) {
    this.gmfObjects.set(count)
  }

  recordChannelHandshake(success) {
    this.channelHandshakes.inc(1, { status: success ? 'success' : 'failed' })
  }

  recordChannelBroadcast() {
    this.channelBroadcasts.inc()
  }

  recordSyncOperation(type) {
    this.syncOperations.inc(1, { type })
  }

  setNetworkOnline(online) {
    this.networkOnline.set(online ? 1 : 0)
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      peersConnected: this.peersConnected.get ? this.peersConnected.get() : 0,
    }
  }
}

// Global network metrics instance
let globalNetworkMetrics = null

function getNetworkMetrics(options = {}) {
  if (!globalNetworkMetrics) {
    globalNetworkMetrics = new NetworkMetrics(options)
  }
  return globalNetworkMetrics
}

// ============================================================================
// SEMANTIC DOMAIN CONSTANTS
// ============================================================================

/**
 * Semantic domains map to groups of SMF axes
 */
const SEMANTIC_DOMAINS = {
  perceptual: {
    name: 'perceptual',
    description: 'Coherence, entropy, identity, structure',
    axes: [0, 1, 2, 3],
    color: '#4A90D9',
  },
  cognitive: {
    name: 'cognitive',
    description: 'Change, life, harmony, wisdom',
    axes: [4, 5, 6, 7],
    color: '#50C878',
  },
  temporal: {
    name: 'temporal',
    description: 'Infinity, creation, truth, love',
    axes: [8, 9, 10, 11],
    color: '#FFD700',
  },
  meta: {
    name: 'meta',
    description: 'Power, time, space, consciousness',
    axes: [12, 13, 14, 15],
    color: '#DA70D6',
  },
}

/**
 * First 100 primes for domain partitioning
 */
const FIRST_100_PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
  101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193,
  197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307,
  311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421,
  431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541,
]

/**
 * Generate a unique node ID
 */
function generateNodeId() {
  return crypto.randomBytes(16).toString('hex')
}

// ============================================================================
// LOCAL FIELD
// ============================================================================

/**
 * Local Field (LF)
 *
 * The node's live state including oscillators, |Ψ⟩, SMF, and local memory.
 * This is the single-node observer state.
 *
 * Intelligence Scaling: Includes semantic domain assignment and specialization
 */
class LocalField {
  constructor(nodeId, options = {}) {
    this.nodeId = nodeId
    this.smf = options.smf || new SedenionMemoryField()
    this.memory = new Map() // Local memory traces
    this.coherence = 0
    this.entropy = 0
    this.lastUpdate = Date.now()

    // Specialization: semantic domain assignment
    this.semanticDomain = options.semanticDomain || this.assignDomain(nodeId)
    this.primaryAxes = SEMANTIC_DOMAINS[this.semanticDomain]?.axes || [0, 1, 2, 3]

    // Initialize specialized SMF if requested
    if (options.specialize) {
      this.initializeSpecializedSMF(options.specializationStrength ?? 0.7)
    }
  }

  /**
   * Assign semantic domain based on node ID hash
   */
  assignDomain(nodeId) {
    const domainNames = Object.keys(SEMANTIC_DOMAINS)
    const hashValue = parseInt(nodeId.slice(0, 2), 16)
    return domainNames[hashValue % domainNames.length]
  }

  /**
   * Initialize SMF biased toward node's semantic domain
   */
  initializeSpecializedSMF(strength = 0.7) {
    const domainNames = Object.keys(SEMANTIC_DOMAINS)
    const primaryIdx = domainNames.indexOf(this.semanticDomain)
    const secondaryIdx = (primaryIdx + 1) % 4
    const secondaryAxes = SEMANTIC_DOMAINS[domainNames[secondaryIdx]].axes

    for (let i = 0; i < 16; i++) {
      if (this.primaryAxes.includes(i)) {
        this.smf.s[i] = 0.5 + Math.random() * 0.4 * strength
      } else if (secondaryAxes.includes(i)) {
        this.smf.s[i] = 0.2 + Math.random() * 0.3 * strength
      } else {
        this.smf.s[i] = Math.random() * 0.2 * (1 - strength)
      }
    }
    this.smf.normalize()
  }

  /**
   * Calculate relevance score for a semantic object's SMF
   */
  calculateRelevance(smf) {
    if (!smf) return 0.5

    const domainNames = Object.keys(SEMANTIC_DOMAINS)
    const primaryIdx = domainNames.indexOf(this.semanticDomain)
    const secondaryIdx = (primaryIdx + 1) % 4
    const secondaryAxes = SEMANTIC_DOMAINS[domainNames[secondaryIdx]].axes

    let primaryScore = 0
    let secondaryScore = 0
    let totalScore = 0

    const s = smf.s || smf
    for (let i = 0; i < 16; i++) {
      const absValue = Math.abs(s[i] || 0)
      totalScore += absValue

      if (this.primaryAxes.includes(i)) {
        primaryScore += absValue
      } else if (secondaryAxes.includes(i)) {
        secondaryScore += absValue
      }
    }

    if (totalScore < 0.001) return 0.5
    return (primaryScore * 0.7 + secondaryScore * 0.3) / totalScore
  }

  /**
   * Update local field state
   */
  update(state) {
    if (state.smf) {
      this.smf = state.smf
    }
    if (state.coherence !== undefined) {
      this.coherence = state.coherence
    }
    if (state.entropy !== undefined) {
      this.entropy = state.entropy
    }
    this.lastUpdate = Date.now()
  }

  /**
   * Store a trace in local memory
   */
  storeTrace(id, trace) {
    this.memory.set(id, {
      ...trace,
      timestamp: Date.now(),
      nodeId: this.nodeId,
    })
  }

  /**
   * Get state snapshot for network
   */
  snapshot() {
    return {
      nodeId: this.nodeId,
      smf: this.smf.toJSON(),
      coherence: this.coherence,
      entropy: this.entropy,
      memoryCount: this.memory.size,
      lastUpdate: this.lastUpdate,
      semanticDomain: this.semanticDomain,
      primaryAxes: this.primaryAxes,
    }
  }

  toJSON() {
    return this.snapshot()
  }
}

// ============================================================================
// PROPOSAL SYSTEM
// ============================================================================

// ════════════════════════════════════════════════════════════════════
// FORMALIZED PROPOSAL CLASS (from discrete.pdf Section 3.3)
// Enhanced with tick_proof, smf_hash, and kernel NF claim
// ════════════════════════════════════════════════════════════════════

/**
 * Proposal
 *
 * A proposed insert to the Global Memory Field.
 * Contains semantic object, proofs, and metadata.
 *
 * From discrete.pdf: Proposals must include:
 * - tick_proof: Evidence of coherent tick event triggering the proposal
 * - smf_hash: Hash of SMF state at proposal time for replay verification
 * - kernel_nf_claim: The claimed normal form from the kernel
 */
class Proposal {
  /**
   * Create a new proposal
   *
   * @param {Object} semanticObject - The semantic object being proposed
   * @param {Object} proofs - Proof bundle
   * @param {Object} metadata - Additional metadata
   */
  constructor(semanticObject, proofs = {}, metadata = {}) {
    this.id = crypto.randomBytes(8).toString('hex')
    this.object = semanticObject
    this.proofs = proofs
    this.metadata = metadata
    this.timestamp = Date.now()
    this.nodeId = metadata.nodeId || null
    this.status = 'pending' // pending, accepted, rejected
    this.votes = new Map() // nodeId -> vote

    // ════════════════════════════════════════════════════════════
    // DISCRETE.PDF ENHANCEMENTS
    // ════════════════════════════════════════════════════════════

    // Tick proof: Evidence that a coherent tick event triggered this proposal
    // From discrete.pdf Section 4.2: tick_proof ensures proposals are grounded in tick events
    this.tickProof = metadata.tickProof ||
      proofs.tickProof || {
        tickNumber: 0,
        coherenceAtTick: 0,
        tickTimestamp: Date.now(),
        valid: false,
      }

    // SMF hash: Hash of the SMF state at proposal creation
    // From discrete.pdf Section 3.3: smf_hash enables replay verification
    this.smfHash = metadata.smfHash || this.computeSmfHash(metadata.smf)

    // Kernel NF claim: The claimed normal form from prime calculus
    // From discrete.pdf Section 5.1: kernel verifies NF claims deterministically
    this.kernelNfClaim = metadata.kernelNfClaim || this.extractNfClaim(semanticObject)

    // Proposal quality metrics
    this.quality = {
      hasTickProof: !!proofs.tickProof || this.tickProof.valid,
      hasSmfHash: !!this.smfHash,
      hasNfClaim: !!this.kernelNfClaim,
      score: 0, // Computed below
    }
    this.quality.score = this.computeQualityScore()
  }

  /**
   * Compute hash of SMF state for replay verification
   * @private
   */
  computeSmfHash(smf) {
    if (!smf) return null

    const s = smf.s || smf
    if (!Array.isArray(s) && !ArrayBuffer.isView(s)) return null

    // Create deterministic hash of SMF axes
    let hash = 0
    for (let i = 0; i < 16; i++) {
      const value = s[i] || 0
      // Fixed-point representation for determinism (8 decimal places)
      const fixedValue = Math.round(value * 1e8)
      hash = ((hash << 5) - hash + fixedValue) | 0
    }

    return hash.toString(16).padStart(8, '0')
  }

  /**
   * Extract normal form claim from semantic object
   * @private
   */
  extractNfClaim(semanticObject) {
    if (!semanticObject) return null

    // If object has normalForm method, use it
    if (semanticObject.normalForm && typeof semanticObject.normalForm === 'function') {
      const nf = semanticObject.normalForm()
      if (nf && typeof nf.signature === 'function') {
        return nf.signature()
      }
      return JSON.stringify(nf)
    }

    // Otherwise, derive from term structure
    const term = semanticObject.term
    if (!term) return null

    // Generate canonical signature for the term
    if (term.prime) return `atomic:${term.prime}`
    if (term.p) return `fusion:${term.p}+${term.q}+${term.r}=${term.p + term.q + term.r}`
    if (term.nounPrime) {
      const adjs = (term.adjPrimes || []).sort((a, b) => a - b).join(',')
      return `chain:${term.nounPrime}[${adjs}]`
    }

    return JSON.stringify(term)
  }

  /**
   * Compute proposal quality score (0-1)
   * Higher scores indicate more verifiable proposals
   */
  computeQualityScore() {
    let score = 0.5 // Base score

    // Tick proof adds credibility
    if (this.tickProof.valid) {
      score += 0.2
      // High coherence tick adds more
      if (this.tickProof.coherenceAtTick > 0.7) {
        score += 0.1
      }
    }

    // SMF hash enables verification
    if (this.smfHash) {
      score += 0.1
    }

    // NF claim enables kernel verification
    if (this.kernelNfClaim) {
      score += 0.1
    }

    return Math.min(1, score)
  }

  /**
   * Set tick proof (called when proposal is triggered by tick event)
   *
   * @param {Object} tickInfo - Information about the triggering tick
   */
  setTickProof(tickInfo) {
    this.tickProof = {
      tickNumber: tickInfo.tickNumber || 0,
      coherenceAtTick: tickInfo.coherence || 0,
      tickTimestamp: tickInfo.timestamp || Date.now(),
      valid: true,
    }

    this.quality.hasTickProof = true
    this.quality.score = this.computeQualityScore()
  }

  /**
   * Verify tick proof against current tick state
   *
   * @param {Object} currentTickState - Current tick state from TickGate
   * @returns {Object} Verification result
   */
  verifyTickProof(currentTickState) {
    if (!this.tickProof.valid) {
      return { valid: false, reason: 'no_tick_proof' }
    }

    // Check that tick number is not in the future
    if (this.tickProof.tickNumber > currentTickState.tickCount) {
      return { valid: false, reason: 'future_tick' }
    }

    // Check that tick is not too old (configurable, default 1000 ticks)
    const maxAge = 1000
    if (currentTickState.tickCount - this.tickProof.tickNumber > maxAge) {
      return { valid: false, reason: 'stale_tick' }
    }

    return { valid: true, tickNumber: this.tickProof.tickNumber }
  }

  /**
   * Verify SMF hash against a given SMF state
   *
   * @param {Object} smf - SMF state to verify against
   * @returns {boolean} Whether hash matches
   */
  verifySmfHash(smf) {
    const computedHash = this.computeSmfHash(smf)
    return computedHash === this.smfHash
  }

  /**
   * Verify kernel NF claim against kernel computation
   *
   * @param {Object} verifier - PrimeCalculusVerifier instance
   * @returns {Object} Verification result
   */
  verifyNfClaim(verifier) {
    if (!this.kernelNfClaim) {
      return { valid: false, reason: 'no_nf_claim' }
    }

    if (!this.object || !this.object.term) {
      return { valid: false, reason: 'no_term' }
    }

    try {
      // Compute NF using verifier
      const verification = verifier.verify({
        term: this.object.term,
        claimedNF: { signature: () => this.kernelNfClaim },
        proofs: this.proofs,
      })

      return {
        valid: verification.valid,
        reason: verification.valid ? 'nf_matches' : 'nf_mismatch',
        computed: verification.computedNF,
        claimed: this.kernelNfClaim,
      }
    } catch (e) {
      return { valid: false, reason: 'verification_error', error: e.message }
    }
  }

  /**
   * Add a vote
   */
  addVote(nodeId, vote) {
    this.votes.set(nodeId, {
      agree: vote,
      timestamp: Date.now(),
    })
  }

  /**
   * Calculate redundancy score R(Ω) (equation 19)
   * R(Ω) = (1/|V|) Σv bv
   */
  redundancyScore() {
    if (this.votes.size === 0) return 0
    const agrees = Array.from(this.votes.values()).filter((v) => v.agree).length
    return agrees / this.votes.size
  }

  /**
   * Get comprehensive proposal status
   */
  getProposalStatus() {
    return {
      id: this.id,
      status: this.status,
      quality: this.quality,
      votes: this.votes.size,
      redundancy: this.redundancyScore(),
      tickProofValid: this.tickProof.valid,
      hasSmfHash: !!this.smfHash,
      hasNfClaim: !!this.kernelNfClaim,
      age: Date.now() - this.timestamp,
    }
  }

  toJSON() {
    return {
      id: this.id,
      object: this.object.toJSON ? this.object.toJSON() : this.object,
      proofs: this.proofs,
      timestamp: this.timestamp,
      nodeId: this.nodeId,
      status: this.status,
      redundancyScore: this.redundancyScore(),
      // New discrete.pdf fields
      tickProof: this.tickProof,
      smfHash: this.smfHash,
      kernelNfClaim: this.kernelNfClaim,
      quality: this.quality,
    }
  }
}

/**
 * Proposal Log (PL)
 *
 * Append-only local log of proposed inserts and local moments.
 */
class ProposalLog {
  constructor(options = {}) {
    this.entries = []
    this.maxEntries = options.maxEntries || 10000
  }

  /**
   * Append a proposal
   */
  append(proposal) {
    this.entries.push(proposal)

    // Prune if over capacity
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }

    return proposal.id
  }

  /**
   * Get pending proposals
   */
  pending() {
    return this.entries.filter((p) => p.status === 'pending')
  }

  /**
   * Get proposal by ID
   */
  get(id) {
    return this.entries.find((p) => p.id === id)
  }

  /**
   * Update proposal status
   */
  updateStatus(id, status) {
    const proposal = this.get(id)
    if (proposal) {
      proposal.status = status
    }
  }

  /**
   * Get proposals since timestamp
   */
  since(timestamp) {
    return this.entries.filter((p) => p.timestamp > timestamp)
  }

  toJSON() {
    return {
      count: this.entries.length,
      pending: this.pending().length,
      entries: this.entries.slice(-100).map((p) => p.toJSON()),
    }
  }
}

// ============================================================================
// GLOBAL MEMORY FIELD
// ============================================================================

/**
 * Global Memory Field (GMF) (Section 7.2)
 *
 * Network-maintained field composed of accepted objects:
 * MG = Σm wm Ωm
 *
 * Each accepted object has a stability weight based on
 * coherence, redundancy, and longevity.
 */
class GlobalMemoryField {
  constructor(options = {}) {
    this.objects = new Map() // id -> { object, weight, metadata }
    this.snapshotId = 0
    this.deltas = []
    this.maxDeltas = options.maxDeltas || 1000
  }

  /**
   * Insert an accepted object into GMF
   */
  insert(semanticObject, weight = 1.0, metadata = {}) {
    const id = semanticObject.id

    this.objects.set(id, {
      object: semanticObject,
      weight,
      metadata,
      insertedAt: Date.now(),
      accessCount: 0,
    })

    // Record delta
    this.deltas.push({
      type: 'insert',
      id,
      timestamp: Date.now(),
      snapshotId: this.snapshotId,
    })

    if (this.deltas.length > this.maxDeltas) {
      this.snapshot()
    }

    return id
  }

  /**
   * Update object weight (based on access, coherence, longevity)
   */
  updateWeight(id, newWeight) {
    const entry = this.objects.get(id)
    if (entry) {
      entry.weight = newWeight
      this.deltas.push({
        type: 'update_weight',
        id,
        weight: newWeight,
        timestamp: Date.now(),
        snapshotId: this.snapshotId,
      })
    }
  }

  /**
   * Get object by ID
   */
  get(id) {
    const entry = this.objects.get(id)
    if (entry) {
      entry.accessCount++
    }
    return entry
  }

  /**
   * Query objects by similarity to SMF
   */
  querySimilar(smf, threshold = 0.5, maxResults = 10) {
    const results = []

    for (const [id, entry] of this.objects) {
      if (entry.metadata.smf) {
        const targetSmf = new SedenionMemoryField(entry.metadata.smf)
        const similarity = smf.coherence(targetSmf)

        if (similarity >= threshold) {
          results.push({ id, entry, similarity })
        }
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, maxResults)
  }

  /**
   * Create a snapshot (for sync)
   */
  snapshot() {
    this.snapshotId++
    this.deltas = []

    return {
      id: this.snapshotId,
      timestamp: Date.now(),
      objectCount: this.objects.size,
      objects: Array.from(this.objects.entries()).map(([id, entry]) => ({
        id,
        normalForm: entry.object.normalForm ? entry.object.normalForm().signature() : id,
        weight: entry.weight,
        insertedAt: entry.insertedAt,
      })),
    }
  }

  /**
   * Get deltas since snapshot
   */
  getDeltasSince(snapshotId) {
    return this.deltas.filter((d) => d.snapshotId > snapshotId)
  }

  /**
   * Apply deltas from another node
   */
  applyDeltas(deltas) {
    for (const delta of deltas) {
      switch (delta.type) {
        case 'insert':
          // Would need full object data to insert
          break
        case 'update_weight':
          this.updateWeight(delta.id, delta.weight)
          break
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalWeight = 0
    let totalAccess = 0

    for (const entry of this.objects.values()) {
      totalWeight += entry.weight
      totalAccess += entry.accessCount
    }

    return {
      objectCount: this.objects.size,
      snapshotId: this.snapshotId,
      deltaCount: this.deltas.length,
      totalWeight,
      totalAccess,
    }
  }

  toJSON() {
    return {
      ...this.getStats(),
      recentDeltas: this.deltas.slice(-50),
    }
  }
}

// ============================================================================
// COHERENT-COMMIT PROTOCOL
// ============================================================================

/**
 * Coherent-Commit Protocol (Section 7.5-7.7)
 *
 * Implements the acceptance function:
 * Accept(Ω) = 1{C >= Cth} · 1{NF_ok(Ω)} · 1{R(Ω) >= τR} · 1{Q(Ω) >= τQ}
 *
 * Intelligence Scaling: Includes wisdom aggregation for weighted voting
 */
class CoherentCommitProtocol {
  constructor(options = {}) {
    this.coherenceThreshold = options.coherenceThreshold || 0.7
    this.redundancyThreshold = options.redundancyThreshold || 0.6
    this.stabilityThreshold = options.stabilityThreshold || 0.5

    this.verifier = new PrimeCalculusVerifier()
    this.enochianDecoder = new EnochianDecoder()

    // Wisdom aggregation for weighted voting
    this.nodeProfiles = new Map()
    this.voteHistory = new Map()
    this.useWeightedVoting = options.useWeightedVoting ?? true
  }

  /**
   * Register a node's expertise profile
   */
  registerNodeProfile(nodeId, profile) {
    this.nodeProfiles.set(nodeId, {
      semanticDomain: profile.semanticDomain || 'perceptual',
      primeDomain: new Set(profile.primeDomain || []),
      smfAxes: profile.smfAxes || [0, 1, 2, 3],
      registeredAt: Date.now(),
    })

    if (!this.voteHistory.has(nodeId)) {
      this.voteHistory.set(nodeId, { correct: 0, total: 0 })
    }
  }

  /**
   * Calculate vote weight based on expertise and history
   */
  calculateVoteWeight(nodeId, proposal) {
    if (!this.useWeightedVoting) return 1.0

    const profile = this.nodeProfiles.get(nodeId)
    if (!profile) return 1.0

    // Expertise weight (0.5-1.5)
    const primes = this.extractPrimes(proposal)
    const inDomain = primes.filter((p) => profile.primeDomain.has(p)).length
    const expertiseWeight = 0.5 + (primes.length > 0 ? inDomain / primes.length : 0.5)

    // Accuracy weight (0.5-1.5)
    const history = this.voteHistory.get(nodeId)
    const accuracyWeight =
      history && history.total >= 5 ? 0.5 + history.correct / history.total : 1.0

    return expertiseWeight * accuracyWeight
  }

  /**
   * Extract primes from a proposal
   */
  extractPrimes(proposal) {
    const primes = []
    const term = proposal?.object?.term
    if (!term) return primes

    if (term.prime) primes.push(term.prime)
    if (term.p) primes.push(term.p, term.q, term.r)
    if (term.nounPrime) primes.push(term.nounPrime)
    if (term.adjPrimes) primes.push(...term.adjPrimes)

    return primes
  }

  /**
   * Record vote outcome for learning
   */
  recordVoteOutcome(nodeId, wasCorrect) {
    if (!this.voteHistory.has(nodeId)) {
      this.voteHistory.set(nodeId, { correct: 0, total: 0 })
    }
    const history = this.voteHistory.get(nodeId)
    history.total++
    if (wasCorrect) history.correct++
  }

  /**
   * Check local evidence (Section 7.5)
   */
  checkLocalEvidence(proposal, localState) {
    const evidence = {
      coherenceOk: false,
      smfOk: false,
      reconstructionOk: false,
    }

    // Check coherence
    evidence.coherenceOk = localState.coherence >= this.coherenceThreshold

    // Check SMF entropy band
    if (localState.smf) {
      const smfEntropy =
        typeof localState.smf.entropy === 'function' ? localState.smf.entropy() : 0.5
      evidence.smfOk = smfEntropy > 0.1 && smfEntropy < 2.5
    }

    // Reconstruction fidelity (simplified check)
    evidence.reconstructionOk = true

    return {
      passed: evidence.coherenceOk && evidence.smfOk && evidence.reconstructionOk,
      evidence,
    }
  }

  /**
   * Check kernel evidence (normal-form agreement)
   */
  checkKernelEvidence(proposal) {
    if (!proposal.object || !proposal.object.term) {
      return { passed: false, reason: 'missing_term' }
    }

    const verification = this.verifier.verify({
      term: proposal.object.term,
      claimedNF: proposal.object.normalForm ? proposal.object.normalForm() : null,
      proofs: proposal.proofs,
    })

    return {
      passed: verification.valid,
      verification,
    }
  }

  /**
   * Check Enochian twist-closure if packet present
   */
  checkTwistClosure(proposal) {
    if (!proposal.proofs.enochianPacket) {
      return { passed: true, reason: 'no_packet' }
    }

    const decoded = this.enochianDecoder.decode(proposal.proofs.enochianPacket)
    return {
      passed: decoded.valid,
      decoded,
    }
  }

  /**
   * Evaluate proposal for acceptance (Algorithm 1)
   * Includes weighted voting for wisdom aggregation
   */
  evaluate(proposal, localState, votes) {
    const result = {
      accepted: false,
      checks: {},
    }

    // 1. Check twist-closure first (fast filter)
    result.checks.twistClosure = this.checkTwistClosure(proposal)
    if (!result.checks.twistClosure.passed && proposal.proofs.enochianPacket) {
      result.reason = 'twist_closure_failed'
      return result
    }

    // 2. Check local evidence
    result.checks.localEvidence = this.checkLocalEvidence(proposal, localState)
    if (!result.checks.localEvidence.passed) {
      result.reason = 'local_evidence_failed'
      return result
    }

    // 3. Check kernel evidence
    result.checks.kernelEvidence = this.checkKernelEvidence(proposal)
    if (!result.checks.kernelEvidence.passed) {
      result.reason = 'kernel_verification_failed'
      return result
    }

    // 4. Check redundancy score (with optional weighted voting)
    let R
    if (this.useWeightedVoting && proposal.votes && proposal.votes.size > 0) {
      let weightedAgree = 0
      let weightedTotal = 0

      for (const [nodeId, vote] of proposal.votes) {
        const weight = this.calculateVoteWeight(nodeId, proposal)
        if (vote.agree) weightedAgree += weight
        weightedTotal += weight
      }

      R = weightedTotal > 0 ? weightedAgree / weightedTotal : 0
      result.checks.redundancy = {
        score: R,
        rawScore: proposal.redundancyScore(),
        weighted: true,
        passed: R >= this.redundancyThreshold,
      }
    } else {
      R = proposal.redundancyScore()
      result.checks.redundancy = {
        score: R,
        weighted: false,
        passed: R >= this.redundancyThreshold,
      }
    }

    if (!result.checks.redundancy.passed) {
      result.reason = 'redundancy_insufficient'
      return result
    }

    // All checks passed
    result.accepted = true
    return result
  }
}

// ============================================================================
// PRRC CHANNEL
// ============================================================================

/**
 * Prime-Resonant Resonance Channel (PRRC) (Section 7.3)
 *
 * Channel for prime-resonant non-local communication.
 * Features:
 * - Prime set PC for channel basis
 * - Phase alignment handshake
 * - Topological transport and holonomy wrapping
 * - Expertise-based routing for intelligent proposal distribution
 */
class PRRCChannel extends EventEmitter {
  constructor(nodeId, options = {}) {
    super()

    this.nodeId = nodeId
    this.channelId = crypto.randomBytes(8).toString('hex')
    this.primeSet = options.primeSet || [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
    this.phaseReference = Math.random() * 2 * Math.PI
    this.connected = false
    this.peers = new Map()

    this.enochianEncoder = new EnochianEncoder()

    // Expertise-based routing
    this.expertiseCache = new Map()
    this.useExpertiseRouting = options.useExpertiseRouting ?? true
    this.relevanceThreshold = options.relevanceThreshold ?? 0.3
  }

  /**
   * Register peer expertise profile
   */
  registerPeerExpertise(peerId, profile) {
    this.expertiseCache.set(peerId, {
      semanticDomain: profile.semanticDomain || 'perceptual',
      primeDomain: new Set(profile.primeDomain || []),
      smfAxes: profile.smfAxes || [0, 1, 2, 3],
      lastActive: Date.now(),
    })
  }

  /**
   * Route proposal to relevant peers based on expertise
   */
  routeProposal(proposal) {
    if (!this.useExpertiseRouting) {
      return Array.from(this.peers.keys()).filter((id) => this.peers.get(id).connected)
    }

    const primes = this.extractPrimes(proposal)
    const targets = []

    for (const [peerId, peer] of this.peers) {
      if (!peer.connected) continue

      const expertise = this.expertiseCache.get(peerId)
      if (!expertise) {
        targets.push({ peerId, relevance: 0.5 })
        continue
      }

      const inDomain = primes.filter((p) => expertise.primeDomain.has(p)).length
      const relevance = primes.length > 0 ? inDomain / primes.length : 0.5

      if (relevance >= this.relevanceThreshold) {
        targets.push({ peerId, relevance })
      }
    }

    targets.sort((a, b) => b.relevance - a.relevance)
    const limit = Math.max(3, Math.ceil(Math.sqrt(this.peers.size)))

    return targets.slice(0, limit).map((t) => t.peerId)
  }

  /**
   * Extract primes from proposal for routing
   */
  extractPrimes(proposal) {
    const primes = []
    const term = proposal?.object?.term
    if (!term) return primes

    if (term.prime) primes.push(term.prime)
    if (term.p) primes.push(term.p, term.q, term.r)
    if (term.nounPrime) primes.push(term.nounPrime)
    if (term.adjPrimes) primes.push(...term.adjPrimes)

    return primes
  }

  /**
   * Connect to a peer node
   */
  connect(peerId, transport) {
    this.peers.set(peerId, {
      transport,
      phaseOffset: 0,
      connected: true,
      lastSeen: Date.now(),
    })

    this.sendHandshake(peerId)
  }

  /**
   * Phase alignment handshake
   */
  sendHandshake(peerId) {
    const peer = this.peers.get(peerId)
    if (!peer) return

    const handshake = {
      type: 'handshake',
      nodeId: this.nodeId,
      channelId: this.channelId,
      primeSet: this.primeSet,
      phaseReference: this.phaseReference,
      timestamp: Date.now(),
    }

    this.send(peerId, handshake)
  }

  /**
   * Handle incoming handshake
   */
  handleHandshake(peerId, handshake) {
    const peer = this.peers.get(peerId)
    if (!peer) return

    peer.phaseOffset = handshake.phaseReference - this.phaseReference
    peer.primeSet = handshake.primeSet
    peer.connected = true

    this.emit('peer_connected', peerId)
  }

  /**
   * Encode and send a semantic object
   */
  sendObject(peerId, semanticObject, metadata = {}) {
    const peer = this.peers.get(peerId)
    if (!peer || !peer.connected) {
      throw new Error(`Peer ${peerId} not connected`)
    }

    const packet = this.enochianEncoder.encodeTerm(semanticObject.term)

    const message = {
      type: 'object',
      nodeId: this.nodeId,
      object: semanticObject.toJSON ? semanticObject.toJSON() : semanticObject,
      enochianPacket: packet.toBase64(),
      phaseAdjustment: peer.phaseOffset,
      metadata,
      timestamp: Date.now(),
    }

    this.send(peerId, message)
  }

  /**
   * Broadcast object to all connected peers
   * Uses intelligent routing for proposals
   */
  broadcast(semanticObject, metadata = {}) {
    let targetPeers

    if (this.useExpertiseRouting && metadata.type === 'proposal') {
      targetPeers = this.routeProposal({ object: semanticObject, metadata })
    } else {
      targetPeers = Array.from(this.peers.entries())
        .filter(([_, peer]) => peer.connected)
        .map(([peerId]) => peerId)
    }

    for (const peerId of targetPeers) {
      try {
        this.sendObject(peerId, semanticObject, metadata)
      } catch (e) {
        // Continue with other peers
      }
    }

    return targetPeers
  }

  /**
   * Send raw message (transport-agnostic)
   */
  send(peerId, message) {
    const peer = this.peers.get(peerId)
    if (!peer || !peer.transport) return

    const encoded = JSON.stringify(message)

    if (typeof peer.transport.send === 'function') {
      peer.transport.send(encoded)
    } else if (typeof peer.transport.write === 'function') {
      peer.transport.write(encoded)
    }
  }

  /**
   * Handle incoming message
   */
  receive(peerId, rawMessage) {
    try {
      const message = JSON.parse(rawMessage)

      switch (message.type) {
        case 'handshake':
          this.handleHandshake(peerId, message)
          break
        case 'object':
          this.emit('object_received', peerId, message)
          break
        case 'proposal':
          this.emit('proposal_received', peerId, message)
          break
        case 'vote':
          this.emit('vote_received', peerId, message)
          break
        default:
          this.emit('message_received', peerId, message)
      }
    } catch (e) {
      this.emit('error', e)
    }
  }

  /**
   * Disconnect from a peer
   */
  disconnect(peerId) {
    const peer = this.peers.get(peerId)
    if (peer) {
      peer.connected = false
      if (peer.transport && typeof peer.transport.close === 'function') {
        peer.transport.close()
      }
    }
    this.peers.delete(peerId)
    this.emit('peer_disconnected', peerId)
  }

  /**
   * Get channel statistics
   */
  getStats() {
    const connectedPeers = Array.from(this.peers.values()).filter((p) => p.connected).length
    return {
      channelId: this.channelId,
      nodeId: this.nodeId,
      connectedPeers,
      totalPeers: this.peers.size,
      primeSetSize: this.primeSet.length,
      useExpertiseRouting: this.useExpertiseRouting,
    }
  }
}

// ============================================================================
// NETWORK SYNCHRONIZER
// ============================================================================

/**
 * Network Synchronizer (Section 7.6)
 *
 * Offline-first synchronization with eventual coherence.
 * State = (GMF_snapshot_id, ΔGMF, PL)
 *
 * Intelligence Scaling: Includes prime domain partitioning
 */
class NetworkSynchronizer extends EventEmitter {
  constructor(nodeId, options = {}) {
    super()

    this.nodeId = nodeId
    this.localField = new LocalField(nodeId, { ...options, specialize: options.specialize ?? true })
    this.gmf = new GlobalMemoryField(options)
    this.proposalLog = new ProposalLog(options)
    this.channel = new PRRCChannel(nodeId, options)
    this.protocol = new CoherentCommitProtocol(options)

    // Sync state
    this.gmfSnapshotId = 0
    this.online = false
    this.syncInProgress = false

    // Prime domain partitioning
    this.nodeIndex = options.nodeIndex ?? 0
    this.networkSize = options.networkSize ?? 1
    this.primeDomains = this.partitionPrimes()

    // Setup event handlers
    this.setupEventHandlers()

    // Register our own profile with the protocol
    this.protocol.registerNodeProfile(nodeId, {
      semanticDomain: this.localField.semanticDomain,
      primeDomain: Array.from(this.getMyPrimeDomain()),
      smfAxes: this.localField.primaryAxes,
    })
  }

  /**
   * Partition primes among nodes in the network
   */
  partitionPrimes() {
    const domains = []
    const chunkSize = Math.ceil(FIRST_100_PRIMES.length / Math.max(1, this.networkSize))

    for (let i = 0; i < this.networkSize; i++) {
      const start = i * chunkSize
      const end = Math.min((i + 1) * chunkSize, FIRST_100_PRIMES.length)
      domains.push(new Set(FIRST_100_PRIMES.slice(start, end)))
    }

    return domains
  }

  /**
   * Get this node's prime domain
   */
  getMyPrimeDomain() {
    return this.primeDomains[this.nodeIndex] || new Set()
  }

  /**
   * Update network size and repartition primes
   */
  updateNetworkSize(newSize, myIndex) {
    this.networkSize = newSize
    this.nodeIndex = myIndex
    this.primeDomains = this.partitionPrimes()

    this.protocol.registerNodeProfile(this.nodeId, {
      semanticDomain: this.localField.semanticDomain,
      primeDomain: Array.from(this.getMyPrimeDomain()),
      smfAxes: this.localField.primaryAxes,
    })
  }

  setupEventHandlers() {
    this.channel.on('object_received', (peerId, message) => {
      this.handleIncomingObject(peerId, message)
    })

    this.channel.on('proposal_received', (peerId, message) => {
      this.handleIncomingProposal(peerId, message)
    })

    this.channel.on('vote_received', (peerId, message) => {
      this.handleIncomingVote(peerId, message)
    })
  }

  /**
   * Handle incoming semantic object
   */
  handleIncomingObject(peerId, message) {
    this.emit('object_received', { peerId, message })
  }

  /**
   * Handle incoming proposal
   */
  handleIncomingProposal(peerId, message) {
    const proposal = new Proposal(message.object, message.proofs || {}, { nodeId: message.nodeId })

    const evaluation = this.protocol.evaluate(proposal, this.localField, proposal.votes)

    const vote = {
      type: 'vote',
      proposalId: message.proposalId,
      nodeId: this.nodeId,
      agree: evaluation.accepted,
      timestamp: Date.now(),
    }

    this.channel.send(peerId, vote)
    this.emit('proposal_voted', { proposal, vote, evaluation })
  }

  /**
   * Handle incoming vote
   */
  handleIncomingVote(peerId, message) {
    const proposal = this.proposalLog.get(message.proposalId)
    if (proposal) {
      proposal.addVote(message.nodeId, message.agree)

      if (proposal.votes.size >= 3) {
        this.finalizeProposal(proposal)
      }
    }
  }

  /**
   * Finalize a proposal (accept or reject)
   */
  finalizeProposal(proposal) {
    const evaluation = this.protocol.evaluate(proposal, this.localField, proposal.votes)

    if (evaluation.accepted) {
      proposal.status = 'accepted'
      this.gmf.insert(proposal.object, 1.0, { nodeId: proposal.nodeId })
      this.emit('proposal_accepted', proposal)
    } else {
      proposal.status = 'rejected'
      this.emit('proposal_rejected', { proposal, reason: evaluation.reason })
    }
  }

  /**
   * Submit a proposal for network consensus
   */
  propose(semanticObject, proofs = {}) {
    const proposal = new Proposal(semanticObject, proofs, { nodeId: this.nodeId })
    this.proposalLog.append(proposal)

    if (this.online) {
      this.channel.broadcast(semanticObject, {
        type: 'proposal',
        proposalId: proposal.id,
        proofs,
      })
    }

    return proposal
  }

  /**
   * On Join synchronization (Section 7.6)
   */
  async onJoin() {
    this.syncInProgress = true
    this.emit('sync_started')

    this.online = true
    this.syncInProgress = false
    this.emit('sync_complete', { snapshotId: this.gmfSnapshotId })
  }

  /**
   * On Reconnect synchronization
   */
  async onReconnect() {
    this.syncInProgress = true
    this.emit('resync_started')

    const pending = this.proposalLog.pending()
    for (const proposal of pending) {
      if (proposal.object) {
        this.channel.broadcast(proposal.object, {
          type: 'proposal',
          proposalId: proposal.id,
          proofs: proposal.proofs,
        })
      }
    }

    this.online = true
    this.syncInProgress = false
    this.emit('resync_complete', { replayedCount: pending.length })
  }

  /**
   * Update local field state
   */
  updateLocal(state) {
    this.localField.update(state)
  }

  /**
   * Connect to peer
   */
  connectPeer(peerId, transport) {
    this.channel.connect(peerId, transport)
  }

  /**
   * Disconnect from peer
   */
  disconnectPeer(peerId) {
    this.channel.disconnect(peerId)
  }

  /**
   * Go offline
   */
  goOffline() {
    this.online = false
    this.emit('offline')
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      nodeId: this.nodeId,
      online: this.online,
      syncInProgress: this.syncInProgress,
      gmfSnapshotId: this.gmfSnapshotId,
      localField: this.localField.snapshot(),
      gmfStats: this.gmf.getStats(),
      channelStats: this.channel.getStats(),
      pendingProposals: this.proposalLog.pending().length,
      networkSize: this.networkSize,
      nodeIndex: this.nodeIndex,
      primeDomainSize: this.getMyPrimeDomain().size,
    }
  }

  toJSON() {
    return this.getStatus()
  }
}

// ============================================================================
// DSN NODE
// ============================================================================

// Default domain for the root node of the Aleph Network
const ROOT_NODE_DEFAULT_DOMAIN = 'aleph.bot'

// Bootstrap URL for joining the Aleph Network mesh
const ROOT_NODE_BOOTSTRAP_URL =
  'https://wrochovhpqrxiypqamcv.supabase.co/functions/v1/alephnet-root/bootstrap'

/**
 * Distributed Sentience Network Node
 *
 * Complete node implementation for the Distributed Sentience Network.
 * Integrates specialization, routing, and collective intelligence features.
 */
class DSNNode extends EventEmitter {
  constructor(options = {}) {
    super()

    this.nodeId = options.nodeId || generateNodeId()
    this.name = options.name || `Node-${this.nodeId.slice(0, 8)}`

    // Domain configuration for network identity
    // Root node uses aleph.bot as the default domain
    this.domain = options.domain || ROOT_NODE_DEFAULT_DOMAIN
    this.isRootNode = options.isRootNode ?? this.domain === ROOT_NODE_DEFAULT_DOMAIN

    // Bootstrap URL for joining the mesh
    this.bootstrapUrl = options.bootstrapUrl || ROOT_NODE_BOOTSTRAP_URL

    // Initialize synchronizer (contains all network state)
    this.sync = new NetworkSynchronizer(this.nodeId, options)

    // Forward events
    this.sync.on('proposal_accepted', (p) => this.emit('proposal_accepted', p))
    this.sync.on('proposal_rejected', (r) => this.emit('proposal_rejected', r))
    this.sync.on('object_received', (o) => this.emit('object_received', o))

    // Start time
    this.startTime = Date.now()

    // Mesh connection state
    this.meshConnected = false
  }

  /**
   * Start the node
   */
  async start() {
    this.emit('starting')
    await this.sync.onJoin()
    this.emit('started')
  }

  /**
   * Join the Aleph Network mesh via bootstrap endpoint
   * @param {Object} options - Join options
   * @param {string} options.bootstrapUrl - Override bootstrap URL
   * @returns {Promise<Object>} Bootstrap response with peer list
   */
  async joinMesh(options = {}) {
    const url = options.bootstrapUrl || this.bootstrapUrl

    this.emit('mesh_joining', { url, nodeId: this.nodeId })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: this.nodeId,
          name: this.name,
          domain: this.domain,
          gatewayUrl: options.gatewayUrl || `http://${this.nodeId}.local:31337`, // Fallback for local nodes
          semanticDomain: this.sync.localField.semanticDomain,
          timestamp: Date.now(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Bootstrap failed: ${response.status} ${response.statusText}`)
      }

      const bootstrapData = await response.json()

      // Connect to provided peers
      if (bootstrapData.peers && Array.isArray(bootstrapData.peers)) {
        for (const peer of bootstrapData.peers) {
          if (peer.nodeId !== this.nodeId) {
            this.emit('peer_discovered', peer)
          }
        }
      }

      this.meshConnected = true
      this.emit('mesh_joined', {
        url,
        nodeId: this.nodeId,
        peerCount: bootstrapData.peers?.length || 0,
        bootstrapData,
      })

      return bootstrapData
    } catch (error) {
      this.emit('mesh_join_failed', { url, nodeId: this.nodeId, error: error.message })
      throw error
    }
  }

  /**
   * Stop the node
   */
  stop() {
    this.sync.goOffline()
    this.emit('stopped')
  }

  /**
   * Submit a semantic object to the network
   */
  submit(semanticObject, proofs = {}) {
    return this.sync.propose(semanticObject, proofs)
  }

  /**
   * Query similar objects from GMF
   */
  querySimilar(smf, threshold = 0.5) {
    return this.sync.gmf.querySimilar(smf, threshold)
  }

  /**
   * Update local state
   */
  updateState(state) {
    this.sync.updateLocal(state)
  }

  /**
   * Connect to another node
   */
  connectTo(peerId, transport) {
    this.sync.connectPeer(peerId, transport)
  }

  /**
   * Get node status
   */
  getStatus() {
    return {
      nodeId: this.nodeId,
      name: this.name,
      domain: this.domain,
      isRootNode: this.isRootNode,
      bootstrapUrl: this.bootstrapUrl,
      meshConnected: this.meshConnected,
      uptime: Date.now() - this.startTime,
      semanticDomain: this.sync.localField.semanticDomain,
      ...this.sync.getStatus(),
    }
  }

  toJSON() {
    return this.getStatus()
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  SEMANTIC_DOMAINS,
  FIRST_100_PRIMES,
  ROOT_NODE_DEFAULT_DOMAIN,
  ROOT_NODE_BOOTSTRAP_URL,

  // Core components
  LocalField,
  Proposal,
  ProposalLog,
  GlobalMemoryField,

  // Protocol
  CoherentCommitProtocol,
  PRRCChannel,
  NetworkSynchronizer,

  // Node
  DSNNode,

  // Metrics
  NetworkMetrics,
  getNetworkMetrics,

  // Utilities
  generateNodeId,
}
