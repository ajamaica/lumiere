/**
 * Temporal Layer
 *
 * Re-exports from @aleph-ai/tinyaleph npm library.
 * Uses async loading since tinyaleph is an ESM package.
 *
 * @module @sschepis/alephnet-node/lib/temporal
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
    console.warn('[Temporal] Failed to load @aleph-ai/tinyaleph:', err.message)
    return null
  })

// Fallback implementation
class TemporalLayerFallback {
  constructor(options = {}) {
    this.timeline = []
    this.currentTime = 0
    this.timeScale = options.timeScale || 1.0
  }

  tick(dt = 0.016) {
    this.currentTime += dt * this.timeScale
    return this.currentTime
  }

  recordEvent(event) {
    this.timeline.push({
      ...event,
      time: this.currentTime,
      timestamp: Date.now(),
    })
  }

  getTimeline() {
    return [...this.timeline]
  }

  getEventsInRange(start, end) {
    return this.timeline.filter((e) => e.time >= start && e.time <= end)
  }

  getCurrentTime() {
    return this.currentTime
  }

  setTimeScale(scale) {
    this.timeScale = scale
  }

  reset() {
    this.timeline = []
    this.currentTime = 0
  }
}

// Export getters that use the loaded module or fallbacks
module.exports = {
  // Async getter for when you need the full module
  getTinyaleph: () => tinyalephPromise,

  get TemporalLayer() {
    return tinyalephModule?.TemporalLayer || TemporalLayerFallback
  },

  get createTemporalLayer() {
    return tinyalephModule?.createTemporalLayer || ((options) => new TemporalLayerFallback(options))
  },

  // Fallback export
  TemporalLayerFallback,
}
