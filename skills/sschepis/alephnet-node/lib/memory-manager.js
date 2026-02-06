/**
 * Memory Manager - Centralized SMF State Management
 *
 * Decouples PRSC oscillator dynamics from SMF state mutations.
 * All SMF access goes through this manager to ensure:
 * - Consistent state transitions
 * - Event-driven updates for subscribers
 * - Transaction support for atomic multi-operation changes
 * - Performance monitoring of memory operations
 *
 * This addresses the tight coupling between prsc.js and smf.js
 * identified in the architecture review.
 */

const EventEmitter = require('events')
const { SedenionMemoryField, SMF_AXES, AXIS_INDEX } = require('./smf')

/**
 * Memory Transaction - Atomic multi-operation changes
 * Supports rollback on failure
 */
class MemoryTransaction {
  constructor(manager, options = {}) {
    this.manager = manager
    this.id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    this.operations = []
    this.committed = false
    this.rolledBack = false
    this.snapshotBefore = null
    this.timeout = options.timeout || 5000
    this.startTime = Date.now()
  }

  /**
   * Begin transaction - captures snapshot for rollback
   */
  begin() {
    if (this.snapshotBefore) {
      throw new Error('Transaction already started')
    }
    this.snapshotBefore = this.manager.snapshot()
    return this
  }

  /**
   * Queue an SMF axis update
   * @param {string|number} axis - Axis name or index
   * @param {number} value - New value
   */
  setAxis(axis, value) {
    this._checkActive()
    this.operations.push({
      type: 'set_axis',
      axis,
      value,
      timestamp: Date.now(),
    })
    return this
  }

  /**
   * Queue an SMF blend operation
   * @param {SedenionMemoryField} otherSMF - SMF to blend with
   * @param {number} weight - Blend weight (0-1)
   */
  blend(otherSMF, weight = 0.5) {
    this._checkActive()
    this.operations.push({
      type: 'blend',
      smf: otherSMF.clone(),
      weight,
      timestamp: Date.now(),
    })
    return this
  }

  /**
   * Queue an axis delta update from oscillator activity
   * @param {Array} oscillators - Array of oscillator states
   */
  applyOscillatorDeltas(oscillators) {
    this._checkActive()
    this.operations.push({
      type: 'oscillator_deltas',
      oscillators: oscillators.map((o) => ({
        prime: o.prime,
        phase: o.phase,
        amplitude: o.amplitude,
      })),
      timestamp: Date.now(),
    })
    return this
  }

  /**
   * Queue a quaternion composition
   * @param {SedenionMemoryField} otherSMF - SMF to compose with
   */
  quaternionCompose(otherSMF) {
    this._checkActive()
    this.operations.push({
      type: 'quaternion_compose',
      smf: otherSMF.clone(),
      timestamp: Date.now(),
    })
    return this
  }

  /**
   * Queue a tunneling operation to codebook attractor
   * @param {number} attractorIndex - Target attractor index
   * @param {number} mixFactor - Mix factor (0-1)
   */
  tunnelTo(attractorIndex, mixFactor = 1.0) {
    this._checkActive()
    this.operations.push({
      type: 'tunnel',
      attractorIndex,
      mixFactor,
      timestamp: Date.now(),
    })
    return this
  }

  /**
   * Commit the transaction - applies all operations
   */
  commit() {
    this._checkActive()
    this._checkTimeout()

    try {
      // Apply all operations in order
      for (const op of this.operations) {
        this.manager._applyOperation(op)
      }

      this.committed = true
      this.manager._recordTransaction(this)
      this.manager.emit('transaction_committed', {
        id: this.id,
        operationCount: this.operations.length,
        duration: Date.now() - this.startTime,
      })

      return {
        success: true,
        id: this.id,
        operationCount: this.operations.length,
      }
    } catch (error) {
      // Rollback on failure
      this.rollback()
      throw error
    }
  }

  /**
   * Rollback the transaction - restores snapshot
   */
  rollback() {
    if (this.committed) {
      throw new Error('Cannot rollback committed transaction')
    }
    if (this.rolledBack) {
      return
    }

    if (this.snapshotBefore) {
      this.manager.restore(this.snapshotBefore)
    }

    this.rolledBack = true
    this.manager.emit('transaction_rolled_back', {
      id: this.id,
      operationCount: this.operations.length,
    })
  }

  _checkActive() {
    if (this.committed) {
      throw new Error('Transaction already committed')
    }
    if (this.rolledBack) {
      throw new Error('Transaction was rolled back')
    }
  }

  _checkTimeout() {
    if (Date.now() - this.startTime > this.timeout) {
      throw new Error(`Transaction timeout after ${this.timeout}ms`)
    }
  }
}

/**
 * Memory Manager - Centralized SMF state management
 */
class MemoryManager extends EventEmitter {
  /**
   * Create a memory manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super()

    // Core SMF state
    this.smf = options.smf || new SedenionMemoryField()

    // Configuration
    this.couplingRate = options.couplingRate || 0.1
    this.dampingRate = options.dampingRate || 0.02
    this.maxHistoryLength = options.maxHistoryLength || 100

    // State history for analysis
    this.history = []

    // Transaction tracking
    this.activeTransactions = new Map()
    this.completedTransactions = []
    this.maxCompletedTransactions = 50

    // Performance metrics
    this.metrics = {
      totalOperations: 0,
      operationsByType: {},
      averageOperationTime: 0,
      peakOperationTime: 0,
      transactionCount: 0,
      rollbackCount: 0,
    }

    // Subscribers for state changes
    this.subscribers = new Map()
  }

  /**
   * Get current SMF state (read-only view)
   */
  getState() {
    return {
      axes: this.smf.toObject(),
      array: this.smf.toArray(),
      entropy: this.smf.entropy(),
      dominant: this.smf.dominantAxes(3),
      norm: this.smf.norm(),
    }
  }

  /**
   * Get SMF directly (for compatibility)
   */
  getSMF() {
    return this.smf
  }

  /**
   * Create a snapshot for backup/rollback
   */
  snapshot() {
    return {
      smf: Float64Array.from(this.smf.s),
      timestamp: Date.now(),
      metrics: { ...this.metrics },
    }
  }

  /**
   * Restore from a snapshot
   * @param {Object} snap - Snapshot to restore
   */
  restore(snap) {
    this.smf = new SedenionMemoryField(Float64Array.from(snap.smf))
    this.emit('state_restored', { timestamp: snap.timestamp })
  }

  /**
   * Begin a new transaction
   * @param {Object} options - Transaction options
   */
  beginTransaction(options = {}) {
    const txn = new MemoryTransaction(this, options)
    txn.begin()
    this.activeTransactions.set(txn.id, txn)
    return txn
  }

  /**
   * Set a single axis value (direct operation)
   * @param {string|number} axis - Axis name or index
   * @param {number} value - New value
   */
  setAxis(axis, value) {
    const startTime = Date.now()

    const idx = typeof axis === 'string' ? AXIS_INDEX[axis] : axis
    if (idx === undefined || idx < 0 || idx >= 16) {
      throw new Error(`Invalid axis: ${axis}`)
    }

    const oldValue = this.smf.s[idx]
    this.smf.s[idx] = value
    this.smf.normalize()

    this._recordOperation('set_axis', startTime, { axis, oldValue, newValue: value })
    this.emit('axis_changed', { axis, oldValue, newValue: value })
  }

  /**
   * Blend with another SMF state
   * @param {SedenionMemoryField} otherSMF - SMF to blend with
   * @param {number} weight - Blend weight (0-1)
   */
  blend(otherSMF, weight = 0.5) {
    const startTime = Date.now()

    const result = this.smf.slerp(otherSMF, weight)
    const oldEntropy = this.smf.entropy()
    this.smf = result
    const newEntropy = this.smf.entropy()

    this._recordOperation('blend', startTime, { weight, entropyChange: newEntropy - oldEntropy })
    this.emit('state_blended', { weight, entropyChange: newEntropy - oldEntropy })
  }

  /**
   * Update SMF from PRSC oscillator activity
   * This is the key method that decouples PRSC from SMF
   *
   * @param {Array} oscillators - Array of oscillator states from PRSCLayer
   * @param {Object} primeState - Optional prime state for additional context
   * @param {Object} options - Update options
   */
  updateFromOscillators(oscillators, primeState = null, options = {}) {
    const startTime = Date.now()
    const eta = options.couplingRate || this.couplingRate

    // Compute axis deltas using SMF's built-in method
    const deltas = this.smf.computeAxisDeltas(primeState, oscillators, options)

    // Apply deltas with coupling rate
    for (let k = 0; k < 16; k++) {
      this.smf.s[k] = (1 - eta) * this.smf.s[k] + eta * deltas[k]
    }
    this.smf.normalize()

    this._recordOperation('oscillator_update', startTime, {
      oscillatorCount: oscillators.length,
      activeCount: oscillators.filter((o) => o.amplitude > 0.1).length,
      couplingRate: eta,
    })

    this._recordHistory()
    this.emit('oscillator_update', {
      oscillatorCount: oscillators.length,
      newState: this.getState(),
    })
  }

  /**
   * Apply quaternion composition with another SMF
   * @param {SedenionMemoryField} otherSMF - SMF to compose with
   * @param {Object} options - Composition options
   */
  quaternionCompose(otherSMF, options = {}) {
    const startTime = Date.now()

    const result = this.smf.quaternionCompose(otherSMF, options)
    const oldEntropy = this.smf.entropy()
    this.smf = result
    const newEntropy = this.smf.entropy()

    this._recordOperation('quaternion_compose', startTime, {
      entropyChange: newEntropy - oldEntropy,
    })

    this.emit('quaternion_composed', { entropyChange: newEntropy - oldEntropy })
  }

  /**
   * Tunnel to a codebook attractor
   * @param {number} attractorIndex - Target attractor index
   * @param {number} mixFactor - Mix factor (0-1)
   */
  tunnelTo(attractorIndex, mixFactor = 1.0) {
    const startTime = Date.now()

    const beforeDistance = this.smf.nearestCodebook().distance
    this.smf.tunnelTo(attractorIndex, mixFactor)
    const afterDistance = this.smf.nearestCodebook().distance

    this._recordOperation('tunnel', startTime, {
      attractorIndex,
      mixFactor,
      distanceChange: afterDistance - beforeDistance,
    })

    this.emit('tunneled', { attractorIndex, mixFactor })
  }

  /**
   * Apply a single operation (used by transactions)
   * @private
   */
  _applyOperation(op) {
    switch (op.type) {
      case 'set_axis':
        this.setAxis(op.axis, op.value)
        break
      case 'blend':
        this.blend(op.smf, op.weight)
        break
      case 'oscillator_deltas':
        this.updateFromOscillators(op.oscillators)
        break
      case 'quaternion_compose':
        this.quaternionCompose(op.smf)
        break
      case 'tunnel':
        this.tunnelTo(op.attractorIndex, op.mixFactor)
        break
      default:
        throw new Error(`Unknown operation type: ${op.type}`)
    }
  }

  /**
   * Record operation metrics
   * @private
   */
  _recordOperation(type, startTime, details = {}) {
    const duration = Date.now() - startTime

    this.metrics.totalOperations++
    this.metrics.operationsByType[type] = (this.metrics.operationsByType[type] || 0) + 1

    // Update average and peak times
    const prevTotal = this.metrics.totalOperations - 1
    this.metrics.averageOperationTime =
      (this.metrics.averageOperationTime * prevTotal + duration) / this.metrics.totalOperations
    this.metrics.peakOperationTime = Math.max(this.metrics.peakOperationTime, duration)
  }

  /**
   * Record transaction completion
   * @private
   */
  _recordTransaction(txn) {
    this.activeTransactions.delete(txn.id)
    this.completedTransactions.push({
      id: txn.id,
      operationCount: txn.operations.length,
      duration: Date.now() - txn.startTime,
      committed: txn.committed,
      rolledBack: txn.rolledBack,
    })

    if (this.completedTransactions.length > this.maxCompletedTransactions) {
      this.completedTransactions.shift()
    }

    this.metrics.transactionCount++
    if (txn.rolledBack) {
      this.metrics.rollbackCount++
    }
  }

  /**
   * Record state history
   * @private
   */
  _recordHistory() {
    this.history.push({
      timestamp: Date.now(),
      entropy: this.smf.entropy(),
      dominant: this.smf.dominantAxes(1)[0]?.name,
      norm: this.smf.norm(),
    })

    if (this.history.length > this.maxHistoryLength) {
      this.history.shift()
    }
  }

  /**
   * Subscribe to state changes on specific axes
   * @param {Array<string|number>} axes - Axes to watch
   * @param {Function} callback - Callback function
   * @returns {string} Subscription ID
   */
  subscribe(axes, callback) {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const axisIndices = axes.map((a) => (typeof a === 'string' ? AXIS_INDEX[a] : a))

    this.subscribers.set(subId, {
      axes: axisIndices,
      callback,
    })

    return subId
  }

  /**
   * Unsubscribe from state changes
   * @param {string} subId - Subscription ID
   */
  unsubscribe(subId) {
    this.subscribers.delete(subId)
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      historyLength: this.history.length,
      activeTransactions: this.activeTransactions.size,
      completedTransactions: this.completedTransactions.length,
    }
  }

  /**
   * Get entropy trend (for monitoring)
   */
  getEntropyTrend() {
    if (this.history.length < 2) return 0

    const recent = this.history.slice(-10)
    if (recent.length < 2) return 0

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
    const secondHalf = recent.slice(Math.floor(recent.length / 2))

    const firstAvg = firstHalf.reduce((s, h) => s + h.entropy, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, h) => s + h.entropy, 0) / secondHalf.length

    return secondAvg - firstAvg
  }

  /**
   * Get dominant axis trend
   */
  getDominantTrend() {
    if (this.history.length < 5) return null

    const recent = this.history.slice(-10)
    const counts = {}

    for (const h of recent) {
      counts[h.dominant] = (counts[h.dominant] || 0) + 1
    }

    let maxCount = 0
    let dominant = null
    for (const [axis, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count
        dominant = axis
      }
    }

    return { axis: dominant, stability: maxCount / recent.length }
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.smf = new SedenionMemoryField()
    this.history = []
    this.activeTransactions.clear()
    this.completedTransactions = []
    this.metrics = {
      totalOperations: 0,
      operationsByType: {},
      averageOperationTime: 0,
      peakOperationTime: 0,
      transactionCount: 0,
      rollbackCount: 0,
    }
    this.emit('reset')
  }

  /**
   * Export state for persistence
   */
  toJSON() {
    return {
      smf: this.smf.toJSON(),
      history: this.history.slice(-20),
      metrics: this.metrics,
    }
  }

  /**
   * Import state from persistence
   */
  fromJSON(data) {
    if (data.smf) {
      if (data.smf.axes) {
        this.smf = SedenionMemoryField.fromObject(data.smf.axes)
      } else {
        this.smf = new SedenionMemoryField(data.smf)
      }
    }
    if (data.history) {
      this.history = data.history
    }
    if (data.metrics) {
      this.metrics = { ...this.metrics, ...data.metrics }
    }
  }
}

module.exports = {
  MemoryManager,
  MemoryTransaction,
}
