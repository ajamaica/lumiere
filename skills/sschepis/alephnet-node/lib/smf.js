/**
 * Sedenion Memory Field (SMF)
 *
 * Re-exports from @aleph-ai/tinyaleph npm library.
 * Uses async loading since tinyaleph is an ESM package.
 *
 * @module @sschepis/alephnet-node/lib/smf
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
    console.warn('[SMF] Failed to load @aleph-ai/tinyaleph:', err.message)
    return null
  })

// Synchronous fallback implementations
const SMF_AXES = [
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

const AXIS_INDEX = {}
SMF_AXES.forEach((name, idx) => (AXIS_INDEX[name] = idx))

/**
 * Fallback SedenionMemoryField class
 */
class SedenionMemoryFieldFallback {
  constructor(s = null) {
    this.s = s ? Float64Array.from(s) : new Float64Array(16)
    if (!s) this.s[0] = 1.0
  }

  get(axis) {
    const idx = typeof axis === 'string' ? AXIS_INDEX[axis] : axis
    return this.s[idx] || 0
  }

  set(axis, value) {
    const idx = typeof axis === 'string' ? AXIS_INDEX[axis] : axis
    this.s[idx] = value
    return this
  }

  norm() {
    let sum = 0
    for (let i = 0; i < 16; i++) sum += this.s[i] * this.s[i]
    return Math.sqrt(sum)
  }

  normalize(epsilon = 1e-10) {
    const n = Math.max(this.norm(), epsilon)
    for (let i = 0; i < 16; i++) this.s[i] /= n
    return this
  }

  clone() {
    return new SedenionMemoryFieldFallback(this.s)
  }

  toArray() {
    return [...this.s]
  }
}

// Export getters that use the loaded module or fallbacks
module.exports = {
  // Async getter for when you need the full module
  getTinyaleph: () => tinyalephPromise,

  // Direct accessors - use tinyaleph if loaded, otherwise fallback
  get SedenionMemoryField() {
    return tinyalephModule?.SedenionMemoryField || SedenionMemoryFieldFallback
  },

  get SMF_AXES() {
    return tinyalephModule?.SMF_AXES || SMF_AXES
  },

  get AXIS_INDEX() {
    return tinyalephModule?.AXIS_INDEX || AXIS_INDEX
  },

  get SMF_CODEBOOK() {
    return tinyalephModule?.SMF_CODEBOOK || []
  },

  get CODEBOOK_SIZE() {
    return tinyalephModule?.CODEBOOK_SIZE || 0
  },

  get nearestCodebookAttractor() {
    return tinyalephModule?.nearestCodebookAttractor || (() => null)
  },

  get codebookTunnel() {
    return tinyalephModule?.codebookTunnel || ((smf) => smf)
  },

  get getTunnelingCandidates() {
    return tinyalephModule?.getTunnelingCandidates || (() => [])
  },

  get smf() {
    return tinyalephModule?.smf || null
  },

  // Fallback class export for direct use
  SedenionMemoryFieldFallback,
}
