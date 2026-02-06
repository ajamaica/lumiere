/**
 * Boundary Layer
 *
 * Re-exports from @aleph-ai/tinyaleph npm library.
 * Uses async loading since tinyaleph is an ESM package.
 *
 * @module @sschepis/alephnet-node/lib/boundary
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
    console.warn('[Boundary] Failed to load @aleph-ai/tinyaleph:', err.message)
    return null
  })

// Fallback implementation
class BoundaryLayerFallback {
  constructor(options = {}) {
    this.boundaries = new Map()
    this.defaultPermeability = options.defaultPermeability || 0.5
  }

  defineBoundary(name, config = {}) {
    this.boundaries.set(name, {
      name,
      permeability: config.permeability || this.defaultPermeability,
      filter: config.filter || (() => true),
      timestamp: Date.now(),
    })
  }

  getBoundary(name) {
    return this.boundaries.get(name) || null
  }

  canPass(name, data) {
    const boundary = this.getBoundary(name)
    if (!boundary) return true
    return Math.random() < boundary.permeability && boundary.filter(data)
  }

  setPermeability(name, permeability) {
    const boundary = this.getBoundary(name)
    if (boundary) {
      boundary.permeability = Math.max(0, Math.min(1, permeability))
    }
  }

  listBoundaries() {
    return [...this.boundaries.keys()]
  }
}

// Export getters that use the loaded module or fallbacks
module.exports = {
  // Async getter for when you need the full module
  getTinyaleph: () => tinyalephPromise,

  get BoundaryLayer() {
    return tinyalephModule?.BoundaryLayer || BoundaryLayerFallback
  },

  get createBoundaryLayer() {
    return tinyalephModule?.createBoundaryLayer || ((options) => new BoundaryLayerFallback(options))
  },

  // Fallback export
  BoundaryLayerFallback,
}
