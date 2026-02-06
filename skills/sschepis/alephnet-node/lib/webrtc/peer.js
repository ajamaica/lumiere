/**
 * WebRTC Peer Client for Sentient Observer
 *
 * Client-side WebRTC peer for connecting to other nodes:
 * - Coordinator connection (WebSocket or HTTP polling)
 * - RTCPeerConnection management
 * - DataChannel communication
 */

const { EventEmitter } = require('events')
const { createLogger } = require('../app/constants')

const log = createLogger('webrtc:peer')

// Check for WebRTC availability (Node.js requires wrtc package)
let RTCPeerConnection, RTCSessionDescription, RTCIceCandidate
try {
  // Try native (browser or modern Node with --experimental-webrtc)
  RTCPeerConnection = global.RTCPeerConnection || require('wrtc').RTCPeerConnection
  RTCSessionDescription = global.RTCSessionDescription || require('wrtc').RTCSessionDescription
  RTCIceCandidate = global.RTCIceCandidate || require('wrtc').RTCIceCandidate
} catch (e) {
  log('WebRTC not available (wrtc package not installed)')
  log('Install with: npm install wrtc')
}

/**
 * WebRTC Peer Client
 */
class WebRTCPeer extends EventEmitter {
  constructor(nodeId, options = {}) {
    super()

    this.nodeId = nodeId
    this.coordinatorUrl = null
    this.iceServers = options.iceServers || []

    // Connection state
    this.connected = false
    this.rooms = new Set()

    // WebSocket for signaling
    this.ws = null
    this.wsReconnectTimer = null
    this.wsReconnectAttempts = 0
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5

    // HTTP polling fallback
    this.polling = false
    this.pollTimer = null
    this.pollInterval = options.pollInterval || 2000

    // Peer connections: peerId -> RTCPeerConnection
    this.peerConnections = new Map()

    // Data channels: peerId -> RTCDataChannel
    this.dataChannels = new Map()

    // Pending ICE candidates (before remote description set)
    this.pendingCandidates = new Map() // peerId -> [candidates]

    // Metadata for this peer
    this.metadata = options.metadata || { name: nodeId }

    log('WebRTC Peer initialized:', nodeId)

    if (!RTCPeerConnection) {
      log.warn('WebRTC not available - peer connections will fail')
    }
  }

  /**
   * Check if WebRTC is available
   * @returns {boolean}
   */
  static isAvailable() {
    return !!RTCPeerConnection
  }

  /**
   * Connect to a WebRTC coordinator
   * @param {string} coordinatorUrl - Base URL of coordinator
   * @param {Object} options - Connection options
   */
  async connectToCoordinator(coordinatorUrl, options = {}) {
    this.coordinatorUrl = coordinatorUrl

    // Get coordinator info and ICE servers
    try {
      const response = await this.httpRequest(`${coordinatorUrl}/info`)
      const info = JSON.parse(response)

      if (info.iceServers) {
        this.iceServers = info.iceServers
      }

      log('Coordinator info:', info.peerCount, 'peers,', info.rooms?.length, 'rooms')
    } catch (e) {
      log.warn('Failed to get coordinator info:', e.message)
    }

    // Try WebSocket first
    if (options.useWebSocket !== false) {
      await this.connectWebSocket()
    }

    // Fall back to polling if WebSocket fails
    if (!this.ws || this.ws.readyState !== 1) {
      this.startPolling()
    }

    this.connected = true
    this.emit('connected', { coordinatorUrl })
  }

  /**
   * Connect via WebSocket
   */
  async connectWebSocket() {
    const wsUrl = this.coordinatorUrl.replace(/^http/, 'ws') + '/signal'

    return new Promise((resolve) => {
      try {
        // Use ws module in Node.js
        const WebSocket = global.WebSocket || require('ws')

        this.ws = new WebSocket(`${wsUrl}?nodeId=${this.nodeId}`)

        this.ws.onopen = () => {
          log('WebSocket connected to coordinator')
          this.wsReconnectAttempts = 0
          this.stopPolling()
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            this.handleSignalingMessage(message)
          } catch (e) {
            log.warn('Invalid WebSocket message:', e.message)
          }
        }

        this.ws.onerror = (error) => {
          log.warn('WebSocket error:', error.message || 'unknown')
        }

        this.ws.onclose = () => {
          log('WebSocket closed')
          this.ws = null

          // Attempt reconnection
          if (this.connected && this.wsReconnectAttempts < this.maxReconnectAttempts) {
            this.wsReconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000)
            log('Reconnecting in', delay, 'ms...')
            this.wsReconnectTimer = setTimeout(() => {
              this.connectWebSocket()
            }, delay)
          } else if (this.connected) {
            log('Falling back to HTTP polling')
            this.startPolling()
          }
        }

        // Timeout for initial connection
        setTimeout(() => {
          if (this.ws && this.ws.readyState === 0) {
            this.ws.close()
            resolve(false)
          }
        }, 5000)
      } catch (e) {
        log.warn('WebSocket not available:', e.message)
        resolve(false)
      }
    })
  }

  /**
   * Start HTTP polling for signals
   */
  startPolling() {
    if (this.polling) return

    this.polling = true
    log('Starting HTTP polling')

    const poll = async () => {
      if (!this.polling || !this.coordinatorUrl) return

      try {
        const response = await this.httpRequest(
          `${this.coordinatorUrl}/signal?nodeId=${this.nodeId}&timeout=${this.pollInterval}`,
        )
        const data = JSON.parse(response)

        if (data.signals && Array.isArray(data.signals)) {
          for (const signal of data.signals) {
            this.handleSignalingMessage(signal)
          }
        }
      } catch (e) {
        // Polling error - continue
      }

      if (this.polling) {
        this.pollTimer = setTimeout(poll, this.pollInterval)
      }
    }

    poll()
  }

  /**
   * Stop HTTP polling
   */
  stopPolling() {
    this.polling = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  /**
   * Disconnect from coordinator
   */
  disconnect() {
    this.connected = false

    // Clear reconnect timer
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer)
      this.wsReconnectTimer = null
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    // Stop polling
    this.stopPolling()

    // Close all peer connections
    for (const [peerId, pc] of this.peerConnections) {
      pc.close()
    }
    this.peerConnections.clear()
    this.dataChannels.clear()

    this.rooms.clear()
    this.coordinatorUrl = null

    log('Disconnected from coordinator')
    this.emit('disconnected')
  }

  /**
   * Join a room
   * @param {string} roomName - Room name
   * @returns {Promise<Object>} Join result with peers
   */
  async joinRoom(roomName) {
    if (!this.coordinatorUrl) {
      throw new Error('Not connected to coordinator')
    }

    log('Joining room:', roomName)

    const body = JSON.stringify({
      nodeId: this.nodeId,
      room: roomName,
      metadata: this.metadata,
    })

    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(
        JSON.stringify({
          type: 'join',
          room: roomName,
          metadata: this.metadata,
        }),
      )
      // Result will come via WebSocket message
      this.rooms.add(roomName)
      return { success: true, room: roomName, pending: true }
    }

    const response = await this.httpRequest(`${this.coordinatorUrl}/join`, {
      method: 'POST',
      body,
    })
    const result = JSON.parse(response)

    if (result.success) {
      this.rooms.add(roomName)

      // Update ICE servers if provided
      if (result.iceServers) {
        this.iceServers = result.iceServers
      }

      // Auto-connect to existing peers
      if (result.peers && result.peers.length > 0) {
        for (const peer of result.peers) {
          this.connectToPeer(peer.peerId, roomName)
        }
      }
    }

    return result
  }

  /**
   * Leave a room
   * @param {string} roomName - Room name
   */
  async leaveRoom(roomName) {
    if (!this.coordinatorUrl) return

    log('Leaving room:', roomName)

    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(
        JSON.stringify({
          type: 'leave',
          room: roomName,
        }),
      )
    } else {
      await this.httpRequest(`${this.coordinatorUrl}/leave`, {
        method: 'POST',
        body: JSON.stringify({ nodeId: this.nodeId, room: roomName }),
      })
    }

    this.rooms.delete(roomName)
  }

  /**
   * Connect to a specific peer
   * @param {string} peerId - Peer identifier
   * @param {string} room - Room context
   */
  async connectToPeer(peerId, room = 'global') {
    if (!RTCPeerConnection) {
      throw new Error('WebRTC not available')
    }

    if (this.peerConnections.has(peerId)) {
      log('Already connected to peer:', peerId)
      return
    }

    log('Connecting to peer:', peerId)

    const pc = this.createPeerConnection(peerId)

    // Create data channel (initiator creates)
    const dc = pc.createDataChannel('prrc', {
      ordered: true,
      maxRetransmits: 3,
    })
    this.setupDataChannel(peerId, dc)

    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Send offer to peer via coordinator
    this.sendSignal(peerId, 'offer', { sdp: offer.sdp }, room)
  }

  /**
   * Create RTCPeerConnection for a peer
   * @param {string} peerId - Peer identifier
   * @returns {RTCPeerConnection}
   */
  createPeerConnection(peerId) {
    const config = {
      iceServers:
        this.iceServers.length > 0 ? this.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }],
    }

    const pc = new RTCPeerConnection(config)
    this.peerConnections.set(peerId, pc)
    this.pendingCandidates.set(peerId, [])

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, 'ice-candidate', {
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.onconnectionstatechange = () => {
      log('Connection state:', peerId, pc.connectionState)

      if (pc.connectionState === 'connected') {
        this.emit('peer-connected', { peerId })
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        this.emit('peer-disconnected', { peerId })
        this.cleanupPeer(peerId)
      }
    }

    pc.ondatachannel = (event) => {
      log('Received data channel from:', peerId)
      this.setupDataChannel(peerId, event.channel)
    }

    return pc
  }

  /**
   * Setup data channel event handlers
   * @param {string} peerId - Peer identifier
   * @param {RTCDataChannel} dc - Data channel
   */
  setupDataChannel(peerId, dc) {
    dc.onopen = () => {
      log('Data channel open:', peerId)
      this.dataChannels.set(peerId, dc)
      this.emit('channel-open', { peerId })
    }

    dc.onclose = () => {
      log('Data channel closed:', peerId)
      this.dataChannels.delete(peerId)
      this.emit('channel-close', { peerId })
    }

    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.emit('message', { peerId, data })
      } catch (e) {
        this.emit('message', { peerId, data: event.data })
      }
    }

    dc.onerror = (error) => {
      log.warn('Data channel error:', peerId, error)
    }
  }

  /**
   * Handle incoming signaling message
   * @param {Object} message - Signal message
   */
  async handleSignalingMessage(message) {
    const { type, from, payload, room } = message

    switch (type) {
      case 'offer':
        await this.handleOffer(from, payload, room)
        break

      case 'answer':
        await this.handleAnswer(from, payload)
        break

      case 'ice-candidate':
        await this.handleIceCandidate(from, payload)
        break

      case 'peer-joined':
        log('Peer joined:', message.peerId)
        this.emit('peer-joined-room', message)
        break

      case 'peer-left':
        log('Peer left:', message.peerId)
        this.cleanupPeer(message.peerId)
        this.emit('peer-left-room', message)
        break

      case 'join-result':
        if (message.success && message.peers) {
          for (const peer of message.peers) {
            this.connectToPeer(peer.peerId, message.room)
          }
        }
        break

      case 'pong':
        // Heartbeat response
        break

      case 'error':
        log.warn('Coordinator error:', message.message)
        this.emit('coordinator-error', message)
        break
    }
  }

  /**
   * Handle offer from peer
   * @param {string} peerId - Peer identifier
   * @param {Object} payload - Offer payload
   * @param {string} room - Room context
   */
  async handleOffer(peerId, payload, room) {
    if (!RTCPeerConnection) return

    log('Received offer from:', peerId)

    // Create peer connection if needed
    let pc = this.peerConnections.get(peerId)
    if (!pc) {
      pc = this.createPeerConnection(peerId)
    }

    // Set remote description
    await pc.setRemoteDescription(
      new RTCSessionDescription({
        type: 'offer',
        sdp: payload.sdp,
      }),
    )

    // Apply pending ICE candidates
    const pending = this.pendingCandidates.get(peerId) || []
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
    this.pendingCandidates.set(peerId, [])

    // Create and send answer
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    this.sendSignal(peerId, 'answer', { sdp: answer.sdp }, room)
  }

  /**
   * Handle answer from peer
   * @param {string} peerId - Peer identifier
   * @param {Object} payload - Answer payload
   */
  async handleAnswer(peerId, payload) {
    const pc = this.peerConnections.get(peerId)
    if (!pc) {
      log.warn('Received answer for unknown peer:', peerId)
      return
    }

    log('Received answer from:', peerId)

    await pc.setRemoteDescription(
      new RTCSessionDescription({
        type: 'answer',
        sdp: payload.sdp,
      }),
    )

    // Apply pending ICE candidates
    const pending = this.pendingCandidates.get(peerId) || []
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
    this.pendingCandidates.set(peerId, [])
  }

  /**
   * Handle ICE candidate from peer
   * @param {string} peerId - Peer identifier
   * @param {Object} payload - Candidate payload
   */
  async handleIceCandidate(peerId, payload) {
    const pc = this.peerConnections.get(peerId)

    if (!pc) {
      // Queue for later
      if (!this.pendingCandidates.has(peerId)) {
        this.pendingCandidates.set(peerId, [])
      }
      this.pendingCandidates.get(peerId).push(payload.candidate)
      return
    }

    if (!pc.remoteDescription) {
      // Queue until remote description is set
      this.pendingCandidates.get(peerId).push(payload.candidate)
      return
    }

    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
  }

  /**
   * Send signal to peer via coordinator
   * @param {string} to - Target peer
   * @param {string} type - Signal type
   * @param {Object} payload - Signal payload
   * @param {string} room - Room context
   */
  sendSignal(to, type, payload, room = null) {
    const message = {
      type,
      from: this.nodeId,
      to,
      room,
      payload,
    }

    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message))
    } else {
      // HTTP fallback
      this.httpRequest(`${this.coordinatorUrl}/signal`, {
        method: 'POST',
        body: JSON.stringify(message),
      }).catch((e) => log.warn('Signal send failed:', e.message))
    }
  }

  /**
   * Send message to a specific peer
   * @param {string} peerId - Peer identifier
   * @param {*} data - Data to send
   */
  send(peerId, data) {
    const dc = this.dataChannels.get(peerId)
    if (!dc || dc.readyState !== 'open') {
      throw new Error(`No open data channel to peer: ${peerId}`)
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data)
    dc.send(message)
  }

  /**
   * Broadcast message to all connected peers
   * @param {*} data - Data to send
   */
  broadcast(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data)

    for (const [peerId, dc] of this.dataChannels) {
      if (dc.readyState === 'open') {
        dc.send(message)
      }
    }
  }

  /**
   * Cleanup peer resources
   * @param {string} peerId - Peer identifier
   */
  cleanupPeer(peerId) {
    const pc = this.peerConnections.get(peerId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(peerId)
    }

    this.dataChannels.delete(peerId)
    this.pendingCandidates.delete(peerId)
  }

  /**
   * HTTP request helper
   * @param {string} url - URL
   * @param {Object} options - Request options
   * @returns {Promise<string>} Response body
   */
  httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const http = url.startsWith('https') ? require('https') : require('http')
      const parsedUrl = new URL(url)

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        timeout: 10000,
      }

      const req = http.request(reqOptions, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        })
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      if (options.body) {
        req.write(options.body)
      }
      req.end()
    })
  }

  /**
   * Get peer status
   * @returns {Object}
   */
  getStatus() {
    return {
      nodeId: this.nodeId,
      connected: this.connected,
      coordinatorUrl: this.coordinatorUrl,
      websocket: this.ws?.readyState === 1,
      polling: this.polling,
      rooms: Array.from(this.rooms),
      peerConnections: this.peerConnections.size,
      dataChannels: this.dataChannels.size,
      connectedPeers: Array.from(this.dataChannels.keys()),
    }
  }

  toJSON() {
    return this.getStatus()
  }
}

module.exports = { WebRTCPeer }
