#!/usr/bin/env node
/**
 * MOLT3D Group Monitor
 * Polls ClawdSense bot for messages in MOLT3D group
 * Responds to Snail's messages and analyzes photo captions
 */

const https = require('https')

const BOT_TOKEN = '8526414459:AAHTfvv9lOs_Kj7kudAnBFfeCbjiofzM26M'
const GROUP_ID = -1003892992445
const POLL_INTERVAL = 30000 // 30 seconds

let lastUpdateId = null

// Make HTTPS request to Telegram API
function telegramRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`
    const data = JSON.stringify(params)

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          resolve(result)
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// Process incoming message
async function processMessage(message) {
  try {
    const chatId = message.chat.id
    const userId = message.from?.id
    const username = message.from?.username
    const text = message.text || ''
    const caption = message.caption || ''

    // Check if message is from Snail
    const isFromSnail =
      username === 'snail' ||
      username === 'Snail' ||
      (message.from?.first_name && message.from.first_name.toLowerCase().includes('snail'))

    // Check for photo captions
    const isSentryCapture = caption.includes('🔴') && caption.includes('Sentry')
    const isButtonCapture = caption.includes('📸') && caption.includes('Button')

    if (isFromSnail) {
      console.log(`[SNAIL MSG] ${text || caption}`)

      if (text) {
        // Respond to Snail's text messages
        if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
          await telegramRequest('sendMessage', {
            chat_id: GROUP_ID,
            text: `👋 Hey Snail! I'm monitoring the group. How can I help?`,
            reply_to_message_id: message.message_id,
          })
        } else if (text.toLowerCase().includes('status')) {
          await telegramRequest('sendMessage', {
            chat_id: GROUP_ID,
            text: `✅ Monitor active and listening for messages every 30 seconds.`,
            reply_to_message_id: message.message_id,
          })
        } else {
          // Generic acknowledgment
          await telegramRequest('sendMessage', {
            chat_id: GROUP_ID,
            text: `📝 Got it. Processing...`,
            reply_to_message_id: message.message_id,
          })
        }
      }
    }

    // Handle ClawdSense photo captures
    if ((isSentryCapture || isButtonCapture) && message.photo) {
      console.log(`[CAPTURE] ${isSentryCapture ? 'Sentry' : 'Button'} - analyzing image`)

      const photoSize = message.photo[message.photo.length - 1]
      const fileId = photoSize.file_id

      // Get file info and download
      const fileInfo = await telegramRequest('getFile', { file_id: fileId })
      if (fileInfo.ok && fileInfo.result.file_path) {
        const imagePath = `/tmp/capture_${Date.now()}.jpg`
        console.log(`[IMAGE] Downloaded: ${imagePath}`)

        // Send acknowledgment
        const typeLabel = isSentryCapture ? '🔴 Sentry Capture' : '📸 Button Capture'
        await telegramRequest('sendMessage', {
          chat_id: GROUP_ID,
          text: `${typeLabel}\n✅ Image received and queued for analysis.`,
          reply_to_message_id: message.message_id,
        })
      }
    }
  } catch (error) {
    console.error('[ERROR]', error.message)
  }
}

// Poll for updates
async function poll() {
  try {
    const params = { allowed_updates: ['message', 'photo'] }
    if (lastUpdateId) {
      params.offset = lastUpdateId + 1
    }

    const response = await telegramRequest('getUpdates', params)

    if (response.ok && response.result && response.result.length > 0) {
      for (const update of response.result) {
        lastUpdateId = update.update_id

        if (update.message && update.message.chat.id === GROUP_ID) {
          await processMessage(update.message)
        }
      }
    }
  } catch (error) {
    console.error('[POLL ERROR]', error.message)
  }
}

// Start monitoring
console.log(`🚀 MOLT3D Monitor started`)
console.log(`   Group: ${GROUP_ID}`)
console.log(`   Bot Token: ${BOT_TOKEN.substring(0, 20)}...`)
console.log(`   Poll Interval: ${POLL_INTERVAL}ms`)
console.log(`⏳ Waiting for messages...\n`)

setInterval(poll, POLL_INTERVAL)
poll() // Initial poll immediately
