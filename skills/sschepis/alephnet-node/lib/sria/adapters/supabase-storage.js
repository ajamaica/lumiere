/**
 * Supabase Storage Adapter for SRIA
 *
 * Provides persistence for agents and teams using Supabase as the backend.
 * This adapter can be used by prime-echo-core to persist agent state.
 *
 * @module lib/sria/adapters/supabase-storage
 */

/**
 * Supabase Storage Adapter
 * Implements the storage interface required by AgentManager and TeamManager
 */
class SupabaseStorageAdapter {
  /**
   * Create a Supabase storage adapter
   * @param {Object} options - Adapter options
   * @param {Object} options.supabase - Supabase client instance
   * @param {string} [options.agentsTable='agents'] - Table name for agents
   * @param {string} [options.teamsTable='agent_teams'] - Table name for teams
   * @param {string} [options.sriasTable='srias'] - Table name for SRIA definitions
   * @param {string} [options.sessionsTable='sria_sessions'] - Table name for sessions
   * @param {string} [options.beaconsTable='sria_beacons'] - Table name for beacons
   */
  constructor(options = {}) {
    if (!options.supabase) {
      throw new Error('Supabase client is required')
    }

    this.supabase = options.supabase
    this.agentsTable = options.agentsTable || 'agents'
    this.teamsTable = options.teamsTable || 'agent_teams'
    this.sriasTable = options.sriasTable || 'srias'
    this.sessionsTable = options.sessionsTable || 'sria_sessions'
    this.beaconsTable = options.beaconsTable || 'sria_beacons'
  }

  // =========== Agent Storage ===========

  /**
   * Save an agent definition
   * @param {Object} agent - Agent definition
   * @returns {Promise<Object>} Saved agent
   */
  async saveAgent(agent) {
    const { data, error } = await this.supabase
      .from(this.agentsTable)
      .upsert({
        id: agent.id,
        name: agent.name,
        body_primes: agent.bodyPrimes,
        perception_config: agent.perceptionConfig,
        goal_priors: agent.goalPriors,
        attractor_biases: agent.attractorBiases,
        collapse_dynamics: agent.collapseDynamics,
        safety_constraints: agent.safetyConstraints,
        metadata: agent.metadata,
        created_at: agent.createdAt,
        updated_at: agent.updatedAt,
      })
      .select()
      .single()

    if (error) throw error
    return this._mapAgentFromDb(data)
  }

  /**
   * Load an agent by ID
   * @param {string} id - Agent ID
   * @returns {Promise<Object|null>} Agent or null
   */
  async loadAgent(id) {
    const { data, error } = await this.supabase
      .from(this.agentsTable)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return this._mapAgentFromDb(data)
  }

  /**
   * Load all agents
   * @returns {Promise<Object[]>} Array of agents
   */
  async loadAllAgents() {
    const { data, error } = await this.supabase
      .from(this.agentsTable)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data.map((row) => this._mapAgentFromDb(row))
  }

  /**
   * Delete an agent
   * @param {string} id - Agent ID
   * @returns {Promise<boolean>} Success
   */
  async deleteAgent(id) {
    const { error } = await this.supabase.from(this.agentsTable).delete().eq('id', id)

    if (error) throw error
    return true
  }

  // =========== Team Storage ===========

  /**
   * Save a team definition
   * @param {Object} team - Team definition
   * @returns {Promise<Object>} Saved team
   */
  async saveTeam(team) {
    const { data, error } = await this.supabase
      .from(this.teamsTable)
      .upsert({
        id: team.id,
        name: team.name,
        description: team.description,
        agent_ids: team.agentIds,
        config: team.config,
        metadata: team.metadata,
        created_at: team.createdAt,
        updated_at: team.updatedAt,
      })
      .select()
      .single()

    if (error) throw error
    return this._mapTeamFromDb(data)
  }

  /**
   * Load a team by ID
   * @param {string} id - Team ID
   * @returns {Promise<Object|null>} Team or null
   */
  async loadTeam(id) {
    const { data, error } = await this.supabase
      .from(this.teamsTable)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return this._mapTeamFromDb(data)
  }

  /**
   * Load all teams
   * @returns {Promise<Object[]>} Array of teams
   */
  async loadAllTeams() {
    const { data, error } = await this.supabase
      .from(this.teamsTable)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data.map((row) => this._mapTeamFromDb(row))
  }

  /**
   * Delete a team
   * @param {string} id - Team ID
   * @returns {Promise<boolean>} Success
   */
  async deleteTeam(id) {
    const { error } = await this.supabase.from(this.teamsTable).delete().eq('id', id)

    if (error) throw error
    return true
  }

  // =========== SRIA Storage ===========

  /**
   * Save SRIA state (memory phases, quaternion, etc.)
   * @param {string} agentId - Agent ID
   * @param {Object} sriaState - SRIA engine state
   * @returns {Promise<Object>} Saved state
   */
  async saveSRIAState(agentId, sriaState) {
    const { data, error } = await this.supabase
      .from(this.sriasTable)
      .upsert({
        agent_id: agentId,
        memory_phases: sriaState.memoryPhases,
        quaternion_state: sriaState.quaternionState,
        current_epoch: sriaState.currentEpoch,
        body_hash: sriaState.bodyHash,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Load SRIA state
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object|null>} SRIA state or null
   */
  async loadSRIAState(agentId) {
    const { data, error } = await this.supabase
      .from(this.sriasTable)
      .select('*')
      .eq('agent_id', agentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return {
      memoryPhases: data.memory_phases,
      quaternionState: data.quaternion_state,
      currentEpoch: data.current_epoch,
      bodyHash: data.body_hash,
    }
  }

  // =========== Session Storage ===========

  /**
   * Save a session
   * @param {string} agentId - Agent ID
   * @param {Object} session - Session data
   * @returns {Promise<Object>} Saved session
   */
  async saveSession(agentId, session) {
    const { data, error } = await this.supabase
      .from(this.sessionsTable)
      .insert({
        id: session.id,
        agent_id: agentId,
        summoned_at: session.summonedAt,
        dismissed_at: session.dismissedAt || null,
        action_count: session.actionHistory?.length || 0,
        entropy_trajectory: session.entropyTrajectory,
        final_beliefs: session.currentBeliefs,
        free_energy: session.freeEnergy,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update session on dismiss
   * @param {string} sessionId - Session ID
   * @param {Object} dismissData - Dismiss data
   * @returns {Promise<Object>} Updated session
   */
  async dismissSession(sessionId, dismissData) {
    const { data, error } = await this.supabase
      .from(this.sessionsTable)
      .update({
        dismissed_at: new Date().toISOString(),
        action_count: dismissData.actionCount,
        entropy_trajectory: dismissData.entropyTrajectory,
        final_beliefs: dismissData.finalBeliefs,
        duration: dismissData.duration,
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get sessions for an agent
   * @param {string} agentId - Agent ID
   * @param {number} [limit=10] - Maximum sessions to return
   * @returns {Promise<Object[]>} Sessions
   */
  async getAgentSessions(agentId, limit = 10) {
    const { data, error } = await this.supabase
      .from(this.sessionsTable)
      .select('*')
      .eq('agent_id', agentId)
      .order('summoned_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  // =========== Beacon Storage ===========

  /**
   * Save a beacon
   * @param {string} agentId - Agent ID
   * @param {Object} beacon - Beacon data
   * @returns {Promise<Object>} Saved beacon
   */
  async saveBeacon(agentId, beacon) {
    const { data, error } = await this.supabase
      .from(this.beaconsTable)
      .insert({
        agent_id: agentId,
        fingerprint: beacon.fingerprint,
        epoch: beacon.epoch,
        body_hash: beacon.bodyHash,
        signature: beacon.signature,
        created_at: new Date(beacon.timestamp).toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get beacons for an agent
   * @param {string} agentId - Agent ID
   * @param {number} [limit=10] - Maximum beacons to return
   * @returns {Promise<Object[]>} Beacons
   */
  async getAgentBeacons(agentId, limit = 10) {
    const { data, error } = await this.supabase
      .from(this.beaconsTable)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data.map((row) => ({
      fingerprint: row.fingerprint,
      epoch: row.epoch,
      timestamp: new Date(row.created_at).getTime(),
      bodyHash: row.body_hash,
      signature: row.signature,
    }))
  }

  /**
   * Find beacon by fingerprint
   * @param {string} fingerprint - Beacon fingerprint
   * @returns {Promise<Object|null>} Beacon or null
   */
  async findBeaconByFingerprint(fingerprint) {
    const { data, error } = await this.supabase
      .from(this.beaconsTable)
      .select('*')
      .eq('fingerprint', fingerprint)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return {
      fingerprint: data.fingerprint,
      epoch: data.epoch,
      timestamp: new Date(data.created_at).getTime(),
      bodyHash: data.body_hash,
      signature: data.signature,
      agentId: data.agent_id,
    }
  }

  // =========== Helpers ===========

  /**
   * Map database row to agent object
   * @private
   */
  _mapAgentFromDb(row) {
    return {
      id: row.id,
      name: row.name,
      bodyPrimes: row.body_primes,
      perceptionConfig: row.perception_config,
      goalPriors: row.goal_priors,
      attractorBiases: row.attractor_biases,
      collapseDynamics: row.collapse_dynamics,
      safetyConstraints: row.safety_constraints,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  /**
   * Map database row to team object
   * @private
   */
  _mapTeamFromDb(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      agentIds: row.agent_ids,
      config: row.config,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

/**
 * Database migration SQL for Supabase
 * Run this in Supabase SQL editor to create required tables
 */
const MIGRATION_SQL = `
-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    body_primes INTEGER[] NOT NULL DEFAULT '{2,3,5,7,11}',
    perception_config JSONB,
    goal_priors JSONB,
    attractor_biases JSONB,
    collapse_dynamics JSONB,
    safety_constraints JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent teams table
CREATE TABLE IF NOT EXISTS agent_teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    agent_ids TEXT[] NOT NULL DEFAULT '{}',
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SRIA state table (memory phases, quaternion state)
CREATE TABLE IF NOT EXISTS srias (
    agent_id TEXT PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    memory_phases JSONB DEFAULT '{}',
    quaternion_state JSONB DEFAULT '{"w":1,"x":0,"y":0,"z":0}',
    current_epoch INTEGER DEFAULT 0,
    body_hash TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sria_sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    summoned_at TIMESTAMPTZ NOT NULL,
    dismissed_at TIMESTAMPTZ,
    action_count INTEGER DEFAULT 0,
    entropy_trajectory DOUBLE PRECISION[] DEFAULT '{}',
    final_beliefs JSONB,
    free_energy DOUBLE PRECISION,
    duration INTEGER
);

-- Beacons table
CREATE TABLE IF NOT EXISTS sria_beacons (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL UNIQUE,
    epoch INTEGER NOT NULL,
    body_hash TEXT,
    signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_teams_name ON agent_teams(name);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sria_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_beacons_agent ON sria_beacons(agent_id);
CREATE INDEX IF NOT EXISTS idx_beacons_fingerprint ON sria_beacons(fingerprint);

-- RLS policies (enable for production)
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agent_teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE srias ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sria_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sria_beacons ENABLE ROW LEVEL SECURITY;
`

module.exports = {
  SupabaseStorageAdapter,
  MIGRATION_SQL,
}
