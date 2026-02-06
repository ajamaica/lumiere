/**
 * Agent Runner - Execution handling for SRIA agents
 *
 * Manages continuous agent execution with:
 * - Event loop for perception-action cycles
 * - Action execution handlers
 * - Error recovery and retry logic
 * - Telemetry and monitoring
 *
 * @module lib/sria/runner
 */

const EventEmitter = require('events')
const { LifecycleState } = require('./lifecycle')

/**
 * Action types
 * @readonly
 * @enum {string}
 */
const ActionType = {
  QUERY: 'query',
  RESPONSE: 'response',
  MEMORY_WRITE: 'memory_write',
  MEMORY_READ: 'memory_read',
  LAYER_SHIFT: 'layer_shift',
  WAIT: 'wait',
  DELEGATE: 'delegate',
  TOOL_CALL: 'tool_call',
}

/**
 * Runner status
 * @readonly
 * @enum {string}
 */
const RunnerStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  ERROR: 'error',
  STOPPED: 'stopped',
}

/**
 * Default action set
 * @returns {Object[]} Default actions
 */
function getDefaultActions() {
  return [
    {
      type: ActionType.QUERY,
      description: 'Query for more information',
      entropyCost: 0.2,
      confidence: 0.8,
    },
    {
      type: ActionType.RESPONSE,
      description: 'Generate a response',
      entropyCost: 0.3,
      confidence: 0.9,
    },
    {
      type: ActionType.MEMORY_WRITE,
      description: 'Store information in memory',
      entropyCost: 0.4,
      confidence: 0.7,
    },
    {
      type: ActionType.MEMORY_READ,
      description: 'Retrieve information from memory',
      entropyCost: 0.1,
      confidence: 0.85,
    },
    {
      type: ActionType.LAYER_SHIFT,
      description: 'Shift perception to different layer',
      entropyCost: 0.5,
      confidence: 0.6,
      targetLayer: 'semantic',
    },
    {
      type: ActionType.WAIT,
      description: 'Wait for more input',
      entropyCost: 0.05,
      confidence: 0.95,
    },
  ]
}

/**
 * Agent Runner class
 * Manages continuous execution of SRIA agents
 *
 * @extends EventEmitter
 */
class AgentRunner extends EventEmitter {
  /**
   * Create an agent runner
   * @param {Object} options - Runner options
   * @param {Object} options.agentManager - Agent manager instance
   * @param {Object} [options.actionHandlers] - Custom action handlers
   * @param {number} [options.maxSteps] - Maximum steps per run
   * @param {number} [options.stepDelay] - Delay between steps (ms)
   * @param {number} [options.errorRetries] - Number of retries on error
   */
  constructor(options = {}) {
    super()

    if (!options.agentManager) {
      throw new Error('AgentManager is required')
    }

    this.agentManager = options.agentManager

    // Configuration
    this.maxSteps = options.maxSteps || 100
    this.stepDelay = options.stepDelay || 100
    this.errorRetries = options.errorRetries || 3

    // Action handlers
    this.actionHandlers = new Map()
    this._initializeDefaultHandlers()

    // Register custom handlers
    if (options.actionHandlers) {
      for (const [type, handler] of Object.entries(options.actionHandlers)) {
        this.registerHandler(type, handler)
      }
    }

    // Active runs
    this.runs = new Map()

    // Telemetry
    this.telemetry = {
      totalSteps: 0,
      totalRuns: 0,
      errors: 0,
      averageStepTime: 0,
    }
  }

  /**
   * Initialize default action handlers
   * @private
   */
  _initializeDefaultHandlers() {
    // Query handler - returns the query text
    this.actionHandlers.set(ActionType.QUERY, async (action, context) => {
      return {
        type: ActionType.QUERY,
        query: action.description || 'What additional information is needed?',
        timestamp: Date.now(),
      }
    })

    // Response handler - generates response
    this.actionHandlers.set(ActionType.RESPONSE, async (action, context) => {
      return {
        type: ActionType.RESPONSE,
        response: context.observation,
        beliefs: context.beliefs?.slice(0, 3) || [],
        timestamp: Date.now(),
      }
    })

    // Memory write handler
    this.actionHandlers.set(ActionType.MEMORY_WRITE, async (action, context) => {
      return {
        type: ActionType.MEMORY_WRITE,
        stored: true,
        key: `mem_${Date.now()}`,
        timestamp: Date.now(),
      }
    })

    // Memory read handler
    this.actionHandlers.set(ActionType.MEMORY_READ, async (action, context) => {
      return {
        type: ActionType.MEMORY_READ,
        data: null, // Would retrieve from memory system
        timestamp: Date.now(),
      }
    })

    // Layer shift handler
    this.actionHandlers.set(ActionType.LAYER_SHIFT, async (action, context) => {
      const engine = context.engine
      if (engine && action.targetLayer) {
        engine.summonLayer(action.targetLayer)
      }
      return {
        type: ActionType.LAYER_SHIFT,
        targetLayer: action.targetLayer || 'semantic',
        timestamp: Date.now(),
      }
    })

    // Wait handler
    this.actionHandlers.set(ActionType.WAIT, async (action, context) => {
      return {
        type: ActionType.WAIT,
        duration: 0,
        timestamp: Date.now(),
      }
    })

    // Delegate handler
    this.actionHandlers.set(ActionType.DELEGATE, async (action, context) => {
      return {
        type: ActionType.DELEGATE,
        targetAgent: action.targetAgent || null,
        task: action.task || context.observation,
        timestamp: Date.now(),
      }
    })

    // Tool call handler
    this.actionHandlers.set(ActionType.TOOL_CALL, async (action, context) => {
      return {
        type: ActionType.TOOL_CALL,
        tool: action.tool || 'unknown',
        args: action.args || {},
        result: null, // Would execute tool
        timestamp: Date.now(),
      }
    })
  }

  /**
   * Register a custom action handler
   * @param {string} type - Action type
   * @param {Function} handler - Handler function (action, context) => result
   */
  registerHandler(type, handler) {
    this.actionHandlers.set(type, handler)
    this.emit('handler_registered', { type })
  }

  /**
   * Execute an action
   * @private
   * @param {Object} action - Action to execute
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Action result
   */
  async _executeAction(action, context) {
    const handler = this.actionHandlers.get(action.type)

    if (!handler) {
      return {
        type: action.type,
        error: `No handler for action type: ${action.type}`,
        timestamp: Date.now(),
      }
    }

    try {
      return await handler(action, context)
    } catch (error) {
      return {
        type: action.type,
        error: error.message,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Start a run for an agent
   * @param {string} agentId - Agent ID
   * @param {Object} options - Run options
   * @param {string} [options.initialObservation] - Initial observation
   * @param {Object[]} [options.actions] - Available actions
   * @param {Function} [options.observationGenerator] - Generator for observations
   * @param {Function} [options.stopCondition] - Condition to stop the run
   * @returns {Object} Run handle
   */
  start(agentId, options = {}) {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const run = {
      id: runId,
      agentId,
      status: RunnerStatus.RUNNING,
      steps: 0,
      results: [],
      errors: [],
      startTime: Date.now(),
      endTime: null,
      options,
    }

    this.runs.set(runId, run)
    this.telemetry.totalRuns++

    // Start async execution
    this._runLoop(runId).catch((error) => {
      run.status = RunnerStatus.ERROR
      run.errors.push({ step: run.steps, error: error.message })
      this.emit('run_error', { runId, error: error.message })
    })

    this.emit('run_started', { runId, agentId })

    return {
      runId,
      agentId,
      stop: () => this.stop(runId),
      pause: () => this.pause(runId),
      resume: () => this.resume(runId),
      getStatus: () => this.getRunStatus(runId),
    }
  }

  /**
   * Main run loop
   * @private
   * @param {string} runId - Run ID
   */
  async _runLoop(runId) {
    const run = this.runs.get(runId)
    if (!run) return

    const { agentId, options } = run
    const actions = options.actions || getDefaultActions()

    // Get or create engine
    const engine = this.agentManager.getEngine(agentId)
    if (!engine) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    // Summon if not already
    if (engine.lifecycleState === LifecycleState.DORMANT) {
      const summonResult = engine.summon({
        initialContext: options.initialObservation || 'run_start',
      })

      if (!summonResult.success) {
        throw new Error(`Failed to summon agent: ${summonResult.error}`)
      }
    }

    let observation = options.initialObservation || ''
    let retries = 0

    while (run.status === RunnerStatus.RUNNING && run.steps < this.maxSteps) {
      // Check stop condition
      if (options.stopCondition && options.stopCondition(run)) {
        break
      }

      const stepStart = Date.now()

      try {
        // Get observation if generator provided
        if (options.observationGenerator && run.steps > 0) {
          observation = await options.observationGenerator(run)
        }

        // Execute step
        const stepResult = engine.fullStep(observation, actions)

        if (!stepResult.success) {
          throw new Error(stepResult.error || 'Step failed')
        }

        // Execute selected action
        const actionResult = await this._executeAction(stepResult.decision.action, {
          observation,
          engine,
          beliefs: engine.session?.currentBeliefs || [],
          step: run.steps,
        })

        // Record result
        const result = {
          step: run.steps,
          observation,
          perception: stepResult.perception,
          decision: stepResult.decision,
          actionResult,
          learning: stepResult.learning,
          timestamp: Date.now(),
          duration: Date.now() - stepStart,
        }

        run.results.push(result)
        run.steps++
        this.telemetry.totalSteps++

        // Update average step time
        this.telemetry.averageStepTime =
          (this.telemetry.averageStepTime * (this.telemetry.totalSteps - 1) + result.duration) /
          this.telemetry.totalSteps

        retries = 0 // Reset retries on success

        this.emit('step_completed', { runId, result })

        // Delay between steps
        if (this.stepDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.stepDelay))
        }

        // Check for wait action
        if (actionResult.type === ActionType.WAIT) {
          // If wait and no observation generator, we should stop
          if (!options.observationGenerator) {
            break
          }
        }

        // Update observation from action result if applicable
        if (actionResult.type === ActionType.RESPONSE) {
          observation = actionResult.response || observation
        }
      } catch (error) {
        retries++
        run.errors.push({ step: run.steps, error: error.message, retries })
        this.telemetry.errors++

        this.emit('step_error', { runId, step: run.steps, error: error.message })

        if (retries >= this.errorRetries) {
          throw error
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, this.stepDelay * retries))
      }

      // Check if paused
      while (run.status === RunnerStatus.PAUSED) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Finalize run
    run.endTime = Date.now()
    if (run.status === RunnerStatus.RUNNING) {
      run.status = RunnerStatus.STOPPED
    }

    this.emit('run_completed', {
      runId,
      agentId,
      steps: run.steps,
      duration: run.endTime - run.startTime,
      errors: run.errors.length,
    })
  }

  /**
   * Stop a run
   * @param {string} runId - Run ID
   * @returns {boolean} Success
   */
  stop(runId) {
    const run = this.runs.get(runId)
    if (!run) return false

    run.status = RunnerStatus.STOPPED
    run.endTime = Date.now()

    this.emit('run_stopped', { runId })

    return true
  }

  /**
   * Pause a run
   * @param {string} runId - Run ID
   * @returns {boolean} Success
   */
  pause(runId) {
    const run = this.runs.get(runId)
    if (!run || run.status !== RunnerStatus.RUNNING) return false

    run.status = RunnerStatus.PAUSED

    this.emit('run_paused', { runId })

    return true
  }

  /**
   * Resume a paused run
   * @param {string} runId - Run ID
   * @returns {boolean} Success
   */
  resume(runId) {
    const run = this.runs.get(runId)
    if (!run || run.status !== RunnerStatus.PAUSED) return false

    run.status = RunnerStatus.RUNNING

    this.emit('run_resumed', { runId })

    return true
  }

  /**
   * Get run status
   * @param {string} runId - Run ID
   * @returns {Object|null} Run status or null
   */
  getRunStatus(runId) {
    const run = this.runs.get(runId)
    if (!run) return null

    return {
      id: run.id,
      agentId: run.agentId,
      status: run.status,
      steps: run.steps,
      errors: run.errors.length,
      startTime: run.startTime,
      endTime: run.endTime,
      duration: (run.endTime || Date.now()) - run.startTime,
    }
  }

  /**
   * Get run results
   * @param {string} runId - Run ID
   * @returns {Object[]|null} Run results or null
   */
  getRunResults(runId) {
    const run = this.runs.get(runId)
    if (!run) return null

    return run.results
  }

  /**
   * List active runs
   * @returns {Object[]} Active runs
   */
  listActiveRuns() {
    return Array.from(this.runs.values())
      .filter((r) => r.status === RunnerStatus.RUNNING || r.status === RunnerStatus.PAUSED)
      .map((r) => ({
        id: r.id,
        agentId: r.agentId,
        status: r.status,
        steps: r.steps,
      }))
  }

  /**
   * Clean up completed runs
   * @param {number} [maxAge] - Maximum age in ms (default: 1 hour)
   * @returns {number} Number of runs cleaned
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now()
    let cleaned = 0

    for (const [runId, run] of this.runs.entries()) {
      if (run.status === RunnerStatus.STOPPED || run.status === RunnerStatus.ERROR) {
        if (run.endTime && now - run.endTime > maxAge) {
          this.runs.delete(runId)
          cleaned++
        }
      }
    }

    return cleaned
  }

  /**
   * Get telemetry
   * @returns {Object} Telemetry data
   */
  getTelemetry() {
    return {
      ...this.telemetry,
      activeRuns: this.listActiveRuns().length,
      totalRuns: this.runs.size,
    }
  }
}

module.exports = {
  ActionType,
  RunnerStatus,
  getDefaultActions,
  AgentRunner,
}
