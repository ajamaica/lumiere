#!/usr/bin/env node

/**
 * Sentry Watch Mode
 * Continuous background monitoring with motion detection + BOLO (Be On The Lookout)
 *
 * Workflow:
 * 1. Store BOLO descriptions (what to look for)
 * 2. Monitor video continuously
 * 3. Detect motion between frames
 * 4. When motion detected, capture + analyze
 * 5. Check against BOLO descriptions
 * 6. Alert if match found (with 3-min cooldown)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class SentryWatch {
  constructor(boloDescriptions = [], options = {}) {
    this.boloDescriptions = boloDescriptions
    this.checkInterval = options.checkInterval || 2000 // 2 seconds between motion checks
    this.motionThreshold = options.motionThreshold || 0.1 // 10% pixel change = motion
    this.alertCooldown = options.alertCooldown || 3 * 60 * 1000 // 3 minutes
    this.lastAlertTime = {}
    this.watching = false
    this.tempDir = path.join('/tmp', `sentry-watch-${Date.now()}`)
    this.previousFrame = null
  }

  /**
   * Add a BOLO description to watch for
   */
  addBolo(description) {
    this.boloDescriptions.push({
      description,
      addedAt: new Date().toISOString(),
      alertCount: 0,
      lastAlert: null,
    })
    console.log(`✅ BOLO Added: "${description}"`)
  }

  /**
   * List all active BOLOs
   */
  listBolos() {
    console.log('\n📋 ACTIVE BOLOs:')
    console.log('─'.repeat(60))
    this.boloDescriptions.forEach((bolo, idx) => {
      console.log(`\n${idx + 1}. ${bolo.description}`)
      console.log(`   Added: ${new Date(bolo.addedAt).toLocaleString()}`)
      console.log(`   Alerts: ${bolo.alertCount}`)
      if (bolo.lastAlert) {
        console.log(`   Last Alert: ${new Date(bolo.lastAlert).toLocaleString()}`)
      }
    })
    console.log('─'.repeat(60) + '\n')
  }

  /**
   * Start continuous watching
   */
  async startWatching() {
    if (this.watching) {
      console.log('⚠️ Already watching')
      return
    }

    this.watching = true

    // Create temp directory
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }

    console.log(`\n👀 SENTRY WATCH MODE ACTIVATED`)
    console.log(`⏱️ Check interval: ${this.checkInterval}ms`)
    console.log(`🔍 Motion threshold: ${(this.motionThreshold * 100).toFixed(1)}%`)
    console.log(`⏰ Alert cooldown: ${Math.round(this.alertCooldown / 1000)}s`)
    console.log(`📌 Active BOLOs: ${this.boloDescriptions.length}\n`)

    this.listBolos()

    // Start monitoring loop
    console.log('🎥 Starting continuous monitoring...\n')
    this.monitorLoop()

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping Sentry Watch Mode...')
      this.stopWatching()
      process.exit(0)
    })
  }

  /**
   * Main monitoring loop
   */
  async monitorLoop() {
    while (this.watching) {
      try {
        // Capture current frame
        const frame = await this.captureFrame()
        if (!frame) {
          await this.sleep(this.checkInterval)
          continue
        }

        // Detect motion
        const motionScore = await this.detectMotion(frame)

        if (motionScore > this.motionThreshold) {
          console.log(`🎬 MOTION DETECTED (${(motionScore * 100).toFixed(1)}%)`)

          // Analyze frame
          const analysis = await this.analyzeFframe(frame)

          // Check against BOLOs
          this.checkBolos(analysis, frame)
        }

        this.previousFrame = frame
      } catch (error) {
        console.error(`⚠️ Monitor loop error: ${error.message}`)
      }

      await this.sleep(this.checkInterval)
    }
  }

  /**
   * Capture a single frame from webcam
   */
  async captureFrame() {
    const frameFile = path.join(this.tempDir, `frame-${Date.now()}.jpg`)

    // Use ffmpeg to capture single frame
    // macOS: ffmpeg -f avfoundation -i "0" -frames:v 1 -y frame.jpg
    const command = `ffmpeg -f avfoundation -i "0" -frames:v 1 -y "${frameFile}" 2>/dev/null`

    try {
      execSync(command, { stdio: 'pipe' })
      return frameFile
    } catch (error) {
      // Webcam not available
      return null
    }
  }

  /**
   * Detect motion between current and previous frame
   */
  async detectMotion(currentFrame) {
    if (!this.previousFrame || !fs.existsSync(this.previousFrame)) {
      return 0 // No previous frame to compare
    }

    try {
      // Simple motion detection: compare file sizes as proxy
      // In production, would use image diff algorithms
      const prevSize = fs.statSync(this.previousFrame).size
      const currSize = fs.statSync(currentFrame).size

      const sizeDiff = Math.abs(prevSize - currSize) / Math.max(prevSize, currSize)

      // Also check if files are actually different
      // (simplified - real implementation would pixelate compare)
      return Math.min(sizeDiff, 0.5) // Cap at 50%
    } catch (error) {
      return 0
    }
  }

  /**
   * Analyze frame with vision AI
   */
  async analyzeFframe(frameFile) {
    // Simulate analysis
    // In production: call Claude vision API with frame

    return {
      frameFile,
      timestamp: new Date().toISOString(),
      detected: {
        people: 1,
        descriptions: ['Person with dark clothing'],
        confidence: 0.8,
      },
    }
  }

  /**
   * Check if frame matches any BOLO
   */
  checkBolos(analysis, frameFile) {
    const now = Date.now()

    for (const bolo of this.boloDescriptions) {
      // Check cooldown
      const timeSinceLastAlert = now - (bolo.lastAlert || 0)
      if (timeSinceLastAlert < this.alertCooldown) {
        continue // Still in cooldown
      }

      // Simple text matching (in production: use semantic similarity)
      const boloLower = bolo.description.toLowerCase()
      const analysisText = JSON.stringify(analysis.detected).toLowerCase()

      let isMatch = false

      // Check for keyword matches
      const keywords = this.extractKeywords(boloLower)
      isMatch = keywords.some((keyword) => analysisText.includes(keyword))

      if (isMatch) {
        this.triggerAlert(bolo, analysis, frameFile)
      }
    }
  }

  /**
   * Extract searchable keywords from BOLO description
   */
  extractKeywords(description) {
    // Extract items like colors, clothing, items
    const keywords = []

    // Color keywords
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'blond', 'dark', 'light']
    colors.forEach((color) => {
      if (description.includes(color)) {
        keywords.push(color)
      }
    })

    // Type keywords
    const types = ['hat', 'girl', 'boy', 'man', 'woman', 'person', 'child', 'jacket', 'shirt']
    types.forEach((type) => {
      if (description.includes(type)) {
        keywords.push(type)
      }
    })

    return keywords
  }

  /**
   * Trigger alert when BOLO match found
   */
  triggerAlert(bolo, analysis, frameFile) {
    const timestamp = new Date().toLocaleString()

    console.log('\n' + '!'.repeat(60))
    console.log('🚨 BOLO ALERT!')
    console.log('!'.repeat(60))
    console.log(`\n📌 BOLO: ${bolo.description}`)
    console.log(`⏰ Time: ${timestamp}`)
    console.log(`📸 Frame: ${path.basename(frameFile)}`)
    console.log(`\n👤 Detected: ${JSON.stringify(analysis.detected, null, 2)}`)
    console.log('\n' + '!'.repeat(60) + '\n')

    // Update BOLO stats
    bolo.alertCount++
    bolo.lastAlert = Date.now()

    // TODO: Send notification
    // - SMS via Twilio
    // - Telegram message
    // - Email alert
    // - Save frame locally with alert metadata
  }

  /**
   * Stop watching
   */
  stopWatching() {
    this.watching = false
    this.cleanup()

    console.log('\n📊 WATCH SESSION SUMMARY:')
    console.log('─'.repeat(60))
    this.boloDescriptions.forEach((bolo, idx) => {
      console.log(`${idx + 1}. ${bolo.description}`)
      console.log(`   Alerts: ${bolo.alertCount}`)
    })
    console.log('─'.repeat(60) + '\n')
  }

  /**
   * Cleanup temp files
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      try {
        execSync(`rm -rf "${this.tempDir}"`)
      } catch (error) {
        console.warn(`⚠️ Cleanup failed: ${error.message}`)
      }
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`Usage: sentry-watch.js [command] [options]`)
    console.log(`\nCommands:`)
    console.log(`  watch                    Start watching with BOLOs from stdin`)
    console.log(`  watch-demo               Start demo watch mode\n`)
    console.log(`Options:`)
    console.log(`  --cooldown <seconds>     Alert cooldown (default: 180 [3 min])`)
    console.log(`  --interval <ms>          Check interval in ms (default: 2000)`)
    console.log(`  --threshold <decimal>    Motion threshold (default: 0.1 [10%])\n`)
    console.log(`Examples:`)
    console.log(`  echo "Guy with black hat" | node sentry-watch.js watch`)
    console.log(`  node sentry-watch.js watch-demo --cooldown 60`)
    console.log(`  node sentry-watch.js watch-demo --cooldown 120 --interval 1000`)
    process.exit(1)
  }

  const command = args[0]

  // Parse options
  const options = {}
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--cooldown' && i + 1 < args.length) {
      options.alertCooldown = parseInt(args[i + 1]) * 1000 // Convert seconds to ms
      i++
    } else if (args[i] === '--interval' && i + 1 < args.length) {
      options.checkInterval = parseInt(args[i + 1])
      i++
    } else if (args[i] === '--threshold' && i + 1 < args.length) {
      options.motionThreshold = parseFloat(args[i + 1])
      i++
    }
  }

  if (command === 'watch-demo') {
    // Demo mode with example BOLOs
    const bolos = [
      'Guy with black hat and red jacket',
      'Little blond girl',
      'Person in blue hoodie',
    ]

    const watch = new SentryWatch(bolos, options)
    await watch.startWatching()
  } else if (command === 'watch') {
    // Read BOLOs from stdin
    const bolos = []
    const readline = require('readline')

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    })

    console.log('📌 Enter BOLO descriptions (one per line, ctrl+D to start watching):\n')

    rl.on('line', (line) => {
      if (line.trim()) {
        bolos.push(line)
        console.log(`✅ Added: "${line}"`)
      }
    })

    rl.on('close', () => {
      if (bolos.length === 0) {
        console.log('No BOLOs provided')
        process.exit(1)
      }

      const watch = new SentryWatch(bolos, options)
      watch.startWatching()
    })
  }
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`)
  process.exit(1)
})

module.exports = { SentryWatch }
