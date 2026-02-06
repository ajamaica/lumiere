#!/usr/bin/env node
'use strict'

const http = require('http')
const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const PORT = 18800
const HOST = process.env.DASHBOARD_HOST || '127.0.0.1'
const HOME = process.env.HOME
const OPENCLAW = path.join(HOME, '.openclaw')
const SCRIPTS = path.join(OPENCLAW, 'workspace/skills/security-monitor/scripts')
const LOGS = path.join(OPENCLAW, 'logs')
const DASHBOARD_DIR = __dirname
const SCRIPT_TIMEOUT = 30000
const REMEDIATE_TIMEOUT = 120000
const ENV_PATH = `${HOME}/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`

let scanLock = false
let remediateLock = false
let lastScanResult = null
let lastScanTime = null
const startTime = Date.now()

// Security headers
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self' 'unsafe-inline'",
}

function json(res, data, status = 200) {
  res.writeHead(status, { ...SEC_HEADERS, 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function runScript(scriptName, args = []) {
  return new Promise((resolve) => {
    const scriptPath = path.join(SCRIPTS, scriptName)
    const env = { ...process.env, PATH: ENV_PATH, HOME }
    execFile(
      '/bin/bash',
      [scriptPath, ...args],
      { timeout: SCRIPT_TIMEOUT, env, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          exitCode: err ? err.code || 1 : 0,
          stdout: stdout || '',
          stderr: stderr || '',
          error: err ? err.message : null,
        })
      },
    )
  })
}

function runCmd(cmd, args = []) {
  return new Promise((resolve) => {
    const env = { ...process.env, PATH: ENV_PATH, HOME }
    execFile(
      cmd,
      args,
      { timeout: SCRIPT_TIMEOUT, env, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          exitCode: err ? err.code || 1 : 0,
          stdout: stdout || '',
          stderr: stderr || '',
          error: err ? err.message : null,
        })
      },
    )
  })
}

function runRemediateScript(scriptPath, args = []) {
  return new Promise((resolve) => {
    const env = { ...process.env, PATH: ENV_PATH, HOME }
    execFile(
      '/bin/bash',
      [scriptPath, ...args],
      { timeout: REMEDIATE_TIMEOUT, env, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          exitCode: err ? err.code || 1 : 0,
          stdout: stdout || '',
          stderr: stderr || '',
          error: err ? err.message : null,
        })
      },
    )
  })
}

function findCheckScript(num) {
  const padded = String(num).padStart(2, '0')
  const remDir = path.join(SCRIPTS, 'remediate')
  try {
    const files = fs.readdirSync(remDir)
    const match = files.find((f) => f.startsWith(`check-${padded}-`) && f.endsWith('.sh'))
    return match ? path.join(remDir, match) : null
  } catch (e) {
    return null
  }
}

// Parsers

function parseScanOutput(stdout, exitCode) {
  const lines = stdout.split('\n')
  const checks = []
  let current = null
  for (const line of lines) {
    const checkMatch = line.match(/^\[(\d+)\/(\d+)\]\s+(.+)/)
    if (checkMatch) {
      if (current) checks.push(current)
      current = {
        num: parseInt(checkMatch[1]),
        total: parseInt(checkMatch[2]),
        name: checkMatch[3].replace(/\.\.\.$/, '').trim(),
        status: 'UNKNOWN',
        details: '',
      }
      continue
    }
    if (current) {
      if (line.startsWith('CLEAN:')) {
        current.status = 'CLEAN'
        current.details = line.substring(7).trim()
      } else if (line.startsWith('CRITICAL:')) {
        current.status = 'CRITICAL'
        current.details = line.substring(10).trim()
      } else if (line.startsWith('WARNING:')) {
        current.status = 'WARNING'
        current.details = line.substring(9).trim()
      } else if (line.startsWith('INFO:')) {
        current.status = 'INFO'
        current.details = line.substring(6).trim()
      } else if (
        line.trim() &&
        !line.startsWith('===') &&
        !line.startsWith('SCAN COMPLETE:') &&
        !line.startsWith('STATUS:')
      ) {
        current.details += (current.details ? '\n' : '') + line.trim()
      }
    }
  }
  if (current) checks.push(current)

  const summaryMatch = stdout.match(
    /SCAN COMPLETE:\s*(\d+)\s*critical,\s*(\d+)\s*warnings?,\s*(\d+)\s*clean/,
  )
  const statusMatch = stdout.match(/STATUS:\s*(\w+)/)
  return {
    checks,
    summary: summaryMatch
      ? {
          critical: parseInt(summaryMatch[1]),
          warnings: parseInt(summaryMatch[2]),
          clean: parseInt(summaryMatch[3]),
        }
      : null,
    status: statusMatch
      ? statusMatch[1]
      : exitCode === 0
        ? 'SECURE'
        : exitCode === 1
          ? 'WARNING'
          : 'COMPROMISED',
    timestamp: new Date().toISOString(),
  }
}

function parseDashboardOutput(stdout) {
  const sections = {}
  let currentSection = 'header'
  let currentLines = []

  for (const line of stdout.split('\n')) {
    const sectionMatch = line.match(/^---\s*(.+?)\s*---$/)
    if (sectionMatch) {
      if (currentLines.length) sections[currentSection] = currentLines.join('\n').trim()
      currentSection = sectionMatch[1].toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')
      currentLines = []
      continue
    }
    if (line.startsWith('====')) continue
    currentLines.push(line)
  }
  if (currentLines.length) sections[currentSection] = currentLines.join('\n').trim()
  return sections
}

function parseNetworkOutput(stdout) {
  const sections = {}
  let currentSection = 'header'
  let currentLines = []

  for (const line of stdout.split('\n')) {
    const sectionMatch = line.match(/^---\s*(.+?)\s*---$/)
    if (sectionMatch) {
      if (currentLines.length) sections[currentSection] = currentLines.join('\n').trim()
      currentSection = sectionMatch[1].toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')
      currentLines = []
      continue
    }
    if (line.startsWith('====')) continue
    currentLines.push(line)
  }
  if (currentLines.length) sections[currentSection] = currentLines.join('\n').trim()
  return sections
}

function parseScanLog(content) {
  const entries = []
  // Split on the scan header line to isolate each scan block
  const scanBlocks = content.split(/OPENCLAW SECURITY SCAN - /)
  for (const block of scanBlocks) {
    const tsMatch = block.match(/^(\d{4}-\d{2}-\d{2}T\S+)/)
    if (!tsMatch) continue
    const statusMatch = block.match(/STATUS:\s*(\w+)/)
    const summaryMatch = block.match(
      /SCAN COMPLETE:\s*(\d+)\s*critical,\s*(\d+)\s*warnings?,\s*(\d+)\s*clean/,
    )
    entries.push({
      timestamp: tsMatch[1],
      status: statusMatch ? statusMatch[1] : 'UNKNOWN',
      critical: summaryMatch ? parseInt(summaryMatch[1]) : 0,
      warnings: summaryMatch ? parseInt(summaryMatch[2]) : 0,
      clean: summaryMatch ? parseInt(summaryMatch[3]) : 0,
    })
  }
  return entries.slice(-50)
}

function parseCronLog(content) {
  return content
    .split('\n')
    .filter((l) => l.trim())
    .slice(-50)
    .map((line) => {
      const tsMatch = line.match(/^(\S+)\s+(.*)/)
      return tsMatch
        ? { timestamp: tsMatch[1], message: tsMatch[2] }
        : { timestamp: '', message: line }
    })
}

// Route handler
async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`)
  const route = parsedUrl.pathname
  const method = req.method

  // Serve index.html
  if (route === '/' && method === 'GET') {
    try {
      const html = fs.readFileSync(path.join(DASHBOARD_DIR, 'index.html'), 'utf-8')
      res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
    } catch (e) {
      res.writeHead(500, SEC_HEADERS)
      res.end('index.html not found')
    }
    return
  }

  // API: Last cached scan
  if (route === '/api/scan' && method === 'GET') {
    if (lastScanResult) {
      json(res, { cached: true, scannedAt: lastScanTime, ...lastScanResult })
    } else {
      json(res, { cached: false, message: 'No scan run yet. POST /api/scan/run to trigger.' })
    }
    return
  }

  // API: Run scan
  if (route === '/api/scan/run' && method === 'POST') {
    if (scanLock) {
      json(res, { error: 'Scan already in progress' }, 423)
      return
    }
    scanLock = true
    try {
      const result = await runScript('scan.sh')
      const parsed = parseScanOutput(result.stdout, result.exitCode)
      lastScanResult = { parsed, raw: result.stdout }
      lastScanTime = new Date().toISOString()
      json(res, { ...lastScanResult, scannedAt: lastScanTime })
    } finally {
      scanLock = false
    }
    return
  }

  // API: Dashboard
  if (route === '/api/dashboard' && method === 'GET') {
    const result = await runScript('dashboard.sh')
    const parsed = parseDashboardOutput(result.stdout)
    json(res, { parsed, raw: result.stdout })
    return
  }

  // API: Network
  if (route === '/api/network' && method === 'GET') {
    const result = await runScript('network-check.sh')
    const parsed = parseNetworkOutput(result.stdout)
    json(res, { parsed, raw: result.stdout })
    return
  }

  // API: Process tree
  if (route === '/api/process-tree' && method === 'GET') {
    // Gateway process
    const gwResult = await runCmd('/usr/bin/pgrep', ['-f', 'openclaw.*gateway'])
    const gwPids = gwResult.stdout
      .trim()
      .split('\n')
      .filter((p) => p.trim())
    const trees = []

    for (const pid of gwPids.slice(0, 3)) {
      const witrResult = await runCmd('/opt/homebrew/bin/witr', ['--pid', pid, '--no-color'])
      trees.push({ pid, type: 'gateway', output: witrResult.stdout, error: witrResult.error })
    }

    // Listening ports
    const listenResult = await runCmd('/usr/sbin/lsof', ['-iTCP', '-sTCP:LISTEN', '-n', '-P'])
    const listenLines = listenResult.stdout
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('COMMAND'))
    const listeners = listenLines.map((l) => {
      const parts = l.split(/\s+/)
      return { command: parts[0], pid: parts[1], user: parts[2], name: parts[8] || '' }
    })

    // Witr for each unique listening PID
    const seenPids = new Set(gwPids)
    for (const l of listeners) {
      if (!seenPids.has(l.pid)) {
        seenPids.add(l.pid)
        const wr = await runCmd('/opt/homebrew/bin/witr', ['--pid', l.pid, '--short', '--no-color'])
        trees.push({
          pid: l.pid,
          type: 'listener',
          command: l.command,
          output: wr.stdout,
          error: wr.error,
        })
      }
    }

    json(res, { trees, listeners, raw: { gateway: gwResult.stdout, listen: listenResult.stdout } })
    return
  }

  // API: Scan logs
  if (route === '/api/logs/scan' && method === 'GET') {
    const logPath = path.join(LOGS, 'security-scan.log')
    try {
      const content = fs.readFileSync(logPath, 'utf-8')
      const entries = parseScanLog(content)
      json(res, { entries, raw: content })
    } catch (e) {
      json(res, { entries: [], raw: '', error: 'Log file not found' })
    }
    return
  }

  // API: Cron logs
  if (route === '/api/logs/cron' && method === 'GET') {
    const logPath = path.join(LOGS, 'cron.log')
    try {
      const content = fs.readFileSync(logPath, 'utf-8')
      const entries = parseCronLog(content)
      json(res, { entries, raw: content })
    } catch (e) {
      json(res, { entries: [], raw: '', error: 'Cron log not found' })
    }
    return
  }

  // API: Status
  if (route === '/api/status' && method === 'GET') {
    const uptimeMs = Date.now() - startTime
    const gwCheck = await runCmd('/usr/bin/curl', [
      '-s',
      '-o',
      '/dev/null',
      '-w',
      '%{http_code}',
      '--connect-timeout',
      '2',
      'http://127.0.0.1:18789/health',
    ])
    const gatewayReachable = gwCheck.stdout.trim() === '200'
    json(res, {
      uptime: uptimeMs,
      uptimeHuman: `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m`,
      lastScan: lastScanTime,
      lastScanStatus: lastScanResult ? lastScanResult.parsed.status : null,
      gatewayReachable,
      scanLocked: scanLock,
      remediateLocked: remediateLock,
    })
    return
  }

  // API: Remediate single check
  const checkMatch = route.match(/^\/api\/remediate\/check\/(\d+)$/)
  if (checkMatch && method === 'POST') {
    if (remediateLock) {
      json(res, { error: 'Remediation already in progress' }, 423)
      return
    }
    const checkNum = parseInt(checkMatch[1])
    const scriptPath = findCheckScript(checkNum)
    if (!scriptPath) {
      json(res, { error: `No remediation script found for check ${checkNum}` }, 404)
      return
    }
    remediateLock = true
    try {
      const result = await runRemediateScript(scriptPath, ['--yes'])
      json(res, {
        check: checkNum,
        exitCode: result.exitCode,
        status:
          result.exitCode === 0 ? 'fixed' : result.exitCode === 2 ? 'nothing_to_fix' : 'failed',
        output: result.stdout,
        stderr: result.stderr,
        error: result.error,
      })
    } finally {
      remediateLock = false
    }
    return
  }

  // API: Remediate all non-clean checks
  if (route === '/api/remediate/all' && method === 'POST') {
    if (remediateLock) {
      json(res, { error: 'Remediation already in progress' }, 423)
      return
    }
    remediateLock = true
    try {
      // Run scan first to determine which checks need remediation
      const scanResult = await runScript('scan.sh')
      const parsed = parseScanOutput(scanResult.stdout, scanResult.exitCode)
      const results = []
      for (const check of parsed.checks) {
        if (check.status === 'CLEAN') continue
        const scriptPath = findCheckScript(check.num)
        if (!scriptPath) {
          results.push({ check: check.num, name: check.name, status: 'no_script', output: '' })
          continue
        }
        const result = await runRemediateScript(scriptPath, ['--yes'])
        results.push({
          check: check.num,
          name: check.name,
          exitCode: result.exitCode,
          status:
            result.exitCode === 0 ? 'fixed' : result.exitCode === 2 ? 'nothing_to_fix' : 'failed',
          output: result.stdout,
        })
      }
      const fixed = results.filter((r) => r.status === 'fixed').length
      const failed = results.filter((r) => r.status === 'failed').length
      const skipped = results.filter(
        (r) => r.status === 'nothing_to_fix' || r.status === 'no_script',
      ).length
      json(res, { results, summary: { fixed, failed, skipped, total: results.length } })
    } finally {
      remediateLock = false
    }
    return
  }

  // 404
  res.writeHead(404, { ...SEC_HEADERS, 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('Request error:', err)
    res.writeHead(500, SEC_HEADERS)
    res.end(JSON.stringify({ error: 'Internal server error' }))
  })
})

server.listen(PORT, HOST, () => {
  console.log(`Security Dashboard running at http://${HOST}:${PORT}`)
})
