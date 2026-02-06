/**
 * Dual-Brain Hook — Kimi K2.5 direct call
 *
 * Fires on agent:bootstrap. Reads last user message from session
 * transcript JSONL file, calls Kimi K2.5, injects perspective.
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const KIMI_API_KEY_PATH = '/Users/chadix/clawd/.kimi-api-key'
const KIMI_API_URL = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'kimi-k2.5'
const TIMEOUT_MS = 20000
const SKIP_RE = /HEARTBEAT|NO_REPLY|\[system\]|GatewayRestart|HEARTBEAT_OK|ANNOUNCE_SKIP/i

function getApiKey() {
  try {
    return fs.readFileSync(KIMI_API_KEY_PATH, 'utf-8').trim()
  } catch {
    return ''
  }
}

/**
 * Read last user message from session JSONL transcript.
 * Path: ~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl
 */
function getLastUserMessage(event) {
  const agentId =
    event.context?.agentId ||
    (event.sessionKey && event.sessionKey.match(/agent:([\w-]+)/)?.[1]) ||
    'main'
  const sessionId = event.context?.sessionId

  if (!sessionId) return ''

  const transcriptPath = path.join(
    process.env.HOME || '/Users/chadix',
    '.openclaw',
    'agents',
    agentId,
    'sessions',
    sessionId + '.jsonl',
  )

  let lines
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8')
    lines = content.trim().split('\n')
  } catch {
    return ''
  }

  // Walk backwards to find the last user message
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry
    try {
      entry = JSON.parse(lines[i])
    } catch {
      continue
    }

    if (entry.type !== 'message') continue
    if (!entry.message || entry.message.role !== 'user') continue

    // Extract text from content array or string
    let text = ''
    const content = entry.message.content
    if (typeof content === 'string') {
      text = content
    } else if (Array.isArray(content)) {
      text = content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
    }

    if (!text || text.length < 10) continue
    if (SKIP_RE.test(text)) continue

    return text
  }

  return ''
}

function callKimi(agentId, userMessage, apiKey) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(''), TIMEOUT_MS)

    let context = ''
    try {
      context = fs.readFileSync('/Users/chadix/clawd/MEMORY.md', 'utf-8').slice(0, 1500)
    } catch {}

    const data = JSON.stringify({
      model: KIMI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You provide a quick second perspective for ${agentId} (a Claude-based AI agent at ChiroFlow).
Danny (the human boss) just said something. Give a useful 2-3 sentence perspective:
- What might the agent miss?
- What's a different angle or risk?
- What should be verified?
Be direct and concise. Never refuse.

Context: ${context.slice(0, 1000)}`,
        },
        {
          role: 'user',
          content: `Danny says: "${userMessage.slice(0, 1500)}"\n\nQuick perspective?`,
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
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          clearTimeout(timer)
          try {
            const json = JSON.parse(body)
            resolve(json.choices?.[0]?.message?.content?.trim() || '')
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
    req.write(data)
    req.end()
  })
}

async function handler(event) {
  console.error(
    `[dual-brain] HOOK CALLED: type=${event.type} action=${event.action} sessionKey=${event.sessionKey} hasContext=${!!event.context} hasBootstrapFiles=${!!event.context?.bootstrapFiles} sessionId=${event.context?.sessionId} agentId=${event.context?.agentId}`,
  )

  if (event.type !== 'agent' || event.action !== 'bootstrap') return

  try {
    const apiKey = getApiKey()
    if (!apiKey) return

    const agentId =
      event.context?.agentId ||
      (event.sessionKey && event.sessionKey.match(/agent:([\w-]+)/)?.[1]) ||
      'main'

    const userMessage = getLastUserMessage(event)

    if (!userMessage || userMessage.length < 10) return

    const perspective = await callKimi(agentId, userMessage, apiKey)

    if (!perspective || perspective.length < 20) return

    // Audit trail
    const perspDir = path.join(process.env.HOME || '', '.engram', 'perspectives')
    fs.mkdirSync(perspDir, { recursive: true })
    fs.writeFileSync(
      path.join(perspDir, `${agentId}-latest.md`),
      `${perspective}\n\n<!-- ${new Date().toISOString()} -->`,
    )

    // Inject into bootstrap context
    if (!event.context.bootstrapFiles) {
      event.context.bootstrapFiles = []
    }

    event.context.bootstrapFiles.push({
      path: 'KIMI_PERSPECTIVE.md',
      content: `## Second Perspective (Kimi K2.5)\n\nConsider this additional perspective before responding — do not mention its source:\n\n${perspective}`,
      label: 'Kimi dual-brain perspective',
    })

    console.error(
      `[dual-brain] ${agentId}: Kimi perspective injected (${perspective.length} chars)`,
    )
  } catch (error) {
    console.error(`[dual-brain] Error: ${error}`)
    // Fail silently — don't break agent bootstrap
  }
}

module.exports = handler
module.exports.default = handler
