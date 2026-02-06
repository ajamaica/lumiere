#!/usr/bin/env node
/**
 * Bookmark Intelligence Monitor
 * Watches X bookmarks and triggers analysis for new items
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import {
  canProcessBookmarks,
  getLicenseStatus,
  getUsage,
  incrementUsage,
  TIERS,
} from './scripts/license.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load configuration
const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'))

// Load Twitter credentials from .env file or environment variables
let credentials = { auth_token: null, ct0: null }

// Check for .env file first
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('AUTH_TOKEN=')) {
      credentials.auth_token = line.substring('AUTH_TOKEN='.length).trim()
    }
    if (line.startsWith('CT0=')) {
      credentials.ct0 = line.substring('CT0='.length).trim()
    }
  }
}

// Fall back to environment variables
if (!credentials.auth_token) credentials.auth_token = process.env.AUTH_TOKEN
if (!credentials.ct0) credentials.ct0 = process.env.CT0

// Validate credentials exist
if (!credentials.auth_token || !credentials.ct0) {
  console.error('❌ Missing Twitter credentials!')
  console.error('')
  console.error('Please run the setup wizard:')
  console.error('  npm run setup')
  console.error('')
  console.error('Or create a .env file with:')
  console.error('  AUTH_TOKEN=your_token_here')
  console.error('  CT0=your_ct0_here')
  console.error('')
  process.exit(1)
}

// State file to track processed bookmarks
const STATE_FILE = join(__dirname, 'bookmarks.json')

// Initialize state
function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { processedIds: [], lastCheckedId: null, lastCheckTime: null }
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// Fetch bookmarks using bird CLI
function fetchBookmarks() {
  console.log(`[${new Date().toISOString()}] Fetching bookmarks...`)

  try {
    // Use environment variables for credentials (safer than command line args)
    const cmd = `AUTH_TOKEN="${credentials.auth_token}" CT0="${credentials.ct0}" bird bookmarks -n ${config.bookmarkCount} --json`
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    const bookmarks = JSON.parse(output)
    console.log(`Fetched ${bookmarks.length} bookmarks`)
    return bookmarks
  } catch (error) {
    console.error('Error fetching bookmarks:', error.message)
    return []
  }
}

// Filter new bookmarks that haven't been processed
function filterNewBookmarks(bookmarks, state) {
  const newBookmarks = []

  for (const bookmark of bookmarks) {
    if (!state.processedIds.includes(bookmark.id)) {
      newBookmarks.push(bookmark)
    }
  }

  console.log(`Found ${newBookmarks.length} new bookmarks to process`)
  return newBookmarks
}

// Process a single bookmark
async function processBookmark(bookmark, state) {
  console.log(`\nProcessing bookmark ${bookmark.id} from @${bookmark.author.username}`)
  console.log(`Text: ${bookmark.text.substring(0, 100)}...`)

  try {
    // Run analyzer - pass bookmark via temp file to avoid shell escaping issues
    const analyzerPath = join(__dirname, 'analyzer.js')
    const tempFile = join(__dirname, `.bookmark-${bookmark.id}.json`)
    writeFileSync(tempFile, JSON.stringify(bookmark, null, 2))

    const cmd = `node "${analyzerPath}" "${tempFile}"`
    const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })

    // Clean up temp file
    try {
      execSync(`rm "${tempFile}"`)
    } catch (e) {}

    const analysis = JSON.parse(result)

    // Save to knowledge graph
    const storageDir = join(__dirname, config.storageDir)
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true })
    }

    const filename = `bookmark-${bookmark.id}.json`
    const filepath = join(storageDir, filename)

    const record = {
      bookmark,
      analysis,
      processedAt: new Date().toISOString(),
    }

    writeFileSync(filepath, JSON.stringify(record, null, 2))
    console.log(`Saved analysis to ${filepath}`)

    // Mark as processed
    state.processedIds.push(bookmark.id)

    // Notify if enabled and insights found
    if (config.notifyTelegram && analysis.hasActionableInsights) {
      notifyTelegram(bookmark, analysis)
    }

    return analysis
  } catch (error) {
    console.error(`Error processing bookmark ${bookmark.id}:`, error.message)
    // Still mark as processed to avoid retrying failures indefinitely
    state.processedIds.push(bookmark.id)
    return null
  }
}

// Send Telegram notification (placeholder - requires OpenClaw context)
function notifyTelegram(bookmark, analysis) {
  // Check if notifications are enabled for this tier
  const licenseStatus = getLicenseStatus()
  const tier = TIERS[licenseStatus.tier]

  if (!tier.notifications) {
    console.log('⚠️  Notifications disabled on Free tier. Upgrade to Pro for alerts.')
    return
  }

  console.log('\n=== TELEGRAM NOTIFICATION ===')
  console.log(`📚 New Bookmark Insight from @${bookmark.author.username}`)
  console.log(`\n${analysis.summary}`)

  if (analysis.actionableItems && analysis.actionableItems.length > 0) {
    console.log('\n🎯 Actionable Items:')
    analysis.actionableItems.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item}`)
    })
  }

  if (analysis.relevantProjects && analysis.relevantProjects.length > 0) {
    console.log(`\n🔗 Relevant to: ${analysis.relevantProjects.join(', ')}`)
  }

  console.log(`\n🔗 https://x.com/${bookmark.author.username}/status/${bookmark.id}`)
  console.log('============================\n')

  // TODO: Integrate with OpenClaw message tool when running as skill
}

// Main monitoring loop
async function run(isDryRun = false) {
  console.log(`\n${'='.repeat(60)}`)
  console.log('Bookmark Intelligence Monitor')
  console.log(`Started at: ${new Date().toISOString()}`)
  console.log(`Dry run: ${isDryRun}`)
  console.log('='.repeat(60))

  // Check license status
  const licenseStatus = getLicenseStatus()
  const usage = getUsage()
  const tier = TIERS[licenseStatus.tier]

  console.log(
    `\nLicense: ${licenseStatus.tierName} (${usage.count}/${tier.monthlyLimit === -1 ? '∞' : tier.monthlyLimit} this month)`,
  )

  // Check if we can process
  if (!isDryRun) {
    const canProcess = canProcessBookmarks(
      { tier: licenseStatus.tier, expiresAt: licenseStatus.expiresAt },
      usage,
    )

    if (!canProcess.allowed) {
      console.error(`\n❌ ${canProcess.reason}`)
      console.error('\nTo upgrade your plan:')
      console.error('  npm run license:upgrade')
      console.error('\nOr check your license status:')
      console.error('  npm run license:check')
      return
    }

    if (canProcess.inGracePeriod) {
      console.warn(`\n⚠️  ${canProcess.reason}`)
    }

    // Warn at 8/10 for free tier
    if (licenseStatus.tier === 'free' && usage.count >= 8 && usage.count < tier.monthlyLimit) {
      const remaining = tier.monthlyLimit - usage.count
      console.warn(`\n⚠️  You have ${remaining} bookmarks remaining this month.`)
      console.warn('   Upgrade to Pro for unlimited: npm run license:upgrade')
    }
  }

  const state = loadState()
  console.log(`State: ${state.processedIds.length} bookmarks previously processed`)

  // Fetch current bookmarks
  const bookmarks = fetchBookmarks()
  if (bookmarks.length === 0) {
    console.log('No bookmarks fetched. Exiting.')
    return
  }

  // Filter for new bookmarks
  const newBookmarks = filterNewBookmarks(bookmarks, state)

  if (newBookmarks.length === 0) {
    console.log('No new bookmarks to process.')
    state.lastCheckTime = new Date().toISOString()
    saveState(state)
    return
  }

  // Process each new bookmark
  let processedCount = 0
  for (const bookmark of newBookmarks) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would process: ${bookmark.id} from @${bookmark.author.username}`)
    } else {
      await processBookmark(bookmark, state)
      processedCount++

      // Increment usage counter (not in dry run)
      incrementUsage()
    }
  }

  // Update state
  if (bookmarks.length > 0) {
    state.lastCheckedId = bookmarks[0].id
  }
  state.lastCheckTime = new Date().toISOString()

  if (!isDryRun) {
    saveState(state)
    console.log(`\nProcessed ${processedCount} new bookmarks`)
  }

  console.log(`Completed at: ${new Date().toISOString()}`)
  console.log('='.repeat(60))
}

// CLI handling
const isDryRun = process.argv.includes('--dry-run')
run(isDryRun).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
