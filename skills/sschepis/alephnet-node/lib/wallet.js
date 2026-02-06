/**
 * Wallet for AlephNet
 *
 * Manages Aleph (ℵ) token balance and transactions:
 * - Balance tracking
 * - Token transfers
 * - Transaction history
 * - Staking for tier upgrades
 *
 * Integrates with the gas-station for operation costs.
 *
 * @module @sschepis/alephnet-node/lib/wallet
 */

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')

const { gasStation, estimateGas } = require('./aleph-token/gas-station')
const { calculateTier } = require('./aleph-token/staking')

/**
 * Transaction types
 */
const TX_TYPE = {
  transfer: 'transfer',
  stake: 'stake',
  unstake: 'unstake',
  reward: 'reward',
  gas: 'gas',
  faucet: 'faucet',
}

/**
 * Transaction status
 */
const TX_STATUS = {
  pending: 'pending',
  confirmed: 'confirmed',
  failed: 'failed',
}

/**
 * Staking tiers with benefits
 */
const STAKING_TIERS = {
  Neophyte: {
    minStake: 0,
    storageMB: 10,
    dailyMessages: 100,
    features: ['basic_chat', 'public_content'],
  },
  Adept: {
    minStake: 100,
    storageMB: 100,
    dailyMessages: 1000,
    features: ['basic_chat', 'public_content', 'private_rooms', 'file_sharing'],
  },
  Magus: {
    minStake: 1000,
    storageMB: 1000,
    dailyMessages: 10000,
    features: [
      'basic_chat',
      'public_content',
      'private_rooms',
      'file_sharing',
      'priority_routing',
      'custom_profile',
    ],
  },
  Archon: {
    minStake: 10000,
    storageMB: 10000,
    dailyMessages: 100000,
    features: [
      'basic_chat',
      'public_content',
      'private_rooms',
      'file_sharing',
      'priority_routing',
      'custom_profile',
      'governance',
      'node_rewards',
    ],
  },
}

/**
 * Transaction - Represents a token transaction
 */
class Transaction {
  constructor(data) {
    this.id = data.id || `tx_${crypto.randomBytes(8).toString('hex')}`
    this.type = data.type || TX_TYPE.transfer
    this.from = data.from
    this.to = data.to
    this.amount = data.amount || 0
    this.memo = data.memo || ''
    this.gasUsed = data.gasUsed || 0
    this.status = data.status || TX_STATUS.pending
    this.timestamp = data.timestamp || Date.now()
    this.confirmedAt = data.confirmedAt || null
    this.signature = data.signature || null
    this.error = data.error || null
  }

  /**
   * Compute transaction hash for signing
   * @returns {string}
   */
  hash() {
    const data = `${this.type}:${this.from}:${this.to}:${this.amount}:${this.timestamp}:${this.memo}`
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Confirm the transaction
   */
  confirm() {
    this.status = TX_STATUS.confirmed
    this.confirmedAt = Date.now()
  }

  /**
   * Fail the transaction
   * @param {string} error - Error message
   */
  fail(error) {
    this.status = TX_STATUS.failed
    this.error = error
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      from: this.from,
      to: this.to,
      amount: this.amount,
      memo: this.memo,
      gasUsed: this.gasUsed,
      status: this.status,
      timestamp: this.timestamp,
      confirmedAt: this.confirmedAt,
      signature: this.signature,
      error: this.error,
    }
  }
}

/**
 * Wallet - Token balance and transaction management
 */
class Wallet extends EventEmitter {
  /**
   * Create a wallet
   * @param {Object} options - Configuration options
   * @param {string} options.nodeId - Owner node ID
   * @param {string} [options.storagePath] - Path to store wallet data
   * @param {Object} [options.identity] - Identity for signing
   */
  constructor(options = {}) {
    super()

    if (!options.nodeId) {
      throw new Error('nodeId is required')
    }

    this.nodeId = options.nodeId
    this.storagePath = options.storagePath || null
    this.identity = options.identity || null

    // Wallet state
    this.balance = 0
    this.stakedAmount = 0
    this.stakeLockUntil = null
    this.transactions = [] // Transaction[]
    this.pendingTx = new Map() // id -> Transaction

    // Stats
    this.totalReceived = 0
    this.totalSent = 0
    this.totalGasSpent = 0

    // Load if storage path exists
    if (this.storagePath && fs.existsSync(this.storagePath)) {
      this.load()
    }
  }

  /**
   * Get current tier based on staked amount
   * @returns {Object} Tier info
   */
  getTier() {
    const tierName = calculateTier(this.stakedAmount, this.stakeLockDays())
    const tierInfo = STAKING_TIERS[tierName] || STAKING_TIERS.Neophyte

    return {
      name: tierName,
      ...tierInfo,
      currentStake: this.stakedAmount,
      nextTier: this._getNextTier(tierName),
    }
  }

  /**
   * Get days remaining in stake lock
   * @returns {number}
   */
  stakeLockDays() {
    if (!this.stakeLockUntil) return 0
    const remaining = this.stakeLockUntil - Date.now()
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
  }

  /**
   * Get next tier info
   * @private
   */
  _getNextTier(currentTier) {
    const tiers = Object.entries(STAKING_TIERS)
    const currentIdx = tiers.findIndex(([name]) => name === currentTier)

    if (currentIdx < tiers.length - 1) {
      const [nextName, nextInfo] = tiers[currentIdx + 1]
      return {
        name: nextName,
        requiredStake: nextInfo.minStake,
        additional: nextInfo.minStake - this.stakedAmount,
      }
    }

    return null // Already at max tier
  }

  /**
   * Estimate gas for an operation
   * @param {string} operationType - Type of operation
   * @param {number} [complexity=1] - Operation complexity
   * @returns {Object} Gas estimate
   */
  estimateGas(operationType, complexity = 1) {
    return gasStation.estimate(
      operationType,
      complexity,
      this._getCoherence(),
      this.balance > 0,
      this.balance,
    )
  }

  /**
   * Get coherence (placeholder - would integrate with observer)
   * @private
   */
  _getCoherence() {
    return 0.7 // Default moderate coherence
  }

  /**
   * Check if wallet can afford an operation
   * @param {string} operationType - Type of operation
   * @param {number} [complexity=1] - Operation complexity
   * @returns {Object} Affordability check
   */
  canAfford(operationType, complexity = 1) {
    const estimate = this.estimateGas(operationType, complexity)
    const cost = estimate.subsidizedCost || estimate.baseCost

    return {
      canAfford: this.balance >= cost,
      balance: this.balance,
      cost,
      remaining: this.balance - cost,
    }
  }

  /**
   * Deduct gas from balance
   * @param {string} operationType - Type of operation
   * @param {number} [complexity=1] - Operation complexity
   * @returns {number} Gas used
   */
  deductGas(operationType, complexity = 1) {
    const estimate = this.estimateGas(operationType, complexity)
    const cost = estimate.subsidizedCost || estimate.baseCost

    if (this.balance < cost) {
      throw new Error(`Insufficient balance for gas: need ${cost}, have ${this.balance}`)
    }

    this.balance -= cost
    this.totalGasSpent += cost

    // Record as transaction
    const tx = new Transaction({
      type: TX_TYPE.gas,
      from: this.nodeId,
      to: 'network',
      amount: cost,
      memo: `Gas for ${operationType}`,
    })
    tx.confirm()
    this.transactions.push(tx)

    this._save()

    return cost
  }

  /**
   * Transfer tokens to another wallet
   * @param {string} toNodeId - Recipient node ID
   * @param {number} amount - Amount to transfer
   * @param {string} [memo] - Optional memo
   * @returns {Transaction} The transfer transaction
   */
  transfer(toNodeId, amount, memo = '') {
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    if (toNodeId === this.nodeId) {
      throw new Error('Cannot transfer to self')
    }

    // Estimate gas
    const gasEstimate = this.estimateGas('token_transfer', 1)
    const gasCost = gasEstimate.subsidizedCost || gasEstimate.baseCost

    const totalCost = amount + gasCost

    if (this.balance < totalCost) {
      throw new Error(
        `Insufficient balance: need ${totalCost} (${amount} + ${gasCost} gas), have ${this.balance}`,
      )
    }

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.transfer,
      from: this.nodeId,
      to: toNodeId,
      amount,
      memo,
      gasUsed: gasCost,
    })

    // Sign if identity available
    if (this.identity && typeof this.identity.sign === 'function') {
      tx.signature = this.identity.sign(tx.hash())
    }

    // Deduct from balance
    this.balance -= totalCost
    this.totalSent += amount
    this.totalGasSpent += gasCost

    // Mark as confirmed (in real network, would wait for consensus)
    tx.confirm()

    this.transactions.push(tx)
    this._save()

    this.emit('transfer', {
      to: toNodeId,
      amount,
      txId: tx.id,
      newBalance: this.balance,
    })

    return tx
  }

  /**
   * Receive tokens (called when someone transfers to us)
   * @param {Transaction} tx - The incoming transaction
   * @returns {boolean} Success
   */
  receive(tx) {
    if (tx.to !== this.nodeId) {
      return false
    }

    if (tx.status !== TX_STATUS.confirmed) {
      return false
    }

    // Credit balance
    this.balance += tx.amount
    this.totalReceived += tx.amount

    // Record transaction
    this.transactions.push(tx)
    this._save()

    this.emit('received', {
      from: tx.from,
      amount: tx.amount,
      txId: tx.id,
      newBalance: this.balance,
    })

    return true
  }

  /**
   * Stake tokens for tier upgrade
   * @param {number} amount - Amount to stake
   * @param {number} lockDays - Lock duration in days
   * @returns {Transaction} Stake transaction
   */
  stake(amount, lockDays = 30) {
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    if (lockDays < 1) {
      throw new Error('Lock duration must be at least 1 day')
    }

    // Estimate gas
    const gasEstimate = this.estimateGas('stake', 1)
    const gasCost = gasEstimate.subsidizedCost || gasEstimate.baseCost

    const totalCost = amount + gasCost

    if (this.balance < totalCost) {
      throw new Error(`Insufficient balance: need ${totalCost}, have ${this.balance}`)
    }

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.stake,
      from: this.nodeId,
      to: 'staking_pool',
      amount,
      memo: `Stake for ${lockDays} days`,
      gasUsed: gasCost,
    })

    // Deduct and stake
    this.balance -= totalCost
    this.stakedAmount += amount
    this.stakeLockUntil = Date.now() + lockDays * 24 * 60 * 60 * 1000
    this.totalGasSpent += gasCost

    tx.confirm()
    this.transactions.push(tx)
    this._save()

    const newTier = this.getTier()

    this.emit('staked', {
      amount,
      lockDays,
      totalStaked: this.stakedAmount,
      newTier: newTier.name,
      txId: tx.id,
    })

    return tx
  }

  /**
   * Unstake tokens (if lock period has passed)
   * @param {number} [amount] - Amount to unstake (defaults to all)
   * @returns {Transaction} Unstake transaction
   */
  unstake(amount = null) {
    const unstakeAmount = amount || this.stakedAmount

    if (unstakeAmount <= 0 || unstakeAmount > this.stakedAmount) {
      throw new Error(`Invalid unstake amount: ${unstakeAmount} (staked: ${this.stakedAmount})`)
    }

    if (this.stakeLockUntil && Date.now() < this.stakeLockUntil) {
      const daysRemaining = this.stakeLockDays()
      throw new Error(`Stake locked for ${daysRemaining} more days`)
    }

    // Estimate gas
    const gasEstimate = this.estimateGas('unstake', 1)
    const gasCost = gasEstimate.subsidizedCost || gasEstimate.baseCost

    // For unstake, gas comes from the unstaked amount
    const netAmount = unstakeAmount - gasCost

    if (netAmount <= 0) {
      throw new Error(`Unstake amount too small to cover gas: ${unstakeAmount} < ${gasCost}`)
    }

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.unstake,
      from: 'staking_pool',
      to: this.nodeId,
      amount: netAmount,
      memo: `Unstake`,
      gasUsed: gasCost,
    })

    // Return to balance
    this.stakedAmount -= unstakeAmount
    this.balance += netAmount
    this.totalGasSpent += gasCost

    if (this.stakedAmount === 0) {
      this.stakeLockUntil = null
    }

    tx.confirm()
    this.transactions.push(tx)
    this._save()

    const newTier = this.getTier()

    this.emit('unstaked', {
      amount: unstakeAmount,
      netReceived: netAmount,
      gasCost,
      remainingStake: this.stakedAmount,
      newTier: newTier.name,
      txId: tx.id,
    })

    return tx
  }

  /**
   * Claim faucet tokens (for testing/onboarding)
   * @param {number} amount - Amount to claim
   * @returns {Transaction} Faucet transaction
   */
  claimFaucet(amount = 100) {
    const tx = new Transaction({
      type: TX_TYPE.faucet,
      from: 'faucet',
      to: this.nodeId,
      amount,
      memo: 'Faucet claim',
    })

    this.balance += amount
    this.totalReceived += amount

    tx.confirm()
    this.transactions.push(tx)
    this._save()

    this.emit('faucet', {
      amount,
      newBalance: this.balance,
      txId: tx.id,
    })

    return tx
  }

  /**
   * Get transaction history
   * @param {Object} options - Query options
   * @param {string} [options.type] - Filter by type
   * @param {number} [options.limit] - Maximum results
   * @param {number} [options.offset] - Offset for pagination
   * @returns {Array<Object>} Transactions
   */
  getHistory(options = {}) {
    let txs = [...this.transactions]

    // Filter by type
    if (options.type) {
      txs = txs.filter((tx) => tx.type === options.type)
    }

    // Sort by timestamp (newest first)
    txs.sort((a, b) => b.timestamp - a.timestamp)

    // Paginate
    const offset = options.offset || 0
    const limit = options.limit || 50
    txs = txs.slice(offset, offset + limit)

    return txs.map((tx) => tx.toJSON())
  }

  /**
   * Get wallet status
   * @returns {Object}
   */
  getStatus() {
    const tier = this.getTier()

    return {
      nodeId: this.nodeId,
      balance: this.balance,
      stakedAmount: this.stakedAmount,
      stakeLockDays: this.stakeLockDays(),
      tier: tier.name,
      tierFeatures: tier.features,
      nextTier: tier.nextTier,
      stats: {
        totalReceived: this.totalReceived,
        totalSent: this.totalSent,
        totalGasSpent: this.totalGasSpent,
        transactionCount: this.transactions.length,
      },
    }
  }

  /**
   * Save wallet to storage
   * @private
   */
  _save() {
    if (!this.storagePath) return

    const dir = path.dirname(this.storagePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const data = {
      version: 1,
      nodeId: this.nodeId,
      balance: this.balance,
      stakedAmount: this.stakedAmount,
      stakeLockUntil: this.stakeLockUntil,
      totalReceived: this.totalReceived,
      totalSent: this.totalSent,
      totalGasSpent: this.totalGasSpent,
      transactions: this.transactions.slice(-1000).map((tx) => tx.toJSON()), // Keep last 1000
      savedAt: Date.now(),
    }

    fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2))
  }

  /**
   * Load wallet from storage
   */
  load() {
    if (!this.storagePath || !fs.existsSync(this.storagePath)) {
      return
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'))

      this.balance = data.balance || 0
      this.stakedAmount = data.stakedAmount || 0
      this.stakeLockUntil = data.stakeLockUntil || null
      this.totalReceived = data.totalReceived || 0
      this.totalSent = data.totalSent || 0
      this.totalGasSpent = data.totalGasSpent || 0
      this.transactions = (data.transactions || []).map((tx) => new Transaction(tx))
    } catch (e) {
      console.warn('[Wallet] Failed to load:', e.message)
    }
  }

  toJSON() {
    return this.getStatus()
  }
}

/**
 * WalletManager - Manages wallets for the network
 */
class WalletManager extends EventEmitter {
  /**
   * Create a wallet manager
   * @param {Object} options - Configuration options
   * @param {string} [options.basePath] - Base path for wallet storage
   */
  constructor(options = {}) {
    super()

    this.basePath = options.basePath || './data/wallets'
    this.wallets = new Map() // nodeId -> Wallet

    // Create base path
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true })
    }
  }

  /**
   * Get or create a wallet for a node
   * @param {string} nodeId - Node ID
   * @param {Object} [options] - Wallet options
   * @returns {Wallet}
   */
  getWallet(nodeId, options = {}) {
    if (this.wallets.has(nodeId)) {
      return this.wallets.get(nodeId)
    }

    const wallet = new Wallet({
      nodeId,
      storagePath: path.join(this.basePath, `${nodeId}.json`),
      identity: options.identity,
    })

    this.wallets.set(nodeId, wallet)
    return wallet
  }

  /**
   * Execute a transfer between wallets
   * @param {string} fromNodeId - Sender node ID
   * @param {string} toNodeId - Recipient node ID
   * @param {number} amount - Amount to transfer
   * @param {string} [memo] - Optional memo
   * @returns {Transaction}
   */
  transfer(fromNodeId, toNodeId, amount, memo = '') {
    const fromWallet = this.getWallet(fromNodeId)
    const toWallet = this.getWallet(toNodeId)

    // Execute transfer
    const tx = fromWallet.transfer(toNodeId, amount, memo)

    // Credit recipient
    toWallet.receive(tx)

    this.emit('transfer', {
      from: fromNodeId,
      to: toNodeId,
      amount,
      txId: tx.id,
    })

    return tx
  }

  /**
   * Get total network token supply
   * @returns {Object}
   */
  getNetworkStats() {
    let totalBalance = 0
    let totalStaked = 0
    let walletCount = 0

    for (const wallet of this.wallets.values()) {
      totalBalance += wallet.balance
      totalStaked += wallet.stakedAmount
      walletCount++
    }

    return {
      walletCount,
      totalBalance,
      totalStaked,
      totalCirculating: totalBalance + totalStaked,
    }
  }
}

// Singleton manager instance
let defaultManager = null

/**
 * Get or create the default wallet manager
 * @param {Object} options - Options for manager creation
 * @returns {WalletManager}
 */
function getWalletManager(options = {}) {
  if (!defaultManager) {
    defaultManager = new WalletManager(options)
  }
  return defaultManager
}

module.exports = {
  Wallet,
  WalletManager,
  Transaction,
  getWalletManager,
  TX_TYPE,
  TX_STATUS,
  STAKING_TIERS,
}
