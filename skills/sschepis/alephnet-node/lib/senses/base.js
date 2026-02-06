/**
 * Base Sense Class
 *
 * Abstract base class for all senses in the Sentient Observer.
 * Each sense has a focus (where it looks), aperture (scope), and salience computation.
 */

class Sense {
  static APERTURES = ['narrow', 'medium', 'wide']

  constructor(options = {}) {
    this.name = options.name || 'unnamed'
    this.focus = options.focus || null
    this.aperture = options.aperture || 'medium'
    this.refreshRate = options.refreshRate || 5000 // ms
    this.salienceThreshold = options.salienceThreshold || 0.3
    this.enabled = options.enabled !== false

    // Caching
    this.lastReading = null
    this.lastReadTime = 0
    this.baseline = null
    this.history = []
    this.maxHistory = 10
  }

  /**
   * Read the sense - to be overridden by subclasses
   */
  async read() {
    throw new Error('Sense.read() must be implemented by subclass')
  }

  /**
   * Get a reading, using cache if fresh
   */
  async getReading(forceRefresh = false) {
    if (!this.enabled) {
      return { sense: this.name, enabled: false, reading: null, salience: 0 }
    }

    const now = Date.now()
    const cacheAge = now - this.lastReadTime

    if (!forceRefresh && this.lastReading && cacheAge < this.refreshRate) {
      return this.lastReading
    }

    try {
      const reading = await this.read()
      const salience = this.computeSalience(reading)

      this.lastReading = {
        sense: this.name,
        focus: this.focus,
        aperture: this.aperture,
        reading,
        salience,
        timestamp: now,
      }
      this.lastReadTime = now

      // Update history
      this.history.push({ reading, salience, timestamp: now })
      if (this.history.length > this.maxHistory) {
        this.history.shift()
      }

      // Update baseline
      this.updateBaseline(reading)

      return this.lastReading
    } catch (error) {
      return {
        sense: this.name,
        error: error.message,
        salience: 0.5, // Errors are somewhat salient
        timestamp: now,
      }
    }
  }

  /**
   * Compute salience based on deviation, change rate, and anomalies
   */
  computeSalience(reading) {
    if (!this.baseline) {
      return 0.5 // No baseline yet, medium salience
    }

    const deviation = this.measureDeviation(reading)
    const rateOfChange = this.measureChangeRate(reading)
    const anomalyScore = this.detectAnomalies(reading)

    return Math.min(1, Math.max(0, deviation * 0.4 + rateOfChange * 0.3 + anomalyScore * 0.3))
  }

  /**
   * Measure how much reading deviates from baseline
   */
  measureDeviation(reading) {
    // Override in subclasses for sense-specific logic
    return 0.3
  }

  /**
   * Measure rate of change from previous readings
   */
  measureChangeRate(reading) {
    if (this.history.length < 2) return 0

    // Override in subclasses for sense-specific logic
    return 0.2
  }

  /**
   * Detect anomalous patterns
   */
  detectAnomalies(reading) {
    // Override in subclasses for sense-specific logic
    return 0
  }

  /**
   * Update baseline from reading
   */
  updateBaseline(reading) {
    if (!this.baseline) {
      this.baseline = reading
    }
    // Override in subclasses for exponential moving average, etc.
  }

  /**
   * Set the focus (where this sense looks)
   */
  setFocus(target) {
    this.focus = target
    this.lastReading = null // Invalidate cache
    this.lastReadTime = 0
  }

  /**
   * Set aperture (scope of observation)
   */
  setAperture(level) {
    if (Sense.APERTURES.includes(level)) {
      this.aperture = level
      this.lastReading = null
      this.lastReadTime = 0
    }
  }

  /**
   * Enable/disable this sense
   */
  setEnabled(enabled) {
    this.enabled = enabled
  }

  /**
   * Get a compact string representation for prompt injection
   */
  formatForPrompt(reading) {
    // Override in subclasses
    return `${this.name}: [no data]`
  }

  /**
   * Get anomalies from this sense
   */
  getAnomalies(reading) {
    return [] // Override in subclasses
  }
}

module.exports = { Sense }
