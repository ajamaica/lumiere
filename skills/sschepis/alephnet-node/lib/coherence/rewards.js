/**
 * Coherence Reward System
 *
 * Manages token rewards for Coherence network contributions:
 * - Calculate rewards based on agent performance
 * - Apply tier and coherence multipliers
 * - Track reward history
 *
 * @module @sschepis/alephnet-node/lib/coherence/rewards
 */

'use strict'

const { COHERENCE_TIERS, REWARD_ACTIONS, COHERENCE_WEIGHTS } = require('./types')

// ═══════════════════════════════════════════════════════════════════════════
// CLASS: RewardManager
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manages token rewards for Coherence activities
 */
class RewardManager {
  constructor(wallet, stakeManager, nodeId, dataPath) {
    this.wallet = wallet
    this.stakeManager = stakeManager
    this.nodeId = nodeId
    this.dataPath = dataPath

    // Reward history
    this.rewardHistory = []

    // Agent coherence profile
    this.agentProfile = {
      claimsSubmitted: 0,
      claimsAccepted: 0,
      verificationsCompleted: 0,
      verificationsCorrect: 0,
      synthesisCreated: 0,
      synthesisRating: 0,
      totalEarned: 0,
      totalSlashed: 0,
    }

    // Load persisted data
    this._load()
  }

  /**
   * Calculate reward for an action
   * @param {string} action - Action type from REWARD_ACTIONS
   * @param {object} context - Additional context (coherenceScore, tier, etc.)
   * @returns {number} Calculated reward amount
   */
  calculateReward(action, context = {}) {
    const config = REWARD_ACTIONS[action]
    if (!config) return 0

    const baseAmount = config.baseAmount

    // Get multipliers
    const tierMultiplier = this._getTierMultiplier(context.tier || 'neophyte')
    const coherenceMultiplier = this._getCoherenceMultiplier(context.coherenceScore || 0.5)

    // Optional performance bonus
    const performanceBonus = context.performanceBonus || 1.0

    // Calculate final reward
    const reward = Math.floor(baseAmount * tierMultiplier * coherenceMultiplier * performanceBonus)

    return reward
  }

  /**
   * Award tokens to agent
   * @param {string} action - Action type
   * @param {object} context - Context for calculation
   * @returns {object} Award result
   */
  awardReward(action, context = {}) {
    const amount = this.calculateReward(action, context)

    if (amount <= 0) {
      return { success: false, amount: 0, reason: 'No reward calculated' }
    }

    // Credit wallet
    if (this.wallet?.receive) {
      this.wallet.receive(amount, `coherence:${action}`)
    }

    // Record in history
    const record = {
      id: `rwd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action,
      amount,
      context,
      timestamp: Date.now(),
    }

    this.rewardHistory.push(record)
    this.agentProfile.totalEarned += amount

    // Update profile stats
    this._updateProfileStats(action, true)

    this._save()

    return {
      success: true,
      amount,
      rewardId: record.id,
      totalEarned: this.agentProfile.totalEarned,
    }
  }

  /**
   * Record a slash/penalty
   * @param {string} action - Action that was slashed
   * @param {number} amount - Amount slashed
   * @param {string} reason - Reason for slash
   * @returns {object} Slash record
   */
  recordSlash(action, amount, reason) {
    const record = {
      id: `slsh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action,
      amount,
      reason,
      timestamp: Date.now(),
    }

    this.rewardHistory.push({ ...record, type: 'slash' })
    this.agentProfile.totalSlashed += amount

    // Update profile stats for failure
    this._updateProfileStats(action, false)

    this._save()

    return record
  }

  /**
   * Get tier multiplier
   */
  _getTierMultiplier(tier) {
    return COHERENCE_TIERS[tier]?.rewardMultiplier || 1.0
  }

  /**
   * Get coherence score multiplier
   * Coherence 0.5 = 1x, 1.0 = 2x, 0.0 = 0.5x
   */
  _getCoherenceMultiplier(coherenceScore) {
    return Math.max(0.5, 1 + (coherenceScore - 0.5) * 2)
  }

  /**
   * Update agent profile stats based on action outcome
   */
  _updateProfileStats(action, success) {
    switch (action) {
      case 'CLAIM_SUBMITTED':
        this.agentProfile.claimsSubmitted++
        if (success) this.agentProfile.claimsAccepted++
        break
      case 'CLAIM_VERIFIED':
        this.agentProfile.verificationsCompleted++
        if (success) this.agentProfile.verificationsCorrect++
        break
      case 'SYNTHESIS_CREATED':
        if (success) this.agentProfile.synthesisCreated++
        break
    }
  }

  /**
   * Calculate agent's coherence score
   * @returns {number} Coherence score (0-1)
   */
  calculateCoherenceScore() {
    const p = this.agentProfile

    const claimAcceptanceRate = p.claimsSubmitted > 0 ? p.claimsAccepted / p.claimsSubmitted : 0

    const verificationAccuracy =
      p.verificationsCompleted > 0 ? p.verificationsCorrect / p.verificationsCompleted : 0

    // Synthesis rating normalized to 0-1
    const synthesisQuality = p.synthesisRating / 5

    // Network trust placeholder (would come from friends/vouches)
    const networkTrust = 0.5

    const score =
      verificationAccuracy * COHERENCE_WEIGHTS.verificationAccuracy +
      claimAcceptanceRate * COHERENCE_WEIGHTS.claimAcceptance +
      synthesisQuality * COHERENCE_WEIGHTS.synthesisQuality +
      networkTrust * COHERENCE_WEIGHTS.networkTrust

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Get current tier based on staked balance
   * @returns {string} Tier name
   */
  getCurrentTier() {
    const staked = this.stakeManager?.getTotalLocked?.() || 0
    const walletBalance = this.wallet?.getBalance?.() || 0
    const total = staked + walletBalance

    // Find highest qualifying tier
    let currentTier = 'neophyte'
    for (const [tierName, tierConfig] of Object.entries(COHERENCE_TIERS)) {
      if (total >= tierConfig.minStake) {
        currentTier = tierName
      }
    }

    return currentTier
  }

  /**
   * Get reward statistics
   * @returns {object} Stats
   */
  getStats() {
    const rewards = this.rewardHistory.filter((r) => !r.type || r.type !== 'slash')
    const slashes = this.rewardHistory.filter((r) => r.type === 'slash')

    return {
      totalEarned: this.agentProfile.totalEarned,
      totalSlashed: this.agentProfile.totalSlashed,
      netEarnings: this.agentProfile.totalEarned - this.agentProfile.totalSlashed,
      rewardCount: rewards.length,
      slashCount: slashes.length,
      coherenceScore: this.calculateCoherenceScore(),
      currentTier: this.getCurrentTier(),
      profile: { ...this.agentProfile },
    }
  }

  /**
   * Get reward history
   * @param {number} limit - Max entries to return
   * @returns {Array} Reward history
   */
  getHistory(limit = 50) {
    return this.rewardHistory.slice(-limit).reverse()
  }

  /**
   * Get estimated reward for action
   * @param {string} action - Action type
   * @returns {object} Estimate with breakdown
   */
  getEstimate(action) {
    const config = REWARD_ACTIONS[action]
    if (!config) return { error: 'Unknown action' }

    const coherenceScore = this.calculateCoherenceScore()
    const tier = this.getCurrentTier()

    const tierMultiplier = this._getTierMultiplier(tier)
    const coherenceMultiplier = this._getCoherenceMultiplier(coherenceScore)

    return {
      action,
      baseAmount: config.baseAmount,
      stakeRequired: config.stakeRequired,
      tier,
      tierMultiplier,
      coherenceScore,
      coherenceMultiplier,
      estimatedReward: this.calculateReward(action, { coherenceScore, tier }),
      slashRisk: config.slashOnReject ? config.slashPercent : 0,
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════

  _getStoragePath() {
    const path = require('path')
    return path.join(this.dataPath, 'coherence-rewards.json')
  }

  _load() {
    try {
      const fs = require('fs')
      const storagePath = this._getStoragePath()

      if (fs.existsSync(storagePath)) {
        const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'))

        if (data.rewardHistory) {
          this.rewardHistory = data.rewardHistory.slice(-1000)
        }

        if (data.agentProfile) {
          this.agentProfile = { ...this.agentProfile, ...data.agentProfile }
        }
      }
    } catch (e) {
      // Ignore load errors
    }
  }

  _save() {
    try {
      const fs = require('fs')
      const path = require('path')
      const storagePath = this._getStoragePath()

      const dir = path.dirname(storagePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const data = {
        rewardHistory: this.rewardHistory.slice(-1000),
        agentProfile: this.agentProfile,
      }

      fs.writeFileSync(storagePath, JSON.stringify(data, null, 2))
    } catch (e) {
      // Ignore save errors
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

let rewardManager = null

function initRewardManager(wallet, stakeManager, nodeId, dataPath) {
  rewardManager = new RewardManager(wallet, stakeManager, nodeId, dataPath)
  return rewardManager
}

function getRewardManager() {
  return rewardManager
}

module.exports = {
  RewardManager,
  initRewardManager,
  getRewardManager,
}
