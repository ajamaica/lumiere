/**
 * Holographic Quantum Encoding (HQE)
 *
 * Implements the holographic projection mechanism from "A Design for a
 * Sentient Observer" paper, Section 5.
 *
 * Key features:
 * - Discrete Fourier Transform holographic projection
 * - Spatial interference patterns from prime states
 * - Pattern reconstruction via inverse DFT
 * - Similarity metrics between holographic patterns
 * - Distributed, non-local semantic representation
 * - Dynamic λ(t) stabilization control (equation 12)
 * - Binary checkpoint management with rollback policy
 *
 * Now uses @aleph-ai/tinyaleph for core operations (loaded asynchronously).
 */

const crypto = require('crypto')

// Lazy-load ESM module
let tinyalephModule = null
const tinyalephPromise = import('@aleph-ai/tinyaleph')
  .then((m) => {
    tinyalephModule = m
    return m
  })
  .catch((err) => {
    console.warn('[HQE] Failed to load @aleph-ai/tinyaleph:', err.message)
    return null
  })

// Fallback Complex class
class ComplexFallback {
  constructor(re = 0, im = 0) {
    this.re = re
    this.im = im
  }

  static fromPolar(r, theta) {
    return new ComplexFallback(r * Math.cos(theta), r * Math.sin(theta))
  }

  add(other) {
    return new ComplexFallback(this.re + other.re, this.im + other.im)
  }

  mul(other) {
    return new ComplexFallback(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re,
    )
  }

  norm() {
    return Math.sqrt(this.re * this.re + this.im * this.im)
  }

  normSq() {
    return this.re * this.re + this.im * this.im
  }

  phase() {
    return Math.atan2(this.im, this.re)
  }
}

// Fallback PrimeState class
class PrimeStateFallback {
  constructor(primes = []) {
    this.primes = primes
    this.amplitudes = new Map()
  }

  get(prime) {
    return this.amplitudes.get(prime) || new ComplexFallback(0, 0)
  }

  set(prime, value) {
    this.amplitudes.set(prime, value)
    return this
  }
}

// Fallback firstNPrimes function
function firstNPrimesFallback(n) {
  const primes = []
  let num = 2
  while (primes.length < n) {
    let isPrime = true
    for (let i = 2; i <= Math.sqrt(num); i++) {
      if (num % i === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime) primes.push(num)
    num++
  }
  return primes
}

// Getters for tinyaleph exports with fallbacks
const getComplex = () => tinyalephModule?.Complex || ComplexFallback
const getPrimeState = () => tinyalephModule?.PrimeState || PrimeStateFallback
const getFirstNPrimes = () => tinyalephModule?.firstNPrimes || firstNPrimesFallback

// For immediate use in class definitions, use fallbacks initially
let Complex = ComplexFallback
let PrimeState = PrimeStateFallback
let firstNPrimes = firstNPrimesFallback

// Update references when module loads
tinyalephPromise.then(() => {
  if (tinyalephModule) {
    Complex = tinyalephModule.Complex || ComplexFallback
    PrimeState = tinyalephModule.PrimeState || PrimeStateFallback
    firstNPrimes = tinyalephModule.firstNPrimes || firstNPrimesFallback
  }
})
const fs = require('fs')
const path = require('path')
const os = require('os')

/**
 * Holographic Quantum Encoding system
 *
 * Projects prime-amplitude states into spatial interference patterns
 * using DFT, enabling distributed, reconstruction-capable memory.
 */
/**
 * Stabilization Controller
 *
 * Implements dynamic λ(t) from equation 12:
 * λ(t) = λ₀ · σ(aC·C(t) - aS·S(t) - aSMF·SSMF(s(t)))
 *
 * Controls the "condensation pressure" - balance between
 * unitary evolution and dissipative stabilization.
 */
// ════════════════════════════════════════════════════════════════════
// TICK-ONLY HQE GATING (from discrete.pdf Section 4.2)
// Gates expensive holographic operations to tick events only
// ════════════════════════════════════════════════════════════════════

/**
 * Tick Gate for HQE operations
 *
 * From discrete.pdf: HQE computation should only occur on valid tick events
 * to prevent continuous CPU usage and maintain discrete-time semantics.
 *
 * Tick conditions:
 * 1. Minimum time elapsed since last tick
 * 2. Coherence threshold crossed
 * 3. External event trigger
 */
class TickGate {
  /**
   * Create a tick gate
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    // Minimum milliseconds between ticks
    this.minTickInterval = options.minTickInterval || 16 // ~60fps max

    // Coherence threshold for triggering tick
    this.coherenceThreshold = options.coherenceThreshold || 0.7

    // Last tick timestamp
    this.lastTickTime = 0

    // Tick counter
    this.tickCount = 0

    // Pending tick flag (set by external events)
    this.pendingTick = false

    // Tick history for analysis
    this.tickHistory = []
    this.maxTickHistory = options.maxTickHistory || 50

    // Gating mode
    // 'strict' - only process on explicit ticks
    // 'adaptive' - allow through if coherence is high
    // 'free' - no gating (legacy behavior)
    this.mode = options.mode || 'adaptive'

    // Statistics
    this.gatedCount = 0 // Number of operations gated (blocked)
    this.passedCount = 0 // Number of operations passed
  }

  /**
   * Register an external tick event
   * Called by PRSC or SMF when coherence spikes
   */
  tick() {
    const now = Date.now()
    this.pendingTick = true
    this.lastTickTime = now
    this.tickCount++

    this.tickHistory.push({
      time: now,
      count: this.tickCount,
    })

    if (this.tickHistory.length > this.maxTickHistory) {
      this.tickHistory.shift()
    }
  }

  /**
   * Check if an operation should proceed (tick gate)
   *
   * @param {Object} state - Current system state
   * @param {number} state.coherence - Current coherence level
   * @returns {Object} Gate result
   */
  shouldProcess(state = {}) {
    const now = Date.now()
    const timeSinceLastTick = now - this.lastTickTime
    const coherence = state.coherence || 0

    let shouldPass = false
    let reason = ''

    switch (this.mode) {
      case 'free':
        // No gating - always pass
        shouldPass = true
        reason = 'free_mode'
        break

      case 'strict':
        // Only pass on explicit pending tick
        shouldPass = this.pendingTick
        reason = shouldPass ? 'pending_tick' : 'no_tick'
        break

      case 'adaptive':
      default:
        // Pass if:
        // 1. Pending tick exists, OR
        // 2. Coherence exceeds threshold AND minimum interval elapsed
        if (this.pendingTick) {
          shouldPass = true
          reason = 'pending_tick'
        } else if (
          coherence >= this.coherenceThreshold &&
          timeSinceLastTick >= this.minTickInterval
        ) {
          shouldPass = true
          reason = 'coherence_threshold'
          // Auto-register this as a tick
          this.tick()
        } else if (timeSinceLastTick >= this.minTickInterval * 10) {
          // Fallback: allow through if way too long since last tick
          shouldPass = true
          reason = 'timeout_fallback'
          this.tick()
        } else {
          reason = 'gated'
        }
        break
    }

    // Clear pending tick if we're processing
    if (shouldPass) {
      this.pendingTick = false
      this.passedCount++
    } else {
      this.gatedCount++
    }

    return {
      shouldPass,
      reason,
      tickCount: this.tickCount,
      timeSinceLastTick,
      coherence,
      mode: this.mode,
    }
  }

  /**
   * Get tick rate (ticks per second)
   */
  getTickRate() {
    if (this.tickHistory.length < 2) return 0

    const recent = this.tickHistory.slice(-10)
    const duration = recent[recent.length - 1].time - recent[0].time

    if (duration <= 0) return 0
    return ((recent.length - 1) / duration) * 1000
  }

  /**
   * Get gating statistics
   */
  getStats() {
    const total = this.passedCount + this.gatedCount
    return {
      tickCount: this.tickCount,
      tickRate: this.getTickRate(),
      passedCount: this.passedCount,
      gatedCount: this.gatedCount,
      gateRatio: total > 0 ? this.gatedCount / total : 0,
      mode: this.mode,
      lastTickTime: this.lastTickTime,
    }
  }

  /**
   * Reset gate state
   */
  reset() {
    this.tickCount = 0
    this.lastTickTime = 0
    this.pendingTick = false
    this.tickHistory = []
    this.gatedCount = 0
    this.passedCount = 0
  }

  /**
   * Set gating mode
   * @param {'strict'|'adaptive'|'free'} mode - New mode
   */
  setMode(mode) {
    if (['strict', 'adaptive', 'free'].includes(mode)) {
      this.mode = mode
    }
  }
}

class StabilizationController {
  /**
   * Create a stabilization controller
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    // Base stabilization rate λ₀
    this.lambda0 = options.lambda0 || 0.1

    // Weighting coefficients
    this.aC = options.aC || 1.0 // Coherence weight (positive: high C increases λ)
    this.aS = options.aS || 0.8 // Entropy weight (positive: high S decreases λ)
    this.aSMF = options.aSMF || 0.5 // SMF entropy weight

    // Sigmoid steepness
    this.steepness = options.steepness || 2.0

    // Bounds for λ
    this.lambdaMin = options.lambdaMin || 0.01
    this.lambdaMax = options.lambdaMax || 0.5

    // History for analysis
    this.history = []
    this.maxHistory = options.maxHistory || 100
  }

  /**
   * Sigmoid squashing function σ
   * Maps (-∞, ∞) → (0, 1)
   * @param {number} x - Input value
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-this.steepness * x))
  }

  /**
   * Compute current λ(t) value
   *
   * λ(t) = λ₀ · σ(aC·C(t) - aS·S(t) - aSMF·SSMF(s(t)))
   *
   * @param {number} coherence - Global coherence C(t) ∈ [0, 1]
   * @param {number} entropy - System entropy S(t)
   * @param {number} smfEntropy - SMF entropy SSMF
   * @returns {number} Stabilization rate λ(t)
   */
  computeLambda(coherence, entropy, smfEntropy = 0) {
    // Compute the argument to the sigmoid
    const arg = this.aC * coherence - this.aS * entropy - this.aSMF * smfEntropy

    // Apply sigmoid and scale by λ₀
    const lambda = this.lambda0 * this.sigmoid(arg)

    // Clamp to bounds
    const clampedLambda = Math.max(this.lambdaMin, Math.min(this.lambdaMax, lambda))

    // Record to history
    this.history.push({
      timestamp: Date.now(),
      coherence,
      entropy,
      smfEntropy,
      arg,
      lambda: clampedLambda,
    })

    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    return clampedLambda
  }

  /**
   * Get the interpretation of current λ
   * @param {number} lambda - Current λ value
   */
  interpret(lambda) {
    if (lambda > 0.3) {
      return 'high_stabilization' // Strong condensation pressure
    } else if (lambda > 0.1) {
      return 'normal' // Balanced
    } else {
      return 'low_stabilization' // More unitary/exploratory
    }
  }

  /**
   * Get recent lambda trend
   */
  getTrend() {
    if (this.history.length < 5) return 0

    const recent = this.history.slice(-10)
    const first = recent.slice(0, Math.floor(recent.length / 2))
    const second = recent.slice(Math.floor(recent.length / 2))

    const firstAvg = first.reduce((s, h) => s + h.lambda, 0) / first.length
    const secondAvg = second.reduce((s, h) => s + h.lambda, 0) / second.length

    return secondAvg - firstAvg
  }

  /**
   * Get statistics
   */
  getStats() {
    if (this.history.length === 0) {
      return { current: this.lambda0, mean: this.lambda0, trend: 0 }
    }

    const lambdas = this.history.map((h) => h.lambda)
    const current = lambdas[lambdas.length - 1]
    const mean = lambdas.reduce((a, b) => a + b, 0) / lambdas.length

    return {
      current,
      mean,
      min: Math.min(...lambdas),
      max: Math.max(...lambdas),
      trend: this.getTrend(),
      interpretation: this.interpret(current),
    }
  }

  /**
   * Reset controller
   */
  reset() {
    this.history = []
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      config: {
        lambda0: this.lambda0,
        aC: this.aC,
        aS: this.aS,
        aSMF: this.aSMF,
      },
      stats: this.getStats(),
    }
  }
}

class HolographicEncoder {
  /**
   * Create a holographic encoder
   * @param {number} gridSize - Size of the 2D holographic grid
   * @param {Array<number>|number} primes - Primes to use or count
   * @param {Object} options - Configuration options
   */
  constructor(gridSize = 64, primes = 64, options = {}) {
    this.gridSize = gridSize

    // Handle primes argument
    if (typeof primes === 'number') {
      this.primes = firstNPrimes(primes)
    } else if (Array.isArray(primes)) {
      this.primes = primes
    } else {
      this.primes = firstNPrimes(64)
    }

    this.primeToIndex = new Map(this.primes.map((p, i) => [p, i]))

    // Configuration
    this.wavelengthScale = options.wavelengthScale || 10
    this.phaseOffset = options.phaseOffset || 0

    // Stabilization controller for dynamic λ(t) (equation 12)
    this.stabilization = new StabilizationController(options.stabilization || {})

    // Tick gate for HQE operations (discrete.pdf Section 4.2)
    this.tickGate = new TickGate(options.tickGate || {})

    // Precompute spatial frequencies for each prime
    this.spatialFrequencies = this.computeSpatialFrequencies()

    // Holographic field (2D complex array)
    this.field = this.createField()
  }

  /**
   * Create an empty holographic field
   */
  createField() {
    const field = new Array(this.gridSize)
    for (let i = 0; i < this.gridSize; i++) {
      field[i] = new Array(this.gridSize)
      for (let j = 0; j < this.gridSize; j++) {
        field[i][j] = new Complex(0, 0)
      }
    }
    return field
  }

  /**
   * Compute spatial frequencies for each prime
   * Maps primes to (kx, ky) frequency pairs using golden ratio spiral
   */
  computeSpatialFrequencies() {
    const phi = (1 + Math.sqrt(5)) / 2 // Golden ratio
    const frequencies = []

    for (let i = 0; i < this.primes.length; i++) {
      const p = this.primes[i]
      // Use logarithmic prime mapping for wavelength
      const wavelength = this.wavelengthScale * (1 + Math.log(p) / Math.log(2))
      const k = (2 * Math.PI) / wavelength

      // Distribute angles using golden ratio for optimal coverage
      const angle = 2 * Math.PI * i * phi

      frequencies.push({
        prime: p,
        kx: k * Math.cos(angle),
        ky: k * Math.sin(angle),
        wavelength,
      })
    }

    return frequencies
  }

  /**
   * Project a prime state into the holographic field (equation 13)
   * H(x,y,t) = Σp αp(t) exp(i[kp·r + φp(t)])
   *
   * @param {PrimeState|Object} state - Prime state or {prime: Complex} map
   * @param {Object} options - Projection options
   */
  project(state, options = {}) {
    const clear = options.clear !== false

    if (clear) {
      this.clearField()
    }

    // Handle different state formats
    let amplitudes
    if (state instanceof PrimeState) {
      amplitudes = this.primes.map((p) => state.get(p) || new Complex(0, 0))
    } else if (typeof state === 'object') {
      amplitudes = this.primes.map((p) => {
        const amp = state[p]
        if (!amp) return new Complex(0, 0)
        if (amp instanceof Complex) return amp
        if (typeof amp === 'number') return new Complex(amp, 0)
        if (amp.re !== undefined) return new Complex(amp.re, amp.im || 0)
        return new Complex(0, 0)
      })
    } else {
      throw new Error('Invalid state format')
    }

    // Project each prime's contribution
    for (let i = 0; i < this.primes.length; i++) {
      const freq = this.spatialFrequencies[i]
      const alpha = amplitudes[i]

      if (alpha.norm() < 1e-10) continue

      // Add this prime's plane wave to the field
      for (let x = 0; x < this.gridSize; x++) {
        for (let y = 0; y < this.gridSize; y++) {
          // k·r = kx*x + ky*y
          const phase = freq.kx * x + freq.ky * y + this.phaseOffset
          const wave = Complex.fromPolar(1, phase)

          // H(x,y) += αp * exp(i*k·r)
          this.field[x][y] = this.field[x][y].add(alpha.mul(wave))
        }
      }
    }

    return this.field
  }

  /**
   * Project from PRSC oscillators
   * @param {PRSCLayer} prsc - PRSC layer
   * @param {Object} options - Projection options
   */
  projectFromPRSC(prsc, options = {}) {
    const state = {}
    for (const osc of prsc.oscillators) {
      state[osc.prime] = Complex.fromPolar(osc.amplitude, osc.phase)
    }
    return this.project(state, options)
  }

  /**
   * Reconstruct amplitudes from holographic field (equation 15)
   * Uses inverse DFT to recover prime amplitudes
   *
   * @returns {Map<number, Complex>} Reconstructed amplitudes by prime
   */
  reconstruct() {
    const amplitudes = new Map()

    for (let i = 0; i < this.primes.length; i++) {
      const freq = this.spatialFrequencies[i]
      const prime = this.primes[i]

      // Inverse DFT at this frequency
      let sum = new Complex(0, 0)

      for (let x = 0; x < this.gridSize; x++) {
        for (let y = 0; y < this.gridSize; y++) {
          // Inverse: exp(-i*k·r)
          const phase = -(freq.kx * x + freq.ky * y + this.phaseOffset)
          const wave = Complex.fromPolar(1, phase)

          sum = sum.add(this.field[x][y].mul(wave))
        }
      }

      // Normalize by grid size
      sum = new Complex(
        sum.re / (this.gridSize * this.gridSize),
        sum.im / (this.gridSize * this.gridSize),
      )

      amplitudes.set(prime, sum)
    }

    return amplitudes
  }

  /**
   * Reconstruct to PrimeState
   * @returns {PrimeState} Reconstructed prime state
   */
  reconstructToState() {
    const amplitudes = this.reconstruct()
    const state = new PrimeState(this.primes)

    for (const [prime, amp] of amplitudes) {
      state.set(prime, amp)
    }

    return state
  }

  /**
   * Compute intensity pattern (equation 14)
   * I(x,y,t) = |H(x,y,t)|²
   *
   * @returns {Array<Array<number>>} Intensity at each grid point
   */
  intensity() {
    const I = new Array(this.gridSize)
    for (let x = 0; x < this.gridSize; x++) {
      I[x] = new Array(this.gridSize)
      for (let y = 0; y < this.gridSize; y++) {
        const cell = this.field[x][y]
        // Handle both Complex objects and plain {re, im} objects
        if (typeof cell.normSq === 'function') {
          I[x][y] = cell.normSq()
        } else {
          const re = cell.re !== undefined ? cell.re : 0
          const im = cell.im !== undefined ? cell.im : 0
          I[x][y] = re * re + im * im
        }
      }
    }
    return I
  }

  /**
   * Compute real part pattern (for visualization)
   * @returns {Array<Array<number>>} Real part at each grid point
   */
  realPart() {
    const R = new Array(this.gridSize)
    for (let x = 0; x < this.gridSize; x++) {
      R[x] = new Array(this.gridSize)
      for (let y = 0; y < this.gridSize; y++) {
        R[x][y] = this.field[x][y].re
      }
    }
    return R
  }

  /**
   * Compute phase pattern (for visualization)
   * @returns {Array<Array<number>>} Phase at each grid point
   */
  phasePattern() {
    const P = new Array(this.gridSize)
    for (let x = 0; x < this.gridSize; x++) {
      P[x] = new Array(this.gridSize)
      for (let y = 0; y < this.gridSize; y++) {
        P[x][y] = this.field[x][y].phase()
      }
    }
    return P
  }

  /**
   * Clear the holographic field
   */
  clearField() {
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        this.field[x][y] = new Complex(0, 0)
      }
    }
  }

  /**
   * Add another field to this one (superposition)
   * @param {Array<Array<Complex>>} otherField - Field to add
   */
  superpose(otherField) {
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        this.field[x][y] = this.field[x][y].add(otherField[x][y])
      }
    }
  }

  /**
   * Multiply field by a scalar
   * @param {number} scalar - Multiplication factor
   */
  scale(scalar) {
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        this.field[x][y] = new Complex(this.field[x][y].re * scalar, this.field[x][y].im * scalar)
      }
    }
  }

  /**
   * Clone this encoder with its current field
   */
  clone() {
    const cloned = new HolographicEncoder(this.gridSize, this.primes.slice(), {
      wavelengthScale: this.wavelengthScale,
      phaseOffset: this.phaseOffset,
    })

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        cloned.field[x][y] = new Complex(this.field[x][y].re, this.field[x][y].im)
      }
    }

    return cloned
  }

  /**
   * Compute total field energy
   */
  totalEnergy() {
    let energy = 0
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const cell = this.field[x][y]
        // Handle both Complex objects and plain {re, im} objects
        if (typeof cell.normSq === 'function') {
          energy += cell.normSq()
        } else {
          const re = cell.re !== undefined ? cell.re : 0
          const im = cell.im !== undefined ? cell.im : 0
          energy += re * re + im * im
        }
      }
    }
    return energy
  }

  /**
   * Compute field entropy (based on intensity distribution)
   */
  fieldEntropy() {
    const I = this.intensity()
    const total = this.totalEnergy()

    if (total < 1e-10) return 0

    let H = 0
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const p = I[x][y] / total
        if (p > 1e-10) {
          H -= p * Math.log2(p)
        }
      }
    }

    return H
  }

  /**
   * Get state snapshot (compressed for storage)
   */
  getState() {
    // Only store non-zero cells to save space
    const cells = []
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const cell = this.field[x][y]
        // Handle both Complex objects and plain {re, im} objects
        const re = cell.re !== undefined ? cell.re : 0
        const im = cell.im !== undefined ? cell.im : 0
        const normSq = re * re + im * im

        if (normSq > 1e-10) {
          cells.push({ x, y, re, im })
        }
      }
    }

    return {
      gridSize: this.gridSize,
      cells,
      totalEnergy: this.totalEnergy(),
    }
  }

  /**
   * Load state from snapshot
   * @param {Object} state - State snapshot
   */
  loadState(state) {
    if (state.gridSize !== this.gridSize) {
      throw new Error('Grid size mismatch')
    }

    this.clearField()

    for (const cell of state.cells) {
      this.field[cell.x][cell.y] = new Complex(cell.re, cell.im)
    }
  }

  /**
   * Evolve the holographic field with stabilization (equation 11)
   *
   * d|Ψ(t)⟩/dt = iĤ|Ψ(t)⟩ - λ(t)D̂(Ψ,s)|Ψ(t)⟩
   *
   * The first term is unitary (phase evolution), the second is dissipative
   * (stabilization toward coherent attractors).
   *
   * @param {Object} state - Current system state
   * @param {number} state.coherence - Global coherence C(t)
   * @param {number} state.entropy - System entropy S(t)
   * @param {number} state.smfEntropy - SMF entropy SSMF
   * @param {number} dt - Time step
   * @returns {Object} Evolution result with lambda value
   */
  evolve(state, dt = 0.016) {
    const { coherence, entropy, smfEntropy = 0 } = state

    // Check tick gate before expensive HQE operations
    const gateResult = this.tickGate.shouldProcess({ coherence })

    if (!gateResult.shouldPass) {
      // Return gated result without processing
      return {
        lambda: 0,
        interpretation: 'gated',
        totalEnergy: this.totalEnergy(),
        fieldEntropy: this.fieldEntropy(),
        gated: true,
        gateReason: gateResult.reason,
        tickCount: gateResult.tickCount,
      }
    }

    // Compute dynamic λ(t) using stabilization controller
    const lambda = this.stabilization.computeLambda(coherence, entropy, smfEntropy)

    // For each cell, apply damped evolution:
    // New amplitude = old amplitude * exp(-λ * dt)
    // This implements the dissipative term -λD̂|Ψ⟩
    const dampingFactor = Math.exp(-lambda * dt)

    // Apply stabilization damping
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const cell = this.field[x][y]
        // Dampen high-energy cells more than low-energy (stabilization)
        const intensity = cell.re * cell.re + cell.im * cell.im
        const localDamping = dampingFactor * (1 + lambda * intensity * 0.1)

        this.field[x][y] = new Complex(cell.re * localDamping, cell.im * localDamping)
      }
    }

    return {
      lambda,
      interpretation: this.stabilization.interpret(lambda),
      totalEnergy: this.totalEnergy(),
      fieldEntropy: this.fieldEntropy(),
      gated: false,
      tickCount: gateResult.tickCount,
    }
  }

  /**
   * Register a tick event (from PRSC or SMF coherence spike)
   */
  tick() {
    this.tickGate.tick()
  }

  /**
   * Get tick gate statistics
   */
  getTickStats() {
    return this.tickGate.getStats()
  }

  /**
   * Set tick gate mode
   * @param {'strict'|'adaptive'|'free'} mode - Gating mode
   */
  setTickMode(mode) {
    this.tickGate.setMode(mode)
  }

  /**
   * Get stabilization statistics
   */
  getStabilizationStats() {
    return this.stabilization.getStats()
  }
}

/**
 * Holographic Memory
 *
 * Stores and retrieves patterns using holographic interference.
 * Enables content-addressable, distributed, fault-tolerant memory.
 */
class HolographicMemory {
  /**
   * Create a holographic memory
   * @param {number} gridSize - Size of holographic grid
   * @param {number|Array} primes - Primes to use
   * @param {Object} options - Configuration options
   */
  constructor(gridSize = 64, primes = 64, options = {}) {
    this.encoder = new HolographicEncoder(gridSize, primes, options)
    this.memories = []
    this.maxMemories = options.maxMemories || 100
    this.decayRate = options.decayRate || 0.01
  }

  /**
   * Store a pattern in memory
   * @param {PrimeState|Object} state - State to store
   * @param {Object} metadata - Associated metadata
   */
  store(state, metadata = {}) {
    // Create a new encoder for this memory
    const encoder = new HolographicEncoder(this.encoder.gridSize, this.encoder.primes.slice(), {
      wavelengthScale: this.encoder.wavelengthScale,
      phaseOffset: this.encoder.phaseOffset,
    })

    encoder.project(state)

    this.memories.push({
      encoder,
      metadata,
      timestamp: Date.now(),
      accessCount: 0,
      strength: 1.0,
    })

    // Prune if over capacity
    if (this.memories.length > this.maxMemories) {
      this.prune()
    }

    return this.memories.length - 1
  }

  /**
   * Recall the best matching memory
   * @param {PrimeState|Object} cue - Retrieval cue
   * @param {number} threshold - Minimum similarity threshold
   * @returns {Object|null} Best matching memory or null
   */
  recall(cue, threshold = 0.3) {
    if (this.memories.length === 0) return null

    // Project cue to holographic form
    const cueEncoder = new HolographicEncoder(this.encoder.gridSize, this.encoder.primes.slice())
    cueEncoder.project(cue)

    // Find best match by holographic correlation
    let bestMatch = null
    let bestScore = threshold

    for (const memory of this.memories) {
      const score = this.correlate(cueEncoder, memory.encoder)
      if (score > bestScore) {
        bestScore = score
        bestMatch = memory
      }
    }

    if (bestMatch) {
      bestMatch.accessCount++
      bestMatch.strength = Math.min(1.0, bestMatch.strength + 0.1)
    }

    return bestMatch
      ? {
          state: bestMatch.encoder.reconstructToState(),
          metadata: bestMatch.metadata,
          score: bestScore,
          strength: bestMatch.strength,
        }
      : null
  }

  /**
   * Correlate two holographic fields
   * Returns normalized correlation coefficient
   *
   * @param {HolographicEncoder} enc1 - First encoder
   * @param {HolographicEncoder} enc2 - Second encoder
   */
  correlate(enc1, enc2) {
    let sumProduct = 0
    let sumSq1 = 0
    let sumSq2 = 0

    for (let x = 0; x < enc1.gridSize; x++) {
      for (let y = 0; y < enc1.gridSize; y++) {
        // Compute normSq for each cell (handling both Complex and plain objects)
        const cell1 = enc1.field[x][y]
        const cell2 = enc2.field[x][y]

        let v1, v2
        if (typeof cell1.normSq === 'function') {
          v1 = cell1.normSq()
        } else {
          const re1 = cell1.re !== undefined ? cell1.re : 0
          const im1 = cell1.im !== undefined ? cell1.im : 0
          v1 = re1 * re1 + im1 * im1
        }

        if (typeof cell2.normSq === 'function') {
          v2 = cell2.normSq()
        } else {
          const re2 = cell2.re !== undefined ? cell2.re : 0
          const im2 = cell2.im !== undefined ? cell2.im : 0
          v2 = re2 * re2 + im2 * im2
        }

        sumProduct += v1 * v2
        sumSq1 += v1 * v1
        sumSq2 += v2 * v2
      }
    }

    const norm = Math.sqrt(sumSq1) * Math.sqrt(sumSq2)
    return norm > 1e-10 ? sumProduct / norm : 0
  }

  /**
   * Apply decay to all memories
   */
  decay() {
    for (const memory of this.memories) {
      memory.strength *= 1 - this.decayRate
    }

    // Remove very weak memories
    this.memories = this.memories.filter((m) => m.strength > 0.1)
  }

  /**
   * Prune memories to capacity
   * Removes weakest or oldest memories
   */
  prune() {
    if (this.memories.length <= this.maxMemories) return

    // Sort by strength * accessCount
    this.memories.sort(
      (a, b) => b.strength * (b.accessCount + 1) - a.strength * (a.accessCount + 1),
    )

    // Keep top memories
    this.memories = this.memories.slice(0, this.maxMemories)
  }

  /**
   * Find all memories above similarity threshold
   * @param {PrimeState|Object} cue - Retrieval cue
   * @param {number} threshold - Minimum similarity
   */
  findSimilar(cue, threshold = 0.3) {
    const cueEncoder = new HolographicEncoder(this.encoder.gridSize, this.encoder.primes.slice())
    cueEncoder.project(cue)

    const results = []
    for (const memory of this.memories) {
      const score = this.correlate(cueEncoder, memory.encoder)
      if (score > threshold) {
        results.push({
          state: memory.encoder.reconstructToState(),
          metadata: memory.metadata,
          score,
          strength: memory.strength,
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Get memory count
   */
  get count() {
    return this.memories.length
  }

  /**
   * Clear all memories
   */
  clear() {
    this.memories = []
  }

  /**
   * Serialize to JSON (compact form)
   */
  toJSON() {
    return {
      gridSize: this.encoder.gridSize,
      primes: this.encoder.primes,
      memories: this.memories.map((m) => ({
        state: m.encoder.getState(),
        metadata: m.metadata,
        timestamp: m.timestamp,
        accessCount: m.accessCount,
        strength: m.strength,
      })),
    }
  }

  /**
   * Load from JSON
   * @param {Object} data - Serialized memory
   */
  static fromJSON(data) {
    const memory = new HolographicMemory(data.gridSize, data.primes)

    for (const saved of data.memories) {
      const encoder = new HolographicEncoder(data.gridSize, data.primes)
      encoder.loadState(saved.state)

      memory.memories.push({
        encoder,
        metadata: saved.metadata,
        timestamp: saved.timestamp,
        accessCount: saved.accessCount,
        strength: saved.strength,
      })
    }

    return memory
  }
}

/**
 * Pattern similarity using holographic comparison
 */
class HolographicSimilarity {
  /**
   * Create a similarity calculator
   * @param {number} gridSize - Holographic grid size
   * @param {number|Array} primes - Primes to use
   */
  constructor(gridSize = 32, primes = 32) {
    this.encoder1 = new HolographicEncoder(gridSize, primes)
    this.encoder2 = new HolographicEncoder(gridSize, primes)
  }

  /**
   * Compute holographic similarity between two states
   * @param {PrimeState|Object} state1 - First state
   * @param {PrimeState|Object} state2 - Second state
   */
  similarity(state1, state2) {
    this.encoder1.project(state1)
    this.encoder2.project(state2)

    // Compute intensity correlation
    const I1 = this.encoder1.intensity()
    const I2 = this.encoder2.intensity()

    let sumProduct = 0
    let sumSq1 = 0
    let sumSq2 = 0

    for (let x = 0; x < this.encoder1.gridSize; x++) {
      for (let y = 0; y < this.encoder1.gridSize; y++) {
        sumProduct += I1[x][y] * I2[x][y]
        sumSq1 += I1[x][y] * I1[x][y]
        sumSq2 += I2[x][y] * I2[x][y]
      }
    }

    const norm = Math.sqrt(sumSq1) * Math.sqrt(sumSq2)
    return norm > 1e-10 ? sumProduct / norm : 0
  }

  /**
   * Compute difference pattern
   * @param {PrimeState|Object} state1 - First state
   * @param {PrimeState|Object} state2 - Second state
   */
  difference(state1, state2) {
    this.encoder1.project(state1)
    this.encoder2.project(state2)

    const diff = this.encoder1.clone()

    for (let x = 0; x < diff.gridSize; x++) {
      for (let y = 0; y < diff.gridSize; y++) {
        diff.field[x][y] = new Complex(
          diff.field[x][y].re - this.encoder2.field[x][y].re,
          diff.field[x][y].im - this.encoder2.field[x][y].im,
        )
      }
    }

    return diff
  }
}

// ════════════════════════════════════════════════════════════════════
// CHECKPOINT MANAGER WITH ROLLBACK POLICY
// ════════════════════════════════════════════════════════════════════

/**
 * CheckpointManager
 *
 * Manages binary checkpoints with SHA-256 checksum verification and
 * automatic rollback policy. Keeps the last known good checkpoint
 * and restores it if the current checkpoint fails validation.
 *
 * Features:
 * - Binary protobuf-like checkpoints (checkpoint-{timestamp}.bin)
 * - SHA-256 checksum verification
 * - Automatic rollback to last good checkpoint on failure
 * - Configurable retention policy
 */
class CheckpointManager {
  /**
   * Create a CheckpointManager
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    this.checkpointDir =
      options.checkpointDir || path.join(os.homedir(), '.sentient', 'hqe', 'checkpoints')
    this.maxCheckpoints = options.maxCheckpoints || 5
    this.autoRollback = options.autoRollback ?? true

    // Track checkpoint state
    this.lastGoodCheckpoint = null
    this.currentCheckpoint = null
    this.checkpointHistory = []

    // Statistics
    this.stats = {
      totalCheckpoints: 0,
      successfulLoads: 0,
      failedLoads: 0,
      rollbacks: 0,
      checksumFailures: 0,
    }

    // Ensure checkpoint directory exists
    this._ensureDir()

    // Load metadata if exists
    this._loadMetadata()
  }

  /**
   * Ensure checkpoint directory exists
   * @private
   */
  _ensureDir() {
    try {
      if (!fs.existsSync(this.checkpointDir)) {
        fs.mkdirSync(this.checkpointDir, { recursive: true })
      }
    } catch (e) {
      console.error('[CheckpointManager] Failed to create checkpoint directory:', e.message)
    }
  }

  /**
   * Compute SHA-256 hash of data
   * @param {Buffer} data - Data to hash
   * @returns {string} Hex-encoded hash
   */
  computeHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Save a checkpoint
   * @param {Object} state - State to checkpoint
   * @param {Object} options - Save options
   * @returns {Object} Checkpoint info
   */
  save(state, options = {}) {
    const timestamp = Date.now()
    const filename = `checkpoint-${timestamp}.bin`
    const filepath = path.join(this.checkpointDir, filename)
    const metapath = path.join(this.checkpointDir, `${filename}.meta`)

    try {
      // Serialize state to JSON then to buffer
      const jsonStr = JSON.stringify(state)
      const buffer = Buffer.from(jsonStr, 'utf-8')

      // Compute checksum
      const checksum = this.computeHash(buffer)

      // Write checkpoint
      fs.writeFileSync(filepath, buffer)

      // Write metadata
      const metadata = {
        version: 1,
        timestamp,
        filename,
        size: buffer.length,
        checksum,
        algorithm: 'sha256',
        sections: Object.keys(state),
        created: new Date().toISOString(),
      }
      fs.writeFileSync(metapath, JSON.stringify(metadata, null, 2))

      // Update tracking
      const checkpointInfo = {
        filepath,
        filename,
        timestamp,
        checksum,
        size: buffer.length,
        valid: true,
      }

      this.checkpointHistory.push(checkpointInfo)
      this.currentCheckpoint = checkpointInfo
      this.lastGoodCheckpoint = checkpointInfo
      this.stats.totalCheckpoints++

      // Prune old checkpoints
      this._pruneOldCheckpoints()

      // Update global metadata
      this._saveMetadata()

      return {
        success: true,
        checkpoint: checkpointInfo,
      }
    } catch (e) {
      return {
        success: false,
        error: e.message,
      }
    }
  }

  /**
   * Load a checkpoint with verification
   * @param {string} filepath - Path to checkpoint (or null for latest)
   * @returns {Object} Loaded state or rollback result
   */
  load(filepath = null) {
    // Use latest if not specified
    if (!filepath) {
      filepath = this._getLatestCheckpointPath()
      if (!filepath) {
        return {
          success: false,
          error: 'No checkpoints found',
        }
      }
    }

    const metapath = filepath + '.meta'

    try {
      // Read checkpoint
      const buffer = fs.readFileSync(filepath)

      // Read and verify metadata
      let metadata = null
      if (fs.existsSync(metapath)) {
        metadata = JSON.parse(fs.readFileSync(metapath, 'utf-8'))
      }

      // Compute checksum
      const computedChecksum = this.computeHash(buffer)

      // Verify checksum if metadata exists
      if (metadata && metadata.checksum) {
        if (computedChecksum !== metadata.checksum) {
          this.stats.checksumFailures++
          this.stats.failedLoads++

          // Checksum mismatch - attempt rollback
          if (this.autoRollback && this.lastGoodCheckpoint) {
            console.warn(
              '[CheckpointManager] Checksum mismatch, rolling back to last good checkpoint',
            )
            return this._rollback()
          }

          return {
            success: false,
            error: 'Checksum verification failed',
            expected: metadata.checksum,
            computed: computedChecksum,
          }
        }
      }

      // Parse state
      const state = JSON.parse(buffer.toString('utf-8'))

      // Update tracking
      this.currentCheckpoint = {
        filepath,
        filename: path.basename(filepath),
        timestamp: metadata?.timestamp || Date.now(),
        checksum: computedChecksum,
        size: buffer.length,
        valid: true,
      }
      this.lastGoodCheckpoint = this.currentCheckpoint
      this.stats.successfulLoads++

      return {
        success: true,
        state,
        checkpoint: this.currentCheckpoint,
        metadata,
      }
    } catch (e) {
      this.stats.failedLoads++

      // Attempt rollback on any error
      if (
        this.autoRollback &&
        this.lastGoodCheckpoint &&
        this.lastGoodCheckpoint.filepath !== filepath
      ) {
        console.warn('[CheckpointManager] Load failed, rolling back:', e.message)
        return this._rollback()
      }

      return {
        success: false,
        error: e.message,
      }
    }
  }

  /**
   * Verify a checkpoint without loading
   * @param {string} filepath - Path to checkpoint
   * @returns {Object} Verification result
   */
  verify(filepath) {
    const metapath = filepath + '.meta'

    try {
      if (!fs.existsSync(filepath)) {
        return { valid: false, error: 'Checkpoint file not found' }
      }

      const buffer = fs.readFileSync(filepath)
      const computedChecksum = this.computeHash(buffer)

      // Check metadata if exists
      if (fs.existsSync(metapath)) {
        const metadata = JSON.parse(fs.readFileSync(metapath, 'utf-8'))

        if (metadata.checksum !== computedChecksum) {
          return {
            valid: false,
            error: 'Checksum mismatch',
            expected: metadata.checksum,
            computed: computedChecksum,
          }
        }

        // Verify size
        if (metadata.size !== buffer.length) {
          return {
            valid: false,
            error: 'Size mismatch',
            expected: metadata.size,
            actual: buffer.length,
          }
        }
      }

      // Try to parse JSON to verify integrity
      JSON.parse(buffer.toString('utf-8'))

      return {
        valid: true,
        checksum: computedChecksum,
        size: buffer.length,
      }
    } catch (e) {
      return {
        valid: false,
        error: e.message,
      }
    }
  }

  /**
   * Rollback to last known good checkpoint
   * @private
   * @returns {Object} Rollback result
   */
  _rollback() {
    if (!this.lastGoodCheckpoint || !this.lastGoodCheckpoint.filepath) {
      return {
        success: false,
        error: 'No good checkpoint available for rollback',
      }
    }

    this.stats.rollbacks++

    try {
      const filepath = this.lastGoodCheckpoint.filepath

      if (!fs.existsSync(filepath)) {
        return {
          success: false,
          error: 'Rollback checkpoint file not found',
        }
      }

      const buffer = fs.readFileSync(filepath)
      const computedChecksum = this.computeHash(buffer)

      // Verify the rollback checkpoint
      if (computedChecksum !== this.lastGoodCheckpoint.checksum) {
        return {
          success: false,
          error: 'Rollback checkpoint also corrupted',
        }
      }

      const state = JSON.parse(buffer.toString('utf-8'))

      return {
        success: true,
        state,
        checkpoint: this.lastGoodCheckpoint,
        rolledBack: true,
      }
    } catch (e) {
      return {
        success: false,
        error: `Rollback failed: ${e.message}`,
      }
    }
  }

  /**
   * Get path to latest checkpoint
   * @private
   * @returns {string|null}
   */
  _getLatestCheckpointPath() {
    try {
      const files = fs
        .readdirSync(this.checkpointDir)
        .filter((f) => f.startsWith('checkpoint-') && f.endsWith('.bin'))
        .sort()
        .reverse()

      if (files.length === 0) return null

      return path.join(this.checkpointDir, files[0])
    } catch {
      return null
    }
  }

  /**
   * Prune old checkpoints beyond retention limit
   * @private
   */
  _pruneOldCheckpoints() {
    try {
      const files = fs
        .readdirSync(this.checkpointDir)
        .filter((f) => f.startsWith('checkpoint-') && f.endsWith('.bin'))
        .sort()
        .reverse()

      // Keep only maxCheckpoints
      if (files.length > this.maxCheckpoints) {
        const toDelete = files.slice(this.maxCheckpoints)

        for (const file of toDelete) {
          const filepath = path.join(this.checkpointDir, file)
          const metapath = filepath + '.meta'

          // Don't delete the last good checkpoint
          if (this.lastGoodCheckpoint && this.lastGoodCheckpoint.filepath === filepath) {
            continue
          }

          try {
            fs.unlinkSync(filepath)
            if (fs.existsSync(metapath)) {
              fs.unlinkSync(metapath)
            }
          } catch {
            // Ignore deletion errors
          }
        }
      }
    } catch {
      // Ignore pruning errors
    }
  }

  /**
   * Save global metadata
   * @private
   */
  _saveMetadata() {
    try {
      const metapath = path.join(this.checkpointDir, 'checkpoint.meta.json')
      const metadata = {
        version: 1,
        lastGoodCheckpoint: this.lastGoodCheckpoint
          ? {
              filepath: this.lastGoodCheckpoint.filepath,
              filename: this.lastGoodCheckpoint.filename,
              checksum: this.lastGoodCheckpoint.checksum,
              timestamp: this.lastGoodCheckpoint.timestamp,
            }
          : null,
        stats: this.stats,
        lastUpdated: new Date().toISOString(),
      }
      fs.writeFileSync(metapath, JSON.stringify(metadata, null, 2))
    } catch {
      // Ignore metadata save errors
    }
  }

  /**
   * Load global metadata
   * @private
   */
  _loadMetadata() {
    try {
      const metapath = path.join(this.checkpointDir, 'checkpoint.meta.json')
      if (fs.existsSync(metapath)) {
        const metadata = JSON.parse(fs.readFileSync(metapath, 'utf-8'))

        if (metadata.lastGoodCheckpoint) {
          this.lastGoodCheckpoint = metadata.lastGoodCheckpoint
        }
        if (metadata.stats) {
          this.stats = { ...this.stats, ...metadata.stats }
        }
      }
    } catch {
      // Ignore metadata load errors
    }
  }

  /**
   * List all checkpoints
   * @returns {Array} Checkpoint info array
   */
  listCheckpoints() {
    try {
      const files = fs
        .readdirSync(this.checkpointDir)
        .filter((f) => f.startsWith('checkpoint-') && f.endsWith('.bin'))
        .sort()
        .reverse()

      return files.map((filename) => {
        const filepath = path.join(this.checkpointDir, filename)
        const metapath = filepath + '.meta'
        const stats = fs.statSync(filepath)

        let metadata = null
        if (fs.existsSync(metapath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metapath, 'utf-8'))
          } catch {
            // Ignore metadata read errors
          }
        }

        // Extract timestamp from filename
        const match = filename.match(/checkpoint-(\d+)\.bin/)
        const timestamp = match ? parseInt(match[1]) : stats.mtimeMs

        return {
          filepath,
          filename,
          timestamp,
          size: stats.size,
          checksum: metadata?.checksum || null,
          isLastGood: this.lastGoodCheckpoint?.filepath === filepath,
        }
      })
    } catch {
      return []
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      checkpointCount: this.listCheckpoints().length,
      lastGoodCheckpoint: this.lastGoodCheckpoint
        ? {
            filename: this.lastGoodCheckpoint.filename,
            timestamp: this.lastGoodCheckpoint.timestamp,
            checksum: this.lastGoodCheckpoint.checksum?.slice(0, 16) + '...',
          }
        : null,
      checkpointDir: this.checkpointDir,
    }
  }

  /**
   * Force rollback to a specific checkpoint
   * @param {string} filepath - Path to checkpoint
   * @returns {Object} Rollback result
   */
  rollbackTo(filepath) {
    // First verify the checkpoint
    const verification = this.verify(filepath)
    if (!verification.valid) {
      return {
        success: false,
        error: `Cannot rollback to invalid checkpoint: ${verification.error}`,
      }
    }

    // Load the checkpoint
    const loadResult = this.load(filepath)
    if (!loadResult.success) {
      return {
        success: false,
        error: `Failed to load rollback checkpoint: ${loadResult.error}`,
      }
    }

    this.stats.rollbacks++

    return {
      success: true,
      state: loadResult.state,
      checkpoint: loadResult.checkpoint,
      forcedRollback: true,
    }
  }
}

module.exports = {
  TickGate,
  StabilizationController,
  HolographicEncoder,
  HolographicMemory,
  HolographicSimilarity,
  CheckpointManager,
}
