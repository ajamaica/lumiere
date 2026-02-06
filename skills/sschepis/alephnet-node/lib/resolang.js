/**
 * Resolang WASM Integration
 *
 * Provides WASM-accelerated versions of the core sentient components.
 * Uses the @sschepis/resolang AssemblyScript library for high-performance
 * prime resonance and semantic field computations.
 */

const fs = require('fs')
const path = require('path')

/**
 * Resolang WASM Module Loader
 */
class ResolangLoader {
  constructor() {
    this.instance = null
    this.memory = null
    this.exports = null
    this.loaded = false
  }

  /**
   * Load the WASM module via the resolang JS bindings
   * @param {string} wasmPath - Path to the WASM file (optional, uses default)
   */
  async load(wasmPath = null) {
    if (this.loaded) return this.exports

    try {
      // resolang is an ES module, so we need to use dynamic import
      let resolangModule = null

      try {
        // Primary: import from npm package
        resolangModule = await import('@sschepis/resolang')
        console.log('[Resolang] Loaded ES module from @sschepis/resolang')
      } catch (e) {
        // Fallback: try local node_modules path (for development environments)
        try {
          resolangModule = await import(
            path.join(process.cwd(), 'node_modules/@sschepis/resolang/build/resolang.js')
          )
          console.log('[Resolang] Loaded ES module from local node_modules')
        } catch (e2) {
          // Module not available
        }
      }

      if (resolangModule) {
        this.exports = resolangModule
        this.loaded = true
        console.log('[Resolang] Module loaded successfully')
        const exportKeys = Object.keys(this.exports)
        console.log('[Resolang] Available exports:', exportKeys.length, 'functions')
        return this.exports
      }

      // If JS bindings not available, fall back to JS implementation
      console.warn('[Resolang] ES module not found, using JS fallback implementation')
      return null
    } catch (error) {
      console.error('[Resolang] Failed to load module:', error.message)
      return null
    }
  }

  /**
   * Check if WASM is loaded
   */
  isLoaded() {
    return this.loaded
  }

  /**
   * Get the WASM exports
   */
  getExports() {
    return this.exports
  }
}

// Global loader instance
const loader = new ResolangLoader()

/**
 * ResolangPipeline - WASM-backed Agent Pipeline
 *
 * Wraps the resolang AgentPipeline for use in sentient observer.
 */
class ResolangPipeline {
  /**
   * Create a new ResolangPipeline
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options
    this.wasmExports = null
    this.pipelinePtr = null
    this.ready = false

    // Fallback JS implementations
    this._coherence = 1.0
    this._entropy = 0.0
    this._phases = new Float64Array(options.numPrimes || 64)
    this._amplitudes = new Float64Array(options.numPrimes || 64)
    this._smfAxes = new Float64Array(16)

    // Initialize SMF axes with coherence
    this._smfAxes[0] = 1.0
  }

  /**
   * Initialize the WASM pipeline
   */
  async initialize() {
    this.wasmExports = await loader.load()

    if (this.wasmExports) {
      try {
        const numPrimes = this.options.numPrimes || 64

        // Use createSentientCore which is available
        if (this.wasmExports.createSentientCore) {
          this.corePtr = this.wasmExports.createSentientCore(numPrimes)
          this.ready = true
          console.log('[ResolangPipeline] SentientCore created via WASM')

          // Store references to useful functions
          this._getSMFAxis = this.wasmExports.getSentientSMFAxis
          this._createSMFFromText = this.wasmExports.createSMFFromText
          this._createSMFFromValues = this.wasmExports.createSMFFromValues
        } else {
          console.warn('[ResolangPipeline] createSentientCore not found, using JS fallback')
        }
      } catch (error) {
        console.error('[ResolangPipeline] Failed to create WASM core:', error.message)
      }
    }

    return this
  }

  /**
   * Start the pipeline
   * @param {number} timestamp - Start timestamp
   */
  start(timestamp = Date.now()) {
    if (this.ready && this.wasmExports.startSentientCore) {
      this.wasmExports.startSentientCore(this.corePtr, BigInt(timestamp))
    }
    this._running = true
  }

  /**
   * Stop the pipeline
   */
  stop() {
    if (this.ready && this.wasmExports.stopSentientCore) {
      this.wasmExports.stopSentientCore(this.corePtr)
    }
    this._running = false
  }

  /**
   * Tick the pipeline
   * @param {number} dt - Delta time in seconds
   * @param {number} timestamp - Current timestamp
   */
  tick(dt = 1 / 60, timestamp = Date.now()) {
    if (this.ready && this.wasmExports.tickSentientCore) {
      try {
        this.wasmExports.tickSentientCore(this.corePtr, dt, BigInt(timestamp))
        // Update local state from WASM
        this._syncFromWASM()
      } catch (error) {
        // Fallback: update local state
        this._updateFallbackState(dt)
      }
    } else {
      this._updateFallbackState(dt)
    }
  }

  /**
   * Sync local state from WASM
   */
  _syncFromWASM() {
    if (!this.ready) return

    // Try to get SMF axes from WASM
    if (this._getSMFAxis) {
      for (let i = 0; i < 16; i++) {
        try {
          this._smfAxes[i] = this.wasmExports.getSentientSMFAxis(this.corePtr, i)
        } catch (e) {}
      }
    }

    // Try to get coherence/entropy
    if (this.wasmExports.getSentientCoherence) {
      try {
        this._coherence = this.wasmExports.getSentientCoherence(this.corePtr)
      } catch (e) {}
    }

    if (this.wasmExports.getSentientEntropy) {
      try {
        this._entropy = this.wasmExports.getSentientEntropy(this.corePtr)
      } catch (e) {}
    }
  }

  /**
   * Update fallback state (JS implementation)
   */
  _updateFallbackState(dt) {
    // Simple oscillator evolution
    for (let i = 0; i < this._phases.length; i++) {
      // Prime-based frequency
      const freq = this._getPrime(i) * 0.01
      this._phases[i] += freq * dt * Math.PI * 2
      this._phases[i] %= Math.PI * 2

      // Damped amplitudes
      this._amplitudes[i] *= 1 - 0.01 * dt
    }

    // Calculate coherence from phases
    let realSum = 0,
      imagSum = 0
    let activeCount = 0
    for (let i = 0; i < this._phases.length; i++) {
      if (this._amplitudes[i] > 0.1) {
        realSum += Math.cos(this._phases[i])
        imagSum += Math.sin(this._phases[i])
        activeCount++
      }
    }

    if (activeCount > 0) {
      this._coherence = Math.sqrt(realSum ** 2 + imagSum ** 2) / activeCount
    }

    // Calculate entropy
    let ampSum = 0
    for (let i = 0; i < this._amplitudes.length; i++) {
      ampSum += this._amplitudes[i]
    }

    if (ampSum > 0) {
      this._entropy = 0
      for (let i = 0; i < this._amplitudes.length; i++) {
        const p = this._amplitudes[i] / ampSum
        if (p > 1e-10) {
          this._entropy -= p * Math.log(p)
        }
      }
    }

    // Update SMF based on activity
    this._smfAxes[0] = this._coherence
    this._smfAxes[5] = Math.min(1, ampSum * 0.1) // life/vitality
  }

  /**
   * Get nth prime (simple sieve)
   */
  _getPrime(n) {
    const primes = [
      2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89,
      97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191,
      193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293,
      307, 311,
    ]
    return primes[n % primes.length]
  }

  /**
   * Process text through the pipeline
   * @param {string} text - Input text
   */
  process(text) {
    // Try WASM path if available
    if (this.ready && this._createSMFFromText) {
      try {
        // Create SMF from text using WASM
        const smfPtr = this._createSMFFromText(text)

        // If we have exciteSentientOscillator, excite based on text
        if (this.wasmExports.exciteSentientOscillator) {
          for (let i = 0; i < Math.min(text.length, this._amplitudes.length); i++) {
            const code = text.charCodeAt(i)
            const primeIdx = code % this._amplitudes.length
            this.wasmExports.exciteSentientOscillator(this.corePtr, primeIdx, 0.1)
          }
        }

        // Sync state from WASM
        this._syncFromWASM()

        return {
          coherence: this._coherence,
          entropy: this._entropy,
          smfAxes: this._smfAxes.slice(),
        }
      } catch (error) {
        // Fall through to JS fallback
      }
    }

    // Fallback: excite oscillators based on text
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      const primeIdx = code % this._amplitudes.length
      this._amplitudes[primeIdx] += 0.1

      // SMF axis excitation based on character class
      if (code >= 65 && code <= 90) {
        // Uppercase
        this._smfAxes[12] += 0.01 // power
      } else if (code >= 97 && code <= 122) {
        // Lowercase
        this._smfAxes[6] += 0.01 // harmony
      } else if (code >= 48 && code <= 57) {
        // Digit
        this._smfAxes[3] += 0.01 // structure
      }
    }

    // Normalize SMF
    let smfNorm = 0
    for (let i = 0; i < 16; i++) {
      smfNorm += this._smfAxes[i] * this._smfAxes[i]
    }
    smfNorm = Math.sqrt(smfNorm)
    if (smfNorm > 1e-10) {
      for (let i = 0; i < 16; i++) {
        this._smfAxes[i] /= smfNorm
      }
    }

    return {
      coherence: this._coherence,
      entropy: this._entropy,
      smfAxes: this._smfAxes.slice(),
    }
  }

  /**
   * Excite an oscillator
   * @param {number} index - Oscillator index
   * @param {number} amplitude - Excitation amplitude
   */
  exciteOscillator(index, amplitude = 0.5) {
    if (index >= 0 && index < this._amplitudes.length) {
      this._amplitudes[index] += amplitude
    }
  }

  /**
   * Get current coherence
   */
  getCoherence() {
    return this._coherence
  }

  /**
   * Get current entropy
   */
  getEntropy() {
    return this._entropy
  }

  /**
   * Get oscillator phases
   */
  getPhases() {
    return this._phases
  }

  /**
   * Get oscillator amplitudes
   */
  getAmplitudes() {
    return this._amplitudes
  }

  /**
   * Get SMF axes
   */
  getSMFAxes() {
    return this._smfAxes
  }

  /**
   * Get dominant SMF axes
   * @param {number} n - Number of axes
   */
  getDominantAxes(n = 3) {
    const SMF_NAMES = [
      'coherence',
      'identity',
      'duality',
      'structure',
      'change',
      'life',
      'harmony',
      'wisdom',
      'infinity',
      'creation',
      'truth',
      'love',
      'power',
      'time',
      'space',
      'consciousness',
    ]

    const indexed = []
    for (let i = 0; i < 16; i++) {
      indexed.push({
        index: i,
        name: SMF_NAMES[i],
        value: this._smfAxes[i],
        absValue: Math.abs(this._smfAxes[i]),
      })
    }

    indexed.sort((a, b) => b.absValue - a.absValue)
    return indexed.slice(0, n)
  }

  /**
   * Reset the pipeline
   */
  reset() {
    this._phases.fill(0)
    this._amplitudes.fill(0)
    this._smfAxes.fill(0)
    this._smfAxes[0] = 1.0
    this._coherence = 1.0
    this._entropy = 0.0

    if (this.ready && this.wasmExports.reset) {
      this.wasmExports.reset(this.pipelinePtr)
    }
  }

  /**
   * Get state as JSON
   */
  toJSON() {
    return {
      coherence: this._coherence,
      entropy: this._entropy,
      smfAxes: [...this._smfAxes],
      dominantAxes: this.getDominantAxes(3).map((a) => a.name),
      phases: [...this._phases],
      amplitudes: [...this._amplitudes],
      ready: this.ready,
    }
  }
}

/**
 * ResolangSMF - WASM-backed Sedenion Memory Field
 */
class ResolangSMF {
  /**
   * Create a new ResolangSMF
   * @param {Float64Array|Array} components - Initial components
   */
  constructor(components = null) {
    this.wasmExports = loader.isLoaded() ? loader.getExports() : null
    this.smfPtr = null

    // Local state
    if (components) {
      this.s = components instanceof Float64Array ? components : Float64Array.from(components)
    } else {
      this.s = new Float64Array(16)
      this.s[0] = 1.0
    }

    this.normalize()
  }

  /**
   * Normalize to unit magnitude
   */
  normalize(epsilon = 1e-10) {
    let sum = 0
    for (let k = 0; k < 16; k++) {
      sum += this.s[k] * this.s[k]
    }
    const n = Math.sqrt(sum)
    const denom = Math.max(n, epsilon)
    for (let k = 0; k < 16; k++) {
      this.s[k] /= denom
    }
    return this
  }

  /**
   * Get axis value
   * @param {number|string} axis - Axis index or name
   */
  get(axis) {
    const AXIS_INDEX = {
      coherence: 0,
      identity: 1,
      duality: 2,
      structure: 3,
      change: 4,
      life: 5,
      harmony: 6,
      wisdom: 7,
      infinity: 8,
      creation: 9,
      truth: 10,
      love: 11,
      power: 12,
      time: 13,
      space: 14,
      consciousness: 15,
    }
    const idx = typeof axis === 'string' ? AXIS_INDEX[axis] : axis
    return this.s[idx]
  }

  /**
   * Set axis value
   * @param {number|string} axis - Axis index or name
   * @param {number} value - Value to set
   */
  set(axis, value) {
    const AXIS_INDEX = {
      coherence: 0,
      identity: 1,
      duality: 2,
      structure: 3,
      change: 4,
      life: 5,
      harmony: 6,
      wisdom: 7,
      infinity: 8,
      creation: 9,
      truth: 10,
      love: 11,
      power: 12,
      time: 13,
      space: 14,
      consciousness: 15,
    }
    const idx = typeof axis === 'string' ? AXIS_INDEX[axis] : axis
    this.s[idx] = value
    return this
  }

  /**
   * Compute norm
   */
  norm() {
    let sum = 0
    for (let k = 0; k < 16; k++) {
      sum += this.s[k] * this.s[k]
    }
    return Math.sqrt(sum)
  }

  /**
   * Compute entropy
   */
  entropy(epsilon = 1e-10) {
    let normSum = 0
    for (let k = 0; k < 16; k++) {
      normSum += Math.abs(this.s[k])
    }

    if (normSum < epsilon) return 0

    let H = 0
    for (let k = 0; k < 16; k++) {
      const pi = Math.abs(this.s[k]) / normSum
      if (pi > epsilon) {
        H -= pi * Math.log(pi + epsilon)
      }
    }
    return H
  }

  /**
   * Dot product
   */
  dot(other) {
    let sum = 0
    for (let k = 0; k < 16; k++) {
      sum += this.s[k] * other.s[k]
    }
    return sum
  }

  /**
   * Coherence with another SMF
   */
  coherence(other) {
    const d = this.dot(other)
    const n1 = this.norm()
    const n2 = other.norm()
    return n1 > 1e-10 && n2 > 1e-10 ? d / (n1 * n2) : 0
  }

  /**
   * Get dominant axes
   */
  dominantAxes(n = 3) {
    const SMF_NAMES = [
      'coherence',
      'identity',
      'duality',
      'structure',
      'change',
      'life',
      'harmony',
      'wisdom',
      'infinity',
      'creation',
      'truth',
      'love',
      'power',
      'time',
      'space',
      'consciousness',
    ]

    const indexed = []
    for (let k = 0; k < 16; k++) {
      indexed.push({
        index: k,
        name: SMF_NAMES[k],
        value: this.s[k],
        absValue: Math.abs(this.s[k]),
      })
    }

    indexed.sort((a, b) => b.absValue - a.absValue)
    return indexed.slice(0, n)
  }

  /**
   * Clone
   */
  clone() {
    return new ResolangSMF(Float64Array.from(this.s))
  }

  /**
   * To JSON
   */
  toJSON() {
    return {
      axes: this.toObject(),
      norm: this.norm(),
      entropy: this.entropy(),
      dominant: this.dominantAxes(3).map((a) => a.name),
    }
  }

  /**
   * To object with named axes
   */
  toObject() {
    const SMF_NAMES = [
      'coherence',
      'identity',
      'duality',
      'structure',
      'change',
      'life',
      'harmony',
      'wisdom',
      'infinity',
      'creation',
      'truth',
      'love',
      'power',
      'time',
      'space',
      'consciousness',
    ]
    const obj = {}
    for (let k = 0; k < 16; k++) {
      obj[SMF_NAMES[k]] = this.s[k]
    }
    return obj
  }
}

/**
 * Initialize resolang
 */
async function initResolang() {
  return loader.load()
}

/**
 * Create a WASM-backed pipeline
 * @param {Object} options - Pipeline options
 */
async function createPipeline(options = {}) {
  const pipeline = new ResolangPipeline(options)
  await pipeline.initialize()
  return pipeline
}

module.exports = {
  ResolangLoader,
  ResolangPipeline,
  ResolangSMF,
  initResolang,
  createPipeline,
  loader,
}
