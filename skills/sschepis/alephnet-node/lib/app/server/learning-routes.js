/**
 * Learning Routes
 *
 * Handles all autonomous learning system API endpoints.
 */

const { loggers, sendJson, readBody } = require('./utils')

const { learn: logLearn } = loggers

/**
 * Creates learning route handlers
 * @param {Object} server - SentientServer instance
 * @returns {Object} Route handlers
 */
function createLearningRoutes(server) {
  return {
    /**
     * Start autonomous learning
     */
    start: async (req, res) => {
      const clientIp = req.socket.remoteAddress || 'unknown'
      logLearn('Start learning request', `from ${clientIp}`)

      if (!server.learner) {
        sendJson(res, { success: false, error: 'Learning system not initialized' }, 503)
        return
      }

      try {
        await server.learner.start()
        sendJson(res, {
          success: true,
          session: server.learner.learningSession,
          message: 'Autonomous learning started',
        })
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Stop autonomous learning
     */
    stop: async (req, res) => {
      const clientIp = req.socket.remoteAddress || 'unknown'
      logLearn('Stop learning request', `from ${clientIp}`)

      if (!server.learner) {
        sendJson(res, { success: false, error: 'Learning system not initialized' }, 503)
        return
      }

      server.learner.stop()
      sendJson(res, {
        success: true,
        message: 'Autonomous learning stopped',
        session: server.learner.learningSession,
      })
    },

    /**
     * Pause learning
     */
    pause: async (req, res) => {
      const clientIp = req.socket.remoteAddress || 'unknown'
      logLearn('Pause learning request', `from ${clientIp}`)

      if (!server.learner) {
        sendJson(res, { success: false, error: 'Learning system not initialized' }, 503)
        return
      }

      server.learner.pause()
      sendJson(res, { success: true, message: 'Learning paused' })
    },

    /**
     * Resume learning
     */
    resume: async (req, res) => {
      const clientIp = req.socket.remoteAddress || 'unknown'
      logLearn('Resume learning request', `from ${clientIp}`)

      if (!server.learner) {
        sendJson(res, { success: false, error: 'Learning system not initialized' }, 503)
        return
      }

      server.learner.resume()
      sendJson(res, { success: true, message: 'Learning resumed' })
    },

    /**
     * Get learning status
     */
    getStatus: async (req, res) => {
      if (!server.learner) {
        sendJson(res, {
          initialized: false,
          running: false,
          error: 'Learning system not initialized',
        })
        return
      }

      sendJson(res, {
        initialized: true,
        ...server.learner.getStatus(),
      })
    },

    /**
     * Get chaperone logs
     */
    getLogs: async (req, res, url) => {
      if (!server.chaperone) {
        sendJson(res, { logs: [], error: 'Chaperone not initialized' })
        return
      }

      const count = parseInt(url.searchParams.get('count')) || 50
      sendJson(res, {
        logs: server.chaperone.getRecentLogs(count),
        safetyStats: server.chaperone.getSafetyStats(),
        session: server.learner?.learningSession || null,
      })
    },

    /**
     * Trigger manual reflection
     */
    reflect: async (req, res) => {
      const clientIp = req.socket.remoteAddress || 'unknown'
      logLearn('Manual reflection request', `from ${clientIp}`)

      if (!server.learner) {
        sendJson(res, { success: false, error: 'Learning system not initialized' }, 503)
        return
      }

      try {
        const reflection = await server.learner.reflect()
        sendJson(res, { success: true, reflection })
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Add a question for learning
     */
    addQuestion: async (req, res) => {
      const clientIp = req.socket.remoteAddress || 'unknown'
      logLearn('Add question request', `from ${clientIp}`)

      if (!server.learner) {
        sendJson(res, { success: false, error: 'Learning system not initialized' }, 503)
        return
      }

      try {
        const body = await readBody(req)
        const { question } = JSON.parse(body)

        if (!question) {
          sendJson(res, { success: false, error: 'Question is required' }, 400)
          return
        }

        server.learner.addQuestion(question)
        sendJson(res, {
          success: true,
          message: 'Question added for autonomous exploration',
          question,
        })
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Get safety configuration
     */
    getSafety: async (req, res) => {
      if (!server.chaperone) {
        sendJson(res, { error: 'Chaperone not initialized' }, 503)
        return
      }

      sendJson(res, {
        config: server.chaperone.safetyFilter.getConfig(),
        stats: server.chaperone.getSafetyStats(),
        audit: server.chaperone.getSafetyAudit(20),
      })
    },

    /**
     * Get conversation topics
     */
    getTopics: async (req, res) => {
      if (!server.learner || !server.learner.curiosityEngine) {
        sendJson(res, {
          topics: [],
          error: 'Curiosity engine not initialized',
        })
        return
      }

      try {
        const curiosity = server.learner.curiosityEngine
        const topics = curiosity.getConversationTopics ? curiosity.getConversationTopics() : []
        const curiosityQueue = curiosity.getCuriosityQueue ? curiosity.getCuriosityQueue(10) : []

        sendJson(res, {
          topics,
          curiosityQueue,
          totalSignals: curiosity.curiositySignals?.length || 0,
          timestamp: Date.now(),
        })
      } catch (error) {
        sendJson(
          res,
          {
            topics: [],
            error: error.message,
          },
          500,
        )
      }
    },

    /**
     * Focus on a specific topic
     */
    focusTopic: async (req, res) => {
      const clientIp = req.socket.remoteAddress || 'unknown'
      logLearn('Focus topic request', `from ${clientIp}`)

      if (!server.learner || !server.learner.curiosityEngine) {
        sendJson(
          res,
          {
            success: false,
            error: 'Curiosity engine not initialized',
          },
          503,
        )
        return
      }

      try {
        const body = await readBody(req)
        const { topic } = JSON.parse(body)

        if (!topic) {
          sendJson(
            res,
            {
              success: false,
              error: 'Topic is required',
            },
            400,
          )
          return
        }

        // Add as high-priority curiosity signal
        const curiosity = server.learner.curiosityEngine
        if (curiosity.focusOnTopic) {
          curiosity.focusOnTopic(topic)
        } else if (curiosity.recordConversationTopic) {
          curiosity.recordConversationTopic(topic, 3.0)
        }

        sendJson(res, {
          success: true,
          message: `Now focusing on: ${topic}`,
          topic,
        })
      } catch (error) {
        sendJson(
          res,
          {
            success: false,
            error: error.message,
          },
          500,
        )
      }
    },

    /**
     * SSE stream for real-time eavesdropping
     */
    stream: async (req, res) => {
      const clientIp = req.socket.remoteAddress || 'unknown'
      logLearn('New learning stream connection', `from ${clientIp}`)

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      // Send initial status
      const initialStatus = server.learner ? server.learner.getStatus() : { initialized: false }
      res.write(`event: status\ndata: ${JSON.stringify(initialStatus)}\n\n`)

      // Add to learning SSE clients
      server.learningSSEClients.add(res)
      logLearn(`Learning SSE clients: ${server.learningSSEClients.size}`)

      req.on('close', () => {
        server.learningSSEClients.delete(res)
        logLearn(`Learning SSE client disconnected, remaining: ${server.learningSSEClients.size}`)
      })
    },
  }
}

module.exports = { createLearningRoutes }
