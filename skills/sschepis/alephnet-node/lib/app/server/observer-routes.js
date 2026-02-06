/**
 * Observer Routes
 *
 * Handles observer state API endpoints including status, introspection, memory, etc.
 */

const {
  loggers,
  sendJson,
  readBody,
  getSenseSummary,
  SMF_AXES,
  SMF_AXIS_DESCRIPTIONS,
} = require('./utils')

/**
 * Creates observer route handlers
 * @param {Object} server - SentientServer instance
 * @returns {Object} Route handlers
 */
function createObserverRoutes(server) {
  return {
    /**
     * Get observer status (with connection flags for UI)
     */
    getStatus: async (req, res) => {
      const baseStatus = server.observer.getStatus()

      // Add connection status flags for UI indicators
      const enhancedStatus = {
        ...baseStatus,
        llmConnected: !!(server.chat?.llm?.connected !== false),
        wsConnected: server.webrtcCoordinator ? true : false,
        providerStatus: server.providerManager?.getActiveProvider?.()?.id || 'unknown',
        nodeId: server.nodeId,
        uptime: Date.now() - server.startTime,
        learningActive: server.learner?.isRunning || false,
      }

      sendJson(res, enhancedStatus)
    },

    /**
     * Get full introspection
     */
    getIntrospect: async (req, res) => {
      sendJson(res, server.observer.introspect())
    },

    /**
     * Get conversation history
     */
    getHistory: async (req, res) => {
      sendJson(res, { messages: server.conversationHistory })
    },

    /**
     * Clear conversation history
     */
    deleteHistory: async (req, res) => {
      server.conversationHistory = []
      server.saveConversationHistory()
      sendJson(res, { success: true })
    },

    /**
     * Delete specific messages from history
     */
    deleteHistoryMessages: async (req, res) => {
      try {
        const body = await readBody(req)
        const { index, count = 1 } = JSON.parse(body)

        if (typeof index !== 'number' || index < 0 || index >= server.conversationHistory.length) {
          sendJson(res, { success: false, error: 'Invalid index' }, 400)
          return
        }

        const deleteCount = Math.min(count, server.conversationHistory.length - index)
        server.conversationHistory.splice(index, deleteCount)
        server.saveConversationHistory()

        sendJson(res, {
          success: true,
          deleted: deleteCount,
          remaining: server.conversationHistory.length,
        })
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Get sense readings
     */
    getSenses: async (req, res) => {
      const reading = await server.senses.read(true)

      // Format sense data for the UI
      const senseData = {}
      for (const [name, data] of Object.entries(reading.readings)) {
        const r = data.reading || {}
        senseData[name] = {
          enabled: data.enabled !== false,
          error: data.error || null,
          summary: getSenseSummary(name, r),
          active: !data.error && data.enabled !== false,
        }
      }

      sendJson(res, {
        timestamp: reading.timestamp,
        senses: senseData,
        anomalies: reading.anomalies.map((a) => ({
          sense: a.sense,
          message: a.message,
          salience: a.salience,
        })),
        config: server.senses.getConfig(),
      })
    },

    /**
     * Process sight sense frame
     */
    postSightFrame: async (req, res) => {
      try {
        const body = await readBody(req)
        const { entropy, description, timestamp } = JSON.parse(body)

        if (server.senses && server.senses.senses.sight) {
          server.senses.senses.sight.processFrame({
            entropy: entropy || 0,
            description: description || '',
            timestamp: timestamp || Date.now(),
          })

          sendJson(res, { success: true })
        } else {
          sendJson(res, { success: false, error: 'Sight sense not available' }, 503)
        }
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Get SMF orientation
     */
    getSMF: async (req, res) => {
      const smf = server.observer.smf
      const orientation = {}
      const components = []

      SMF_AXES.forEach((axis, i) => {
        orientation[axis] = smf.s[i]
        components.push({
          index: i,
          name: axis,
          value: smf.s[i],
          absValue: Math.abs(smf.s[i]),
          description: SMF_AXIS_DESCRIPTIONS[i],
        })
      })

      // Track SMF history for visualization
      if (!server.smfHistory) {
        server.smfHistory = []
      }

      // Add current state to history
      server.smfHistory.push({
        timestamp: Date.now(),
        components: smf.s.slice(),
      })
      if (server.smfHistory.length > 60) {
        server.smfHistory.shift()
      }

      sendJson(res, {
        orientation,
        axes: SMF_AXES,
        components,
        entropy: smf.smfEntropy(),
        norm: smf.norm(),
        dominant: smf
          .dominantAxes(5)
          .map((a) => ({ name: a.name, value: a.value, index: a.index })),
        history: server.smfHistory.slice(-20).map((h) => ({
          t: h.timestamp,
          c: h.components,
        })),
      })
    },

    /**
     * Get oscillators state
     */
    getOscillators: async (req, res) => {
      const prsc = server.observer.prsc
      const topOscillators = prsc.oscillators
        .filter((o) => o.amplitude > 0.05)
        .sort((a, b) => b.amplitude - a.amplitude)
        .slice(0, 16)
        .map((o) => ({
          prime: o.prime,
          amplitude: o.amplitude,
          phase: o.phase,
          frequency: o.frequency,
        }))

      sendJson(res, {
        active: prsc.activeCount(0.1),
        energy: prsc.totalEnergy(),
        coherence: prsc.globalCoherence(),
        meanPhase: prsc.meanPhase(),
        amplitudeEntropy: prsc.amplitudeEntropy(),
        topOscillators,
      })
    },

    /**
     * Get moments
     */
    getMoments: async (req, res, url) => {
      const count = parseInt(url.searchParams.get('count')) || 10
      const moments = server.observer.temporal.recentMoments(count)
      sendJson(res, {
        moments: moments.map((m) => m.toJSON()),
        subjectiveTime: server.observer.temporal.getSubjectiveTime(),
        momentCount: server.observer.temporal.moments.length,
        stats: server.observer.temporal.getStats(),
      })
    },

    /**
     * Get goals
     */
    getGoals: async (req, res) => {
      const agency = server.observer.agency
      sendJson(res, {
        topGoal: agency.getTopGoal()?.toJSON() || null,
        topFocus: agency.getTopFocus()?.toJSON() || null,
        activeGoals: agency.goals.filter((g) => g.isActive).map((g) => g.toJSON()),
        foci: agency.attentionFoci.map((f) => f.toJSON()),
        stats: agency.getStats(),
      })
    },

    /**
     * Get safety stats
     */
    getSafety: async (req, res) => {
      sendJson(res, server.observer.safety.getStats())
    },

    /**
     * Get memory
     */
    getMemory: async (req, res, url) => {
      const count = parseInt(url.searchParams.get('count')) || 5
      const memories = server.observer.memory.getRecent(count)

      // Transform to UI-expected format with traces array
      const traces = memories.map((t) => {
        const json = t.toJSON()
        // Compute quaternion from SMF if available, otherwise use identity
        const quaternion = t.quaternion || t.smfOrientation || { w: 1, x: 0, y: 0, z: 0 }

        return {
          id: json.id || t.id || Math.random().toString(36).substr(2, 9),
          type: json.type || t.type || 'output',
          content: json.content || json.text || t.text || '',
          timestamp: json.timestamp || t.timestamp || Date.now(),
          importance: json.importance || t.importance || 0.5,
          quaternion: {
            w: quaternion.w ?? 1,
            x: quaternion.x ?? 0,
            y: quaternion.y ?? 0,
            z: quaternion.z ?? 0,
          },
        }
      })

      sendJson(res, {
        traces,
        recent: traces, // Keep backward compatibility
        stats: server.observer.memory.getStats(),
      })
    },

    /**
     * Search memory
     */
    searchMemory: async (req, res) => {
      try {
        const body = await readBody(req)
        const { query, limit = 10 } = JSON.parse(body)

        if (!query) {
          sendJson(res, { success: false, error: 'Query required' }, 400)
          return
        }

        // Get all memories and filter by query
        const allMemories = server.observer.memory.getRecent(100)
        const queryLower = query.toLowerCase()

        const results = allMemories
          .filter((t) => {
            const content = (t.text || t.content || '').toLowerCase()
            return content.includes(queryLower)
          })
          .slice(0, limit)
          .map((t) => {
            const json = t.toJSON ? t.toJSON() : t
            const content = json.content || json.text || t.text || ''

            // Compute simple relevance score
            const queryLower = query.toLowerCase()
            const contentLower = content.toLowerCase()
            let score = 0
            let pos = 0
            while ((pos = contentLower.indexOf(queryLower, pos)) !== -1) {
              score += 0.3
              pos++
            }
            if (contentLower.startsWith(queryLower)) score += 0.5

            return {
              id: json.id || t.id || Math.random().toString(36).substr(2, 9),
              type: json.type || t.type || 'output',
              content,
              timestamp: json.timestamp || t.timestamp || Date.now(),
              importance: json.importance || t.importance || 0.5,
              score,
            }
          })
          .sort((a, b) => b.score - a.score)

        sendJson(res, {
          success: true,
          results,
          query,
          count: results.length,
        })
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Get identity/boundary stats
     */
    getIdentity: async (req, res) => {
      sendJson(res, server.observer.boundary.getStats())
    },

    /**
     * Get HQE stabilization
     */
    getStabilization: async (req, res) => {
      sendJson(res, server.observer.hqe.getStabilizationStats())
    },

    /**
     * Get nodes/peers info
     */
    getNodes: async (req, res) => {
      const baseUrl = `http://${req.headers.host}`
      const nodeInfo = {
        nodeId: server.nodeId,
        networkId: server.options.seeds?.length > 0 ? 'connected' : 'standalone',
        seeds: server.options.seeds || [],
        webrtc: server.webrtcCoordinator
          ? {
              enabled: true,
              coordinatorUrl: `${baseUrl}/webrtc`,
              websocketUrl: `${baseUrl.replace(/^http/, 'ws')}/webrtc/signal`,
              stunServers: server.webrtcCoordinator.stunServers,
              turnServers: server.webrtcCoordinator.turnServers.map((t) =>
                typeof t === 'object' ? t.urls : t,
              ),
              rooms: server.webrtcCoordinator.rooms.getRoomList(),
              peerCount: server.webrtcCoordinator.rooms.getStats().totalPeers,
            }
          : { enabled: false },
        outbound: server.outboundConnections,
        inbound: server.inboundConnections,
        uptime: Math.round((Date.now() - server.startTime) / 1000),
      }

      sendJson(res, nodeInfo)
    },

    /**
     * Debug: LLM connection
     */
    debugLLM: async (req, res) => {
      try {
        const connected = await server.chat.connect()
        const modelName = await server.chat.llm.getCurrentModel()
        sendJson(res, {
          connected,
          modelName,
          baseUrl: server.chat.llm.baseUrl,
          host: server.chat.llm.host,
          port: server.chat.llm.port,
        })
      } catch (error) {
        sendJson(
          res,
          {
            connected: false,
            error: error.message,
            baseUrl: server.chat.llm?.baseUrl,
          },
          500,
        )
      }
    },

    /**
     * Debug: LLM ping
     */
    debugPing: async (req, res) => {
      try {
        console.log('[Debug/Ping] Testing LLM connection...')
        const response = await server.chat.llm.complete('Say "pong" and nothing else.')
        console.log('[Debug/Ping] Response:', response)
        sendJson(res, {
          success: true,
          response,
          message: 'LLM is responding',
        })
      } catch (error) {
        console.error('[Debug/Ping] Error:', error.message)
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
  }
}

module.exports = { createObserverRoutes }
