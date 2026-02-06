const fs = require('fs')
const path = require('path')
const os = require('os')
const http = require('http')
const config = require('./config')

function getProvider(cfg) {
  const providers = {
    moonshot: () => new (require('./providers/moonshot'))(cfg),
    openai: () => new (require('./providers/openai'))(cfg),
    ollama: () => new (require('./providers/ollama'))(cfg),
    groq: () => new (require('./providers/groq'))(cfg),
  }
  const factory = providers[cfg.provider]
  if (!factory) {
    log(`Unknown provider: ${cfg.provider}, falling back to ollama`)
    return new (require('./providers/ollama').OllamaProvider)(cfg)
  }
  return factory()
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try {
    fs.appendFileSync(config.LOG_FILE, line + '\n')
  } catch {}
}

function loadContext(cfg) {
  if (cfg.contextFile) {
    try {
      return fs.readFileSync(cfg.contextFile, 'utf-8').slice(0, 2000)
    } catch {}
  }
  const candidates = [
    path.join(os.homedir(), 'clawd', 'MEMORY.md'),
    path.join(process.cwd(), 'MEMORY.md'),
  ]
  for (const f of candidates) {
    try {
      return fs.readFileSync(f, 'utf-8').slice(0, 2000)
    } catch {}
  }
  return ''
}

async function checkEngram(cfg) {
  if (!cfg.engramIntegration) return false
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 2000)
    const req = http.get('http://localhost:3400/api/health', (res) => {
      clearTimeout(timer)
      resolve(res.statusCode === 200)
    })
    req.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
    req.on('timeout', () => {
      req.destroy()
      clearTimeout(timer)
      resolve(false)
    })
  })
}

async function storeInEngram(agentId, perspective, userMessage) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 5000)
    const data = JSON.stringify({
      content: `[Dual-Brain for ${agentId}] ${perspective}`,
      type: 'fact',
      tags: ['dual-brain', 'perspective', agentId],
      agentId,
      scope: 'agent',
      confidence: 0.6,
    })
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3400,
        path: '/api/memories',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        clearTimeout(timer)
        resolve(res.statusCode === 200 || res.statusCode === 201)
      },
    )
    req.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
    req.write(data)
    req.end()
  })
}

function writePerspective(cfg, agentId, messageKey, perspective) {
  const dir = cfg.perspectiveDir || config.PERSPECTIVE_DIR
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${agentId}-latest.md`)
  fs.writeFileSync(
    file,
    `<!-- dual-brain | ${cfg.provider} | ${messageKey} | ${new Date().toISOString()} -->\n${perspective}\n`,
  )
}

function findSessionFiles(cutoffMs) {
  const files = []
  const stateDir = [path.join(os.homedir(), '.openclaw'), path.join(os.homedir(), '.moltbot')].find(
    (d) => fs.existsSync(d),
  )
  if (!stateDir) return files

  const agentsDir = path.join(stateDir, 'agents')
  if (!fs.existsSync(agentsDir)) return files

  const cutoff = Date.now() - cutoffMs
  try {
    for (const agentDir of fs.readdirSync(agentsDir)) {
      const sessionsDir = path.join(agentsDir, agentDir, 'sessions')
      if (!fs.existsSync(sessionsDir) || !fs.statSync(sessionsDir).isDirectory()) continue
      for (const f of fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.jsonl'))) {
        const fp = path.join(sessionsDir, f)
        if (fs.statSync(fp).mtimeMs > cutoff) {
          files.push({ name: `${agentDir}/${f}`, path: fp })
        }
      }
    }
  } catch {}
  return files
}

async function scanOnce(cfg, provider) {
  const state = config.loadState()
  const context = loadContext(cfg)
  const hasEngram = await checkEngram(cfg)
  let processed = 0

  for (const file of findSessionFiles(60000)) {
    let content
    try {
      content = fs.readFileSync(file.path, 'utf-8')
    } catch {
      continue
    }

    for (const line of content.trim().split('\n').slice(-5)) {
      try {
        const entry = JSON.parse(line)
        if (entry.role !== 'user') continue

        const text = typeof entry.content === 'string' ? entry.content : ''
        if (!text || text.length < 10) continue
        if (/HEARTBEAT|NO_REPLY|heartbeat/i.test(text)) continue

        const isOwner =
          cfg.ownerIds.length === 0 ||
          cfg.ownerIds.some((id) => text.includes(id)) ||
          file.name.includes('main')
        if (!isOwner) continue

        const msgKey = `${file.name}:${text.slice(0, 50)}`
        if (state.lastProcessed[file.name] === msgKey) continue

        const agentId = file.name.match(/^([\w-]+)/)?.[1] || 'main'
        const perspective = await provider.getPerspective(agentId, text, context)

        if (perspective && perspective.length > 20) {
          writePerspective(cfg, agentId, msgKey, perspective)
          log(`${agentId}: perspective ready (${perspective.length} chars) via ${provider.name}`)
          if (hasEngram) {
            const stored = await storeInEngram(agentId, perspective, text)
            if (stored) log(`${agentId}: stored in Engram`)
          }
          processed++
        }

        state.lastProcessed[file.name] = msgKey
      } catch {}
    }
  }

  config.saveState(state)
  return processed
}

async function run(daemon = false) {
  const cfg = config.load()
  const provider = getProvider(cfg)

  log(`dual-brain starting (provider: ${cfg.provider}, model: ${cfg.model})`)
  log(`perspectives: ${cfg.perspectiveDir || config.PERSPECTIVE_DIR}`)
  log(
    `engram: ${cfg.engramIntegration}, owners: ${cfg.ownerIds.length ? cfg.ownerIds.join(',') : '(any)'}`,
  )

  // Write PID
  try {
    fs.writeFileSync(
      cfg.pidFile || path.join(config.CONFIG_DIR, 'dual-brain.pid'),
      String(process.pid),
    )
  } catch {}

  if (daemon) {
    log(`polling every ${cfg.pollInterval}ms...`)
    const shutdown = () => {
      log('shutting down')
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    while (true) {
      try {
        await scanOnce(cfg, provider)
      } catch (e) {
        log(`error: ${e.message}`)
      }
      await new Promise((r) => setTimeout(r, cfg.pollInterval))
    }
  } else {
    const count = await scanOnce(cfg, provider)
    if (count > 0) log(`processed ${count} messages`)
  }
}

module.exports = { run, scanOnce }

// Run directly
if (require.main === module) {
  const isDaemon = process.argv.includes('--daemon')
  run(isDaemon).catch((e) => {
    console.error('Fatal:', e.message)
    process.exit(1)
  })
}
