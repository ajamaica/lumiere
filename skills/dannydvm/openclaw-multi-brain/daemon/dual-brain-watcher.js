#!/usr/bin/env node
/**
 * Dual-Brain Watcher
 *
 * Runs as a background daemon. Watches for new Danny messages across all sessions.
 * When detected, immediately calls Kimi for a second perspective and writes it
 * to a well-known file that agents read before responding.
 *
 * Uses byte-offset tracking so it NEVER re-reads old data from large JSONL files.
 * Only reads bytes appended since the last poll.
 *
 * Usage:
 *   node dual-brain-watcher.js          # run once (for cron)
 *   node dual-brain-watcher.js --daemon  # run continuously
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const KIMI_API_KEY = (() => {
  try {
    return fs.readFileSync('/Users/chadix/clawd/.kimi-api-key', 'utf-8').trim()
  } catch {
    return ''
  }
})()
const KIMI_API_URL = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'kimi-k2.5'
const STATE_FILE = path.join(process.env.HOME, '.engram', 'dual-brain-state.json')
const PERSPECTIVE_DIR = path.join(process.env.HOME, '.engram', 'perspectives')
const DANNY_IDS = ['484751136184598548']
const DAEMON_MODE = process.argv.includes('--daemon')
const POLL_INTERVAL = 10000
const SKIP_RE = /HEARTBEAT|HEARTBEAT_OK|NO_REPLY|ANNOUNCE_SKIP|\[system\]|GatewayRestart/i

fs.mkdirSync(PERSPECTIVE_DIR, { recursive: true })

// ── State management ──

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  } catch {}
  return { lastProcessed: {}, offsets: {} }
}

function saveState(state) {
  // Ensure offsets field exists
  if (!state.offsets) state.offsets = {}
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// ── Read only NEW bytes from a file ──

function readNewBytes(filePath, lastOffset) {
  let stat
  try {
    stat = fs.statSync(filePath)
  } catch {
    return { lines: [], newOffset: lastOffset }
  }

  const fileSize = stat.size
  if (fileSize <= lastOffset) return { lines: [], newOffset: lastOffset }

  // Read only from lastOffset to end of file
  const bufSize = fileSize - lastOffset
  const buf = Buffer.alloc(bufSize)
  const fd = fs.openSync(filePath, 'r')
  try {
    fs.readSync(fd, buf, 0, bufSize, lastOffset)
  } finally {
    fs.closeSync(fd)
  }

  const chunk = buf.toString('utf-8')
  const rawLines = chunk.split('\n')

  // If the last char isn't a newline, the last "line" is incomplete — don't process it yet
  const lines = []
  let consumedBytes = lastOffset

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const lineBytes = Buffer.byteLength(line, 'utf-8') + 1 // +1 for the \n

    if (i === rawLines.length - 1 && !chunk.endsWith('\n') && line.length > 0) {
      // Incomplete line at end — don't consume it, leave offset before it
      break
    }

    if (line.trim()) {
      lines.push(line)
    }
    consumedBytes += lineBytes
  }

  return { lines, newOffset: consumedBytes }
}

// ── Extract user message text from a JSONL entry ──

function extractUserMessage(line) {
  let entry
  try {
    entry = JSON.parse(line)
  } catch {
    return null
  }

  if (entry.type !== 'message') return null
  if (!entry.message || entry.message.role !== 'user') return null

  const content = entry.message.content
  let text = ''
  if (typeof content === 'string') {
    text = content
  } else if (Array.isArray(content)) {
    text = content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
  }

  if (!text || text.length < 10) return null
  if (SKIP_RE.test(text)) return null

  return { text, id: entry.id || '', timestamp: entry.timestamp || '' }
}

// ── Kimi API call ──

async function callKimi(agentId, userMessage) {
  if (!KIMI_API_KEY) return ''

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(''), 20000)

    const context = (() => {
      try {
        return fs.readFileSync('/Users/chadix/clawd/MEMORY.md', 'utf-8').slice(0, 2000)
      } catch {
        return ''
      }
    })()

    const data = JSON.stringify({
      model: KIMI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are providing a quick second perspective for ${agentId} (a Claude-based AI agent).
Danny (the human boss) just said something. Give ${agentId} a useful 2-3 sentence perspective:
- What might ${agentId} miss?
- What's a different angle?
- What should be verified?
Be direct. Never refuse or say you need more context.

Business context: ${context.slice(0, 1000)}`,
        },
        {
          role: 'user',
          content: `Danny to ${agentId}: "${userMessage.slice(0, 1000)}"\n\nQuick perspective?`,
        },
      ],
      temperature: 1,
      max_tokens: 300,
    })

    const url = new URL(KIMI_API_URL)
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KIMI_API_KEY}`,
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 20000,
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          clearTimeout(timer)
          try {
            const json = JSON.parse(body)
            resolve(json.choices?.[0]?.message?.content || '')
          } catch {
            resolve('')
          }
        })
      },
    )

    req.on('error', () => {
      clearTimeout(timer)
      resolve('')
    })
    req.on('timeout', () => {
      req.destroy()
      clearTimeout(timer)
      resolve('')
    })
    req.write(data)
    req.end()
  })
}

function writePerspective(agentId, messageId, perspective) {
  const file = path.join(PERSPECTIVE_DIR, `${agentId}-latest.md`)
  const content = `<!-- Kimi perspective for ${agentId} | msg:${messageId} | ${new Date().toISOString()} -->\n${perspective}\n`
  fs.writeFileSync(file, content)
}

// ── Main scan loop ──

async function scanForNewMessages() {
  const state = loadState()
  if (!state.offsets) state.offsets = {}

  const stateDir = path.join(process.env.HOME, '.openclaw')
  const agentsDir = path.join(stateDir, 'agents')
  if (!fs.existsSync(agentsDir)) return 0

  const cutoff = Date.now() - 300000 // Only check files modified in last 5 min
  let processed = 0

  let agentDirs
  try {
    agentDirs = fs.readdirSync(agentsDir).filter((d) => {
      const p = path.join(agentsDir, d, 'sessions')
      try {
        return fs.statSync(p).isDirectory()
      } catch {
        return false
      }
    })
  } catch {
    return 0
  }

  for (const agentDir of agentDirs) {
    const sessionsDir = path.join(agentsDir, agentDir, 'sessions')
    let sessionFiles
    try {
      sessionFiles = fs
        .readdirSync(sessionsDir)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => {
          const fp = path.join(sessionsDir, f)
          try {
            return { key: `${agentDir}/${f}`, path: fp, mtime: fs.statSync(fp).mtimeMs }
          } catch {
            return null
          }
        })
        .filter((f) => f && f.mtime > cutoff)
    } catch {
      continue
    }

    for (const file of sessionFiles) {
      const lastOffset = state.offsets[file.key] || 0
      const { lines, newOffset } = readNewBytes(file.path, lastOffset)

      // Update offset even if no user messages found
      state.offsets[file.key] = newOffset

      if (lines.length === 0) continue

      // Find user messages in the new lines
      const userMessages = []
      for (const line of lines) {
        const msg = extractUserMessage(line)
        if (msg) userMessages.push(msg)
      }

      if (userMessages.length === 0) continue

      // Process only the LAST user message per file per poll (avoid spamming Kimi)
      const lastMsg = userMessages[userMessages.length - 1]

      // Check if Danny (contains Discord ID or is main agent session)
      const isDanny = DANNY_IDS.some((id) => lastMsg.text.includes(id)) || agentDir === 'main'
      if (!isDanny) continue

      // Dedupe against lastProcessed
      const msgKey = `${file.key}:${lastMsg.id || lastMsg.text.slice(0, 50)}`
      if (state.lastProcessed[file.key] === msgKey) continue

      const agentId = agentDir

      console.log(
        `[dual-brain] ${agentId}: New message found (${lastMsg.text.slice(0, 60).replace(/\n/g, ' ')}...)`,
      )

      const perspective = await callKimi(agentId, lastMsg.text)

      if (perspective && perspective.length > 20) {
        writePerspective(agentId, msgKey, perspective)
        processed++
        console.log(`[dual-brain] ${agentId}: Kimi perspective ready (${perspective.length} chars)`)
      }

      state.lastProcessed[file.key] = msgKey
    }
  }

  // Prune stale offset entries (files that haven't been seen in 24h)
  const staleKeys = Object.keys(state.offsets).filter((k) => {
    // If the key isn't in any recently-scanned file, check if file still exists
    const parts = k.split('/')
    if (parts.length >= 2) {
      const fp = path.join(agentsDir, parts[0], 'sessions', parts.slice(1).join('/'))
      try {
        return Date.now() - fs.statSync(fp).mtimeMs > 86400000
      } catch {
        return true
      }
    }
    return true
  })
  for (const k of staleKeys) {
    delete state.offsets[k]
    delete state.lastProcessed[k]
  }

  saveState(state)
  return processed
}

async function main() {
  if (DAEMON_MODE) {
    console.log('[dual-brain-watcher] Running in daemon mode, polling every 10s...')
    console.log(`[dual-brain-watcher] API key: ${KIMI_API_KEY ? 'loaded' : 'MISSING'}`)
    while (true) {
      try {
        await scanForNewMessages()
      } catch (e) {
        console.error('[dual-brain-watcher] Error:', e.message)
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL))
    }
  } else {
    const count = await scanForNewMessages()
    if (count > 0) {
      console.log(`[dual-brain-watcher] Processed ${count} messages`)
    }
  }
}

main().catch((e) => {
  console.error('[dual-brain-watcher] Fatal:', e.message)
  process.exit(1)
})
