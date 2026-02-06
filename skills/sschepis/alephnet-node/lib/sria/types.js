/**
 * SRIA Core Types
 *
 * Summonable Resonant Intelligent Agent (SRIA) type definitions
 * Based on formalism: A = (P_body, Θ_mem, Π, G, I)
 *
 * P_body: Body Primes (address space)
 * Θ_mem: Memory Phases (persistent state)
 * Π: Policy (collapse dynamics)
 * G: Goals (prior preferences)
 * I: Interface (perception/action config)
 */

/**
 * Summonable layers for perception and action
 * @readonly
 * @enum {string}
 */
const SummonableLayer = {
  DATA: 'data',
  SEMANTIC: 'semantic',
  EXPERIENTIAL: 'experiential',
  PHYSICAL: 'physical',
  PREDICTIVE: 'predictive',
  COMMUNAL: 'communal',
}

/**
 * Layer configuration with semantic properties
 * @type {Object.<string, LayerConfig>}
 */
const LAYER_CONFIGS = {
  data: {
    description: 'Classical data retrieval',
    primeOffset: 0,
    phaseMultiplier: 1,
    entropyWeight: 0.1,
    color: 'hsl(210, 70%, 50%)', // Blue
  },
  semantic: {
    description: 'Symbolic/concept retrieval',
    primeOffset: Math.PI / 6,
    phaseMultiplier: 1.618, // Golden ratio
    entropyWeight: 0.2,
    color: 'hsl(120, 60%, 45%)', // Green
  },
  experiential: {
    description: 'Qualia/experience generation',
    primeOffset: Math.PI / 4,
    phaseMultiplier: 2.414, // Silver ratio
    entropyWeight: 0.4,
    color: 'hsl(280, 65%, 55%)', // Purple
  },
  physical: {
    description: 'Physical constants/laws',
    primeOffset: 1 / 137.036, // Fine structure constant
    phaseMultiplier: Math.PI,
    entropyWeight: 0.1,
    color: 'hsl(30, 80%, 50%)', // Orange
  },
  predictive: {
    description: 'Future state prediction',
    primeOffset: Math.PI / 3,
    phaseMultiplier: 1 / Math.E,
    entropyWeight: 0.5,
    color: 'hsl(180, 60%, 45%)', // Cyan
  },
  communal: {
    description: 'Consensus/shared knowledge',
    primeOffset: Math.PI / 2,
    phaseMultiplier: 2,
    entropyWeight: 0.3,
    color: 'hsl(45, 85%, 50%)', // Gold
  },
}

/**
 * Collapse dynamics control how beliefs evolve
 * @typedef {Object} CollapseDynamics
 * @property {number} entropyDecayRate - How fast entropy collapses (0-1)
 * @property {number} coherenceThreshold - When to consider state "locked"
 * @property {number} attractorStrength - Pull towards stable states
 */

/**
 * Attractor biases influence agent tendencies
 * @typedef {Object} AttractorBiases
 * @property {number[]} preferredPrimes - Primes the agent gravitates toward
 * @property {number[]} avoidedPrimes - Primes the agent avoids
 * @property {Object.<number, number>} harmonicWeights - Weight multipliers for primes
 */

/**
 * Goal prior for decision making
 * @typedef {Object} GoalPrior
 * @property {string} name - Goal name
 * @property {'safety'|'alignment'|'efficiency'|'creativity'} costFunction - Type of cost
 * @property {number} weight - Importance weight
 * @property {string[]} [constraints] - Optional constraints
 */

/**
 * Safety constraint for action filtering
 * @typedef {Object} SafetyConstraint
 * @property {'action_filter'|'content_filter'|'rate_limit'} type - Constraint type
 * @property {Object} config - Constraint configuration
 */

/**
 * Perception configuration
 * @typedef {Object} PerceptionConfig
 * @property {string[]} inputLayers - Which layers to perceive from
 * @property {'prime_hash'|'semantic_embed'|'hybrid'} encodingMethod - How to encode
 * @property {number} phaseResolution - Resolution of phase vectors
 */

/**
 * Action configuration
 * @typedef {Object} ActionConfig
 * @property {string[]} outputLayers - Which layers can output to
 * @property {'collapse'|'superposition'|'resonance'} decodingMethod - How to decode
 * @property {number} entropyBudget - Maximum entropy per action
 */

/**
 * Quaternion-like object for 4D representation
 * @typedef {Object} QuaternionLike
 * @property {number} w - Scalar component
 * @property {number} x - i component
 * @property {number} y - j component
 * @property {number} z - k component
 */

/**
 * SRIA Definition - Complete agent specification
 * @typedef {Object} SRIADefinition
 * @property {string} id - Unique identifier
 * @property {string} agentId - Parent agent ID
 * @property {number[]} bodyPrimes - Body prime address space
 * @property {string} bodyHash - Hash of body primes
 * @property {Object.<number, number[]>} memoryPhases - Phase vectors per prime
 * @property {number} currentEpoch - Current time epoch
 * @property {CollapseDynamics} collapseDynamics - Collapse behavior
 * @property {AttractorBiases} attractorBiases - Tendency biases
 * @property {GoalPrior[]} goalPriors - Goals for decision making
 * @property {SafetyConstraint[]} safetyConstraints - Safety rules
 * @property {PerceptionConfig} perceptionConfig - Perception settings
 * @property {ActionConfig} actionConfig - Action settings
 * @property {QuaternionLike} quaternionState - 4D state representation
 * @property {boolean} isSummoned - Whether currently active
 * @property {string|null} lastSummonedAt - Last activation time
 * @property {number} summonCount - Total summon count
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * Belief state representation
 * @typedef {Object} Belief
 * @property {string} state - State description
 * @property {number} probability - Probability (0-1)
 * @property {number[]} primeFactors - Associated primes
 * @property {number} entropy - Belief entropy
 * @property {QuaternionLike} [quaternion] - Optional quaternion representation
 */

/**
 * Encoded perception
 * @typedef {Object} Percept
 * @property {string} raw - Raw observation text
 * @property {Object} encoded - Encoded representation
 * @property {number[]} encoded.phases - Phase vector
 * @property {number[]} encoded.primes - Associated primes
 * @property {number} encoded.magnitude - Magnitude
 * @property {string} layer - Dominant layer
 * @property {number} timestamp - When perceived
 */

/**
 * Agent action
 * @typedef {Object} AgentAction
 * @property {'response'|'query'|'memory_write'|'beacon_emit'|'layer_shift'} type - Action type
 * @property {*} content - Action content
 * @property {string} [targetLayer] - Target layer for action
 * @property {number} entropyCost - Entropy cost
 * @property {number} confidence - Confidence level
 */

/**
 * Free energy result from minimization
 * @typedef {Object} FreeEnergyResult
 * @property {number} value - Total free energy
 * @property {number} epistemicTerm - Uncertainty component
 * @property {number} pragmaticTerm - Goal achievement component
 * @property {number} entropyTerm - Chaos management component
 * @property {AgentAction} selectedAction - Best action
 * @property {Belief[]} beliefUpdate - Updated beliefs
 */

/**
 * Layer response from summoning
 * @typedef {Object} LayerResponse
 * @property {string} layer - Layer name
 * @property {*} payload - Response payload
 * @property {number[]} primeSignature - Prime signature
 * @property {number[]} phaseSignature - Phase signature
 * @property {number} entropyCost - Entropy cost
 * @property {number} coherence - Coherence level
 */

/**
 * Resonance key for summoning
 * @typedef {Object} ResonanceKey
 * @property {string} bodyKey - Hex-encoded body key
 * @property {string} memKey - Hex-encoded memory key
 * @property {string} authKey - Hex-encoded auth key
 */

/**
 * Summon result
 * @typedef {Object} SummonResult
 * @property {string} sessionId - Session ID
 * @property {string} sriaId - SRIA ID
 * @property {string} manifestedAt - Manifestation time
 * @property {Belief[]} initialBeliefs - Initial belief state
 * @property {string[]} activeLayers - Active layers
 * @property {number} resonanceLock - Resonance lock strength
 */

/**
 * SRIA Session
 * @typedef {Object} SRIASession
 * @property {string} id - Session ID
 * @property {string} sriaId - SRIA ID
 * @property {string} userId - User ID
 * @property {string} resonanceKeyHash - Hash of resonance key
 * @property {string} summonedAt - Summon time
 * @property {string|null} dismissedAt - Dismiss time
 * @property {Belief[]} currentBeliefs - Current beliefs
 * @property {Percept[]} perceptionBuffer - Buffered perceptions
 * @property {AgentAction[]} actionHistory - Action history
 * @property {number[]} entropyTrajectory - Entropy over time
 * @property {number} freeEnergy - Current free energy
 * @property {Object.<string, LayerResponse|null>} layerStates - Layer states
 */

/**
 * SRIA Beacon for persistence
 * @typedef {Object} SRIABeacon
 * @property {string} id - Beacon ID
 * @property {string} sriaId - SRIA ID
 * @property {number} epoch - Epoch number
 * @property {number[]} bodyPrimes - Body primes
 * @property {string} fingerprint - Unique fingerprint
 * @property {string|null} signature - Optional signature
 * @property {Object.<number, number[]>} phaseState - Phase state
 * @property {Belief[]} beliefState - Belief state
 * @property {string} createdAt - Creation time
 */

/**
 * Default perception configuration
 */
const DEFAULT_PERCEPTION_CONFIG = {
  inputLayers: ['data', 'semantic', 'experiential'],
  outputLayers: ['semantic', 'experiential', 'communal'],
  attentionSpan: 7,
}

/**
 * Default goal priors (array format for spreading)
 */
const DEFAULT_GOAL_PRIORS = [
  { type: 'safety', weight: 0.3, costFunction: 'safety' },
  { type: 'alignment', weight: 0.4, costFunction: 'alignment' },
  { type: 'efficiency', weight: 0.2, costFunction: 'efficiency' },
  { type: 'creativity', weight: 0.1, costFunction: 'creativity' },
]

/**
 * Default attractor biases
 */
const DEFAULT_ATTRACTOR_BIASES = {
  preferredPrimes: [17, 23, 29],
  avoidedPrimes: [13],
  harmonicWeights: { 17: 1.5, 23: 1.2, 29: 1.0 },
}

/**
 * Default collapse dynamics
 */
const DEFAULT_COLLAPSE_DYNAMICS = {
  entropyDecayRate: 0.95,
  coherenceThreshold: 0.7,
  attractorStrength: 0.8,
}

/**
 * Default quarantine zones (primes to avoid)
 */
const DEFAULT_QUARANTINE_ZONES = {
  forbiddenPrimes: [666, 13],
  entropyLimit: 10,
  safeMode: false,
}

/**
 * LIGHT-GUIDE default SRIA template
 * Standard configuration for general-purpose agents
 */
const LIGHT_GUIDE_TEMPLATE = {
  bodyPrimes: [2, 3, 5, 7, 11],
  collapseDynamics: {
    entropyDecayRate: 0.95,
    coherenceThreshold: 0.7,
    attractorStrength: 0.8,
  },
  attractorBiases: {
    preferredPrimes: [17, 23, 29], // Harmony, Creativity, Connection
    avoidedPrimes: [13], // Avoid Entropy/Chaos
    harmonicWeights: { 17: 1.5, 23: 1.2, 29: 1.0 },
  },
  goalPriors: [
    { name: 'Clarify', costFunction: 'alignment', weight: 1.0 },
    { name: 'Educate', costFunction: 'efficiency', weight: 0.8 },
    { name: 'Deconflict', costFunction: 'safety', weight: 1.2 },
  ],
  safetyConstraints: [{ type: 'content_filter', config: { blockHarmful: true } }],
  perceptionConfig: {
    inputLayers: ['data', 'semantic', 'experiential'],
    encodingMethod: 'hybrid',
    phaseResolution: 64,
  },
  actionConfig: {
    outputLayers: ['semantic', 'experiential', 'communal'],
    decodingMethod: 'resonance',
    entropyBudget: 100,
  },
  quaternionState: { w: 1, x: 0, y: 0, z: 0 },
}

// ============= Multi-Agent Types =============

/**
 * Network topology types
 * @readonly
 * @enum {string}
 */
const NetworkTopology = {
  MESH: 'mesh',
  STAR: 'star',
  RING: 'ring',
  HIERARCHICAL: 'hierarchical',
  CUSTOM: 'custom',
}

/**
 * Link types between agents
 * @readonly
 * @enum {string}
 */
const LinkType = {
  BIDIRECTIONAL: 'bidirectional',
  UNIDIRECTIONAL: 'unidirectional',
  INHIBITORY: 'inhibitory',
}

/**
 * Policy coupling modes
 * @readonly
 * @enum {string}
 */
const PolicyCouplingMode = {
  AVERAGE: 'average',
  DOMINANT: 'dominant',
  CONSENSUS: 'consensus',
  COMPETITIVE: 'competitive',
}

/**
 * Tensor body for multi-agent composition
 * @typedef {Object} TensorBody
 * @property {number[]} primes - Union of all agent body primes
 * @property {number} rank - Number of agents
 * @property {string} hash - Unique identifier
 * @property {number} dimensionality - Total prime count
 * @property {number} harmonicProduct - Product mod large prime
 */

/**
 * Resonance link between agents
 * @typedef {Object} ResonanceLink
 * @property {string} id - Link ID
 * @property {string} networkId - Network ID
 * @property {string} sourceSriaId - Source SRIA ID
 * @property {string} targetSriaId - Target SRIA ID
 * @property {string} linkType - Link type
 * @property {number} couplingStrength - Coupling strength (0-1)
 * @property {number} phaseAlignment - Phase alignment
 * @property {number[]} primeOverlap - Shared body primes
 * @property {number} resonanceFrequency - Computed harmonic
 * @property {string} policyCouplingMode - Policy coupling mode
 * @property {number} beliefPropagationRate - Belief propagation rate
 * @property {number} entropySharingRate - Entropy sharing rate
 * @property {boolean} isActive - Whether active
 * @property {string|null} lastResonanceAt - Last resonance time
 * @property {number} totalInteractions - Total interaction count
 */

/**
 * Resonance network of agents
 * @typedef {Object} ResonanceNetwork
 * @property {string} id - Network ID
 * @property {string} name - Network name
 * @property {string|null} description - Description
 * @property {string} ownerId - Owner ID
 * @property {string|null} orgId - Organization ID
 * @property {string} topologyType - Topology type
 * @property {TensorBody} tensorBody - Composed tensor body
 * @property {CollapseDynamics} networkCollapseDynamics - Network collapse dynamics
 * @property {AttractorBiases} networkAttractorBiases - Network attractor biases
 * @property {number} totalResonanceStrength - Total resonance strength
 * @property {boolean} isCoherent - Whether coherent
 * @property {string|null} coherenceLockedAt - When coherence locked
 * @property {boolean} isActive - Whether active
 * @property {string|null} lastActivatedAt - Last activation time
 * @property {number} activationCount - Activation count
 * @property {ResonanceLink[]} links - Network links
 * @property {SRIADefinition[]} agents - Network agents
 */

/**
 * Belief flow between agents
 * @typedef {Object} BeliefFlow
 * @property {string} fromSriaId - Source SRIA ID
 * @property {string} toSriaId - Target SRIA ID
 * @property {Belief} belief - Propagated belief
 * @property {number} attenuation - Attenuation factor
 * @property {string} timestamp - Flow timestamp
 */

/**
 * Coupled policy from multiple agents
 * @typedef {Object} CoupledPolicy
 * @property {CollapseDynamics} collapseDynamics - Merged collapse dynamics
 * @property {AttractorBiases} attractorBiases - Merged attractor biases
 * @property {Array<{sriaId: string, weight: number}>} contributions - Agent contributions
 */

module.exports = {
  // Enums
  SummonableLayer,
  NetworkTopology,
  LinkType,
  PolicyCouplingMode,

  // Constants
  LAYER_CONFIGS,
  LIGHT_GUIDE_TEMPLATE,

  // Defaults
  DEFAULT_PERCEPTION_CONFIG,
  DEFAULT_GOAL_PRIORS,
  DEFAULT_ATTRACTOR_BIASES,
  DEFAULT_COLLAPSE_DYNAMICS,
  DEFAULT_QUARANTINE_ZONES,
}
