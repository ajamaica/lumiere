/**
 * SRIA REST API Routes
 *
 * Provides REST endpoints for low-level SRIA operations:
 * - Direct engine operations
 * - Layer management
 * - Resonance and beacon operations
 * - Perception and belief queries
 *
 * @module lib/app/server/sria-routes
 */

const { Router } = require('express')
const { SRIAEngine, SummonableLayer, LAYER_CONFIGS, getDefaultActions } = require('../../sria')

/**
 * Create SRIA routes
 * @param {Object} options - Route options
 * @param {Object} options.agentManager - Agent manager instance
 * @returns {Router} Express router
 */
function createSRIARoutes(options) {
  const { agentManager } = options
  const router = Router()

  /**
   * Get layer configurations
   * GET /sria/layers
   */
  router.get('/layers', (req, res) => {
    try {
      const layers = Object.entries(LAYER_CONFIGS).map(([name, config]) => ({
        name,
        ...config,
      }))

      res.json({
        success: true,
        data: layers,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get default actions
   * GET /sria/actions
   */
  router.get('/actions', (req, res) => {
    try {
      const actions = getDefaultActions()

      res.json({
        success: true,
        data: actions,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Compute resonance key for text
   * POST /sria/resonance
   */
  router.post('/resonance', (req, res) => {
    try {
      const { text, bodyPrimes } = req.body

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required',
        })
      }

      // Create temporary engine for resonance computation
      const engine = new SRIAEngine({
        bodyPrimes: bodyPrimes || undefined,
      })

      const resonanceKey = engine.computeResonanceKey(text)
      const verification = engine.verifyResonance(resonanceKey)

      res.json({
        success: true,
        data: {
          resonanceKey,
          verification,
          bodyHash: engine.generateBodyHash(),
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
   * Encode a percept
   * POST /sria/encode
   */
  router.post('/encode', (req, res) => {
    try {
      const { text, primes } = req.body

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required',
        })
      }

      const engine = new SRIAEngine({
        bodyPrimes: primes || undefined,
      })

      const percept = engine.encodePercept(text, primes || undefined)

      res.json({
        success: true,
        data: percept,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Summon a layer for an agent
   * POST /sria/agents/:id/layers/:layer
   */
  router.post('/agents/:id/layers/:layer', (req, res) => {
    try {
      const { id, layer } = req.params

      if (!Object.values(SummonableLayer).includes(layer)) {
        return res.status(400).json({
          success: false,
          error: `Invalid layer: ${layer}`,
        })
      }

      const engine = agentManager.getEngine(id)
      if (!engine) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      const result = engine.summonLayer(layer)

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
   * Get agent's current beliefs
   * GET /sria/agents/:id/beliefs
   */
  router.get('/agents/:id/beliefs', (req, res) => {
    try {
      const engine = agentManager.getEngine(req.params.id)

      if (!engine) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      if (!engine.session) {
        return res.status(400).json({
          success: false,
          error: 'Agent not summoned',
        })
      }

      res.json({
        success: true,
        data: {
          beliefs: engine.session.currentBeliefs,
          entropyTrajectory: engine.session.entropyTrajectory.slice(-10),
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
   * Get agent's quaternion state
   * GET /sria/agents/:id/quaternion
   */
  router.get('/agents/:id/quaternion', (req, res) => {
    try {
      const engine = agentManager.getEngine(req.params.id)

      if (!engine) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      res.json({
        success: true,
        data: {
          quaternion: engine.quaternionState,
          epoch: engine.currentEpoch,
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
   * Get agent's memory phases
   * GET /sria/agents/:id/memory
   */
  router.get('/agents/:id/memory', (req, res) => {
    try {
      const engine = agentManager.getEngine(req.params.id)

      if (!engine) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      // Compute phase statistics
      const phaseCounts = {}
      const phaseAverages = {}

      for (const [prime, phases] of Object.entries(engine.memoryPhases)) {
        phaseCounts[prime] = phases.length
        phaseAverages[prime] =
          phases.length > 0 ? phases.reduce((a, b) => a + b, 0) / phases.length : 0
      }

      res.json({
        success: true,
        data: {
          bodyPrimes: engine.bodyPrimes,
          memoryPhases: engine.memoryPhases,
          phaseCounts,
          phaseAverages,
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
   * Get agent's beacons
   * GET /sria/agents/:id/beacons
   */
  router.get('/agents/:id/beacons', (req, res) => {
    try {
      const engine = agentManager.getEngine(req.params.id)

      if (!engine) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      res.json({
        success: true,
        data: {
          beacons: engine.beacons,
          count: engine.beacons.length,
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
   * Generate a new beacon
   * POST /sria/agents/:id/beacons
   */
  router.post('/agents/:id/beacons', (req, res) => {
    try {
      const engine = agentManager.getEngine(req.params.id)

      if (!engine) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      const beacon = engine.generateBeaconFingerprint()

      res.json({
        success: true,
        data: beacon,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Get agent's attention weights
   * GET /sria/agents/:id/attention
   */
  router.get('/agents/:id/attention', (req, res) => {
    try {
      const engine = agentManager.getEngine(req.params.id)

      if (!engine) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      if (!engine.session) {
        return res.status(400).json({
          success: false,
          error: 'Agent not summoned',
        })
      }

      res.json({
        success: true,
        data: {
          attention: engine.session.attention,
          summonedAt: engine.session.summonedAt,
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
   * Serialize agent state
   * GET /sria/agents/:id/export
   */
  router.get('/agents/:id/export', (req, res) => {
    try {
      const engine = agentManager.getEngine(req.params.id)

      if (!engine) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        })
      }

      const serialized = engine.serialize()

      res.json({
        success: true,
        data: serialized,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

  /**
   * Import agent state
   * POST /sria/agents/import
   */
  router.post('/agents/import', (req, res) => {
    try {
      const data = req.body

      if (!data.bodyPrimes || !data.name) {
        return res.status(400).json({
          success: false,
          error: 'Invalid agent data',
        })
      }

      // Create agent from serialized data
      const agent = agentManager.create({
        name: data.name,
        bodyPrimes: data.bodyPrimes,
        perceptionConfig: data.perceptionConfig,
        goalPriors: data.goalPriors,
        attractorBiases: data.attractorBiases,
        collapseDynamics: data.collapseDynamics,
        safetyConstraints: data.safetyConstraints,
      })

      // Restore memory phases and epoch
      const engine = agentManager.getEngine(agent.id)
      if (engine && data.memoryPhases) {
        engine.memoryPhases = data.memoryPhases
      }
      if (engine && data.quaternionState) {
        engine.quaternionState = data.quaternionState
      }
      if (engine && data.currentEpoch) {
        engine.currentEpoch = data.currentEpoch
      }

      res.status(201).json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          imported: true,
        },
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
  createSRIARoutes,
}
