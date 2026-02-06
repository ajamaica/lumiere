/**
 * Abstraction Mechanisms for Distributed Sentience Network
 *
 * Implements Phase 3 of the Intelligence Scaling Plan:
 * - Fusion Discovery Engine: Actively search for valid prime triads
 * - Entanglement Reinforcement Learning: Hebbian-style strengthening
 *
 * These mechanisms enable emergent abstraction and richer conceptual hierarchies.
 */

const EventEmitter = require('events')

/**
 * Fusion Discovery Engine
 *
 * Actively searches for valid fusion triads (p + q + r = s where s is prime)
 * and rates them by semantic value. This enables the network to build
 * higher-level abstractions from primitive concepts.
 */
class FusionDiscoveryEngine extends EventEmitter {
  constructor(gmf, options = {}) {
    super()

    this.gmf = gmf
    this.searchDepth = options.searchDepth ?? 3
    this.maxCacheSize = options.maxCacheSize ?? 10000

    // Fusion cache: key -> FusionRecord
    this.fusionCache = new Map()

    // Discovered fusions sorted by score
    this.discoveredFusions = []

    // Prime cache for efficiency
    this.primeCache = new Set()
    this.maxPrimeToCheck = options.maxPrimeToCheck ?? 10000
    this.initPrimeCache()
  }

  /**
   * Initialize prime cache for fast primality checks
   */
  initPrimeCache() {
    // Sieve of Eratosthenes
    const sieve = new Array(this.maxPrimeToCheck + 1).fill(true)
    sieve[0] = sieve[1] = false

    for (let i = 2; i * i <= this.maxPrimeToCheck; i++) {
      if (sieve[i]) {
        for (let j = i * i; j <= this.maxPrimeToCheck; j += i) {
          sieve[j] = false
        }
      }
    }

    for (let i = 2; i <= this.maxPrimeToCheck; i++) {
      if (sieve[i]) {
        this.primeCache.add(i)
      }
    }
  }

  /**
   * Check if a number is prime
   */
  isPrime(n) {
    if (n < 2) return false
    if (n <= this.maxPrimeToCheck) {
      return this.primeCache.has(n)
    }

    // Miller-Rabin for larger numbers
    if (n % 2 === 0) return false

    let d = n - 1
    let r = 0
    while (d % 2 === 0) {
      d /= 2
      r++
    }

    const witnesses = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
    for (const a of witnesses) {
      if (a >= n) continue

      let x = this.modPow(a, d, n)
      if (x === 1 || x === n - 1) continue

      let continueWitness = false
      for (let i = 0; i < r - 1; i++) {
        x = this.modPow(x, 2, n)
        if (x === n - 1) {
          continueWitness = true
          break
        }
      }

      if (!continueWitness) return false
    }

    return true
  }

  /**
   * Modular exponentiation
   */
  modPow(base, exp, mod) {
    let result = 1n
    base = BigInt(base) % BigInt(mod)
    exp = BigInt(exp)
    mod = BigInt(mod)

    while (exp > 0n) {
      if (exp % 2n === 1n) {
        result = (result * base) % mod
      }
      exp = exp / 2n
      base = (base * base) % mod
    }

    return Number(result)
  }

  /**
   * Extract known primes from GMF
   */
  extractKnownPrimes() {
    const primes = new Set()

    if (!this.gmf || !this.gmf.objects) return Array.from(primes)

    for (const entry of this.gmf.objects.values()) {
      const term = entry.object?.term
      if (term) {
        // Atomic prime
        if (term.prime) primes.add(term.prime)

        // Fusion components
        if (term.p) primes.add(term.p)
        if (term.q) primes.add(term.q)
        if (term.r) primes.add(term.r)

        // Chain components
        if (term.nounPrime) primes.add(term.nounPrime)
        if (term.adjPrimes) {
          for (const p of term.adjPrimes) {
            primes.add(p)
          }
        }
      }
    }

    return Array.from(primes)
      .filter((p) => p > 1)
      .sort((a, b) => a - b)
  }

  /**
   * Discover all valid fusions from known primes
   */
  discoverFusions(additionalPrimes = []) {
    const knownPrimes = [...new Set([...this.extractKnownPrimes(), ...additionalPrimes])].sort(
      (a, b) => a - b,
    )

    const newFusions = []

    // Search for p + q + r = s where s is prime
    for (let i = 0; i < knownPrimes.length; i++) {
      for (let j = i + 1; j < knownPrimes.length; j++) {
        for (let k = j + 1; k < knownPrimes.length; k++) {
          const p = knownPrimes[i]
          const q = knownPrimes[j]
          const r = knownPrimes[k]
          const sum = p + q + r

          const key = `${p}+${q}+${r}`

          if (!this.fusionCache.has(key) && this.isPrime(sum)) {
            const fusion = {
              components: [p, q, r],
              result: sum,
              discoveredAt: Date.now(),
              useCount: 0,
              successCount: 0,
              score: 0,
            }

            // Calculate initial score
            fusion.score = this.rateFusion(fusion)

            this.fusionCache.set(key, fusion)
            newFusions.push(fusion)
          }
        }
      }
    }

    // Sort discovered fusions by score
    this.discoveredFusions = Array.from(this.fusionCache.values()).sort((a, b) => b.score - a.score)

    // Prune cache if too large
    if (this.fusionCache.size > this.maxCacheSize) {
      this.pruneCache()
    }

    if (newFusions.length > 0) {
      this.emit('fusions_discovered', newFusions)
    }

    return newFusions
  }

  /**
   * Rate a fusion by semantic value
   */
  rateFusion(fusion) {
    const [p, q, r] = fusion.components

    // 1. Component diversity: different magnitudes = richer meaning
    const magnitudeSpread = Math.log(r / p + 1) / Math.log(100)

    // 2. Result compactness: smaller results are more fundamental
    const compactness = 1 / Math.log(fusion.result + 1)

    // 3. Usage frequency: more used = more valuable
    const usageScore = Math.log(1 + fusion.useCount) / 10

    // 4. Success rate: fusions that lead to good outcomes
    const successRate = fusion.useCount > 0 ? fusion.successCount / fusion.useCount : 0.5

    // 5. Primality density: how close are components
    const avgGap = (q - p + (r - q)) / 2
    const densityScore = 1 / (1 + Math.log(avgGap + 1))

    // Weighted combination
    return (
      magnitudeSpread * 0.2 +
      compactness * 0.2 +
      usageScore * 0.25 +
      successRate * 0.25 +
      densityScore * 0.1
    )
  }

  /**
   * Get fusion for specific primes if it exists
   */
  getFusion(p, q, r) {
    const sorted = [p, q, r].sort((a, b) => a - b)
    const key = `${sorted[0]}+${sorted[1]}+${sorted[2]}`
    return this.fusionCache.get(key)
  }

  /**
   * Record usage of a fusion
   */
  recordUsage(p, q, r, success = true) {
    const fusion = this.getFusion(p, q, r)
    if (fusion) {
      fusion.useCount++
      if (success) fusion.successCount++
      fusion.score = this.rateFusion(fusion)
    }
  }

  /**
   * Suggest best fusions for current context
   */
  suggestFusions(smf = null, count = 5) {
    let fusions = this.discoveredFusions

    // If SMF provided, filter by relevance
    if (smf) {
      fusions = fusions
        .map((f) => ({
          ...f,
          contextScore: this.calculateContextRelevance(f, smf),
        }))
        .sort((a, b) => b.contextScore - a.contextScore)
    }

    return fusions.slice(0, count)
  }

  /**
   * Calculate context relevance based on SMF
   */
  calculateContextRelevance(fusion, smf) {
    // Map primes to SMF axes based on log2 position
    const primeToAxis = (p) => Math.floor(Math.log2(p)) % 16

    let relevance = 0
    for (const p of fusion.components) {
      const axis = primeToAxis(p)
      if (smf.s) {
        relevance += Math.abs(smf.s[axis])
      }
    }

    return (relevance / 3) * fusion.score
  }

  /**
   * Find fusions that produce a target prime
   */
  findFusionsProducing(targetPrime) {
    return this.discoveredFusions.filter((f) => f.result === targetPrime)
  }

  /**
   * Find fusions using a specific prime as component
   */
  findFusionsUsing(prime) {
    return this.discoveredFusions.filter((f) => f.components.includes(prime))
  }

  /**
   * Prune low-value fusions from cache
   */
  pruneCache() {
    // Sort by score and remove bottom 20%
    const sorted = Array.from(this.fusionCache.entries()).sort((a, b) => b[1].score - a[1].score)

    const keepCount = Math.floor(this.maxCacheSize * 0.8)

    for (let i = keepCount; i < sorted.length; i++) {
      this.fusionCache.delete(sorted[i][0])
    }

    this.discoveredFusions = sorted.slice(0, keepCount).map((e) => e[1])
  }

  /**
   * Get statistics
   */
  getStats() {
    const topFusions = this.discoveredFusions.slice(0, 10)

    return {
      totalFusions: this.fusionCache.size,
      totalUsage: this.discoveredFusions.reduce((sum, f) => sum + f.useCount, 0),
      avgScore:
        this.discoveredFusions.length > 0
          ? this.discoveredFusions.reduce((sum, f) => sum + f.score, 0) /
            this.discoveredFusions.length
          : 0,
      topFusions: topFusions.map((f) => ({
        components: f.components,
        result: f.result,
        score: f.score,
        useCount: f.useCount,
      })),
    }
  }

  toJSON() {
    return this.getStats()
  }
}

/**
 * Reinforced Entanglement Layer
 *
 * Extends EntanglementLayer with Hebbian learning:
 * - Strengthens frequently-used associations
 * - Weakens unused associations (decay)
 * - Tracks success/failure for quality assessment
 */
class ReinforcedEntanglementLayer extends EventEmitter {
  constructor(baseLayer, options = {}) {
    super()

    this.baseLayer = baseLayer
    this.learningRate = options.learningRate ?? 0.1
    this.decayRate = options.decayRate ?? 0.01
    this.minStrength = options.minStrength ?? 0.05
    this.maxStrength = options.maxStrength ?? 1.0

    // Usage tracking: pairKey -> UsageRecord
    this.usageTracker = new Map()

    // Decay timer
    this.decayInterval = options.decayInterval ?? 60000 // 1 minute
    this.lastDecay = Date.now()
  }

  /**
   * Create pair key for tracking
   */
  pairKey(prime1, prime2) {
    return `${Math.min(prime1, prime2)}-${Math.max(prime1, prime2)}`
  }

  /**
   * Reinforce an entanglement (Hebbian: "fire together, wire together")
   */
  reinforce(prime1, prime2, success = true) {
    const key = this.pairKey(prime1, prime2)

    // Initialize tracking if needed
    if (!this.usageTracker.has(key)) {
      this.usageTracker.set(key, {
        uses: 0,
        successes: 0,
        lastAccess: Date.now(),
      })
    }

    const tracker = this.usageTracker.get(key)
    tracker.uses++
    tracker.lastAccess = Date.now()
    if (success) tracker.successes++

    // Calculate success rate
    const successRate = tracker.successes / tracker.uses

    // Find and update entanglement strength
    const pair = this.findPair(prime1, prime2)
    if (pair) {
      // Strength update: positive for success, negative for failure
      const delta = success
        ? this.learningRate * successRate
        : -this.learningRate * (1 - successRate)

      const newStrength = Math.min(
        this.maxStrength,
        Math.max(this.minStrength, pair.strength + delta),
      )

      pair.strength = newStrength
      pair.accessCount = (pair.accessCount || 0) + 1
      pair.lastAccess = Date.now()

      this.emit('reinforcement', {
        prime1,
        prime2,
        success,
        newStrength,
        successRate,
      })
    }

    return tracker
  }

  /**
   * Find entanglement pair
   */
  findPair(prime1, prime2) {
    if (!this.baseLayer.entanglementGraph) return null

    const neighbors = this.baseLayer.entanglementGraph.get(prime1)
    if (!neighbors) return null

    return neighbors.get(prime2)
  }

  /**
   * Apply periodic decay (Hebbian: "use it or lose it")
   */
  periodicDecay() {
    const now = Date.now()

    if (now - this.lastDecay < this.decayInterval) {
      return { decayed: 0, pruned: 0 }
    }

    this.lastDecay = now
    let decayed = 0
    let pruned = 0

    if (!this.baseLayer.entanglementGraph) {
      return { decayed, pruned }
    }

    const toPrune = []

    for (const [prime, neighbors] of this.baseLayer.entanglementGraph) {
      for (const [otherPrime, pair] of neighbors) {
        const key = this.pairKey(prime, otherPrime)
        const tracker = this.usageTracker.get(key)

        // Decay if not recently accessed
        const idleTime = now - (pair.lastAccess || pair.formationTime || 0)
        const idleThreshold = 60000 // 1 minute

        if (idleTime > idleThreshold) {
          pair.strength *= 1 - this.decayRate
          decayed++

          // Mark for pruning if too weak
          if (pair.strength < this.minStrength) {
            toPrune.push({ prime, otherPrime })
          }
        }
      }
    }

    // Prune weak entanglements
    for (const { prime, otherPrime } of toPrune) {
      this.removeEntanglement(prime, otherPrime)
      pruned++
    }

    if (decayed > 0 || pruned > 0) {
      this.emit('decay_applied', { decayed, pruned })
    }

    return { decayed, pruned }
  }

  /**
   * Remove an entanglement
   */
  removeEntanglement(prime1, prime2) {
    if (!this.baseLayer.entanglementGraph) return

    const neighbors1 = this.baseLayer.entanglementGraph.get(prime1)
    const neighbors2 = this.baseLayer.entanglementGraph.get(prime2)

    if (neighbors1) neighbors1.delete(prime2)
    if (neighbors2) neighbors2.delete(prime1)

    // Clean up tracking
    const key = this.pairKey(prime1, prime2)
    this.usageTracker.delete(key)
  }

  /**
   * Find optimal path using reinforced strengths
   */
  findReinforcedPath(start, end, maxHops = 10) {
    if (!this.baseLayer.entanglementGraph) return null

    const visited = new Map()
    const queue = [
      {
        prime: start,
        path: [start],
        totalStrength: 1.0,
      },
    ]

    while (queue.length > 0) {
      // Sort by total strength (strongest paths first)
      queue.sort((a, b) => b.totalStrength - a.totalStrength)
      const { prime, path, totalStrength } = queue.shift()

      if (prime === end) {
        return {
          path,
          strength: totalStrength,
          hops: path.length - 1,
        }
      }

      if (path.length > maxHops) continue
      if (visited.has(prime) && visited.get(prime) >= totalStrength) continue

      visited.set(prime, totalStrength)

      const neighbors = this.baseLayer.entanglementGraph.get(prime)
      if (!neighbors) continue

      for (const [neighbor, pair] of neighbors) {
        if (!path.includes(neighbor)) {
          queue.push({
            prime: neighbor,
            path: [...path, neighbor],
            totalStrength: totalStrength * pair.strength,
          })
        }
      }
    }

    return null
  }

  /**
   * Get entanglement quality metrics
   */
  getQualityMetrics() {
    const metrics = {
      totalPairs: 0,
      avgStrength: 0,
      avgSuccessRate: 0,
      strongPairs: 0, // strength > 0.7
      weakPairs: 0, // strength < 0.3
      totalUsage: 0,
    }

    if (!this.baseLayer.entanglementGraph) return metrics

    const seen = new Set()
    let totalStrength = 0
    let totalSuccessRate = 0
    let pairsWithUsage = 0

    for (const [prime, neighbors] of this.baseLayer.entanglementGraph) {
      for (const [otherPrime, pair] of neighbors) {
        const key = this.pairKey(prime, otherPrime)
        if (seen.has(key)) continue
        seen.add(key)

        metrics.totalPairs++
        totalStrength += pair.strength

        if (pair.strength > 0.7) metrics.strongPairs++
        if (pair.strength < 0.3) metrics.weakPairs++

        const tracker = this.usageTracker.get(key)
        if (tracker && tracker.uses > 0) {
          totalSuccessRate += tracker.successes / tracker.uses
          metrics.totalUsage += tracker.uses
          pairsWithUsage++
        }
      }
    }

    if (metrics.totalPairs > 0) {
      metrics.avgStrength = totalStrength / metrics.totalPairs
    }
    if (pairsWithUsage > 0) {
      metrics.avgSuccessRate = totalSuccessRate / pairsWithUsage
    }

    return metrics
  }

  /**
   * Get top reinforced pairs
   */
  getTopPairs(count = 10) {
    const pairs = []
    const seen = new Set()

    if (!this.baseLayer.entanglementGraph) return pairs

    for (const [prime, neighbors] of this.baseLayer.entanglementGraph) {
      for (const [otherPrime, pair] of neighbors) {
        const key = this.pairKey(prime, otherPrime)
        if (seen.has(key)) continue
        seen.add(key)

        const tracker = this.usageTracker.get(key)
        pairs.push({
          primes: [prime, otherPrime],
          strength: pair.strength,
          uses: tracker?.uses || 0,
          successRate: tracker && tracker.uses > 0 ? tracker.successes / tracker.uses : 0.5,
        })
      }
    }

    return pairs.sort((a, b) => b.strength - a.strength).slice(0, count)
  }

  getStats() {
    return {
      metrics: this.getQualityMetrics(),
      topPairs: this.getTopPairs(5),
      learningRate: this.learningRate,
      decayRate: this.decayRate,
    }
  }

  toJSON() {
    return this.getStats()
  }
}

/**
 * Calculate abstraction level for a network
 * Higher = more compound/fusion terms relative to atomic
 */
function calculateAbstractionLevel(gmf) {
  if (!gmf || !gmf.objects) return 0

  let atomic = 0
  let compound = 0
  let fusion = 0
  let chain = 0

  for (const entry of gmf.objects.values()) {
    const term = entry.object?.term
    if (!term) continue

    if (term.type === 'fusion' || (term.p && term.q && term.r)) {
      fusion++
    } else if (term.type === 'chain' || (term.nounPrime && term.adjPrimes)) {
      chain++
    } else if (term.type === 'application' || term.func) {
      compound++
    } else {
      atomic++
    }
  }

  const total = atomic + compound + fusion + chain
  if (total === 0) return 0

  // Abstraction level = non-atomic terms / total
  return (compound + fusion + chain) / total
}

/**
 * Calculate reasoning depth from entanglement layer
 * Maximum chain length in the entanglement graph
 */
function calculateReasoningDepth(entanglementLayer, sampleSize = 20) {
  if (!entanglementLayer || !entanglementLayer.entanglementGraph) return 0

  const primes = Array.from(entanglementLayer.entanglementGraph.keys())
  if (primes.length < 2) return 0

  // Sample random pairs and find paths
  let maxDepth = 0
  const samples = Math.min(sampleSize, (primes.length * (primes.length - 1)) / 2)

  for (let i = 0; i < samples; i++) {
    const idx1 = Math.floor(Math.random() * primes.length)
    let idx2 = Math.floor(Math.random() * primes.length)
    while (idx2 === idx1 && primes.length > 1) {
      idx2 = Math.floor(Math.random() * primes.length)
    }

    const chain = entanglementLayer.findChain(primes[idx1], primes[idx2], 20)
    if (chain && chain.length - 1 > maxDepth) {
      maxDepth = chain.length - 1
    }
  }

  return maxDepth
}

module.exports = {
  FusionDiscoveryEngine,
  ReinforcedEntanglementLayer,
  calculateAbstractionLevel,
  calculateReasoningDepth,
}
