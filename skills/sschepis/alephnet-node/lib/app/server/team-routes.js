/**
 * Team REST API Routes
 *
 * Provides REST endpoints for agent team management:
 * - CRUD operations for teams
 * - Adding/removing agents
 * - Team summoning and dismissing
 * - Collective stepping
 *
 * @module lib/app/server/team-routes
 */

const { Router } = require('express')

/**
 * Create team routes
 * @param {Object} options - Route options
 * @param {Object} options.teamManager - Team manager instance
 * @returns {Router} Express router
 */
function createTeamRoutes(options) {
  const { teamManager } = options
  const router = Router()

  /**
   * List all teams
   * GET /teams
   */
  router.get('/', (req, res) => {
    try {
      const filters = {}
      if (req.query.name) filters.name = req.query.name
      if (req.query.agentId) filters.agentId = req.query.agentId

      const teams = teamManager.list(filters)

      res.json({
        success: true,
        data: teams,
        count: teams.length,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get team statistics
   * GET /teams/stats
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = teamManager.getStats()

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Create a new team
   * POST /teams
   */
  router.post('/', (req, res) => {
    try {
      const team = teamManager.create(req.body)

      res.status(201).json({
        success: true,
        data: team,
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get a team by ID
   * GET /teams/:id
   */
  router.get('/:id', (req, res) => {
    try {
      const team = teamManager.get(req.params.id)

      if (!team) {
        return res.status(404).json({
          success: false,
          error: 'Team not found',
        })
      }

      res.json({
        success: true,
        data: team,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Update a team
   * PUT /teams/:id
   */
  router.put('/:id', (req, res) => {
    try {
      const team = teamManager.update(req.params.id, req.body)

      if (!team) {
        return res.status(404).json({
          success: false,
          error: 'Team not found',
        })
      }

      res.json({
        success: true,
        data: team,
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Delete a team
   * DELETE /teams/:id
   */
  router.delete('/:id', (req, res) => {
    try {
      const success = teamManager.delete(req.params.id)

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Team not found',
        })
      }

      res.json({
        success: true,
        message: 'Team deleted',
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get team state
   * GET /teams/:id/state
   */
  router.get('/:id/state', (req, res) => {
    try {
      const state = teamManager.getState(req.params.id)

      if (!state) {
        return res.status(404).json({
          success: false,
          error: 'Team not found',
        })
      }

      res.json({
        success: true,
        data: state,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Add an agent to a team
   * POST /teams/:id/agents
   */
  router.post('/:id/agents', (req, res) => {
    try {
      const { agentId } = req.body

      if (!agentId) {
        return res.status(400).json({
          success: false,
          error: 'agentId is required',
        })
      }

      const success = teamManager.addAgent(req.params.id, agentId)

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to add agent to team',
        })
      }

      res.json({
        success: true,
        message: 'Agent added to team',
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Remove an agent from a team
   * DELETE /teams/:id/agents/:agentId
   */
  router.delete('/:id/agents/:agentId', (req, res) => {
    try {
      const success = teamManager.removeAgent(req.params.id, req.params.agentId)

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found in team',
        })
      }

      res.json({
        success: true,
        message: 'Agent removed from team',
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Summon a team (activate all agents)
   * POST /teams/:id/summon
   */
  router.post('/:id/summon', (req, res) => {
    try {
      const result = teamManager.summonTeam(req.params.id, req.body)

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        })
      }

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Dismiss a team (deactivate all agents)
   * POST /teams/:id/dismiss
   */
  router.post('/:id/dismiss', (req, res) => {
    try {
      const result = teamManager.dismissTeam(req.params.id)

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        })
      }

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Execute a collective step for a team
   * POST /teams/:id/step
   */
  router.post('/:id/step', (req, res) => {
    try {
      const { observation, actions } = req.body

      if (!observation) {
        return res.status(400).json({
          success: false,
          error: 'Observation is required',
        })
      }

      const result = teamManager.collectiveStep(req.params.id, observation, actions || [])

      if (!result.success && result.error) {
        return res.status(400).json({
          success: false,
          error: result.error,
        })
      }

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get network for a team
   * GET /teams/:id/network
   */
  router.get('/:id/network', (req, res) => {
    try {
      const network = teamManager.getNetwork(req.params.id)

      if (!network) {
        return res.status(404).json({
          success: false,
          error: 'Team or network not found',
        })
      }

      res.json({
        success: true,
        data: network.getState(),
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  return router
}

module.exports = {
  createTeamRoutes,
}
