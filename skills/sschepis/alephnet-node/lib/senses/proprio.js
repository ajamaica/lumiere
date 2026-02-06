/**
 * Proprioceptive Sense - Self-State Awareness
 *
 * Internal awareness of the observer's cognitive state:
 * - Coherence and entropy levels
 * - Memory load
 * - Active goals and attention
 * - SMF orientation summary
 */

const { Sense } = require('./base')

class ProprioSense extends Sense {
  constructor(options = {}) {
    super({ name: 'proprio', ...options })
    this.observer = options.observer || null
    this.refreshRate = 2000
  }

  /**
   * Link to the SentientObserver instance
   */
  setObserver(observer) {
    this.observer = observer
  }

  async read() {
    if (!this.observer) {
      return {
        coherence: 0,
        entropy: 0.5,
        memoryLoad: 0,
        activeGoals: 0,
        attentionFoci: 0,
        smfSummary: null,
        momentCount: 0,
        processingLoad: 0,
      }
    }

    // Get state from observer
    const state = this.observer.currentState || {}
    const prsc = this.observer.prsc
    const smf = this.observer.smf
    const memory = this.observer.memory
    const agency = this.observer.agency
    const temporal = this.observer.temporal

    // SMF summary
    let smfSummary = null
    if (smf) {
      const axes = smf.constructor.AXES || []
      const s = smf.s || []

      // Find dominant axis
      let maxIdx = 0
      let maxVal = 0
      for (let i = 0; i < s.length; i++) {
        if (Math.abs(s[i]) > maxVal) {
          maxVal = Math.abs(s[i])
          maxIdx = i
        }
      }

      // Get top 4 axes
      const indexed = s.map((v, i) => ({ idx: i, val: v, name: axes[i] || `axis${i}` }))
      indexed.sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
      const top4 = indexed.slice(0, 4)

      smfSummary = {
        dominant: axes[maxIdx] || 'unknown',
        dominantValue: s[maxIdx],
        top4: top4.map((x) => ({ name: x.name, value: x.val.toFixed(2) })),
        stability: smf.stability ? smf.stability() : 0.5,
        magnitude: Math.sqrt(s.reduce((sum, v) => sum + v * v, 0)),
      }
    }

    // Memory stats
    const memoryStats = memory ? memory.getStats() : { traceCount: 0, maxTraces: 1000 }
    const memoryLoad =
      memoryStats.maxTraces > 0 ? memoryStats.traceCount / memoryStats.maxTraces : 0

    // Agency stats
    const agencyStats = agency ? agency.getStats() : { activeGoals: 0, attentionFoci: 0 }

    // Temporal stats
    const momentCount = temporal ? temporal.momentCount : 0

    // PRSC stats
    let prscStats = { coherence: 0, energy: 0, activeCount: 0 }
    if (prsc) {
      const coherence = prsc.globalCoherence ? prsc.globalCoherence() : 0
      const energy = prsc.totalEnergy ? prsc.totalEnergy() : 0
      const activeCount = prsc.oscillators
        ? prsc.oscillators.filter((o) => o.amplitude > 0.1).length
        : 0
      prscStats = { coherence, energy, activeCount }
    }

    return {
      coherence: state.coherence || prscStats.coherence,
      entropy: state.entropy || 0.5,
      memoryLoad,
      memoryCount: memoryStats.traceCount,
      activeGoals: agencyStats.activeGoals,
      attentionFoci: agencyStats.attentionFoci || 0,
      smfSummary,
      momentCount,
      prscEnergy: prscStats.energy,
      prscActiveOscillators: prscStats.activeCount,
      processingLoad: state.processingLoad || 0,
    }
  }

  measureDeviation(reading) {
    let deviation = 0

    // Low coherence is notable
    if (reading.coherence < 0.3) deviation += 0.4
    else if (reading.coherence > 0.9) deviation += 0.2 // Very high also notable

    // High entropy is notable
    if (reading.entropy > 0.8) deviation += 0.4

    // High memory load
    if (reading.memoryLoad > 0.8) deviation += 0.3

    return Math.min(1, deviation)
  }

  getAnomalies(reading) {
    const anomalies = []

    if (reading.coherence < 0.2) {
      anomalies.push({
        sense: 'proprio',
        type: 'low_coherence',
        message: `Very low coherence: ${(reading.coherence * 100).toFixed(0)}%`,
        salience: 0.8,
      })
    }

    if (reading.entropy > 0.9) {
      anomalies.push({
        sense: 'proprio',
        type: 'high_entropy',
        message: `High entropy state: ${(reading.entropy * 100).toFixed(0)}%`,
        salience: 0.7,
      })
    }

    if (reading.memoryLoad > 0.9) {
      anomalies.push({
        sense: 'proprio',
        type: 'memory_pressure',
        message: `Memory near capacity: ${(reading.memoryLoad * 100).toFixed(0)}%`,
        salience: 0.8,
      })
    }

    return anomalies
  }

  formatForPrompt(senseData) {
    const r = senseData.reading
    if (!r) return 'Self: [unavailable]'

    const coherence = `C=${r.coherence.toFixed(2)}`
    const entropy = `H=${r.entropy.toFixed(2)}`
    const memory = `Memory: ${(r.memoryLoad * 100).toFixed(0)}%`
    const goals = `Goals: ${r.activeGoals}`
    const smf = r.smfSummary ? `SMF: ${r.smfSummary.dominant}` : ''

    return `**Self**: ${coherence} ${entropy} | ${memory} | ${goals} | ${smf}`
  }
}

module.exports = { ProprioSense }
