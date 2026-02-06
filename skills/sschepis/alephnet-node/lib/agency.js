/**
 * Agency Layer
 *
 * Re-exports from @aleph-ai/tinyaleph npm library.
 * Uses async loading since tinyaleph is an ESM package.
 *
 * @module @sschepis/alephnet-node/lib/agency
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
    console.warn('[Agency] Failed to load @aleph-ai/tinyaleph:', err.message)
    return null
  })

// Fallback implementation
class AgencyLayerFallback {
  constructor(options = {}) {
    this.agencyLevel = options.initialLevel || 0.5
    this.history = []
  }

  setAgencyLevel(level) {
    this.agencyLevel = Math.max(0, Math.min(1, level))
    this.history.push({ level: this.agencyLevel, timestamp: Date.now() })
  }

  getAgencyLevel() {
    return this.agencyLevel
  }

  canAct(threshold = 0.5) {
    return this.agencyLevel >= threshold
  }

  recordAction(action) {
    this.history.push({ action, level: this.agencyLevel, timestamp: Date.now() })
  }

  getHistory() {
    return [...this.history]
  }
}

// Export getters that use the loaded module or fallbacks
module.exports = {
  // Async getter for when you need the full module
  getTinyaleph: () => tinyalephPromise,

  get AgencyLayer() {
    return tinyalephModule?.AgencyLayer || AgencyLayerFallback
  },

  get createAgencyLayer() {
    return tinyalephModule?.createAgencyLayer || ((options) => new AgencyLayerFallback(options))
  },

  // Fallback export
  AgencyLayerFallback,
}
