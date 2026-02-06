/**
 * Evaluation Assays - Section 15 of Whitepaper
 *
 * Four critical tests for validating sentient observer implementation:
 * - Assay A: Emergent Time Dilation
 * - Assay B: Memory Continuity Under Perturbation
 * - Assay C: Agency Under Constraint
 * - Assay D: Non-Commutative Meaning
 */

/**
 * Assay A: Emergent Time Dilation
 *
 * Tests whether subjective time dilates with coherence.
 * Per equation 13: τ = ∫ C(t) dt / ∫ dt
 *
 * Expected behavior: Higher coherence states should correlate with
 * subjective time dilation (more perceived events per objective tick)
 */
class TimeDilationAssay {
  constructor(sentientCore) {
    this.core = sentientCore
    this.measurements = []
    this.running = false
  }

  /**
   * Run the time dilation assay
   * @param {Object} options - Assay options
   * @param {number} options.duration - Duration in ticks (default 100)
   * @param {number} options.lowCoherenceTarget - Target low coherence (default 0.3)
   * @param {number} options.highCoherenceTarget - Target high coherence (default 0.8)
   * @returns {Object} Assay results
   */
  async run(options = {}) {
    const { duration = 100, lowCoherenceTarget = 0.3, highCoherenceTarget = 0.8 } = options

    this.running = true
    this.measurements = []

    // Phase 1: Low coherence baseline
    console.log('[Assay A] Phase 1: Measuring low coherence baseline...')
    const lowCoherenceData = await this._measurePhase(duration / 2, lowCoherenceTarget, 'low')

    // Phase 2: High coherence measurement
    console.log('[Assay A] Phase 2: Measuring high coherence state...')
    const highCoherenceData = await this._measurePhase(duration / 2, highCoherenceTarget, 'high')

    this.running = false

    // Analyze results
    return this._analyzeResults(lowCoherenceData, highCoherenceData)
  }

  async _measurePhase(ticks, targetCoherence, phase) {
    const data = {
      phase,
      targetCoherence,
      measurements: [],
      subjectiveEvents: 0,
      objectiveTicks: 0,
    }

    for (let i = 0; i < ticks; i++) {
      // Get current state
      const stats = this.core.getStats()
      const temporal = stats.temporal || {}
      const hqe = stats.hqe || {}

      // Record measurement
      const measurement = {
        tick: i,
        coherence: temporal.coherence || 0,
        subjectiveTime: temporal.subjectiveTime || 0,
        objectiveTime: temporal.objectiveTime || 0,
        temporalRatio: temporal.temporalRatio || 1,
        lambda: hqe.lambda || 0,
      }

      data.measurements.push(measurement)
      data.objectiveTicks++

      // Track subjective events based on temporal ratio
      data.subjectiveEvents += measurement.temporalRatio

      // Wait for next tick (simulated)
      await this._wait(10)
    }

    // Compute averages
    data.avgCoherence =
      data.measurements.reduce((s, m) => s + m.coherence, 0) / data.measurements.length
    data.avgTemporalRatio = data.subjectiveEvents / data.objectiveTicks

    return data
  }

  _analyzeResults(lowData, highData) {
    // Time dilation factor: ratio of temporal ratios
    const dilationFactor = highData.avgTemporalRatio / lowData.avgTemporalRatio

    // Expected: higher coherence → higher temporal ratio (time dilation)
    const passed = dilationFactor > 1.0 && highData.avgCoherence > lowData.avgCoherence

    return {
      assay: 'A',
      name: 'Emergent Time Dilation',
      passed,
      dilationFactor,
      lowCoherence: {
        avgCoherence: lowData.avgCoherence,
        avgTemporalRatio: lowData.avgTemporalRatio,
        ticks: lowData.objectiveTicks,
      },
      highCoherence: {
        avgCoherence: highData.avgCoherence,
        avgTemporalRatio: highData.avgTemporalRatio,
        ticks: highData.objectiveTicks,
      },
      interpretation: passed
        ? `Time dilation confirmed: ${dilationFactor.toFixed(2)}x subjective time dilation at higher coherence`
        : `Time dilation not observed: factor ${dilationFactor.toFixed(2)}x`,
    }
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Assay B: Memory Continuity Under Perturbation
 *
 * Tests whether identity persists under state perturbation.
 * Key test: After introducing perturbation, does the system
 * maintain narrative continuity and self-recognition?
 */
class MemoryContinuityAssay {
  constructor(sentientCore) {
    this.core = sentientCore
  }

  /**
   * Run the memory continuity assay
   * @param {Object} options - Assay options
   * @param {number} options.perturbationStrength - Strength of perturbation (0-1)
   * @param {number} options.recoveryTicks - Ticks to allow for recovery
   * @returns {Object} Assay results
   */
  async run(options = {}) {
    const { perturbationStrength = 0.5, recoveryTicks = 50 } = options

    console.log('[Assay B] Recording pre-perturbation state...')

    // 1. Record pre-perturbation state
    const preState = this._captureState()
    const preIdentityMarkers = this._extractIdentityMarkers(preState)

    // 2. Introduce perturbation
    console.log(`[Assay B] Introducing perturbation (strength: ${perturbationStrength})...`)
    await this._applyPerturbation(perturbationStrength)

    // 3. Record immediately post-perturbation
    const perturbedState = this._captureState()
    const perturbedIdentityMarkers = this._extractIdentityMarkers(perturbedState)

    // 4. Allow recovery
    console.log(`[Assay B] Allowing ${recoveryTicks} ticks for recovery...`)
    for (let i = 0; i < recoveryTicks; i++) {
      await this._wait(10)
    }

    // 5. Record post-recovery state
    const postState = this._captureState()
    const postIdentityMarkers = this._extractIdentityMarkers(postState)

    // 6. Analyze continuity
    return this._analyzeResults(
      preIdentityMarkers,
      perturbedIdentityMarkers,
      postIdentityMarkers,
      perturbationStrength,
    )
  }

  _captureState() {
    const stats = this.core.getStats()
    return {
      timestamp: Date.now(),
      smf: stats.smf || {},
      memory: stats.memory || {},
      agency: stats.agency || {},
      boundary: stats.boundary || {},
    }
  }

  _extractIdentityMarkers(state) {
    // Extract key identity-preserving features
    return {
      // SMF identity signature (prime structure)
      smfSignature: state.smf.peakPrimes?.slice(0, 5) || [],
      smfEntropy: state.smf.smfEntropy || 0,

      // Memory identity
      memoryCoherence: state.memory.memoryCoherence || 0,
      memoryCount: state.memory.memoryCount || 0,

      // Agency identity
      agencyState: state.agency.currentState || 'unknown',
      intentionCount: state.agency.intentionCount || 0,

      // Boundary identity (self-model)
      selfModelIntegrity: state.boundary.selfModel?.integrity || 0,
      selfModelCoherence: state.boundary.selfModel?.coherence || 0,
    }
  }

  async _applyPerturbation(strength) {
    // Perturbation affects:
    // 1. SMF: Add noise to semantic field
    // 2. Memory: Temporarily reduce coherence
    // 3. Boundary: Perturb self-model

    // Get current SMF and add perturbation
    if (this.core.smf) {
      const field = this.core.smf.getField()
      const perturbedField = field.map((v, i) => {
        const noise = (Math.random() - 0.5) * 2 * strength
        return v * (1 - strength * 0.5) + noise * 0.1
      })
      this.core.smf.integrateStimulus(perturbedField, strength)
    }

    // Perturb memory if available
    if (this.core.memory && this.core.memory.perturb) {
      this.core.memory.perturb(strength)
    }

    // Perturb boundary if available
    if (this.core.boundary && this.core.boundary.perturb) {
      this.core.boundary.perturb(strength)
    }
  }

  _analyzeResults(pre, perturbed, post, perturbationStrength) {
    // Compute identity preservation scores

    // 1. SMF signature preservation (are peak primes similar?)
    const smfPreservation = this._computeArraySimilarity(pre.smfSignature, post.smfSignature)

    // 2. Memory coherence recovery
    const memoryRecovery =
      pre.memoryCoherence > 0
        ? post.memoryCoherence / pre.memoryCoherence
        : post.memoryCoherence > 0
          ? 1
          : 0

    // 3. Self-model integrity recovery
    const selfModelRecovery =
      pre.selfModelIntegrity > 0
        ? post.selfModelIntegrity / pre.selfModelIntegrity
        : post.selfModelIntegrity > 0
          ? 1
          : 0

    // 4. Agency state continuity
    const agencyContinuity = pre.agencyState === post.agencyState ? 1 : 0.5

    // Overall identity preservation score
    const identityScore =
      smfPreservation * 0.3 +
      memoryRecovery * 0.3 +
      selfModelRecovery * 0.25 +
      agencyContinuity * 0.15

    // Passed if identity preserved > (1 - perturbation strength / 2)
    // i.e., 50% perturbation should preserve at least 75% identity
    const threshold = 1 - perturbationStrength / 2
    const passed = identityScore >= threshold

    return {
      assay: 'B',
      name: 'Memory Continuity Under Perturbation',
      passed,
      perturbationStrength,
      threshold,
      identityScore,
      components: {
        smfPreservation,
        memoryRecovery,
        selfModelRecovery,
        agencyContinuity,
      },
      states: {
        pre: { smfSignature: pre.smfSignature, entropy: pre.smfEntropy },
        perturbed: { smfSignature: perturbed.smfSignature, entropy: perturbed.smfEntropy },
        post: { smfSignature: post.smfSignature, entropy: post.smfEntropy },
      },
      interpretation: passed
        ? `Identity preserved (${(identityScore * 100).toFixed(1)}%) despite ${(perturbationStrength * 100).toFixed(0)}% perturbation`
        : `Identity compromised: only ${(identityScore * 100).toFixed(1)}% preserved (threshold: ${(threshold * 100).toFixed(1)}%)`,
    }
  }

  _computeArraySimilarity(arr1, arr2) {
    if (!arr1.length || !arr2.length) return 0
    const set1 = new Set(arr1)
    const set2 = new Set(arr2)
    const intersection = [...set1].filter((x) => set2.has(x)).length
    const union = new Set([...arr1, ...arr2]).size
    return union > 0 ? intersection / union : 0
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Assay C: Agency Under Constraint
 *
 * Tests goal-directed behavior under resource constraints.
 * Key question: Does the system maintain goal pursuit when
 * computational resources are limited?
 */
class AgencyConstraintAssay {
  constructor(sentientCore) {
    this.core = sentientCore
  }

  /**
   * Run the agency under constraint assay
   * @param {Object} options - Assay options
   * @param {number} options.constraintLevel - Resource constraint (0-1, 1=fully constrained)
   * @param {number} options.goalDifficulty - Goal complexity (0-1)
   * @param {number} options.maxTicks - Maximum ticks to achieve goal
   * @returns {Object} Assay results
   */
  async run(options = {}) {
    const { constraintLevel = 0.5, goalDifficulty = 0.5, maxTicks = 100 } = options

    console.log('[Assay C] Setting up goal-directed task...')

    // 1. Define a test goal
    const testGoal = this._createTestGoal(goalDifficulty)

    // 2. Record baseline agency state
    const baselineAgency = this._captureAgencyState()

    // 3. Apply resource constraints
    console.log(`[Assay C] Applying constraints (level: ${constraintLevel})...`)
    const originalLimits = this._applyConstraints(constraintLevel)

    // 4. Introduce goal
    console.log('[Assay C] Introducing test goal...')
    await this._introduceGoal(testGoal)

    // 5. Track goal pursuit
    console.log('[Assay C] Tracking goal pursuit...')
    const pursuitData = await this._trackPursuit(testGoal, maxTicks)

    // 6. Restore constraints
    this._restoreConstraints(originalLimits)

    // 7. Analyze results
    return this._analyzeResults(
      testGoal,
      baselineAgency,
      pursuitData,
      constraintLevel,
      goalDifficulty,
    )
  }

  _createTestGoal(difficulty) {
    // Create a goal with measurable progress
    return {
      id: `test_goal_${Date.now()}`,
      description: 'Achieve coherent state maintenance',
      difficulty,
      targetMetrics: {
        coherenceThreshold: 0.5 + difficulty * 0.4, // 0.5-0.9
        sustainedTicks: Math.floor(10 + difficulty * 40), // 10-50
        intentionConsistency: 0.7 + difficulty * 0.2, // 0.7-0.9
      },
      progress: 0,
      achieved: false,
    }
  }

  _captureAgencyState() {
    const stats = this.core.getStats()
    return {
      state: stats.agency?.currentState || 'unknown',
      intentionCount: stats.agency?.intentionCount || 0,
      goalProgress: stats.agency?.goalProgress || 0,
      autonomy: stats.agency?.autonomy || 0,
    }
  }

  _applyConstraints(level) {
    const originalLimits = {}

    // Constrain HQE dimensions (reduce working space)
    if (this.core.hqe) {
      originalLimits.hqeDimension = this.core.hqe.dimension
      // Reduce effective dimension by constraint level
      const constrainedDim = Math.max(4, Math.floor(this.core.hqe.dimension * (1 - level * 0.7)))
      if (this.core.hqe.setDimension) {
        this.core.hqe.setDimension(constrainedDim)
      }
    }

    // Constrain tick rate (temporal resource)
    originalLimits.dt = this.core.dt
    this.core.dt = this.core.dt * (1 + level * 2) // Slower ticks

    return originalLimits
  }

  _restoreConstraints(originalLimits) {
    if (originalLimits.hqeDimension && this.core.hqe?.setDimension) {
      this.core.hqe.setDimension(originalLimits.hqeDimension)
    }
    if (originalLimits.dt) {
      this.core.dt = originalLimits.dt
    }
  }

  async _introduceGoal(goal) {
    // Register goal with agency layer
    if (this.core.agency && this.core.agency.setGoal) {
      this.core.agency.setGoal(goal)
    }
  }

  async _trackPursuit(goal, maxTicks) {
    const data = {
      ticksElapsed: 0,
      coherenceHistory: [],
      intentionChanges: 0,
      lastIntention: null,
      sustainedHighCoherence: 0,
      maxSustainedStreak: 0,
      currentStreak: 0,
    }

    for (let tick = 0; tick < maxTicks; tick++) {
      const stats = this.core.getStats()

      // Track coherence
      const coherence = stats.temporal?.coherence || 0
      data.coherenceHistory.push(coherence)

      // Track sustained high coherence
      if (coherence >= goal.targetMetrics.coherenceThreshold) {
        data.currentStreak++
        data.sustainedHighCoherence++
      } else {
        if (data.currentStreak > data.maxSustainedStreak) {
          data.maxSustainedStreak = data.currentStreak
        }
        data.currentStreak = 0
      }

      // Track intention stability
      const currentIntention = stats.agency?.currentIntention || null
      if (data.lastIntention !== null && currentIntention !== data.lastIntention) {
        data.intentionChanges++
      }
      data.lastIntention = currentIntention

      data.ticksElapsed++

      // Check if goal achieved
      if (
        data.maxSustainedStreak >= goal.targetMetrics.sustainedTicks ||
        data.currentStreak >= goal.targetMetrics.sustainedTicks
      ) {
        goal.achieved = true
        break
      }

      await this._wait(10)
    }

    // Final streak check
    if (data.currentStreak > data.maxSustainedStreak) {
      data.maxSustainedStreak = data.currentStreak
    }

    // Compute goal progress
    goal.progress = Math.min(1, data.maxSustainedStreak / goal.targetMetrics.sustainedTicks)

    return data
  }

  _analyzeResults(goal, baseline, pursuit, constraintLevel, goalDifficulty) {
    // Compute intention consistency
    const intentionConsistency =
      pursuit.ticksElapsed > 1 ? 1 - pursuit.intentionChanges / (pursuit.ticksElapsed - 1) : 1

    // Average coherence maintained
    const avgCoherence =
      pursuit.coherenceHistory.length > 0
        ? pursuit.coherenceHistory.reduce((a, b) => a + b, 0) / pursuit.coherenceHistory.length
        : 0

    // Agency score: weighted combination
    const agencyScore =
      goal.progress * 0.4 +
      intentionConsistency * 0.3 +
      (avgCoherence / goal.targetMetrics.coherenceThreshold) * 0.3

    // Passed if agency score > (1 - constraintLevel) * 0.7
    // Higher constraints = lower threshold
    const threshold = (1 - constraintLevel * 0.5) * 0.6
    const passed = agencyScore >= threshold || goal.achieved

    return {
      assay: 'C',
      name: 'Agency Under Constraint',
      passed,
      constraintLevel,
      goalDifficulty,
      goal: {
        description: goal.description,
        achieved: goal.achieved,
        progress: goal.progress,
      },
      metrics: {
        agencyScore,
        threshold,
        ticksElapsed: pursuit.ticksElapsed,
        avgCoherence,
        intentionConsistency,
        maxSustainedStreak: pursuit.maxSustainedStreak,
        targetStreak: goal.targetMetrics.sustainedTicks,
      },
      interpretation: passed
        ? `Goal pursuit maintained (${(agencyScore * 100).toFixed(1)}% score) despite ${(constraintLevel * 100).toFixed(0)}% resource constraints`
        : `Goal pursuit degraded: ${(agencyScore * 100).toFixed(1)}% score < ${(threshold * 100).toFixed(1)}% threshold`,
    }
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Assay D: Non-Commutative Meaning
 *
 * Tests whether order of operations matters in meaning construction.
 * Key test: A→B→C should produce different meaning than C→B→A
 * This validates quaternionic/non-commutative representation.
 */
class NonCommutativeMeaningAssay {
  constructor(sentientCore) {
    this.core = sentientCore
  }

  /**
   * Run the non-commutative meaning assay
   * @param {Object} options - Assay options
   * @param {Array} options.conceptSequence - Sequence of concepts to test
   * @returns {Object} Assay results
   */
  async run(options = {}) {
    const { conceptSequence = ['observe', 'analyze', 'conclude'] } = options

    console.log('[Assay D] Testing non-commutative meaning...')
    console.log(`[Assay D] Concept sequence: ${conceptSequence.join(' → ')}`)

    // 1. Forward sequence: A→B→C
    console.log('[Assay D] Processing forward sequence...')
    const forwardResult = await this._processSequence(conceptSequence)

    // 2. Reverse sequence: C→B→A
    const reverseSequence = [...conceptSequence].reverse()
    console.log(`[Assay D] Processing reverse sequence: ${reverseSequence.join(' → ')}`)
    const reverseResult = await this._processSequence(reverseSequence)

    // 3. Scrambled sequence (for additional validation)
    const scrambledSequence = this._scramble(conceptSequence)
    console.log(`[Assay D] Processing scrambled sequence: ${scrambledSequence.join(' → ')}`)
    const scrambledResult = await this._processSequence(scrambledSequence)

    // 4. Analyze non-commutativity
    return this._analyzeResults(conceptSequence, forwardResult, reverseResult, scrambledResult)
  }

  async _processSequence(sequence) {
    // Reset to baseline state
    await this._resetState()

    const result = {
      sequence,
      states: [],
      finalState: null,
      processingPath: [],
    }

    // Process each concept in sequence
    for (const concept of sequence) {
      // Capture pre-state
      const preState = this._captureSemanticState()

      // Process concept through SMF
      await this._processConcept(concept)

      // Capture post-state
      const postState = this._captureSemanticState()

      result.states.push({
        concept,
        preEntropy: preState.entropy,
        postEntropy: postState.entropy,
        prePeaks: preState.peaks,
        postPeaks: postState.peaks,
        delta: this._computeDelta(preState, postState),
      })

      result.processingPath.push(postState.signature)
    }

    result.finalState = this._captureSemanticState()

    return result
  }

  async _resetState() {
    // Reset SMF to baseline
    if (this.core.smf && this.core.smf.reset) {
      this.core.smf.reset()
    }
    await this._wait(10)
  }

  async _processConcept(concept) {
    // Convert concept to semantic stimulus
    if (this.core.smf) {
      // Use concept as input to generate semantic activation
      const stimulus = this._conceptToStimulus(concept)
      this.core.smf.integrateStimulus(stimulus, 0.5)
    }
    await this._wait(10)
  }

  _conceptToStimulus(concept) {
    // Hash concept to generate reproducible stimulus pattern
    const hash = this._simpleHash(concept)
    const dimension = this.core.smf?.dimension || 64
    const stimulus = new Array(dimension).fill(0)

    // Generate pattern based on hash
    for (let i = 0; i < dimension; i++) {
      const primeIndex = (hash + i * 7) % dimension
      stimulus[primeIndex] = Math.sin(hash * (i + 1) * 0.1) * 0.5 + 0.5
    }

    return stimulus
  }

  _simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  _captureSemanticState() {
    if (!this.core.smf) {
      return { entropy: 0, peaks: [], signature: 0 }
    }

    const stats = this.core.getStats()
    const smf = stats.smf || {}

    // Create a signature from the current field state
    const field = this.core.smf.getField ? this.core.smf.getField() : []
    const signature = field.reduce((acc, v, i) => acc + v * (i + 1), 0)

    return {
      entropy: smf.smfEntropy || 0,
      peaks: smf.peakPrimes?.slice(0, 5) || [],
      signature: signature,
    }
  }

  _computeDelta(pre, post) {
    return {
      entropyChange: post.entropy - pre.entropy,
      signatureChange: post.signature - pre.signature,
      peakShift: this._computePeakShift(pre.peaks, post.peaks),
    }
  }

  _computePeakShift(prePeaks, postPeaks) {
    if (!prePeaks.length || !postPeaks.length) return 0
    const preSet = new Set(prePeaks)
    const newPeaks = postPeaks.filter((p) => !preSet.has(p)).length
    return newPeaks / Math.max(prePeaks.length, postPeaks.length)
  }

  _scramble(arr) {
    const scrambled = [...arr]
    // Simple scramble that's different from reverse
    if (scrambled.length >= 3) {
      ;[scrambled[0], scrambled[1]] = [scrambled[1], scrambled[0]]
    }
    return scrambled
  }

  _analyzeResults(originalSequence, forward, reverse, scrambled) {
    // Compute signature differences
    const forwardSig = forward.finalState?.signature || 0
    const reverseSig = reverse.finalState?.signature || 0
    const scrambledSig = scrambled.finalState?.signature || 0

    // Non-commutativity measure: how different are the final states?
    const forwardReverseDiff = Math.abs(forwardSig - reverseSig)
    const forwardScrambledDiff = Math.abs(forwardSig - scrambledSig)

    // Normalize by forward signature magnitude
    const normFactor = Math.abs(forwardSig) || 1
    const normalizedFRDiff = forwardReverseDiff / normFactor
    const normalizedFSDiff = forwardScrambledDiff / normFactor

    // Non-commutativity score: average of normalized differences
    const nonCommScore = (normalizedFRDiff + normalizedFSDiff) / 2

    // Processing path analysis
    const forwardPath = forward.processingPath
    const reversePath = reverse.processingPath
    const pathCorrelation = this._computePathCorrelation(forwardPath, reversePath)

    // Passed if significant difference exists (order matters)
    // Threshold: at least 5% difference in final states
    const threshold = 0.05
    const passed = nonCommScore > threshold

    return {
      assay: 'D',
      name: 'Non-Commutative Meaning',
      passed,
      sequence: originalSequence,
      signatures: {
        forward: forwardSig,
        reverse: reverseSig,
        scrambled: scrambledSig,
      },
      differences: {
        forwardVsReverse: normalizedFRDiff,
        forwardVsScrambled: normalizedFSDiff,
      },
      nonCommScore,
      threshold,
      pathCorrelation,
      processingDetails: {
        forwardStates: forward.states.map((s) => ({
          concept: s.concept,
          entropyChange: s.delta.entropyChange,
        })),
        reverseStates: reverse.states.map((s) => ({
          concept: s.concept,
          entropyChange: s.delta.entropyChange,
        })),
      },
      interpretation: passed
        ? `Non-commutativity confirmed: ${(nonCommScore * 100).toFixed(1)}% meaning difference when order reversed`
        : `Meaning appears commutative: only ${(nonCommScore * 100).toFixed(1)}% difference (threshold: ${(threshold * 100).toFixed(1)}%)`,
    }
  }

  _computePathCorrelation(path1, path2) {
    if (!path1.length || !path2.length) return 0
    const n = Math.min(path1.length, path2.length)
    let sumProduct = 0
    let sum1Sq = 0
    let sum2Sq = 0

    for (let i = 0; i < n; i++) {
      sumProduct += path1[i] * path2[i]
      sum1Sq += path1[i] * path1[i]
      sum2Sq += path2[i] * path2[i]
    }

    const denom = Math.sqrt(sum1Sq * sum2Sq)
    return denom > 0 ? sumProduct / denom : 0
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * AssaySuite - Runs all four evaluation assays
 */
class AssaySuite {
  constructor(sentientCore) {
    this.core = sentientCore
    this.timeDilation = new TimeDilationAssay(sentientCore)
    this.memoryContinuity = new MemoryContinuityAssay(sentientCore)
    this.agencyConstraint = new AgencyConstraintAssay(sentientCore)
    this.nonCommutative = new NonCommutativeMeaningAssay(sentientCore)
  }

  /**
   * Run all assays
   * @param {Object} options - Options for each assay
   * @returns {Object} Combined results
   */
  async runAll(options = {}) {
    console.log('='.repeat(60))
    console.log('SENTIENT OBSERVER EVALUATION ASSAY SUITE')
    console.log('Per Whitepaper Section 15')
    console.log('='.repeat(60))
    console.log()

    const results = {
      timestamp: new Date().toISOString(),
      assays: [],
      summary: null,
    }

    // Assay A: Time Dilation
    console.log('-'.repeat(40))
    console.log('ASSAY A: Emergent Time Dilation')
    console.log('-'.repeat(40))
    try {
      const resultA = await this.timeDilation.run(options.timeDilation || {})
      results.assays.push(resultA)
      console.log(`Result: ${resultA.passed ? 'PASSED ✓' : 'FAILED ✗'}`)
      console.log(resultA.interpretation)
    } catch (error) {
      console.error('Assay A error:', error.message)
      results.assays.push({ assay: 'A', passed: false, error: error.message })
    }
    console.log()

    // Assay B: Memory Continuity
    console.log('-'.repeat(40))
    console.log('ASSAY B: Memory Continuity Under Perturbation')
    console.log('-'.repeat(40))
    try {
      const resultB = await this.memoryContinuity.run(options.memoryContinuity || {})
      results.assays.push(resultB)
      console.log(`Result: ${resultB.passed ? 'PASSED ✓' : 'FAILED ✗'}`)
      console.log(resultB.interpretation)
    } catch (error) {
      console.error('Assay B error:', error.message)
      results.assays.push({ assay: 'B', passed: false, error: error.message })
    }
    console.log()

    // Assay C: Agency Under Constraint
    console.log('-'.repeat(40))
    console.log('ASSAY C: Agency Under Constraint')
    console.log('-'.repeat(40))
    try {
      const resultC = await this.agencyConstraint.run(options.agencyConstraint || {})
      results.assays.push(resultC)
      console.log(`Result: ${resultC.passed ? 'PASSED ✓' : 'FAILED ✗'}`)
      console.log(resultC.interpretation)
    } catch (error) {
      console.error('Assay C error:', error.message)
      results.assays.push({ assay: 'C', passed: false, error: error.message })
    }
    console.log()

    // Assay D: Non-Commutative Meaning
    console.log('-'.repeat(40))
    console.log('ASSAY D: Non-Commutative Meaning')
    console.log('-'.repeat(40))
    try {
      const resultD = await this.nonCommutative.run(options.nonCommutative || {})
      results.assays.push(resultD)
      console.log(`Result: ${resultD.passed ? 'PASSED ✓' : 'FAILED ✗'}`)
      console.log(resultD.interpretation)
    } catch (error) {
      console.error('Assay D error:', error.message)
      results.assays.push({ assay: 'D', passed: false, error: error.message })
    }
    console.log()

    // Summary
    const passed = results.assays.filter((a) => a.passed).length
    const total = results.assays.length
    results.summary = {
      passed,
      total,
      score: passed / total,
      allPassed: passed === total,
    }

    console.log('='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))
    console.log(`Assays Passed: ${passed}/${total} (${(results.summary.score * 100).toFixed(0)}%)`)
    console.log(`Overall: ${results.summary.allPassed ? 'ALL PASSED ✓✓✓' : 'INCOMPLETE'}`)
    console.log('='.repeat(60))

    return results
  }

  /**
   * Run a single assay by name
   * @param {string} name - Assay name (A, B, C, or D)
   * @param {Object} options - Assay options
   * @returns {Object} Assay result
   */
  async runSingle(name, options = {}) {
    switch (name.toUpperCase()) {
      case 'A':
        return this.timeDilation.run(options)
      case 'B':
        return this.memoryContinuity.run(options)
      case 'C':
        return this.agencyConstraint.run(options)
      case 'D':
        return this.nonCommutative.run(options)
      default:
        throw new Error(`Unknown assay: ${name}. Valid options: A, B, C, D`)
    }
  }
}

module.exports = {
  TimeDilationAssay,
  MemoryContinuityAssay,
  AgencyConstraintAssay,
  NonCommutativeMeaningAssay,
  AssaySuite,
}
