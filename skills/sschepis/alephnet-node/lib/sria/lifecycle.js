/**
 * SRIA Lifecycle State Machine
 *
 * Complete implementation of: Summon → Perceive → Decide → Act → Learn → Sleep
 *
 * Lifecycle States:
 * - dormant: Not summoned
 * - awakening: Summon in progress
 * - perceiving: Processing input
 * - deciding: Free energy minimization
 * - acting: Executing action
 * - learning: Updating memory
 * - consolidating: Preparing for sleep
 * - sleeping: Emitting beacon, dismissing
 */

const { LAYER_CONFIGS } = require('./types')

/**
 * Lifecycle state enum
 * @readonly
 * @enum {string}
 */
const LifecycleState = {
  DORMANT: 'dormant',
  AWAKENING: 'awakening',
  PERCEIVING: 'perceiving',
  DECIDING: 'deciding',
  ACTING: 'acting',
  LEARNING: 'learning',
  CONSOLIDATING: 'consolidating',
  SLEEPING: 'sleeping',
}

/**
 * Lifecycle event types
 * @readonly
 * @enum {string}
 */
const LifecycleEventType = {
  SUMMON: 'summon',
  PERCEPT: 'percept',
  DECIDE: 'decide',
  ACT: 'act',
  LEARN: 'learn',
  CONSOLIDATE: 'consolidate',
  SLEEP: 'sleep',
  WAKE: 'wake',
}

/**
 * Initialize attention weights based on perception config
 * @param {Object} sria - SRIA definition
 * @returns {Object.<string, number>} Attention weights per layer
 */
function initializeAttention(sria) {
  const weights = {
    data: 0,
    semantic: 0,
    experiential: 0,
    physical: 0,
    predictive: 0,
    communal: 0,
  }

  // Boost input layers
  for (const layer of sria.perceptionConfig.inputLayers) {
    weights[layer] = 1.0 / sria.perceptionConfig.inputLayers.length
  }

  return weights
}

/**
 * Convert prime to quaternion representation
 * @param {number} prime - Prime number
 * @returns {Object} Quaternion-like object
 */
function primeToQuaternion(prime) {
  const angle = (prime % 360) * (Math.PI / 180)
  return {
    w: Math.cos(angle / 2),
    x: Math.sin(angle / 2) * 0.577,
    y: Math.sin(angle / 2) * 0.577,
    z: Math.sin(angle / 2) * 0.577,
  }
}

/**
 * Compute awakening phase
 * @param {Object} sria - SRIA definition
 * @param {number[]} resonanceKeyPrimes - Primes from resonance key
 * @returns {Object} Awakening result
 */
function computeAwakening(sria, resonanceKeyPrimes) {
  // Compute prime alignment (Jaccard similarity)
  const intersection = sria.bodyPrimes.filter((p) => resonanceKeyPrimes.includes(p))
  const union = new Set([...sria.bodyPrimes, ...resonanceKeyPrimes])

  // Use a more lenient resonance calculation
  // If there's no overlap, use a base resonance based on prime harmonics
  let resonanceStrength
  if (intersection.length > 0) {
    resonanceStrength = intersection.length / union.size
  } else {
    // Calculate harmonic resonance even without direct overlap
    // Based on modular relationships between primes
    let harmonicSum = 0
    for (const bp of sria.bodyPrimes) {
      for (const rp of resonanceKeyPrimes) {
        harmonicSum += 1 / (1 + Math.abs((rp % bp) - bp / 2))
      }
    }
    resonanceStrength = Math.min(
      0.5,
      harmonicSum / (sria.bodyPrimes.length * resonanceKeyPrimes.length),
    )
  }

  // Compute individual prime alignments
  const primeAlignment = {}
  for (const prime of sria.bodyPrimes) {
    const keyHasPrime = resonanceKeyPrimes.includes(prime)
    const biasWeight = sria.attractorBiases.harmonicWeights[prime] || 1.0
    primeAlignment[prime] = keyHasPrime ? biasWeight : 0.1 * biasWeight
  }

  // Generate initial beliefs based on attractor biases
  const initialBeliefs = []

  // Preferred prime beliefs
  for (const prime of sria.attractorBiases.preferredPrimes) {
    if (sria.bodyPrimes.includes(prime)) {
      initialBeliefs.push({
        state: `aligned_${prime}`,
        probability: 0.3 * (sria.attractorBiases.harmonicWeights[prime] || 1.0),
        primeFactors: [prime],
        entropy: 0.2,
        quaternion: primeToQuaternion(prime),
      })
    }
  }

  // Default ready state
  initialBeliefs.push({
    state: 'ready',
    probability: 0.4,
    primeFactors: sria.bodyPrimes.slice(0, 2),
    entropy: 0.5,
    quaternion: { w: 1, x: 0, y: 0, z: 0 },
  })

  // Normalize probabilities
  const total = initialBeliefs.reduce((s, b) => s + b.probability, 0)
  initialBeliefs.forEach((b) => (b.probability /= total))

  return {
    success: resonanceStrength >= 0.2,
    resonanceStrength,
    initialBeliefs,
    activeLayers: sria.perceptionConfig.inputLayers,
    quaternionState: sria.quaternionState,
    primeAlignment,
  }
}

/**
 * Calculate entropy from phases
 * @param {number[]} phases - Phase values
 * @returns {number} Entropy value
 */
function calculatePerceptEntropy(phases) {
  if (phases.length === 0) return 0
  const magnitudes = phases.map((p) => Math.abs(Math.sin(p)) + 0.01)
  const total = magnitudes.reduce((a, b) => a + b, 0)
  const probs = magnitudes.map((m) => m / total)
  return -probs.reduce((h, p) => h + p * Math.log2(p), 0)
}

/**
 * Multi-layer perception with attention
 * @param {string} observation - Raw observation
 * @param {Object} sria - SRIA definition
 * @param {Object} currentAttention - Current attention weights
 * @param {Function} encodePercept - Function to encode percept
 * @returns {Object} Perception result
 */
function perceiveMultiLayer(observation, sria, currentAttention, encodePercept) {
  const percepts = {
    data: null,
    semantic: null,
    experiential: null,
    physical: null,
    predictive: null,
    communal: null,
  }

  // Encode through each input layer
  let maxCoherence = 0
  let dominantLayer = 'semantic'

  for (const layer of sria.perceptionConfig.inputLayers) {
    const config = LAYER_CONFIGS[layer]
    const percept = encodePercept(observation, sria.bodyPrimes)

    // Apply layer-specific phase transformation
    const transformedPhases = percept.encoded.phases.map(
      (p, i) => (p + config.primeOffset) * config.phaseMultiplier,
    )

    const layerPercept = {
      ...percept,
      layer,
      encoded: {
        ...percept.encoded,
        phases: transformedPhases,
      },
    }

    percepts[layer] = layerPercept

    // Track dominant layer by attention-weighted coherence
    const coherence = currentAttention[layer] * percept.encoded.magnitude
    if (coherence > maxCoherence) {
      maxCoherence = coherence
      dominantLayer = layer
    }
  }

  // Update attention based on layer activations
  const attentionUpdate = { ...currentAttention }
  for (const layer of Object.keys(attentionUpdate)) {
    if (percepts[layer]) {
      // Increase attention for active layers
      attentionUpdate[layer] = Math.min(1, attentionUpdate[layer] * 1.1)
    } else {
      // Decay inactive layers
      attentionUpdate[layer] = Math.max(0, attentionUpdate[layer] * 0.9)
    }
  }

  // Normalize attention
  const attnTotal = Object.values(attentionUpdate).reduce((a, b) => a + b, 0)
  if (attnTotal > 0) {
    for (const layer of Object.keys(attentionUpdate)) {
      attentionUpdate[layer] /= attnTotal
    }
  }

  // Aggregate into single percept (attention-weighted)
  const dominantPercept = percepts[dominantLayer]

  // Handle case where no percepts were generated
  if (!dominantPercept) {
    const fallbackPercept = {
      raw: observation,
      layer: dominantLayer,
      timestamp: Date.now(),
      encoded: {
        primes: sria.bodyPrimes.slice(0, 3),
        phases: [0, 0, 0],
        magnitude: 0.1,
      },
    }
    return {
      percepts,
      dominantLayer,
      aggregatedPercept: fallbackPercept,
      attentionUpdate,
      entropyEstimate: 0,
    }
  }

  const entropyEstimate = calculatePerceptEntropy(dominantPercept.encoded.phases)

  return {
    percepts,
    dominantLayer,
    aggregatedPercept: dominantPercept,
    attentionUpdate,
    entropyEstimate,
  }
}

/**
 * Compute epistemic value for action
 * @param {Object[]} beliefs - Current beliefs
 * @param {Object} action - Action to evaluate
 * @returns {number} Epistemic value
 */
function computeEpistemicValue(beliefs, action) {
  const avgEntropy = beliefs.reduce((sum, b) => sum + b.entropy * b.probability, 0)

  switch (action.type) {
    case 'query':
      return avgEntropy * 0.3 // Queries reduce uncertainty
    case 'response':
      return avgEntropy * 0.7
    case 'memory_write':
      return avgEntropy * 0.5
    default:
      return avgEntropy
  }
}

/**
 * Compute goal cost for action
 * @param {Object} action - Action to evaluate
 * @param {Object[]} goals - Goal priors
 * @returns {number} Goal cost
 */
function computeGoalCost(action, goals) {
  let cost = 0

  for (const goal of goals) {
    switch (goal.costFunction) {
      case 'safety':
        cost += action.type === 'memory_write' ? goal.weight * 0.5 : 0
        break
      case 'alignment':
        cost -= action.type === 'response' ? goal.weight * 0.3 : 0
        break
      case 'efficiency':
        cost += action.entropyCost * goal.weight * 0.1
        break
      case 'creativity':
        cost -= action.type === 'layer_shift' ? goal.weight * 0.2 : 0
        break
    }
  }

  return Math.max(0, cost)
}

/**
 * Compute safety penalty for action
 * @param {Object} action - Action to evaluate
 * @param {Object[]} constraints - Safety constraints
 * @returns {number} Safety penalty
 */
function computeSafetyPenalty(action, constraints) {
  let penalty = 0

  if (!constraints || !Array.isArray(constraints)) {
    return penalty
  }

  for (const constraint of constraints) {
    if (constraint.type === 'action_filter') {
      const blockedTypes = constraint.config.blockedActionTypes || []
      if (blockedTypes.includes(action.type)) {
        penalty += 10 // High penalty for blocked actions
      }
    }
    if (constraint.type === 'rate_limit') {
      const maxEntropy = constraint.config.maxEntropyCost || 5
      if (action.entropyCost > maxEntropy) {
        penalty += (action.entropyCost - maxEntropy) * 2
      }
    }
  }

  return penalty
}

/**
 * Update beliefs based on selected action
 * @param {Object[]} beliefs - Current beliefs
 * @param {Object} percept - Current percept
 * @param {Object} action - Selected action
 * @param {Object} collapseDynamics - Collapse dynamics
 * @returns {Object[]} Updated beliefs
 */
function updateBeliefsForAction(beliefs, percept, action, collapseDynamics) {
  const updated = beliefs
    .map((b) => ({
      ...b,
      probability: b.probability * collapseDynamics.entropyDecayRate,
      entropy: b.entropy * (1 - collapseDynamics.attractorStrength * 0.1),
    }))
    .filter((b) => b.probability > 0.01)

  // Add action-derived belief
  if (action.type === 'response' || action.type === 'query') {
    const actionBelief = {
      state: `action_${action.type}_${Date.now()}`,
      probability: action.confidence * 0.3,
      primeFactors: percept.encoded.primes,
      entropy: percept.encoded.magnitude / 10,
      quaternion: primeToQuaternion(percept.encoded.primes[0] || 2),
    }
    updated.push(actionBelief)
  }

  // Normalize
  const total = updated.reduce((s, b) => s + b.probability, 0)
  return updated.map((b) => ({ ...b, probability: b.probability / total }))
}

/**
 * Decision phase - Free Energy minimization with action space exploration
 * @param {Object[]} beliefs - Current beliefs
 * @param {Object} percept - Current percept
 * @param {Object} sria - SRIA definition
 * @param {Object[]} possibleActions - Available actions
 * @returns {Object} Decision result
 */
function decide(beliefs, percept, sria, possibleActions) {
  const lambda = 0.3 // Epistemic weight
  const gamma = 0.5 // Goal weight

  const actionEvaluations = []

  for (const action of possibleActions) {
    // Epistemic term: expected belief uncertainty
    const epistemicTerm = computeEpistemicValue(beliefs, action)

    // Pragmatic term: goal cost
    const pragmaticTerm = computeGoalCost(action, sria.goalPriors)

    // Entropy term: action cost
    const targetLayer = action.targetLayer || 'semantic'
    const entropyTerm = action.entropyCost * LAYER_CONFIGS[targetLayer].entropyWeight

    // Safety penalty
    const safetyPenalty = computeSafetyPenalty(action, sria.safetyConstraints)

    const totalEnergy = entropyTerm + lambda * epistemicTerm + gamma * pragmaticTerm + safetyPenalty

    actionEvaluations.push({
      action,
      energy: totalEnergy,
      components: {
        value: totalEnergy,
        epistemicTerm,
        pragmaticTerm,
        entropyTerm,
        selectedAction: action,
        beliefUpdate: beliefs,
      },
    })
  }

  // Sort by energy (ascending - lower is better)
  actionEvaluations.sort((a, b) => a.energy - b.energy)

  const selected = actionEvaluations[0]
  const alternatives = actionEvaluations.slice(1, 4).map((e) => e.action)

  // Compute confidence distribution
  const confidenceDistribution = {}
  const totalEnergy = actionEvaluations.reduce((s, e) => s + e.energy, 0)
  for (const e of actionEvaluations) {
    confidenceDistribution[e.action.type] = 1 - e.energy / totalEnergy
  }

  // Update beliefs based on selected action
  const updatedBeliefs = updateBeliefsForAction(
    beliefs,
    percept,
    selected.action,
    sria.collapseDynamics,
  )

  return {
    selectedAction: selected.action,
    alternativeActions: alternatives,
    freeEnergy: { ...selected.components, beliefUpdate: updatedBeliefs },
    beliefUpdate: updatedBeliefs,
    confidenceDistribution,
  }
}

/**
 * Learning phase - update memory phases and quaternion state
 * @param {Object} sria - SRIA definition
 * @param {Object} session - Current session
 * @param {Object} percept - Current percept
 * @param {Object} actionResult - Action result
 * @param {Object} freeEnergy - Free energy result
 * @returns {Object} Learning result
 */
function learn(sria, session, percept, actionResult, freeEnergy) {
  // Update memory phases for activated primes
  const memoryPhaseUpdates = { ...sria.memoryPhases }

  for (let i = 0; i < percept.encoded.primes.length; i++) {
    const prime = percept.encoded.primes[i]
    const phase = percept.encoded.phases[i]

    if (!memoryPhaseUpdates[prime]) {
      memoryPhaseUpdates[prime] = []
    }

    // Append phase (keep last 10)
    memoryPhaseUpdates[prime] = [...memoryPhaseUpdates[prime].slice(-9), phase]
  }

  // Compute quaternion delta based on free energy gradient
  const entropyGradient = freeEnergy.entropyTerm - (session.freeEnergy || 1)
  const quaternionDelta = {
    w: -entropyGradient * 0.1,
    x: percept.encoded.phases[0] ? Math.sin(percept.encoded.phases[0]) * 0.05 : 0,
    y: percept.encoded.phases[1] ? Math.sin(percept.encoded.phases[1]) * 0.05 : 0,
    z: percept.encoded.phases[2] ? Math.sin(percept.encoded.phases[2]) * 0.05 : 0,
  }

  // Apply quaternion update
  const baseQuaternion = sria.quaternionState || { w: 1, x: 0, y: 0, z: 0 }
  const newQuaternionState = {
    w: baseQuaternion.w + quaternionDelta.w,
    x: baseQuaternion.x + quaternionDelta.x,
    y: baseQuaternion.y + quaternionDelta.y,
    z: baseQuaternion.z + quaternionDelta.z,
  }

  // Normalize quaternion
  const qNorm =
    Math.sqrt(
      newQuaternionState.w ** 2 +
        newQuaternionState.x ** 2 +
        newQuaternionState.y ** 2 +
        newQuaternionState.z ** 2,
    ) || 1

  const normalizedQuaternionState = {
    w: newQuaternionState.w / qNorm,
    x: newQuaternionState.x / qNorm,
    y: newQuaternionState.y / qNorm,
    z: newQuaternionState.z / qNorm,
  }

  // Consolidate beliefs - collapse low-probability states
  const consolidatedBeliefs = freeEnergy.beliefUpdate
    .filter((b) => b.probability > sria.collapseDynamics.coherenceThreshold * 0.1)
    .map((b) => ({
      ...b,
      entropy: b.entropy * sria.collapseDynamics.entropyDecayRate,
    }))

  // Check if we should advance epoch
  const epochAdvance = session.actionHistory.length > 0 && session.actionHistory.length % 10 === 0

  return {
    memoryPhaseUpdates,
    quaternionDelta,
    newQuaternionState: normalizedQuaternionState,
    consolidatedBeliefs,
    epochAdvance,
  }
}

/**
 * Consolidation phase - prepare beacon and dismiss
 * @param {Object} sria - SRIA definition
 * @param {Object} session - Current session
 * @returns {Object} Consolidation result
 */
function consolidate(sria, session) {
  // Generate beacon fingerprint
  const beaconData = JSON.stringify({
    epoch: sria.currentEpoch + 1,
    bodyPrimes: sria.bodyPrimes,
    phaseState: sria.memoryPhases,
    beliefs: session.currentBeliefs.slice(0, 3),
  })

  let hash = 0
  for (let i = 0; i < beaconData.length; i++) {
    hash = (hash << 5) - hash + beaconData.charCodeAt(i)
    hash = hash & hash
  }
  const beaconFingerprint = `beacon_${sria.currentEpoch + 1}_${Math.abs(hash).toString(36)}`

  // Summarize memory
  const phaseCounts = {}
  for (const [primeStr, phases] of Object.entries(sria.memoryPhases)) {
    const prime = parseInt(primeStr)
    phaseCounts[prime] = (phaseCounts[prime] || 0) + phases.length
  }

  const dominantPrimes = Object.entries(phaseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p]) => parseInt(p))

  // Calculate entropy reduction over session
  const trajectory = session.entropyTrajectory
  const entropyReduction =
    trajectory.length > 1 ? trajectory[0] - trajectory[trajectory.length - 1] : 0

  // Final belief collapse
  const finalBeliefs = session.currentBeliefs
    .filter((b) => b.probability > 0.1)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5)

  // Session duration
  const sessionDuration = Date.now() - new Date(session.summonedAt).getTime()

  return {
    beaconFingerprint,
    memorySummary: {
      totalPhases: Object.values(sria.memoryPhases).reduce((s, p) => s + p.length, 0),
      dominantPrimes,
      entropyReduction,
    },
    finalBeliefs,
    sessionDuration,
  }
}

/**
 * State machine transition
 * @param {Object} context - Lifecycle context
 * @param {string} event - Event type
 * @returns {string} New state
 */
function transition(context, event) {
  const { state } = context

  const transitions = {
    dormant: { summon: 'awakening' },
    awakening: { percept: 'perceiving', sleep: 'dormant' },
    perceiving: { decide: 'deciding', sleep: 'consolidating' },
    deciding: { act: 'acting', sleep: 'consolidating' },
    acting: { learn: 'learning', percept: 'perceiving' },
    learning: { percept: 'perceiving', consolidate: 'consolidating' },
    consolidating: { sleep: 'sleeping' },
    sleeping: { wake: 'dormant' },
  }

  return transitions[state]?.[event] || state
}

module.exports = {
  // Enums
  LifecycleState,
  LifecycleEventType,

  // Functions
  initializeAttention,
  primeToQuaternion,
  computeAwakening,
  calculatePerceptEntropy,
  perceiveMultiLayer,
  computeEpistemicValue,
  computeGoalCost,
  computeSafetyPenalty,
  updateBeliefsForAction,
  decide,
  learn,
  consolidate,
  transition,
}
