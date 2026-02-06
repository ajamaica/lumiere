/**
 * Sight Sense
 *
 * Processes visual input from the client camera.
 * Calculates visual entropy and integrates it into the observer's state.
 */

const { Sense } = require('./base')

class SightSense extends Sense {
  constructor(observer) {
    super('sight', observer)
    this.lastFrameTime = 0
    this.currentEntropy = 0
    this.currentDescription = ''
    this.isActive = false
  }

  /**
   * Process a visual frame
   * @param {Object} frameData - { entropy, timestamp, description? }
   */
  processFrame(frameData) {
    this.lastFrameTime = frameData.timestamp || Date.now()
    this.currentEntropy = frameData.entropy || 0
    this.isActive = true

    // If we have a description (from client-side analysis or server-side vision model),
    // we can integrate it semantically
    if (frameData.description && frameData.description !== this.currentDescription) {
      this.currentDescription = frameData.description
      this.log(`Visual input: ${this.currentDescription}`)

      // Inject into observer if available
      if (this.observer && typeof this.observer.processText === 'function') {
        // Prefix to distinguish from direct user chat
        this.observer.processText(`[Visual Input] ${this.currentDescription}`)
      }
    }

    // Inject entropy directly into the PRSC system if available
    if (this.observer && this.observer.prsc) {
      // Visual entropy contributes to system energy/noise
      // We inject it as random excitation or coupling modulation

      // Map 0-1 visual entropy to system influence
      const influence = this.currentEntropy * 0.2 // Cap influence

      if (influence > 0.05) {
        // Excite random oscillators based on entropy level
        const numOscillators = Math.floor(this.observer.prsc.oscillators.length * influence)
        const randomIndices = Array.from({ length: numOscillators }, () =>
          Math.floor(Math.random() * this.observer.prsc.oscillators.length),
        )

        // Get primes for these indices
        const primes = randomIndices.map((idx) => this.observer.prsc.oscillators[idx].prime)

        // Excite them
        this.observer.prsc.excite(primes, influence)
      }
    }
  }

  /**
   * Get current reading
   */
  read() {
    // Check if signal is stale (no frames for 5 seconds)
    if (Date.now() - this.lastFrameTime > 5000) {
      this.isActive = false
      this.currentEntropy = 0
    }

    return {
      active: this.isActive,
      entropy: this.currentEntropy,
      description: this.currentDescription,
      lastUpdate: this.lastFrameTime,
    }
  }

  /**
   * Get status summary
   */
  getSummary() {
    if (!this.isActive) return 'Inactive'
    return `E=${this.currentEntropy.toFixed(2)} ${this.currentDescription ? 'Analyzing...' : 'Seeing'}`
  }
}

module.exports = { SightSense }
