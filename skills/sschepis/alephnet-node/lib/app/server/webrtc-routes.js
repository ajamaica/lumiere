/**
 * WebRTC Coordinator Routes
 *
 * Handles WebRTC signaling and room management endpoints.
 */

const { loggers, sendJson, readBody } = require('./utils')

/**
 * Creates WebRTC route handlers
 * @param {Object} server - SentientServer instance
 * @returns {Object} Route handlers
 */
function createWebRTCRoutes(server) {
  return {
    /**
     * Check if WebRTC is available
     */
    isAvailable: () => {
      return !!server.webrtcCoordinator
    },

    /**
     * Get WebRTC coordinator info
     */
    getInfo: async (req, res) => {
      if (!server.webrtcCoordinator) {
        sendJson(res, { success: false, error: 'WebRTC coordinator not available' }, 503)
        return
      }

      const baseUrl = `http://${req.headers.host}`
      loggers.webrtc('Info request from', req.socket.remoteAddress)
      sendJson(res, server.webrtcCoordinator.getInfo(baseUrl))
    },

    /**
     * Join a room
     */
    join: async (req, res, clientIp) => {
      if (!server.webrtcCoordinator) {
        sendJson(res, { success: false, error: 'WebRTC coordinator not available' }, 503)
        return
      }

      try {
        const body = await readBody(req)
        const { nodeId, room, metadata } = JSON.parse(body)

        if (!nodeId || !room) {
          sendJson(res, { success: false, error: 'nodeId and room are required' }, 400)
          return
        }

        loggers.webrtc('Join request:', nodeId, '->', room, 'from', clientIp)
        const result = server.webrtcCoordinator.join(nodeId, room, metadata)
        sendJson(res, result)
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Leave a room
     */
    leave: async (req, res, clientIp) => {
      if (!server.webrtcCoordinator) {
        sendJson(res, { success: false, error: 'WebRTC coordinator not available' }, 503)
        return
      }

      try {
        const body = await readBody(req)
        const { nodeId, room } = JSON.parse(body)

        if (!nodeId) {
          sendJson(res, { success: false, error: 'nodeId is required' }, 400)
          return
        }

        loggers.webrtc('Leave request:', nodeId, room || 'all rooms', 'from', clientIp)
        const result = server.webrtcCoordinator.leave(nodeId, room)
        sendJson(res, result)
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Send a signal (POST)
     */
    sendSignal: async (req, res) => {
      if (!server.webrtcCoordinator) {
        sendJson(res, { success: false, error: 'WebRTC coordinator not available' }, 503)
        return
      }

      try {
        const body = await readBody(req)
        const { from, to, type, payload, room } = JSON.parse(body)

        if (!from || !to || !type) {
          sendJson(res, { success: false, error: 'from, to, and type are required' }, 400)
          return
        }

        loggers.webrtc('Signal:', from, '->', to, 'type:', type)
        const result = server.webrtcCoordinator.queueSignal(from, to, type, payload, room)
        sendJson(res, result)
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Poll for signals (GET)
     */
    pollSignals: async (req, res, url) => {
      if (!server.webrtcCoordinator) {
        sendJson(res, { success: false, error: 'WebRTC coordinator not available' }, 503)
        return
      }

      const nodeId = url.searchParams.get('nodeId')
      const timeout = parseInt(url.searchParams.get('timeout')) || null

      if (!nodeId) {
        sendJson(res, { success: false, error: 'nodeId query param is required' }, 400)
        return
      }

      try {
        const signals = await server.webrtcCoordinator.pollSignals(nodeId, timeout)
        sendJson(res, { signals: signals.map((s) => (s.toJSON ? s.toJSON() : s)) })
      } catch (error) {
        sendJson(res, { success: false, error: error.message }, 500)
      }
    },

    /**
     * Get peers in a room
     */
    getPeers: async (req, res, url) => {
      if (!server.webrtcCoordinator) {
        sendJson(res, { success: false, error: 'WebRTC coordinator not available' }, 503)
        return
      }

      const room = url.searchParams.get('room') || 'global'
      const peers = server.webrtcCoordinator.getRoomPeers(room)
      sendJson(res, { room, peers })
    },

    /**
     * Get WebRTC stats
     */
    getStats: async (req, res) => {
      if (!server.webrtcCoordinator) {
        sendJson(res, { success: false, error: 'WebRTC coordinator not available' }, 503)
        return
      }

      sendJson(res, server.webrtcCoordinator.getStats())
    },

    /**
     * Handle WebSocket upgrade for signaling
     */
    handleWebSocketUpgrade: (request, socket, head) => {
      const { URL } = require('url')
      const parsedUrl = new URL(request.url, `http://${request.headers.host}`)

      if (parsedUrl.pathname !== '/webrtc/signal' || !server.webrtcCoordinator) {
        socket.destroy()
        return false
      }

      const nodeId = parsedUrl.searchParams.get('nodeId')

      if (!nodeId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
        socket.destroy()
        return false
      }

      try {
        const WebSocket = require('ws')

        if (!server.wss) {
          server.wss = new WebSocket.Server({ noServer: true })

          server.wss.on('connection', (ws, req) => {
            const url = new URL(req.url, `http://${req.headers.host}`)
            const peerId = url.searchParams.get('nodeId')

            loggers.webrtc('WebSocket connected:', peerId)

            server.webrtcCoordinator.registerWebSocket(peerId, ws)

            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data)
                server.webrtcCoordinator.handleWebSocketMessage(peerId, message)
              } catch (e) {
                loggers.webrtc('Invalid WebSocket message from', peerId)
              }
            })

            ws.on('close', () => {
              loggers.webrtc('WebSocket disconnected:', peerId)
              server.webrtcCoordinator.unregisterWebSocket(peerId)
            })

            ws.on('error', (error) => {
              loggers.webrtc('WebSocket error:', peerId, error.message)
            })

            // Send welcome message
            ws.send(
              JSON.stringify({
                type: 'connected',
                nodeId: peerId,
                coordinatorId: server.nodeId,
              }),
            )
          })
        }

        server.wss.handleUpgrade(request, socket, head, (ws) => {
          server.wss.emit('connection', ws, request)
        })

        return true
      } catch (e) {
        loggers.webrtc('WebSocket not available:', e.message)
        socket.write('HTTP/1.1 501 Not Implemented\r\n\r\n')
        socket.destroy()
        return false
      }
    },
  }
}

module.exports = { createWebRTCRoutes }
