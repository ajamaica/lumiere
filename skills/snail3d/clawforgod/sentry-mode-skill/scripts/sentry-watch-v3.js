#!/usr/bin/env node

/**
 * Sentry Watch V3
 * Image-based BOLO matching
 * Upload reference image → extract features → match against detections
 */

const fs = require('fs')
const path = require('path')

class ImageBasedBoloMatcher {
  constructor(boloJsonPath) {
    this.boloPath = boloJsonPath
    this.bolo = JSON.parse(fs.readFileSync(boloJsonPath, 'utf8'))
  }

  /**
   * Match detection against image BOLO
   */
  matches(visionAnalysis) {
    let criticalMatches = 0
    let highMatches = 0
    let mediumMatches = 0
    let lowMatches = 0

    const missingCritical = []
    const analysisStr = JSON.stringify(visionAnalysis).toLowerCase()

    // Check critical features (MUST ALL MATCH)
    for (const feature of this.bolo.features.critical) {
      if (this.featurePresent(analysisStr, feature)) {
        criticalMatches++
      } else {
        missingCritical.push(feature.description)
      }
    }

    // Check high priority features
    for (const feature of this.bolo.features.high) {
      if (this.featurePresent(analysisStr, feature)) {
        highMatches++
      }
    }

    // Check medium and low
    for (const feature of this.bolo.features.medium) {
      if (this.featurePresent(analysisStr, feature)) {
        mediumMatches++
      }
    }

    for (const feature of this.bolo.features.low) {
      if (this.featurePresent(analysisStr, feature)) {
        lowMatches++
      }
    }

    // Calculate confidence
    const criticalRatio =
      this.bolo.features.critical.length > 0
        ? criticalMatches / this.bolo.features.critical.length
        : 1

    const highRatio =
      this.bolo.features.high.length > 0 ? highMatches / this.bolo.features.high.length : 0.5

    const mediumRatio =
      this.bolo.features.medium.length > 0 ? mediumMatches / this.bolo.features.medium.length : 0.5

    // Weighted confidence
    const confidence = criticalRatio * 0.6 + highRatio * 0.3 + mediumRatio * 0.1

    const matched = criticalRatio === 1.0 && confidence >= this.bolo.rubric.confidence_required

    return {
      matched,
      confidence,
      criticalMatches,
      criticalTotal: this.bolo.features.critical.length,
      missingCritical,
      highMatches,
      highTotal: this.bolo.features.high.length,
      reason: matched
        ? `All critical features matched (${criticalMatches}/${this.bolo.features.critical.length})`
        : `Missing critical: ${missingCritical.join(', ')}`,
    }
  }

  /**
   * Check if feature is present in analysis
   */
  featurePresent(analysisStr, feature) {
    const desc = feature.description.toLowerCase()
    // Simple keyword matching - in production would use semantic similarity
    return analysisStr.includes(desc)
  }
}

class SentryWatchV3 {
  constructor(boloJsonPath, options = {}) {
    this.boloPath = boloJsonPath
    this.bolo = JSON.parse(fs.readFileSync(boloJsonPath, 'utf8'))
    this.matcher = new ImageBasedBoloMatcher(boloJsonPath)

    this.checkInterval = options.checkInterval || 2000
    this.motionThreshold = options.motionThreshold || 0.1
    this.alertCooldown = options.alertCooldown || 3 * 60 * 1000
    this.lastAlertTime = null
    this.watching = false
  }

  /**
   * Start watching with image BOLO
   */
  async startWatching() {
    this.watching = true

    console.log(`\n👀 SENTRY WATCH V3 - IMAGE BOLO`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📌 BOLO: ${this.bolo.name}`)
    console.log(`🏷️ Type: ${this.bolo.type}`)
    console.log(`📸 Reference image: ${path.basename(this.bolo.imagePath)}`)
    console.log(`\n🔍 CRITICAL FEATURES (Must all match):`)

    this.bolo.features.critical.forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.description}`)
      console.log(`     └─ ${f.details}`)
    })

    console.log(`\n📊 HIGH PRIORITY (Should match):`)
    this.bolo.features.high.forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.description}`)
    })

    console.log(`\n⏱️ Alert cooldown: ${Math.round(this.alertCooldown / 1000)}s`)
    console.log(
      `🎯 Confidence required: ${(this.bolo.rubric.confidence_required * 100).toFixed(0)}%`,
    )
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`\n🎥 Starting monitoring...\n`)

    // In production: start actual monitoring loop
    // For now: show how it would work
    this.demonstrateMatching()

    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping...')
      this.stopWatching()
      process.exit(0)
    })
  }

  /**
   * Demonstrate matching
   */
  demonstrateMatching() {
    console.log(`Example detection analysis:\n`)

    // Create mock detection that matches
    const matchingAnalysis = {
      people: 1,
      descriptions: [this.bolo.analysis?.faceFeatures?.description || 'Matching person'],
      features: this.bolo.analysis,
      confidence: 0.9,
    }

    const result = this.matcher.matches(matchingAnalysis)

    if (result.matched) {
      console.log(`✅ MATCH FOUND!\n`)
      this.triggerAlert(result)
    } else {
      console.log(`⚠️ No match (${(result.confidence * 100).toFixed(0)}% confidence)`)
      console.log(`   Missing: ${result.missingCritical.join(', ')}\n`)
    }
  }

  /**
   * Trigger alert on match
   */
  triggerAlert(matchResult) {
    console.log('!'.repeat(70))
    console.log('🚨 IMAGE BOLO MATCH!')
    console.log('!'.repeat(70))
    console.log(`\n📌 BOLO: ${this.bolo.name}`)
    console.log(`⏰ Time: ${new Date().toLocaleString()}`)
    console.log(`\n✓ CRITICAL MATCH: ${matchResult.criticalMatches}/${matchResult.criticalTotal}`)
    console.log(`✓ HIGH PRIORITY: ${matchResult.highMatches}/${matchResult.highTotal}`)
    console.log(`✓ Overall confidence: ${(matchResult.confidence * 100).toFixed(1)}%`)
    console.log(`\n🔍 Detection matches:`)

    this.bolo.features.critical.forEach((f) => {
      console.log(`  ✓ ${f.description}`)
    })

    console.log('\n' + '!'.repeat(70) + '\n')

    this.lastAlertTime = Date.now()
  }

  /**
   * Stop watching
   */
  stopWatching() {
    this.watching = false
    console.log('Watch session ended.\n')
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`Usage: sentry-watch-v3.js report-match --bolo <path/to/bolo.json> [options]`)
    console.log(`\nOptions:`)
    console.log(`  --cooldown <seconds>     Alert cooldown (default: 180)`)
    console.log(`  --interval <ms>          Check interval (default: 2000)`)
    console.log(`\nExamples:`)
    console.log(`  node sentry-watch-v3.js report-match --bolo sarah-bolo.json`)
    console.log(`  node sentry-watch-v3.js report-match --bolo car-bolo.json --cooldown 60`)
    process.exit(1)
  }

  if (args[0] !== 'report-match') {
    console.error(`❌ Only report-match mode supported for image BOLOs`)
    process.exit(1)
  }

  // Parse options
  let boloPath = null
  const options = {}

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--bolo' && i + 1 < args.length) {
      boloPath = args[i + 1]
      i++
    } else if (args[i] === '--cooldown' && i + 1 < args.length) {
      options.alertCooldown = parseInt(args[i + 1]) * 1000
      i++
    } else if (args[i] === '--interval' && i + 1 < args.length) {
      options.checkInterval = parseInt(args[i + 1])
      i++
    }
  }

  if (!boloPath) {
    console.error(`❌ --bolo path is required`)
    process.exit(1)
  }

  if (!fs.existsSync(boloPath)) {
    console.error(`❌ BOLO file not found: ${boloPath}`)
    process.exit(1)
  }

  try {
    const watch = new SentryWatchV3(boloPath, options)
    await watch.startWatching()
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()

module.exports = { SentryWatchV3, ImageBasedBoloMatcher }
