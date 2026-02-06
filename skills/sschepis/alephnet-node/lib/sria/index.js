/**
 * SRIA Module - Summonable Resonant Intelligent Agent
 *
 * Complete implementation of agent architecture with:
 * - Prime-based body identity
 * - Phase-encoded memory
 * - Free energy minimization
 * - Multi-layer perception
 * - Multi-agent resonance networks
 * - Agent and Team management
 * - Execution runner
 *
 * @module lib/sria
 */

const types = require('./types')
const lifecycle = require('./lifecycle')
const { SRIAEngine } = require('./engine')
const multiAgent = require('./multi-agent')
const { AgentManager } = require('./agent-manager')
const { TeamManager } = require('./team-manager')
const runner = require('./runner')
const adapters = require('./adapters')

module.exports = {
  // Types and constants
  ...types,

  // Lifecycle states and functions
  LifecycleState: lifecycle.LifecycleState,
  LifecycleEventType: lifecycle.LifecycleEventType,
  transition: lifecycle.transition,
  initializeAttention: lifecycle.initializeAttention,
  computeAwakening: lifecycle.computeAwakening,
  perceiveMultiLayer: lifecycle.perceiveMultiLayer,
  decide: lifecycle.decide,
  learn: lifecycle.learn,
  consolidate: lifecycle.consolidate,

  // Core engine
  SRIAEngine,

  // Multi-agent components
  TensorBody: multiAgent.TensorBody,
  CoupledPolicy: multiAgent.CoupledPolicy,
  BeliefNetwork: multiAgent.BeliefNetwork,
  MultiAgentNetwork: multiAgent.MultiAgentNetwork,

  // Management
  AgentManager,
  TeamManager,

  // Runner
  ActionType: runner.ActionType,
  RunnerStatus: runner.RunnerStatus,
  getDefaultActions: runner.getDefaultActions,
  AgentRunner: runner.AgentRunner,

  // Adapters
  SupabaseStorageAdapter: adapters.SupabaseStorageAdapter,
  MIGRATION_SQL: adapters.MIGRATION_SQL,
}
