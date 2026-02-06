/**
 * Stream Routes
 *
 * Handles SSE (Server-Sent Events) streaming endpoints for real-time updates.
 */

const { loggers, setCorsHeaders, SMF_AXES } = require('./utils')

/**
 * Creates stream route handlers
 * @param {Object} server - SentientServer instance
 * @returns {Object} Route handlers
 */
function createStreamRoutes(server) {
  /**
   * Set up SSE headers
   */
  function setupSSE(res) {
    setCorsHeaders(res)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
  }

  /**
   * Send SSE event
   */
  function sendEvent(res, event, data) {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  return {
    /**
     * Stream observer status updates
     */
    streamStatus: async (req, res) => {
      setupSSE(res)
      loggers.stream('Client connected to status stream')

      const sendStatus = () => {
        try {
          const status = server.observer.getStatus()
          sendEvent(res, 'status', status)
        } catch (error) {
          loggers.stream('Error sending status:', error.message)
        }
      }

      // Send initial status
      sendStatus()

      // Send updates every 2 seconds
      const interval = setInterval(sendStatus, 2000)

      req.on('close', () => {
        clearInterval(interval)
        loggers.stream('Client disconnected from status stream')
      })
    },

    /**
     * Stream field state updates (SMF, oscillators, entropy)
     */
    streamField: async (req, res) => {
      setupSSE(res)
      loggers.stream('Client connected to field stream')

      const sendFieldState = () => {
        try {
          const smf = server.observer.smf
          const prsc = server.observer.prsc

          // Transform SMF components to named objects for UI
          const namedComponents = smf.s.map((value, index) => ({
            index,
            name: SMF_AXES[index] || `axis_${index}`,
            value,
          }))

          const fieldData = {
            timestamp: Date.now(),
            smf: {
              components: namedComponents,
              entropy: smf.smfEntropy(),
              norm: smf.norm(),
              dominant: smf.dominantAxes(3).map((a) => ({ name: a.name, value: a.value })),
            },
            oscillators: {
              active: prsc.activeCount(0.1),
              energy: prsc.totalEnergy(),
              coherence: prsc.globalCoherence(),
              meanPhase: prsc.meanPhase(),
              top: prsc.oscillators
                .filter((o) => o.amplitude > 0.1)
                .sort((a, b) => b.amplitude - a.amplitude)
                .slice(0, 8)
                .map((o) => ({
                  prime: o.prime,
                  amplitude: o.amplitude,
                  phase: o.phase,
                })),
            },
            memory: {
              thoughtCount: server.observer.memory.thoughts?.length || 0,
              recentImportance: server.observer.memory.getRecent(1)[0]?.importance || 0,
            },
          }

          sendEvent(res, 'field', fieldData)
        } catch (error) {
          loggers.stream('Error sending field state:', error.message)
        }
      }

      // Send initial state
      sendFieldState()

      // Send updates every second for smooth animations
      const interval = setInterval(sendFieldState, 1000)

      req.on('close', () => {
        clearInterval(interval)
        loggers.stream('Client disconnected from field stream')
      })
    },

    /**
     * Stream moments (temporal events)
     */
    streamMoments: async (req, res) => {
      setupSSE(res)
      loggers.stream('Client connected to moments stream')

      let lastMomentId = 0

      const sendNewMoments = () => {
        try {
          const temporal = server.observer.temporal
          const recentMoments = temporal.recentMoments(10)

          // Find moments we haven't sent yet
          const newMoments = recentMoments.filter((m) => {
            const momentId = m.timestamp || Date.now()
            return momentId > lastMomentId
          })

          if (newMoments.length > 0) {
            lastMomentId = newMoments[0].timestamp || Date.now()

            sendEvent(res, 'moments', {
              moments: newMoments.map((m) => m.toJSON()),
              subjectiveTime: temporal.getSubjectiveTime(),
              stats: temporal.getStats(),
            })
          }
        } catch (error) {
          loggers.stream('Error sending moments:', error.message)
        }
      }

      // Send initial moments
      sendNewMoments()

      // Check for new moments every 500ms
      const interval = setInterval(sendNewMoments, 500)

      req.on('close', () => {
        clearInterval(interval)
        loggers.stream('Client disconnected from moments stream')
      })
    },

    /**
     * Stream memory updates (thought traces)
     */
    streamMemory: async (req, res) => {
      setupSSE(res)
      loggers.stream('Client connected to memory stream')

      let lastThoughtCount = 0

      const sendMemoryUpdate = () => {
        try {
          const memory = server.observer.memory
          const currentCount = memory.thoughts?.length || 0

          // Only send if there are new thoughts
          if (currentCount !== lastThoughtCount) {
            lastThoughtCount = currentCount

            // Transform to UI-expected format with traces
            const memories = memory.getRecent(5)
            const traces = memories.map((t) => {
              const json = t.toJSON ? t.toJSON() : t
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

            sendEvent(res, 'memory', {
              traces,
              recent: traces, // backward compatibility
              stats: memory.getStats(),
              totalCount: currentCount,
            })
          }
        } catch (error) {
          loggers.stream('Error sending memory update:', error.message)
        }
      }

      // Send initial state
      sendMemoryUpdate()

      // Check for updates every 2 seconds
      const interval = setInterval(sendMemoryUpdate, 2000)

      req.on('close', () => {
        clearInterval(interval)
        loggers.stream('Client disconnected from memory stream')
      })
    },

    /**
     * Stream agency updates (goals, focus)
     */
    streamAgency: async (req, res) => {
      setupSSE(res)
      loggers.stream('Client connected to agency stream')

      const sendAgencyUpdate = () => {
        try {
          const agency = server.observer.agency

          sendEvent(res, 'agency', {
            topGoal: agency.getTopGoal()?.toJSON() || null,
            topFocus: agency.getTopFocus()?.toJSON() || null,
            activeGoals: agency.goals.filter((g) => g.isActive).length,
            fociCount: agency.attentionFoci.length,
            stats: agency.getStats(),
          })
        } catch (error) {
          loggers.stream('Error sending agency update:', error.message)
        }
      }

      // Send initial state
      sendAgencyUpdate()

      // Send updates every 3 seconds
      const interval = setInterval(sendAgencyUpdate, 3000)

      req.on('close', () => {
        clearInterval(interval)
        loggers.stream('Client disconnected from agency stream')
      })
    },

    /**
     * Combined stream for all observer state
     */
    streamAll: async (req, res) => {
      setupSSE(res)
      loggers.stream('Client connected to combined stream')

      const sendCombinedUpdate = () => {
        try {
          const smf = server.observer.smf
          const prsc = server.observer.prsc
          const memory = server.observer.memory
          const agency = server.observer.agency
          const temporal = server.observer.temporal

          sendEvent(res, 'update', {
            timestamp: Date.now(),
            smf: {
              entropy: smf.smfEntropy(),
              norm: smf.norm(),
            },
            oscillators: {
              active: prsc.activeCount(0.1),
              energy: prsc.totalEnergy(),
            },
            memory: {
              count: memory.thoughts?.length || 0,
            },
            agency: {
              activeGoals: agency.goals.filter((g) => g.isActive).length,
            },
            temporal: {
              momentCount: temporal.moments.length,
              subjectiveTime: temporal.getSubjectiveTime(),
            },
          })
        } catch (error) {
          loggers.stream('Error sending combined update:', error.message)
        }
      }

      // Send initial state
      sendCombinedUpdate()

      // Send updates every 2 seconds
      const interval = setInterval(sendCombinedUpdate, 2000)

      req.on('close', () => {
        clearInterval(interval)
        loggers.stream('Client disconnected from combined stream')
      })
    },
  }
}

module.exports = { createStreamRoutes }
