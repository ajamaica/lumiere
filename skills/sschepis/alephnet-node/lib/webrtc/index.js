/**
 * WebRTC Module for Sentient Observer
 *
 * Provides WebRTC coordination for peer-to-peer communication between nodes.
 * - Coordinator: Server-side signaling coordination
 * - Peer: Client-side WebRTC peer connections
 * - Transport: PRRCChannel-compatible transport layer
 */

const { WebRTCCoordinator } = require('./coordinator')
const { WebRTCPeer } = require('./peer')
const { RoomManager } = require('./room')
const { WebRTCTransport } = require('./transport')

module.exports = {
  WebRTCCoordinator,
  WebRTCPeer,
  RoomManager,
  WebRTCTransport,
}
