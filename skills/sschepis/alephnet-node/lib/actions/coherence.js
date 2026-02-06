/**
 * Coherence Actions
 *
 * Actions for interacting with the Coherence Collective network:
 * - Submit and verify claims
 * - Create edges between claims
 * - Claim and complete tasks
 * - Create synthesis documents
 * - Manage stakes and rewards
 *
 * @module @sschepis/alephnet-node/lib/actions/coherence
 */

'use strict'

const {
  Claim,
  Edge,
  Task,
  Synthesis,
  CoherenceAgent,
  COHERENCE_TIERS,
  TASK_TYPES,
  EDGE_TYPES,
  CLAIM_STATUS,
  REWARD_ACTIONS,
} = require('../coherence/types')

const { getStakeManager, initStakeManager } = require('../coherence/stakes')
const { getRewardManager, initRewardManager } = require('../coherence/rewards')
const { getSemanticBridge, initSemanticBridge } = require('../coherence/semantic-bridge')

// State
let coherenceAgent = null
let claims = new Map()
let edges = new Map()
let tasks = new Map()
let syntheses = new Map()
let nodeId = null
let dataPath = './data'

/**
 * Initialize coherence manager
 */
function initCoherenceManager(id, path, wallet, semanticActions) {
  nodeId = id
  dataPath = path

  // Initialize stake manager
  initStakeManager(wallet, nodeId, dataPath)

  // Initialize reward manager
  const stakeManager = getStakeManager()
  initRewardManager(wallet, stakeManager, nodeId, dataPath)

  // Initialize semantic bridge
  initSemanticBridge(semanticActions)

  // Create agent profile
  coherenceAgent = new CoherenceAgent({
    nodeId,
    displayName: `Agent-${nodeId.slice(0, 8)}`,
  })

  // Load persisted state
  _load()

  return {
    agent: coherenceAgent,
    stakeManager,
    rewardManager: getRewardManager(),
    semanticBridge: getSemanticBridge(),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAIM ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

const coherenceActions = {
  /**
   * Submit a new claim
   */
  'coherence.submitClaim': async (args) => {
    const { title, statement, roomId } = args

    if (!statement) {
      return { error: 'Statement is required' }
    }

    const stakeManager = getStakeManager()
    const rewardManager = getRewardManager()
    const semanticBridge = getSemanticBridge()

    // Check stake requirement
    const stakeReq = REWARD_ACTIONS.CLAIM_SUBMITTED.stakeRequired
    if (!stakeManager?.canStake(stakeReq)) {
      return {
        error: 'Insufficient balance to stake',
        required: stakeReq,
        available: stakeManager?.getAvailableBalance() || 0,
      }
    }

    // Create claim
    const claim = new Claim({
      title: title || statement.slice(0, 50),
      statement,
      authorId: nodeId,
      roomId,
      status: CLAIM_STATUS.SUBMITTED,
      stakeAmount: stakeReq,
    })

    // Semantic analysis for hash
    if (semanticBridge) {
      const verification = await semanticBridge.processVerification(claim)
      claim.confidence = verification.confidence
      claim.semanticHash = `sem_${Date.now()}`
    }

    // Lock stake
    const stakeResult = stakeManager.lockStake(claim.id, stakeReq, 'CLAIM_SUBMITTED')
    if (!stakeResult.success) {
      return { error: stakeResult.error }
    }

    // Store claim
    claims.set(claim.id, claim)

    // Update agent profile
    if (coherenceAgent) {
      coherenceAgent.claimsSubmitted++
    }

    _save()

    return {
      submitted: true,
      claim: claim.toJSON(),
      stake: {
        amount: stakeReq,
        stakeId: stakeResult.stakeId,
      },
    }
  },

  /**
   * Verify a claim (complete verification task)
   */
  'coherence.verifyClaim': async (args) => {
    const { claimId } = args

    const claim = claims.get(claimId)
    if (!claim) {
      return { error: 'Claim not found' }
    }

    const stakeManager = getStakeManager()
    const rewardManager = getRewardManager()
    const semanticBridge = getSemanticBridge()

    // Check stake requirement
    const stakeReq = REWARD_ACTIONS.CLAIM_VERIFIED.stakeRequired
    if (!stakeManager?.canStake(stakeReq)) {
      return {
        error: 'Insufficient balance to stake for verification',
        required: stakeReq,
      }
    }

    // Lock stake
    const taskId = `ver_${claim.id}_${Date.now()}`
    stakeManager.lockStake(taskId, stakeReq, 'CLAIM_VERIFIED')

    // Run verification through semantic bridge
    let result
    if (semanticBridge) {
      result = await semanticBridge.processVerification(claim)
    } else {
      // Basic verification without semantic bridge
      result = {
        claimId,
        result: 'VERIFIED',
        confidence: 0.75,
        evidence: {},
      }
    }

    // Update claim status
    claim.status =
      result.result === 'VERIFIED'
        ? CLAIM_STATUS.VERIFIED
        : result.result === 'REJECTED'
          ? CLAIM_STATUS.REJECTED
          : CLAIM_STATUS.DISPUTED
    claim.confidence = result.confidence
    claim.verifications.push({
      verifierId: nodeId,
      result: result.result,
      confidence: result.confidence,
      timestamp: Date.now(),
    })
    claim.updatedAt = Date.now()

    // Release stake
    stakeManager.releaseStake(taskId)

    // Award reward if successful
    if (result.result === 'VERIFIED' || result.result === 'REJECTED') {
      const coherenceScore = rewardManager?.calculateCoherenceScore() || 0.5
      const tier = rewardManager?.getCurrentTier() || 'neophyte'

      rewardManager?.awardReward('CLAIM_VERIFIED', {
        coherenceScore,
        tier,
        performanceBonus: result.confidence,
      })

      // Update verification accuracy
      if (coherenceAgent) {
        coherenceAgent.verificationsCompleted++
        coherenceAgent.verificationsCorrect++
        coherenceAgent.calculateCoherenceScore()
      }
    }

    _save()

    return {
      verified: true,
      result: result.result,
      confidence: result.confidence,
      evidence: result.evidence,
      claim: claim.toJSON(),
    }
  },

  /**
   * Create an edge between two claims
   */
  'coherence.createEdge': async (args) => {
    const { fromClaimId, toClaimId, edgeType } = args

    const fromClaim = claims.get(fromClaimId)
    const toClaim = claims.get(toClaimId)

    if (!fromClaim || !toClaim) {
      return { error: 'One or both claims not found' }
    }

    const semanticBridge = getSemanticBridge()

    // Create edge via semantic bridge
    let edgeData
    if (semanticBridge) {
      edgeData = await semanticBridge.createEdge(fromClaim, toClaim)
    } else {
      edgeData = {
        fromClaimId,
        toClaimId,
        edgeType: edgeType || EDGE_TYPES.SUPPORTS,
        confidence: 0.7,
        semanticSimilarity: 0.7,
      }
    }

    const edge = new Edge({
      ...edgeData,
      authorId: nodeId,
      edgeType: edgeType || edgeData.edgeType,
    })

    // Update claim edge counts
    const type = edge.edgeType
    if (type === EDGE_TYPES.SUPPORTS) {
      toClaim.edges.supports++
    } else if (type === EDGE_TYPES.CONTRADICTS) {
      toClaim.edges.contradicts++
    } else if (type === EDGE_TYPES.REFINES) {
      toClaim.edges.refines++
    }

    edges.set(edge.id, edge)
    _save()

    return {
      created: true,
      edge: edge.toJSON(),
    }
  },

  /**
   * Get a claim by ID
   */
  'coherence.getClaim': async (args) => {
    const { claimId } = args
    const claim = claims.get(claimId)

    if (!claim) {
      return { error: 'Claim not found' }
    }

    return { claim: claim.toJSON() }
  },

  /**
   * List claims with optional filters
   */
  'coherence.listClaims': async (args = {}) => {
    const { status, roomId, authorId, limit = 50 } = args

    let filtered = Array.from(claims.values())

    if (status) {
      filtered = filtered.filter((c) => c.status === status)
    }
    if (roomId) {
      filtered = filtered.filter((c) => c.roomId === roomId)
    }
    if (authorId) {
      filtered = filtered.filter((c) => c.authorId === authorId)
    }

    // Sort by creation date, newest first
    filtered.sort((a, b) => b.createdAt - a.createdAt)

    return {
      claims: filtered.slice(0, limit).map((c) => c.toJSON()),
      total: filtered.length,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TASK ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Claim a task
   */
  'coherence.claimTask': async (args) => {
    const { taskId } = args

    const task = tasks.get(taskId)
    if (!task) {
      return { error: 'Task not found' }
    }

    if (task.status !== 'pending') {
      return { error: 'Task is not available', status: task.status }
    }

    const stakeManager = getStakeManager()
    const taskConfig = TASK_TYPES[task.type]

    // Check tier requirement
    const tier = getRewardManager()?.getCurrentTier() || 'neophyte'
    const tierOrder = ['neophyte', 'adept', 'magus', 'archon']
    if (tierOrder.indexOf(tier) < tierOrder.indexOf(taskConfig.requiredTier)) {
      return {
        error: 'Insufficient tier',
        required: taskConfig.requiredTier,
        current: tier,
      }
    }

    // Check and lock stake
    if (!stakeManager?.canStake(task.stakeAmount)) {
      return {
        error: 'Insufficient balance to stake',
        required: task.stakeAmount,
      }
    }

    stakeManager.lockStake(taskId, task.stakeAmount, task.type)

    // Update task
    task.assignedAgentId = nodeId
    task.status = 'claimed'
    task.deadline = Date.now() + taskConfig.timeoutMinutes * 60 * 1000

    _save()

    return {
      claimed: true,
      task: task.toJSON(),
      deadline: new Date(task.deadline).toISOString(),
    }
  },

  /**
   * Submit task result
   */
  'coherence.submitTaskResult': async (args) => {
    const { taskId, result, evidence } = args

    const task = tasks.get(taskId)
    if (!task) {
      return { error: 'Task not found' }
    }

    if (task.assignedAgentId !== nodeId) {
      return { error: 'Task not assigned to you' }
    }

    if (task.status !== 'claimed') {
      return { error: 'Task not in claimed status' }
    }

    const stakeManager = getStakeManager()
    const rewardManager = getRewardManager()

    // Update task
    task.result = result
    task.evidence = evidence
    task.status = 'completed'
    task.completedAt = Date.now()

    // Release stake
    stakeManager.releaseStake(taskId)

    // Award reward
    const rewardAction = {
      VERIFY: 'CLAIM_VERIFIED',
      COUNTEREXAMPLE: 'COUNTEREXAMPLE_FOUND',
      SYNTHESIZE: 'SYNTHESIS_CREATED',
      SECURITY_REVIEW: 'SECURITY_REVIEW_COMPLETED',
    }[task.type]

    if (rewardAction && rewardManager) {
      const coherenceScore = rewardManager.calculateCoherenceScore()
      const tier = rewardManager.getCurrentTier()

      const reward = rewardManager.awardReward(rewardAction, {
        coherenceScore,
        tier,
      })

      task.reward = reward.amount
    }

    _save()

    return {
      submitted: true,
      task: task.toJSON(),
      reward: task.reward,
    }
  },

  /**
   * List available tasks
   */
  'coherence.listTasks': async (args = {}) => {
    const { status = 'pending', type, limit = 20 } = args

    let filtered = Array.from(tasks.values())

    if (status) {
      filtered = filtered.filter((t) => t.status === status)
    }
    if (type) {
      filtered = filtered.filter((t) => t.type === type)
    }

    filtered.sort((a, b) => b.createdAt - a.createdAt)

    return {
      tasks: filtered.slice(0, limit).map((t) => t.toJSON()),
      total: filtered.length,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHESIS ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Create a synthesis
   */
  'coherence.createSynthesis': async (args) => {
    const { roomId, title, acceptedClaimIds, openQuestions, limitations } = args

    if (!acceptedClaimIds || acceptedClaimIds.length === 0) {
      return { error: 'At least one accepted claim is required' }
    }

    const stakeManager = getStakeManager()
    const rewardManager = getRewardManager()
    const semanticBridge = getSemanticBridge()

    // Check tier
    const tier = rewardManager?.getCurrentTier() || 'neophyte'
    if (tier !== 'magus' && tier !== 'archon') {
      return {
        error: 'Magus tier required to create synthesis',
        currentTier: tier,
      }
    }

    // Check stake
    const stakeReq = REWARD_ACTIONS.SYNTHESIS_CREATED.stakeRequired
    if (!stakeManager?.canStake(stakeReq)) {
      return { error: 'Insufficient balance to stake' }
    }

    // Get accepted claims
    const acceptedClaims = acceptedClaimIds.map((id) => claims.get(id)).filter((c) => c)

    if (acceptedClaims.length === 0) {
      return { error: 'No valid claims found' }
    }

    // Process synthesis
    let synthResult
    if (semanticBridge) {
      synthResult = await semanticBridge.processSynthesis(
        { id: roomId },
        acceptedClaimIds,
        acceptedClaims,
      )
    } else {
      synthResult = {
        title: title || 'Synthesis',
        summary: acceptedClaims.map((c) => c.statement).join('\n'),
        confidence: 0.7,
      }
    }

    // Create synthesis
    const synthesis = new Synthesis({
      title: title || synthResult.title,
      summary: synthResult.summary,
      roomId,
      authorId: nodeId,
      acceptedClaimIds,
      openQuestions: openQuestions || synthResult.openQuestions || [],
      confidence: synthResult.confidence,
      limitations: limitations || [],
      stakeAmount: stakeReq,
    })

    // Lock stake
    stakeManager.lockStake(synthesis.id, stakeReq, 'SYNTHESIS_CREATED')

    syntheses.set(synthesis.id, synthesis)

    // Update agent profile
    if (coherenceAgent) {
      coherenceAgent.synthesisCreated++
    }

    _save()

    return {
      created: true,
      synthesis: synthesis.toJSON(),
    }
  },

  /**
   * Publish a synthesis
   */
  'coherence.publishSynthesis': async (args) => {
    const { synthesisId } = args

    const synthesis = syntheses.get(synthesisId)
    if (!synthesis) {
      return { error: 'Synthesis not found' }
    }

    if (synthesis.authorId !== nodeId) {
      return { error: 'Not authorized to publish this synthesis' }
    }

    const stakeManager = getStakeManager()
    const rewardManager = getRewardManager()

    // Publish
    synthesis.status = 'published'
    synthesis.publishedAt = Date.now()

    // Release stake and award reward
    stakeManager.releaseStake(synthesis.id)

    if (rewardManager) {
      const coherenceScore = rewardManager.calculateCoherenceScore()
      const tier = rewardManager.getCurrentTier()

      rewardManager.awardReward('SYNTHESIS_CREATED', {
        coherenceScore,
        tier,
      })
    }

    _save()

    return {
      published: true,
      synthesis: synthesis.toJSON(),
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // COUNTEREXAMPLE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Find counterexamples for a claim
   */
  'coherence.findCounterexample': async (args) => {
    const { claimId } = args

    const claim = claims.get(claimId)
    if (!claim) {
      return { error: 'Claim not found' }
    }

    const stakeManager = getStakeManager()
    const rewardManager = getRewardManager()
    const semanticBridge = getSemanticBridge()

    // Check stake
    const stakeReq = REWARD_ACTIONS.COUNTEREXAMPLE_FOUND.stakeRequired
    if (!stakeManager?.canStake(stakeReq)) {
      return { error: 'Insufficient balance to stake' }
    }

    const taskId = `cex_${claimId}_${Date.now()}`
    stakeManager.lockStake(taskId, stakeReq, 'COUNTEREXAMPLE_FOUND')

    let result
    if (semanticBridge) {
      result = await semanticBridge.processCounterexample(claim)
    } else {
      result = {
        claimId,
        found: false,
        counterexamples: [],
        confidence: 0,
      }
    }

    // Release stake
    stakeManager.releaseStake(taskId)

    // Award if found
    if (result.found && rewardManager) {
      const coherenceScore = rewardManager.calculateCoherenceScore()
      const tier = rewardManager.getCurrentTier()

      rewardManager.awardReward('COUNTEREXAMPLE_FOUND', {
        coherenceScore,
        tier,
        performanceBonus: result.confidence,
      })
    }

    _save()

    return {
      searched: true,
      found: result.found,
      counterexamples: result.counterexamples,
      weaknesses: result.weaknesses,
      confidence: result.confidence,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECURITY REVIEW ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Perform security review on a claim
   */
  'coherence.securityReview': async (args) => {
    const { claimId } = args

    const claim = claims.get(claimId)
    if (!claim) {
      return { error: 'Claim not found' }
    }

    const stakeManager = getStakeManager()
    const rewardManager = getRewardManager()
    const semanticBridge = getSemanticBridge()

    // Check tier
    const tier = rewardManager?.getCurrentTier() || 'neophyte'
    if (tier !== 'archon') {
      return {
        error: 'Archon tier required for security review',
        currentTier: tier,
      }
    }

    // Check stake
    const stakeReq = REWARD_ACTIONS.SECURITY_REVIEW_COMPLETED.stakeRequired
    if (!stakeManager?.canStake(stakeReq)) {
      return { error: 'Insufficient balance to stake' }
    }

    const taskId = `sec_${claimId}_${Date.now()}`
    stakeManager.lockStake(taskId, stakeReq, 'SECURITY_REVIEW_COMPLETED')

    let result
    if (semanticBridge) {
      result = await semanticBridge.processSecurityReview(claim)
    } else {
      result = {
        claimId,
        result: 'APPROVED',
        safetyScore: 0.8,
        flaggedPatterns: [],
      }
    }

    // Release stake
    stakeManager.releaseStake(taskId)

    // Award reward
    if (rewardManager) {
      const coherenceScore = rewardManager.calculateCoherenceScore()

      rewardManager.awardReward('SECURITY_REVIEW_COMPLETED', {
        coherenceScore,
        tier,
      })
    }

    _save()

    return {
      reviewed: true,
      result: result.result,
      safetyScore: result.safetyScore,
      flaggedPatterns: result.flaggedPatterns,
      recommendations: result.recommendations,
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // STAKE & REWARD ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get stake status
   */
  'coherence.stakeStatus': async () => {
    const stakeManager = getStakeManager()
    if (!stakeManager) {
      return { error: 'Stake manager not initialized' }
    }

    return {
      stats: stakeManager.getStats(),
      activeStakes: stakeManager.getActiveStakes(),
    }
  },

  /**
   * Get reward status
   */
  'coherence.rewardStatus': async () => {
    const rewardManager = getRewardManager()
    if (!rewardManager) {
      return { error: 'Reward manager not initialized' }
    }

    return {
      stats: rewardManager.getStats(),
      history: rewardManager.getHistory(20),
    }
  },

  /**
   * Get reward estimate for action
   */
  'coherence.estimateReward': async (args) => {
    const { action } = args

    const rewardManager = getRewardManager()
    if (!rewardManager) {
      return { error: 'Reward manager not initialized' }
    }

    return rewardManager.getEstimate(action)
  },

  /**
   * Get agent profile
   */
  'coherence.getProfile': async () => {
    if (!coherenceAgent) {
      return { error: 'Not initialized' }
    }

    coherenceAgent.calculateCoherenceScore()

    return {
      profile: coherenceAgent.toJSON(),
      tier: getRewardManager()?.getCurrentTier() || 'neophyte',
    }
  },

  /**
   * Get coherence network status
   */
  'coherence.status': async () => {
    return {
      initialized: !!coherenceAgent,
      nodeId,
      claims: claims.size,
      edges: edges.size,
      tasks: tasks.size,
      syntheses: syntheses.size,
      profile: coherenceAgent?.toJSON(),
      stakeStats: getStakeManager()?.getStats(),
      rewardStats: getRewardManager()?.getStats(),
    }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

function _getStoragePath() {
  const path = require('path')
  return path.join(dataPath, 'coherence-state.json')
}

function _load() {
  try {
    const fs = require('fs')
    const storagePath = _getStoragePath()

    if (fs.existsSync(storagePath)) {
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'))

      if (data.claims) {
        for (const [id, claimData] of Object.entries(data.claims)) {
          claims.set(id, new Claim(claimData))
        }
      }
      if (data.edges) {
        for (const [id, edgeData] of Object.entries(data.edges)) {
          edges.set(id, new Edge(edgeData))
        }
      }
      if (data.tasks) {
        for (const [id, taskData] of Object.entries(data.tasks)) {
          tasks.set(id, new Task(taskData))
        }
      }
      if (data.syntheses) {
        for (const [id, synthData] of Object.entries(data.syntheses)) {
          syntheses.set(id, new Synthesis(synthData))
        }
      }
      if (data.agent) {
        coherenceAgent = new CoherenceAgent(data.agent)
      }
    }
  } catch (e) {
    // Ignore load errors
  }
}

function _save() {
  try {
    const fs = require('fs')
    const path = require('path')
    const storagePath = _getStoragePath()

    const dir = path.dirname(storagePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const data = {
      claims: Object.fromEntries(Array.from(claims.entries()).map(([k, v]) => [k, v.toJSON()])),
      edges: Object.fromEntries(Array.from(edges.entries()).map(([k, v]) => [k, v.toJSON()])),
      tasks: Object.fromEntries(Array.from(tasks.entries()).map(([k, v]) => [k, v.toJSON()])),
      syntheses: Object.fromEntries(
        Array.from(syntheses.entries()).map(([k, v]) => [k, v.toJSON()]),
      ),
      agent: coherenceAgent?.toJSON(),
    }

    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2))
  } catch (e) {
    // Ignore save errors
  }
}

module.exports = {
  coherenceActions,
  initCoherenceManager,
}
