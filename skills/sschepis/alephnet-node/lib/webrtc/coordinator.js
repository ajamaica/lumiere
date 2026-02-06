/**
 * WebRTC Coordinator for Sentient Observer
 *
 * Server-side coordinator for WebRTC signaling:
 * - Room management
 * - SDP offer/answer exchange
 * - ICE candidate relay
 * - WebSocket and HTTP signaling
 */

const { EventEmitter } = require('events')
const { RoomManager } = require('./room')
const { createLogger } = require('../app/constants')

const log = createLogger('webrtc:coordinator')

/**
 * Signal queue entry
 */
class SignalEntry {
  constructor(from, type, payload, room = null) {
    this.id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.from = from
    this.type = type
    this.payload = payload
    this.room = room
    this.timestamp = Date.now()
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      type: this.type,
      payload: this.payload,
      room: this.room,
      timestamp: this.timestamp,
    }
  }
}

/**
 * WebRTC Coordinator
 *
 * Manages WebRTC signaling for peer-to-peer connections.
 */
class WebRTCCoordinator extends EventEmitter {
  constructor(options = {}) {
    super()

    // Configuration
    this.stunServers = options.stunServers || ['stun:stun.l.google.com:19302']
    this.turnServers = options.turnServers || []
    this.signalTTL = options.signalTTL || 30000 // 30 seconds
    this.longPollTimeout = options.longPollTimeout || 25000 // 25 seconds

    // Room management
    this.rooms = new RoomManager({
      defaultMaxPeers: options.maxPeersPerRoom || 50,
      peerTimeout: options.peertimeout || 120000,
      defaultRooms: options.defaultRooms || ['global', 'memory-sync', 'learning'],
    })

    // Signal queues: peerId -> [SignalEntry]
    this.signalQueues = new Map()

    // WebSocket connections: peerId -> WebSocket
    this.wsConnections = new Map()

    // Long-poll waiting: peerId -> { resolve, timeout }
    this.pollWaiters = new Map()

    // Forward room events
    this.rooms.on('peer-joined', (data) => {
      this.emit('peer-joined', data)
      this.notifyRoom(
        data.room,
        'peer-joined',
        {
          peerId: data.peerId,
          metadata: data.metadata,
        },
        data.peerId,
      )
    })

    this.rooms.on('peer-left', (data) => {
      this.emit('peer-left', data)
      this.notifyRoom(
        data.room,
        'peer-left',
        {
          peerId: data.peerId,
          reason: data.reason,
        },
        data.peerId,
      )

      // Cleanup on complete disconnect
      if (this.rooms.getPeerRooms(data.peerId).length === 0) {
        this.cleanupPeer(data.peerId)
      }
    })

    // Signal cleanup timer
    this.cleanupInterval = setInterval(() => this.cleanupStaleSignals(), 10000)

    log('WebRTC Coordinator initialized')
    log('STUN servers:', this.stunServers.join(', '))
    if (this.turnServers.length > 0) {
      log('TURN servers:', this.turnServers.length)
    }
  }

  /**
   * Get ICE server configuration
   * @returns {Array} ICE server config for RTCPeerConnection
   */
  getIceServers() {
    const servers = []

    for (const stun of this.stunServers) {
      servers.push({ urls: stun })
    }

    for (const turn of this.turnServers) {
      // TURN can be object with urls/username/credential or string
      if (typeof turn === 'object') {
        servers.push(turn)
      } else {
        servers.push({ urls: turn })
      }
    }

    return servers
  }

  /**
   * Get coordinator info
   * @param {string} baseUrl - Base URL for this coordinator
   * @returns {Object}
   */
  getInfo(baseUrl = '') {
    return {
      enabled: true,
      coordinatorUrl: `${baseUrl}/webrtc`,
      websocketUrl: `${baseUrl.replace(/^http/, 'ws')}/webrtc/signal`,
      httpFallback: true,
      rooms: this.rooms.getRoomList(),
      peerCount: this.rooms.getStats().totalPeers,
      stunServers: this.stunServers,
      turnServers: this.turnServers.map((t) => (typeof t === 'object' ? t.urls : t)),
      stats: this.getStats(),
    }
  }

  /**
   * Handle join request
   * @param {string} peerId - Peer identifier
   * @param {string} roomName - Room to join
   * @param {Object} metadata - Peer metadata
   * @returns {Object} Join result
   */
  join(peerId, roomName, metadata = {}) {
    log('Join request:', peerId, '->', roomName)

    const result = this.rooms.joinRoom(peerId, roomName, metadata)

    if (result.success) {
      // Ensure signal queue exists
      if (!this.signalQueues.has(peerId)) {
        this.signalQueues.set(peerId, [])
      }
    }

    return {
      success: result.success,
      room: roomName,
      peers: result.peers.map((p) => ({
        peerId: p.peerId,
        name: p.metadata?.name || p.peerId,
        joinedAt: p.joinedAt,
        metadata: p.metadata,
      })),
      iceServers: this.getIceServers(),
    }
  }

  /**
   * Handle leave request
   * @param {string} peerId - Peer identifier
   * @param {string} roomName - Room to leave (null for all)
   * @returns {Object} Leave result
   */
  leave(peerId, roomName = null) {
    if (roomName) {
      log('Leave request:', peerId, '<-', roomName)
      const left = this.rooms.leaveRoom(peerId, roomName)
      return { success: left, room: roomName }
    } else {
      log('Leave all request:', peerId)
      const rooms = this.rooms.leaveAllRooms(peerId)
      this.cleanupPeer(peerId)
      return { success: true, rooms }
    }
  }

  /**
   * Queue a signal for a peer
   * @param {string} from - Sender peer ID
   * @param {string} to - Target peer ID
   * @param {string} type - Signal type (offer, answer, ice-candidate)
   * @param {Object} payload - Signal payload
   * @param {string} room - Room context
   * @returns {Object} Result
   */
  queueSignal(from, to, type, payload, room = null) {
    log('Signal:', from, '->', to, 'type:', type, 'room:', room)

    // Validate signal type
    const validTypes = ['offer', 'answer', 'ice-candidate', 'renegotiate']
    if (!validTypes.includes(type)) {
      return { success: false, error: 'Invalid signal type' }
    }

    // Create signal entry
    const signal = new SignalEntry(from, type, payload, room)

    // Try WebSocket delivery first
    const ws = this.wsConnections.get(to)
    if (ws && ws.readyState === 1) {
      // OPEN
      try {
        ws.send(
          JSON.stringify({
            type,
            from,
            room,
            payload,
            timestamp: signal.timestamp,
          }),
        )
        log('Signal delivered via WebSocket to:', to)
        return { success: true, delivered: true }
      } catch (e) {
        log('WebSocket delivery failed:', e.message)
      }
    }

    // Queue for polling
    if (!this.signalQueues.has(to)) {
      this.signalQueues.set(to, [])
    }
    this.signalQueues.get(to).push(signal)

    // Check if there's a waiting poll
    const waiter = this.pollWaiters.get(to)
    if (waiter) {
      clearTimeout(waiter.timeout)
      waiter.resolve([signal])
      this.pollWaiters.delete(to)
    }

    return { success: true, queued: true }
  }

  /**
   * Poll for signals (long-polling)
   * @param {string} peerId - Peer identifier
   * @param {number} timeout - Poll timeout in ms
   * @returns {Promise<Array>} Signals
   */
  async pollSignals(peerId, timeout = null) {
    timeout = timeout || this.longPollTimeout

    // Touch the peer to keep alive
    this.rooms.touchPeer(peerId)

    // Check for existing signals
    const queue = this.signalQueues.get(peerId) || []
    if (queue.length > 0) {
      // Return and clear queue
      const signals = queue.splice(0)
      return signals
    }

    // Wait for signals
    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        this.pollWaiters.delete(peerId)
        resolve([])
      }, timeout)

      this.pollWaiters.set(peerId, {
        resolve: (signals) => {
          const queue = this.signalQueues.get(peerId) || []
          resolve(signals || queue.splice(0))
        },
        timeout: timeoutHandle,
      })
    })
  }

  /**
   * Register WebSocket connection
   * @param {string} peerId - Peer identifier
   * @param {WebSocket} ws - WebSocket connection
   */
  registerWebSocket(peerId, ws) {
    // Close existing connection if any
    const existing = this.wsConnections.get(peerId)
    if (existing && existing !== ws) {
      try {
        existing.close(1000, 'Replaced by new connection')
      } catch (e) {}
    }

    this.wsConnections.set(peerId, ws)
    log('WebSocket registered for:', peerId)

    // Deliver any queued signals
    const queue = this.signalQueues.get(peerId) || []
    while (queue.length > 0) {
      const signal = queue.shift()
      try {
        ws.send(JSON.stringify(signal.toJSON()))
      } catch (e) {
        // Put back if failed
        queue.unshift(signal)
        break
      }
    }
  }

  /**
   * Unregister WebSocket connection
   * @param {string} peerId - Peer identifier
   */
  unregisterWebSocket(peerId) {
    this.wsConnections.delete(peerId)
    log('WebSocket unregistered for:', peerId)
  }

  /**
   * Handle WebSocket message
   * @param {string} peerId - Sender peer ID
   * @param {Object} message - Parsed message
   */
  handleWebSocketMessage(peerId, message) {
    const { type, to, room } = message

    // Touch peer to keep alive
    this.rooms.touchPeer(peerId)

    switch (type) {
      case 'join':
        const joinResult = this.join(peerId, room || message.room, message.metadata)
        this.sendToWebSocket(peerId, {
          type: 'join-result',
          ...joinResult,
        })
        break

      case 'leave':
        const leaveResult = this.leave(peerId, room || message.room)
        this.sendToWebSocket(peerId, {
          type: 'leave-result',
          ...leaveResult,
        })
        break

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        if (!to) {
          this.sendToWebSocket(peerId, {
            type: 'error',
            message: 'Missing "to" field for signal',
          })
          return
        }
        this.queueSignal(
          peerId,
          to,
          type,
          message.payload || message.sdp || message.candidate,
          room,
        )
        break

      case 'ping':
        this.sendToWebSocket(peerId, { type: 'pong' })
        break

      default:
        log('Unknown message type:', type)
    }
  }

  /**
   * Send message to peer via WebSocket
   * @param {string} peerId - Peer identifier
   * @param {Object} message - Message to send
   */
  sendToWebSocket(peerId, message) {
    const ws = this.wsConnections.get(peerId)
    if (ws && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(message))
      } catch (e) {
        log('Failed to send to WebSocket:', e.message)
      }
    }
  }

  /**
   * Notify all peers in a room
   * @param {string} roomName - Room name
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   * @param {string} exclude - Peer to exclude
   */
  notifyRoom(roomName, type, payload, exclude = null) {
    const peers = this.rooms.getRoomPeers(roomName)

    for (const peer of peers) {
      if (peer.peerId === exclude) continue

      const message = { type, room: roomName, ...payload }

      // Try WebSocket first
      const ws = this.wsConnections.get(peer.peerId)
      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify(message))
          continue
        } catch (e) {}
      }

      // Queue for polling
      const signal = new SignalEntry('system', type, payload, roomName)
      if (!this.signalQueues.has(peer.peerId)) {
        this.signalQueues.set(peer.peerId, [])
      }
      this.signalQueues.get(peer.peerId).push(signal)
    }
  }

  /**
   * Cleanup peer resources
   * @param {string} peerId - Peer identifier
   */
  cleanupPeer(peerId) {
    // Close WebSocket
    const ws = this.wsConnections.get(peerId)
    if (ws) {
      try {
        ws.close(1000, 'Cleanup')
      } catch (e) {}
      this.wsConnections.delete(peerId)
    }

    // Clear signal queue
    this.signalQueues.delete(peerId)

    // Clear poll waiter
    const waiter = this.pollWaiters.get(peerId)
    if (waiter) {
      clearTimeout(waiter.timeout)
      waiter.resolve([])
      this.pollWaiters.delete(peerId)
    }

    log('Peer cleaned up:', peerId)
  }

  /**
   * Cleanup stale signals from queues
   */
  cleanupStaleSignals() {
    const now = Date.now()
    let cleaned = 0

    for (const [peerId, queue] of this.signalQueues) {
      const original = queue.length
      // Filter out stale signals
      const filtered = queue.filter((s) => now - s.timestamp < this.signalTTL)
      if (filtered.length !== original) {
        this.signalQueues.set(peerId, filtered)
        cleaned += original - filtered.length
      }

      // Remove empty queues
      if (filtered.length === 0) {
        this.signalQueues.delete(peerId)
      }
    }

    if (cleaned > 0) {
      log('Cleaned', cleaned, 'stale signals')
    }
  }

  /**
   * Get coordinator statistics
   * @returns {Object}
   */
  getStats() {
    return {
      rooms: this.rooms.getStats(),
      websocketConnections: this.wsConnections.size,
      signalQueues: this.signalQueues.size,
      pollWaiters: this.pollWaiters.size,
    }
  }

  /**
   * Get peers in a room
   * @param {string} roomName - Room name
   * @returns {Array}
   */
  getRoomPeers(roomName) {
    return this.rooms.getRoomPeers(roomName).map((p) => ({
      peerId: p.peerId,
      name: p.metadata?.name || p.peerId,
      online: this.wsConnections.has(p.peerId),
      lastSeen: p.lastSeen,
      metadata: p.metadata,
    }))
  }

  /**
   * Destroy the coordinator
   */
  destroy() {
    // Clear timers
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Close all WebSocket connections
    for (const [peerId, ws] of this.wsConnections) {
      try {
        ws.close(1000, 'Coordinator shutdown')
      } catch (e) {}
    }
    this.wsConnections.clear()

    // Clear all poll waiters
    for (const [peerId, waiter] of this.pollWaiters) {
      clearTimeout(waiter.timeout)
      waiter.resolve([])
    }
    this.pollWaiters.clear()

    // Clear signal queues
    this.signalQueues.clear()

    // Destroy room manager
    this.rooms.destroy()

    this.removeAllListeners()
    log('WebRTC Coordinator destroyed')
  }

  toJSON() {
    return {
      ...this.getInfo(),
      stats: this.getStats(),
    }
  }
}

module.exports = { WebRTCCoordinator, SignalEntry }
