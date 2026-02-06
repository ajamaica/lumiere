/**
 * Jasper Recall Server
 * HTTP API for memory search - designed for sandboxed agents
 *
 * Security: public_only is enforced by default
 */

const http = require('http')
const { execSync } = require('child_process')
const path = require('path')
const os = require('os')
const url = require('url')

const BIN_PATH = path.join(os.homedir(), '.local', 'bin')
const RECALL_SCRIPT = path.join(BIN_PATH, 'recall')

/**
 * Execute recall query
 */
function executeRecall(query, options = {}) {
  const { publicOnly = true, limit = 5 } = options

  let cmd = `${RECALL_SCRIPT} "${query.replace(/"/g, '\\"')}"`

  // Security: always add --public-only unless explicitly disabled
  if (publicOnly) {
    cmd += ' --public-only'
  }

  cmd += ` --limit ${parseInt(limit) || 5}`

  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, HOME: os.homedir() },
    })
    return { ok: true, output }
  } catch (err) {
    // Check if it's just "no results"
    if (err.stdout?.includes('No results') || err.status === 0) {
      return { ok: true, output: err.stdout || 'No results found' }
    }
    return { ok: false, error: err.message, stderr: err.stderr }
  }
}

/**
 * Parse recall output into structured results
 */
function parseResults(output) {
  const results = []

  // Try to parse structured output
  const blocks = output.split(/={3,}\s*(?:Result\s+\d+|---)/i)

  for (const block of blocks) {
    if (!block.trim()) continue

    const result = {}

    const scoreMatch = block.match(/score:\s*([\d.]+)/i)
    if (scoreMatch) result.score = parseFloat(scoreMatch[1])

    const fileMatch = block.match(/File:\s*(.+)/i)
    if (fileMatch) result.file = fileMatch[1].trim()

    const linesMatch = block.match(/Lines?:\s*(\d+(?:-\d+)?)/i)
    if (linesMatch) result.lines = linesMatch[1]

    // Content is everything else
    let content = block
      .replace(/score:\s*[\d.]+/gi, '')
      .replace(/File:\s*.+/gi, '')
      .replace(/Lines?:\s*\d+(?:-\d+)?/gi, '')
      .trim()

    if (content) {
      result.content = content.substring(0, 1000)
      results.push(result)
    }
  }

  // Fallback for unparseable output
  if (results.length === 0 && output.trim()) {
    results.push({ content: output.trim().substring(0, 2000), raw: true })
  }

  return results
}

/**
 * Handle HTTP request
 */
function handleRequest(req, res) {
  // CORS headers for browser/agent access
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname
  const query = parsedUrl.query

  // Health check
  if (pathname === '/health' || pathname === '/') {
    res.writeHead(200)
    res.end(JSON.stringify({ ok: true, service: 'jasper-recall', version: '0.2.1' }))
    return
  }

  // Recall endpoint
  if (pathname === '/recall' || pathname === '/api/recall') {
    const searchQuery = query.q || query.query

    if (!searchQuery) {
      res.writeHead(400)
      res.end(JSON.stringify({ ok: false, error: 'q or query parameter required' }))
      return
    }

    // Security: public_only defaults to true
    // Only allow disabling if explicitly set AND RECALL_ALLOW_PRIVATE=true
    let publicOnly = true
    if (query.public_only === 'false' && process.env.RECALL_ALLOW_PRIVATE === 'true') {
      publicOnly = false
    }

    const result = executeRecall(searchQuery, {
      publicOnly,
      limit: query.limit || 5,
    })

    if (result.ok) {
      const parsed = parseResults(result.output)
      res.writeHead(200)
      res.end(
        JSON.stringify({
          ok: true,
          query: searchQuery,
          public_only: publicOnly,
          count: parsed.length,
          results: parsed,
          raw: result.output,
        }),
      )
    } else {
      res.writeHead(500)
      res.end(
        JSON.stringify({
          ok: false,
          error: result.error,
          stderr: result.stderr?.substring(0, 500),
        }),
      )
    }
    return
  }

  // 404
  res.writeHead(404)
  res.end(JSON.stringify({ ok: false, error: 'Not found' }))
}

/**
 * Start the server
 */
function startServer(port = 3458, host = '127.0.0.1') {
  const server = http.createServer(handleRequest)

  server.listen(port, host, () => {
    console.log(`🦊 Jasper Recall Server running on http://${host}:${port}`)
    console.log('')
    console.log('Endpoints:')
    console.log(`  GET /recall?q=query     Search memories (public-only by default)`)
    console.log(`  GET /health             Health check`)
    console.log('')
    console.log('Security: public_only=true is enforced by default')
    console.log('Press Ctrl+C to stop')
  })

  return server
}

/**
 * Parse CLI args and start server
 */
function runCLI(args) {
  let port = 3458
  let host = '127.0.0.1'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
      port = parseInt(args[++i]) || 3458
    }
    if (args[i] === '--host' || args[i] === '-h') {
      host = args[++i] || '127.0.0.1'
    }
    if (args[i] === '--help') {
      console.log(`
Jasper Recall Server
HTTP API for memory search

Usage: npx jasper-recall serve [options]

Options:
  --port, -p  Port to listen on (default: 3458)
  --host, -h  Host to bind to (default: 127.0.0.1)
  --help      Show this help

Environment:
  RECALL_ALLOW_PRIVATE=true  Allow public_only=false queries (dangerous!)

Examples:
  npx jasper-recall serve
  npx jasper-recall serve --port 8080
  npx jasper-recall serve --host 0.0.0.0
`)
      process.exit(0)
    }
  }

  startServer(port, host)
}

// Export for programmatic use
module.exports = { startServer, executeRecall, parseResults, runCLI }

// CLI entry point
if (require.main === module) {
  runCLI(process.argv.slice(2))
}
