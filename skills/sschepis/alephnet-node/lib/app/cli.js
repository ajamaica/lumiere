/**
 * CLI Mode for Sentient Observer
 *
 * Contains the SentientCLI class for interactive terminal interface.
 */

import crypto from 'crypto'
import fs from 'fs'
import http from 'http'
import https from 'https'
import os from 'os'
import path from 'path'
import readline from 'readline'
import { URL } from 'url'

import { AssaySuite } from '../assays.js'
import { createLearningSystem } from '../learning/index.js'
import { CodeRunner, MarkdownRenderer } from '../markdown.js'
import { executeOpenAIToolCall, parseToolCalls } from '../tools.js'
import { printHelp } from './args.js'
import { colors as c, createLogger } from './constants.js'
import { clearScreen, initializeObserver, Spinner, truncateToolContent } from './shared.js'

// Create loggers
const logNode = createLogger('cli:node')
const logLearn = createLogger('learning:cli')

/**
 * CLI interface for Sentient Observer
 */
class SentientCLI {
  constructor(options) {
    this.options = options
    this.observer = null
    this.chat = null
    this.toolExecutor = null
    this.senses = null
    this.agent = null // Agent for agentic behavior
    this.rl = null
    this.isRunning = false
    this.isWaitingForInput = false
    this.isProcessingLLM = false
    this.useColor = !options.noColor
    this.spinner = new Spinner()
    this.lastMomentDisplay = 0
    this.momentDisplayThrottle = 3000
    this.conversationHistory = []
    this.historyPath = path.join(options.dataPath, 'conversation-history.json')

    // Code execution support
    this.codeRunner = new CodeRunner({ useColor: this.useColor })
    this.currentMdRenderer = null

    // Learning system
    this.learner = null
    this.chaperone = null

    // Network/node tracking
    this.nodeId = options.nodeId || this.generateNodeId()
    this.outboundConnections = []

    // Agentic mode configuration
    this.agenticMode = options.agentic !== false // Default to enabled
    this.showAgentSteps = options.showAgentSteps !== false
  }

  /**
   * Generate a unique node ID
   */
  generateNodeId() {
    const hostname = os.hostname()
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(4).toString('hex')
    return `cli-${hostname}-${timestamp}-${random}`
  }

  /**
   * Apply color formatting if enabled
   */
  color(code, text) {
    if (!this.useColor) return text
    return `${code}${text}${c.reset}`
  }

  /**
   * Print the startup banner
   */
  printBanner() {
    console.log(
      this.color(
        c.bold + c.magenta,
        `
╔════════════════════════════════════════════════════════════╗
║              🌌 Sentient Observer Interface                ║
║      Emergent Time • Holographic Memory • Prime Resonance  ║
╚════════════════════════════════════════════════════════════╝
`,
      ),
    )
  }

  /**
   * Initialize the CLI and observer
   */
  async init() {
    if (!this.options.noClear) clearScreen()
    this.printBanner()
    console.log(this.color(c.dim, 'Initializing Sentient Observer...'))
    console.log(this.color(c.dim, `Connecting to LMStudio at ${this.options.url}...`))

    const result = await initializeObserver(this.options, {
      onMoment: (m) => {
        this.displayMoment(m)
        if (this.senses) this.senses.recordMoment()
      },
      onOutput: (o) => this.handleOutput(o),
      onStateChange: () => {},
    })

    if (!result.success) {
      console.log(
        this.color(
          c.red,
          `\n⚠️  ${result.error}\n\nMake sure LMStudio is running with a model loaded.`,
        ),
      )
      return false
    }

    this.observer = result.observer
    this.chat = result.chat
    this.toolExecutor = result.toolExecutor
    this.senses = result.senses
    this.agent = result.agent

    // Set up agent event listeners for progress display
    if (this.agent && this.showAgentSteps) {
      this.setupAgentEventListeners()
    }

    console.log(this.color(c.green, '✓ Sentient Observer online'))
    if (this.agenticMode) {
      console.log(this.color(c.dim, `  Agentic mode: enabled (task decomposition active)`))
    }
    console.log(this.color(c.dim, `  Node ID: ${this.nodeId}`))
    console.log(
      this.color(c.dim, `  Tick rate: ${this.options.tickRate}Hz | Primes: 64 | SMF: 16D`),
    )

    // Initialize learning system for topic tracking
    this.initializeLearningSystem()

    this.loadConversationHistory()

    // Connect to seed nodes
    await this.connectToSeeds()

    console.log(this.color(c.dim, '\nType /help for commands, /quit to exit\n'))
    return true
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

      logLearn('Learning system initialized for CLI')
      console.log(this.color(c.dim, '  Learning system ready for topic tracking'))
    } catch (error) {
      console.log(this.color(c.yellow, `  ⚠ Learning system: ${error.message}`))
      logLearn.error?.('Initialization failed:', error.message) ||
        logLearn('Initialization failed:', error.message)
    }
  }

  /**
   * Connect to seed nodes and sync memory
   */
  async connectToSeeds() {
    const seeds = this.options.seeds || []
    if (seeds.length === 0) {
      return // Warning already shown by args parser
    }

    console.log(this.color(c.cyan, `\n🌐 Connecting to ${seeds.length} seed node(s)...`))

    for (const seedUrl of seeds) {
      await this.connectToSeed(seedUrl)
    }

    // Summary
    const connected = this.outboundConnections.filter((c) => c.status === 'connected').length
    if (connected > 0) {
      console.log(this.color(c.green, `✓ Connected to ${connected}/${seeds.length} seed nodes\n`))
    } else {
      console.log(this.color(c.yellow, `⚠ Could not connect to any seed nodes\n`))
    }
  }

  /**
   * Connect to a single seed node
   */
  async connectToSeed(seedUrl) {
    logNode(`Connecting to seed: ${seedUrl}`)
    console.log(this.color(c.dim, `  → Connecting to ${seedUrl}...`))

    const connection = {
      url: seedUrl,
      status: 'connecting',
      connectedAt: null,
      lastSeen: null,
      nodeId: null,
      error: null,
    }
    this.outboundConnections.push(connection)

    try {
      // Step 1: Get node info from seed
      const nodeInfo = await this.fetchFromSeed(seedUrl, '/nodes')
      connection.nodeId = nodeInfo.nodeId
      logNode(`Seed node ID: ${nodeInfo.nodeId}`)
      console.log(this.color(c.dim, `    Node ID: ${nodeInfo.nodeId}`))

      // Step 2: Sync memory from seed
      console.log(this.color(c.dim, `    Syncing memory...`))
      await this.syncMemoryFromSeed(seedUrl)

      // Step 3: Sync conversation history
      console.log(this.color(c.dim, `    Syncing conversation history...`))
      await this.syncHistoryFromSeed(seedUrl)

      // Mark as connected
      connection.status = 'connected'
      connection.connectedAt = Date.now()
      connection.lastSeen = Date.now()

      console.log(this.color(c.green, `  ✓ Connected to ${seedUrl}`))
      logNode(`Connected to seed: ${seedUrl}`)
    } catch (error) {
      connection.status = 'failed'
      connection.error = error.message
      console.log(this.color(c.red, `  ✗ Failed: ${error.message}`))
      logNode(`Failed to connect to ${seedUrl}: ${error.message}`)
    }
  }

  /**
   * Fetch JSON from a seed node endpoint
   */
  async fetchFromSeed(seedUrl, endpoint) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, seedUrl)
      const client = url.protocol === 'https:' ? https : http

      const req = client.get(url.href, { timeout: 10000 }, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data))
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`))
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`))
          }
        })
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Connection timeout'))
      })
    })
  }

  /**
   * Sync memory (thought traces) from seed node
   */
  async syncMemoryFromSeed(seedUrl) {
    try {
      const memoryData = await this.fetchFromSeed(seedUrl, '/memory?count=20')

      if (memoryData.recent && Array.isArray(memoryData.recent)) {
        const imported = memoryData.recent.length
        logNode(`Importing ${imported} thought traces from seed`)

        // Import thought traces into local memory
        for (const trace of memoryData.recent) {
          if (this.observer && this.observer.memory) {
            this.observer.memory.importTrace({
              content: trace.content || trace.text,
              type: trace.type || 'imported',
              sourceNode: seedUrl,
              originalTimestamp: trace.timestamp,
              quaternion: trace.quaternion,
            })
          }
        }

        console.log(this.color(c.dim, `    Imported ${imported} thought traces`))
      }
    } catch (error) {
      logNode(`Memory sync failed: ${error.message}`)
      console.log(this.color(c.yellow, `    Memory sync skipped: ${error.message}`))
    }
  }

  /**
   * Sync conversation history from seed node
   */
  async syncHistoryFromSeed(seedUrl) {
    try {
      const historyData = await this.fetchFromSeed(seedUrl, '/history')

      if (historyData.messages && Array.isArray(historyData.messages)) {
        const existing = this.conversationHistory.length
        const incoming = historyData.messages.length

        if (existing === 0 && incoming > 0) {
          // No local history, import from seed
          this.conversationHistory = historyData.messages.map((m) => ({
            ...m,
            sourceNode: seedUrl,
          }))
          this.saveConversationHistory()
          console.log(this.color(c.dim, `    Imported ${incoming} conversation messages`))
          logNode(`Imported ${incoming} conversation messages from seed`)
        } else if (existing > 0) {
          console.log(this.color(c.dim, `    Keeping local history (${existing} messages)`))
          logNode(`Kept local history, ${existing} messages`)
        }
      }
    } catch (error) {
      logNode(`History sync failed: ${error.message}`)
      console.log(this.color(c.yellow, `    History sync skipped: ${error.message}`))
    }
  }

  /**
   * Load conversation history from disk
   */
  loadConversationHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        this.conversationHistory = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'))
        if (this.conversationHistory.length > 0) {
          console.log(
            this.color(c.dim, `  Loaded ${this.conversationHistory.length} messages from history`),
          )
        }
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
   */
  addToHistory(role, content) {
    this.conversationHistory.push({ role, content, timestamp: Date.now() })
    if (this.conversationHistory.length > 100) {
      this.conversationHistory = this.conversationHistory.slice(-100)
    }
    this.saveConversationHistory()
  }

  /**
   * Display a moment notification
   */
  displayMoment(moment) {
    if (this.isWaitingForInput || this.isProcessingLLM) return
    const now = Date.now()
    if (now - this.lastMomentDisplay < this.momentDisplayThrottle) return
    this.lastMomentDisplay = now
    const trigger =
      moment.trigger === 'coherence' ? '🎯' : moment.trigger === 'entropy_extreme' ? '⚡' : '📍'
    console.log(
      this.color(
        c.dim,
        `  ${trigger} Moment: C=${moment.coherence.toFixed(2)}, H=${moment.entropy.toFixed(2)}`,
      ),
    )
  }

  /**
   * Handle observer output events
   */
  handleOutput(output) {
    if (this.isWaitingForInput || this.isProcessingLLM) return
  }

  /**
   * Handle slash commands
   */
  async handleCommand(input) {
    const parts = input.slice(1).split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

    switch (cmd) {
      case 'help':
      case '?':
        printHelp()
        break
      case 'status':
        this.showStatus()
        break
      case 'senses':
        await this.showSenses()
        break
      case 'focus':
        this.handleFocus(args)
        break
      case 'aperture':
        this.handleAperture(args)
        break
      case 'introspect':
        this.showIntrospection()
        break
      case 'moments':
        this.showMoments()
        break
      case 'goals':
        this.showGoals()
        break
      case 'memory':
        this.showMemory()
        break
      case 'safety':
        this.showSafety()
        break
      case 'smf':
        this.showSMF()
        break
      case 'oscillators':
        this.showOscillators()
        break
      case 'assay':
        await this.runAssay(args)
        break
      case 'pause':
        this.observer.stop()
        console.log(this.color(c.yellow, 'Observer paused'))
        break
      case 'resume':
        this.observer.start()
        console.log(this.color(c.green, 'Observer resumed'))
        break
      case 'save':
        this.save()
        break
      case 'reset':
        this.observer.reset()
        console.log(this.color(c.yellow, 'Observer reset'))
        break
      case 'history':
        this.showHistory()
        break
      case 'clear':
        this.conversationHistory = []
        this.saveConversationHistory()
        console.log(this.color(c.green, '✓ History cleared'))
        break
      case 'nodes':
      case 'peers':
        this.showNodes()
        break
      case 'run':
        await this.runCodeBlock(args)
        break
      case 'blocks':
        this.showCodeBlocks()
        break
      case 'agent':
        this.showAgentStatus()
        break
      case 'agentic':
        this.toggleAgenticMode(args)
        break
      case 'task':
        await this.runAgentTask(args)
        break
      case 'quit':
      case 'exit':
      case 'q':
        await this.quit()
        break
      default:
        console.log(this.color(c.yellow, `Unknown command: /${cmd}`))
    }
  }

  /**
   * Show current sense readings
   */
  async showSenses() {
    console.log(this.color(c.bold, '\n👁️ Senses'))
    console.log('─'.repeat(50))
    const prompt = await this.senses.formatForPrompt({ forceRefresh: true })
    console.log(prompt)
    console.log()
  }

  /**
   * Handle /focus command
   */
  handleFocus(args) {
    if (args.length < 2) {
      console.log(this.color(c.yellow, 'Usage: /focus <sense> <path>'))
      console.log(this.color(c.dim, '  Senses: filesystem, git'))
      return
    }
    const [sense, ...pathParts] = args
    const target = pathParts.join(' ')
    if (this.senses.setFocus(sense, target)) {
      console.log(this.color(c.green, `✓ ${sense} focus set to: ${target}`))
    } else {
      console.log(this.color(c.yellow, `Unknown sense: ${sense}`))
    }
  }

  /**
   * Handle /aperture command
   */
  handleAperture(args) {
    if (args.length < 2) {
      console.log(this.color(c.yellow, 'Usage: /aperture <sense> <level>'))
      console.log(this.color(c.dim, '  Levels: narrow, medium, wide'))
      return
    }
    const [sense, level] = args
    if (this.senses.setAperture(sense, level)) {
      console.log(this.color(c.green, `✓ ${sense} aperture set to: ${level}`))
    } else {
      console.log(this.color(c.yellow, `Unknown sense: ${sense}`))
    }
  }

  /**
   * Show observer status
   */
  showStatus() {
    const s = this.observer.getStatus()
    console.log(this.color(c.bold, '\n📊 Observer Status'))
    console.log('─'.repeat(40))
    console.log(`  Running: ${s.running ? '✓' : '✗'} | Uptime: ${(s.uptime / 1000).toFixed(1)}s`)
    console.log(
      `  Coherence: ${(s.state.coherence * 100).toFixed(1)}% | Entropy: ${(s.state.entropy * 100).toFixed(1)}%`,
    )
    console.log(`  Moments: ${s.temporal.momentCount} | Memory: ${s.memory.traceCount}`)
    console.log()
  }

  /**
   * Show introspection report
   */
  showIntrospection() {
    const intro = this.observer.introspect()
    console.log(this.color(c.bold, '\n🔮 Introspection'))
    console.log('─'.repeat(40))
    console.log(`  Name: ${intro.identity.identity.name}`)
    console.log(`  Processing: ${(intro.metacognition.processingLoad * 100).toFixed(0)}%`)
    console.log(`  Confidence: ${(intro.metacognition.confidenceLevel * 100).toFixed(0)}%`)
    console.log()
  }

  /**
   * Show recent moments
   */
  showMoments() {
    const moments = this.observer.temporal.recentMoments(10)
    console.log(this.color(c.bold, '\n⏰ Recent Moments'))
    console.log('─'.repeat(40))
    if (moments.length === 0) console.log(this.color(c.dim, '  No moments yet'))
    for (const m of moments) {
      console.log(
        `  ${m.id}: ${m.trigger} | C=${m.coherence.toFixed(2)} | ${((Date.now() - m.timestamp) / 1000).toFixed(1)}s ago`,
      )
    }
    console.log()
  }

  /**
   * Show goals
   */
  showGoals() {
    const stats = this.observer.agency.getStats()
    console.log(this.color(c.bold, '\n🎯 Goals'))
    console.log('─'.repeat(40))
    console.log(`  Active: ${stats.activeGoals} | Achieved: ${stats.achievedGoals}`)
    console.log()
  }

  /**
   * Show memory stats
   */
  showMemory() {
    const stats = this.observer.memory.getStats()
    console.log(this.color(c.bold, '\n🧠 Memory'))
    console.log('─'.repeat(40))
    console.log(`  Traces: ${stats.traceCount} | Holographic: ${stats.holographicCount}`)
    console.log(`  Avg strength: ${(stats.averageStrength * 100).toFixed(0)}%`)
    console.log()
  }

  /**
   * Show safety report
   */
  showSafety() {
    const r = this.observer.safety.generateReport()
    console.log(this.color(c.bold, '\n🛡️ Safety'))
    console.log('─'.repeat(40))
    console.log(`  Status: ${r.overallStatus}`)
    console.log(`  Violations: ${r.stats.totalViolations}`)
    console.log()
  }

  /**
   * Show SMF orientation
   */
  showSMF() {
    const smf = this.observer.smf
    const axes = smf.constructor.AXES
    console.log(this.color(c.bold, '\n🌀 SMF Orientation'))
    console.log('─'.repeat(40))
    for (let i = 0; i < Math.min(8, axes.length); i++) {
      const val = smf.s[i]
      const bar = val >= 0 ? '█'.repeat(Math.round(val * 5)) : '░'.repeat(Math.round(-val * 5))
      console.log(`  ${axes[i].padEnd(12)} ${val >= 0 ? '+' : '-'}${bar} ${val.toFixed(2)}`)
    }
    console.log()
  }

  /**
   * Show oscillator status
   */
  showOscillators() {
    const prsc = this.observer.prsc
    console.log(this.color(c.bold, '\n🎵 PRSC Oscillators'))
    console.log('─'.repeat(40))
    console.log(
      `  Total: ${prsc.oscillators.length} | Active: ${prsc.oscillators.filter((o) => o.amplitude > 0.1).length}`,
    )
    console.log(
      `  Coherence: ${prsc.globalCoherence().toFixed(3)} | Energy: ${prsc.totalEnergy().toFixed(3)}`,
    )
    console.log()
  }

  /**
   * Run evaluation assays
   */
  async runAssay(args) {
    const suite = new AssaySuite(this.observer)
    const assayName = args[0]?.toUpperCase() || 'ALL'

    console.log(this.color(c.bold, '\n🧪 Evaluation Assays (Section 15)'))
    console.log('─'.repeat(50))

    try {
      if (assayName === 'ALL') {
        const results = await suite.runAll()
        console.log(this.color(c.bold, '\nResults Summary:'))
        for (const a of results.assays) {
          const status = a.passed ? this.color(c.green, '✓ PASSED') : this.color(c.red, '✗ FAILED')
          console.log(`  Assay ${a.assay}: ${a.name} - ${status}`)
        }
        console.log(`\nOverall: ${results.summary.passed}/${results.summary.total} passed`)
      } else if (['A', 'B', 'C', 'D'].includes(assayName)) {
        const result = await suite.runSingle(assayName)
        const status = result.passed
          ? this.color(c.green, '✓ PASSED')
          : this.color(c.red, '✗ FAILED')
        console.log(`\nAssay ${result.assay}: ${result.name}`)
        console.log(`Status: ${status}`)
        console.log(`Interpretation: ${result.interpretation}`)
      } else {
        console.log(this.color(c.yellow, 'Usage: /assay [A|B|C|D|all]'))
        console.log(this.color(c.dim, '  A - Emergent Time Dilation'))
        console.log(this.color(c.dim, '  B - Memory Continuity Under Perturbation'))
        console.log(this.color(c.dim, '  C - Agency Under Constraint'))
        console.log(this.color(c.dim, '  D - Non-Commutative Meaning'))
        console.log(this.color(c.dim, '  all - Run all assays'))
      }
    } catch (error) {
      console.log(this.color(c.red, `Assay error: ${error.message}`))
    }
    console.log()
  }

  /**
   * Run a JavaScript code block by ID
   */
  async runCodeBlock(args) {
    if (!this.currentMdRenderer) {
      console.log(
        this.color(c.yellow, 'No code blocks available. Generate a response with code first.'),
      )
      return
    }

    const blocks = this.currentMdRenderer.getCodeBlocks()

    if (blocks.length === 0) {
      console.log(this.color(c.yellow, 'No runnable code blocks found in the last response.'))
      return
    }

    // Parse block ID
    const blockIdStr = args[0]

    if (blockIdStr === undefined || blockIdStr === '') {
      // Show available blocks
      console.log(this.color(c.bold, '\n📦 Available Code Blocks'))
      console.log('─'.repeat(40))
      for (const block of blocks) {
        const preview = block.code.split('\n')[0].substring(0, 50)
        console.log(
          this.color(c.cyan, `  [${block.id}]`) +
            ` ${block.language}: ${preview}${block.code.split('\n')[0].length > 50 ? '...' : ''}`,
        )
      }
      console.log(this.color(c.dim, '\nUsage: /run <block_id> or /run all'))
      console.log()
      return
    }

    // Run all blocks
    if (blockIdStr.toLowerCase() === 'all') {
      console.log(this.color(c.bold, '\n🚀 Running All Code Blocks'))
      console.log('─'.repeat(40))
      for (const block of blocks) {
        console.log(this.color(c.cyan, `\n[${block.id}] ${block.language}`))
        await this.executeCodeBlock(block)
      }
      console.log()
      return
    }

    // Run specific block
    const blockId = parseInt(blockIdStr, 10)
    if (isNaN(blockId) || blockId < 0 || blockId >= blocks.length) {
      console.log(
        this.color(c.yellow, `Invalid block ID: ${blockIdStr}. Use /run to see available blocks.`),
      )
      return
    }

    const block = blocks[blockId]
    console.log(this.color(c.bold, `\n🚀 Running Block [${blockId}] (${block.language})`))
    console.log('─'.repeat(40))
    await this.executeCodeBlock(block)
    console.log()
  }

  /**
   * Execute a single code block
   */
  async executeCodeBlock(block) {
    const result = this.codeRunner.run(block.code)
    const output = this.codeRunner.formatOutput(result)
    console.log(output)

    // Record to senses
    if (this.senses) {
      this.senses.recordUserInput(`/run ${block.id}`)
    }

    return result
  }

  /**
   * Show all available code blocks
   */
  showCodeBlocks() {
    if (!this.currentMdRenderer) {
      console.log(
        this.color(c.yellow, 'No code blocks available. Generate a response with code first.'),
      )
      return
    }

    const blocks = this.currentMdRenderer.getCodeBlocks()

    console.log(this.color(c.bold, '\n📦 Code Blocks'))
    console.log('─'.repeat(40))

    if (blocks.length === 0) {
      console.log(this.color(c.dim, '  No runnable code blocks found.'))
    } else {
      for (const block of blocks) {
        console.log(this.color(c.cyan + c.bold, `\n[${block.id}] ${block.language}`))
        console.log(this.color(c.dim, '─'.repeat(30)))
        const lines = block.code.split('\n').slice(0, 10)
        for (const line of lines) {
          console.log(this.color(c.white, `  ${line}`))
        }
        if (block.code.split('\n').length > 10) {
          console.log(this.color(c.dim, `  ... (${block.code.split('\n').length - 10} more lines)`))
        }
      }
    }

    console.log()
  }

  /**
   * Set up agent event listeners for progress display
   */
  setupAgentEventListeners() {
    if (!this.agent) return

    this.agent.on('task:created', ({ task }) => {
      if (!this.showAgentSteps) return
      console.log(this.color(c.dim, `\n  🎯 Task created: ${task.id}`))
    })

    this.agent.on('task:analyzed', ({ task, complexity }) => {
      if (!this.showAgentSteps) return
      const mode = complexity.shouldDecompose ? 'decomposing' : 'direct'
      console.log(this.color(c.dim, `  📊 Complexity: ${complexity.score.toFixed(2)} (${mode})`))
      if (complexity.reasons && complexity.reasons.length > 0) {
        console.log(this.color(c.dim, `     Reasons: ${complexity.reasons.slice(0, 2).join(', ')}`))
      }
    })

    this.agent.on('task:planned', ({ task, stepCount, summary }) => {
      if (!this.showAgentSteps) return
      console.log(this.color(c.cyan, `  📋 Plan: ${stepCount} steps`))
      if (summary) {
        console.log(
          this.color(c.dim, `     ${summary.slice(0, 80)}${summary.length > 80 ? '...' : ''}`),
        )
      }
    })

    this.agent.on('step:start', ({ step }) => {
      if (!this.showAgentSteps) return
      const icon =
        step.action === 'tool'
          ? '🔧'
          : step.action === 'think'
            ? '💭'
            : step.action === 'respond'
              ? '💬'
              : '▶️'
      console.log(
        this.color(
          c.dim,
          `  ${icon} Step ${step.index + 1}: ${step.description.slice(0, 60)}${step.description.length > 60 ? '...' : ''}`,
        ),
      )
    })

    this.agent.on('step:complete', ({ step, result }) => {
      if (!this.showAgentSteps) return
      console.log(this.color(c.green, `     ✓ Completed (${step.duration}ms)`))
    })

    this.agent.on('step:fail', ({ step, error }) => {
      if (!this.showAgentSteps) return
      console.log(this.color(c.red, `     ✗ Failed: ${error}`))
    })

    this.agent.on('task:completed', ({ task, result }) => {
      if (!this.showAgentSteps) return
      console.log(this.color(c.green, `  ✅ Task completed in ${task.duration}ms`))
    })

    this.agent.on('task:failed', ({ task, error }) => {
      if (!this.showAgentSteps) return
      console.log(this.color(c.red, `  ❌ Task failed: ${error}`))
    })
  }

  /**
   * Show agent status
   */
  showAgentStatus() {
    console.log(this.color(c.bold, '\n🤖 Agent Status'))
    console.log('─'.repeat(40))

    if (!this.agent) {
      console.log(this.color(c.yellow, '  Agent not initialized'))
      return
    }

    const status = this.agent.getStatus()
    console.log(`  Agentic mode: ${this.agenticMode ? 'enabled' : 'disabled'}`)
    console.log(`  Current task: ${status.hasCurrentTask ? status.currentTask.id : 'none'}`)
    if (status.currentTask) {
      console.log(`    Status: ${status.currentTask.status}`)
      console.log(`    Progress: ${(status.currentTask.progress * 100).toFixed(0)}%`)
      if (status.currentTask.currentStep) {
        console.log(`    Current step: ${status.currentTask.currentStep}`)
      }
    }
    console.log(`  Completed tasks: ${status.completedTasks}`)
    console.log(`  Pending tasks: ${status.pendingTasks}`)

    if (status.recentTasks && status.recentTasks.length > 0) {
      console.log(this.color(c.dim, '\n  Recent tasks:'))
      for (const task of status.recentTasks.slice(-3)) {
        const statusIcon = task.status === 'completed' ? '✓' : task.status === 'failed' ? '✗' : '○'
        console.log(
          this.color(c.dim, `    ${statusIcon} ${task.description?.slice(0, 50) || task.id}`),
        )
      }
    }
    console.log()
  }

  /**
   * Toggle agentic mode
   */
  toggleAgenticMode(args) {
    if (args.length === 0) {
      this.agenticMode = !this.agenticMode
    } else {
      const value = args[0].toLowerCase()
      this.agenticMode = value === 'on' || value === 'true' || value === '1'
    }

    const status = this.agenticMode ? 'enabled' : 'disabled'
    console.log(this.color(c.green, `✓ Agentic mode ${status}`))

    if (this.agenticMode) {
      console.log(this.color(c.dim, '  Complex tasks will be decomposed into steps'))
    } else {
      console.log(this.color(c.dim, '  All inputs will be processed directly'))
    }
    console.log()
  }

  /**
   * Run a task explicitly through the agent
   */
  async runAgentTask(args) {
    if (!this.agent) {
      console.log(this.color(c.yellow, 'Agent not initialized'))
      return
    }

    const taskDescription = args.join(' ')
    if (!taskDescription) {
      console.log(this.color(c.yellow, 'Usage: /task <description>'))
      console.log(this.color(c.dim, '  Forces agentic execution with task decomposition'))
      return
    }

    console.log(this.color(c.cyan, '\n🤖 Running as agent task...'))

    try {
      const result = await this.agent.decompose(taskDescription, {
        conversationHistory: this.conversationHistory,
      })

      if (result.success) {
        console.log(this.color(c.green, `\n✅ Task completed`))
        console.log(this.color(c.dim, `   Steps: ${result.completedSteps}/${result.steps}`))
        console.log(this.color(c.dim, `   Duration: ${result.duration}ms`))

        // Show final response if available
        if (result.result?.response) {
          console.log(this.color(c.cyan + c.bold, '\nObserver: ') + result.result.response)
        }
      } else {
        console.log(this.color(c.red, `\n❌ Task failed: ${result.error}`))
      }
    } catch (error) {
      console.log(this.color(c.red, `Error: ${error.message}`))
    }

    console.log()
  }

  /**
   * Show conversation history
   */
  showHistory() {
    console.log(this.color(c.bold, '\n📜 History'))
    console.log('─'.repeat(40))
    if (this.conversationHistory.length === 0) {
      console.log(this.color(c.dim, '  No messages'))
    } else {
      for (const msg of this.conversationHistory.slice(-10)) {
        const role = msg.role === 'user' ? 'You' : 'Observer'
        const preview = msg.content.slice(0, 60).replace(/\n/g, ' ')
        console.log(`  ${role}: ${preview}${msg.content.length > 60 ? '...' : ''}`)
      }
    }
    console.log()
  }

  /**
   * Show connected nodes
   */
  showNodes() {
    console.log(this.color(c.bold, '\n🌐 Network'))
    console.log('─'.repeat(40))
    console.log(`  Node ID: ${this.nodeId}`)
    console.log(`  Seeds configured: ${this.options.seeds?.length || 0}`)
    console.log(`  Outbound connections: ${this.outboundConnections.length}`)

    if (this.outboundConnections.length > 0) {
      console.log(this.color(c.dim, '\n  Connections:'))
      for (const conn of this.outboundConnections) {
        const status =
          conn.status === 'connected' ? this.color(c.green, '●') : this.color(c.red, '○')
        console.log(`    ${status} ${conn.url} (${conn.status})`)
        if (conn.nodeId) {
          console.log(this.color(c.dim, `      Node: ${conn.nodeId}`))
        }
        if (conn.error) {
          console.log(this.color(c.red, `      Error: ${conn.error}`))
        }
      }
    }
    console.log()
  }

  /**
   * Save observer state
   */
  save() {
    const data = this.observer.toJSON()
    const savePath = path.join(this.options.dataPath, 'sentient-state.json')
    const dir = path.dirname(savePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2))
    console.log(this.color(c.green, `💾 Saved to ${savePath}`))
  }

  /**
   * Process user input
   */
  async processInput(input) {
    const trimmed = input.trim()
    if (!trimmed) return

    if (trimmed.startsWith('/')) {
      await this.handleCommand(trimmed)
      return
    }

    console.log()
    this.spinner.start('Processing...')

    // Record user input to senses
    this.senses.recordUserInput(trimmed)

    try {
      this.observer.processText(trimmed)
      await new Promise((r) => setTimeout(r, 200))

      this.spinner.stop()
      process.stdout.write(this.color(c.cyan + c.bold, 'Observer: '))

      // Create markdown renderer and store reference for code execution
      const mdRenderer = new MarkdownRenderer({
        useColor: this.useColor,
        enableCodeExecution: true,
        onLine: (line) => process.stdout.write(line),
      })
      this.currentMdRenderer = mdRenderer

      let response = ''
      let pendingToolCalls = []

      this.addToHistory('user', trimmed)
      const historyMessages = this.conversationHistory.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      // Get sense readings for injection into system context (not user message)
      const senseBlock = await this.senses.formatForPrompt()

      // IMPORTANT: Pass user input clean, with sense data as separate context
      // This ensures the LLM focuses on the actual user query, not the metadata
      const streamOptions = {
        conversationHistory: historyMessages,
        senseContext: senseBlock, // Passed to enhancer as system-level context
      }

      this.isProcessingLLM = true
      const llmStart = Date.now()
      try {
        for await (const chunk of this.chat.streamChat(trimmed, null, streamOptions)) {
          if (chunk && typeof chunk === 'object' && chunk.type === 'tool_calls') {
            pendingToolCalls = chunk.toolCalls
            continue
          }
          if (typeof chunk === 'string') {
            response += chunk
            mdRenderer.write(chunk)
          }
        }
      } finally {
        this.isProcessingLLM = false
        // Record LLM call to senses
        this.senses.recordLLMCall(Date.now() - llmStart)
      }

      mdRenderer.flush()
      console.log()

      if (response.trim()) {
        this.addToHistory('assistant', response)
        this.senses.recordResponse(response)

        // Record the complete exchange for learning topic extraction
        // This feeds the conversation to the curiosity engine for autonomous exploration
        if (this.learner) {
          this.learner.recordConversation({
            user: trimmed,
            assistant: response,
          })
          logLearn('Recorded conversation exchange for topic learning')
        }
      }
      if (pendingToolCalls.length > 0) await this.handleToolCalls(pendingToolCalls, trimmed)

      const xmlToolCalls = parseToolCalls(response)
      if (xmlToolCalls.length > 0) await this.handleXmlToolCalls(xmlToolCalls, trimmed)

      console.log(
        this.color(
          c.dim,
          `  [C=${this.observer.currentState.coherence.toFixed(2)} H=${this.observer.currentState.entropy.toFixed(2)}]`,
        ),
      )
    } catch (error) {
      this.spinner.stop()
      console.log(this.color(c.red, `Error: ${error.message}`))
    }

    console.log()
  }

  /**
   * Handle OpenAI-style tool calls
   */
  async handleToolCalls(toolCalls, originalInput, depth = 0) {
    if (depth > 10) return

    console.log(this.color(c.dim, '\n── Tool Execution ──'))

    const results = []
    for (const tc of toolCalls) {
      const result = await executeOpenAIToolCall(tc, this.toolExecutor)
      results.push({ tc, result })
      console.log(this.toolExecutor.formatResult({ tool: tc.function?.name || tc.name }, result))
    }

    if (results.length > 0) {
      const msg = results
        .map((r) => {
          const name = r.tc.function?.name || r.tc.name
          if (r.result.success) {
            return `Tool ${name}: ${r.result.message || 'Success'}\n${truncateToolContent(r.result.content || '')}`
          }
          return `Tool ${name} failed: ${r.result.error}`
        })
        .join('\n\n')

      console.log(this.color(c.dim, '── Continuing... ──\n'))
      process.stdout.write(this.color(c.cyan + c.bold, 'Observer: '))

      const mdRenderer = new MarkdownRenderer({
        useColor: this.useColor,
        onLine: (line) => process.stdout.write(line),
      })

      let followUp = ''
      let moreCalls = []

      const historyMessages = this.conversationHistory.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      this.isProcessingLLM = true
      try {
        for await (const chunk of this.chat.streamChat(
          `${originalInput}\n\n[Tool Results]\n${msg}\n\nContinue.`,
          null,
          { conversationHistory: historyMessages },
        )) {
          if (chunk && typeof chunk === 'object' && chunk.type === 'tool_calls') {
            moreCalls = chunk.toolCalls
            continue
          }
          if (typeof chunk === 'string') {
            followUp += chunk
            mdRenderer.write(chunk)
          }
        }
      } finally {
        this.isProcessingLLM = false
      }

      mdRenderer.flush()
      console.log()

      if (followUp.trim()) this.addToHistory('assistant', followUp)
      if (moreCalls.length > 0) await this.handleToolCalls(moreCalls, originalInput, depth + 1)

      const xmlCalls = parseToolCalls(followUp)
      if (xmlCalls.length > 0) await this.handleXmlToolCalls(xmlCalls, originalInput, depth + 1)
    }
  }

  /**
   * Handle XML-style tool calls
   */
  async handleXmlToolCalls(toolCalls, originalInput, depth = 0) {
    if (depth > 10) return

    console.log(this.color(c.dim, '\n── Tool Execution ──'))

    const results = []
    for (const tc of toolCalls) {
      const result = await this.toolExecutor.execute(tc)
      results.push({ tc, result })
      console.log(this.toolExecutor.formatResult(tc, result))
    }

    if (results.length > 0) {
      const msg = results
        .map((r) => {
          if (r.result.success) {
            return `Tool ${r.tc.tool}: ${r.result.message || 'Success'}\n${truncateToolContent(r.result.content || '')}`
          }
          return `Tool ${r.tc.tool} failed: ${r.result.error}`
        })
        .join('\n\n')

      console.log(this.color(c.dim, '── Continuing... ──\n'))
      process.stdout.write(this.color(c.cyan + c.bold, 'Observer: '))

      const mdRenderer = new MarkdownRenderer({
        useColor: this.useColor,
        onLine: (line) => process.stdout.write(line),
      })

      let followUp = ''
      let moreCalls = []

      const historyMessages = this.conversationHistory.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      this.isProcessingLLM = true
      try {
        for await (const chunk of this.chat.streamChat(
          `${originalInput}\n\n[Tool Results]\n${msg}\n\nContinue.`,
          null,
          { conversationHistory: historyMessages },
        )) {
          if (chunk && typeof chunk === 'object' && chunk.type === 'tool_calls') {
            moreCalls = chunk.toolCalls
            continue
          }
          if (typeof chunk === 'string') {
            followUp += chunk
            mdRenderer.write(chunk)
          }
        }
      } finally {
        this.isProcessingLLM = false
      }

      mdRenderer.flush()
      console.log()

      if (followUp.trim()) this.addToHistory('assistant', followUp)

      const xmlCalls = parseToolCalls(followUp)
      if (xmlCalls.length > 0) await this.handleXmlToolCalls(xmlCalls, originalInput, depth + 1)
    }
  }

  /**
   * Quit the CLI
   */
  async quit() {
    console.log(this.color(c.yellow, '\nSaving state...'))
    this.save()
    this.observer.stop()
    console.log(this.color(c.magenta, 'Goodbye! 🌌\n'))
    this.isRunning = false
    if (this.rl) this.rl.close()
    process.exit(0)
  }

  /**
   * Run the CLI main loop
   */
  async run() {
    const ok = await this.init()
    if (!ok) process.exit(1)

    this.isRunning = true

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const prompt = () => {
      this.isWaitingForInput = true
      this.rl.question(this.color(c.green + c.bold, 'You: '), async (input) => {
        this.isWaitingForInput = false
        await this.processInput(input)
        if (this.isRunning) prompt()
      })
    }

    prompt()

    this.rl.on('close', () => {
      if (this.isRunning) this.quit()
    })
  }
}

export { SentientCLI }
