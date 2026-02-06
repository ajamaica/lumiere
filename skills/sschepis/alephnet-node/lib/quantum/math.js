/**
 * Quantum Math Utilities
 *
 * Implements core mathematical functions for the Quantum Framework,
 * specifically focusing on Riemann Zeta function zeros and waveform generation.
 */

// First 20 non-trivial Riemann Zeta zeros (imaginary part gamma_n)
// These are the critical frequencies for the prime number distribution
const RIEMANN_ZEROS = [
  14.134725, 21.02204, 25.010857, 30.424876, 32.935061, 37.586178, 40.918719, 43.327073, 48.00515,
  49.773832, 52.970321, 56.446247, 59.347044, 60.831778, 65.112544, 67.07981, 69.546401, 72.067157,
  75.70469, 77.14484,
]

/**
 * Calculate the Riemann Zeta zero waveform at a specific point x.
 *
 * The waveform is defined as: ψ(x) = Σ cos(γ_n * ln(x))
 * where γ_n are the imaginary parts of the non-trivial zeros.
 *
 * @param {number} x - The input value (typically a number to test for primality)
 * @param {number} numZeros - Number of zeros to use in the summation (default: all available)
 * @returns {number} The waveform amplitude at x
 */
function calculateWaveform(x, numZeros = RIEMANN_ZEROS.length) {
  if (x <= 0) return 0

  const lnX = Math.log(x)
  let sum = 0

  const limit = Math.min(numZeros, RIEMANN_ZEROS.length)
  for (let i = 0; i < limit; i++) {
    sum += Math.cos(RIEMANN_ZEROS[i] * lnX)
  }

  return sum
}

/**
 * Generate a waveform over a range of values.
 *
 * @param {number} start - Start of the range
 * @param {number} end - End of the range
 * @param {number} step - Step size
 * @returns {Array<{x: number, y: number}>} Array of points
 */
function generateWaveformRange(start, end, step = 0.1) {
  const points = []
  for (let x = start; x <= end; x += step) {
    points.push({
      x: x,
      y: calculateWaveform(x),
    })
  }
  return points
}

/**
 * Check if a number is prime using a basic trial division (for validation/labeling).
 *
 * @param {number} n - Number to check
 * @returns {boolean} True if prime
 */
function isPrime(n) {
  if (n <= 1) return false
  if (n <= 3) return true
  if (n % 2 === 0 || n % 3 === 0) return false

  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false
  }
  return true
}

/**
 * Generate training data for the Quantum Neural Network.
 *
 * @param {number} start - Start range
 * @param {number} end - End range
 * @returns {Array<{input: number, output: number, isPrime: boolean}>} Training examples
 */
function generateTrainingData(start, end) {
  const data = []
  for (let x = start; x <= end; x++) {
    data.push({
      input: calculateWaveform(x), // The quantum feature
      output: isPrime(x) ? 1 : 0, // The label
      x: x,
      isPrime: isPrime(x),
    })
  }
  return data
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RIEMANN_ZEROS,
    calculateWaveform,
    generateWaveformRange,
    isPrime,
    generateTrainingData,
  }
}
