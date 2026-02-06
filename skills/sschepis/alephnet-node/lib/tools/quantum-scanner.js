/**
 * Quantum Scanner Tool
 *
 * Exposes the Quantum Framework capabilities to the Sentient agent system.
 * Allows agents to scan number ranges for prime candidates using
 * Riemann Zeta waveforms and Quantum Neural Network predictions.
 */

const { QuantumNeuralNetwork } = require('../quantum/network')
const { WaveformAnalyzer } = require('../quantum/analyzer')
const { calculateWaveform } = require('../quantum/math')

// Singleton instances to persist state/training
let qnn = null
let analyzer = null

function getQNN() {
  if (!qnn) {
    qnn = new QuantumNeuralNetwork()
    // Pre-train lightly on small primes to initialize meaningful weights
    // In a real scenario, we would load pre-trained weights
    const trainingData = [
      { input: calculateWaveform(2), target: 1 },
      { input: calculateWaveform(3), target: 1 },
      { input: calculateWaveform(4), target: 0 },
      { input: calculateWaveform(5), target: 1 },
      { input: calculateWaveform(6), target: 0 },
      { input: calculateWaveform(7), target: 1 },
      { input: calculateWaveform(8), target: 0 },
      { input: calculateWaveform(9), target: 0 },
      { input: calculateWaveform(10), target: 0 },
    ]

    // Quick training loop
    for (let i = 0; i < 50; i++) {
      for (const ex of trainingData) {
        qnn.train(ex.input, ex.target)
      }
    }
  }
  return qnn
}

function getAnalyzer() {
  if (!analyzer) {
    analyzer = new WaveformAnalyzer()
  }
  return analyzer
}

/**
 * Scan a range of numbers for prime candidates.
 *
 * @param {Object} params - Tool parameters
 * @param {number} params.start - Start of range
 * @param {number} params.end - End of range
 * @returns {Promise<string>} Formatted results
 */
async function scanRange(params) {
  const start = parseInt(params.start) || 100
  const end = parseInt(params.end) || start + 50

  if (end - start > 1000) {
    return 'Range too large. Please limit scans to 1000 integers.'
  }

  const analyzer = getAnalyzer()
  const network = getQNN()

  const candidates = []

  for (let x = start; x <= end; x++) {
    const waveform = calculateWaveform(x)
    const qnnProbability = network.predict(waveform)
    const resonance = analyzer.calculateResonance(waveform)

    // Combined score
    const score = (qnnProbability + resonance) / 2

    if (score > 0.6) {
      candidates.push({
        number: x,
        probability: qnnProbability.toFixed(3),
        resonance: resonance.toFixed(3),
        score: score.toFixed(3),
      })
    }
  }

  // Sort by score
  candidates.sort((a, b) => b.score - a.score)

  if (candidates.length === 0) {
    return `No strong prime candidates found in range [${start}, ${end}].`
  }

  let output = `Quantum Scan Results [${start}, ${end}]:\n\n`
  output += `Found ${candidates.length} candidates:\n`

  for (const c of candidates.slice(0, 10)) {
    output += `- ${c.number}: Score ${c.score} (Prob: ${c.probability}, Res: ${c.resonance})\n`
  }

  if (candidates.length > 10) {
    output += `...and ${candidates.length - 10} more.\n`
  }

  return output
}

/**
 * Predict if a specific number is prime.
 *
 * @param {Object} params - Tool parameters
 * @param {number} params.number - Number to check
 * @returns {Promise<string>} Prediction result
 */
async function predictPrime(params) {
  const num = parseInt(params.number)
  if (!num) return 'Please provide a valid number.'

  const network = getQNN()
  const waveform = calculateWaveform(num)
  const probability = network.predict(waveform)

  const isLikely = probability > 0.5
  const confidence = Math.abs(probability - 0.5) * 2 * 100 // 0-100%

  return (
    `Quantum Prediction for ${num}:\n` +
    `- Probability: ${probability.toFixed(4)}\n` +
    `- Assessment: ${isLikely ? 'LIKELY PRIME' : 'LIKELY COMPOSITE'}\n` +
    `- Confidence: ${confidence.toFixed(1)}%`
  )
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    scanRange,
    predictPrime,
  }
}
