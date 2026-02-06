/**
 * Sensory System - Orchestrates all 7 senses
 *
 * Manages sense readings, aggregation, anomaly detection,
 * and formatting for system prompt injection.
 */

const { Sense } = require('./base')
const { ChronoSense } = require('./chrono')
const { ProprioSense } = require('./proprio')
const { FilesystemSense } = require('./filesystem')
const { GitSense } = require('./git')
const { ProcessSense } = require('./process')
const { NetworkSense } = require('./network')
const { UserSense } = require('./user')
const { SightSense } = require('./sight')

class SensorySystem {
  constructor(options = {}) {
    this.basePath = options.basePath || process.cwd()
    this.observer = options.observer || null

    // Initialize all senses
    this.senses = {
      chrono: new ChronoSense(),
      proprio: new ProprioSense({ observer: this.observer }),
      filesystem: new FilesystemSense({ focus: this.basePath }),
      git: new GitSense({ focus: this.basePath }),
      process: new ProcessSense(),
      network: new NetworkSense({ llmUrl: options.llmUrl }),
      user: new UserSense(),
      sight: new SightSense(this.observer),
    }

    // Last full reading
    this.lastReading = null
    this.lastReadTime = 0
    this.readingCache = 5000 // 5 second cache
  }

  /**
   * Link to the SentientObserver instance
   */
  setObserver(observer) {
    this.observer = observer
    this.senses.proprio.setObserver(observer)
  }

  /**
   * Get a specific sense
   */
  getSense(name) {
    return this.senses[name]
  }

  /**
   * Read all senses
   */
  async read(forceRefresh = false) {
    const now = Date.now()

    // Return cached reading if fresh
    if (!forceRefresh && this.lastReading && now - this.lastReadTime < this.readingCache) {
      return this.lastReading
    }

    const readings = {}
    const anomalies = []

    // Read all enabled senses
    for (const [name, sense] of Object.entries(this.senses)) {
      const senseData = await sense.getReading(forceRefresh)
      readings[name] = senseData

      // Collect anomalies
      if (senseData.reading) {
        const senseAnomalies = sense.getAnomalies(senseData.reading)
        anomalies.push(...senseAnomalies)
      }
    }

    // Sort anomalies by salience
    anomalies.sort((a, b) => b.salience - a.salience)

    this.lastReading = {
      timestamp: now,
      readings,
      anomalies: anomalies.slice(0, 5), // Top 5 anomalies
    }
    this.lastReadTime = now

    return this.lastReading
  }

  /**
   * Record user input (updates chrono and user senses)
   */
  recordUserInput(text) {
    this.senses.chrono.recordInput()
    this.senses.user.recordInput(text)
  }

  /**
   * Record agent response
   */
  recordResponse(text) {
    this.senses.user.recordResponse(text)
  }

  /**
   * Record coherence moment
   */
  recordMoment() {
    this.senses.chrono.recordMoment()
  }

  /**
   * Record LLM call
   */
  recordLLMCall(latencyMs, tokensIn = 0, tokensOut = 0) {
    this.senses.network.recordCall(latencyMs, tokensIn, tokensOut)
  }

  /**
   * Record LLM error
   */
  recordLLMError(error) {
    this.senses.network.recordError(error)
  }

  /**
   * Update LLM connection info
   */
  setLLMInfo(url, model, connected) {
    this.senses.network.setLLMInfo(url, model, connected)
  }

  /**
   * Set focus for a specific sense
   */
  setFocus(senseName, target) {
    const sense = this.senses[senseName]
    if (sense) {
      sense.setFocus(target)
      return true
    }
    return false
  }

  /**
   * Set aperture for a specific sense
   */
  setAperture(senseName, level) {
    const sense = this.senses[senseName]
    if (sense) {
      sense.setAperture(level)
      return true
    }
    return false
  }

  /**
   * Enable/disable a specific sense
   */
  setSenseEnabled(senseName, enabled) {
    const sense = this.senses[senseName]
    if (sense) {
      sense.setEnabled(enabled)
      return true
    }
    return false
  }

  /**
   * Format all sense readings for system prompt injection
   */
  async formatForPrompt(options = {}) {
    const reading = await this.read(options.forceRefresh)
    const lines = []

    lines.push('## Current Senses\n')

    // Add each sense's formatted output
    for (const [name, sense] of Object.entries(this.senses)) {
      const senseData = reading.readings[name]
      if (senseData && !senseData.error && senseData.enabled !== false) {
        lines.push(sense.formatForPrompt(senseData))
      }
    }

    // Add anomalies if any
    if (reading.anomalies.length > 0) {
      lines.push('')
      for (const anomaly of reading.anomalies) {
        lines.push(`⚠️ ${anomaly.sense}: ${anomaly.message}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Get a compact one-liner for status display
   */
  async getStatusLine() {
    const reading = await this.read()
    const r = reading.readings

    const parts = []

    // Coherence/entropy from proprio
    if (r.proprio?.reading) {
      const p = r.proprio.reading
      parts.push(`C=${p.coherence.toFixed(2)}`)
      parts.push(`H=${p.entropy.toFixed(2)}`)
    }

    // Idle time from user
    if (r.user?.reading) {
      const u = r.user.reading
      if (u.idleDuration < 60000) {
        parts.push(`idle=${Math.floor(u.idleDuration / 1000)}s`)
      } else {
        parts.push(`idle=${Math.floor(u.idleDuration / 60000)}m`)
      }
    }

    // Git status
    if (r.git?.reading?.isDirty) {
      parts.push('git:dirty')
    }

    // Anomaly count
    if (reading.anomalies.length > 0) {
      parts.push(`⚠️${reading.anomalies.length}`)
    }

    return parts.join(' | ')
  }

  /**
   * Get sense configuration
   */
  getConfig() {
    const config = {}
    for (const [name, sense] of Object.entries(this.senses)) {
      config[name] = {
        enabled: sense.enabled,
        focus: sense.focus,
        aperture: sense.aperture,
        refreshRate: sense.refreshRate,
      }
    }
    return config
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      basePath: this.basePath,
      config: this.getConfig(),
      lastReading: this.lastReading,
    }
  }
}

module.exports = {
  SensorySystem,
  Sense,
  ChronoSense,
  ProprioSense,
  FilesystemSense,
  GitSense,
  ProcessSense,
  NetworkSense,
  UserSense,
  SightSense,
}
