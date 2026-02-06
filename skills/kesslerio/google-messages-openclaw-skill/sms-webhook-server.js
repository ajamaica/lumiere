#!/usr/bin/env node
/**
 * Webhook server to receive SMS notifications from Google Messages
 * browser MutationObserver and forward to OpenClaw channels.
 *
 * Usage:
 *   node sms-webhook-server.js
 *
 * Environment variables:
 *   SMS_WEBHOOK_PORT        - Port to listen on (default: 19888)
 *   SMS_NOTIFICATION_TARGET - OpenClaw target (e.g., "telegram:123456789")
 *   SMS_NOTIFICATION_CHANNEL - Channel type (e.g., "telegram", "whatsapp")
 *
 * Or edit the constants below.
 */

const http = require('http')
const { execSync } = require('child_process')

// Configuration - edit these or use environment variables
const PORT = process.env.SMS_WEBHOOK_PORT || 19888
const NOTIFICATION_TARGET = process.env.SMS_NOTIFICATION_TARGET || '' // e.g., 'telegram:123456789'
const NOTIFICATION_CHANNEL = process.env.SMS_NOTIFICATION_CHANNEL || 'telegram'

// Rate limiting to prevent spam
const rateLimitMap = new Map()
const RATE_LIMIT_MS = 5000 // Minimum ms between notifications for same contact

function shouldNotify(contact) {
  const now = Date.now()
  const lastNotified = rateLimitMap.get(contact) || 0

  if (now - lastNotified < RATE_LIMIT_MS) {
    return false
  }

  rateLimitMap.set(contact, now)
  return true
}

function forwardToOpenClaw(data) {
  if (!NOTIFICATION_TARGET) {
    console.log('⚠️  No NOTIFICATION_TARGET configured, skipping forward')
    return
  }

  const msg = `📱 SMS from ${data.contact || 'Unknown'}: ${data.preview || data.message || '(no content)'}`

  try {
    const cmd = `openclaw message send -t "${NOTIFICATION_TARGET}" --channel ${NOTIFICATION_CHANNEL} -m "${msg.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
    execSync(cmd, { timeout: 15000, stdio: 'pipe' })
    console.log('✅ Forwarded to', NOTIFICATION_CHANNEL)
  } catch (e) {
    console.error('❌ Failed to forward:', e.message)
  }
}

const server = http.createServer((req, res) => {
  // CORS headers for browser fetch
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/sms-inbound') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        console.log('\n📱 New SMS:', JSON.stringify(data, null, 2))

        // Rate limit check
        if (!shouldNotify(data.contact)) {
          console.log('⏱️  Rate limited, skipping notification')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, rateLimited: true }))
          return
        }

        // Forward to OpenClaw
        forwardToOpenClaw(data)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        console.error('Parse error:', e)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
  } else if (req.method === 'GET' && req.url === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        port: PORT,
        notificationTarget: NOTIFICATION_TARGET ? '(configured)' : '(not set)',
        notificationChannel: NOTIFICATION_CHANNEL,
      }),
    )
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🎧 SMS webhook server listening on http://127.0.0.1:${PORT}`)
  console.log('')
  console.log('Endpoints:')
  console.log('  POST /sms-inbound  - Receive SMS notifications')
  console.log('  GET  /health       - Health check')
  console.log('  GET  /config       - Show configuration')
  console.log('')
  console.log('Configuration:')
  console.log(`  Target:  ${NOTIFICATION_TARGET || '(not set - notifications disabled)'}`)
  console.log(`  Channel: ${NOTIFICATION_CHANNEL}`)
  console.log('')
  if (!NOTIFICATION_TARGET) {
    console.log('⚠️  Set SMS_NOTIFICATION_TARGET environment variable to enable forwarding')
    console.log(
      '   Example: SMS_NOTIFICATION_TARGET="telegram:123456789" node sms-webhook-server.js',
    )
  }
})
