#!/usr/bin/env node

/**
 * ClawdSense Health Monitor
 * Keeps media receiver and analyzer running
 * Restarts if either dies
 */

const http = require('http')
const { spawn } = require('child_process')
const path = require('path')

const skillDir = path.join(process.env.HOME, 'clawd/clawdsense-skill')

let receiverProcess = null
let analyzerProcess = null

/**
 * Check if media receiver is alive
 */
function checkReceiver() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5555/health', { timeout: 2000 }, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
  })
}

/**
 * Start media receiver
 */
function startReceiver() {
  console.log(`📡 Starting media receiver...`)
  receiverProcess = spawn('node', [path.join(skillDir, 'scripts/media-receiver.js')])

  receiverProcess.on('error', (err) => {
    console.error(`❌ Receiver error: ${err.message}`)
  })

  receiverProcess.on('close', (code) => {
    console.warn(`⚠️ Receiver exited with code ${code}`)
    receiverProcess = null
  })
}

/**
 * Start analyzer
 */
function startAnalyzer() {
  console.log(`🤖 Starting analyzer...`)
  analyzerProcess = spawn('node', [path.join(skillDir, 'scripts/analyzer.js')])

  analyzerProcess.on('error', (err) => {
    console.error(`❌ Analyzer error: ${err.message}`)
  })

  analyzerProcess.on('close', (code) => {
    console.warn(`⚠️ Analyzer exited with code ${code}`)
    analyzerProcess = null
  })
}

/**
 * Monitor loop
 */
async function monitor() {
  console.log(`\n🏥 ClawdSense Health Monitor started\n`)

  setInterval(async () => {
    const receiverOk = await checkReceiver()

    if (!receiverOk && !receiverProcess) {
      startReceiver()
    }

    if (!analyzerProcess) {
      startAnalyzer()
    }

    const status = receiverOk ? '✅' : '❌'
    console.log(`${status} ${new Date().toISOString()}`)
  }, 30000) // Check every 30s
}

// Start services
startReceiver()
startAnalyzer()

// Begin monitoring
monitor()

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...')
  if (receiverProcess) receiverProcess.kill()
  if (analyzerProcess) analyzerProcess.kill()
  process.exit(0)
})
