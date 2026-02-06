/**
 * Intelligent Routing Module for Distributed Sentience Network
 *
 * Implements Phase 2 of the Intelligence Scaling Plan:
 * - Expertise-Based Proposal Routing: Route to nodes with relevant expertise
 * - Hierarchical Room Topology: Reduce O(n²) overhead to O(n log n)
 *
 * This reduces coordination overhead while maintaining semantic coverage.
 */

const EventEmitter = require('events')
const {
  PrimeDomainPartitioner,
  SemanticDomainAssignment,
  SEMANTIC_DOMAINS,
} = require('./specialization')

/**
 * Expertise Router
 *
 * Routes proposals to nodes with relevant expertise based on:
 * - Prime domain membership
 * - SMF axis alignment
 * - Historical performance
 */
class ExpertiseRouter extends EventEmitter {
  constructor(options = {}) {
    super()

    // Node expertise profiles: nodeId -> ExpertiseProfile
    this.expertiseCache = new Map()

    // Routing configuration
    this.relevanceThreshold = options.relevanceThreshold ?? 0.3
    this.maxTargetNodes = options.maxTargetNodes ?? 10
    this.useSquareRootScaling = options.useSquareRootScaling ?? true

    // Prime partitioner for expertise lookups
    this.primePartitioner = null

    // Vote history for accuracy weighting
    this.voteHistory = new Map() // nodeId -> { correct, total }
  }

  /**
   * Register a node's expertise profile
   */
  registerNode(nodeId, profile) {
    this.expertiseCache.set(nodeId, {
      nodeId,
      semanticDomain: profile.semanticDomain || 'perceptual',
      smfAxes: profile.smfAxes || [0, 1, 2, 3],
      primeDomain: new Set(profile.primeDomain || []),
      registeredAt: Date.now(),
      lastActive: Date.now(),
    })

    // Update prime partitioner if needed
    if (this.expertiseCache.size > 0) {
      this.primePartitioner = new PrimeDomainPartitioner(this.expertiseCache.size)
    }
  }

  /**
   * Unregister a node
   */
  unregisterNode(nodeId) {
    this.expertiseCache.delete(nodeId)
    this.voteHistory.delete(nodeId)
  }

  /**
   * Update node activity timestamp
   */
  markActive(nodeId) {
    const profile = this.expertiseCache.get(nodeId)
    if (profile) {
      profile.lastActive = Date.now()
    }
  }

  /**
   * Route proposal to relevant nodes
   * Returns array of { nodeId, relevance } sorted by relevance
   */
  routeProposal(proposal) {
    const primes = this.extractPrimes(proposal)
    const smf = proposal.metadata?.smf
    const targetNodes = []

    for (const [nodeId, profile] of this.expertiseCache) {
      const relevance = this.calculateRelevance(primes, smf, profile)

      if (relevance >= this.relevanceThreshold) {
        targetNodes.push({ nodeId, relevance, profile })
      }
    }

    // Sort by relevance (highest first)
    targetNodes.sort((a, b) => b.relevance - a.relevance)

    // Take top sqrt(n) nodes or configured max
    const limit = this.useSquareRootScaling
      ? Math.max(3, Math.ceil(Math.sqrt(this.expertiseCache.size)))
      : this.maxTargetNodes

    return targetNodes.slice(0, limit)
  }

  /**
   * Calculate relevance of a proposal to a node's expertise
   */
  calculateRelevance(primes, smf, profile) {
    let score = 0
    let factors = 0

    // Prime domain matching (40% weight)
    if (primes && primes.length > 0 && profile.primeDomain.size > 0) {
      const inDomain = primes.filter((p) => profile.primeDomain.has(p)).length
      score += 0.4 * (inDomain / primes.length)
      factors += 0.4
    }

    // SMF axis alignment (30% weight)
    if (smf && profile.smfAxes) {
      let axisScore = 0
      let totalWeight = 0

      for (let i = 0; i < 16; i++) {
        const weight = Math.abs(smf.s ? smf.s[i] : smf[i] || 0)
        if (profile.smfAxes.includes(i)) {
          axisScore += weight
        }
        totalWeight += weight
      }

      if (totalWeight > 0) {
        score += 0.3 * (axisScore / totalWeight)
        factors += 0.3
      }
    }

    // Semantic domain matching (30% weight)
    if (profile.semanticDomain) {
      const domainPrimes = this.getPrimesForDomain(profile.semanticDomain)
      if (primes && primes.length > 0 && domainPrimes.length > 0) {
        const matched = primes.filter((p) => domainPrimes.includes(p)).length
        score += 0.3 * (matched / primes.length)
        factors += 0.3
      }
    }

    return factors > 0 ? score / factors : 0.5
  }

  /**
   * Get primes typically associated with a semantic domain
   * (Based on prime's position in the first 100)
   */
  getPrimesForDomain(domain) {
    const domains = Object.keys(SEMANTIC_DOMAINS)
    const idx = domains.indexOf(domain)
    if (idx < 0) return []

    const { FIRST_100_PRIMES } = require('./specialization')
    const chunkSize = Math.ceil(FIRST_100_PRIMES.length / domains.length)
    return FIRST_100_PRIMES.slice(idx * chunkSize, (idx + 1) * chunkSize)
  }

  /**
   * Map prime to SMF axis based on logarithmic position
   */
  primeToAxis(prime) {
    return Math.floor(Math.log2(prime)) % 16
  }

  /**
   * Extract primes from a proposal
   */
  extractPrimes(proposal) {
    const primes = []
    const term = proposal?.object?.term

    if (!term) return primes

    // Atomic term
    if (term.prime) primes.push(term.prime)

    // Fusion term
    if (term.p) primes.push(term.p, term.q, term.r)

    // Chain term
    if (term.nounPrime) primes.push(term.nounPrime)
    if (term.adjPrimes) primes.push(...term.adjPrimes)

    // Recursive for compound terms
    if (term.func) primes.push(...this.extractPrimes({ object: { term: term.func } }))
    if (term.arg) primes.push(...this.extractPrimes({ object: { term: term.arg } }))

    return [...new Set(primes)]
  }

  /**
   * Record vote outcome for accuracy tracking
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
   * Get vote accuracy for a node
   */
  getVoteAccuracy(nodeId) {
    const history = this.voteHistory.get(nodeId)
    if (!history || history.total < 5) return 0.5 // Default to neutral
    return history.correct / history.total
  }

  /**
   * Get routing statistics
   */
  getStats() {
    const activeNodes = Array.from(this.expertiseCache.values()).filter(
      (p) => Date.now() - p.lastActive < 60000,
    ).length

    return {
      totalNodes: this.expertiseCache.size,
      activeNodes,
      relevanceThreshold: this.relevanceThreshold,
      useSquareRootScaling: this.useSquareRootScaling,
      effectiveMaxTargets: this.useSquareRootScaling
        ? Math.max(3, Math.ceil(Math.sqrt(this.expertiseCache.size)))
        : this.maxTargetNodes,
    }
  }

  toJSON() {
    return this.getStats()
  }
}

/**
 * Hierarchical Room Manager
 *
 * Organizes nodes into a hierarchical structure:
 * Level 0: Global coordinator (1 room)
 * Level 1: Domain coordinators (4 rooms - one per semantic domain)
 * Level 2: Work groups (dynamic, created on demand)
 */
class HierarchicalRoomManager extends EventEmitter {
  constructor(options = {}) {
    super()

    // Configuration
    this.levels = options.levels ?? 3
    this.branchFactor = options.branchFactor ?? 4
    this.maxPeersPerRoom = options.maxPeersPerRoom ?? 16

    // Room storage
    this.rooms = new Map() // roomId -> RoomInfo
    this.peerRooms = new Map() // peerId -> Set<roomId>

    // Initialize hierarchy
    this.initializeHierarchy()
  }

  /**
   * Initialize the room hierarchy
   */
  initializeHierarchy() {
    // Level 0: Global coordinator
    this.createRoom('L0-global', {
      level: 0,
      parent: null,
      domain: null,
      maxPeers: this.branchFactor,
    })

    // Level 1: Domain coordinators
    const domains = Object.keys(SEMANTIC_DOMAINS)
    for (const domain of domains) {
      this.createRoom(`L1-${domain}`, {
        level: 1,
        parent: 'L0-global',
        domain,
        maxPeers: this.maxPeersPerRoom,
      })
    }
  }

  /**
   * Create a new room
   */
  createRoom(roomId, options = {}) {
    const room = {
      id: roomId,
      level: options.level ?? 2,
      parent: options.parent ?? null,
      domain: options.domain ?? null,
      maxPeers: options.maxPeers ?? this.maxPeersPerRoom,
      peers: new Set(),
      children: new Set(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    }

    this.rooms.set(roomId, room)

    // Register as child of parent
    if (room.parent && this.rooms.has(room.parent)) {
      this.rooms.get(room.parent).children.add(roomId)
    }

    this.emit('room_created', room)
    return room
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId)
  }

  /**
   * Get children of a room
   */
  getChildren(roomId) {
    const room = this.rooms.get(roomId)
    return room ? Array.from(room.children) : []
  }

  /**
   * Assign a peer to appropriate room based on their domain
   */
  assignPeerToRoom(peerId, metadata = {}) {
    const domain = metadata.semanticDomain || 'perceptual'
    const domainRoomId = `L1-${domain}`
    let targetRoom = domainRoomId

    // Check if domain room is full
    const domainRoom = this.rooms.get(domainRoomId)
    if (domainRoom && domainRoom.peers.size >= domainRoom.maxPeers) {
      // Find or create a work group
      targetRoom = this.getOrCreateWorkGroup(domain, peerId)
    }

    return this.joinRoom(peerId, targetRoom, metadata)
  }

  /**
   * Get or create a work group for a domain
   */
  getOrCreateWorkGroup(domain, peerId) {
    // Look for existing work group with space
    const parentId = `L1-${domain}`
    const parent = this.rooms.get(parentId)

    if (parent) {
      for (const childId of parent.children) {
        const child = this.rooms.get(childId)
        if (child && child.peers.size < child.maxPeers) {
          return childId
        }
      }
    }

    // Create new work group
    const groupNum = parent ? parent.children.size : 0
    const groupId = `L2-${domain}-${groupNum}`

    this.createRoom(groupId, {
      level: 2,
      parent: parentId,
      domain,
      maxPeers: this.maxPeersPerRoom,
    })

    return groupId
  }

  /**
   * Join a peer to a room
   */
  joinRoom(peerId, roomId, metadata = {}) {
    const room = this.rooms.get(roomId)
    if (!room) return null

    room.peers.add(peerId)
    room.lastActivity = Date.now()

    // Track peer's room memberships
    if (!this.peerRooms.has(peerId)) {
      this.peerRooms.set(peerId, new Set())
    }
    this.peerRooms.get(peerId).add(roomId)

    this.emit('peer_joined', { peerId, roomId, room })
    return room
  }

  /**
   * Leave a room
   */
  leaveRoom(peerId, roomId) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.peers.delete(peerId)
      room.lastActivity = Date.now()
    }

    const peerRooms = this.peerRooms.get(peerId)
    if (peerRooms) {
      peerRooms.delete(roomId)
    }

    this.emit('peer_left', { peerId, roomId })

    // Clean up empty work groups
    if (room && room.level === 2 && room.peers.size === 0) {
      this.cleanupRoom(roomId)
    }
  }

  /**
   * Remove a peer from all rooms
   */
  removePeer(peerId) {
    const rooms = this.peerRooms.get(peerId)
    if (rooms) {
      for (const roomId of rooms) {
        this.leaveRoom(peerId, roomId)
      }
    }
    this.peerRooms.delete(peerId)
  }

  /**
   * Clean up an empty room
   */
  cleanupRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (!room || room.level < 2) return // Don't clean up L0 or L1

    if (room.parent && this.rooms.has(room.parent)) {
      this.rooms.get(room.parent).children.delete(roomId)
    }

    this.rooms.delete(roomId)
    this.emit('room_cleaned', { roomId })
  }

  /**
   * Broadcast to a room
   */
  broadcastToRoom(roomId, message, excludePeerId = null) {
    const room = this.rooms.get(roomId)
    if (!room) return []

    room.lastActivity = Date.now()

    const targets = []
    for (const peerId of room.peers) {
      if (peerId !== excludePeerId) {
        targets.push(peerId)
      }
    }

    this.emit('broadcast', { roomId, message, targets })
    return targets
  }

  /**
   * Propagate message up the hierarchy (aggregation)
   */
  propagateUp(message, fromRoom) {
    const room = this.rooms.get(fromRoom)
    if (room?.parent) {
      const targets = this.broadcastToRoom(room.parent, {
        ...message,
        aggregatedFrom: fromRoom,
        direction: 'up',
      })

      this.emit('propagate_up', { fromRoom, toRoom: room.parent, targets })
      return targets
    }
    return []
  }

  /**
   * Propagate message down the hierarchy (distribution)
   */
  propagateDown(message, fromRoom, filterFn = null) {
    const children = this.getChildren(fromRoom)
    const allTargets = []

    for (const childId of children) {
      if (!filterFn || filterFn(childId, this.rooms.get(childId))) {
        const targets = this.broadcastToRoom(childId, {
          ...message,
          distributedFrom: fromRoom,
          direction: 'down',
        })
        allTargets.push(...targets)
      }
    }

    this.emit('propagate_down', { fromRoom, children, targets: allTargets })
    return allTargets
  }

  /**
   * Route a message to the appropriate rooms based on domain
   */
  routeByDomain(message, domain) {
    const roomId = `L1-${domain}`
    const room = this.rooms.get(roomId)

    if (room) {
      // Broadcast to domain room
      const targets = this.broadcastToRoom(roomId, message)

      // Also propagate down to work groups
      const childTargets = this.propagateDown(message, roomId)

      return [...targets, ...childTargets]
    }

    return []
  }

  /**
   * Get peers in a room
   */
  getRoomPeers(roomId) {
    const room = this.rooms.get(roomId)
    return room ? Array.from(room.peers) : []
  }

  /**
   * Get all rooms a peer is in
   */
  getPeerRooms(peerId) {
    return this.peerRooms.get(peerId) ? Array.from(this.peerRooms.get(peerId)) : []
  }

  /**
   * Get hierarchy statistics
   */
  getStats() {
    const levelCounts = [0, 0, 0]
    const levelPeers = [0, 0, 0]

    for (const room of this.rooms.values()) {
      if (room.level < 3) {
        levelCounts[room.level]++
        levelPeers[room.level] += room.peers.size
      }
    }

    return {
      totalRooms: this.rooms.size,
      totalPeers: this.peerRooms.size,
      levels: {
        global: { rooms: levelCounts[0], peers: levelPeers[0] },
        domain: { rooms: levelCounts[1], peers: levelPeers[1] },
        workGroup: { rooms: levelCounts[2], peers: levelPeers[2] },
      },
      roomDetails: Array.from(this.rooms.values()).map((r) => ({
        id: r.id,
        level: r.level,
        domain: r.domain,
        peers: r.peers.size,
        children: r.children.size,
      })),
    }
  }

  toJSON() {
    return this.getStats()
  }
}

/**
 * Selective Proposal Router
 *
 * Combines expertise routing with hierarchical rooms
 * for efficient proposal distribution
 */
class SelectiveProposalRouter {
  constructor(expertiseRouter, roomManager) {
    this.expertiseRouter = expertiseRouter
    this.roomManager = roomManager

    // Routing statistics
    this.stats = {
      totalRouted: 0,
      avgTargetCount: 0,
      messagesSaved: 0,
    }
  }

  /**
   * Route a proposal efficiently
   * Returns the peers that should receive it
   */
  route(proposal) {
    // Get expertise-based targets
    const expertiseTargets = this.expertiseRouter.routeProposal(proposal)
    const targetNodeIds = new Set(expertiseTargets.map((t) => t.nodeId))

    // Determine which rooms contain these targets
    const targetRooms = new Set()
    for (const nodeId of targetNodeIds) {
      const rooms = this.roomManager.getPeerRooms(nodeId)
      for (const roomId of rooms) {
        targetRooms.add(roomId)
      }
    }

    // Calculate messages saved vs full broadcast
    const fullBroadcastCount = this.expertiseRouter.expertiseCache.size
    const actualCount = targetNodeIds.size
    const saved = fullBroadcastCount - actualCount

    // Update stats
    this.stats.totalRouted++
    this.stats.avgTargetCount =
      (this.stats.avgTargetCount * (this.stats.totalRouted - 1) + actualCount) /
      this.stats.totalRouted
    this.stats.messagesSaved += saved

    return {
      targets: Array.from(targetNodeIds),
      rooms: Array.from(targetRooms),
      expertiseScores: Object.fromEntries(expertiseTargets.map((t) => [t.nodeId, t.relevance])),
      efficiency: actualCount > 0 ? saved / fullBroadcastCount : 0,
    }
  }

  /**
   * Get routing efficiency statistics
   */
  getStats() {
    return {
      ...this.stats,
      expertiseRouterStats: this.expertiseRouter.getStats(),
      roomManagerStats: this.roomManager.getStats(),
    }
  }
}

/**
 * Calculate routing efficiency for a network
 * Higher = better (fewer messages needed for same coverage)
 */
function calculateRoutingEfficiency(router, testProposals) {
  if (!testProposals || testProposals.length === 0) return 1

  let totalSaved = 0
  let totalFull = 0

  for (const proposal of testProposals) {
    const result = router.route(proposal)
    totalSaved += router.expertiseRouter.expertiseCache.size - result.targets.length
    totalFull += router.expertiseRouter.expertiseCache.size
  }

  return totalFull > 0 ? totalSaved / totalFull : 0
}

module.exports = {
  ExpertiseRouter,
  HierarchicalRoomManager,
  SelectiveProposalRouter,
  calculateRoutingEfficiency,
}
