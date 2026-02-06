/**
 * Safety Layer
 *
 * Re-exports from @aleph-ai/tinyaleph npm library.
 * Uses async loading since tinyaleph is an ESM package.
 *
 * @module @sschepis/alephnet-node/lib/safety
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
    console.warn('[Safety] Failed to load @aleph-ai/tinyaleph:', err.message)
    return null
  })

// Fallback implementation
class SafetyLayerFallback {
  constructor(options = {}) {
    this.rules = []
    this.violations = []
    this.enabled = options.enabled !== false
  }

  addRule(rule) {
    this.rules.push({
      id: `rule_${this.rules.length}`,
      ...rule,
      timestamp: Date.now(),
    })
  }

  check(action, context = {}) {
    if (!this.enabled) return { safe: true, violations: [] }

    const violations = []
    for (const rule of this.rules) {
      if (rule.check && !rule.check(action, context)) {
        violations.push({
          ruleId: rule.id,
          message: rule.message || 'Safety check failed',
          timestamp: Date.now(),
        })
      }
    }

    this.violations.push(...violations)
    return { safe: violations.length === 0, violations }
  }

  getViolations() {
    return [...this.violations]
  }

  clearViolations() {
    this.violations = []
  }

  enable() {
    this.enabled = true
  }
  disable() {
    this.enabled = false
  }
  isEnabled() {
    return this.enabled
  }
}

// Export getters that use the loaded module or fallbacks
module.exports = {
  // Async getter for when you need the full module
  getTinyaleph: () => tinyalephPromise,

  get SafetyLayer() {
    return tinyalephModule?.SafetyLayer || SafetyLayerFallback
  },

  get createSafetyLayer() {
    return tinyalephModule?.createSafetyLayer || ((options) => new SafetyLayerFallback(options))
  },

  // Fallback export
  SafetyLayerFallback,
}
