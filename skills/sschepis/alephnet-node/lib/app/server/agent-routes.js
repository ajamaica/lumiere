/**
 * Agent REST API Routes
 *
 * Provides REST endpoints for SRIA agent management:
 * - CRUD operations for agents
 * - Summoning and dismissing
 * - Stepping and execution
 * - State queries
 *
 * @module lib/app/server/agent-routes
 */

const { Router } = require('express')

/**
 * Create agent routes
 * @param {Object} options - Route options
 * @param {Object} options.agentManager - Agent manager instance
 * @param {Object} [options.runner] - Agent runner instance
 * @returns {Router} Express router
 */
function createAgentRoutes(options) {
  const { agentManager, runner } = options
  const router = Router()

  /**
   * List all agents
   * GET /agents
   */
  router.get('/', (req, res) => {
    try {
      const filters = {}
      if (req.query.name) filters.name = req.query.name
      if (req.query.bodyPrimes) {
        filters.bodyPrimes = req.query.bodyPrimes.split(',').map(Number)
      }

      const agents = agentManager.list(filters)

      res.json({
        success: true,
        data: agents,
        count: agents.length,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get agent templates
   * GET /agents/templates
   */
  router.get('/templates', (req, res) => {
    try {
      const templates = agentManager.listTemplates()

      res.json({
        success: true,
        data: templates,
        count: templates.length,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get agent statistics
   * GET /agents/stats
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = agentManager.getStats()

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
   * Create a new agent
   * POST /agents
   */
  router.post('/', (req, res) => {
    try {
      const agent = agentManager.create(req.body)

      res.status(201).json({
        success: true,
        data: agent,
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get an agent by ID
   * GET /agents/:id
   */
  router.get('/:id', (req, res) => {
    try {
      const agent = agentManager.get(req.params.id)

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      res.json({
        success: true,
        data: agent,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Update an agent
   * PUT /agents/:id
   */
  router.put('/:id', (req, res) => {
    try {
      const agent = agentManager.update(req.params.id, req.body)

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      res.json({
        success: true,
        data: agent,
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Delete an agent
   * DELETE /agents/:id
   */
  router.delete('/:id', (req, res) => {
    try {
      const success = agentManager.delete(req.params.id)

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      res.json({
        success: true,
        message: 'Agent deleted',
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get agent state
   * GET /agents/:id/state
   */
  router.get('/:id/state', (req, res) => {
    try {
      const state = agentManager.getState(req.params.id)

      if (!state) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
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
   * Summon an agent
   * POST /agents/:id/summon
   */
  router.post('/:id/summon', (req, res) => {
    try {
      const result = agentManager.summon(req.params.id, req.body)

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
   * Dismiss an agent
   * POST /agents/:id/dismiss
   */
  router.post('/:id/dismiss', (req, res) => {
    try {
      const result = agentManager.dismiss(req.params.id)

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
   * Execute a step for an agent
   * POST /agents/:id/step
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

      const result = agentManager.step(req.params.id, observation, actions || [])

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

  // Runner routes (if runner is provided)
  if (runner) {
    /**
     * Start a run for an agent
     * POST /agents/:id/run
     */
    router.post('/:id/run', (req, res) => {
      try {
        const handle = runner.start(req.params.id, req.body)

        res.json({
          success: true,
          data: {
            runId: handle.runId,
            agentId: handle.agentId,
          },
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        })
      }
    })

    /**
     * Get run status
     * GET /agents/:id/run/:runId
     */
    router.get('/:id/run/:runId', (req, res) => {
      try {
        const status = runner.getRunStatus(req.params.runId)

        if (!status) {
          return res.status(404).json({
            success: false,
            error: 'Run not found',
          })
        }

        res.json({
          success: true,
          data: status,
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        })
      }
    })

    /**
     * Get run results
     * GET /agents/:id/run/:runId/results
     */
    router.get('/:id/run/:runId/results', (req, res) => {
      try {
        const results = runner.getRunResults(req.params.runId)

        if (!results) {
          return res.status(404).json({
            success: false,
            error: 'Run not found',
          })
        }

        res.json({
          success: true,
          data: results,
          count: results.length,
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        })
      }
    })

    /**
     * Stop a run
     * POST /agents/:id/run/:runId/stop
     */
    router.post('/:id/run/:runId/stop', (req, res) => {
      try {
        const success = runner.stop(req.params.runId)

        if (!success) {
          return res.status(404).json({
            success: false,
            error: 'Run not found',
          })
        }

        res.json({
          success: true,
          message: 'Run stopped',
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        })
      }
    })

    /**
     * Pause a run
     * POST /agents/:id/run/:runId/pause
     */
    router.post('/:id/run/:runId/pause', (req, res) => {
      try {
        const success = runner.pause(req.params.runId)

        if (!success) {
          return res.status(400).json({
            success: false,
            error: 'Cannot pause run',
          })
        }

        res.json({
          success: true,
          message: 'Run paused',
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        })
      }
    })

    /**
     * Resume a run
     * POST /agents/:id/run/:runId/resume
     */
    router.post('/:id/run/:runId/resume', (req, res) => {
      try {
        const success = runner.resume(req.params.runId)

        if (!success) {
          return res.status(400).json({
            success: false,
            error: 'Cannot resume run',
          })
        }

        res.json({
          success: true,
          message: 'Run resumed',
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        })
      }
    })

    /**
     * Get runner telemetry
     * GET /agents/runner/telemetry
     */
    router.get('/runner/telemetry', (req, res) => {
      try {
        const telemetry = runner.getTelemetry()

        res.json({
          success: true,
          data: telemetry,
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        })
      }
    })

    /**
     * List active runs
     * GET /agents/runner/active
     */
    router.get('/runner/active', (req, res) => {
      try {
        const runs = runner.listActiveRuns()

        res.json({
          success: true,
          data: runs,
          count: runs.length,
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        })
      }
    })
  }

  return router
}

module.exports = {
  createAgentRoutes,
}
