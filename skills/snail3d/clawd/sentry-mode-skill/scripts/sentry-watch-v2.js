#!/usr/bin/env node

/**
 * Sentry Watch Mode V2
 * Advanced BOLO matching with strict attribute requirements
 *
 * Three reporting modes:
 * 1. "report-all" - Alert on any motion
 * 2. "report-suspicious" - Alert if vision detects something unusual
 * 3. "report-match" - Alert ONLY if exact BOLO match
 *
 * Matching types:
 * - person: "blonde girl with glasses" (all attributes required)
 * - vehicle: "blue sedan" or "license plate ABC123"
 * - text: "STOP" or "EXIT"
 * - object: "gun" or "weapon"
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class BoloMatcher {
  constructor(boloString, type = 'person') {
    this.originalText = boloString
    this.type = type
    this.requiredFeatures = []
    this.optionalFeatures = []

    this.parseDescription(boloString, type)
  }

  /**
   * Parse BOLO description into required/optional attributes
   */
  parseDescription(description, type) {
    const lower = description.toLowerCase()

    if (type === 'person') {
      // Extract colors
      const colors = ['blonde', 'blond', 'brown', 'red', 'black', 'dark', 'light']
      colors.forEach((color) => {
        if (lower.includes(color)) {
          this.requiredFeatures.push({ type: 'color', value: color })
        }
      })

      // Extract age/size descriptors
      const ageTerms = ['child', 'girl', 'boy', 'woman', 'man', 'young', 'old', 'tall', 'short']
      ageTerms.forEach((term) => {
        if (lower.includes(term)) {
          this.requiredFeatures.push({
            type: 'category',
            value: term,
          })
        }
      })

      // Extract clothing
      const clothing = ['shirt', 'pants', 'jacket', 'hat', 'dress', 'hoodie', 'jeans', 'coat']
      clothing.forEach((item) => {
        if (lower.includes(item)) {
          this.requiredFeatures.push({
            type: 'clothing',
            value: item,
          })
        }
      })

      // Extract accessories (stricter - must be present)
      const accessories = ['glasses', 'hat', 'scarf', 'gloves', 'backpack', 'bag']
      accessories.forEach((item) => {
        if (lower.includes(item)) {
          this.requiredFeatures.push({
            type: 'accessory',
            value: item,
          })
        }
      })

      // Extract facial features (strictest - must be verified)
      const facialFeatures = ['mole', 'scar', 'tattoo', 'beard', 'mustache', 'freckles']
      facialFeatures.forEach((feature) => {
        if (lower.includes(feature)) {
          this.requiredFeatures.push({
            type: 'facial',
            value: feature,
          })
        }
      })
    } else if (type === 'vehicle') {
      // Extract colors
      const colors = ['blue', 'red', 'black', 'white', 'silver', 'green']
      colors.forEach((color) => {
        if (lower.includes(color)) {
          this.requiredFeatures.push({ type: 'color', value: color })
        }
      })

      // Extract vehicle types
      const types = ['car', 'sedan', 'truck', 'van', 'motorcycle', 'suv']
      types.forEach((vtype) => {
        if (lower.includes(vtype)) {
          this.requiredFeatures.push({ type: 'vehicleType', value: vtype })
        }
      })

      // License plates (must match if specified)
      const lpMatch = description.match(/[A-Z0-9]{1,8}/)
      if (lpMatch) {
        this.requiredFeatures.push({
          type: 'licensePlate',
          value: lpMatch[0],
        })
      }
    } else if (type === 'text') {
      // Exact text match required
      this.requiredFeatures.push({ type: 'text', value: description })
    } else if (type === 'object') {
      // Object type required
      this.requiredFeatures.push({ type: 'object', value: description })
    }
  }

  /**
   * Check if vision analysis matches this BOLO
   */
  matches(visionAnalysis, confidenceThreshold = 0.8) {
    if (this.requiredFeatures.length === 0) {
      return { matched: true, confidence: 1.0, reason: 'No specific features required' }
    }

    const analysisLower = JSON.stringify(visionAnalysis).toLowerCase()
    let matchCount = 0
    const missingFeatures = []

    for (const feature of this.requiredFeatures) {
      const featureStr = feature.value.toLowerCase()

      // Check if analysis includes this feature
      if (analysisLower.includes(featureStr)) {
        matchCount++
      } else {
        missingFeatures.push(`${feature.type}:${feature.value}`)
      }
    }

    const matchRatio = matchCount / this.requiredFeatures.length
    const confidence = matchRatio
    const matched = matchRatio === 1.0 && confidence >= confidenceThreshold

    return {
      matched,
      confidence,
      matchCount,
      totalFeatures: this.requiredFeatures.length,
      missingFeatures,
      reason: matched
        ? `All ${this.requiredFeatures.length} features matched`
        : `Missing: ${missingFeatures.join(', ')}`,
    }
  }
}

class SentryWatchV2 {
  constructor(bolos = [], reportMode = 'report-match', options = {}) {
    this.bolos = bolos // Array of { description, type }
    this.reportMode = reportMode // 'report-all', 'report-suspicious', 'report-match'
    this.checkInterval = options.checkInterval || 2000
    this.motionThreshold = options.motionThreshold || 0.1
    this.alertCooldown = options.alertCooldown || 3 * 60 * 1000
    this.lastAlertTime = {}
    this.watching = false
    this.tempDir = path.join('/tmp', `sentry-watch-${Date.now()}`)
    this.previousFrame = null

    // Parse BOLOs
    this.parsedBolos = bolos.map((bolo) => {
      const type = this.detectBoloType(bolo.description)
      return {
        ...bolo,
        type,
        matcher: new BoloMatcher(bolo.description, type),
      }
    })
  }

  /**
   * Detect BOLO type from description
   */
  detectBoloType(description) {
    const lower = description.toLowerCase()

    if (
      lower.includes('car') ||
      lower.includes('vehicle') ||
      lower.includes('truck') ||
      lower.includes('sedan')
    ) {
      return 'vehicle'
    } else if (lower.includes('license plate') || /[A-Z0-9]{6,8}/.test(description)) {
      return 'vehicle' // License plate
    } else if (lower.includes('text') || lower.includes('sign')) {
      return 'text'
    } else if (lower.includes('gun') || lower.includes('weapon') || lower.includes('knife')) {
      return 'object'
    } else {
      return 'person' // Default
    }
  }

  /**
   * Start watching
   */
  async startWatching() {
    if (this.watching) {
      console.log('⚠️ Already watching')
      return
    }

    this.watching = true

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }

    console.log(`\n👀 SENTRY WATCH V2 ACTIVATED`)
    console.log(`📋 Report Mode: ${this.reportMode.toUpperCase()}`)
    console.log(`📌 Active BOLOs: ${this.parsedBolos.length}`)
    console.log(`⏱️ Check interval: ${this.checkInterval}ms`)
    console.log(`⏰ Alert cooldown: ${Math.round(this.alertCooldown / 1000)}s\n`)

    this.listBolos()

    console.log('🎥 Starting continuous monitoring...\n')
    this.monitorLoop()

    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping Sentry Watch...')
      this.stopWatching()
      process.exit(0)
    })
  }

  /**
   * List BOLOs with required features
   */
  listBolos() {
    console.log('📋 ACTIVE BOLOs:')
    console.log('─'.repeat(70))

    this.parsedBolos.forEach((bolo, idx) => {
      console.log(`\n${idx + 1}. ${bolo.description}`)
      console.log(`   Type: ${bolo.type}`)
      console.log(`   Required: ${bolo.matcher.requiredFeatures.length} features`)

      if (bolo.matcher.requiredFeatures.length > 0) {
        bolo.matcher.requiredFeatures.forEach((feat) => {
          console.log(`     • ${feat.type.toUpperCase()}: ${feat.value}`)
        })
      }
    })

    console.log('─'.repeat(70) + '\n')
  }

  /**
   * Main monitoring loop
   */
  async monitorLoop() {
    while (this.watching) {
      try {
        const frame = await this.captureFrame()
        if (!frame) {
          await this.sleep(this.checkInterval)
          continue
        }

        const motionScore = await this.detectMotion(frame)

        if (motionScore > this.motionThreshold) {
          console.log(`🎬 MOTION DETECTED (${(motionScore * 100).toFixed(1)}%)`)

          const analysis = await this.analyzeFrame(frame)

          // Handle based on report mode
          if (this.reportMode === 'report-all') {
            this.triggerGeneralAlert(frame, analysis)
          } else if (this.reportMode === 'report-suspicious') {
            this.checkForSuspicious(analysis, frame)
          } else if (this.reportMode === 'report-match') {
            this.checkBolos(analysis, frame)
          }
        }

        this.previousFrame = frame
      } catch (error) {
        console.error(`⚠️ Monitor loop error: ${error.message}`)
      }

      await this.sleep(this.checkInterval)
    }
  }

  /**
   * Capture frame
   */
  async captureFrame() {
    const frameFile = path.join(this.tempDir, `frame-${Date.now()}.jpg`)
    const command = `ffmpeg -f avfoundation -i "0" -frames:v 1 -y "${frameFile}" 2>/dev/null`

    try {
      execSync(command, { stdio: 'pipe' })
      return frameFile
    } catch {
      return null
    }
  }

  /**
   * Detect motion between frames
   */
  async detectMotion(currentFrame) {
    if (!this.previousFrame || !fs.existsSync(this.previousFrame)) {
      return 0
    }

    try {
      const prevSize = fs.statSync(this.previousFrame).size
      const currSize = fs.statSync(currentFrame).size
      const sizeDiff = Math.abs(prevSize - currSize) / Math.max(prevSize, currSize)
      return Math.min(sizeDiff, 0.5)
    } catch {
      return 0
    }
  }

  /**
   * Analyze frame with vision AI (simulated)
   */
  async analyzeFrame(frameFile) {
    // In production: call Claude vision API
    return {
      frameFile,
      timestamp: new Date().toISOString(),
      detected: {
        people: 1,
        descriptions: ['Person with dark hair and glasses'],
        confidence: 0.85,
        features: {
          hairColor: 'dark',
          accessories: ['glasses'],
          clothing: 'dark jacket',
        },
      },
    }
  }

  /**
   * Report-all mode: Alert on any motion
   */
  triggerGeneralAlert(frame, analysis) {
    console.log(`\n🚨 MOTION ALERT (report-all mode)`)
    console.log(`⏰ Time: ${new Date().toLocaleString()}`)
    console.log(`📸 Frame: ${path.basename(frame)}\n`)
  }

  /**
   * Report-suspicious mode: Alert on unusual activity
   */
  checkForSuspicious(analysis, frame) {
    const suspiciousKeywords = [
      'weapon',
      'gun',
      'knife',
      'running',
      'falling',
      'struggling',
      'breaking',
      'forced entry',
    ]

    const analysisStr = JSON.stringify(analysis).toLowerCase()
    const isSuspicious = suspiciousKeywords.some((keyword) => analysisStr.includes(keyword))

    if (isSuspicious) {
      console.log(`\n⚠️ SUSPICIOUS ACTIVITY DETECTED`)
      console.log(`⏰ Time: ${new Date().toLocaleString()}`)
      console.log(`📸 Frame: ${path.basename(frame)}`)
      console.log(`🔍 Analysis: ${JSON.stringify(analysis.detected, null, 2)}\n`)
    }
  }

  /**
   * Report-match mode: Alert ONLY on BOLO match
   */
  checkBolos(analysis, frame) {
    const now = Date.now()

    for (const bolo of this.parsedBolos) {
      // Check cooldown
      const timeSinceLastAlert = now - (this.lastAlertTime[bolo.description] || 0)
      if (timeSinceLastAlert < this.alertCooldown) {
        continue
      }

      // Check match
      const matchResult = bolo.matcher.matches(analysis.detected, 0.8)

      if (matchResult.matched) {
        this.triggerBoloAlert(bolo, analysis, frame, matchResult)
      } else if (matchResult.matchCount > 0) {
        // Partial match - log for debugging
        console.log(`⚠️ Partial match for "${bolo.description}": ${matchResult.reason}`)
      }
    }
  }

  /**
   * Trigger BOLO alert
   */
  triggerBoloAlert(bolo, analysis, frame, matchResult) {
    const timestamp = new Date().toLocaleString()

    console.log('\n' + '!'.repeat(70))
    console.log('🚨 BOLO MATCH!')
    console.log('!'.repeat(70))
    console.log(`\n📌 BOLO: ${bolo.description}`)
    console.log(`🔍 Type: ${bolo.type}`)
    console.log(`⏰ Time: ${timestamp}`)
    console.log(`📸 Frame: ${path.basename(frame)}`)
    console.log(
      `\n✓ Match Result: ${matchResult.matchCount}/${matchResult.totalFeatures} features matched`,
    )
    console.log(`✓ Confidence: ${(matchResult.confidence * 100).toFixed(1)}%`)
    console.log(`✓ Required all: ${bolo.matcher.requiredFeatures.map((f) => f.value).join(', ')}`)
    console.log(`\n👤 Detected: ${JSON.stringify(analysis.detected, null, 2)}`)
    console.log('\n' + '!'.repeat(70) + '\n')

    // Update last alert time
    this.lastAlertTime[bolo.description] = now
  }

  /**
   * Stop watching
   */
  stopWatching() {
    this.watching = false
    this.cleanup()

    console.log('\n📊 WATCH SESSION SUMMARY:')
    console.log('─'.repeat(70))
    this.parsedBolos.forEach((bolo, idx) => {
      console.log(`${idx + 1}. ${bolo.description} (${bolo.type})`)
    })
    console.log('─'.repeat(70) + '\n')
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      try {
        execSync(`rm -rf "${this.tempDir}"`)
      } catch (error) {
        // Ignore
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
    console.log(`Usage: sentry-watch-v2.js [command] [options]`)
    console.log(`\nCommands:`)
    console.log(`  report-all               Alert on ANY motion`)
    console.log(`  report-suspicious        Alert on suspicious activity`)
    console.log(`  report-match             Alert ONLY on exact BOLO match\n`)
    console.log(`Options:`)
    console.log(`  --cooldown <seconds>     Alert cooldown (default: 180)`)
    console.log(`  --interval <ms>          Check interval (default: 2000)`)
    console.log(`  --threshold <decimal>    Motion threshold (default: 0.1)\n`)
    console.log(`Examples:`)
    console.log(`  node sentry-watch-v2.js report-match --cooldown 60`)
    console.log(`  node sentry-watch-v2.js report-all --cooldown 30`)
    console.log(`  node sentry-watch-v2.js report-suspicious --cooldown 120`)
    process.exit(1)
  }

  const mode = args[0]
  const validModes = ['report-all', 'report-suspicious', 'report-match']

  if (!validModes.includes(mode)) {
    console.error(`❌ Invalid mode: ${mode}`)
    console.error(`Valid modes: ${validModes.join(', ')}`)
    process.exit(1)
  }

  // Parse options
  const options = {}
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--cooldown' && i + 1 < args.length) {
      options.alertCooldown = parseInt(args[i + 1]) * 1000
      i++
    } else if (args[i] === '--interval' && i + 1 < args.length) {
      options.checkInterval = parseInt(args[i + 1])
      i++
    } else if (args[i] === '--threshold' && i + 1 < args.length) {
      options.motionThreshold = parseFloat(args[i + 1])
      i++
    }
  }

  const bolos =
    mode === 'report-match'
      ? [
          {
            description: 'blonde girl with glasses',
            type: 'person',
          },
          {
            description: 'man with black hat',
            type: 'person',
          },
        ]
      : []

  const watch = new SentryWatchV2(bolos, mode, options)
  await watch.startWatching()
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`)
  process.exit(1)
})

module.exports = { SentryWatchV2, BoloMatcher }
