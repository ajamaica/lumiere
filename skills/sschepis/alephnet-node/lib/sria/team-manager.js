/**
 * Agent Team Manager - Team operations for SRIA agents
 *
 * Manages agent teams with multi-agent resonance networks,
 * collective decision making, and shared belief propagation.
 *
 * @module lib/sria/team-manager
 */

const crypto = require('crypto')
const EventEmitter = require('events')
const { MultiAgentNetwork } = require('./multi-agent')

/**
 * Team definition for storage
 * @typedef {Object} TeamDefinition
 * @property {string} id - Unique team ID
 * @property {string} name - Team name
 * @property {string} description - Team description
 * @property {string[]} agentIds - Agent IDs in the team
 * @property {Object} config - Team configuration
 * @property {Object} metadata - Additional metadata
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * Agent Team Manager class
 * Handles team operations for SRIA agents
 *
 * @extends EventEmitter
 */
class TeamManager extends EventEmitter {
  /**
   * Create a team manager
   * @param {Object} options - Manager options
   * @param {Object} options.agentManager - Agent manager instance
   * @param {Object} [options.storage] - Storage backend (optional)
   */
  constructor(options = {}) {
    super()

    if (!options.agentManager) {
      throw new Error('AgentManager is required')
    }

    this.agentManager = options.agentManager

    // In-memory team definitions
    this.teams = new Map()

    // Active network instances
    this.networks = new Map()

    // Storage backend (optional)
    this.storage = options.storage || null
  }

  /**
   * Generate a unique team ID
   * @private
   * @returns {string} Team ID
   */
  _generateId() {
    return `team_${crypto.randomUUID().slice(0, 8)}`
  }

  /**
   * Create a new team
   * @param {Object} definition - Team definition
   * @param {string} definition.name - Team name
   * @param {string} [definition.description] - Team description
   * @param {string[]} [definition.agentIds] - Initial agent IDs
   * @param {Object} [definition.config] - Team configuration
   * @param {Object} [definition.metadata] - Additional metadata
   * @returns {TeamDefinition} Created team definition
   */
  create(definition) {
    const id = this._generateId()
    const now = new Date().toISOString()

    // Validate agent IDs
    const validAgentIds = []
    for (const agentId of definition.agentIds || []) {
      if (this.agentManager.get(agentId)) {
        validAgentIds.push(agentId)
      } else {
        this.emit('warning', {
          type: 'invalid_agent',
          agentId,
          message: `Agent ${agentId} not found, skipping`,
        })
      }
    }

    const team = {
      id,
      name: definition.name || 'Unnamed Team',
      description: definition.description || '',
      agentIds: validAgentIds,
      config: {
        couplingStrength: 0.5,
        beliefPropagation: true,
        phasePropagation: true,
        collectiveDecision: 'consensus',
        ...definition.config,
      },
      metadata: definition.metadata || {},
      createdAt: now,
      updatedAt: now,
    }

    this.teams.set(id, team)

    // Persist if storage backend available
    if (this.storage) {
      this.storage
        .saveTeam(team)
        .catch((err) => this.emit('error', { type: 'storage', error: err }))
    }

    this.emit('team_created', team)

    return team
  }

  /**
   * Get a team by ID
   * @param {string} id - Team ID
   * @returns {TeamDefinition|null} Team definition or null
   */
  get(id) {
    return this.teams.get(id) || null
  }

  /**
   * List all teams
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.name] - Filter by name (partial match)
   * @param {string} [filters.agentId] - Filter by agent ID
   * @returns {TeamDefinition[]} List of teams
   */
  list(filters = {}) {
    let teams = Array.from(this.teams.values())

    if (filters.name) {
      const nameLower = filters.name.toLowerCase()
      teams = teams.filter((t) => t.name.toLowerCase().includes(nameLower))
    }

    if (filters.agentId) {
      teams = teams.filter((t) => t.agentIds.includes(filters.agentId))
    }

    return teams
  }

  /**
   * Update a team
   * @param {string} id - Team ID
   * @param {Object} updates - Updates to apply
   * @returns {TeamDefinition|null} Updated team or null
   */
  update(id, updates) {
    const team = this.teams.get(id)
    if (!team) return null

    // Apply updates (excluding id and createdAt)
    const updatedTeam = {
      ...team,
      ...updates,
      id: team.id,
      createdAt: team.createdAt,
      updatedAt: new Date().toISOString(),
    }

    // Validate agent IDs if updated
    if (updates.agentIds) {
      updatedTeam.agentIds = updates.agentIds.filter((agentId) => {
        if (this.agentManager.get(agentId)) {
          return true
        }
        this.emit('warning', {
          type: 'invalid_agent',
          agentId,
          message: `Agent ${agentId} not found, skipping`,
        })
        return false
      })
    }

    this.teams.set(id, updatedTeam)

    // Recreate network if active
    if (this.networks.has(id)) {
      this.networks.delete(id)
    }

    // Persist if storage backend available
    if (this.storage) {
      this.storage
        .saveTeam(updatedTeam)
        .catch((err) => this.emit('error', { type: 'storage', error: err }))
    }

    this.emit('team_updated', updatedTeam)

    return updatedTeam
  }

  /**
   * Delete a team
   * @param {string} id - Team ID
   * @returns {boolean} Success
   */
  delete(id) {
    if (!this.teams.has(id)) return false

    // Dismiss network if active
    if (this.networks.has(id)) {
      const network = this.networks.get(id)
      network.dismissAll()
      this.networks.delete(id)
    }

    this.teams.delete(id)

    // Remove from storage if backend available
    if (this.storage) {
      this.storage
        .deleteTeam(id)
        .catch((err) => this.emit('error', { type: 'storage', error: err }))
    }

    this.emit('team_deleted', { id })

    return true
  }

  /**
   * Add an agent to a team
   * @param {string} teamId - Team ID
   * @param {string} agentId - Agent ID to add
   * @returns {boolean} Success
   */
  addAgent(teamId, agentId) {
    const team = this.teams.get(teamId)
    if (!team) return false

    if (!this.agentManager.get(agentId)) {
      this.emit('warning', {
        type: 'invalid_agent',
        agentId,
        message: `Agent ${agentId} not found`,
      })
      return false
    }

    if (team.agentIds.includes(agentId)) {
      return true // Already in team
    }

    team.agentIds.push(agentId)
    team.updatedAt = new Date().toISOString()

    // Recreate network if active
    if (this.networks.has(teamId)) {
      this.networks.delete(teamId)
    }

    this.emit('agent_added_to_team', { teamId, agentId })

    return true
  }

  /**
   * Remove an agent from a team
   * @param {string} teamId - Team ID
   * @param {string} agentId - Agent ID to remove
   * @returns {boolean} Success
   */
  removeAgent(teamId, agentId) {
    const team = this.teams.get(teamId)
    if (!team) return false

    const index = team.agentIds.indexOf(agentId)
    if (index === -1) return false

    team.agentIds.splice(index, 1)
    team.updatedAt = new Date().toISOString()

    // Recreate network if active
    if (this.networks.has(teamId)) {
      this.networks.delete(teamId)
    }

    this.emit('agent_removed_from_team', { teamId, agentId })

    return true
  }

  /**
   * Get or create a network instance for a team
   * @param {string} id - Team ID
   * @returns {MultiAgentNetwork|null} Network instance or null
   */
  getNetwork(id) {
    // Return existing network
    if (this.networks.has(id)) {
      return this.networks.get(id)
    }

    // Create new network from definition
    const team = this.teams.get(id)
    if (!team) return null

    const network = new MultiAgentNetwork({ name: team.name })

    // Add agents to network
    for (const agentId of team.agentIds) {
      const engine = this.agentManager.getEngine(agentId)
      if (engine) {
        network.addAgent(engine)
      }
    }

    // Forward events
    network.on('network_summoned', (data) => this.emit('network_summoned', { teamId: id, ...data }))
    network.on('collective_step', (data) => this.emit('collective_step', { teamId: id, ...data }))
    network.on('network_dismissed', (data) =>
      this.emit('network_dismissed', { teamId: id, ...data }),
    )

    this.networks.set(id, network)

    return network
  }

  /**
   * Summon all agents in a team
   * @param {string} id - Team ID
   * @param {Object} [options] - Summon options
   * @returns {Object} Summon result
   */
  summonTeam(id, options = {}) {
    const network = this.getNetwork(id)
    if (!network) {
      return { success: false, error: 'Team not found' }
    }

    const results = network.summonAll(options)

    return {
      success: true,
      teamId: id,
      results,
    }
  }

  /**
   * Execute a collective step for a team
   * @param {string} id - Team ID
   * @param {string} observation - Shared observation
   * @param {Object[]} possibleActions - Available actions
   * @returns {Object} Collective step result
   */
  collectiveStep(id, observation, possibleActions) {
    const network = this.networks.get(id)
    if (!network) {
      return { success: false, error: 'Team network not active' }
    }

    return network.collectiveStep(observation, possibleActions)
  }

  /**
   * Dismiss all agents in a team
   * @param {string} id - Team ID
   * @returns {Object} Dismiss result
   */
  dismissTeam(id) {
    const network = this.networks.get(id)
    if (!network) {
      return { success: false, error: 'Team network not active' }
    }

    const results = network.dismissAll()

    return {
      success: true,
      teamId: id,
      results,
    }
  }

  /**
   * Get team state
   * @param {string} id - Team ID
   * @returns {Object|null} Team state or null
   */
  getState(id) {
    const network = this.networks.get(id)
    const team = this.teams.get(id)

    if (!team) return null

    if (!network) {
      return {
        id,
        name: team.name,
        active: false,
        definition: team,
        agentStates: team.agentIds.map((agentId) => this.agentManager.getState(agentId)),
      }
    }

    return {
      id,
      name: team.name,
      active: true,
      network: network.getState(),
      definition: team,
    }
  }

  /**
   * Get teams for an agent
   * @param {string} agentId - Agent ID
   * @returns {TeamDefinition[]} Teams containing the agent
   */
  getTeamsForAgent(agentId) {
    return this.list({ agentId })
  }

  /**
   * Load teams from storage
   * @returns {Promise<number>} Number of teams loaded
   */
  async loadFromStorage() {
    if (!this.storage) {
      return 0
    }

    try {
      const teams = await this.storage.loadAllTeams()
      for (const team of teams) {
        this.teams.set(team.id, team)
      }
      return teams.length
    } catch (err) {
      this.emit('error', { type: 'storage', error: err })
      return 0
    }
  }

  /**
   * Get statistics about the team manager
   * @returns {Object} Statistics
   */
  getStats() {
    const definitions = Array.from(this.teams.values())
    const networks = Array.from(this.networks.values())
    const activeNetworks = networks.filter((n) => n.agents.some((a) => a.session !== null))

    return {
      totalTeams: definitions.length,
      activeNetworks: networks.length,
      summonedTeams: activeNetworks.length,
      averageTeamSize:
        definitions.reduce((sum, t) => sum + t.agentIds.length, 0) / (definitions.length || 1),
      largestTeam: Math.max(...definitions.map((t) => t.agentIds.length), 0),
    }
  }
}

module.exports = {
  TeamManager,
}
