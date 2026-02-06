/**
 * WebRTC Transport for PRRCChannel
 *
 * Provides a transport layer that integrates WebRTC DataChannels
 * with the existing PRRCChannel from network.js.
 *
 * This allows the Prime-Resonant Resonance Channel to use WebRTC
 * as an underlying transport mechanism.
 */

const { EventEmitter } = require('events')
const { createLogger } = require('../app/constants')

const log = createLogger('webrtc:transport')

/**
 * WebRTC Transport
 *
 * Wraps a WebRTC peer connection for use as a PRRCChannel transport.
 */
class WebRTCTransport extends EventEmitter {
  /**
   * Create a WebRTC transport
   * @param {WebRTCPeer} peer - WebRTC peer instance
   * @param {string} targetPeerId - Target peer identifier
   */
  constructor(peer, targetPeerId) {
    super()

    this.peer = peer
    this.targetPeerId = targetPeerId
    this.connected = false

    // Listen for peer events
    this.onChannelOpen = (event) => {
      if (event.peerId === targetPeerId) {
        this.connected = true
        this.emit('open')
      }
    }

    this.onChannelClose = (event) => {
      if (event.peerId === targetPeerId) {
        this.connected = false
        this.emit('close')
      }
    }

    this.onMessage = (event) => {
      if (event.peerId === targetPeerId) {
        this.emit('message', event.data)
      }
    }

    peer.on('channel-open', this.onChannelOpen)
    peer.on('channel-close', this.onChannelClose)
    peer.on('message', this.onMessage)

    // Check if already connected
    if (peer.dataChannels.has(targetPeerId)) {
      this.connected = true
    }
  }

  /**
   * Send data to the target peer
   * @param {string|Object} data - Data to send
   */
  send(data) {
    if (!this.connected) {
      throw new Error('Transport not connected')
    }

    this.peer.send(this.targetPeerId, data)
  }

  /**
   * Write data (alias for send, for stream-like interface)
   * @param {string|Object} data - Data to write
   */
  write(data) {
    this.send(data)
  }

  /**
   * Close the transport
   */
  close() {
    // Remove event listeners
    this.peer.off('channel-open', this.onChannelOpen)
    this.peer.off('channel-close', this.onChannelClose)
    this.peer.off('message', this.onMessage)

    // Cleanup the peer connection
    this.peer.cleanupPeer(this.targetPeerId)

    this.connected = false
    this.emit('close')
  }

  /**
   * Check if transport is ready
   * @returns {boolean}
   */
  isReady() {
    return this.connected
  }

  /**
   * Get transport info
   * @returns {Object}
   */
  getInfo() {
    return {
      type: 'webrtc',
      targetPeerId: this.targetPeerId,
      connected: this.connected,
    }
  }
}

/**
 * WebRTC Transport Factory
 *
 * Creates WebRTC transports for use with PRRCChannel.
 * Manages the underlying WebRTC peer and provides
 * transports for individual peer connections.
 */
class WebRTCTransportFactory extends EventEmitter {
  /**
   * Create a transport factory
   * @param {WebRTCPeer} peer - WebRTC peer instance
   */
  constructor(peer) {
    super()

    this.peer = peer
    this.transports = new Map() // peerId -> WebRTCTransport

    // Create transports for new peer connections
    peer.on('channel-open', (event) => {
      if (!this.transports.has(event.peerId)) {
        const transport = new WebRTCTransport(peer, event.peerId)
        this.transports.set(event.peerId, transport)
        this.emit('transport-ready', { peerId: event.peerId, transport })
      }
    })

    // Cleanup transports when peers disconnect
    peer.on('channel-close', (event) => {
      const transport = this.transports.get(event.peerId)
      if (transport) {
        this.transports.delete(event.peerId)
        this.emit('transport-closed', { peerId: event.peerId })
      }
    })
  }

  /**
   * Get or create transport for a peer
   * @param {string} peerId - Peer identifier
   * @param {string} room - Room for connection context
   * @returns {Promise<WebRTCTransport>}
   */
  async getTransport(peerId, room = 'global') {
    // Return existing transport
    if (this.transports.has(peerId)) {
      return this.transports.get(peerId)
    }

    // Initiate connection
    await this.peer.connectToPeer(peerId, room)

    // Wait for transport to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Transport connection timeout'))
      }, 30000)

      const checkReady = (event) => {
        if (event.peerId === peerId) {
          clearTimeout(timeout)
          this.removeListener('transport-ready', checkReady)
          resolve(event.transport)
        }
      }

      this.on('transport-ready', checkReady)

      // Check if already ready
      const existing = this.transports.get(peerId)
      if (existing && existing.isReady()) {
        clearTimeout(timeout)
        this.removeListener('transport-ready', checkReady)
        resolve(existing)
      }
    })
  }

  /**
   * Get all active transports
   * @returns {Map<string, WebRTCTransport>}
   */
  getAllTransports() {
    return new Map(this.transports)
  }

  /**
   * Broadcast message via all transports
   * @param {*} data - Data to broadcast
   */
  broadcast(data) {
    for (const [peerId, transport] of this.transports) {
      if (transport.isReady()) {
        try {
          transport.send(data)
        } catch (e) {
          log.warn('Broadcast to', peerId, 'failed:', e.message)
        }
      }
    }
  }

  /**
   * Close all transports
   */
  closeAll() {
    for (const [peerId, transport] of this.transports) {
      transport.close()
    }
    this.transports.clear()
  }

  /**
   * Get factory status
   * @returns {Object}
   */
  getStatus() {
    const ready = Array.from(this.transports.values()).filter((t) => t.isReady()).length
    return {
      totalTransports: this.transports.size,
      readyTransports: ready,
      peerIds: Array.from(this.transports.keys()),
    }
  }
}

/**
 * Create transport integrations for PRRCChannel
 *
 * This function sets up WebRTC transports to work with an existing
 * PRRCChannel instance.
 *
 * @param {PRRCChannel} channel - PRRCChannel instance
 * @param {WebRTCPeer} peer - WebRTC peer instance
 * @returns {Object} Integration object with connect/disconnect methods
 */
function createPRRCWebRTCIntegration(channel, peer) {
  const factory = new WebRTCTransportFactory(peer)

  // When new WebRTC transports are ready, connect them to PRRCChannel
  factory.on('transport-ready', async (event) => {
    log('Connecting WebRTC transport to PRRCChannel:', event.peerId)
    channel.connect(event.peerId, event.transport)
  })

  // When transports close, disconnect from PRRCChannel
  factory.on('transport-closed', (event) => {
    log('Disconnecting WebRTC transport from PRRCChannel:', event.peerId)
    channel.disconnect(event.peerId)
  })

  // Listen for PRRCChannel receive events and forward
  channel.on('message_received', (peerId, message) => {
    // PRRCChannel already handles this - just log
    log('PRRCChannel received from:', peerId, message.type || 'unknown')
  })

  return {
    factory,

    /**
     * Connect to a peer via WebRTC and add to PRRCChannel
     * @param {string} peerId - Peer identifier
     * @param {string} room - Room context
     */
    async connect(peerId, room = 'global') {
      const transport = await factory.getTransport(peerId, room)
      // PRRCChannel connection happens via factory event
      return transport
    },

    /**
     * Disconnect a peer
     * @param {string} peerId - Peer identifier
     */
    disconnect(peerId) {
      const transport = factory.transports.get(peerId)
      if (transport) {
        transport.close()
      }
      channel.disconnect(peerId)
    },

    /**
     * Get integration status
     */
    getStatus() {
      return {
        webrtc: factory.getStatus(),
        prrc: channel.getStats(),
      }
    },

    /**
     * Cleanup
     */
    destroy() {
      factory.closeAll()
    },
  }
}

module.exports = {
  WebRTCTransport,
  WebRTCTransportFactory,
  createPRRCWebRTCIntegration,
}
