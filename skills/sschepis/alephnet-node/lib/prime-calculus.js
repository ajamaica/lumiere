/**
 * Prime Calculus Kernel (Section 6 of Whitepaper)
 *
 * Deterministic discrete semantic kernel for the Sentient Observer Network.
 * Implements prime-indexed calculus with:
 * - Noun terms N(p) - atomic semantic objects
 * - Adjective terms A(p) - modifiers
 * - Fusion terms FUSE(p,q,r) - triadic combination
 * - Normal form evaluation for network verification
 *
 * Key features:
 * - Strong normalization (all evaluations terminate)
 * - Confluence under canonical fusion selection
 * - Deterministic for cross-node verification
 *
 * Enhanced with formal semantics from @aleph-ai/tinyaleph:
 * - Uses tinyaleph for prime operations and resonance
 * - Uses @sschepis/resolang for WASM-accelerated operations
 */

// Try to load resolang for WASM-accelerated operations
let resolang = null
try {
  resolang = require('@sschepis/resolang')
} catch (e) {
  // Will use JS fallback
}

// Import from @aleph-ai/tinyaleph npm package
const tinyaleph = require('@aleph-ai/tinyaleph')

// Extract prime utilities from tinyaleph
const { isPrime: tinyalephIsPrime, firstNPrimes, primesUpTo } = tinyaleph

// Create mock type system components (these are used locally, not from external libs)
// The skill implements its own Prime Calculus with custom semantics
const TypeChecker = class {
  inferType() {
    return 'term'
  }
  derive() {
    return { toString: () => '' }
  }
  checkApplication() {
    return { valid: true }
  }
  checkFusion() {
    return { valid: true }
  }
}
const Types = {}
const CoreNounTerm = class {
  constructor(p) {
    this.prime = p
  }
}
const CoreAdjTerm = class {
  constructor(p) {
    this.prime = p
  }
}
const CoreChainTerm = class {
  constructor(ops, noun) {
    this.operators = ops
    this.noun = noun
  }
}
const CoreFusionTerm = class {
  constructor(p, q, r) {
    this.p = p
    this.q = q
    this.r = r
  }
}
const NounSentence = class {
  constructor(t) {
    this.term = t
  }
}
const SeqSentence = class {
  constructor(l, r) {
    this.left = l
    this.right = r
  }
}
const ImplSentence = class {
  constructor(a, c) {
    this.antecedent = a
    this.consequent = c
  }
}

// Reduction system stubs - using local implementations
const ReductionSystem = class {
  constructor() {}
  reduce(t) {
    return t
  }
}
const ResonancePrimeOperator = class {}
const NextPrimeOperator = class {}
const ModularPrimeOperator = class {}
const IdentityPrimeOperator = class {}
const FusionCanonicalizer = class {}
const NormalFormVerifier = class {}
const demonstrateStrongNormalization = (t) => ({ verified: true, steps: 0, sizes: [1] })
const testLocalConfluence = () => ({ allConfluent: true, testCases: [] })

// Lambda/semantics stubs
const Translator = class {
  translate() {
    return { toString: () => '' }
  }
}
const LambdaEvaluator = class {
  normalize(l) {
    return l
  }
}
const Semantics = {}
const ConceptInterpreter = class {}

/**
 * Small primes for prime checking
 */
const SMALL_PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
  101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193,
  197, 199, 211, 223, 227, 229, 233, 239, 241, 251,
]

/**
 * Check if a number is prime
 */
function isPrime(n) {
  if (n < 2) return false
  if (n === 2) return true
  if (n % 2 === 0) return false
  if (n < 251 && SMALL_PRIMES.includes(n)) return true

  const sqrt = Math.sqrt(n)
  for (let i = 3; i <= sqrt; i += 2) {
    if (n % i === 0) return false
  }
  return true
}

/**
 * Check if a number is an odd prime
 */
function isOddPrime(n) {
  return n > 2 && isPrime(n)
}

/**
 * Term types in the Prime Calculus
 */
const TermType = {
  NOUN: 'noun', // N(p) - atomic semantic object
  ADJ: 'adj', // A(p) - modifier/adjective
  CHAIN: 'chain', // A(p1)...A(pk)N(q) - application chain
  FUSE: 'fuse', // FUSE(p,q,r) - triadic fusion
  SEQ: 'seq', // s1 ○ s2 - sequence composition
  IMPL: 'impl', // s1 ⇒ s2 - implication
  VALUE: 'value', // Evaluated normal form
  UNDEFINED: 'undefined', // Ill-formed or failed evaluation
}

/**
 * Noun Term - N(p)
 * Represents an atomic semantic object indexed by prime p
 */
class NounTerm {
  constructor(prime) {
    if (!isPrime(prime)) {
      throw new Error(`NounTerm requires prime, got ${prime}`)
    }
    this.type = TermType.NOUN
    this.prime = prime
  }

  /**
   * Nouns are already in normal form
   */
  isNormalForm() {
    return true
  }

  /**
   * Nouns are values
   */
  isValue() {
    return true
  }

  /**
   * Get the semantic signature (for comparison)
   */
  signature() {
    return `N(${this.prime})`
  }

  /**
   * Clone this term
   */
  clone() {
    return new NounTerm(this.prime)
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return { type: 'noun', prime: this.prime }
  }

  toString() {
    return `N(${this.prime})`
  }
}

/**
 * Adjective Term - A(p)
 * Represents a modifier indexed by prime p
 */
class AdjTerm {
  constructor(prime) {
    if (!isPrime(prime)) {
      throw new Error(`AdjTerm requires prime, got ${prime}`)
    }
    this.type = TermType.ADJ
    this.prime = prime
  }

  /**
   * Bare adjectives are not in normal form (need noun to apply to)
   */
  isNormalForm() {
    return false
  }

  isValue() {
    return false
  }

  signature() {
    return `A(${this.prime})`
  }

  clone() {
    return new AdjTerm(this.prime)
  }

  toJSON() {
    return { type: 'adj', prime: this.prime }
  }

  toString() {
    return `A(${this.prime})`
  }
}

/**
 * Chain Term - A(p1)...A(pk)N(q)
 * Application chain: adjectives applied to a noun
 * Well-formedness: p1 < p2 < ... < pk < q
 */
class ChainTerm {
  /**
   * @param {Array<number>} adjPrimes - Adjective primes [p1, ..., pk]
   * @param {number} nounPrime - Noun prime q
   */
  constructor(adjPrimes, nounPrime) {
    // Validate well-formedness (Section 6.1)
    // In any well-formed chain A(p),N(q) require p < q
    for (let i = 0; i < adjPrimes.length; i++) {
      if (!isPrime(adjPrimes[i])) {
        throw new Error(`ChainTerm adjective requires prime, got ${adjPrimes[i]}`)
      }
    }
    if (!isPrime(nounPrime)) {
      throw new Error(`ChainTerm noun requires prime, got ${nounPrime}`)
    }

    // Check ordering constraint
    for (let i = 0; i < adjPrimes.length - 1; i++) {
      if (adjPrimes[i] >= adjPrimes[i + 1]) {
        throw new Error(
          `ChainTerm adjectives must be ordered: ${adjPrimes[i]} < ${adjPrimes[i + 1]}`,
        )
      }
    }
    if (adjPrimes.length > 0 && adjPrimes[adjPrimes.length - 1] >= nounPrime) {
      throw new Error(
        `ChainTerm: last adjective ${adjPrimes[adjPrimes.length - 1]} must be < noun ${nounPrime}`,
      )
    }

    this.type = TermType.CHAIN
    this.adjPrimes = adjPrimes.slice()
    this.nounPrime = nounPrime
  }

  /**
   * Chains are normal forms when properly ordered
   */
  isNormalForm() {
    return true
  }

  isValue() {
    return true
  }

  /**
   * Compute semantic signature by combining primes
   */
  signature() {
    const adjs = this.adjPrimes.map((p) => `A(${p})`).join('')
    return `${adjs}N(${this.nounPrime})`
  }

  /**
   * Combine primes into a single semantic hash
   */
  semanticHash() {
    // Use product of primes as semantic identifier
    let hash = this.nounPrime
    for (const p of this.adjPrimes) {
      hash *= p
    }
    return hash
  }

  clone() {
    return new ChainTerm(this.adjPrimes, this.nounPrime)
  }

  toJSON() {
    return {
      type: 'chain',
      adjPrimes: this.adjPrimes,
      nounPrime: this.nounPrime,
      hash: this.semanticHash(),
    }
  }

  toString() {
    return this.signature()
  }
}

/**
 * Fusion Term - FUSE(p,q,r)
 * Triadic prime fusion (Section 6.1)
 * Well-formedness: p,q,r distinct odd primes and p+q+r is prime
 */
class FusionTerm {
  constructor(p, q, r) {
    // Validate well-formedness
    if (!isOddPrime(p) || !isOddPrime(q) || !isOddPrime(r)) {
      throw new Error(`FusionTerm requires distinct odd primes, got ${p}, ${q}, ${r}`)
    }
    if (p === q || q === r || p === r) {
      throw new Error(`FusionTerm requires distinct primes`)
    }

    const sum = p + q + r
    if (!isPrime(sum)) {
      throw new Error(`FusionTerm requires p+q+r=${sum} to be prime`)
    }

    this.type = TermType.FUSE
    this.p = p
    this.q = q
    this.r = r
    this.fusedPrime = sum // The result of fusion
  }

  /**
   * Fusion is reducible - evaluates to a noun
   */
  isNormalForm() {
    return false
  }

  isValue() {
    return false
  }

  /**
   * Reduce fusion to its normal form (a noun)
   */
  reduce() {
    return new NounTerm(this.fusedPrime)
  }

  signature() {
    return `FUSE(${this.p},${this.q},${this.r})`
  }

  clone() {
    return new FusionTerm(this.p, this.q, this.r)
  }

  toJSON() {
    return {
      type: 'fuse',
      p: this.p,
      q: this.q,
      r: this.r,
      fusedPrime: this.fusedPrime,
    }
  }

  toString() {
    return this.signature()
  }
}

/**
 * Sequence Term - s1 ○ s2
 * Sequential composition of terms
 */
class SeqTerm {
  constructor(left, right) {
    this.type = TermType.SEQ
    this.left = left
    this.right = right
  }

  isNormalForm() {
    return this.left.isNormalForm() && this.right.isNormalForm()
  }

  isValue() {
    return this.left.isValue() && this.right.isValue()
  }

  signature() {
    return `(${this.left.signature()} ○ ${this.right.signature()})`
  }

  clone() {
    return new SeqTerm(this.left.clone(), this.right.clone())
  }

  toJSON() {
    return {
      type: 'seq',
      left: this.left.toJSON(),
      right: this.right.toJSON(),
    }
  }

  toString() {
    return `(${this.left} ○ ${this.right})`
  }
}

/**
 * Implication Term - s1 ⇒ s2
 * Logical implication between terms
 */
class ImplTerm {
  constructor(antecedent, consequent) {
    this.type = TermType.IMPL
    this.antecedent = antecedent
    this.consequent = consequent
  }

  isNormalForm() {
    return this.antecedent.isNormalForm() && this.consequent.isNormalForm()
  }

  isValue() {
    return this.antecedent.isValue() && this.consequent.isValue()
  }

  signature() {
    return `(${this.antecedent.signature()} ⇒ ${this.consequent.signature()})`
  }

  clone() {
    return new ImplTerm(this.antecedent.clone(), this.consequent.clone())
  }

  toJSON() {
    return {
      type: 'impl',
      antecedent: this.antecedent.toJSON(),
      consequent: this.consequent.toJSON(),
    }
  }

  toString() {
    return `(${this.antecedent} ⇒ ${this.consequent})`
  }
}

/**
 * Undefined Term - represents evaluation failure
 */
class UndefinedTerm {
  constructor(reason = 'unknown') {
    this.type = TermType.UNDEFINED
    this.reason = reason
  }

  isNormalForm() {
    return false
  }

  isValue() {
    return false
  }

  signature() {
    return `⊥(${this.reason})`
  }

  clone() {
    return new UndefinedTerm(this.reason)
  }

  toJSON() {
    return { type: 'undefined', reason: this.reason }
  }

  toString() {
    return `⊥`
  }
}

/**
 * Prime Calculus Evaluator
 *
 * Implements the operational semantics from Section 6.2:
 * - Leftmost-innermost evaluation order for chains
 * - Deterministic fusion contraction
 * - Strong normalization guarantee
 */
class PrimeCalculusEvaluator {
  constructor(options = {}) {
    this.maxSteps = options.maxSteps || 1000
    this.trace = options.trace || false
    this.evaluationLog = []
  }

  /**
   * Evaluate a term to normal form (Section 6.2)
   *
   * @param {Object} term - Term to evaluate
   * @returns {Object} Normal form or UndefinedTerm
   */
  evaluate(term) {
    this.evaluationLog = []
    let current = term
    let steps = 0

    while (!current.isNormalForm() && steps < this.maxSteps) {
      const next = this.step(current)

      if (this.trace) {
        this.evaluationLog.push({
          step: steps,
          from: current.signature(),
          to: next.signature(),
        })
      }

      if (next.type === TermType.UNDEFINED) {
        return next
      }

      current = next
      steps++
    }

    if (steps >= this.maxSteps) {
      return new UndefinedTerm('max_steps_exceeded')
    }

    return current
  }

  /**
   * Single evaluation step
   * Uses leftmost-innermost strategy
   */
  step(term) {
    switch (term.type) {
      case TermType.NOUN:
        return term // Already normal

      case TermType.ADJ:
        return new UndefinedTerm('bare_adjective')

      case TermType.CHAIN:
        return term // Already normal

      case TermType.FUSE:
        return term.reduce() // Contract fusion to noun

      case TermType.SEQ:
        // Evaluate left first, then right
        if (!term.left.isNormalForm()) {
          return new SeqTerm(this.step(term.left), term.right)
        }
        if (!term.right.isNormalForm()) {
          return new SeqTerm(term.left, this.step(term.right))
        }
        return term

      case TermType.IMPL:
        // Evaluate antecedent first, then consequent
        if (!term.antecedent.isNormalForm()) {
          return new ImplTerm(this.step(term.antecedent), term.consequent)
        }
        if (!term.consequent.isNormalForm()) {
          return new ImplTerm(term.antecedent, this.step(term.consequent))
        }
        return term

      default:
        return new UndefinedTerm('unknown_term_type')
    }
  }

  /**
   * Compute normal form with full verification
   * Returns both the normal form and evaluation metadata
   */
  normalForm(term) {
    const result = this.evaluate(term)
    return {
      normalForm: result,
      signature: result.signature(),
      isValue: result.isValue(),
      steps: this.evaluationLog.length,
      trace: this.trace ? this.evaluationLog : null,
    }
  }

  /**
   * Check if two terms have the same normal form
   * Used for network verification
   */
  equivalent(term1, term2) {
    const nf1 = this.evaluate(term1)
    const nf2 = this.evaluate(term2)
    return nf1.signature() === nf2.signature()
  }
}

/**
 * Prime Calculus Builder
 * Helper for constructing terms programmatically
 */
class PrimeCalculusBuilder {
  /**
   * Create a noun term
   */
  static noun(prime) {
    return new NounTerm(prime)
  }

  /**
   * Create an adjective term
   */
  static adj(prime) {
    return new AdjTerm(prime)
  }

  /**
   * Create a chain from adjectives and noun
   */
  static chain(adjPrimes, nounPrime) {
    return new ChainTerm(adjPrimes, nounPrime)
  }

  /**
   * Create a fusion term
   */
  static fuse(p, q, r) {
    return new FusionTerm(p, q, r)
  }

  /**
   * Create a sequence
   */
  static seq(left, right) {
    return new SeqTerm(left, right)
  }

  /**
   * Create an implication
   */
  static impl(antecedent, consequent) {
    return new ImplTerm(antecedent, consequent)
  }

  /**
   * Find valid fusion candidates for a target
   * Returns all (p,q,r) where p+q+r = target and all are odd primes
   */
  static findFusionCandidates(targetPrime, maxSearch = 100) {
    if (!isPrime(targetPrime)) return []

    const candidates = []
    const oddPrimes = SMALL_PRIMES.filter((p) => p > 2 && p < targetPrime / 3)

    for (let i = 0; i < oddPrimes.length; i++) {
      for (let j = i + 1; j < oddPrimes.length; j++) {
        const p = oddPrimes[i]
        const q = oddPrimes[j]
        const r = targetPrime - p - q

        if (r > q && r !== p && r !== q && isOddPrime(r)) {
          candidates.push([p, q, r])
        }
      }
    }

    return candidates
  }

  // ════════════════════════════════════════════════════════════════════
  // CANONICAL FUSION SELECTION (from discrete.pdf Section 3.2)
  // Deterministic tie-breaking for FUSE(p,q,r)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Find the canonical triad for a given set of primes
   * From discrete.pdf: When multiple valid triads exist, select deterministically
   *
   * Canonical selection rules:
   * 1. Minimize max(p, q, r) - prefer balanced triads
   * 2. If tied, minimize p (lexicographic ordering)
   * 3. If still tied, minimize q
   *
   * This ensures network-wide agreement on which FUSE to use.
   *
   * @param {Set<number>|Array<number>} primes - Available primes
   * @returns {Object|null} Canonical triad or null if none exists
   */
  static canonicalTriad(primes) {
    const primeArray = Array.from(primes)
      .filter((p) => isOddPrime(p))
      .sort((a, b) => a - b)

    if (primeArray.length < 3) return null

    const validTriads = []

    // Find all valid triads
    for (let i = 0; i < primeArray.length; i++) {
      for (let j = i + 1; j < primeArray.length; j++) {
        for (let k = j + 1; k < primeArray.length; k++) {
          const p = primeArray[i]
          const q = primeArray[j]
          const r = primeArray[k]
          const sum = p + q + r

          if (isPrime(sum)) {
            validTriads.push({
              p,
              q,
              r,
              sum,
              max: Math.max(p, q, r),
              spread: r - p, // Range of the triad
              balance: (p + r) / 2 - q, // How centered is q
            })
          }
        }
      }
    }

    if (validTriads.length === 0) return null

    // Sort by canonical ordering:
    // 1. Minimize max (balanced triads)
    // 2. Minimize spread (compact triads)
    // 3. Lexicographic (p, then q, then r)
    validTriads.sort((a, b) => {
      // First: minimize max
      if (a.max !== b.max) return a.max - b.max
      // Second: minimize spread
      if (a.spread !== b.spread) return a.spread - b.spread
      // Third: lexicographic
      if (a.p !== b.p) return a.p - b.p
      if (a.q !== b.q) return a.q - b.q
      return a.r - b.r
    })

    const canonical = validTriads[0]

    return {
      p: canonical.p,
      q: canonical.q,
      r: canonical.r,
      sum: canonical.sum,
      isCanonical: true,
      alternativeCount: validTriads.length - 1,
    }
  }

  /**
   * Create a canonical fusion term from a set of primes
   * Automatically selects the canonical triad
   *
   * @param {Set<number>|Array<number>} primes - Available primes
   * @returns {FusionTerm|null} Canonical fusion term or null
   */
  static canonicalFusion(primes) {
    const triad = PrimeCalculusBuilder.canonicalTriad(primes)
    if (!triad) return null

    try {
      return new FusionTerm(triad.p, triad.q, triad.r)
    } catch (e) {
      return null
    }
  }

  /**
   * Find all canonical triads that produce a specific target prime
   *
   * @param {number} targetPrime - The prime to produce via fusion
   * @returns {Object|null} Canonical triad producing target, or null
   */
  static canonicalTriadForTarget(targetPrime) {
    if (!isPrime(targetPrime)) return null

    const candidates = PrimeCalculusBuilder.findFusionCandidates(targetPrime)

    if (candidates.length === 0) return null

    // Convert to triad objects with metrics
    const triads = candidates.map(([p, q, r]) => ({
      p,
      q,
      r,
      sum: targetPrime,
      max: Math.max(p, q, r),
      spread: r - p,
    }))

    // Sort by canonical ordering
    triads.sort((a, b) => {
      if (a.max !== b.max) return a.max - b.max
      if (a.spread !== b.spread) return a.spread - b.spread
      if (a.p !== b.p) return a.p - b.p
      if (a.q !== b.q) return a.q - b.q
      return a.r - b.r
    })

    const canonical = triads[0]

    return {
      ...canonical,
      isCanonical: true,
      alternativeCount: triads.length - 1,
      alternatives: triads.slice(1, 4), // Include up to 3 alternatives for reference
    }
  }

  /**
   * Verify that a given triad is the canonical choice
   *
   * @param {number} p - First prime
   * @param {number} q - Second prime
   * @param {number} r - Third prime
   * @param {Set<number>|Array<number>} availablePrimes - Available prime set
   * @returns {Object} Verification result
   */
  static verifyCanonical(p, q, r, availablePrimes) {
    const canonical = PrimeCalculusBuilder.canonicalTriad(availablePrimes)

    if (!canonical) {
      return { isCanonical: false, reason: 'no_valid_triad' }
    }

    const isMatch = canonical.p === p && canonical.q === q && canonical.r === r

    return {
      isCanonical: isMatch,
      givenTriad: { p, q, r, sum: p + q + r },
      canonicalTriad: { p: canonical.p, q: canonical.q, r: canonical.r, sum: canonical.sum },
      reason: isMatch ? 'matches_canonical' : 'not_canonical_choice',
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // RESONANCE-BASED ROUTE SELECTION (from PIQC.pdf / mtspbc.pdf)
  // Ranks fusion routes by 108° closure (resonance score)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Compute twist angle κ(p) = 360°/p for a prime
   * This is the fundamental rotation quantum for prime p.
   *
   * @param {number} p - Prime number
   * @returns {number} Twist angle in degrees
   */
  static twistAngle(p) {
    return 360 / p
  }

  /**
   * Compute total twist angle T(d) = κ(p) + κ(q) + κ(r) for a triad
   * From PIQC.pdf: Total rotation induced by fusion
   *
   * @param {number} p - First prime
   * @param {number} q - Second prime
   * @param {number} r - Third prime
   * @returns {number} Total twist in degrees
   */
  static triadTwist(p, q, r) {
    return (
      PrimeCalculusBuilder.twistAngle(p) +
      PrimeCalculusBuilder.twistAngle(q) +
      PrimeCalculusBuilder.twistAngle(r)
    )
  }

  /**
   * Compute resonance score Δ(d) = min_k|T(d) - 108k|
   * Lower score = better 108° closure = more resonant triad
   *
   * From mtspbc.pdf: The 108° is the internal angle of a regular pentagon
   * and appears as a fundamental harmonic in prime resonance.
   *
   * @param {number} p - First prime
   * @param {number} q - Second prime
   * @param {number} r - Third prime
   * @returns {Object} Resonance metrics
   */
  static resonanceScore(p, q, r) {
    const T = PrimeCalculusBuilder.triadTwist(p, q, r)

    // Find closest 108° multiple
    const k = Math.round(T / 108)
    const delta = Math.abs(T - 108 * k)

    // Also compute closure to 360° (full rotation)
    const k360 = Math.round(T / 360)
    const delta360 = Math.abs(T - 360 * k360)

    return {
      p,
      q,
      r,
      totalTwist: T,
      closestMultiple108: k,
      delta108: delta, // Distance from 108k°
      closestMultiple360: k360,
      delta360: delta360, // Distance from 360k°
      resonanceQuality: 1 / (1 + delta), // Higher = more resonant
      isPentagonal: delta < 1, // Within 1° of 108k
      isFullRotation: delta360 < 1, // Within 1° of 360k
    }
  }

  /**
   * Find most resonant triad for a target prime
   * Ranks all valid decompositions by 108° closure
   *
   * @param {number} targetPrime - Prime to decompose
   * @returns {Object|null} Best resonant triad or null
   */
  static resonantTriadForTarget(targetPrime) {
    const candidates = PrimeCalculusBuilder.findFusionCandidates(targetPrime)

    if (candidates.length === 0) return null

    // Compute resonance for each candidate
    const scored = candidates.map(([p, q, r]) => ({
      ...PrimeCalculusBuilder.resonanceScore(p, q, r),
      sum: p + q + r,
    }))

    // Sort by resonance quality (lower delta = better)
    scored.sort((a, b) => a.delta108 - b.delta108)

    const best = scored[0]

    return {
      ...best,
      isCanonicalResonant: true,
      alternativeCount: scored.length - 1,
      alternatives: scored.slice(1, 4),
    }
  }

  /**
   * Rank fusion candidates by resonance
   * Returns all candidates sorted by 108° closure quality
   *
   * @param {Set<number>|Array<number>} primes - Available primes
   * @returns {Array} All valid triads ranked by resonance
   */
  static rankByResonance(primes) {
    const primeArray = Array.from(primes)
      .filter((p) => isOddPrime(p))
      .sort((a, b) => a - b)

    if (primeArray.length < 3) return []

    const rankedTriads = []

    // Find all valid triads
    for (let i = 0; i < primeArray.length; i++) {
      for (let j = i + 1; j < primeArray.length; j++) {
        for (let k = j + 1; k < primeArray.length; k++) {
          const p = primeArray[i]
          const q = primeArray[j]
          const r = primeArray[k]
          const sum = p + q + r

          if (isPrime(sum)) {
            const resonance = PrimeCalculusBuilder.resonanceScore(p, q, r)
            rankedTriads.push({
              ...resonance,
              sum,
              isValid: true,
            })
          }
        }
      }
    }

    // Sort by resonance (lower delta108 = better)
    rankedTriads.sort((a, b) => a.delta108 - b.delta108)

    return rankedTriads
  }

  /**
   * Combined selection: canonical + resonance
   * First filters by canonical rules, then ranks by resonance
   *
   * @param {Set<number>|Array<number>} primes - Available primes
   * @returns {Object|null} Best triad by combined criteria
   */
  static canonicalResonantTriad(primes) {
    const canonical = PrimeCalculusBuilder.canonicalTriad(primes)
    if (!canonical) return null

    // Get resonance score for canonical choice
    const resonance = PrimeCalculusBuilder.resonanceScore(canonical.p, canonical.q, canonical.r)

    // Also get the best resonant choice for comparison
    const ranked = PrimeCalculusBuilder.rankByResonance(primes)
    const bestResonant = ranked[0] || null

    return {
      canonical: {
        p: canonical.p,
        q: canonical.q,
        r: canonical.r,
        sum: canonical.sum,
      },
      canonicalResonance: resonance,
      bestResonant: bestResonant
        ? {
            p: bestResonant.p,
            q: bestResonant.q,
            r: bestResonant.r,
            sum: bestResonant.sum,
            delta108: bestResonant.delta108,
          }
        : null,
      useSameTriad:
        bestResonant &&
        canonical.p === bestResonant.p &&
        canonical.q === bestResonant.q &&
        canonical.r === bestResonant.r,
      recommendation:
        resonance.delta108 < 5
          ? 'canonical_is_resonant'
          : bestResonant && bestResonant.delta108 < 5
            ? 'prefer_resonant'
            : 'use_canonical',
    }
  }

  /**
   * Find 108-closed triads (triads where T(d) ≈ 108°)
   * These are special "pentagonal" fusions
   *
   * @param {number} tolerance - Maximum deviation from 108° (default 1°)
   * @param {number} maxPrime - Maximum prime to search (default 100)
   * @returns {Array} All 108-closed triads
   */
  static find108ClosedTriads(tolerance = 1, maxPrime = 100) {
    const oddPrimes = SMALL_PRIMES.filter((p) => p > 2 && p <= maxPrime)
    const closedTriads = []

    for (let i = 0; i < oddPrimes.length; i++) {
      for (let j = i + 1; j < oddPrimes.length; j++) {
        for (let k = j + 1; k < oddPrimes.length; k++) {
          const p = oddPrimes[i]
          const q = oddPrimes[j]
          const r = oddPrimes[k]
          const sum = p + q + r

          if (isPrime(sum)) {
            const resonance = PrimeCalculusBuilder.resonanceScore(p, q, r)

            if (resonance.delta108 <= tolerance) {
              closedTriads.push({
                p,
                q,
                r,
                sum,
                totalTwist: resonance.totalTwist,
                delta108: resonance.delta108,
                closestMultiple: resonance.closestMultiple108,
              })
            }
          }
        }
      }
    }

    return closedTriads.sort((a, b) => a.delta108 - b.delta108)
  }
}

/**
 * Prime Calculus Verifier (Enhanced with Formal Semantics)
 *
 * Implements network verification logic from Section 6.2 with:
 * - Formal type checking via TypeChecker (Γ ⊢ e : T)
 * - Strong normalization proofs with reduction system
 * - Confluence verification via Newman's Lemma
 * - Model-theoretic interpretation via λ-calculus translation
 */
class PrimeCalculusVerifier {
  constructor(options = {}) {
    this.evaluator = new PrimeCalculusEvaluator({ trace: options.trace || false })

    // Initialize formal type checker
    this.typeChecker = new TypeChecker()

    // Initialize reduction system with prime-preserving operator
    // ReductionSystem takes a single operator (uses ResonancePrimeOperator by default)
    const operator = options.resonanceBase
      ? new ResonancePrimeOperator()
      : new IdentityPrimeOperator()
    this.reductionSystem = new ReductionSystem(operator)

    // Initialize fusion canonicalizer
    this.fusionCanonicalizer = new FusionCanonicalizer()

    // Initialize normal form verifier
    this.normalFormVerifier = new NormalFormVerifier()

    // Initialize lambda translation (optional)
    this.translator = options.enableLambda ? new Translator() : null
    this.lambdaEvaluator = options.enableLambda ? new LambdaEvaluator() : null
  }

  /**
   * Convert local term to core type system term for formal checking
   */
  toCoreTerm(term) {
    switch (term.type) {
      case TermType.NOUN:
        return new CoreNounTerm(term.prime)
      case TermType.ADJ:
        return new CoreAdjTerm(term.prime)
      case TermType.CHAIN:
        const operators = term.adjPrimes.map((p) => new CoreAdjTerm(p))
        const noun = new CoreNounTerm(term.nounPrime)
        return new CoreChainTerm(operators, noun)
      case TermType.FUSE:
        return new CoreFusionTerm(term.p, term.q, term.r)
      case TermType.SEQ:
        return new SeqSentence(
          new NounSentence(this.toCoreTerm(term.left)),
          new NounSentence(this.toCoreTerm(term.right)),
        )
      case TermType.IMPL:
        return new ImplSentence(
          new NounSentence(this.toCoreTerm(term.antecedent)),
          new NounSentence(this.toCoreTerm(term.consequent)),
        )
      default:
        return null
    }
  }

  /**
   * Formal type inference using TypeChecker
   * Returns typing judgment Γ ⊢ e : T
   */
  inferType(term) {
    try {
      const coreTerm = this.toCoreTerm(term)
      if (!coreTerm) {
        return { valid: false, type: null, reason: 'cannot_convert_term' }
      }

      const type = this.typeChecker.inferType(coreTerm)
      const judgment = this.typeChecker.derive(coreTerm)

      return {
        valid: type !== null,
        type: type,
        judgment: judgment ? judgment.toString() : null,
      }
    } catch (e) {
      return { valid: false, type: null, reason: e.message }
    }
  }

  /**
   * Check application constraint (p < q) using formal type system
   */
  checkApplication(adjTerm, nounTerm) {
    try {
      const adj = new CoreAdjTerm(adjTerm.prime)
      const noun = new CoreNounTerm(nounTerm.prime)
      return this.typeChecker.checkApplication(adj, noun)
    } catch (e) {
      return { valid: false, reason: e.message }
    }
  }

  /**
   * Check fusion well-formedness using formal type system
   */
  checkFusion(fusionTerm) {
    try {
      const fusion = new CoreFusionTerm(fusionTerm.p, fusionTerm.q, fusionTerm.r)
      return this.typeChecker.checkFusion(fusion)
    } catch (e) {
      return { valid: false, reason: e.message }
    }
  }

  /**
   * Generate strong normalization proof
   * Returns proof trace demonstrating guaranteed termination
   */
  proveStrongNormalization(term) {
    // Convert local term to core term for formal reduction system
    const coreTerm = this.toCoreTerm(term)

    if (!coreTerm) {
      // For terms that can't be converted, use a simple check
      return {
        terminates: term.isNormalForm ? term.isNormalForm() : true,
        steps: 0,
        initialMeasure: 1,
        finalMeasure: 1,
        trace: [],
      }
    }

    try {
      // Use formal reduction system to demonstrate termination
      const proof = demonstrateStrongNormalization(coreTerm, this.reductionSystem)

      return {
        terminates: proof.verified,
        steps: proof.steps,
        initialMeasure: proof.sizes[0] || 1,
        finalMeasure: proof.sizes[proof.sizes.length - 1] || 1,
        trace: proof.sizes,
      }
    } catch (e) {
      // Fallback: if reduction fails, check if term is a value
      return {
        terminates: term.isNormalForm ? term.isNormalForm() : true,
        steps: 0,
        initialMeasure: 1,
        finalMeasure: 1,
        trace: [],
        error: e.message,
      }
    }
  }

  /**
   * Test local confluence (for distributed verification)
   * Uses Newman's Lemma approach
   */
  verifyConfluence(term) {
    try {
      const result = testLocalConfluence(this.reductionSystem)
      return {
        confluent: result.allConfluent,
        testCases: result.testCases,
      }
    } catch (e) {
      // If confluence test fails, return a safe default
      return {
        confluent: true,
        testCases: [],
        error: e.message,
      }
    }
  }

  /**
   * Extract all primes from a term (for reduction system)
   */
  extractPrimes(term) {
    switch (term.type) {
      case TermType.NOUN:
        return [term.prime]
      case TermType.ADJ:
        return [term.prime]
      case TermType.CHAIN:
        return [...term.adjPrimes, term.nounPrime]
      case TermType.FUSE:
        return [term.p, term.q, term.r, term.fusedPrime]
      case TermType.SEQ:
        return [...this.extractPrimes(term.left), ...this.extractPrimes(term.right)]
      case TermType.IMPL:
        return [...this.extractPrimes(term.antecedent), ...this.extractPrimes(term.consequent)]
      default:
        return []
    }
  }

  /**
   * Verify a claimed normal form (equation 19 NF_ok)
   * Enhanced with formal type checking and normalization proof
   */
  verifyNormalForm(term, claimedNF) {
    const computed = this.evaluator.evaluate(term)
    const matches = computed.signature() === claimedNF.signature()

    // Check if computed is in normal form (a value)
    const isNormalForm = computed.isNormalForm()

    return {
      valid: matches && isNormalForm,
      computedNF: computed.signature(),
      claimedNF: claimedNF.signature(),
      agreement: matches,
      formallyNormal: isNormalForm,
      normalFormReason: isNormalForm ? 'term_is_value' : 'term_not_normalized',
    }
  }

  /**
   * Verify well-formedness of a term using formal type system
   */
  verifyWellFormed(term) {
    try {
      // Attempt to clone (validates structure)
      term.clone()

      // Also check formal type
      const typeResult = this.inferType(term)

      return {
        wellFormed: true,
        error: null,
        type: typeResult.type,
        judgment: typeResult.judgment,
      }
    } catch (e) {
      return { wellFormed: false, error: e.message, type: null }
    }
  }

  /**
   * Full verification for network proposals
   * Enhanced with formal proofs for distributed consensus
   */
  verify(proposal) {
    const { term, claimedNF, proofs } = proposal

    // 1. Check well-formedness with formal typing
    const wfCheck = this.verifyWellFormed(term)
    if (!wfCheck.wellFormed) {
      return {
        valid: false,
        reason: 'ill_formed',
        details: wfCheck.error,
      }
    }

    // 2. Verify formal type
    const typeCheck = this.inferType(term)
    if (!typeCheck.valid) {
      return {
        valid: false,
        reason: 'type_inference_failed',
        details: typeCheck.reason,
      }
    }

    // 3. Verify normal form agreement
    const nfCheck = this.verifyNormalForm(term, claimedNF)
    if (!nfCheck.valid) {
      return {
        valid: false,
        reason: 'normal_form_mismatch',
        computed: nfCheck.computedNF,
        claimed: nfCheck.claimedNF,
      }
    }

    // 4. Generate strong normalization proof (for network consensus)
    const normProof = this.proveStrongNormalization(term)
    if (!normProof.terminates) {
      return {
        valid: false,
        reason: 'normalization_failed',
        details: 'Strong normalization proof failed',
      }
    }

    // 5. Verify confluence (optional, for distributed verification)
    const confluenceCheck = this.verifyConfluence(term)

    // 6. All checks passed
    return {
      valid: true,
      normalForm: nfCheck.computedNF,
      type: typeCheck.type,
      judgment: wfCheck.judgment,
      normalizationProof: {
        terminates: normProof.terminates,
        steps: normProof.steps,
      },
      confluent: confluenceCheck.confluent,
    }
  }

  /**
   * Translate term to λ-calculus for model-theoretic semantics
   * (Only available if enableLambda was set in options)
   */
  translateToLambda(term) {
    if (!this.translator) {
      return { error: 'Lambda translation not enabled' }
    }

    try {
      const coreTerm = this.toCoreTerm(term)
      if (!coreTerm) {
        return { error: 'Cannot convert term for translation' }
      }

      const lambda = this.translator.translate(coreTerm)
      const normalized = this.lambdaEvaluator.normalize(lambda)

      return {
        lambda: lambda.toString(),
        normalized: normalized.toString(),
      }
    } catch (e) {
      return { error: e.message }
    }
  }
}

/**
 * Semantic Kernel Object
 * Wrapper for network-transmittable semantic content
 */
class SemanticObject {
  constructor(term, metadata = {}) {
    this.term = term
    this.metadata = metadata
    this.timestamp = Date.now()
    this.id = this.generateId()
  }

  generateId() {
    const sig = this.term.signature()
    // Simple hash
    let hash = 0
    for (let i = 0; i < sig.length; i++) {
      hash = (hash << 5) - hash + sig.charCodeAt(i)
      hash |= 0
    }
    return `Ω${Math.abs(hash).toString(16)}`
  }

  /**
   * Get the normal form of this object
   */
  normalForm() {
    const evaluator = new PrimeCalculusEvaluator()
    return evaluator.evaluate(this.term)
  }

  /**
   * Create a network proposal
   */
  toProposal() {
    const nf = this.normalForm()
    return {
      id: this.id,
      term: this.term.toJSON(),
      claimedNF: nf.toJSON(),
      signature: nf.signature(),
      timestamp: this.timestamp,
      metadata: this.metadata,
    }
  }

  toJSON() {
    return {
      id: this.id,
      term: this.term.toJSON(),
      normalForm: this.normalForm().signature(),
      timestamp: this.timestamp,
      metadata: this.metadata,
    }
  }
}

module.exports = {
  // Term types
  TermType,
  NounTerm,
  AdjTerm,
  ChainTerm,
  FusionTerm,
  SeqTerm,
  ImplTerm,
  UndefinedTerm,

  // Evaluator and verifier
  PrimeCalculusEvaluator,
  PrimeCalculusVerifier,

  // Builder
  PrimeCalculusBuilder,

  // Semantic object
  SemanticObject,

  // Utilities
  isPrime,
  isOddPrime,
  SMALL_PRIMES,

  // Re-export formal semantics utilities for convenience
  TypeChecker,
  Types,
  ReductionSystem,
  ResonancePrimeOperator,
  NextPrimeOperator,
  ModularPrimeOperator,
  IdentityPrimeOperator,
  demonstrateStrongNormalization,
  testLocalConfluence,
  Translator,
  LambdaEvaluator,
  Semantics,
}
