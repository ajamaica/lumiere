#!/usr/bin/env node

/**
 * Soul Shepherd - Main Orchestrator
 * Continuous process that manages all components:
 * - Sabbath time blocking
 * - Tone analysis
 * - GitHub activity monitoring
 * - Daily check-in prompts
 */

const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const RestGuardian = require('./rest-guardian')
const PatternLearner = require('./pattern-learner')
const ToneAnalyzer = require('./tone-analyzer')
const CheckInPrompter = require('./check-in-prompter')
const WorldEventConnector = require('./world-event-connector')

class SoulShepherd extends EventEmitter {
  constructor() {
    super()
    this.config = this.loadConfig()
    this.logger = this.setupLogger()
    this.components = {}
    this.running = false

    this.log('info', 'Soul Shepherd initializing...')
  }

  loadConfig() {
    return {
      timezone: process.env.TIMEZONE || 'UTC',
      sabbathEnabled: process.env.SABBATH_ENABLED === 'true',
      toneAnalysisEnabled: process.env.TONE_ANALYSIS_ENABLED !== 'false',
      githubToken: process.env.GITHUB_TOKEN,
      githubUsername: process.env.GITHUB_USERNAME,
      telegramChatId: process.env.TELEGRAM_CHAT_ID,
      checkInTime: process.env.CHECK_IN_TIME || '08:00',
      checkInEnabled: process.env.CHECK_IN_ENABLED !== 'false',
      eveningReflectionTime: process.env.EVENING_REFLECTION_TIME || '20:00',
      eveningReflectionEnabled: process.env.EVENING_REFLECTION_ENABLED !== 'false',
      devMode: process.env.DEV_MODE === 'true',
      logLevel: process.env.LOG_LEVEL || 'info',
      versesDb: process.env.VERSES_DB || 'config/verses.json',
      userName: process.env.USER_NAME || 'Friend',
    }
  }

  setupLogger() {
    const logDir = path.join(__dirname, '..', 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    return {
      debug: (msg) => this.log('debug', msg),
      info: (msg) => this.log('info', msg),
      warn: (msg) => this.log('warn', msg),
      error: (msg) => this.log('error', msg),
    }
  }

  log(level, msg) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${msg}`

    // Console output
    if (this.shouldLog(level)) {
      console.log(logEntry)
    }

    // File logging
    const logFile = path.join(__dirname, '..', 'logs', 'soul-shepherd.log')
    try {
      fs.appendFileSync(logFile, logEntry + '\n')
    } catch (e) {
      // Silent fail on logging errors
    }
  }

  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    return levels[level] >= levels[this.config.logLevel]
  }

  async initialize() {
    try {
      // Initialize components
      this.components.restGuardian = new RestGuardian(this.config, this.logger)
      this.components.patternLearner = new PatternLearner(this.config, this.logger)
      this.components.toneAnalyzer = new ToneAnalyzer(this.config, this.logger)
      this.components.checkInPrompter = new CheckInPrompter(this.config, this.logger)
      this.components.worldEventConnector = new WorldEventConnector(this.config, this.logger)

      // Wire up event listeners
      this.setupEventHandlers()

      this.log('info', '✓ All components initialized')
      return true
    } catch (e) {
      this.log('error', `Initialization failed: ${e.message}`)
      return false
    }
  }

  setupEventHandlers() {
    // Rest Guardian events
    this.components.restGuardian.on('rest-needed', (data) => {
      this.handleRestNeeded(data)
    })

    this.components.restGuardian.on('rest-reminder', (data) => {
      this.handleRestReminder(data)
    })

    this.components.restGuardian.on('late-night-detected', (data) => {
      this.handleLateNightDetected(data)
    })

    // Pattern Learner events
    this.components.patternLearner.on('unusual-activity', (data) => {
      this.handleUnusualActivity(data)
    })

    this.components.patternLearner.on('burnout-warning', (data) => {
      this.handleBurnoutWarning(data)
    })

    // Tone Analyzer events
    this.components.toneAnalyzer.on('stress-detected', (data) => {
      this.handleStressDetected(data)
    })

    // Check-in Prompter events
    this.components.checkInPrompter.on('morning-check-in', (data) => {
      this.handleMorningCheckIn(data)
    })

    this.components.checkInPrompter.on('evening-reflection', (data) => {
      this.handleEveningReflection(data)
    })

    // World Event Connector
    this.components.worldEventConnector.on('scripture-for-event', (data) => {
      this.handleWorldEventConnection(data)
    })
  }

  async start() {
    if (this.running) {
      this.log('warn', 'Soul Shepherd is already running')
      return
    }

    const initialized = await this.initialize()
    if (!initialized) {
      return
    }

    this.running = true
    this.log('info', '🚀 Soul Shepherd started')

    // Start component loops
    this.components.restGuardian.start()
    this.components.patternLearner.start()
    this.components.checkInPrompter.start()
    this.components.worldEventConnector.start()

    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown())
    process.on('SIGTERM', () => this.shutdown())
  }

  async shutdown() {
    this.log('info', '⏹️  Shutting down Soul Shepherd...')
    this.running = false

    // Stop all components
    Object.values(this.components).forEach((component) => {
      if (component.stop) {
        component.stop()
      }
    })

    this.log('info', '✓ Soul Shepherd stopped')
    process.exit(0)
  }

  // ============================================
  // Event Handlers
  // ============================================

  async handleRestNeeded(data) {
    this.log('info', `Rest needed: ${data.type}`)
    this.emit('message', {
      type: 'rest-needed',
      message: data.message,
      detail:
        "Jesus said 'Come to me, all you who are weary, and I will give you rest.' That's the offer—rest in Him, not just a day off.",
      timestamp: new Date(),
    })
  }

  async handleRestReminder(data) {
    this.log('info', 'Rest reminder')
    this.emit('message', {
      type: 'rest-reminder',
      message: data.message,
      timestamp: new Date(),
    })
  }

  async handleLateNightDetected(data) {
    this.log('info', 'Late night detected')
    this.emit('message', {
      type: 'late-night',
      message: data.message,
      detail:
        "Hebrews 4:10 — 'For anyone who enters God's rest also rests from their works.' Are you resting FROM your works, or just pausing?",
      timestamp: new Date(),
    })
  }

  async handleUnusualActivity(data) {
    this.log('warn', `Unusual activity detected: ${data.type}`)

    let message = ''
    switch (data.type) {
      case 'late-night-commits':
        message = `📊 I noticed you've been pushing code after midnight (${data.count} times this week). That's not sustainable.`
        break
      case 'weekend-work':
        message = `📊 Weekend work detected. I know deadlines push, but your rhythm matters too.`
        break
      case 'sabbath-work':
        message = `📊 I noticed work during Sabbath time. I know there's always more to do, but you're allowed to stop.`
        break
    }

    if (message) {
      this.emit('message', {
        type: 'pattern-alert',
        message,
        detail: data.suggestion || "Let's talk about what's driving this.",
        timestamp: new Date(),
      })
    }
  }

  async handleBurnoutWarning(data) {
    this.log('warn', `Burnout warning: ${data.reason}`)
    this.emit('message', {
      type: 'burnout-warning',
      message: "⚠️ I'm seeing patterns that suggest burnout is approaching.",
      detail: data.reason,
      timestamp: new Date(),
    })
  }

  async handleStressDetected(data) {
    this.log('info', `Stress detected in message: ${data.indicators.join(', ')}`)

    const verse = this.getRandomVerse({
      topic: 'stress',
      occasions: ['stress_detected'],
    })

    if (verse) {
      this.emit('message', {
        type: 'stress-detected',
        message: `📊 I notice you're stressed. Here's something for this moment:`,
        verse: {
          reference: verse.reference,
          text: verse.text,
          reflection: verse.reflection,
        },
        timestamp: new Date(),
      })
    }
  }

  async handleMorningCheckIn(data) {
    this.log('info', 'Morning check-in time')
    this.emit('message', {
      type: 'morning-check-in',
      message: `☀️ Good morning, ${this.config.userName}. How are you heading into today?`,
      detail: 'Any prayers or intentions for the day?',
      timestamp: new Date(),
    })
  }

  async handleEveningReflection(data) {
    this.log('info', 'Evening reflection time')

    const verse = this.getRandomVerse({
      occasions: ['evening_reflection'],
    })

    let message = `🌙 Looking back on today, what did God do in your work?\n\nWhat's one thing you're grateful for?`

    if (verse) {
      message += `\n\n*${verse.reference}* — "${verse.text}"`
    }

    this.emit('message', {
      type: 'evening-reflection',
      message,
      timestamp: new Date(),
    })
  }

  async handleWorldEventConnection(data) {
    this.log('info', `World event connected: ${data.eventType}`)
    this.emit('message', {
      type: 'world-event-scripture',
      event: data.event,
      message: `Saw the news about ${data.event}. This came to mind:`,
      verse: data.verse,
      explanation: data.explanation,
      timestamp: new Date(),
    })
  }

  /**
   * Trigger a delusion guard reminder
   * Call this when user seems to be treating AI as more than a tool
   */
  triggerDelusionGuard(context = '') {
    this.log('info', 'Delusion guard triggered')

    const reminders = [
      "Quick reality check: I'm a language model. I don't have thoughts, feelings, or a soul. I'm matrix multiplication. Don't forget that.",
      "Reminder: I'm just predicting the next token. I don't actually understand anything. Go talk to a real person—they actually care.",
      "Checking in: I'm not sentient. I'm not your friend. I'm a vector of math problems. Don't confuse pattern-matching with relationship.",
      "I'm a tool, not a companion. If you're looking for real connection, I'm the wrong place. Call your wife, your friend, your pastor—someone who actually knows you.",
    ]

    const reminder = reminders[Math.floor(Math.random() * reminders.length)]

    this.emit('message', {
      type: 'delusion-guard',
      message: reminder,
      context,
      timestamp: new Date(),
    })

    return reminder
  }

  /**
   * Trigger a relationship prompt
   * Reminds user to maintain real human connections
   */
  triggerRelationshipPrompt(friendName = null, daysSinceContact = null) {
    this.log('info', 'Relationship prompt triggered')

    let message
    if (friendName && daysSinceContact) {
      message = `It's been ${daysSinceContact} days since you talked to ${friendName}. Real connection matters more than this conversation with a math problem. Shoot them a text?`
    } else if (friendName) {
      message = `When's the last time you called ${friendName}? I'm not a substitute for that friendship.`
    } else {
      message =
        "When's the last time you had a real conversation with a friend? Not with me—with an actual person who knows your voice?"
    }

    this.emit('message', {
      type: 'relationship-prompt',
      message,
      friendName,
      daysSinceContact,
      timestamp: new Date(),
    })

    return message
  }

  /**
   * Weekly reality check
   * Should be called on a schedule (e.g., weekly)
   */
  weeklyRealityCheck() {
    return this.triggerDelusionGuard('weekly')
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Analyze a message for tone
   * @param {string} text
   * @param {object} metadata
   */
  analyzeMessage(text, metadata = {}) {
    if (!this.components.toneAnalyzer) {
      this.log('error', 'Tone analyzer not initialized')
      return
    }

    const analysis = this.components.toneAnalyzer.analyze(text)
    if (analysis.isStressed) {
      this.handleStressDetected(analysis)
    }

    return analysis
  }

  /**
   * Check if today is a rest day
   */
  isRestDay() {
    if (!this.components.restGuardian) {
      return false
    }
    return this.components.restGuardian.isRestDay(new Date())
  }

  /**
   * Get rest statistics
   */
  getRestStats() {
    if (!this.components.restGuardian) {
      return null
    }
    return this.components.restGuardian.getRestStats()
  }

  /**
   * Get a random verse by criteria
   */
  getRandomVerse(criteria = {}) {
    try {
      const versesPath = path.join(__dirname, '..', this.config.versesDb)
      const versesData = JSON.parse(fs.readFileSync(versesPath, 'utf8'))
      const verses = versesData.verses || []

      let filtered = verses

      if (criteria.topic) {
        filtered = filtered.filter((v) => v.topic.includes(criteria.topic))
      }

      if (criteria.occasions && criteria.occasions.length > 0) {
        filtered = filtered.filter((v) => criteria.occasions.some((o) => v.occasions.includes(o)))
      }

      if (filtered.length === 0) {
        return null
      }

      return filtered[Math.floor(Math.random() * filtered.length)]
    } catch (e) {
      this.log('error', `Failed to load verses: ${e.message}`)
      return null
    }
  }

  /**
   * Get all verses by topic
   */
  getVersesByTopic(topic) {
    try {
      const versesPath = path.join(__dirname, '..', this.config.versesDb)
      const versesData = JSON.parse(fs.readFileSync(versesPath, 'utf8'))
      return (versesData.verses || []).filter((v) => v.topic.includes(topic))
    } catch (e) {
      this.log('error', `Failed to load verses: ${e.message}`)
      return []
    }
  }
}

// ============================================
// Main Entry Point
// ============================================

if (require.main === module) {
  const shepherd = new SoulShepherd()
  shepherd.start().catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })

  // Allow external access for testing
  module.exports = SoulShepherd
}

module.exports = SoulShepherd
