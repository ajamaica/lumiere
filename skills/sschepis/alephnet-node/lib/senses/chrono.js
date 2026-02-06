/**
 * Chronosense - Temporal Awareness
 *
 * Provides awareness of time in multiple dimensions:
 * - Current time and timezone
 * - Session duration
 * - Idle time since last user input
 * - Circadian context
 */

const { Sense } = require('./base')

class ChronoSense extends Sense {
  constructor(options = {}) {
    super({ name: 'chrono', ...options })
    this.sessionStart = Date.now()
    this.lastInputTime = Date.now()
    this.lastMomentTime = null
    this.refreshRate = 1000 // Update every second
  }

  /**
   * Record user input
   */
  recordInput() {
    this.lastInputTime = Date.now()
  }

  /**
   * Record coherence moment
   */
  recordMoment() {
    this.lastMomentTime = Date.now()
  }

  /**
   * Determine circadian phase based on local hour
   */
  getCircadian(hour) {
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'night'
  }

  /**
   * Get day name
   */
  getDayName(day) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[day]
  }

  async read() {
    const now = new Date()
    const nowMs = now.getTime()

    // Get timezone
    const tzOffset = -now.getTimezoneOffset()
    const tzHours = Math.floor(Math.abs(tzOffset) / 60)
    const tzMins = Math.abs(tzOffset) % 60
    const tzSign = tzOffset >= 0 ? '+' : '-'
    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Format local time
    const localTime = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    return {
      now: now.toISOString(),
      local: localTime,
      timezone: tzName,
      tzOffset: `UTC${tzSign}${tzHours}:${tzMins.toString().padStart(2, '0')}`,
      dayOfWeek: this.getDayName(now.getDay()),
      hour: now.getHours(),
      circadian: this.getCircadian(now.getHours()),
      sessionStart: new Date(this.sessionStart).toISOString(),
      sessionDuration: nowMs - this.sessionStart,
      sinceLastInput: nowMs - this.lastInputTime,
      sinceLastMoment: this.lastMomentTime ? nowMs - this.lastMomentTime : null,
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
    }
  }

  measureDeviation(reading) {
    // High deviation at notable times
    let deviation = 0

    // Midnight transition
    if (reading.hour === 0) deviation += 0.3

    // Circadian transitions
    if (reading.hour === 5 || reading.hour === 12 || reading.hour === 17 || reading.hour === 21) {
      deviation += 0.2
    }

    // Long idle
    if (reading.sinceLastInput > 300000) deviation += 0.3 // 5 min
    if (reading.sinceLastInput > 600000) deviation += 0.2 // 10 min

    // Long session
    if (reading.sessionDuration > 3600000) deviation += 0.2 // 1 hour

    return Math.min(1, deviation)
  }

  detectAnomalies(reading) {
    const anomalies = []

    if (reading.sinceLastInput > 600000) {
      anomalies.push({
        type: 'idle',
        message: `User idle for ${Math.floor(reading.sinceLastInput / 60000)} minutes`,
      })
    }

    if (reading.sessionDuration > 7200000) {
      anomalies.push({
        type: 'long_session',
        message: `Long session: ${Math.floor(reading.sessionDuration / 3600000)}+ hours`,
      })
    }

    if (reading.circadian === 'night') {
      anomalies.push({ type: 'late_hour', message: 'Late night session' })
    }

    return anomalies.length > 0 ? 0.3 : 0
  }

  getAnomalies(reading) {
    const anomalies = []

    if (reading.sinceLastInput > 600000) {
      anomalies.push({
        sense: 'chrono',
        type: 'idle',
        message: `User idle for ${Math.floor(reading.sinceLastInput / 60000)} minutes`,
        salience: 0.6,
      })
    }

    if (reading.circadian === 'night' && reading.sessionDuration > 3600000) {
      anomalies.push({
        sense: 'chrono',
        type: 'late_session',
        message: 'Extended late night session',
        salience: 0.5,
      })
    }

    return anomalies
  }

  formatForPrompt(senseData) {
    const r = senseData.reading
    if (!r) return 'Time: [unavailable]'

    // Format duration
    const formatDuration = (ms) => {
      if (ms < 60000) return `${Math.floor(ms / 1000)}s`
      if (ms < 3600000) return `${Math.floor(ms / 60000)}m`
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      return `${h}h ${m}m`
    }

    const day = r.dayOfWeek.slice(0, 3)
    const time = r.local.split(', ')[1] || r.local
    const idle = formatDuration(r.sinceLastInput)
    const session = formatDuration(r.sessionDuration)

    return `**Time**: ${day} ${time} ${r.tzOffset} | Session: ${session} | Idle: ${idle} | ${r.circadian}`
  }
}

module.exports = { ChronoSense }
