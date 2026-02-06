/**
 * Sentient Observer Library
 *
 * Exports all components for the Sentient Observer implementation
 * based on "A Design for a Sentient Observer" paper.
 *
 * Components:
 * - SMF: Sedenion Memory Field (16D semantic orientation)
 * - PRSC: Prime Resonance Semantic Computation (oscillator dynamics)
 * - HQE: Holographic Quantum Encoding (distributed memory)
 * - Temporal: Emergent time via coherence events
 * - Entanglement: Semantic binding and phrase segmentation
 * - Memory: Enhanced memory with HQE and temporal indexing
 * - Agency: Attention, goals, and action selection
 * - Boundary: Self/other distinction and I/O
 * - Safety: Constraints, ethics, and monitoring
 * - Core: Unified SentientObserver integration
 *
 * Enhanced with formal semantics from core modules:
 * - TypeChecker: Formal type inference (Γ ⊢ e : T)
 * - ReductionSystem: Strong normalization with proofs
 * - Translator: λ-calculus model-theoretic semantics
 * - EnochianVocabulary: Full 21-letter alphabet and vocabulary
 */

// Sedenion Memory Field
const { SedenionMemoryField } = require('./smf')

// Prime Resonance Semantic Computation
const { PrimeOscillator, PRSCLayer, EntanglementDetector } = require('./prsc')

// Holographic Quantum Encoding
const { HolographicEncoder, HolographicMemory, HolographicSimilarity } = require('./hqe')

// Temporal Layer
const { Moment, TemporalLayer, TemporalPatternDetector } = require('./temporal')

// Entanglement Layer
const { EntangledPair, Phrase, EntanglementLayer } = require('./entanglement')

// Enhanced Memory
const {
  MemoryTrace,
  HolographicMemoryBank,
  TemporalMemoryIndex,
  EntanglementMemoryIndex,
  SentientMemory,
} = require('./sentient-memory')

// Agency Layer
const { AttentionFocus, Goal, Action, AgencyLayer } = require('./agency')

// Boundary Layer
const {
  SensoryChannel,
  MotorChannel,
  EnvironmentalModel,
  SelfModel,
  ObjectivityGate,
  BoundaryLayer,
} = require('./boundary')

// Safety Layer
const { SafetyConstraint, ViolationEvent, SafetyMonitor, SafetyLayer } = require('./safety')

// Sentient Core
const { SentientState, SentientObserver } = require('./sentient-core')

// Symbolic Extensions (v1.3.0)
const { SymbolicSMF, SMFSymbolMapper, AXIS_SYMBOL_MAPPING, TAG_TO_AXIS } = require('./symbolic-smf')

const {
  SymbolicMoment,
  SymbolicTemporalLayer,
  SymbolicPatternDetector,
  HEXAGRAM_ARCHETYPES,
} = require('./symbolic-temporal')

const { SymbolicState, SymbolicObserver } = require('./symbolic-observer')

// Evaluation Assays (Section 15)
const {
  TimeDilationAssay,
  MemoryContinuityAssay,
  AgencyConstraintAssay,
  NonCommutativeMeaningAssay,
  AssaySuite,
} = require('./assays')

// Prime Calculus Kernel (Section 6) - Enhanced with formal semantics
const {
  TermType,
  NounTerm,
  AdjTerm,
  ChainTerm,
  FusionTerm,
  SeqTerm,
  ImplTerm,
  UndefinedTerm,
  PrimeCalculusEvaluator,
  PrimeCalculusVerifier,
  PrimeCalculusBuilder,
  SemanticObject,
  // Re-exported formal semantics
  TypeChecker,
  Types,
  ReductionSystem,
  ResonanceOperator,
  NextPrimeOperator,
  ModularOperator,
  IdentityOperator,
  demonstrateStrongNormalization,
  testLocalConfluence,
  Translator,
  LambdaEvaluator,
  Semantics,
} = require('./prime-calculus')

// Enochian Packet Layer (Section 7.4) - Enhanced with vocabulary
const {
  ENOCHIAN_PRIMES,
  MODES,
  twistAngle,
  totalTwist,
  isTwistClosed,
  EnochianSymbol,
  EnochianPacket,
  EnochianEncoder,
  EnochianDecoder,
  EnochianPacketBuilder,
  // Enhanced classes
  EnhancedEnochianEncoder,
  EnhancedEnochianDecoder,
  // Vocabulary re-exports
  EnochianVocabulary,
  ENOCHIAN_ALPHABET,
  PRIME_BASIS,
  CORE_VOCABULARY,
  THE_NINETEEN_CALLS,
  EnochianWord,
  EnochianCall,
  EnochianEngine,
  SedenionElement,
  TwistOperator,
  validateTwistClosure,
} = require('./enochian')

// Distributed Sentience Network (Section 7)
const {
  LocalField,
  Proposal,
  ProposalLog,
  GlobalMemoryField,
  CoherentCommitProtocol,
  PRRCChannel,
  NetworkSynchronizer,
  DSNNode,
  generateNodeId,
  SEMANTIC_DOMAINS,
  FIRST_100_PRIMES,
} = require('./network')

// Intelligence Scaling Modules
const {
  FusionDiscoveryEngine,
  ReinforcedEntanglementLayer,
  calculateAbstractionLevel,
  calculateReasoningDepth,
} = require('./abstraction')

const {
  WisdomAggregator,
  ConceptFormation,
  CompositeIntelligenceScore,
  calculateAmplificationFactor,
  calculateCoherenceEfficiency,
} = require('./collective')

// Legacy exports (for backwards compatibility)
const { AlephChat } = require('./chat')
const { ContextMemory, ImmediateBuffer, SessionMemory, PersistentMemory } = require('./memory')
const { ResponseProcessor } = require('./processor')
const { VocabularyTracker } = require('./vocabulary')
const { StyleProfile } = require('./style')
const { TopicTracker } = require('./topics')
const { ConceptGraph } = require('./concepts')
const { ResponseEnhancer } = require('./enhancer')
const { AlephCore } = require('./core')
const { LMStudioClient } = require('./lmstudio')
const { MarkdownRenderer, formatMarkdown } = require('./markdown')
const { ToolExecutor, executeOpenAIToolCall, processToolCalls } = require('./tools')

// Resolang WASM Integration
const {
  ResolangLoader,
  ResolangPipeline,
  ResolangSMF,
  initResolang,
  createPipeline,
} = require('./resolang')

// Agent Module (Agentic Behavior)
const {
  TaskStatus,
  StepStatus,
  ComplexityIndicators,
  TaskStep,
  Task,
  TaskPlanner,
  ComplexityAnalyzer,
  StepExecutor,
  Agent,
  createAgent,
} = require('./agent')

// SRIA Module (Summonable Resonant Intelligent Agent)
const {
  // Types and constants
  SummonableLayer,
  LAYER_CONFIGS,
  LIGHT_GUIDE_TEMPLATE,
  DEFAULT_PERCEPTION_CONFIG,
  DEFAULT_GOAL_PRIORS,
  DEFAULT_ATTRACTOR_BIASES,
  DEFAULT_COLLAPSE_DYNAMICS,
  DEFAULT_QUARANTINE_ZONES,

  // Lifecycle
  LifecycleState,
  LifecycleEventType,
  transition,

  // Core engine
  SRIAEngine,

  // Multi-agent
  TensorBody,
  CoupledPolicy,
  BeliefNetwork,
  MultiAgentNetwork,

  // Management
  AgentManager,
  TeamManager,

  // Runner
  ActionType,
  RunnerStatus,
  getDefaultActions,
  AgentRunner,
} = require('./sria')

module.exports = {
  // Sentient Observer Components
  SedenionMemoryField,

  PrimeOscillator,
  PRSCLayer,
  EntanglementDetector,

  HolographicEncoder,
  HolographicMemory,
  HolographicSimilarity,

  Moment,
  TemporalLayer,
  TemporalPatternDetector,

  EntangledPair,
  Phrase,
  EntanglementLayer,

  MemoryTrace,
  HolographicMemoryBank,
  TemporalMemoryIndex,
  EntanglementMemoryIndex,
  SentientMemory,

  AttentionFocus,
  Goal,
  Action,
  AgencyLayer,

  SensoryChannel,
  MotorChannel,
  EnvironmentalModel,
  SelfModel,
  ObjectivityGate,
  BoundaryLayer,

  SafetyConstraint,
  ViolationEvent,
  SafetyMonitor,
  SafetyLayer,

  SentientState,
  SentientObserver,

  // Symbolic Extensions (v1.3.0 - tinyaleph symbolic integration)
  SymbolicSMF,
  SMFSymbolMapper,
  AXIS_SYMBOL_MAPPING,
  TAG_TO_AXIS,

  SymbolicMoment,
  SymbolicTemporalLayer,
  SymbolicPatternDetector,
  HEXAGRAM_ARCHETYPES,

  SymbolicState,
  SymbolicObserver,

  // Evaluation Assays
  TimeDilationAssay,
  MemoryContinuityAssay,
  AgencyConstraintAssay,
  NonCommutativeMeaningAssay,
  AssaySuite,

  // Prime Calculus Kernel (Section 6)
  TermType,
  NounTerm,
  AdjTerm,
  ChainTerm,
  FusionTerm,
  SeqTerm,
  ImplTerm,
  UndefinedTerm,
  PrimeCalculusEvaluator,
  PrimeCalculusVerifier,
  PrimeCalculusBuilder,
  SemanticObject,

  // Formal Semantics (from core modules, re-exported via prime-calculus)
  TypeChecker,
  Types,
  ReductionSystem,
  ResonanceOperator,
  NextPrimeOperator,
  ModularOperator,
  IdentityOperator,
  demonstrateStrongNormalization,
  testLocalConfluence,
  Translator,
  LambdaEvaluator,
  Semantics,

  // Enochian Packet Layer (Section 7.4)
  ENOCHIAN_PRIMES,
  MODES,
  twistAngle,
  totalTwist,
  isTwistClosed,
  EnochianSymbol,
  EnochianPacket,
  EnochianEncoder,
  EnochianDecoder,
  EnochianPacketBuilder,

  // Enhanced Enochian with Vocabulary
  EnhancedEnochianEncoder,
  EnhancedEnochianDecoder,
  EnochianVocabulary,
  ENOCHIAN_ALPHABET,
  PRIME_BASIS,
  CORE_VOCABULARY,
  THE_NINETEEN_CALLS,
  EnochianWord,
  EnochianCall,
  EnochianEngine,
  SedenionElement,
  TwistOperator,
  validateTwistClosure,

  // Distributed Sentience Network (Section 7)
  LocalField,
  Proposal,
  ProposalLog,
  GlobalMemoryField,
  CoherentCommitProtocol,
  PRRCChannel,
  NetworkSynchronizer,
  DSNNode,
  generateNodeId,
  SEMANTIC_DOMAINS,
  FIRST_100_PRIMES,

  // Intelligence Scaling - Abstraction
  FusionDiscoveryEngine,
  ReinforcedEntanglementLayer,
  calculateAbstractionLevel,
  calculateReasoningDepth,

  // Intelligence Scaling - Collective
  WisdomAggregator,
  ConceptFormation,
  CompositeIntelligenceScore,
  calculateAmplificationFactor,
  calculateCoherenceEfficiency,

  // Legacy Components (backwards compatibility)
  AlephChat,
  ContextMemory,
  ImmediateBuffer,
  SessionMemory,
  PersistentMemory,
  ResponseProcessor,
  VocabularyTracker,
  StyleProfile,
  TopicTracker,
  ConceptGraph,
  ResponseEnhancer,
  AlephCore,
  LMStudioClient,
  MarkdownRenderer,
  formatMarkdown,
  ToolExecutor,
  executeOpenAIToolCall,
  processToolCalls,

  // Resolang WASM Integration
  ResolangLoader,
  ResolangPipeline,
  ResolangSMF,
  initResolang,
  createPipeline,

  // Agent Module (Agentic Behavior)
  TaskStatus,
  StepStatus,
  ComplexityIndicators,
  TaskStep,
  Task,
  TaskPlanner,
  ComplexityAnalyzer,
  StepExecutor,
  Agent,
  createAgent,

  // SRIA Module (Summonable Resonant Intelligent Agent)
  SummonableLayer,
  LAYER_CONFIGS,
  LIGHT_GUIDE_TEMPLATE,
  DEFAULT_PERCEPTION_CONFIG,
  DEFAULT_GOAL_PRIORS,
  DEFAULT_ATTRACTOR_BIASES,
  DEFAULT_COLLAPSE_DYNAMICS,
  DEFAULT_QUARANTINE_ZONES,
  LifecycleState,
  LifecycleEventType,
  transition,
  SRIAEngine,
  TensorBody,
  CoupledPolicy,
  BeliefNetwork,
  MultiAgentNetwork,
  AgentManager,
  TeamManager,
  ActionType,
  RunnerStatus,
  getDefaultActions,
  AgentRunner,
}
