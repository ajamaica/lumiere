/**
 * Waveform Analyzer
 *
 * Analyzes quantum waveforms to identify resonance patterns and
 * potential prime candidates.
 */

const { calculateWaveform, isPrime } = require('./math')

class WaveformAnalyzer {
  constructor() {
    this.resonanceThreshold = 0.7 // Threshold for identifying resonance
  }

  /**
   * Analyze a range of numbers for quantum resonance.
   *
   * @param {number} start - Start of range
   * @param {number} end - End of range
   * @param {number} step - Step size (default 1)
   * @returns {Array<{x: number, resonance: number, isPrime: boolean}>} Analysis results
   */
  analyzeRange(start, end, step = 1) {
    const results = []
    for (let x = start; x <= end; x += step) {
      const waveform = calculateWaveform(x)
      // Normalize waveform to [0, 1] range roughly for resonance score
      // The max amplitude with 20 zeros is around 20, but typically much lower
      const resonance = this.calculateResonance(waveform)

      if (resonance > this.resonanceThreshold) {
        results.push({
          x: x,
          resonance: resonance,
          isPrime: isPrime(Math.round(x)),
          waveform: waveform,
        })
      }
    }
    return results
  }

  /**
   * Calculate a resonance score from raw waveform amplitude.
   * Higher amplitude (negative) typically correlates with primes in the explicit formula,
   * but here we look for signal strength.
   */
  calculateResonance(amplitude) {
    // In Riemann explicit formula, primes correspond to spikes in the density function.
    // The waveform ψ(x) has local minima at prime powers.
    // We use a simplified metric here: absolute amplitude relative to a baseline.
    return Math.min(1, Math.abs(amplitude) / 10)
  }

  /**
   * Find peaks in the waveform which might correspond to prime locations.
   */
  findPeaks(data) {
    const peaks = []
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i].y < data[i - 1].y && data[i].y < data[i + 1].y) {
        // Local minimum (because primes appear as negative spikes in some formulations)
        peaks.push(data[i])
      }
    }
    return peaks
  }
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WaveformAnalyzer }
}
