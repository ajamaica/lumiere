/**
 * Entanglement Layer
 *
 * Re-exports from @aleph-ai/tinyaleph npm library.
 * Uses async loading since tinyaleph is an ESM package.
 *
 * @module @sschepis/alephnet-node/lib/entanglement
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
    console.warn('[Entanglement] Failed to load @aleph-ai/tinyaleph:', err.message)
    return null
  })

// Fallback implementation
class EntanglementLayerFallback {
  constructor(options = {}) {
    this.pairs = new Map()
    this.coherenceThreshold = options.coherenceThreshold || 0.8
  }

  entangle(id1, id2, strength = 1.0) {
    const key = [id1, id2].sort().join(':')
    this.pairs.set(key, { id1, id2, strength, timestamp: Date.now() })
  }

  getEntanglement(id1, id2) {
    const key = [id1, id2].sort().join(':')
    return this.pairs.get(key) || null
  }

  isEntangled(id1, id2) {
    return this.getEntanglement(id1, id2) !== null
  }

  collapse(id) {
    for (const [key, pair] of this.pairs) {
      if (pair.id1 === id || pair.id2 === id) {
        this.pairs.delete(key)
      }
    }
  }

  getEntangledPairs() {
    return [...this.pairs.values()]
  }
}

// Export getters that use the loaded module or fallbacks
module.exports = {
  // Async getter for when you need the full module
  getTinyaleph: () => tinyalephPromise,

  get EntanglementLayer() {
    return tinyalephModule?.EntanglementLayer || EntanglementLayerFallback
  },

  get createEntanglementLayer() {
    return (
      tinyalephModule?.createEntanglementLayer ||
      ((options) => new EntanglementLayerFallback(options))
    )
  },

  // Fallback export
  EntanglementLayerFallback,
}
