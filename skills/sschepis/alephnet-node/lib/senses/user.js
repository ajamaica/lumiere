/**
 * User Presence Sense - Social Awareness
 *
 * Awareness of user engagement:
 * - Idle time since last input
 * - Input frequency and rhythm
 * - Engagement level estimate
 * - Conversation metrics
 */

const { Sense } = require('./base')

class UserSense extends Sense {
  constructor(options = {}) {
    super({ name: 'user', ...options })
    this.refreshRate = 2000 // 2 seconds

    // Tracking
    this.sessionStart = Date.now()
    this.inputs = [] // Array of { time, length }
    this.responses = [] // Array of { time, length }
    this.lastInputTime = Date.now()
  }

  /**
   * Record user input
   */
  recordInput(text) {
    const now = Date.now()
    this.inputs.push({ time: now, length: text.length })
    this.lastInputTime = now

    // Keep only last 50 inputs
    if (this.inputs.length > 50) {
      this.inputs = this.inputs.slice(-50)
    }
  }

  /**
   * Record agent response
   */
  recordResponse(text) {
    this.responses.push({ time: Date.now(), length: text.length })

    if (this.responses.length > 50) {
      this.responses = this.responses.slice(-50)
    }
  }

  /**
   * Calculate average interval between inputs
   */
  getAverageInputInterval() {
    if (this.inputs.length < 2) return 0

    let totalInterval = 0
    for (let i = 1; i < this.inputs.length; i++) {
      totalInterval += this.inputs[i].time - this.inputs[i - 1].time
    }
    return totalInterval / (this.inputs.length - 1)
  }

  /**
   * Calculate recent input rate relative to average
   */
  getRecentInputRate() {
    const avgInterval = this.getAverageInputInterval()
    if (avgInterval === 0 || this.inputs.length < 3) return 1.0

    // Compare last 3 inputs to average
    const recentInputs = this.inputs.slice(-3)
    if (recentInputs.length < 2) return 1.0

    let recentInterval = 0
    for (let i = 1; i < recentInputs.length; i++) {
      recentInterval += recentInputs[i].time - recentInputs[i - 1].time
    }
    recentInterval /= recentInputs.length - 1

    // Rate > 1 means faster than average
    return avgInterval / recentInterval
  }

  /**
   * Estimate engagement level
   */
  getEngagementLevel() {
    const idleTime = Date.now() - this.lastInputTime
    const inputRate = this.getRecentInputRate()
    const avgLength =
      this.inputs.length > 0
        ? this.inputs.reduce((s, i) => s + i.length, 0) / this.inputs.length
        : 0

    // Long idle = low engagement
    if (idleTime > 600000) return 'idle' // 10 min
    if (idleTime > 300000) return 'low' // 5 min

    // High input rate + long messages = high engagement
    if (inputRate > 1.2 && avgLength > 100) return 'high'
    if (inputRate > 0.8 || avgLength > 50) return 'medium'

    return 'medium'
  }

  async read() {
    const now = Date.now()
    const idleDuration = now - this.lastInputTime
    const avgInterval = this.getAverageInputInterval()
    const recentRate = this.getRecentInputRate()
    const engagement = this.getEngagementLevel()

    const avgInputLength =
      this.inputs.length > 0
        ? this.inputs.reduce((s, i) => s + i.length, 0) / this.inputs.length
        : 0

    const avgResponseLength =
      this.responses.length > 0
        ? this.responses.reduce((s, r) => s + r.length, 0) / this.responses.length
        : 0

    return {
      isIdle: idleDuration > 120000, // 2 minutes
      idleDuration,
      lastInputTime: new Date(this.lastInputTime).toISOString(),
      inputsThisSession: this.inputs.length,
      avgInputInterval: avgInterval,
      recentInputRate: recentRate,
      engagement,
      conversationTurns: Math.min(this.inputs.length, this.responses.length),
      avgInputLength,
      avgResponseLength,
      sessionDuration: now - this.sessionStart,
    }
  }

  measureDeviation(reading) {
    let deviation = 0

    // Long idle is notable
    if (reading.idleDuration > 300000) deviation += 0.4
    if (reading.idleDuration > 600000) deviation += 0.3

    // Very fast or slow input rate
    if (reading.recentInputRate > 2.0) deviation += 0.3
    if (reading.recentInputRate < 0.3) deviation += 0.2

    return Math.min(1, deviation)
  }

  getAnomalies(reading) {
    const anomalies = []

    if (reading.engagement === 'idle') {
      anomalies.push({
        sense: 'user',
        type: 'user_idle',
        message: `User idle for ${Math.floor(reading.idleDuration / 60000)} minutes`,
        salience: 0.6,
      })
    }

    if (reading.recentInputRate > 3.0 && reading.inputsThisSession > 5) {
      anomalies.push({
        sense: 'user',
        type: 'rapid_input',
        message: 'Unusually rapid user input',
        salience: 0.5,
      })
    }

    return anomalies
  }

  formatForPrompt(senseData) {
    const r = senseData.reading
    if (!r) return 'User: [unavailable]'

    const formatDuration = (ms) => {
      if (ms < 60000) return `${Math.floor(ms / 1000)}s`
      return `${Math.floor(ms / 60000)}m`
    }

    const status = r.isIdle ? `Idle ${formatDuration(r.idleDuration)}` : 'Active'
    const engagement = r.engagement.charAt(0).toUpperCase() + r.engagement.slice(1)
    const turns = r.conversationTurns

    return `**User**: ${status} | ${engagement} engagement | ${turns} turns`
  }
}

module.exports = { UserSense }
