/**
 * Server Mode for Sentient Observer
 *
 * Contains the SentientServer class for HTTP API and web UI.
 * Routes and handlers are organized in separate modules under ./server/
 */

const fs = require('fs')
const path = require('path')
const http = require('http')
const { URL } = require('url')

const { createLogger, colors: c } = require('./constants')
const { initializeObserver, truncateToolContent } = require('./shared')
const { authMiddleware } = require('../auth-middleware')
const { networkState } = require('../quantum/network-state')

// Learning system
const { createLearningSystem } = require('../learning')

// WebRTC coordinator
const { WebRTCCoordinator } = require('../webrtc')

// Provider management
const { createProviderManager } = require('../providers')

// Import modular route handlers - use explicit path to avoid circular dependency
const {
  loggers,
  setCorsHeaders,
  sendJson,
  readBody,
  generateNodeId,
  colors,
  createChatHandlers,
  createLearningRoutes,
  createObserverRoutes,
  createStreamRoutes,
  createWebRTCRoutes,
  createProviderRoutes,
  createNetworkSync,
  createStaticServer,
} = require('./server/index')

const { faucetActions } = require('../actions/faucet')

// Create additional loggers
const logHttp = createLogger('server:http')
const logLearn = createLogger('learning:server')
const logWebRTC = createLogger('webrtc:server')
const logProvider = createLogger('server:provider')

/**
 * HTTP Server for Sentient Observer
 */
class SentientServer {
  constructor(options) {
    this.options = options
    this.observer = null
    this.chat = null
    this.toolExecutor = null
    this.senses = null
    this.server = null
    this.sseClients = new Set()
    this.conversationHistory = []
    this.historyPath = path.join(options.dataPath, 'conversation-history.json')

    // Learning system
    this.learner = null
    this.chaperone = null
    this.nextStepGenerator = null
    this.learningSSEClients = new Set()

    // Provider management
    this.providerManager = null

    // WebRTC coordinator (server mode only)
    this.webrtcCoordinator = null
    this.webrtcEnabled = options.webrtc !== false

    // Field SSE clients
    this.fieldSSEClients = new Set()

    // Network/node tracking
    this.startTime = Date.now()
    this.outboundConnections = []
    this.inboundConnections = []
    this.nodeId = options.nodeId || generateNodeId()

    // SMF history for visualization
    this.smfHistory = []

    // Chat processing flag
    this.isProcessingChat = false

    // WebSocket server for WebRTC
    this.wss = null
  }

  /**
   * Load conversation history from disk
   */
  loadConversationHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        this.conversationHistory = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'))
      }
    } catch (e) {
      this.conversationHistory = []
    }
  }

  /**
   * Save conversation history to disk
   */
  saveConversationHistory() {
    try {
      const dir = path.dirname(this.historyPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(this.historyPath, JSON.stringify(this.conversationHistory, null, 2))
    } catch (e) {}
  }

  /**
   * Add a message to conversation history
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {Object} options - Optional metadata
   * @param {number} options.timestamp - Custom timestamp (defaults to Date.now())
   */
  addToHistory(role, content, options = {}) {
    const timestamp = options.timestamp || Date.now()
    this.conversationHistory.push({ role, content, timestamp })
    if (this.conversationHistory.length > 100) {
      this.conversationHistory = this.conversationHistory.slice(-100)
    }
    this.saveConversationHistory()
  }

  /**
   * Broadcast moment to SSE clients
   */
  broadcastMoment(moment) {
    const data = JSON.stringify({
      type: 'moment',
      data: moment,
    })
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${data}\n\n`)
      } catch (e) {
        this.sseClients.delete(client)
      }
    }
  }

  /**
   * Initialize the server and observer
   */
  async init() {
    console.log(`Initializing Sentient Observer...`)
    console.log(`Connecting to LMStudio at ${this.options.url}...`)

    // Initialize Network State
    const dataPath = this.options.dataPath || './data'
    const genesisPath = path.join(dataPath, 'content', 'genesis.json')
    if (networkState.load(genesisPath)) {
      console.log('✓ Network Trust Root anchored')
    } else {
      console.warn('⚠️  Network Genesis not loaded. Running in bootstrap mode.')
    }

    const result = await initializeObserver(this.options, {
      onMoment: (m) => this.broadcastMoment(m),
      onOutput: () => {},
      onStateChange: () => {},
    })

    if (!result.success) {
      console.error(`Error: ${result.error}`)
      return false
    }

    this.observer = result.observer
    this.chat = result.chat
    this.toolExecutor = result.toolExecutor
    this.senses = result.senses

    // Initialize provider manager
    this.initializeProviderManager()

    // Initialize learning system
    this.initializeLearningSystem()

    // Initialize WebRTC coordinator
    this.initializeWebRTC()

    // Initialize route handlers
    this.initializeRoutes()

    this.loadConversationHistory()

    console.log('✓ Sentient Observer initialized')
    return true
  }

  /**
   * Initialize route handlers from modules
   */
  initializeRoutes() {
    // Create route handler instances
    this.routes = {
      chat: createChatHandlers(this),
      learning: createLearningRoutes(this),
      observer: createObserverRoutes(this),
      stream: createStreamRoutes(this),
      webrtc: createWebRTCRoutes(this),
      providers: createProviderRoutes(this),
      static: createStaticServer(this),
    }

    // Create network sync handlers
    this.networkSync = createNetworkSync(this)
  }

  /**
   * Initialize the provider manager
   */
  initializeProviderManager() {
    try {
      // Build provider configurations from options
      const providerConfigs = {
        lmstudio: {
          baseUrl: this.options.url || 'http://localhost:1234/v1',
          model: this.options.model || 'local-model',
        },
      }

      // Add Vertex AI config - check multiple locations for credentials
      const googleCredsPath =
        this.options.googleCreds ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(__dirname, '../../google.json') // Default to apps/sentient/google.json

      if (fs.existsSync(googleCredsPath)) {
        providerConfigs.vertex = {
          credentialsPath: googleCredsPath,
          projectId: this.options.googleProject,
          location: this.options.googleLocation || 'us-central1',
          model: this.options.model || 'gemini-3-pro-preview',
        }
        logProvider('Found Google credentials at:', googleCredsPath)
      }

      this.providerManager = createProviderManager({
        providers: providerConfigs,
        defaultProvider: this.options.provider || 'lmstudio',
        onProviderChange: (event) => {
          logProvider(`Provider changed: ${event.previousProvider} -> ${event.newProvider}`)

          // Update chat LLM client
          if (this.chat && event.client) {
            this.chat.llm = event.client
          }

          // Update chaperone LLM client
          if (this.chaperone && event.client) {
            this.chaperone.llmClient = event.client
          }
        },
      })

      // Set initial active provider (use the same client that was already initialized)
      if (this.chat?.llm) {
        const initialProvider =
          this.options.provider || (this.options.googleCreds ? 'vertex' : 'lmstudio')
        this.providerManager.activeProviderId = initialProvider
        this.providerManager.activeClient = this.chat.llm
        this.providerManager.clientCache.set(initialProvider, this.chat.llm)
        this.providerManager.providerStatus.set(initialProvider, 'connected')
      }

      logProvider('Provider manager initialized')
      console.log('✓ Provider manager initialized')
    } catch (error) {
      console.error('⚠ Failed to initialize provider manager:', error.message)
      logProvider.error?.('Initialization failed:', error.message)
    }
  }

  /**
   * Initialize WebRTC coordinator
   */
  initializeWebRTC() {
    if (!this.webrtcEnabled) {
      console.log('⚠ WebRTC coordinator disabled')
      return
    }

    try {
      this.webrtcCoordinator = new WebRTCCoordinator({
        stunServers: this.options.stunServers || ['stun:stun.l.google.com:19302'],
        turnServers: this.options.turnServers || [],
        maxPeersPerRoom: this.options.maxPeersPerRoom || 50,
        defaultRooms: ['global', 'memory-sync', 'learning'],
      })

      // Event logging
      this.webrtcCoordinator.on('peer-joined', (data) => {
        logWebRTC(`Peer joined room ${data.room}:`, data.peerId)
      })

      this.webrtcCoordinator.on('peer-left', (data) => {
        logWebRTC(`Peer left room ${data.room}:`, data.peerId, data.reason || '')
      })

      console.log('✓ WebRTC coordinator initialized')
      logWebRTC('WebRTC coordinator ready')
    } catch (error) {
      console.error('⚠ Failed to initialize WebRTC coordinator:', error.message)
      logWebRTC.error('Initialization failed:', error.message)
      this.webrtcEnabled = false
    }
  }

  /**
   * Initialize the autonomous learning system
   */
  initializeLearningSystem() {
    try {
      const learning = createLearningSystem(this.observer, {
        chaperone: {
          llmClient: this.chat?.llm,
        },
      })

      this.learner = learning.learner
      this.chaperone = learning.chaperone
      this.nextStepGenerator = learning.nextStepGenerator

      // Set up event forwarding for eavesdropping
      this.learner.on('step', (data) => this.broadcastLearningEvent('step', data))
      this.learner.on('session_start', (data) => this.broadcastLearningEvent('session_start', data))
      this.learner.on('session_end', (data) => this.broadcastLearningEvent('session_end', data))
      this.learner.on('iteration_complete', (data) =>
        this.broadcastLearningEvent('iteration', data),
      )
      this.learner.on('error', (data) => this.broadcastLearningEvent('error', data))
      this.learner.on('paused', (data) => this.broadcastLearningEvent('paused', data))
      this.learner.on('resumed', (data) => this.broadcastLearningEvent('resumed', data))

      // Immersive mode events - AI internal perspective
      this.learner.on('curiosity', (data) => this.broadcastLearningEvent('curiosity', data))
      this.learner.on('question', (data) => this.broadcastLearningEvent('question', data))
      this.learner.on('memory', (data) => this.broadcastLearningEvent('memory', data))
      this.learner.on('reflection', (data) => this.broadcastLearningEvent('reflection', data))

      this.chaperone.on('request', (data) => this.broadcastLearningEvent('request', data))
      this.chaperone.on('response', (data) => this.broadcastLearningEvent('response', data))
      this.chaperone.on('answer', (data) => this.broadcastLearningEvent('answer', data))

      logLearn('Learning system initialized')
      console.log('✓ Autonomous learning system initialized')
      console.log('✓ Next-step suggestion generator initialized')
    } catch (error) {
      console.error('⚠ Failed to initialize learning system:', error.message)
      logLearn.error('Initialization failed:', error.message)
    }
  }

  /**
   * Broadcast learning event to SSE clients
   */
  broadcastLearningEvent(eventType, data) {
    const payload = JSON.stringify({
      type: eventType,
      data,
      timestamp: Date.now(),
    })

    for (const client of this.learningSSEClients) {
      try {
        client.write(`event: ${eventType}\ndata: ${payload}\n\n`)
      } catch (e) {
        this.learningSSEClients.delete(client)
      }
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(req, res) {
    setCorsHeaders(res, this.options.cors)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = url.pathname
    const clientIp = req.socket.remoteAddress || 'unknown'

    // Log all HTTP requests (except static files to reduce noise)
    if (!pathname.match(/\.(js|css|html|png|jpg|ico|woff|svg)$/)) {
      logHttp(`${req.method} ${pathname}`, `from ${clientIp}`)
    }

    // Wrap logic in Authentication Middleware
    authMiddleware(req, res, async () => {
      try {
        // Route handling
        if (await this.routeRequest(req, res, pathname, url, clientIp)) {
          return
        }

        // Static files fallback
        await this.routes.static.serveStatic(req, res, pathname)
      } catch (error) {
        console.error('Request error:', error)
        sendJson(res, { error: error.message }, 500)
      }
    })
  }

  /**
   * Route requests to appropriate handlers
   */
  async routeRequest(req, res, pathname, url, clientIp) {
    const { chat, learning, observer, stream, webrtc } = this.routes

    // ============================================
    // FAUCET ENDPOINTS
    // ============================================

    if (pathname === '/faucet/challenge' && req.method === 'POST') {
      await readBody(req)
      const result = await faucetActions['faucet.challenge'](req.body)
      sendJson(res, result)
      return true
    }

    if (pathname === '/faucet/claim' && req.method === 'POST') {
      await readBody(req)
      const result = await faucetActions['faucet.claim'](req.body)
      sendJson(res, result)
      return true
    }

    // ============================================
    // CHAT ENDPOINTS
    // ============================================

    if (pathname === '/chat' && req.method === 'POST') {
      logHttp('Chat request', `from ${clientIp}`)
      await chat.handleChat(req, res)
      return true
    }

    if (pathname === '/chat/stream' && req.method === 'POST') {
      loggers.stream('Streaming chat request', `from ${clientIp}`)
      await chat.handleStreamingChat(req, res)
      return true
    }

    // ============================================
    // OBSERVER STATE ENDPOINTS
    // ============================================

    if (pathname === '/status' && req.method === 'GET') {
      await observer.getStatus(req, res)
      return true
    }

    if (pathname === '/introspect' && req.method === 'GET') {
      await observer.getIntrospect(req, res)
      return true
    }

    if (pathname === '/history' && req.method === 'GET') {
      await observer.getHistory(req, res)
      return true
    }

    if (pathname === '/history' && req.method === 'DELETE') {
      await observer.deleteHistory(req, res)
      return true
    }

    if (pathname === '/history/delete' && req.method === 'POST') {
      await observer.deleteHistoryMessages(req, res)
      return true
    }

    if (pathname === '/senses' && req.method === 'GET') {
      await observer.getSenses(req, res)
      return true
    }

    if (pathname === '/senses/sight' && req.method === 'POST') {
      await observer.postSightFrame(req, res)
      return true
    }

    if (pathname === '/smf' && req.method === 'GET') {
      await observer.getSMF(req, res)
      return true
    }

    if (pathname === '/oscillators' && req.method === 'GET') {
      await observer.getOscillators(req, res)
      return true
    }

    if (pathname === '/moments' && req.method === 'GET') {
      await observer.getMoments(req, res, url)
      return true
    }

    if (pathname === '/goals' && req.method === 'GET') {
      await observer.getGoals(req, res)
      return true
    }

    if (pathname === '/safety' && req.method === 'GET') {
      await observer.getSafety(req, res)
      return true
    }

    if (pathname === '/memory' && req.method === 'GET') {
      await observer.getMemory(req, res, url)
      return true
    }

    if (pathname === '/memory/search' && req.method === 'POST') {
      await observer.searchMemory(req, res)
      return true
    }

    if (pathname === '/identity' && req.method === 'GET') {
      await observer.getIdentity(req, res)
      return true
    }

    if (pathname === '/stabilization' && req.method === 'GET') {
      await observer.getStabilization(req, res)
      return true
    }

    if ((pathname === '/nodes' || pathname === '/peers') && req.method === 'GET') {
      await observer.getNodes(req, res)
      return true
    }

    if (pathname === '/debug/llm' && req.method === 'GET') {
      await observer.debugLLM(req, res)
      return true
    }

    if (pathname === '/debug/ping' && req.method === 'GET') {
      await observer.debugPing(req, res)
      return true
    }

    // ============================================
    // STREAM ENDPOINTS (SSE)
    // ============================================

    if (pathname === '/stream/status' && req.method === 'GET') {
      await stream.streamStatus(req, res)
      return true
    }

    if (pathname === '/stream/field' && req.method === 'GET') {
      await stream.streamField(req, res)
      return true
    }

    if (pathname === '/stream/moments' && req.method === 'GET') {
      await stream.streamMoments(req, res)
      return true
    }

    if (pathname === '/stream/memory' && req.method === 'GET') {
      await stream.streamMemory(req, res)
      return true
    }

    if (pathname === '/stream/agency' && req.method === 'GET') {
      await stream.streamAgency(req, res)
      return true
    }

    if (pathname === '/stream/all' && req.method === 'GET') {
      await stream.streamAll(req, res)
      return true
    }

    // ============================================
    // LEARNING ENDPOINTS
    // ============================================

    if (pathname === '/learning/start' && req.method === 'POST') {
      await learning.start(req, res, clientIp)
      return true
    }

    if (pathname === '/learning/stop' && req.method === 'POST') {
      await learning.stop(req, res, clientIp)
      return true
    }

    if (pathname === '/learning/pause' && req.method === 'POST') {
      await learning.pause(req, res, clientIp)
      return true
    }

    if (pathname === '/learning/resume' && req.method === 'POST') {
      await learning.resume(req, res, clientIp)
      return true
    }

    if (pathname === '/learning/status' && req.method === 'GET') {
      await learning.getStatus(req, res)
      return true
    }

    if (pathname === '/learning/logs' && req.method === 'GET') {
      await learning.getLogs(req, res, url)
      return true
    }

    if (pathname === '/learning/reflect' && req.method === 'POST') {
      await learning.reflect(req, res)
      return true
    }

    if (pathname === '/learning/question' && req.method === 'POST') {
      await learning.addQuestion(req, res)
      return true
    }

    if (pathname === '/learning/safety' && req.method === 'GET') {
      await learning.getSafety(req, res)
      return true
    }

    if (pathname === '/learning/topics' && req.method === 'GET') {
      await learning.getTopics(req, res)
      return true
    }

    if (pathname === '/learning/focus' && req.method === 'POST') {
      await learning.focusTopic(req, res)
      return true
    }

    if (pathname === '/learning/stream' && req.method === 'GET') {
      await learning.stream(req, res)
      return true
    }

    // ============================================
    // PROVIDER ENDPOINTS
    // ============================================

    if (pathname === '/providers' && req.method === 'GET') {
      await this.routes.providers.listProviders(req, res)
      return true
    }

    if (pathname === '/providers/status' && req.method === 'GET') {
      await this.routes.providers.getStatus(req, res)
      return true
    }

    if (pathname === '/providers/switch' && req.method === 'POST') {
      await this.routes.providers.switchProvider(req, res)
      return true
    }

    if (pathname === '/providers/configure' && req.method === 'POST') {
      await this.routes.providers.configureProvider(req, res)
      return true
    }

    if (pathname === '/providers/test' && req.method === 'POST') {
      await this.routes.providers.testProviders(req, res)
      return true
    }

    if (pathname === '/providers/model' && req.method === 'POST') {
      await this.routes.providers.setModel(req, res)
      return true
    }

    // Handle /providers/:id/models pattern
    const modelsMatch = pathname.match(/^\/providers\/([^\/]+)\/models$/)
    if (modelsMatch && req.method === 'GET') {
      await this.routes.providers.listModels(req, res, modelsMatch[1])
      return true
    }

    // ============================================
    // WEBRTC ENDPOINTS
    // ============================================

    if (pathname.startsWith('/webrtc/')) {
      if (!webrtc.isAvailable()) {
        sendJson(res, { success: false, error: 'WebRTC coordinator not available' }, 503)
        return true
      }

      if (pathname === '/webrtc/info' && req.method === 'GET') {
        await webrtc.getInfo(req, res)
        return true
      }

      if (pathname === '/webrtc/join' && req.method === 'POST') {
        await webrtc.join(req, res, clientIp)
        return true
      }

      if (pathname === '/webrtc/leave' && req.method === 'POST') {
        await webrtc.leave(req, res, clientIp)
        return true
      }

      if (pathname === '/webrtc/signal' && req.method === 'POST') {
        await webrtc.sendSignal(req, res)
        return true
      }

      if (pathname === '/webrtc/signal' && req.method === 'GET') {
        await webrtc.pollSignals(req, res, url)
        return true
      }

      if (pathname === '/webrtc/peers' && req.method === 'GET') {
        await webrtc.getPeers(req, res, url)
        return true
      }

      if (pathname === '/webrtc/stats' && req.method === 'GET') {
        await webrtc.getStats(req, res)
        return true
      }

      sendJson(res, { error: 'WebRTC endpoint not found' }, 404)
      return true
    }

    return false
  }

  /**
   * Start the HTTP server
   */
  async start() {
    const ok = await this.init()
    if (!ok) process.exit(1)

    this.server = http.createServer((req, res) => this.handleRequest(req, res))

    // Handle WebSocket upgrades for WebRTC signaling
    this.server.on('upgrade', (request, socket, head) => {
      this.routes.webrtc.handleWebSocketUpgrade(request, socket, head)
    })

    this.server.listen(this.options.port, this.options.host, async () => {
      console.log(`\n🌌 Sentient Observer Server`)
      console.log(`   Node ID: ${this.nodeId}`)
      console.log(`   Listening on http://${this.options.host}:${this.options.port}`)
      console.log(`   Static files: ${this.options.staticPath}`)
      if (this.webrtcCoordinator) {
        console.log(`   WebRTC Coordinator: ${c.green}enabled${c.reset}`)
      }

      // Connect to seed nodes after server is listening
      await this.networkSync.connectToSeeds()

      console.log(`\n   API Endpoints:`)
      console.log(`   POST /chat              Send message`)
      console.log(`   GET  /status            Observer status`)
      console.log(`   GET  /introspect        Full introspection`)
      console.log(`   GET  /senses            Current sense readings`)
      console.log(`   GET  /history           Conversation history`)
      console.log(`   DELETE /history         Clear history`)
      console.log(`   GET  /nodes             Network topology`)
      console.log(`   GET  /stream/moments    SSE moment stream`)
      console.log(`\n   Learning Endpoints:`)
      console.log(`   POST /learning/start    Start autonomous learning`)
      console.log(`   POST /learning/stop     Stop autonomous learning`)
      console.log(`   POST /learning/pause    Pause learning`)
      console.log(`   POST /learning/resume   Resume learning`)
      console.log(`   GET  /learning/status   Learning status`)
      console.log(`   GET  /learning/logs     Chaperone logs`)
      console.log(`   GET  /learning/stream   SSE eavesdrop stream`)
      console.log(`   POST /learning/question Add question to explore`)
      console.log(`\n   Provider Endpoints:`)
      console.log(`   GET  /providers         List available providers`)
      console.log(`   GET  /providers/status  Provider status`)
      console.log(`   POST /providers/switch  Switch provider`)
      console.log(`   POST /providers/model   Set model`)
      if (this.webrtcCoordinator) {
        console.log(`\n   WebRTC Endpoints:`)
        console.log(`   GET  /webrtc/info       Coordinator info`)
        console.log(`   POST /webrtc/join       Join a room`)
        console.log(`   POST /webrtc/leave      Leave a room`)
        console.log(`   POST /webrtc/signal     Send signal`)
        console.log(`   GET  /webrtc/signal     Poll for signals`)
        console.log(`   GET  /webrtc/peers      List peers in room`)
        console.log(`   WS   /webrtc/signal     WebSocket signaling`)
      }
      console.log(`\n   Press Ctrl+C to stop\n`)
    })

    process.on('SIGINT', () => {
      console.log('\nShutting down...')
      this.observer.stop()
      if (this.webrtcCoordinator) {
        this.webrtcCoordinator.destroy()
      }
      if (this.wss) {
        this.wss.close()
      }
      this.server.close()
      process.exit(0)
    })
  }
}

module.exports = {
  SentientServer,
}
