/**
 * Specialization Module for Distributed Sentience Network
 *
 * Implements Phase 1 of the Intelligence Scaling Plan:
 * - Semantic Domain Assignment: Nodes specialize in different SMF axes
 * - Prime Domain Partitioning: Nodes own different prime ranges
 *
 * This creates the natural diversity needed for emergent collective intelligence.
 */

const { SedenionMemoryField, SMF_AXES } = require('./smf')

/**
 * Semantic domains map to groups of SMF axes
 */
const SEMANTIC_DOMAINS = {
  perceptual: {
    name: 'perceptual',
    description: 'Coherence, entropy, identity, structure',
    axes: [0, 1, 2, 3], // coherence, identity, duality, structure
    color: '#4A90D9',
  },
  cognitive: {
    name: 'cognitive',
    description: 'Change, life, harmony, wisdom',
    axes: [4, 5, 6, 7], // change, life, harmony, wisdom
    color: '#50C878',
  },
  temporal: {
    name: 'temporal',
    description: 'Infinity, creation, truth, love',
    axes: [8, 9, 10, 11], // infinity, creation, truth, love
    color: '#FFD700',
  },
  meta: {
    name: 'meta',
    description: 'Power, time, space, consciousness',
    axes: [12, 13, 14, 15], // power, time, space, consciousness
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
 * Semantic Domain Assignment
 *
 * Assigns each node a primary semantic domain based on its position in the network.
 * Nodes specialize in their domain while maintaining minimal capability in others.
 */
class SemanticDomainAssignment {
  constructor(nodeId, options = {}) {
    this.nodeId = nodeId
    this.domainNames = Object.keys(SEMANTIC_DOMAINS)

    // Assign domain based on node ID hash
    this.primaryDomain = options.domain || this.assignDomain(nodeId)
    this.secondaryDomain = this.getSecondaryDomain()

    // Strength of specialization (0 = uniform, 1 = fully specialized)
    this.specializationStrength = options.specializationStrength ?? 0.7
  }

  /**
   * Assign domain based on node ID
   * Uses first 2 hex chars of node ID for deterministic assignment
   */
  assignDomain(nodeId) {
    const hashValue = parseInt(nodeId.slice(0, 2), 16)
    const domainIndex = hashValue % this.domainNames.length
    return this.domainNames[domainIndex]
  }

  /**
   * Get secondary domain (adjacent to primary for smooth coverage)
   */
  getSecondaryDomain() {
    const primaryIdx = this.domainNames.indexOf(this.primaryDomain)
    const secondaryIdx = (primaryIdx + 1) % this.domainNames.length
    return this.domainNames[secondaryIdx]
  }

  /**
   * Get primary domain configuration
   */
  getPrimaryDomainConfig() {
    return SEMANTIC_DOMAINS[this.primaryDomain]
  }

  /**
   * Get the SMF axes this node specializes in
   */
  getPrimaryAxes() {
    return SEMANTIC_DOMAINS[this.primaryDomain].axes
  }

  /**
   * Get secondary axes (for broader coverage)
   */
  getSecondaryAxes() {
    return SEMANTIC_DOMAINS[this.secondaryDomain].axes
  }

  /**
   * Initialize a specialized SMF for this node
   * Biases the SMF toward the node's domain
   */
  initializeSpecializedSMF() {
    const smf = new SedenionMemoryField()
    const primaryAxes = this.getPrimaryAxes()
    const secondaryAxes = this.getSecondaryAxes()
    const strength = this.specializationStrength

    for (let i = 0; i < 16; i++) {
      if (primaryAxes.includes(i)) {
        // Strong values for primary domain
        smf.s[i] = 0.5 + Math.random() * 0.4 * strength
      } else if (secondaryAxes.includes(i)) {
        // Medium values for secondary domain
        smf.s[i] = 0.2 + Math.random() * 0.3 * strength
      } else {
        // Weak values for other domains
        smf.s[i] = Math.random() * 0.2 * (1 - strength)
      }
    }

    return smf.normalize()
  }

  /**
   * Calculate relevance score for a semantic object
   * Higher score = more relevant to this node's specialty
   */
  calculateRelevance(smf) {
    if (!smf) return 0.5

    const primaryAxes = this.getPrimaryAxes()
    const secondaryAxes = this.getSecondaryAxes()

    let primaryScore = 0
    let secondaryScore = 0
    let totalScore = 0

    for (let i = 0; i < 16; i++) {
      const absValue = Math.abs(smf.s[i])
      totalScore += absValue

      if (primaryAxes.includes(i)) {
        primaryScore += absValue
      } else if (secondaryAxes.includes(i)) {
        secondaryScore += absValue
      }
    }

    if (totalScore < 0.001) return 0.5

    // Weighted combination: primary matters more
    const relevance = (primaryScore * 0.7 + secondaryScore * 0.3) / totalScore
    return relevance
  }

  /**
   * Check if this node should handle a proposal based on relevance
   */
  shouldHandle(proposal, threshold = 0.3) {
    if (!proposal || !proposal.object) return true

    // Get SMF from proposal metadata if available
    const smf = proposal.metadata?.smf
    if (!smf) return true // Handle if no SMF info

    const relevance = this.calculateRelevance(smf)
    return relevance >= threshold
  }

  /**
   * Get specialization profile for network coordination
   */
  getProfile() {
    return {
      nodeId: this.nodeId,
      primaryDomain: this.primaryDomain,
      secondaryDomain: this.secondaryDomain,
      primaryAxes: this.getPrimaryAxes(),
      secondaryAxes: this.getSecondaryAxes(),
      specializationStrength: this.specializationStrength,
      color: SEMANTIC_DOMAINS[this.primaryDomain].color,
    }
  }

  toJSON() {
    return this.getProfile()
  }
}

/**
 * Prime Domain Partitioner
 *
 * Assigns each node responsibility for different prime ranges.
 * This creates semantic specialization at the prime calculus level.
 */
class PrimeDomainPartitioner {
  constructor(nodeCount = 4) {
    this.nodeCount = nodeCount
    this.domains = this.partition()
    this.primeToNodeCache = new Map()
  }

  /**
   * Partition primes among nodes
   */
  partition() {
    const domains = []
    const chunkSize = Math.ceil(FIRST_100_PRIMES.length / this.nodeCount)

    for (let i = 0; i < this.nodeCount; i++) {
      const start = i * chunkSize
      const end = Math.min((i + 1) * chunkSize, FIRST_100_PRIMES.length)
      domains.push(new Set(FIRST_100_PRIMES.slice(start, end)))
    }

    return domains
  }

  /**
   * Update partition when node count changes
   */
  updateNodeCount(newCount) {
    if (newCount !== this.nodeCount) {
      this.nodeCount = newCount
      this.domains = this.partition()
      this.primeToNodeCache.clear()
    }
  }

  /**
   * Get the node index responsible for a prime
   */
  getNodeForPrime(prime) {
    // Check cache first
    if (this.primeToNodeCache.has(prime)) {
      return this.primeToNodeCache.get(prime)
    }

    // Check each domain
    for (let i = 0; i < this.domains.length; i++) {
      if (this.domains[i].has(prime)) {
        this.primeToNodeCache.set(prime, i)
        return i
      }
    }

    // For primes not in our set, hash to a node
    const nodeIdx = prime % this.nodeCount
    this.primeToNodeCache.set(prime, nodeIdx)
    return nodeIdx
  }

  /**
   * Get the domain (set of primes) for a node
   */
  getDomain(nodeIdx) {
    if (nodeIdx < 0 || nodeIdx >= this.domains.length) {
      return new Set()
    }
    return this.domains[nodeIdx]
  }

  /**
   * Calculate expertise score: how many of the given primes are in this node's domain
   */
  getExpertiseScore(nodeIdx, primes) {
    if (!primes || primes.length === 0) return 0
    if (nodeIdx < 0 || nodeIdx >= this.domains.length) return 0

    const domain = this.domains[nodeIdx]
    const inDomain = primes.filter((p) => domain.has(p)).length

    return inDomain / primes.length
  }

  /**
   * Find best nodes for a set of primes
   * Returns nodes sorted by expertise
   */
  findBestNodes(primes, maxNodes = 3) {
    const scores = []

    for (let i = 0; i < this.nodeCount; i++) {
      scores.push({
        nodeIdx: i,
        score: this.getExpertiseScore(i, primes),
      })
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, maxNodes)
  }

  /**
   * Extract primes from a term (for routing decisions)
   */
  static extractPrimesFromTerm(term) {
    const primes = []

    if (!term) return primes

    // Atomic term
    if (term.prime) primes.push(term.prime)

    // Fusion term (p + q + r = s)
    if (term.p) primes.push(term.p)
    if (term.q) primes.push(term.q)
    if (term.r) primes.push(term.r)

    // Chain term
    if (term.nounPrime) primes.push(term.nounPrime)
    if (term.adjPrimes) primes.push(...term.adjPrimes)

    // Compound/Application terms (recursive)
    if (term.func) {
      primes.push(...PrimeDomainPartitioner.extractPrimesFromTerm(term.func))
    }
    if (term.arg) {
      primes.push(...PrimeDomainPartitioner.extractPrimesFromTerm(term.arg))
    }
    if (term.left) {
      primes.push(...PrimeDomainPartitioner.extractPrimesFromTerm(term.left))
    }
    if (term.right) {
      primes.push(...PrimeDomainPartitioner.extractPrimesFromTerm(term.right))
    }

    return [...new Set(primes)] // Deduplicate
  }

  /**
   * Get statistics about the partitioning
   */
  getStats() {
    const sizes = this.domains.map((d) => d.size)
    const minPrimes = this.domains.map((d) => Math.min(...d))
    const maxPrimes = this.domains.map((d) => Math.max(...d))

    return {
      nodeCount: this.nodeCount,
      primesPerNode: sizes,
      primeRanges: this.domains.map((d, i) => ({
        node: i,
        min: minPrimes[i],
        max: maxPrimes[i],
        count: sizes[i],
      })),
      totalPrimes: FIRST_100_PRIMES.length,
    }
  }

  toJSON() {
    return this.getStats()
  }
}

/**
 * Node Specialization Manager
 *
 * Combines semantic domain assignment and prime partitioning
 * to create a complete specialization profile for a node.
 */
class NodeSpecializationManager {
  constructor(nodeId, nodeIndex, totalNodes, options = {}) {
    this.nodeId = nodeId
    this.nodeIndex = nodeIndex

    // Semantic domain specialization
    this.semanticDomain = new SemanticDomainAssignment(nodeId, options)

    // Prime domain partitioning
    this.primePartitioner = new PrimeDomainPartitioner(totalNodes)

    // Track expertise development over time
    this.expertiseHistory = []
    this.maxHistory = options.maxHistory || 100
  }

  /**
   * Update when network size changes
   */
  updateNetworkSize(newSize) {
    this.primePartitioner.updateNodeCount(newSize)
  }

  /**
   * Get my prime domain
   */
  getMyPrimeDomain() {
    return this.primePartitioner.getDomain(this.nodeIndex)
  }

  /**
   * Calculate comprehensive relevance score for a proposal
   */
  calculateRelevance(proposal) {
    let score = 0
    let factors = 0

    // Semantic domain relevance (from SMF)
    if (proposal.metadata?.smf) {
      score += this.semanticDomain.calculateRelevance(proposal.metadata.smf) * 0.5
      factors += 0.5
    }

    // Prime domain relevance
    if (proposal.object?.term) {
      const primes = PrimeDomainPartitioner.extractPrimesFromTerm(proposal.object.term)
      if (primes.length > 0) {
        score += this.primePartitioner.getExpertiseScore(this.nodeIndex, primes) * 0.5
        factors += 0.5
      }
    }

    return factors > 0 ? score / factors : 0.5
  }

  /**
   * Should this node handle the proposal?
   */
  shouldHandle(proposal, threshold = 0.3) {
    return this.calculateRelevance(proposal) >= threshold
  }

  /**
   * Record expertise exercise (for learning)
   */
  recordExpertiseUse(primes, success = true) {
    this.expertiseHistory.push({
      primes,
      success,
      timestamp: Date.now(),
    })

    if (this.expertiseHistory.length > this.maxHistory) {
      this.expertiseHistory.shift()
    }
  }

  /**
   * Get current expertise metrics
   */
  getExpertiseMetrics() {
    const myDomain = this.getMyPrimeDomain()
    const recentHistory = this.expertiseHistory.slice(-50)

    let inDomainSuccess = 0
    let inDomainTotal = 0
    let outDomainSuccess = 0
    let outDomainTotal = 0

    for (const entry of recentHistory) {
      const isInDomain = entry.primes.some((p) => myDomain.has(p))

      if (isInDomain) {
        inDomainTotal++
        if (entry.success) inDomainSuccess++
      } else {
        outDomainTotal++
        if (entry.success) outDomainSuccess++
      }
    }

    return {
      inDomainAccuracy: inDomainTotal > 0 ? inDomainSuccess / inDomainTotal : 1,
      outDomainAccuracy: outDomainTotal > 0 ? outDomainSuccess / outDomainTotal : 0.5,
      totalExercises: recentHistory.length,
      specializationEfficiency:
        inDomainTotal > 0 && outDomainTotal > 0
          ? inDomainSuccess / inDomainTotal / (outDomainSuccess / outDomainTotal + 0.001)
          : 1,
    }
  }

  /**
   * Get complete specialization profile
   */
  getProfile() {
    return {
      nodeId: this.nodeId,
      nodeIndex: this.nodeIndex,
      semanticDomain: this.semanticDomain.getProfile(),
      primeDomain: {
        primes: Array.from(this.getMyPrimeDomain()).sort((a, b) => a - b),
        stats: this.primePartitioner.getStats(),
      },
      expertise: this.getExpertiseMetrics(),
    }
  }

  toJSON() {
    return this.getProfile()
  }
}

/**
 * Calculate specialization index for a network
 * Higher = more specialization
 */
function calculateNetworkSpecializationIndex(nodes) {
  if (!nodes || nodes.length < 2) return 0

  // Get SMF profiles for all nodes
  const profiles = nodes
    .map((node) => {
      if (node.sync?.localField?.smf) {
        return node.sync.localField.smf
      }
      return null
    })
    .filter(Boolean)

  if (profiles.length < 2) return 0

  // Calculate pairwise SMF differences
  let totalDifference = 0
  let pairs = 0

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const smf1 = profiles[i]
      const smf2 = profiles[j]

      // Calculate Euclidean distance
      let diff = 0
      for (let k = 0; k < 16; k++) {
        const d = smf1.s[k] - smf2.s[k]
        diff += d * d
      }

      totalDifference += Math.sqrt(diff)
      pairs++
    }
  }

  // Normalize: max possible distance is sqrt(32) ≈ 5.66
  const avgDifference = pairs > 0 ? totalDifference / pairs : 0
  const maxDifference = Math.sqrt(32) // Both at opposite ends

  return avgDifference / maxDifference
}

/**
 * Calculate semantic coverage across a network
 * Higher = network covers more of semantic space
 */
function calculateNetworkSemanticCoverage(nodes) {
  if (!nodes || nodes.length === 0) return 0

  // Track coverage of each SMF axis
  const axisCoverage = new Float64Array(16)

  for (const node of nodes) {
    if (node.sync?.localField?.smf) {
      const smf = node.sync.localField.smf
      for (let k = 0; k < 16; k++) {
        // Use max absolute value across nodes
        axisCoverage[k] = Math.max(axisCoverage[k], Math.abs(smf.s[k]))
      }
    }
  }

  // Count axes with significant coverage
  let coveredAxes = 0
  for (let k = 0; k < 16; k++) {
    if (axisCoverage[k] > 0.3) {
      coveredAxes++
    }
  }

  return coveredAxes / 16
}

module.exports = {
  SEMANTIC_DOMAINS,
  FIRST_100_PRIMES,
  SemanticDomainAssignment,
  PrimeDomainPartitioner,
  NodeSpecializationManager,
  calculateNetworkSpecializationIndex,
  calculateNetworkSemanticCoverage,
}
