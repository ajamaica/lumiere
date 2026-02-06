/**
 * Autonomous Learning System
 *
 * Exports all components for the autonomous learning capability
 * of the Sentient Observer.
 *
 * Components:
 * - SafetyFilter: Enforces whitelists, sandboxing, and content filtering
 * - ChaperoneAPI: Trusted intermediary for all external requests
 * - CuriosityEngine: Detects knowledge gaps and generates learning signals
 * - QueryFormulator: Transforms curiosity into actionable queries
 * - ContentIngester: Processes fetched content for memory integration
 * - ReflectionLoop: Consolidates learning and generates insights
 * - AutonomousLearner: Main learning loop orchestrator
 */

const { SafetyFilter } = require('./safety-filter')
const { ChaperoneAPI } = require('./chaperone')
const { CuriosityEngine, SMF_AXES, AXIS_QUERIES } = require('./curiosity')
const { QueryFormulator } = require('./query')
const { ContentIngester } = require('./ingester')
const { ReflectionLoop } = require('./reflector')
const { AutonomousLearner } = require('./learner')
const { NextStepGenerator, createNextStepGenerator } = require('./next-steps')
const config = require('./config')

/**
 * Create a complete learning system
 * @param {Object} observer - The SentientObserver instance
 * @param {Object} options - Configuration options
 * @returns {Object} Learning system components
 */
function createLearningSystem(observer, options = {}) {
  // Create safety filter
  const safetyFilter = new SafetyFilter(options.safety)

  // Create chaperone API
  const chaperone = new ChaperoneAPI({
    ...options.chaperone,
    safetyFilter,
  })

  // Create autonomous learner
  const learner = new AutonomousLearner(observer, chaperone, {
    curiosity: options.curiosity,
    query: options.query,
    ingester: options.ingester,
    reflector: options.reflector,
    ...options.learner,
  })

  // Create next-step suggestion generator
  const nextStepGenerator = createNextStepGenerator(options.nextSteps)

  return {
    safetyFilter,
    chaperone,
    learner,
    nextStepGenerator,

    // Convenience accessors
    curiosityEngine: learner.curiosityEngine,
    queryFormulator: learner.queryFormulator,
    contentIngester: learner.contentIngester,
    reflector: learner.reflector,
  }
}

module.exports = {
  // Classes
  SafetyFilter,
  ChaperoneAPI,
  CuriosityEngine,
  QueryFormulator,
  ContentIngester,
  ReflectionLoop,
  AutonomousLearner,
  NextStepGenerator,

  // Constants
  SMF_AXES,
  AXIS_QUERIES,
  config,

  // Factories
  createLearningSystem,
  createNextStepGenerator,
}
