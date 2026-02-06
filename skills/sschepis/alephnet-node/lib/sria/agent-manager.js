/**
 * Agent Manager - CRUD operations for SRIA agents
 *
 * Provides storage, retrieval, and lifecycle management for agents.
 * Supports in-memory and persistent storage backends.
 *
 * @module lib/sria/agent-manager
 */

const crypto = require('crypto')
const EventEmitter = require('events')
const { SRIAEngine } = require('./engine')
const { LIGHT_GUIDE_TEMPLATE, DEFAULT_PERCEPTION_CONFIG } = require('./types')

/**
 * Agent definition for storage
 * @typedef {Object} AgentDefinition
 * @property {string} id - Unique agent ID
 * @property {string} name - Agent name
 * @property {number[]} bodyPrimes - Prime number address space
 * @property {Object} perceptionConfig - Perception configuration
 * @property {Object[]} goalPriors - Goal priors
 * @property {Object} attractorBiases - Attractor biases
 * @property {Object} collapseDynamics - Collapse dynamics
 * @property {Object[]} safetyConstraints - Safety constraints
 * @property {Object} metadata - Additional metadata
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * Agent Manager class
 * Handles CRUD operations for SRIA agents
 *
 * @extends EventEmitter
 */
class AgentManager extends EventEmitter {
  /**
   * Create an agent manager
   * @param {Object} options - Manager options
   * @param {Object} [options.storage] - Storage backend (optional)
   */
  constructor(options = {}) {
    super()

    // In-memory agent definitions
    this.agents = new Map()

    // Active engine instances
    this.engines = new Map()

    // Storage backend (optional)
    this.storage = options.storage || null

    // Agent templates
    this.templates = new Map()
    this._initializeDefaultTemplates()
  }

  /**
   * Initialize default agent templates
   * @private
   */
  _initializeDefaultTemplates() {
    // Light guide template (from SRIA spec)
    this.templates.set('light-guide', {
      name: 'Light Guide',
      bodyPrimes: [...LIGHT_GUIDE_TEMPLATE.bodyPrimes],
      perceptionConfig: { ...LIGHT_GUIDE_TEMPLATE.perceptionConfig },
      goalPriors: [...LIGHT_GUIDE_TEMPLATE.goalPriors],
      attractorBiases: { ...LIGHT_GUIDE_TEMPLATE.attractorBiases },
      collapseDynamics: { ...LIGHT_GUIDE_TEMPLATE.collapseDynamics },
    })

    // Data analyst template
    this.templates.set('data-analyst', {
      name: 'Data Analyst',
      bodyPrimes: [2, 3, 5, 7, 11, 13, 17],
      perceptionConfig: {
        inputLayers: ['data', 'semantic'],
        outputLayers: ['semantic', 'experiential'],
        attentionSpan: 8,
      },
      goalPriors: [
        { type: 'efficiency', weight: 0.4, costFunction: 'efficiency' },
        { type: 'accuracy', weight: 0.4, costFunction: 'alignment' },
        { type: 'safety', weight: 0.2, costFunction: 'safety' },
      ],
      attractorBiases: {
        preferredPrimes: [2, 3, 5],
        harmonicWeights: { 2: 1.2, 3: 1.1, 5: 1.0 },
      },
      collapseDynamics: {
        coherenceThreshold: 0.7,
        attractorStrength: 0.6,
        entropyDecayRate: 0.92,
      },
    })

    // Creative assistant template
    this.templates.set('creative-assistant', {
      name: 'Creative Assistant',
      bodyPrimes: [3, 5, 7, 11, 13, 17, 19],
      perceptionConfig: {
        inputLayers: ['semantic', 'experiential', 'predictive'],
        outputLayers: ['semantic', 'experiential'],
        attentionSpan: 6,
      },
      goalPriors: [
        { type: 'creativity', weight: 0.5, costFunction: 'creativity' },
        { type: 'alignment', weight: 0.3, costFunction: 'alignment' },
        { type: 'safety', weight: 0.2, costFunction: 'safety' },
      ],
      attractorBiases: {
        preferredPrimes: [7, 11, 13],
        harmonicWeights: { 7: 1.3, 11: 1.2, 13: 1.1 },
      },
      collapseDynamics: {
        coherenceThreshold: 0.5,
        attractorStrength: 0.4,
        entropyDecayRate: 0.88,
      },
    })

    // Research agent template
    this.templates.set('researcher', {
      name: 'Researcher',
      bodyPrimes: [2, 3, 5, 7, 11, 13, 17, 19, 23],
      perceptionConfig: {
        inputLayers: ['data', 'semantic', 'experiential', 'predictive'],
        outputLayers: ['semantic', 'data'],
        attentionSpan: 10,
      },
      goalPriors: [
        { type: 'efficiency', weight: 0.3, costFunction: 'efficiency' },
        { type: 'alignment', weight: 0.3, costFunction: 'alignment' },
        { type: 'creativity', weight: 0.3, costFunction: 'creativity' },
        { type: 'safety', weight: 0.1, costFunction: 'safety' },
      ],
      attractorBiases: {
        preferredPrimes: [2, 3, 5, 7],
        harmonicWeights: { 2: 1.1, 3: 1.1, 5: 1.1, 7: 1.1 },
      },
      collapseDynamics: {
        coherenceThreshold: 0.65,
        attractorStrength: 0.5,
        entropyDecayRate: 0.9,
      },
    })
  }

  /**
   * Generate a unique agent ID
   * @private
   * @returns {string} Agent ID
   */
  _generateId() {
    return `agent_${crypto.randomUUID().slice(0, 8)}`
  }

  /**
   * Create a new agent
   * @param {Object} definition - Agent definition
   * @param {string} [definition.name] - Agent name
   * @param {string} [definition.templateId] - Template to use
   * @param {number[]} [definition.bodyPrimes] - Body primes
   * @param {Object} [definition.perceptionConfig] - Perception config
   * @param {Object[]} [definition.goalPriors] - Goal priors
   * @param {Object} [definition.attractorBiases] - Attractor biases
   * @param {Object} [definition.collapseDynamics] - Collapse dynamics
   * @param {Object[]} [definition.safetyConstraints] - Safety constraints
   * @param {Object} [definition.metadata] - Additional metadata
   * @returns {AgentDefinition} Created agent definition
   */
  create(definition = {}) {
    const id = this._generateId()
    const now = new Date().toISOString()

    // Start with template if specified
    let base = {}
    if (definition.templateId && this.templates.has(definition.templateId)) {
      base = { ...this.templates.get(definition.templateId) }
    }

    // Merge with provided definition
    const agent = {
      id,
      name: definition.name || base.name || 'Unnamed Agent',
      bodyPrimes: definition.bodyPrimes || base.bodyPrimes || [...LIGHT_GUIDE_TEMPLATE.bodyPrimes],
      perceptionConfig: definition.perceptionConfig ||
        base.perceptionConfig || { ...DEFAULT_PERCEPTION_CONFIG },
      goalPriors: definition.goalPriors || base.goalPriors || [],
      attractorBiases: definition.attractorBiases || base.attractorBiases || {},
      collapseDynamics: definition.collapseDynamics || base.collapseDynamics || {},
      safetyConstraints: definition.safetyConstraints || [],
      metadata: definition.metadata || {},
      createdAt: now,
      updatedAt: now,
    }

    this.agents.set(id, agent)

    // Persist if storage backend available
    if (this.storage) {
      this.storage
        .saveAgent(agent)
        .catch((err) => this.emit('error', { type: 'storage', error: err }))
    }

    this.emit('agent_created', agent)

    return agent
  }

  /**
   * Get an agent by ID
   * @param {string} id - Agent ID
   * @returns {AgentDefinition|null} Agent definition or null
   */
  get(id) {
    return this.agents.get(id) || null
  }

  /**
   * List all agents
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.name] - Filter by name (partial match)
   * @param {number[]} [filters.bodyPrimes] - Filter by primes (intersection)
   * @returns {AgentDefinition[]} List of agents
   */
  list(filters = {}) {
    let agents = Array.from(this.agents.values())

    if (filters.name) {
      const nameLower = filters.name.toLowerCase()
      agents = agents.filter((a) => a.name.toLowerCase().includes(nameLower))
    }

    if (filters.bodyPrimes && filters.bodyPrimes.length > 0) {
      agents = agents.filter((a) => filters.bodyPrimes.some((p) => a.bodyPrimes.includes(p)))
    }

    return agents
  }

  /**
   * Update an agent
   * @param {string} id - Agent ID
   * @param {Object} updates - Updates to apply
   * @returns {AgentDefinition|null} Updated agent or null
   */
  update(id, updates) {
    const agent = this.agents.get(id)
    if (!agent) return null

    // Apply updates (excluding id and createdAt)
    const updatedAgent = {
      ...agent,
      ...updates,
      id: agent.id,
      createdAt: agent.createdAt,
      updatedAt: new Date().toISOString(),
    }

    this.agents.set(id, updatedAgent)

    // Update engine if active
    if (this.engines.has(id)) {
      // Engines are immutable after creation, so we need to recreate
      this.engines.delete(id)
    }

    // Persist if storage backend available
    if (this.storage) {
      this.storage
        .saveAgent(updatedAgent)
        .catch((err) => this.emit('error', { type: 'storage', error: err }))
    }

    this.emit('agent_updated', updatedAgent)

    return updatedAgent
  }

  /**
   * Delete an agent
   * @param {string} id - Agent ID
   * @returns {boolean} Success
   */
  delete(id) {
    if (!this.agents.has(id)) return false

    // Dismiss engine if active
    if (this.engines.has(id)) {
      const engine = this.engines.get(id)
      if (engine.session) {
        engine.dismiss()
      }
      this.engines.delete(id)
    }

    this.agents.delete(id)

    // Remove from storage if backend available
    if (this.storage) {
      this.storage
        .deleteAgent(id)
        .catch((err) => this.emit('error', { type: 'storage', error: err }))
    }

    this.emit('agent_deleted', { id })

    return true
  }

  /**
   * Get or create an engine instance for an agent
   * @param {string} id - Agent ID
   * @returns {SRIAEngine|null} Engine instance or null
   */
  getEngine(id) {
    // Return existing engine
    if (this.engines.has(id)) {
      return this.engines.get(id)
    }

    // Create new engine from definition
    const agent = this.agents.get(id)
    if (!agent) return null

    const engine = new SRIAEngine({
      name: agent.name,
      bodyPrimes: agent.bodyPrimes,
      perceptionConfig: agent.perceptionConfig,
      goalPriors: agent.goalPriors,
      attractorBiases: agent.attractorBiases,
      collapseDynamics: agent.collapseDynamics,
      safetyConstraints: agent.safetyConstraints,
    })

    // Forward events
    engine.on('summoned', (data) => this.emit('engine_summoned', { id, ...data }))
    engine.on('perceived', (data) => this.emit('engine_perceived', { id, ...data }))
    engine.on('decided', (data) => this.emit('engine_decided', { id, ...data }))
    engine.on('acted', (data) => this.emit('engine_acted', { id, ...data }))
    engine.on('learned', (data) => this.emit('engine_learned', { id, ...data }))
    engine.on('dismissed', (data) => this.emit('engine_dismissed', { id, ...data }))
    engine.on('beacon', (data) => this.emit('engine_beacon', { id, ...data }))

    this.engines.set(id, engine)

    return engine
  }

  /**
   * Summon an agent
   * @param {string} id - Agent ID
   * @param {Object} [options] - Summon options
   * @returns {Object} Summon result
   */
  summon(id, options = {}) {
    const engine = this.getEngine(id)
    if (!engine) {
      return { success: false, error: 'Agent not found' }
    }

    return engine.summon(options)
  }

  /**
   * Dismiss an agent
   * @param {string} id - Agent ID
   * @returns {Object} Dismiss result
   */
  dismiss(id) {
    const engine = this.engines.get(id)
    if (!engine) {
      return { success: false, error: 'Engine not active' }
    }

    return engine.dismiss()
  }

  /**
   * Execute a step for an agent
   * @param {string} id - Agent ID
   * @param {string} observation - Input observation
   * @param {Object[]} possibleActions - Available actions
   * @returns {Object} Step result
   */
  step(id, observation, possibleActions) {
    const engine = this.engines.get(id)
    if (!engine) {
      return { success: false, error: 'Engine not active' }
    }

    return engine.fullStep(observation, possibleActions)
  }

  /**
   * Get agent state
   * @param {string} id - Agent ID
   * @returns {Object|null} Agent state or null
   */
  getState(id) {
    const engine = this.engines.get(id)
    if (!engine) {
      const agent = this.agents.get(id)
      if (!agent) return null
      return {
        id,
        name: agent.name,
        active: false,
        definition: agent,
      }
    }

    return {
      id,
      active: true,
      engine: engine.getState(),
    }
  }

  /**
   * List available templates
   * @returns {Object[]} Template list
   */
  listTemplates() {
    return Array.from(this.templates.entries()).map(([id, template]) => ({
      id,
      ...template,
    }))
  }

  /**
   * Add a custom template
   * @param {string} id - Template ID
   * @param {Object} template - Template definition
   */
  addTemplate(id, template) {
    this.templates.set(id, template)
    this.emit('template_added', { id, template })
  }

  /**
   * Load agents from storage
   * @returns {Promise<number>} Number of agents loaded
   */
  async loadFromStorage() {
    if (!this.storage) {
      return 0
    }

    try {
      const agents = await this.storage.loadAllAgents()
      for (const agent of agents) {
        this.agents.set(agent.id, agent)
      }
      return agents.length
    } catch (err) {
      this.emit('error', { type: 'storage', error: err })
      return 0
    }
  }

  /**
   * Get statistics about the agent manager
   * @returns {Object} Statistics
   */
  getStats() {
    const definitions = Array.from(this.agents.values())
    const engines = Array.from(this.engines.values())
    const activeEngines = engines.filter((e) => e.session !== null)

    return {
      totalAgents: definitions.length,
      activeEngines: engines.length,
      summonedAgents: activeEngines.length,
      templates: this.templates.size,
      primeDistribution: this._computePrimeDistribution(definitions),
    }
  }

  /**
   * Compute prime distribution across agents
   * @private
   * @param {AgentDefinition[]} agents - Agent definitions
   * @returns {Object.<number, number>} Prime counts
   */
  _computePrimeDistribution(agents) {
    const distribution = {}
    for (const agent of agents) {
      for (const prime of agent.bodyPrimes) {
        distribution[prime] = (distribution[prime] || 0) + 1
      }
    }
    return distribution
  }
}

module.exports = {
  AgentManager,
}
