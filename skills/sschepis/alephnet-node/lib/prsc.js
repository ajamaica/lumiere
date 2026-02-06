/**
 * Prime Resonance Semantic Computation (PRSC)
 *
 * Re-exports from @aleph-ai/tinyaleph npm library.
 * Uses async loading since tinyaleph is an ESM package.
 *
 * @module @sschepis/alephnet-node/lib/prsc
 */

'use strict'

// Lazy-load the ESM module
let tinyalephModule = null
const tinyalephPromise = import('@aleph-ai/tinyaleph')
  .then((m) => {
    tinyalephModule = m
    return m
  })
  .catch((err) => {
    console.warn('[PRSC] Failed to load @aleph-ai/tinyaleph:', err.message)
    return null
  })

// Fallback implementations
class PRSCFallback {
  constructor(options = {}) {
    this.numPrimes = options.numPrimes || 64
    this.phases = new Float64Array(this.numPrimes)
    this.amplitudes = new Float64Array(this.numPrimes)
    this.globalCoherence = 1.0
  }

  excite(index, amplitude = 0.1) {
    if (index >= 0 && index < this.numPrimes) {
      this.amplitudes[index] += amplitude
    }
  }

  tick(dt = 0.016) {
    // Simple phase evolution
    for (let i = 0; i < this.numPrimes; i++) {
      this.phases[i] += dt * (i + 2) * 0.01
      this.amplitudes[i] *= 0.99 // Decay
    }
  }

  getGlobalCoherence() {
    return this.globalCoherence
  }

  reset() {
    this.phases.fill(0)
    this.amplitudes.fill(0)
    this.globalCoherence = 1.0
  }
}

// Export getters that use the loaded module or fallbacks
module.exports = {
  // Async getter for when you need the full module
  getTinyaleph: () => tinyalephPromise,

  get PrimeResonanceSemanticComputation() {
    return tinyalephModule?.PrimeResonanceSemanticComputation || PRSCFallback
  },

  get PRSC() {
    return tinyalephModule?.PRSC || PRSCFallback
  },

  get createPRSC() {
    return tinyalephModule?.createPRSC || ((options) => new PRSCFallback(options))
  },

  // Fallback export
  PRSCFallback,
}
