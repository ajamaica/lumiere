/**
 * Enochian Formal Language System
 *
 * Implements the Enochian ceremonial language as a formal prime-indexed system:
 * - 21-letter Enochian alphabet with prime mappings
 * - Prime basis PE = {7, 11, 13, 17, 19, 23, 29}
 * - Twist modes {α, μ, ω} with angles κ(p) = 360/p
 * - Core vocabulary words (ZACAR, ZORGE, etc.)
 * - The 19 Calls (ritual invocation sequences)
 * - Sedenion integration for 16D hypercomplex operations
 * - Twist closure validation
 *
 * Now uses @aleph-ai/tinyaleph for prime operations.
 */

// Import from @aleph-ai/tinyaleph npm package
const tinyaleph = require('@aleph-ai/tinyaleph')
const { isPrime, nthPrime, firstNPrimes } = tinyaleph

// ============================================================================
// ENOCHIAN ALPHABET (21 Letters)
// ============================================================================

/**
 * The Enochian alphabet consists of 21 letters, each mapped to a prime number.
 * The mapping follows the original Dee/Kelley system with prime assignments.
 */
const ENOCHIAN_ALPHABET = [
  { letter: 'A', name: 'Un', prime: 2, meaning: 'Beginning', phonetic: 'ah' },
  { letter: 'B', name: 'Pa', prime: 3, meaning: 'Father', phonetic: 'beh' },
  { letter: 'C', name: 'Veh', prime: 5, meaning: 'Creation', phonetic: 'keh' },
  { letter: 'D', name: 'Gal', prime: 7, meaning: 'Foundation', phonetic: 'deh' },
  { letter: 'E', name: 'Or', prime: 11, meaning: 'Light', phonetic: 'eh' },
  { letter: 'F', name: 'Don', prime: 13, meaning: 'Dominion', phonetic: 'feh' },
  { letter: 'G', name: 'Ged', prime: 17, meaning: 'Spirit', phonetic: 'geh' },
  { letter: 'H', name: 'Na', prime: 19, meaning: 'Lord', phonetic: 'heh' },
  { letter: 'I', name: 'Gon', prime: 23, meaning: 'Faith', phonetic: 'ee' },
  { letter: 'K', name: 'Ur', prime: 29, meaning: 'Fire', phonetic: 'kah' },
  { letter: 'L', name: 'Tal', prime: 31, meaning: 'Earth', phonetic: 'leh' },
  { letter: 'M', name: 'Mals', prime: 37, meaning: 'Mind', phonetic: 'meh' },
  { letter: 'N', name: 'Drun', prime: 41, meaning: 'Power', phonetic: 'neh' },
  { letter: 'O', name: 'Med', prime: 43, meaning: 'Oil/Mercy', phonetic: 'oh' },
  { letter: 'P', name: 'Ceph', prime: 47, meaning: 'Judgment', phonetic: 'peh' },
  { letter: 'Q', name: 'Ger', prime: 53, meaning: 'Nature', phonetic: 'kweh' },
  { letter: 'R', name: 'Graph', prime: 59, meaning: 'Throne', phonetic: 'reh' },
  { letter: 'S', name: 'Fam', prime: 61, meaning: 'Voice', phonetic: 'seh' },
  { letter: 'T', name: 'Gisg', prime: 67, meaning: 'Time', phonetic: 'teh' },
  { letter: 'U', name: 'Van', prime: 71, meaning: 'Motion', phonetic: 'oo' },
  { letter: 'Z', name: 'Ceph', prime: 73, meaning: 'Completion', phonetic: 'zed' },
]

// Create lookup maps
const letterToPrime = new Map()
const primeToLetter = new Map()
const letterToData = new Map()

for (const entry of ENOCHIAN_ALPHABET) {
  letterToPrime.set(entry.letter, entry.prime)
  primeToLetter.set(entry.prime, entry.letter)
  letterToData.set(entry.letter, entry)
}

// ============================================================================
// PRIME BASIS PE
// ============================================================================

/**
 * The Enochian Prime Basis PE
 * These seven primes form the foundation of Enochian computation
 * PE = {7, 11, 13, 17, 19, 23, 29}
 */
const PRIME_BASIS = [7, 11, 13, 17, 19, 23, 29]

/**
 * Semantic meanings of basis primes
 */
const BASIS_MEANINGS = new Map([
  [7, 'Foundation/Structure'],
  [11, 'Light/Illumination'],
  [13, 'Dominion/Authority'],
  [17, 'Spirit/Intelligence'],
  [19, 'Lord/Governance'],
  [23, 'Faith/Belief'],
  [29, 'Fire/Transformation'],
])

// ============================================================================
// TWIST MODES
// ============================================================================

/**
 * Twist modes represent different operational aspects
 * Each mode applies a different phase transformation
 */
const TWIST_MODES = {
  ALPHA: 'α', // Assertion mode
  MU: 'μ', // Modal mode
  OMEGA: 'ω', // Completion mode
}

/**
 * Calculate twist angle for a prime: κ(p) = 360/p
 * @param {number} p - Prime number
 * @returns {number} Twist angle in degrees
 */
function twistAngle(p) {
  if (!isPrime(p)) {
    throw new Error(`${p} is not prime`)
  }
  return 360 / p
}

/**
 * Calculate twist in radians
 * @param {number} p - Prime number
 * @returns {number} Twist angle in radians
 */
function twistRadians(p) {
  return (2 * Math.PI) / p
}

/**
 * TwistOperator - Represents a twist operation on prime space
 */
class TwistOperator {
  constructor(prime, mode = TWIST_MODES.ALPHA) {
    if (!isPrime(prime)) {
      throw new Error(`${prime} is not prime`)
    }
    this.prime = prime
    this.mode = mode
    this.angle = twistAngle(prime)
  }

  /**
   * Get the rotation matrix for this twist (2D projection)
   */
  getRotationMatrix() {
    const theta = twistRadians(this.prime)
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    return [
      [cos, -sin],
      [sin, cos],
    ]
  }

  /**
   * Apply twist to a point (2D)
   */
  apply2D(x, y) {
    const theta = twistRadians(this.prime)
    return {
      x: x * Math.cos(theta) - y * Math.sin(theta),
      y: x * Math.sin(theta) + y * Math.cos(theta),
    }
  }

  /**
   * Compose with another twist operator
   */
  compose(other) {
    // Twist composition adds angles (mod 360)
    const newAngle = (this.angle + other.angle) % 360
    // Find prime approximation for combined angle
    const combinedPrime = Math.round(360 / newAngle)
    return new TwistOperator(isPrime(combinedPrime) ? combinedPrime : this.prime, this.mode)
  }

  toString() {
    return `Twist(${this.prime}, ${this.mode}, ${this.angle.toFixed(2)}°)`
  }
}

/**
 * Validate twist closure for a sequence of primes
 * Closure means the total twist is a multiple of 360°
 */
function validateTwistClosure(primes) {
  let totalAngle = 0
  for (const p of primes) {
    if (!isPrime(p)) {
      return { valid: false, reason: `${p} is not prime` }
    }
    totalAngle += twistAngle(p)
  }

  // Check if close to multiple of 360
  const closeness = totalAngle % 360
  const isClosed = closeness < 1 || closeness > 359

  return {
    valid: isClosed,
    totalAngle,
    closeness: Math.min(closeness, 360 - closeness),
    revolutions: Math.round(totalAngle / 360),
  }
}

// ============================================================================
// ENOCHIAN WORD CLASS
// ============================================================================

/**
 * EnochianWord - Represents a word in the Enochian language
 */
class EnochianWord {
  /**
   * @param {string} word - The Enochian word in Latin transliteration
   * @param {string} meaning - English meaning
   * @param {Object} options - Additional options
   */
  constructor(word, meaning, options = {}) {
    this.word = word.toUpperCase()
    this.meaning = meaning
    this.category = options.category || 'general'
    this.callNumber = options.callNumber || null

    // Calculate prime representation
    this.primes = this.toPrimes()
    this.primeProduct = this.calculateProduct()
    this.twistSum = this.calculateTwistSum()
  }

  /**
   * Convert word to prime sequence
   */
  toPrimes() {
    const primes = []
    for (const char of this.word) {
      if (letterToPrime.has(char)) {
        primes.push(letterToPrime.get(char))
      }
    }
    return primes
  }

  /**
   * Calculate product of all letter primes
   */
  calculateProduct() {
    return this.primes.reduce((a, b) => a * b, 1)
  }

  /**
   * Calculate sum of twist angles
   */
  calculateTwistSum() {
    return this.primes.reduce((sum, p) => sum + twistAngle(p), 0)
  }

  /**
   * Get twist closure status
   */
  getTwistClosure() {
    return validateTwistClosure(this.primes)
  }

  /**
   * Get word as letter-prime pairs
   */
  toLetterPrimePairs() {
    const pairs = []
    for (let i = 0; i < this.word.length; i++) {
      const char = this.word[i]
      if (letterToPrime.has(char)) {
        pairs.push({
          letter: char,
          prime: letterToPrime.get(char),
          data: letterToData.get(char),
        })
      }
    }
    return pairs
  }

  /**
   * Check if word uses only basis primes
   */
  usesBasisOnly() {
    return this.primes.every((p) => PRIME_BASIS.includes(p))
  }

  /**
   * Get resonance with another word (based on shared primes)
   */
  resonanceWith(other) {
    const primeSet = new Set(this.primes)
    const otherSet = new Set(other.primes)
    const shared = [...primeSet].filter((p) => otherSet.has(p))

    return {
      sharedPrimes: shared,
      resonanceScore: shared.length / Math.max(primeSet.size, otherSet.size),
      harmonicRatio: this.primeProduct / other.primeProduct,
    }
  }

  toString() {
    return `${this.word} (${this.meaning}) [${this.primes.join(',')}]`
  }
}

// ============================================================================
// CORE VOCABULARY
// ============================================================================

/**
 * The core Enochian vocabulary as defined in the paper
 */
const CORE_VOCABULARY = [
  // Divine names and titles
  new EnochianWord('ZACAR', 'Move', { category: 'command' }),
  new EnochianWord('ZORGE', 'Be friendly unto me', { category: 'invocation' }),
  new EnochianWord('ZAMRAN', 'Appear', { category: 'command' }),
  new EnochianWord('OL', 'I', { category: 'pronoun' }),
  new EnochianWord('SONF', 'Reign', { category: 'verb' }),
  new EnochianWord('VORS', 'Over', { category: 'preposition' }),
  new EnochianWord('CIAL', 'Earth', { category: 'noun' }),
  new EnochianWord('IALPIR', 'Burning flames', { category: 'noun' }),
  new EnochianWord('NOCO', 'Servant', { category: 'noun' }),
  new EnochianWord('HOATH', 'True worshipper', { category: 'noun' }),
  new EnochianWord('IAIDA', 'Highest', { category: 'adjective' }),
  new EnochianWord('GONO', 'Faith', { category: 'noun' }),
  new EnochianWord('GOHE', 'Power', { category: 'noun' }),
  new EnochianWord('GOHED', 'Everlasting', { category: 'adjective' }),
  new EnochianWord('MICMA', 'Behold', { category: 'command' }),
  new EnochianWord('ADGT', 'Can', { category: 'verb' }),
  new EnochianWord('LONDOH', 'Kingdom', { category: 'noun' }),
  new EnochianWord('ERAN', 'Promise', { category: 'noun' }),
  new EnochianWord('SOBAM', 'Whose', { category: 'relative' }),
  new EnochianWord('CASARM', 'Beginning', { category: 'noun' }),

  // Elemental terms
  new EnochianWord('BITOM', 'Fire tablet', { category: 'element' }),
  new EnochianWord('NANTA', 'Earth tablet', { category: 'element' }),
  new EnochianWord('HCOMA', 'Water tablet', { category: 'element' }),
  new EnochianWord('EXARP', 'Air tablet', { category: 'element' }),

  // Angelic names
  new EnochianWord('MADRIAX', 'Heavens', { category: 'realm' }),
  new EnochianWord('ZIRDO', 'I am', { category: 'verb' }),
  new EnochianWord('NIIS', 'Come', { category: 'command' }),
  new EnochianWord('DLUGA', 'Give', { category: 'command' }),
  new EnochianWord('ZODACARE', 'Move therefore', { category: 'command' }),
  new EnochianWord('OD', 'And', { category: 'conjunction' }),
  new EnochianWord('MOSPLEH', 'Crowns', { category: 'noun' }),
  new EnochianWord('RAAS', 'East', { category: 'direction' }),
  new EnochianWord('SOBOLN', 'West', { category: 'direction' }),
  new EnochianWord('IADNAH', 'Knowledge', { category: 'noun' }),
  new EnochianWord('VAOAN', 'Truth', { category: 'noun' }),
]

// Create word lookup
const wordLookup = new Map()
for (const word of CORE_VOCABULARY) {
  wordLookup.set(word.word, word)
}

// ============================================================================
// THE 19 CALLS (Keys)
// ============================================================================

/**
 * EnochianCall - Represents one of the 19 Calls (Keys)
 */
class EnochianCall {
  /**
   * @param {number} number - Call number (1-19)
   * @param {string} name - Name of the call
   * @param {string[]} words - Array of Enochian words in the call
   * @param {string} purpose - Purpose of the call
   */
  constructor(number, name, words, purpose) {
    this.number = number
    this.name = name
    this.words = words
    this.purpose = purpose
    this.enochianWords = this.parseWords()
  }

  /**
   * Parse word strings to EnochianWord objects
   */
  parseWords() {
    return this.words.map((w) => {
      if (wordLookup.has(w.toUpperCase())) {
        return wordLookup.get(w.toUpperCase())
      }
      return new EnochianWord(w, 'unknown', { callNumber: this.number })
    })
  }

  /**
   * Get all primes used in this call
   */
  getAllPrimes() {
    const primes = []
    for (const word of this.enochianWords) {
      primes.push(...word.primes)
    }
    return primes
  }

  /**
   * Calculate the total twist of this call
   */
  getTotalTwist() {
    const primes = this.getAllPrimes()
    return validateTwistClosure(primes)
  }

  /**
   * Get prime signature (product of all primes mod large number)
   */
  getPrimeSignature() {
    const primes = this.getAllPrimes()
    let product = 1n
    for (const p of primes) {
      product = (product * BigInt(p)) % BigInt(10 ** 15)
    }
    return product.toString()
  }

  toString() {
    return `Call ${this.number}: ${this.name} - ${this.purpose}`
  }
}

/**
 * The 19 Enochian Calls (simplified representation)
 * Each call serves a specific purpose in the Enochian system
 */
const THE_NINETEEN_CALLS = [
  new EnochianCall(
    1,
    'First Key',
    ['OL', 'SONF', 'VORS', 'GOHE', 'IAD', 'BALT', 'LANSH'],
    'Opening and invocation of the Spirit',
  ),

  new EnochianCall(
    2,
    'Second Key',
    ['ADGT', 'VPAAH', 'ZONG', 'OM', 'FAAIP', 'SALD'],
    'Invocation of knowledge and wisdom',
  ),

  new EnochianCall(
    3,
    'Third Key',
    ['MICMA', 'GOHO', 'PIAD', 'ZIRDO', 'NOCO', 'MAD'],
    'Invocation of understanding',
  ),

  new EnochianCall(
    4,
    'Fourth Key',
    ['OTHIL', 'LASDI', 'BABAGE', 'OD', 'DORPHA', 'GOHOL'],
    'Control of earthly elements',
  ),

  new EnochianCall(
    5,
    'Fifth Key',
    ['SAPAH', 'ZIMII', 'DUIV', 'OD', 'NOAS', 'TAAOG'],
    'Governance of the mighty sounds',
  ),

  new EnochianCall(
    6,
    'Sixth Key',
    ['GAHE', 'SAANIR', 'OD', 'CHRISTEOS', 'YRPOIL', 'TIOBL'],
    'Invocation of spirits of Air',
  ),

  new EnochianCall(
    7,
    'Seventh Key',
    ['RAAS', 'ISALMAN', 'PARADIZ', 'OE', 'COMSELH', 'AZIAZOR'],
    'Invocation of spirits of Water',
  ),

  new EnochianCall(
    8,
    'Eighth Key',
    ['BAZMELO', 'ITA', 'PIRIPSON', 'OLN', 'NAZARTH', 'OX'],
    'Invocation of spirits of Earth',
  ),

  new EnochianCall(
    9,
    'Ninth Key',
    ['MICAO', 'LI', 'OFEKUFA', 'OD', 'BEZET', 'IAIDA'],
    'Invocation of spirits of Fire',
  ),

  new EnochianCall(
    10,
    'Tenth Key',
    ['KORAXO', 'KHIS', 'OD', 'IPIAMON', 'OD', 'DLUGAR'],
    'First Aethyr - LIL',
  ),

  new EnochianCall(
    11,
    'Eleventh Key',
    ['OXIAYAL', 'HOLDO', 'OD', 'ZIROM', 'OD', 'CORAXO'],
    'Second Aethyr - ARN',
  ),

  new EnochianCall(
    12,
    'Twelfth Key',
    ['NONCP', 'ZACAM', 'GMICALZ', 'SOBOL', 'ATH', 'ANANAEL'],
    'Third Aethyr - ZOM',
  ),

  new EnochianCall(
    13,
    'Thirteenth Key',
    ['NAPEAI', 'BABAGEN', 'DS', 'BRIN', 'VX', 'OOAONA'],
    'Fourth Aethyr - PAZ',
  ),

  new EnochianCall(
    14,
    'Fourteenth Key',
    ['NOROMI', 'BAGIE', 'PASBS', 'OIAD', 'DS', 'TRINT'],
    'Fifth Aethyr - LIT',
  ),

  new EnochianCall(
    15,
    'Fifteenth Key',
    ['ILS', 'TABAAN', 'LIALPRT', 'CASARMAN', 'UPAAHI', 'CHIS'],
    'Sixth Aethyr - MAZ',
  ),

  new EnochianCall(
    16,
    'Sixteenth Key',
    ['ILS', 'VIUIALPRT', 'SALMAN', 'BALT', 'DS', 'ACROODZI'],
    'Seventh Aethyr - DEO',
  ),

  new EnochianCall(
    17,
    'Seventeenth Key',
    ['ILS', 'DIAL', 'PRDZAR', 'CCASCRG', 'NOAS', 'TA'],
    'Eighth Aethyr - ZID',
  ),

  new EnochianCall(
    18,
    'Eighteenth Key',
    ['ILS', 'MICAOLZ', 'SAANIR', 'CAOSGO', 'OD', 'FISIS'],
    'Ninth through Eighteenth Aethyrs',
  ),

  new EnochianCall(
    19,
    'Nineteenth Key',
    ['MADRIAX', 'DS', 'PRAF', 'LIL', 'CHIS', 'MICAOLZ', 'SAANIR'],
    'Call of the 30 Aethyrs (with insertion)',
  ),
]

// ============================================================================
// SEDENION INTEGRATION (16D Hypercomplex)
// ============================================================================

/**
 * SedenionElement - 16-dimensional hypercomplex number for Enochian operations
 * Sedenions extend octonions with 16 basis elements: e₀=1, e₁...e₁₅
 */
class SedenionElement {
  constructor(components = null) {
    // 16 components: e0 (real) through e15
    this.components = components || new Array(16).fill(0)
    if (this.components.length !== 16) {
      throw new Error('Sedenion must have exactly 16 components')
    }
  }

  /**
   * Create from Enochian word
   */
  static fromWord(word) {
    const components = new Array(16).fill(0)
    const enochianWord = word instanceof EnochianWord ? word : new EnochianWord(word, '')

    // Map primes to sedenion dimensions
    for (let i = 0; i < enochianWord.primes.length && i < 16; i++) {
      // Use prime modulo for component, scaled
      components[i] = enochianWord.primes[i] / 100
    }

    return new SedenionElement(components)
  }

  /**
   * Create from prime basis coefficients
   */
  static fromBasis(coefficients) {
    const components = new Array(16).fill(0)
    // Map 7 basis primes to first 7 non-real components
    for (let i = 0; i < Math.min(coefficients.length, 7); i++) {
      components[i + 1] = coefficients[i] // e1 through e7
    }
    return new SedenionElement(components)
  }

  /**
   * Get real part (e0)
   */
  real() {
    return this.components[0]
  }

  /**
   * Get imaginary parts (e1...e15)
   */
  imaginary() {
    return this.components.slice(1)
  }

  /**
   * Conjugate: negate all imaginary parts
   */
  conjugate() {
    const conj = [this.components[0]]
    for (let i = 1; i < 16; i++) {
      conj.push(-this.components[i])
    }
    return new SedenionElement(conj)
  }

  /**
   * Norm squared: sum of squares of all components
   */
  normSquared() {
    return this.components.reduce((sum, c) => sum + c * c, 0)
  }

  /**
   * Norm: square root of norm squared
   */
  norm() {
    return Math.sqrt(this.normSquared())
  }

  /**
   * Add two sedenions
   */
  add(other) {
    const result = this.components.map((c, i) => c + other.components[i])
    return new SedenionElement(result)
  }

  /**
   * Subtract two sedenions
   */
  subtract(other) {
    const result = this.components.map((c, i) => c - other.components[i])
    return new SedenionElement(result)
  }

  /**
   * Scale by scalar
   */
  scale(s) {
    const result = this.components.map((c) => c * s)
    return new SedenionElement(result)
  }

  /**
   * Sedenion multiplication (Cayley-Dickson construction)
   * Sedenions are NOT a division algebra - they have zero divisors
   */
  multiply(other) {
    // Use Cayley-Dickson: if a,b are octonions, (a,b)(c,d) = (ac - d*b, da + bc*)
    // For simplicity, implement component-wise using multiplication table
    const result = new Array(16).fill(0)

    // Full 16x16 multiplication is complex; here's a simplified version
    // that captures the essential structure
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const [k, sign] = sedenionMultTable(i, j)
        result[k] += sign * this.components[i] * other.components[j]
      }
    }

    return new SedenionElement(result)
  }

  /**
   * Apply twist operation
   */
  twist(prime) {
    const angle = twistRadians(prime)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // Apply rotation in multiple planes
    const result = [...this.components]
    for (let i = 1; i < 16; i += 2) {
      if (i + 1 < 16) {
        const x = result[i]
        const y = result[i + 1]
        result[i] = x * cos - y * sin
        result[i + 1] = x * sin + y * cos
      }
    }

    return new SedenionElement(result)
  }

  /**
   * Convert to array
   */
  toArray() {
    return [...this.components]
  }

  /**
   * Check if close to zero
   */
  isZero(epsilon = 1e-10) {
    return this.normSquared() < epsilon
  }

  toString() {
    const parts = []
    const names = [
      '',
      'e₁',
      'e₂',
      'e₃',
      'e₄',
      'e₅',
      'e₆',
      'e₇',
      'e₈',
      'e₉',
      'e₁₀',
      'e₁₁',
      'e₁₂',
      'e₁₃',
      'e₁₄',
      'e₁₅',
    ]

    for (let i = 0; i < 16; i++) {
      if (Math.abs(this.components[i]) > 1e-10) {
        const coef = this.components[i].toFixed(4)
        parts.push(i === 0 ? coef : `${coef}${names[i]}`)
      }
    }

    return parts.length > 0 ? parts.join(' + ') : '0'
  }
}

/**
 * Sedenion multiplication table
 * Returns [resultIndex, sign] for e_i * e_j
 */
function sedenionMultTable(i, j) {
  if (i === 0) return [j, 1]
  if (j === 0) return [i, 1]
  if (i === j) return [0, -1] // e_i^2 = -1 for i > 0

  // Use XOR for index (captures much of the algebra's structure)
  const k = i ^ j

  // Sign is more complex; simplified here
  // In full implementation, use proper Cayley-Dickson doubling
  const sign = (i & j) !== 0 ? -1 : 1

  return [k, sign]
}

// ============================================================================
// ENOCHIAN COMPUTATION ENGINE
// ============================================================================

/**
 * EnochianEngine - Performs computations in the Enochian formal system
 */
class EnochianEngine {
  constructor() {
    this.vocabulary = wordLookup
    this.calls = THE_NINETEEN_CALLS
    this.basisPrimes = PRIME_BASIS
  }

  /**
   * Parse Enochian text into words
   */
  parse(text) {
    const words = text.toUpperCase().split(/\s+/)
    return words.map((w) => {
      if (this.vocabulary.has(w)) {
        return this.vocabulary.get(w)
      }
      return new EnochianWord(w, 'unknown')
    })
  }

  /**
   * Compute prime signature of text
   */
  primeSignature(text) {
    const words = this.parse(text)
    const allPrimes = []
    for (const word of words) {
      allPrimes.push(...word.primes)
    }
    return allPrimes
  }

  /**
   * Convert text to sedenion representation
   */
  toSedenion(text) {
    const primes = this.primeSignature(text)
    let result = new SedenionElement()

    for (const p of primes) {
      const elem = SedenionElement.fromBasis([p / 100])
      result = result.add(elem)
    }

    return result
  }

  /**
   * Apply twist sequence to sedenion
   */
  applyTwists(sedenion, primes) {
    let result = sedenion
    for (const p of primes) {
      result = result.twist(p)
    }
    return result
  }

  /**
   * Compute resonance between two texts
   */
  resonance(text1, text2) {
    const s1 = this.toSedenion(text1)
    const s2 = this.toSedenion(text2)

    // Inner product (normalized)
    const dot = s1.components.reduce((sum, c, i) => sum + c * s2.components[i], 0)
    return dot / (s1.norm() * s2.norm() || 1)
  }

  /**
   * Validate if text has twist closure
   */
  hasTwistClosure(text) {
    const primes = this.primeSignature(text)
    return validateTwistClosure(primes)
  }

  /**
   * Get call by number
   */
  getCall(number) {
    return this.calls.find((c) => c.number === number)
  }

  /**
   * Execute a call (compute its sedenion representation)
   */
  executeCall(number) {
    const call = this.getCall(number)
    if (!call) {
      throw new Error(`Call ${number} not found`)
    }

    const primes = call.getAllPrimes()
    let result = new SedenionElement()

    for (const word of call.enochianWords) {
      const wordSed = SedenionElement.fromWord(word)
      result = result.add(wordSed)
    }

    // Apply twists from all primes
    result = this.applyTwists(result, primes)

    return {
      call: call,
      sedenion: result,
      norm: result.norm(),
      twistClosure: call.getTotalTwist(),
    }
  }

  /**
   * Find words that resonate with given prime
   */
  findResonantWords(prime) {
    const resonant = []
    for (const [word, wordObj] of this.vocabulary) {
      if (wordObj.primes.includes(prime)) {
        resonant.push(wordObj)
      }
    }
    return resonant
  }

  /**
   * Compute basis decomposition of text
   */
  basisDecomposition(text) {
    const primes = this.primeSignature(text)
    const basisCounts = new Map()

    for (const p of PRIME_BASIS) {
      basisCounts.set(p, 0)
    }

    for (const p of primes) {
      if (PRIME_BASIS.includes(p)) {
        basisCounts.set(p, basisCounts.get(p) + 1)
      }
    }

    return {
      basisCounts: Object.fromEntries(basisCounts),
      nonBasisPrimes: primes.filter((p) => !PRIME_BASIS.includes(p)),
      basisRatio: primes.filter((p) => PRIME_BASIS.includes(p)).length / (primes.length || 1),
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Alphabet
  ENOCHIAN_ALPHABET,
  letterToPrime,
  primeToLetter,
  letterToData,

  // Prime Basis
  PRIME_BASIS,
  BASIS_MEANINGS,

  // Twist Operations
  TWIST_MODES,
  twistAngle,
  twistRadians,
  TwistOperator,
  validateTwistClosure,

  // Words
  EnochianWord,
  CORE_VOCABULARY,
  wordLookup,

  // Calls
  EnochianCall,
  THE_NINETEEN_CALLS,

  // Sedenions
  SedenionElement,
  sedenionMultTable,

  // Engine
  EnochianEngine,
}
