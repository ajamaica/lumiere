/**
 * Network Actions
 *
 * Network connectivity and node management:
 * - connect: Join the AlephNet mesh
 * - status: Get node status
 * - broadcast: Share content to network
 * - start: Start standalone server
 *
 * @module @sschepis/alephnet-node/lib/actions/network
 */

'use strict'

const path = require('path')

// Lazy-loaded modules and state
let DSNNode = null
let SentientServer = null
let networkNode = null
let initialized = false

// Shared state references
let socialManagers = null
let messagingManager = null
let economicManagers = null
let semanticModules = null
let coherenceModules = null

/**
 * Set references to other modules for coordination
 */
function setModuleReferences(refs) {
  socialManagers = refs.social
  messagingManager = refs.messaging
  economicManagers = refs.economic
  semanticModules = refs.semantic
}

/**
 * Get network node
 */
function getNetworkNode() {
  return networkNode
}

/**
 * Check if network is initialized
 */
function isInitialized() {
  return initialized
}

// Network actions
const networkActions = {
  /**
   * Connect to the AlephNet mesh
   * Initializes all subsystems
   */
  connect: async (args = {}) => {
    const { nodeId: customNodeId, bootstrapUrl, dataPath = './data' } = args

    // Already connected?
    if (networkNode && networkNode.meshConnected) {
      return {
        connected: true,
        nodeId: networkNode.nodeId,
        peers: networkNode.sync?.channel?.peers?.size || 0,
        domain: networkNode.domain,
        message: 'Already connected',
      }
    }

    // Load network module
    const { DSNNode: DN, generateNodeId } = require('../network.js')
    DSNNode = DN

    // Create or load identity
    const { Identity } = require('../identity')
    const identityPath = path.join(dataPath, 'identity.json')
    const identity = new Identity({ storagePath: identityPath })

    if (!identity.nodeId) {
      await identity.generate()
      identity.save()
    }

    const nodeId = customNodeId || identity.nodeId

    // Initialize network node
    networkNode = new DSNNode({
      nodeId,
      bootstrapUrl,
    })

    await networkNode.start()

    // Initialize all subsystems
    const { initManagers: initSocial } = require('./social')
    const { initManager: initMessaging } = require('./messaging')
    const { initManagers: initEconomic, setIdentity } = require('./economic')
    const { initGroupsManager } = require('./groups')
    const { initFeedManager } = require('./feed')
    const { initCoherenceManager } = require('./coherence')
    const { semanticActions } = require('./semantic')

    // Initialize social (friends, profiles)
    const social = initSocial(nodeId, dataPath)

    // Initialize messaging
    const messaging = initMessaging(nodeId, social.friendsManager, dataPath)

    // Initialize economic (wallet, content)
    const economic = initEconomic(nodeId, dataPath)

    // Initialize groups
    const groups = initGroupsManager(nodeId, dataPath)

    // Initialize feed
    const feed = initFeedManager(nodeId, groups, messaging)

    // Initialize coherence (with wallet and semantic actions)
    const coherence = initCoherenceManager(nodeId, dataPath, economic.wallet, semanticActions)

    // Set identity for signing
    setIdentity(identity)

    // Store references
    socialManagers = social
    messagingManager = messaging
    economicManagers = economic
    coherenceModules = coherence

    initialized = true

    // Try to join mesh
    try {
      await networkNode.joinMesh()

      return {
        connected: true,
        nodeId: networkNode.nodeId,
        fingerprint: identity.fingerprint,
        peers: networkNode.sync?.channel?.peers?.size || 0,
        domain: networkNode.domain,
        tier: economic.wallet?.getTier()?.name || 'Neophyte',
      }
    } catch (e) {
      // Local mode if mesh unavailable
      return {
        connected: false,
        localMode: true,
        nodeId: networkNode.nodeId,
        fingerprint: identity.fingerprint,
        error: e.message,
        message: 'Running in local mode - mesh unavailable',
      }
    }
  },

  /**
   * Get node status
   */
  status: async () => {
    const { getObserver } = require('./semantic')

    let obs = null
    try {
      obs = await getObserver()
    } catch (e) {
      // Observer may not be initialized
    }

    const walletStatus = economicManagers?.wallet?.getStatus()
    const friendsStats = socialManagers?.friendsManager?.getStats()
    const messageStats = messagingManager?.getStats?.()
    const contentStats = economicManagers?.contentStore?.getStats()

    return {
      running: initialized,
      uptime: obs?.startTime ? Date.now() - obs.startTime : 0,
      nodeId: networkNode?.nodeId || 'local',
      connected: networkNode?.meshConnected || false,
      peers: networkNode?.sync?.channel?.peers?.size || 0,

      // Subsystem status
      memory: obs?.memory?.traces?.size || 0,
      tickCount: obs?.tickCount || 0,

      wallet: walletStatus
        ? {
            balance: walletStatus.balance,
            tier: walletStatus.tier,
          }
        : null,

      social: friendsStats
        ? {
            friends: friendsStats.totalFriends,
            pendingRequests: friendsStats.pendingReceived,
          }
        : null,

      messaging: messageStats
        ? {
            rooms: messageStats.roomCount,
            unread: messageStats.unreadTotal,
          }
        : null,

      content: contentStats
        ? {
            entries: contentStats.totalEntries,
            usagePercent: contentStats.usagePercent,
          }
        : null,

      groups: {
        count: require('./groups').groupsActions['groups.list']
          ? (await require('./groups').groupsActions['groups.list']()).groups.length
          : 0,
      },

      coherence: coherenceModules
        ? {
            stakeStats: coherenceModules.stakeManager?.getStats(),
            rewardStats: coherenceModules.rewardManager?.getStats(),
            agent: coherenceModules.agent?.toJSON(),
          }
        : null,
    }
  },

  /**
   * Broadcast content to network
   */
  broadcast: async (args) => {
    const { content, scope = 'public' } = args

    if (!content) {
      return { error: 'Content is required' }
    }

    if (!networkNode || !networkNode.meshConnected) {
      return {
        error: 'Not connected to network. Call connect() first.',
        proposed: false,
      }
    }

    const { getBackend } = require('./semantic')
    const b = await getBackend()

    const semanticObject = {
      content,
      primeState: b.textToOrderedState(content),
      scope,
      timestamp: Date.now(),
    }

    const proposal = networkNode.submit(semanticObject)

    return {
      proposed: true,
      proposalId: proposal?.id || `prop_${Date.now()}`,
      estimatedConfirmation: '~5s',
    }
  },

  /**
   * Disconnect from network
   */
  disconnect: async () => {
    if (!networkNode) {
      return { disconnected: true, message: 'Not connected' }
    }

    networkNode.stop()

    return {
      disconnected: true,
      nodeId: networkNode.nodeId,
    }
  },

  /**
   * Start standalone server mode
   */
  start: async (args = {}) => {
    const { port = 31337, dataPath = './data' } = args

    const { SentientServer: SS } = require('../app/server.js')
    SentientServer = SS

    const server = new SentientServer({
      port,
      dataPath: path.resolve(dataPath),
      host: '0.0.0.0',
    })

    await server.start()

    return {
      status: 'running',
      port,
      nodeId: server.nodeId || 'local-node',
    }
  },
}

module.exports = {
  networkActions,
  setModuleReferences,
  getNetworkNode,
  isInitialized,
}
