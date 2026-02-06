/**
 * Unified Transport Abstraction Layer
 *
 * Provides a common interface for different transport protocols:
 * - WebRTC DataChannels (P2P, low latency)
 * - WebSocket (bidirectional, persistent connection)
 * - HTTP Long-Polling (fallback for restricted networks)
 * - HTTP SSE (Server-Sent Events for one-way streaming)
 *
 * This abstraction allows the network layer to be protocol-agnostic,
 * enabling easy swapping of transports based on network conditions
 * or user preferences.
 */

const { EventEmitter } = require('events')

// ============================================================================
// TRANSPORT STATES
// ============================================================================

const TransportState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  CLOSED: 'closed',
  ERROR: 'error',
}

// ============================================================================
// ABSTRACT TRANSPORT BASE CLASS
// ============================================================================

/**
 * Abstract Transport Base Class
 *
 * All transport implementations must extend this class and implement
 * the abstract methods.
 */
class Transport extends EventEmitter {
  /**
   * Create a transport
   * @param {Object} options - Transport options
   */
  constructor(options = {}) {
    super()

    this.id = options.id || this.generateId()
    this.type = 'abstract'
    this.state = TransportState.DISCONNECTED
    this.metadata = options.metadata || {}

    // Connection tracking
    this.connectedAt = null
    this.disconnectedAt = null
    this.bytesReceived = 0
    this.bytesSent = 0
    this.messagesSent = 0
    this.messagesReceived = 0

    // Reconnection settings
    this.autoReconnect = options.autoReconnect ?? true
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5
    this.reconnectDelay = options.reconnectDelay || 1000
    this.reconnectAttempts = 0

    // Message queue for offline buffering
    this.messageQueue = []
    this.maxQueueSize = options.maxQueueSize || 1000
    this.flushOnConnect = options.flushOnConnect ?? true
  }

  /**
   * Generate unique transport ID
   */
  generateId() {
    return `transport-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  // ========================================================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ========================================================================

  /**
   * Connect to the remote endpoint
   * @abstract
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass')
  }

  /**
   * Disconnect from the remote endpoint
   * @abstract
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass')
  }

  /**
   * Send data to the remote endpoint
   * @abstract
   * @param {*} data - Data to send
   * @returns {Promise<void>}
   */
  async sendRaw(data) {
    throw new Error('sendRaw() must be implemented by subclass')
  }

  // ========================================================================
  // COMMON METHODS
  // ========================================================================

  /**
   * Send a message (with buffering support)
   * @param {*} data - Data to send
   * @param {Object} options - Send options
   */
  async send(data, options = {}) {
    const message = this.prepareMessage(data)

    if (this.state === TransportState.CONNECTED) {
      try {
        await this.sendRaw(message)
        this.bytesSent += this.estimateSize(message)
        this.messagesSent++
        this.emit('message_sent', { data: message, transport: this.id })
      } catch (error) {
        if (options.queue !== false && this.messageQueue.length < this.maxQueueSize) {
          this.messageQueue.push(message)
          this.emit('message_queued', { data: message, transport: this.id })
        }
        throw error
      }
    } else if (options.queue !== false && this.messageQueue.length < this.maxQueueSize) {
      this.messageQueue.push(message)
      this.emit('message_queued', { data: message, transport: this.id })
    } else {
      throw new Error(`Transport not connected (state: ${this.state})`)
    }
  }

  /**
   * Prepare message for sending (serialize if needed)
   * @param {*} data - Raw data
   * @returns {string|Buffer}
   */
  prepareMessage(data) {
    if (typeof data === 'string') return data
    if (Buffer.isBuffer(data)) return data
    return JSON.stringify(data)
  }

  /**
   * Handle received data
   * @param {*} data - Received data
   */
  handleReceive(data) {
    this.bytesReceived += this.estimateSize(data)
    this.messagesReceived++

    // Try to parse JSON
    let parsed = data
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data)
      } catch (e) {
        // Keep as string
      }
    }

    this.emit('message', parsed)
    this.emit('data', data)
  }

  /**
   * Estimate message size in bytes
   * @param {*} data - Data to estimate
   * @returns {number}
   */
  estimateSize(data) {
    if (Buffer.isBuffer(data)) return data.length
    if (typeof data === 'string') return Buffer.byteLength(data)
    return Buffer.byteLength(JSON.stringify(data))
  }

  /**
   * Flush queued messages
   */
  async flushQueue() {
    const queue = [...this.messageQueue]
    this.messageQueue = []

    let flushed = 0
    for (const message of queue) {
      try {
        await this.sendRaw(message)
        this.bytesSent += this.estimateSize(message)
        this.messagesSent++
        flushed++
      } catch (error) {
        // Re-queue failed messages
        this.messageQueue.push(message)
      }
    }

    this.emit('queue_flushed', { flushed, remaining: this.messageQueue.length })
    return flushed
  }

  /**
   * Update transport state
   * @param {string} newState - New state
   */
  setState(newState) {
    const oldState = this.state
    this.state = newState

    if (newState === TransportState.CONNECTED) {
      this.connectedAt = Date.now()
      this.reconnectAttempts = 0

      if (this.flushOnConnect && this.messageQueue.length > 0) {
        this.flushQueue().catch((e) => this.emit('error', e))
      }
    } else if (newState === TransportState.DISCONNECTED) {
      this.disconnectedAt = Date.now()
    }

    this.emit('state_change', { oldState, newState, transport: this.id })
  }

  /**
   * Attempt reconnection
   */
  async attemptReconnect() {
    if (!this.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState(TransportState.CLOSED)
      this.emit('max_reconnect_exceeded')
      return false
    }

    this.setState(TransportState.RECONNECTING)
    this.reconnectAttempts++

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    await new Promise((resolve) => setTimeout(resolve, delay))

    try {
      await this.connect()
      return true
    } catch (error) {
      this.emit('reconnect_failed', { attempt: this.reconnectAttempts, error })
      return this.attemptReconnect()
    }
  }

  /**
   * Check if transport is ready for sending
   * @returns {boolean}
   */
  isReady() {
    return this.state === TransportState.CONNECTED
  }

  /**
   * Get transport statistics
   * @returns {Object}
   */
  getStats() {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      connectedAt: this.connectedAt,
      disconnectedAt: this.disconnectedAt,
      uptime: this.connectedAt ? Date.now() - this.connectedAt : 0,
      bytesReceived: this.bytesReceived,
      bytesSent: this.bytesSent,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      metadata: this.metadata,
    }
  }

  /**
   * Get transport info
   * @returns {Object}
   */
  getInfo() {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      ready: this.isReady(),
    }
  }

  /**
   * Close and cleanup
   */
  async close() {
    await this.disconnect()
    this.setState(TransportState.CLOSED)
    this.removeAllListeners()
  }
}

// ============================================================================
// WEBSOCKET TRANSPORT
// ============================================================================

/**
 * WebSocket Transport
 *
 * Bidirectional, persistent connection using WebSocket protocol.
 * Good for real-time communication with a central server.
 */
class WebSocketTransport extends Transport {
  /**
   * Create a WebSocket transport
   * @param {string} url - WebSocket URL
   * @param {Object} options - Transport options
   */
  constructor(url, options = {}) {
    super(options)

    this.type = 'websocket'
    this.url = url
    this.ws = null
    this.protocols = options.protocols || []
    this.pingInterval = options.pingInterval || 30000
    this.pingTimer = null
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.setState(TransportState.CONNECTING)

      try {
        // Works in both Node.js and browser
        const WebSocket = globalThis.WebSocket || require('ws')
        this.ws = new WebSocket(this.url, this.protocols)

        this.ws.onopen = () => {
          this.setState(TransportState.CONNECTED)
          this.startPing()
          this.emit('open')
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleReceive(event.data)
        }

        this.ws.onerror = (error) => {
          this.emit('error', error)
          if (this.state === TransportState.CONNECTING) {
            reject(error)
          }
        }

        this.ws.onclose = (event) => {
          this.stopPing()
          this.setState(TransportState.DISCONNECTED)
          this.emit('close', { code: event.code, reason: event.reason })

          if (this.autoReconnect && this.state !== TransportState.CLOSED) {
            this.attemptReconnect()
          }
        }
      } catch (error) {
        this.setState(TransportState.ERROR)
        reject(error)
      }
    })
  }

  async disconnect() {
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setState(TransportState.DISCONNECTED)
  }

  async sendRaw(data) {
    if (!this.ws || this.ws.readyState !== 1) {
      // OPEN = 1
      throw new Error('WebSocket not connected')
    }
    this.ws.send(data)
  }

  startPing() {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (this.isReady()) {
        this.send({ type: 'ping', timestamp: Date.now() })
      }
    }, this.pingInterval)
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}

// ============================================================================
// HTTP LONG-POLLING TRANSPORT
// ============================================================================

/**
 * HTTP Long-Polling Transport
 *
 * Fallback transport using HTTP requests for environments where
 * WebSocket/WebRTC are unavailable or blocked.
 */
class HTTPPollingTransport extends Transport {
  /**
   * Create an HTTP polling transport
   * @param {string} baseUrl - Base URL for polling endpoint
   * @param {Object} options - Transport options
   */
  constructor(baseUrl, options = {}) {
    super(options)

    this.type = 'http-polling'
    this.baseUrl = baseUrl
    this.pollInterval = options.pollInterval || 1000
    this.longPollTimeout = options.longPollTimeout || 30000
    this.pollTimer = null
    this.sessionId = null
    this.abortController = null
  }

  async connect() {
    this.setState(TransportState.CONNECTING)

    try {
      // Establish session
      const response = await fetch(`${this.baseUrl}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transportId: this.id, metadata: this.metadata }),
      })

      if (!response.ok) {
        throw new Error(`Session creation failed: ${response.status}`)
      }

      const data = await response.json()
      this.sessionId = data.sessionId

      this.setState(TransportState.CONNECTED)
      this.startPolling()
      this.emit('open')
    } catch (error) {
      this.setState(TransportState.ERROR)
      throw error
    }
  }

  async disconnect() {
    this.stopPolling()

    if (this.sessionId) {
      try {
        await fetch(`${this.baseUrl}/session/${this.sessionId}`, {
          method: 'DELETE',
        })
      } catch (e) {
        // Ignore cleanup errors
      }
      this.sessionId = null
    }

    this.setState(TransportState.DISCONNECTED)
  }

  async sendRaw(data) {
    if (!this.sessionId) {
      throw new Error('No active session')
    }

    const response = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': this.sessionId,
      },
      body: typeof data === 'string' ? data : JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Send failed: ${response.status}`)
    }
  }

  startPolling() {
    this.stopPolling()
    this.poll()
  }

  stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  async poll() {
    if (this.state !== TransportState.CONNECTED) return

    this.abortController = new AbortController()

    try {
      const response = await fetch(`${this.baseUrl}/poll/${this.sessionId}`, {
        method: 'GET',
        headers: { 'X-Session-Id': this.sessionId },
        signal: this.abortController.signal,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.messages && Array.isArray(data.messages)) {
          for (const message of data.messages) {
            this.handleReceive(message)
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.emit('error', error)
      }
    }

    // Schedule next poll
    if (this.state === TransportState.CONNECTED) {
      this.pollTimer = setTimeout(() => this.poll(), this.pollInterval)
    }
  }
}

// ============================================================================
// SERVER-SENT EVENTS TRANSPORT
// ============================================================================

/**
 * SSE Transport (Server-Sent Events)
 *
 * One-way streaming from server to client with HTTP POST for client-to-server.
 * Good for real-time updates where most data flows from server.
 */
class SSETransport extends Transport {
  /**
   * Create an SSE transport
   * @param {string} streamUrl - URL for SSE stream
   * @param {string} sendUrl - URL for sending messages
   * @param {Object} options - Transport options
   */
  constructor(streamUrl, sendUrl, options = {}) {
    super(options)

    this.type = 'sse'
    this.streamUrl = streamUrl
    this.sendUrl = sendUrl
    this.eventSource = null
    this.sessionId = null
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.setState(TransportState.CONNECTING)

      try {
        // Works in browser; in Node.js, need eventsource package
        const EventSource = globalThis.EventSource || require('eventsource')
        this.eventSource = new EventSource(this.streamUrl)

        this.eventSource.onopen = () => {
          this.setState(TransportState.CONNECTED)
          this.emit('open')
          resolve()
        }

        this.eventSource.onmessage = (event) => {
          this.handleReceive(event.data)
        }

        this.eventSource.onerror = (error) => {
          if (this.state === TransportState.CONNECTING) {
            this.setState(TransportState.ERROR)
            reject(error)
          } else {
            this.emit('error', error)
            this.setState(TransportState.DISCONNECTED)

            if (this.autoReconnect) {
              this.attemptReconnect()
            }
          }
        }

        // Handle custom event types
        this.eventSource.addEventListener('session', (event) => {
          const data = JSON.parse(event.data)
          this.sessionId = data.sessionId
        })
      } catch (error) {
        this.setState(TransportState.ERROR)
        reject(error)
      }
    })
  }

  async disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.setState(TransportState.DISCONNECTED)
  }

  async sendRaw(data) {
    const response = await fetch(this.sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.sessionId ? { 'X-Session-Id': this.sessionId } : {}),
      },
      body: typeof data === 'string' ? data : JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Send failed: ${response.status}`)
    }
  }
}

// ============================================================================
// WEBRTC TRANSPORT ADAPTER
// ============================================================================

/**
 * WebRTC Transport Adapter
 *
 * Wraps an existing WebRTC DataChannel or peer connection to conform
 * to the unified Transport interface. This allows seamless integration
 * with the existing WebRTC implementation.
 */
class WebRTCTransportAdapter extends Transport {
  /**
   * Create a WebRTC transport adapter
   * @param {RTCDataChannel|Object} channel - DataChannel or peer with send method
   * @param {Object} options - Transport options
   */
  constructor(channel, options = {}) {
    super(options)

    this.type = 'webrtc'
    this.channel = channel
    this.peerId = options.peerId || null

    // Setup event handlers if it's a DataChannel
    if (channel && typeof channel.addEventListener === 'function') {
      this.setupDataChannelEvents(channel)
    }
  }

  setupDataChannelEvents(channel) {
    channel.addEventListener('open', () => {
      this.setState(TransportState.CONNECTED)
      this.emit('open')
    })

    channel.addEventListener('close', () => {
      this.setState(TransportState.DISCONNECTED)
      this.emit('close')
    })

    channel.addEventListener('message', (event) => {
      this.handleReceive(event.data)
    })

    channel.addEventListener('error', (error) => {
      this.emit('error', error)
    })

    // Check current state
    if (channel.readyState === 'open') {
      this.setState(TransportState.CONNECTED)
    }
  }

  async connect() {
    // WebRTC connection is managed externally
    if (this.channel && this.channel.readyState === 'open') {
      this.setState(TransportState.CONNECTED)
    } else {
      throw new Error('WebRTC channel must be opened externally')
    }
  }

  async disconnect() {
    if (this.channel && typeof this.channel.close === 'function') {
      this.channel.close()
    }
    this.setState(TransportState.DISCONNECTED)
  }

  async sendRaw(data) {
    if (!this.channel) {
      throw new Error('No channel available')
    }

    // Handle different channel interfaces
    if (typeof this.channel.send === 'function') {
      this.channel.send(data)
    } else if (typeof this.channel.write === 'function') {
      this.channel.write(data)
    } else {
      throw new Error('Channel has no send method')
    }
  }

  getInfo() {
    return {
      ...super.getInfo(),
      peerId: this.peerId,
      channelLabel: this.channel?.label,
      channelState: this.channel?.readyState,
    }
  }
}

// ============================================================================
// MEMORY TRANSPORT (FOR TESTING)
// ============================================================================

/**
 * Memory Transport
 *
 * In-memory transport for testing and local development.
 * Messages are passed directly between paired transports.
 */
class MemoryTransport extends Transport {
  constructor(options = {}) {
    super(options)

    this.type = 'memory'
    this.peer = null
  }

  /**
   * Pair with another memory transport
   * @param {MemoryTransport} peer - Peer transport
   */
  pair(peer) {
    this.peer = peer
    peer.peer = this
  }

  async connect() {
    if (this.peer) {
      this.setState(TransportState.CONNECTED)
      this.peer.setState(TransportState.CONNECTED)
      this.emit('open')
      this.peer.emit('open')
    } else {
      throw new Error('No peer to connect to')
    }
  }

  async disconnect() {
    this.setState(TransportState.DISCONNECTED)
    if (this.peer) {
      this.peer.peer = null
    }
    this.peer = null
  }

  async sendRaw(data) {
    if (!this.peer) {
      throw new Error('No peer connected')
    }

    // Simulate async delivery
    setImmediate(() => {
      this.peer.handleReceive(data)
    })
  }
}

// ============================================================================
// TRANSPORT FACTORY
// ============================================================================

/**
 * Transport Factory
 *
 * Creates appropriate transport instances based on configuration.
 */
class TransportFactory {
  /**
   * Create a transport from configuration
   * @param {Object} config - Transport configuration
   * @returns {Transport}
   */
  static create(config) {
    switch (config.type) {
      case 'websocket':
        return new WebSocketTransport(config.url, config.options)

      case 'http-polling':
        return new HTTPPollingTransport(config.url, config.options)

      case 'sse':
        return new SSETransport(config.streamUrl, config.sendUrl, config.options)

      case 'webrtc':
        return new WebRTCTransportAdapter(config.channel, config.options)

      case 'memory':
        return new MemoryTransport(config.options)

      default:
        throw new Error(`Unknown transport type: ${config.type}`)
    }
  }

  /**
   * Create a pair of connected memory transports for testing
   * @returns {[MemoryTransport, MemoryTransport]}
   */
  static createMemoryPair() {
    const a = new MemoryTransport()
    const b = new MemoryTransport()
    a.pair(b)
    return [a, b]
  }

  /**
   * Auto-detect best transport for environment
   * @param {Object} options - Detection options
   * @returns {string} Transport type
   */
  static detectBestTransport(options = {}) {
    // Check if WebRTC is available
    if (typeof RTCPeerConnection !== 'undefined' && options.preferP2P) {
      return 'webrtc'
    }

    // Check if WebSocket is available
    if (typeof WebSocket !== 'undefined' || options.nodeWebSocket) {
      return 'websocket'
    }

    // Check if SSE is available
    if (typeof EventSource !== 'undefined') {
      return 'sse'
    }

    // Fallback to HTTP polling
    return 'http-polling'
  }
}

// ============================================================================
// TRANSPORT MANAGER
// ============================================================================

/**
 * Transport Manager
 *
 * Manages multiple transports with automatic failover and load balancing.
 */
class TransportManager extends EventEmitter {
  constructor(options = {}) {
    super()

    this.transports = new Map()
    this.primary = null
    this.fallbackOrder = options.fallbackOrder || ['webrtc', 'websocket', 'sse', 'http-polling']
  }

  /**
   * Add a transport
   * @param {string} name - Transport name
   * @param {Transport} transport - Transport instance
   */
  add(name, transport) {
    this.transports.set(name, transport)

    // Forward events
    transport.on('message', (data) => this.emit('message', data, name))
    transport.on('state_change', (info) => this.emit('state_change', { ...info, name }))
    transport.on('error', (error) => this.emit('error', error, name))

    if (!this.primary) {
      this.primary = name
    }
  }

  /**
   * Get transport by name
   * @param {string} name - Transport name
   * @returns {Transport}
   */
  get(name) {
    return this.transports.get(name)
  }

  /**
   * Get primary transport
   * @returns {Transport}
   */
  getPrimary() {
    return this.transports.get(this.primary)
  }

  /**
   * Send via primary transport with automatic failover
   * @param {*} data - Data to send
   */
  async send(data) {
    // Try primary first
    const primary = this.getPrimary()
    if (primary && primary.isReady()) {
      return primary.send(data)
    }

    // Try fallbacks in order
    for (const type of this.fallbackOrder) {
      const transport = this.findByType(type)
      if (transport && transport.isReady()) {
        this.primary = this.findNameByTransport(transport)
        return transport.send(data)
      }
    }

    throw new Error('No available transport')
  }

  findByType(type) {
    for (const transport of this.transports.values()) {
      if (transport.type === type) return transport
    }
    return null
  }

  findNameByTransport(transport) {
    for (const [name, t] of this.transports) {
      if (t === transport) return name
    }
    return null
  }

  /**
   * Connect all transports
   */
  async connectAll() {
    const promises = []
    for (const transport of this.transports.values()) {
      promises.push(transport.connect().catch((e) => e))
    }
    return Promise.all(promises)
  }

  /**
   * Disconnect all transports
   */
  async disconnectAll() {
    const promises = []
    for (const transport of this.transports.values()) {
      promises.push(transport.disconnect().catch((e) => e))
    }
    return Promise.all(promises)
  }

  /**
   * Get status of all transports
   */
  getStatus() {
    const status = {}
    for (const [name, transport] of this.transports) {
      status[name] = transport.getStats()
    }
    return {
      primary: this.primary,
      transports: status,
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // States
  TransportState,

  // Base class
  Transport,

  // Implementations
  WebSocketTransport,
  HTTPPollingTransport,
  SSETransport,
  WebRTCTransportAdapter,
  MemoryTransport,

  // Factory and Manager
  TransportFactory,
  TransportManager,
}
