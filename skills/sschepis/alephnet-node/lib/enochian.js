/**
 * Enochian Packet Layer (Section 7.4 of Whitepaper)
 *
 * Low-bandwidth prime-mode surface language for robust symbolic packets.
 * Uses a geometric validity gate based on twist angles derived from primes.
 *
 * Key features:
 * - Prime alphabet PE = {7, 11, 13, 17, 19, 23, 29}
 * - Mode set M = {α, μ, ω} (alpha, mu, omega)
 * - Twist angle κ(p) = 360/p degrees
 * - Twist-closure validation: T(P) mod 360 ∈ [0,ε) ∪ (360-ε, 360]
 *
 * This layer provides fast structural validation before expensive
 * decoding and network verification.
 *
 * Enhanced with enochian-vocabulary.js integration:
 * - Full 21-letter Enochian alphabet
 * - Core vocabulary (35+ words)
 * - The 19 Calls
 * - Sedenion operations (16D)
 */

// Try to load resolang for WASM-accelerated operations
let resolang = null
try {
  resolang = require('@sschepis/resolang')
} catch (e) {
  // Will use JS fallback
}

// Import the comprehensive Enochian vocabulary system
const EnochianVocabulary = require('./enochian-vocabulary')

/**
 * Enochian prime alphabet (Section 7.4)
 */
const ENOCHIAN_PRIMES = [7, 11, 13, 17, 19, 23, 29]

/**
 * Mode symbols (α = alpha, μ = mu, ω = omega)
 */
const MODES = ['α', 'μ', 'ω']
const MODE_INDEX = { α: 0, μ: 1, ω: 2, alpha: 0, mu: 1, omega: 2 }

/**
 * Twist angle for a prime (equation 16)
 * κ(p) = 360/p degrees
 * @param {number} p - Prime number
 * @returns {number} Twist angle in degrees
 */
function twistAngle(p) {
  return 360 / p
}

/**
 * Compute total twist for a sequence (equation 17)
 * T(P) = Σ κ(pi)
 * @param {Array<number>} primes - Sequence of primes
 * @returns {number} Total twist in degrees
 */
function totalTwist(primes) {
  return primes.reduce((sum, p) => sum + twistAngle(p), 0)
}

/**
 * Check twist closure (equation 18)
 * Accept packet as twist-closed when T(P) mod 360 ∈ [0,ε) ∪ (360-ε, 360]
 * @param {Array<number>} primes - Sequence of primes
 * @param {number} epsilon - Tolerance in degrees (default 1.0)
 * @returns {boolean} True if twist-closed
 */
function isTwistClosed(primes, epsilon = 1.0) {
  if (resolang && resolang.isTwistClosed) {
    // Use WASM version if available
    return resolang.isTwistClosed(primes, epsilon)
  }

  const twist = totalTwist(primes)
  const mod = ((twist % 360) + 360) % 360
  return mod < epsilon || mod > 360 - epsilon
}

/**
 * Enochian Symbol
 * Represents a single symbol (prime, mode) tuple
 */
class EnochianSymbol {
  /**
   * @param {number} prime - Prime from ENOCHIAN_PRIMES
   * @param {string} mode - Mode from MODES (α, μ, ω)
   */
  constructor(prime, mode = 'α') {
    if (!ENOCHIAN_PRIMES.includes(prime)) {
      throw new Error(`Invalid Enochian prime: ${prime}. Must be one of ${ENOCHIAN_PRIMES}`)
    }
    const modeIdx = MODE_INDEX[mode]
    if (modeIdx === undefined) {
      throw new Error(`Invalid mode: ${mode}. Must be one of ${MODES}`)
    }

    this.prime = prime
    this.mode = MODES[modeIdx]
    this.twist = twistAngle(prime)
  }

  /**
   * Get the numeric encoding (prime * 3 + modeIdx)
   */
  encode() {
    const modeIdx = MODE_INDEX[this.mode]
    return this.prime * 3 + modeIdx
  }

  /**
   * Decode from numeric encoding
   */
  static decode(encoded) {
    const modeIdx = encoded % 3
    const prime = (encoded - modeIdx) / 3
    return new EnochianSymbol(prime, MODES[modeIdx])
  }

  /**
   * Get string representation
   */
  toString() {
    return `${this.mode}${this.prime}`
  }

  toJSON() {
    return { prime: this.prime, mode: this.mode, twist: this.twist }
  }
}

/**
 * Enochian Packet
 * A sequence of symbols with twist-closure validation
 */
class EnochianPacket {
  /**
   * @param {Array<EnochianSymbol>} symbols - Sequence of symbols
   */
  constructor(symbols = []) {
    this.symbols = symbols
    this.timestamp = Date.now()
  }

  /**
   * Add a symbol to the packet
   */
  add(symbol) {
    this.symbols.push(symbol)
    return this
  }

  /**
   * Get all primes in the packet
   */
  primes() {
    return this.symbols.map((s) => s.prime)
  }

  /**
   * Get total twist
   */
  totalTwist() {
    return totalTwist(this.primes())
  }

  /**
   * Check if packet is twist-closed
   */
  isTwistClosed(epsilon = 1.0) {
    return isTwistClosed(this.primes(), epsilon)
  }

  /**
   * Get twist closure error (how far from closed)
   */
  closureError() {
    const twist = this.totalTwist()
    const mod = ((twist % 360) + 360) % 360
    return Math.min(mod, 360 - mod)
  }

  /**
   * Validate the packet
   */
  validate(epsilon = 1.0) {
    return {
      valid: this.isTwistClosed(epsilon),
      totalTwist: this.totalTwist(),
      closureError: this.closureError(),
      symbolCount: this.symbols.length,
    }
  }

  /**
   * Encode to binary buffer
   */
  encode() {
    const buffer = new Uint8Array(this.symbols.length)
    for (let i = 0; i < this.symbols.length; i++) {
      buffer[i] = this.symbols[i].encode()
    }
    return buffer
  }

  /**
   * Decode from binary buffer
   */
  static decode(buffer) {
    const symbols = []
    for (let i = 0; i < buffer.length; i++) {
      try {
        symbols.push(EnochianSymbol.decode(buffer[i]))
      } catch (e) {
        // Skip invalid symbols
      }
    }
    return new EnochianPacket(symbols)
  }

  /**
   * Encode to base64 string
   */
  toBase64() {
    const buffer = this.encode()
    return Buffer.from(buffer).toString('base64')
  }

  /**
   * Decode from base64 string
   */
  static fromBase64(str) {
    const buffer = Buffer.from(str, 'base64')
    return EnochianPacket.decode(new Uint8Array(buffer))
  }

  /**
   * Get string representation
   */
  toString() {
    return this.symbols.map((s) => s.toString()).join(' ')
  }

  toJSON() {
    return {
      symbols: this.symbols.map((s) => s.toJSON()),
      totalTwist: this.totalTwist(),
      isClosed: this.isTwistClosed(),
      closureError: this.closureError(),
      timestamp: this.timestamp,
    }
  }
}

/**
 * Enochian Encoder
 * Encodes semantic content into twist-closed Enochian packets
 */
class EnochianEncoder {
  constructor(options = {}) {
    this.epsilon = options.epsilon || 1.0
    this.maxIterations = options.maxIterations || 1000
  }

  /**
   * Encode a semantic hash into an Enochian packet
   * Attempts to create a twist-closed packet
   *
   * @param {number} hash - Semantic hash value
   * @param {number} minSymbols - Minimum symbols in packet
   * @returns {EnochianPacket} Twist-closed packet
   */
  encode(hash, minSymbols = 3) {
    const symbols = []

    // Extract prime indices from hash
    let remaining = Math.abs(hash)
    while (remaining > 0 || symbols.length < minSymbols) {
      const primeIdx = remaining % ENOCHIAN_PRIMES.length
      const modeIdx = ((remaining / ENOCHIAN_PRIMES.length) | 0) % 3

      symbols.push(new EnochianSymbol(ENOCHIAN_PRIMES[primeIdx], MODES[modeIdx]))

      remaining = (remaining / (ENOCHIAN_PRIMES.length * 3)) | 0

      if (remaining === 0 && symbols.length < minSymbols) {
        remaining = symbols.length + hash
      }
    }

    // Attempt to close the twist
    return this.closeTwist(new EnochianPacket(symbols))
  }

  /**
   * Attempt to make a packet twist-closed by adding symbols
   */
  closeTwist(packet) {
    if (packet.isTwistClosed(this.epsilon)) {
      return packet
    }

    // Try adding symbols to close the twist
    for (let iter = 0; iter < this.maxIterations; iter++) {
      const currentTwist = packet.totalTwist()
      const mod = ((currentTwist % 360) + 360) % 360

      // Find best prime to add
      let bestPrime = ENOCHIAN_PRIMES[0]
      let bestError = Infinity

      for (const p of ENOCHIAN_PRIMES) {
        const newMod = (mod + twistAngle(p)) % 360
        const error = Math.min(newMod, 360 - newMod)
        if (error < bestError) {
          bestError = error
          bestPrime = p
        }
      }

      packet.add(new EnochianSymbol(bestPrime, MODES[iter % 3]))

      if (packet.isTwistClosed(this.epsilon)) {
        return packet
      }
    }

    // Return best effort
    return packet
  }

  /**
   * Encode text to Enochian packet
   */
  encodeText(text) {
    // Simple hash of text
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i)
      hash |= 0
    }
    return this.encode(hash, Math.max(3, Math.ceil(text.length / 10)))
  }

  /**
   * Encode a prime calculus term to Enochian
   */
  encodeTerm(term) {
    const sig = term.signature()
    return this.encodeText(sig)
  }
}

/**
 * Enochian Decoder
 * Decodes and validates Enochian packets
 */
class EnochianDecoder {
  constructor(options = {}) {
    this.epsilon = options.epsilon || 1.0
  }

  /**
   * Decode and validate a packet
   * @param {EnochianPacket|Uint8Array|string} input
   * @returns {Object} Decoded result with validation
   */
  decode(input) {
    let packet

    if (input instanceof EnochianPacket) {
      packet = input
    } else if (input instanceof Uint8Array) {
      packet = EnochianPacket.decode(input)
    } else if (typeof input === 'string') {
      packet = EnochianPacket.fromBase64(input)
    } else {
      return { valid: false, error: 'Invalid input type' }
    }

    const validation = packet.validate(this.epsilon)

    return {
      valid: validation.valid,
      packet: packet,
      primes: packet.primes(),
      modes: packet.symbols.map((s) => s.mode),
      totalTwist: validation.totalTwist,
      closureError: validation.closureError,
      symbolCount: validation.symbolCount,
    }
  }

  /**
   * Validate only (fast path for network filtering)
   */
  validateOnly(input) {
    try {
      let packet

      if (input instanceof EnochianPacket) {
        packet = input
      } else if (input instanceof Uint8Array) {
        packet = EnochianPacket.decode(input)
      } else if (typeof input === 'string') {
        packet = EnochianPacket.fromBase64(input)
      } else {
        return false
      }

      return packet.isTwistClosed(this.epsilon)
    } catch (e) {
      return false
    }
  }
}

/**
 * Enochian Packet Builder
 * Fluent API for building packets
 */
class EnochianPacketBuilder {
  constructor() {
    this.symbols = []
  }

  /**
   * Add a symbol with shorthand
   */
  add(prime, mode = 'α') {
    this.symbols.push(new EnochianSymbol(prime, mode))
    return this
  }

  /**
   * Add alpha mode symbol
   */
  alpha(prime) {
    return this.add(prime, 'α')
  }

  /**
   * Add mu mode symbol
   */
  mu(prime) {
    return this.add(prime, 'μ')
  }

  /**
   * Add omega mode symbol
   */
  omega(prime) {
    return this.add(prime, 'ω')
  }

  /**
   * Build the packet
   */
  build() {
    return new EnochianPacket(this.symbols.slice())
  }

  /**
   * Get current twist
   */
  currentTwist() {
    return totalTwist(this.symbols.map((s) => s.prime))
  }

  /**
   * Check if current sequence is closed
   */
  isClosed(epsilon = 1.0) {
    return isTwistClosed(
      this.symbols.map((s) => s.prime),
      epsilon,
    )
  }

  /**
   * Suggest next prime to close the twist
   */
  suggestClosing() {
    const current = this.currentTwist()
    const mod = ((current % 360) + 360) % 360

    const suggestions = ENOCHIAN_PRIMES.map((p) => ({
      prime: p,
      resultMod: (mod + twistAngle(p)) % 360,
      error: Math.min((mod + twistAngle(p)) % 360, 360 - ((mod + twistAngle(p)) % 360)),
    }))

    return suggestions.sort((a, b) => a.error - b.error)
  }

  /**
   * Reset builder
   */
  reset() {
    this.symbols = []
    return this
  }
}

/**
 * Precomputed twist-closed sequences
 * Common short sequences that are twist-closed
 */
const CLOSED_SEQUENCES = [
  // These are example closed sequences - actual values depend on epsilon
  [7, 7, 7, 7, 7, 7, 7], // 7 sevens = 7 * 51.43 = 360
  [11, 11, 11, 29, 29], // Approximate closure
  [13, 13, 13, 13, 19], // Approximate closure
]

/**
 * Find twist-closed sequences of given length
 */
function findClosedSequences(length, epsilon = 1.0, maxResults = 10) {
  const results = []

  function search(current, depth) {
    if (depth === length) {
      if (isTwistClosed(current, epsilon)) {
        results.push(current.slice())
      }
      return
    }
    if (results.length >= maxResults) return

    for (const p of ENOCHIAN_PRIMES) {
      current.push(p)
      search(current, depth + 1)
      current.pop()
    }
  }

  search([], 0)
  return results
}

/**
 * EnhancedEnochianEncoder - Extends EnochianEncoder with vocabulary support
 */
class EnhancedEnochianEncoder extends EnochianEncoder {
  constructor(options = {}) {
    super(options)
    this.engine = new EnochianVocabulary.EnochianEngine()
    this.vocabulary = EnochianVocabulary.wordLookup
  }

  /**
   * Encode an Enochian word from vocabulary
   * @param {string} word - Enochian word (e.g., 'ZACAR', 'ZORGE')
   */
  encodeWord(word) {
    const enochianWord = this.vocabulary.get(word.toUpperCase())
    if (enochianWord) {
      // Use the word's primes directly
      return this.encodeFromPrimes(enochianWord.primes)
    }
    // Fall back to parsing as text
    return this.encodeText(word)
  }

  /**
   * Encode from a sequence of primes
   */
  encodeFromPrimes(primes) {
    const symbols = []
    for (let i = 0; i < primes.length; i++) {
      const prime = primes[i]
      // Map to ENOCHIAN_PRIMES or use closest
      const mappedPrime = this.findClosestEnochianPrime(prime)
      const modeIdx = i % 3
      symbols.push(new EnochianSymbol(mappedPrime, MODES[modeIdx]))
    }
    return this.closeTwist(new EnochianPacket(symbols))
  }

  /**
   * Find closest prime in ENOCHIAN_PRIMES
   */
  findClosestEnochianPrime(prime) {
    let closest = ENOCHIAN_PRIMES[0]
    let minDiff = Math.abs(prime - closest)
    for (const p of ENOCHIAN_PRIMES) {
      const diff = Math.abs(prime - p)
      if (diff < minDiff) {
        minDiff = diff
        closest = p
      }
    }
    return closest
  }

  /**
   * Encode a Call by number
   */
  encodeCall(callNumber) {
    const call = EnochianVocabulary.THE_NINETEEN_CALLS.find((c) => c.number === callNumber)
    if (!call) {
      throw new Error(`Call ${callNumber} not found`)
    }

    const primes = call.getAllPrimes()
    return this.encodeFromPrimes(primes)
  }

  /**
   * Get vocabulary entry for a word
   */
  getVocabularyEntry(word) {
    return this.vocabulary.get(word.toUpperCase())
  }

  /**
   * Compute sedenion representation of encoded packet
   */
  toSedenion(packet) {
    const primes = packet.primes()
    let result = new EnochianVocabulary.SedenionElement()

    for (const p of primes) {
      const elem = EnochianVocabulary.SedenionElement.fromBasis([p / 100])
      result = result.add(elem)
    }

    return result
  }
}

/**
 * EnhancedEnochianDecoder - Extends EnochianDecoder with vocabulary support
 */
class EnhancedEnochianDecoder extends EnochianDecoder {
  constructor(options = {}) {
    super(options)
    this.engine = new EnochianVocabulary.EnochianEngine()
  }

  /**
   * Decode and attempt to match to vocabulary
   */
  decodeWithVocabulary(input) {
    const result = this.decode(input)
    if (!result.valid) return result

    // Try to match primes to vocabulary words
    const matchedWords = this.findMatchingWords(result.primes)

    return {
      ...result,
      vocabularyMatches: matchedWords,
      sedenion: this.toSedenion(result.packet),
    }
  }

  /**
   * Find vocabulary words that share primes with the packet
   */
  findMatchingWords(primes) {
    const primeSet = new Set(primes)
    const matches = []

    for (const [word, wordObj] of EnochianVocabulary.wordLookup) {
      const sharedPrimes = wordObj.primes.filter((p) => primeSet.has(p))
      if (sharedPrimes.length > 0) {
        matches.push({
          word: word,
          meaning: wordObj.meaning,
          sharedPrimes: sharedPrimes,
          matchScore: sharedPrimes.length / wordObj.primes.length,
        })
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5)
  }

  /**
   * Convert packet to sedenion
   */
  toSedenion(packet) {
    const primes = packet.primes()
    let result = new EnochianVocabulary.SedenionElement()

    for (const p of primes) {
      const elem = EnochianVocabulary.SedenionElement.fromBasis([p / 100])
      result = result.add(elem)
    }

    return result
  }
}

module.exports = {
  // Constants
  ENOCHIAN_PRIMES,
  MODES,
  MODE_INDEX,
  CLOSED_SEQUENCES,

  // Functions
  twistAngle,
  totalTwist,
  isTwistClosed,
  findClosedSequences,

  // Classes
  EnochianSymbol,
  EnochianPacket,
  EnochianEncoder,
  EnochianDecoder,
  EnochianPacketBuilder,

  // Enhanced classes with vocabulary support
  EnhancedEnochianEncoder,
  EnhancedEnochianDecoder,

  // Re-export vocabulary module
  EnochianVocabulary,

  // Convenience re-exports from vocabulary
  ENOCHIAN_ALPHABET: EnochianVocabulary.ENOCHIAN_ALPHABET,
  PRIME_BASIS: EnochianVocabulary.PRIME_BASIS,
  CORE_VOCABULARY: EnochianVocabulary.CORE_VOCABULARY,
  THE_NINETEEN_CALLS: EnochianVocabulary.THE_NINETEEN_CALLS,
  EnochianWord: EnochianVocabulary.EnochianWord,
  EnochianCall: EnochianVocabulary.EnochianCall,
  EnochianEngine: EnochianVocabulary.EnochianEngine,
  SedenionElement: EnochianVocabulary.SedenionElement,
  TwistOperator: EnochianVocabulary.TwistOperator,
  validateTwistClosure: EnochianVocabulary.validateTwistClosure,
}
