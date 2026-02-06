#!/usr/bin/env node

/**
 * Overwatch Check-In Script
 *
 * Runs periodic check-ins from Overwatch monitoring:
 * 1. Captures a snapshot
 * 2. Analyzes with Groq Vision
 * 3. Selects a random GIF reaction
 * 4. Sends alert to Telegram
 *
 * Usage: node overwatch-checkin.js [--interval 900000]
 */

const fs = require('fs')
const path = require('path')
const { execSync, spawn } = require('child_process')
const axios = require('axios')

// Config
const GROQ_API_KEY = process.env.GROQ_API_KEY
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const CHECK_IN_INTERVAL = parseInt(process.env.CHECK_IN_INTERVAL) || 900000 // 15 min default
const MEDIA_DIR = path.join(process.env.HOME, '.clawdbot/overwatch')

// Ensure directories exist
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
}

// Random GIF queries for check-ins
const GIF_QUERIES = [
  'spy camera',
  'watching you',
  'got you on camera',
  'surveillance',
  'monitoring',
  'eyes watching',
  'caught on camera',
  'camera man',
  'checkup',
  'status check',
]

/**
 * Capture image using the capture.sh script
 */
async function captureImage() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = path.join(MEDIA_DIR, `checkin_${timestamp}.jpg`)

    execSync(`./scripts/capture.sh -o "${outputPath}"`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    })

    if (fs.existsSync(outputPath)) {
      console.log(`✅ Captured: ${outputPath}`)
      return outputPath
    }
  } catch (err) {
    console.error('❌ Capture failed:', err.message)
  }
  return null
}

/**
 * Analyze image with Groq Vision API
 */
async function analyzeImage(imagePath) {
  if (!GROQ_API_KEY || !fs.existsSync(imagePath)) {
    return '📸 Snapshot captured (analysis unavailable)'
  }

  try {
    const imageData = fs.readFileSync(imagePath)
    const base64 = imageData.toString('base64')

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'grok-vision-latest',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Briefly describe what you see in this image. Keep it to 1-2 sentences.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    )

    const analysis = response.data.choices[0].message.content
    console.log(`✅ Analysis: ${analysis}`)
    return analysis
  } catch (err) {
    console.error('⚠️ Analysis failed:', err.message)
    return '📸 Snapshot captured'
  }
}

/**
 * Get random GIF using gifgrep
 */
async function getRandomGif() {
  try {
    const query = GIF_QUERIES[Math.floor(Math.random() * GIF_QUERIES.length)]
    const result = execSync(`gifgrep "${query}" --max 1 --format url`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    if (result && result.startsWith('http')) {
      console.log(`✅ GIF: ${result}`)
      return result
    }
  } catch (err) {
    console.error('⚠️ GIF fetch failed:', err.message)
  }
  return null
}

/**
 * Send Telegram alert with image and analysis
 */
async function sendTelegramAlert(imagePath, analysis, gifUrl) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('⚠️ Telegram not configured, skipping alert')
    return
  }

  try {
    // Send image with caption
    const imageBuffer = fs.readFileSync(imagePath)
    const formData = new FormData()
    formData.append('chat_id', TELEGRAM_CHAT_ID)
    formData.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), 'snapshot.jpg')
    formData.append('caption', `🕵️ **Overwatch Check-In**\n\n${analysis}`)
    formData.append('parse_mode', 'Markdown')

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
      formData,
      { headers: formData.getHeaders() },
    )

    console.log(`✅ Photo sent to Telegram (${response.data.result.message_id})`)

    // Send GIF separately
    if (gifUrl) {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendAnimation`, {
        chat_id: TELEGRAM_CHAT_ID,
        animation: gifUrl,
      })
      console.log(`✅ GIF sent to Telegram`)
    }
  } catch (err) {
    console.error('❌ Telegram alert failed:', err.message)
  }
}

/**
 * Main check-in loop
 */
async function runCheckIn() {
  console.log(`\n📹 Overwatch Check-In at ${new Date().toISOString()}`)

  try {
    const imagePath = await captureImage()
    if (!imagePath) return

    const analysis = await analyzeImage(imagePath)
    const gifUrl = await getRandomGif()

    await sendTelegramAlert(imagePath, analysis, gifUrl)

    console.log(`✅ Check-in complete\n`)
  } catch (err) {
    console.error(`❌ Check-in error: ${err.message}\n`)
  }
}

/**
 * Start periodic check-ins
 */
async function startPeriodicCheckIns() {
  console.log(`🎬 Starting Overwatch Check-In daemon (interval: ${CHECK_IN_INTERVAL}ms)`)

  // Run immediately
  await runCheckIn()

  // Then periodically
  setInterval(async () => {
    await runCheckIn()
  }, CHECK_IN_INTERVAL)
}

// Run
if (require.main === module) {
  startPeriodicCheckIns().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}

module.exports = { captureImage, analyzeImage, getRandomGif, sendTelegramAlert }
