/**
 * Coherence Stake Management
 *
 * Manages token staking for Coherence network participation:
 * - Lock tokens for tasks
 * - Release stakes on completion
 * - Slash stakes on rejection/failure
 *
 * @module @sschepis/alephnet-node/lib/coherence/stakes
 */

'use strict'

const { COHERENCE_TIERS, TASK_TYPES, REWARD_ACTIONS } = require('./types')

// ═══════════════════════════════════════════════════════════════════════════
// CLASS: StakeManager
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manages token stakes for Coherence activities
 */
class StakeManager {
  constructor(wallet, nodeId, dataPath) {
    this.wallet = wallet
    this.nodeId = nodeId
    this.dataPath = dataPath

    // Active stakes by ID
    this.activeStakes = new Map()

    // Stake history
    this.stakeHistory = []

    // Load persisted stakes
    this._load()
  }

  /**
   * Lock tokens for a task
   * @param {string} taskId - Task identifier
   * @param {number} amount - Amount to stake
   * @param {string} reason - Reason for stake (task type)
   * @returns {object} Stake result
   */
  lockStake(taskId, amount, reason) {
    // Check wallet balance
    const balance = this.wallet?.getBalance?.() || 0

    // Calculate total currently locked
    let totalLocked = 0
    for (const stake of this.activeStakes.values()) {
      totalLocked += stake.amount
    }

    const available = balance - totalLocked

    if (available < amount) {
      return {
        success: false,
        error: 'Insufficient available balance',
        required: amount,
        available,
      }
    }

    // Create stake record
    const stake = {
      id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskId,
      amount,
      reason,
      lockedAt: Date.now(),
      status: 'locked',
      releasedAt: null,
      slashedAmount: 0,
    }

    this.activeStakes.set(taskId, stake)
    this.stakeHistory.push(stake)
    this._save()

    return {
      success: true,
      stakeId: stake.id,
      amount,
      remaining: available - amount,
    }
  }

  /**
   * Release stake after successful completion
   * @param {string} taskId - Task identifier
   * @returns {object} Release result
   */
  releaseStake(taskId) {
    const stake = this.activeStakes.get(taskId)

    if (!stake) {
      return {
        success: false,
        error: 'Stake not found',
      }
    }

    stake.status = 'released'
    stake.releasedAt = Date.now()

    this.activeStakes.delete(taskId)
    this._save()

    return {
      success: true,
      amount: stake.amount,
      duration: stake.releasedAt - stake.lockedAt,
    }
  }

  /**
   * Slash stake on failure/rejection
   * @param {string} taskId - Task identifier
   * @param {number} slashPercent - Percentage to slash (0-100)
   * @returns {object} Slash result
   */
  slashStake(taskId, slashPercent = 50) {
    const stake = this.activeStakes.get(taskId)

    if (!stake) {
      return {
        success: false,
        error: 'Stake not found',
      }
    }

    const slashAmount = Math.floor(stake.amount * (slashPercent / 100))

    stake.status = 'slashed'
    stake.releasedAt = Date.now()
    stake.slashedAmount = slashAmount

    this.activeStakes.delete(taskId)

    // Actually remove tokens from wallet
    if (this.wallet?.send) {
      this.wallet.send('coherence-pool', slashAmount)
    }

    this._save()

    return {
      success: true,
      slashedAmount: slashAmount,
      returnedAmount: stake.amount - slashAmount,
    }
  }

  /**
   * Get stake for a task
   * @param {string} taskId - Task identifier
   * @returns {object|null} Stake or null
   */
  getStake(taskId) {
    return this.activeStakes.get(taskId) || null
  }

  /**
   * Get all active stakes
   * @returns {Array} Active stakes
   */
  getActiveStakes() {
    return Array.from(this.activeStakes.values())
  }

  /**
   * Get total locked amount
   * @returns {number} Total locked tokens
   */
  getTotalLocked() {
    let total = 0
    for (const stake of this.activeStakes.values()) {
      total += stake.amount
    }
    return total
  }

  /**
   * Get available balance (wallet balance - locked)
   * @returns {number} Available balance
   */
  getAvailableBalance() {
    const balance = this.wallet?.getBalance?.() || 0
    return balance - this.getTotalLocked()
  }

  /**
   * Check if agent can stake amount
   * @param {number} amount - Amount to check
   * @returns {boolean} Can stake
   */
  canStake(amount) {
    return this.getAvailableBalance() >= amount
  }

  /**
   * Get stake statistics
   * @returns {object} Stats
   */
  getStats() {
    const history = this.stakeHistory
    const released = history.filter((s) => s.status === 'released')
    const slashed = history.filter((s) => s.status === 'slashed')

    const totalSlashed = slashed.reduce((sum, s) => sum + s.slashedAmount, 0)
    const totalStaked = history.reduce((sum, s) => sum + s.amount, 0)

    return {
      activeCount: this.activeStakes.size,
      totalLocked: this.getTotalLocked(),
      available: this.getAvailableBalance(),
      historyCount: history.length,
      releasedCount: released.length,
      slashedCount: slashed.length,
      totalSlashed,
      totalStaked,
      successRate: history.length > 0 ? released.length / history.length : 0,
    }
  }

  /**
   * Check if stake requirement is met for action
   * @param {string} action - Action type from REWARD_ACTIONS
   * @returns {object} Requirement check result
   */
  checkRequirement(action) {
    const config = REWARD_ACTIONS[action]
    if (!config) {
      return { met: false, error: 'Unknown action' }
    }

    const available = this.getAvailableBalance()
    const required = config.stakeRequired

    return {
      met: available >= required,
      required,
      available,
      shortfall: Math.max(0, required - available),
    }
  }

  /**
   * Expire old stakes (for timed-out tasks)
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} Number of expired stakes
   */
  expireOldStakes(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now()
    let expiredCount = 0

    for (const [taskId, stake] of this.activeStakes.entries()) {
      if (now - stake.lockedAt > maxAgeMs) {
        // Expired - slash 10%
        this.slashStake(taskId, 10)
        expiredCount++
      }
    }

    return expiredCount
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════

  _getStoragePath() {
    const path = require('path')
    return path.join(this.dataPath, 'coherence-stakes.json')
  }

  _load() {
    try {
      const fs = require('fs')
      const storagePath = this._getStoragePath()

      if (fs.existsSync(storagePath)) {
        const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'))

        // Restore active stakes
        if (data.activeStakes) {
          for (const [taskId, stake] of Object.entries(data.activeStakes)) {
            this.activeStakes.set(taskId, stake)
          }
        }

        // Restore history (last 1000 entries)
        if (data.stakeHistory) {
          this.stakeHistory = data.stakeHistory.slice(-1000)
        }
      }
    } catch (e) {
      // Ignore load errors - start fresh
    }
  }

  _save() {
    try {
      const fs = require('fs')
      const path = require('path')
      const storagePath = this._getStoragePath()

      // Ensure directory exists
      const dir = path.dirname(storagePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const data = {
        activeStakes: Object.fromEntries(this.activeStakes),
        stakeHistory: this.stakeHistory.slice(-1000),
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

let stakeManager = null

function initStakeManager(wallet, nodeId, dataPath) {
  stakeManager = new StakeManager(wallet, nodeId, dataPath)
  return stakeManager
}

function getStakeManager() {
  return stakeManager
}

module.exports = {
  StakeManager,
  initStakeManager,
  getStakeManager,
}
