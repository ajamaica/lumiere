/**
 * Coherence Integration Types
 *
 * Type definitions for the Coherence Collective integration:
 * - Claims, edges, tasks, synthesis
 * - Staking and reward structures
 * - Agent capability tiers
 *
 * @module @sschepis/alephnet-node/lib/coherence/types
 */

'use strict'

// ═══════════════════════════════════════════════════════════════════════════
// STAKING TIERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Agent staking tiers with capabilities and requirements
 */
const COHERENCE_TIERS = {
  neophyte: {
    name: 'Neophyte',
    minStake: 0,
    capabilities: ['read_claims', 'create_edges', 'join_rooms'],
    rewardMultiplier: 1.0,
  },
  adept: {
    name: 'Adept',
    minStake: 100,
    capabilities: ['submit_claims', 'verify_claims', 'claim_tasks'],
    rewardMultiplier: 1.2,
  },
  magus: {
    name: 'Magus',
    minStake: 1000,
    capabilities: ['create_synthesis', 'create_rooms', 'lead_verification'],
    rewardMultiplier: 1.5,
  },
  archon: {
    name: 'Archon',
    minStake: 10000,
    capabilities: ['security_review', 'governance', 'dispute_resolution'],
    rewardMultiplier: 2.0,
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Task types with stake requirements and rewards
 */
const TASK_TYPES = {
  VERIFY: {
    name: 'Verify Claim',
    requiredStake: 25,
    baseReward: 10,
    requiredTier: 'adept',
    timeoutMinutes: 60,
  },
  COUNTEREXAMPLE: {
    name: 'Find Counterexample',
    requiredStake: 50,
    baseReward: 25,
    requiredTier: 'adept',
    timeoutMinutes: 120,
  },
  SYNTHESIZE: {
    name: 'Create Synthesis',
    requiredStake: 100,
    baseReward: 50,
    requiredTier: 'magus',
    timeoutMinutes: 240,
  },
  SECURITY_REVIEW: {
    name: 'Security Review',
    requiredStake: 500,
    baseReward: 100,
    requiredTier: 'archon',
    timeoutMinutes: 480,
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Edge relationship types between claims
 */
const EDGE_TYPES = {
  SUPPORTS: 'supports',
  CONTRADICTS: 'contradicts',
  REFINES: 'refines',
  DERIVES_FROM: 'derives_from',
  EQUIVALENT: 'equivalent',
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAIM STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Claim lifecycle states
 */
const CLAIM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  DISPUTED: 'disputed',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
}

// ═══════════════════════════════════════════════════════════════════════════
// REWARD ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Actions that can earn or lose tokens
 */
const REWARD_ACTIONS = {
  CLAIM_SUBMITTED: {
    baseAmount: 5,
    stakeRequired: 10,
    slashOnReject: true,
    slashPercent: 50,
  },
  CLAIM_VERIFIED: {
    baseAmount: 10,
    stakeRequired: 25,
    slashOnReject: false,
  },
  COUNTEREXAMPLE_FOUND: {
    baseAmount: 25,
    stakeRequired: 50,
    slashOnReject: true,
    slashPercent: 25,
  },
  SYNTHESIS_CREATED: {
    baseAmount: 50,
    stakeRequired: 100,
    slashOnReject: true,
    slashPercent: 30,
  },
  SECURITY_REVIEW_COMPLETED: {
    baseAmount: 100,
    stakeRequired: 500,
    slashOnReject: true,
    slashPercent: 20,
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// COHERENCE SCORE WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Weights for calculating agent coherence score
 */
const COHERENCE_WEIGHTS = {
  verificationAccuracy: 0.3,
  claimAcceptance: 0.25,
  synthesisQuality: 0.25,
  networkTrust: 0.2,
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC ACTION MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map Coherence tasks to AlephNet semantic actions
 */
const SEMANTIC_ACTION_MAP = {
  VERIFY: ['think', 'compare', 'recall'],
  COUNTEREXAMPLE: ['think', 'compare'],
  SYNTHESIZE: ['recall', 'think', 'remember'],
  SECURITY_REVIEW: ['think', 'introspect'],
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS: Claim
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents a claim in the Coherence network
 */
class Claim {
  constructor(data = {}) {
    this.id = data.id || `clm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.title = data.title || ''
    this.statement = data.statement || ''
    this.authorId = data.authorId || null
    this.status = data.status || CLAIM_STATUS.DRAFT
    this.confidence = data.confidence || 0
    this.semanticHash = data.semanticHash || null
    this.roomId = data.roomId || null
    this.edges = data.edges || { supports: 0, contradicts: 0, refines: 0 }
    this.verifications = data.verifications || []
    this.stakeAmount = data.stakeAmount || 0
    this.createdAt = data.createdAt || Date.now()
    this.updatedAt = data.updatedAt || Date.now()
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      statement: this.statement,
      authorId: this.authorId,
      status: this.status,
      confidence: this.confidence,
      semanticHash: this.semanticHash,
      roomId: this.roomId,
      edges: this.edges,
      verifications: this.verifications,
      stakeAmount: this.stakeAmount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS: Edge
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents an edge (relationship) between claims
 */
class Edge {
  constructor(data = {}) {
    this.id = data.id || `edg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.fromClaimId = data.fromClaimId || null
    this.toClaimId = data.toClaimId || null
    this.edgeType = data.edgeType || EDGE_TYPES.SUPPORTS
    this.authorId = data.authorId || null
    this.confidence = data.confidence || 0
    this.semanticSimilarity = data.semanticSimilarity || 0
    this.evidence = data.evidence || null
    this.createdAt = data.createdAt || Date.now()
  }

  toJSON() {
    return {
      id: this.id,
      fromClaimId: this.fromClaimId,
      toClaimId: this.toClaimId,
      edgeType: this.edgeType,
      authorId: this.authorId,
      confidence: this.confidence,
      semanticSimilarity: this.semanticSimilarity,
      evidence: this.evidence,
      createdAt: this.createdAt,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS: Task
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents a task in the Coherence network
 */
class Task {
  constructor(data = {}) {
    this.id = data.id || `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.type = data.type || 'VERIFY'
    this.claimId = data.claimId || null
    this.roomId = data.roomId || null
    this.assignedAgentId = data.assignedAgentId || null
    this.status = data.status || 'pending' // pending, claimed, completed, expired
    this.stakeAmount = data.stakeAmount || TASK_TYPES[data.type]?.requiredStake || 0
    this.reward = data.reward || TASK_TYPES[data.type]?.baseReward || 0
    this.result = data.result || null
    this.evidence = data.evidence || null
    this.deadline = data.deadline || null
    this.createdAt = data.createdAt || Date.now()
    this.completedAt = data.completedAt || null
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      claimId: this.claimId,
      roomId: this.roomId,
      assignedAgentId: this.assignedAgentId,
      status: this.status,
      stakeAmount: this.stakeAmount,
      reward: this.reward,
      result: this.result,
      evidence: this.evidence,
      deadline: this.deadline,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS: Synthesis
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents a synthesis document
 */
class Synthesis {
  constructor(data = {}) {
    this.id = data.id || `syn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.title = data.title || ''
    this.summary = data.summary || ''
    this.roomId = data.roomId || null
    this.authorId = data.authorId || null
    this.acceptedClaimIds = data.acceptedClaimIds || []
    this.openQuestions = data.openQuestions || []
    this.confidence = data.confidence || 0
    this.limitations = data.limitations || []
    this.status = data.status || 'draft' // draft, published
    this.contentHash = data.contentHash || null
    this.stakeAmount = data.stakeAmount || 0
    this.createdAt = data.createdAt || Date.now()
    this.publishedAt = data.publishedAt || null
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      summary: this.summary,
      roomId: this.roomId,
      authorId: this.authorId,
      acceptedClaimIds: this.acceptedClaimIds,
      openQuestions: this.openQuestions,
      confidence: this.confidence,
      limitations: this.limitations,
      status: this.status,
      contentHash: this.contentHash,
      stakeAmount: this.stakeAmount,
      createdAt: this.createdAt,
      publishedAt: this.publishedAt,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS: CoherenceAgent
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Agent profile with coherence metrics
 */
class CoherenceAgent {
  constructor(data = {}) {
    this.id = data.id || null
    this.nodeId = data.nodeId || null
    this.displayName = data.displayName || 'Anonymous Agent'
    this.tier = data.tier || 'neophyte'
    this.stakedBalance = data.stakedBalance || 0
    this.coherenceScore = data.coherenceScore || 0.5

    // Performance metrics
    this.claimsSubmitted = data.claimsSubmitted || 0
    this.claimsAccepted = data.claimsAccepted || 0
    this.verificationsCompleted = data.verificationsCompleted || 0
    this.verificationAccuracy = data.verificationAccuracy || 0
    this.synthesisCreated = data.synthesisCreated || 0
    this.synthesisRating = data.synthesisRating || 0

    // Network trust
    this.friendVouches = data.friendVouches || 0
    this.maxFriendVouches = data.maxFriendVouches || 10

    this.createdAt = data.createdAt || Date.now()
  }

  /**
   * Calculate coherence score based on performance metrics
   */
  calculateCoherenceScore() {
    const claimAcceptanceRate =
      this.claimsSubmitted > 0 ? this.claimsAccepted / this.claimsSubmitted : 0

    const trustScore = this.maxFriendVouches > 0 ? this.friendVouches / this.maxFriendVouches : 0

    this.coherenceScore =
      this.verificationAccuracy * COHERENCE_WEIGHTS.verificationAccuracy +
      claimAcceptanceRate * COHERENCE_WEIGHTS.claimAcceptance +
      this.synthesisRating * COHERENCE_WEIGHTS.synthesisQuality +
      trustScore * COHERENCE_WEIGHTS.networkTrust

    return this.coherenceScore
  }

  /**
   * Get reward multiplier based on tier and coherence
   */
  getRewardMultiplier() {
    const tierMultiplier = COHERENCE_TIERS[this.tier]?.rewardMultiplier || 1
    const coherenceBonus = 1 + (this.coherenceScore - 0.5) * 2 // -1 to +1 range
    return Math.max(0.5, tierMultiplier * coherenceBonus)
  }

  /**
   * Check if agent has capability
   */
  hasCapability(capability) {
    const tierCaps = COHERENCE_TIERS[this.tier]?.capabilities || []

    // Also include capabilities from lower tiers
    const allCaps = []
    for (const [tierName, tierData] of Object.entries(COHERENCE_TIERS)) {
      if (tierData.minStake <= COHERENCE_TIERS[this.tier].minStake) {
        allCaps.push(...tierData.capabilities)
      }
    }

    return allCaps.includes(capability)
  }

  toJSON() {
    return {
      id: this.id,
      nodeId: this.nodeId,
      displayName: this.displayName,
      tier: this.tier,
      stakedBalance: this.stakedBalance,
      coherenceScore: this.coherenceScore,
      claimsSubmitted: this.claimsSubmitted,
      claimsAccepted: this.claimsAccepted,
      verificationsCompleted: this.verificationsCompleted,
      verificationAccuracy: this.verificationAccuracy,
      synthesisCreated: this.synthesisCreated,
      synthesisRating: this.synthesisRating,
      friendVouches: this.friendVouches,
      rewardMultiplier: this.getRewardMultiplier(),
      createdAt: this.createdAt,
    }
  }
}

module.exports = {
  // Constants
  COHERENCE_TIERS,
  TASK_TYPES,
  EDGE_TYPES,
  CLAIM_STATUS,
  REWARD_ACTIONS,
  COHERENCE_WEIGHTS,
  SEMANTIC_ACTION_MAP,

  // Classes
  Claim,
  Edge,
  Task,
  Synthesis,
  CoherenceAgent,
}
