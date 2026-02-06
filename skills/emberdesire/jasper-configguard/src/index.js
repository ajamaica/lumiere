/**
 * jasper-configguard — Safe OpenClaw config management
 *
 * Core library for config patching with automatic rollback.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const http = require('http')

const DEFAULT_CONFIG_PATHS = [
  path.join(process.env.HOME || '', '.openclaw', 'openclaw.json'),
  path.join(process.cwd(), 'openclaw.json'),
]

const DEFAULT_BACKUP_DIR = path.join(process.env.HOME || '', '.openclaw', 'config-backups')
const DEFAULT_GATEWAY_URL = 'http://localhost:18789'
const MAX_BACKUPS = 20

class ConfigGuard {
  constructor(options = {}) {
    this.configPath = options.configPath || this._findConfig()
    this.backupDir = options.backupDir || DEFAULT_BACKUP_DIR
    this.gatewayUrl = options.gatewayUrl || DEFAULT_GATEWAY_URL
    this.timeout = options.timeout || 30
    this.maxBackups = options.maxBackups || MAX_BACKUPS
    this.verbose = options.verbose || false

    // Ensure backup dir exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  /**
   * Apply a config patch with automatic rollback on failure.
   *
   * @param {object} patch - JSON object to deep merge into config
   * @param {object} opts - { restart: true, verbose: false }
   * @returns {{ success: boolean, backupId?: string, error?: string }}
   */
  async patch(patch, opts = {}) {
    const { restart = true, verbose = false } = opts

    // 1. Read current config
    const currentConfig = this._readConfig()

    // 2. Create backup
    const backupId = this._createBackup(currentConfig)
    this._log(`Backed up to: ${backupId}`, verbose)

    // 3. Deep merge
    const newConfig = deepMerge(currentConfig, patch)

    // 4. Validate result
    try {
      JSON.stringify(newConfig)
    } catch (e) {
      return { success: false, error: 'Merged config is not valid JSON', backupId }
    }

    // 5. Write new config
    this._writeConfig(newConfig)
    this._log('Config written', verbose)

    if (!restart) {
      return { success: true, backupId }
    }

    // 6. Restart gateway
    this._log('Restarting gateway...', verbose)
    this._restartGateway()

    // 7. Health check
    this._log(`Waiting for health (${this.timeout}s timeout)...`, verbose)
    const healthy = await this._waitForHealth()

    if (healthy) {
      this._pruneBackups()
      return { success: true, backupId }
    }

    // 8. ROLLBACK
    this._log('❌ Gateway unhealthy — rolling back!', true)
    this._restoreBackup(backupId)
    this._restartGateway()

    // Wait for restored config to come up
    const recoveredHealth = await this._waitForHealth()

    return {
      success: false,
      backupId,
      error: `Gateway failed health check. Rolled back to ${backupId}. Recovery: ${recoveredHealth ? 'OK' : 'MANUAL INTERVENTION NEEDED'}`,
      rolledBack: true,
      recoveryHealthy: recoveredHealth,
    }
  }

  /**
   * Preview what a patch would change (dry run).
   */
  dryRun(patch) {
    const current = this._readConfig()
    const merged = deepMerge(current, patch)
    const diff = jsonDiff(current, merged)
    return { diff, current, merged }
  }

  /**
   * Restore a specific backup (or latest).
   */
  async restore(backupId) {
    try {
      if (!backupId) {
        const backups = this.listBackups()
        if (backups.length === 0) return { success: false, error: 'No backups available' }
        backupId = backups[0].id
      }

      this._restoreBackup(backupId)
      this._restartGateway()
      const healthy = await this._waitForHealth()

      return { success: true, backupId, healthy }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * List available backups, newest first.
   */
  listBackups() {
    if (!fs.existsSync(this.backupDir)) return []

    return fs
      .readdirSync(this.backupDir)
      .filter((f) => f.startsWith('openclaw.json.'))
      .map((f) => {
        const filePath = path.join(this.backupDir, f)
        const stat = fs.statSync(filePath)
        const timestamp = parseInt(f.split('.').pop(), 10)
        return {
          id: f.replace('openclaw.json.', ''),
          file: f,
          path: filePath,
          timestamp,
          date: new Date(timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19),
          size: formatBytes(stat.size),
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Show diff between current config and a backup.
   */
  diff(backupId) {
    const current = this._readConfig()

    if (!backupId) {
      const backups = this.listBackups()
      if (backups.length === 0) return null
      backupId = backups[0].id
    }

    const backupPath = path.join(this.backupDir, `openclaw.json.${backupId}`)
    if (!fs.existsSync(backupPath)) return null

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    return jsonDiff(backup, current)
  }

  /**
   * Validate a config file.
   */
  validate(configPath) {
    const filePath = configPath || this.configPath
    const warnings = []

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const config = JSON.parse(content)

      // Basic structure checks
      if (!config.gateway) warnings.push('Missing "gateway" section')
      if (!config.agents) warnings.push('Missing "agents" section')
      if (!config.agents?.defaults?.model) warnings.push('No default model configured')
      if (config.agents?.list && !Array.isArray(config.agents.list)) {
        return { valid: false, error: '"agents.list" must be an array' }
      }

      return { valid: true, warnings }
    } catch (err) {
      if (err.code === 'ENOENT') return { valid: false, error: `File not found: ${filePath}` }
      return { valid: false, error: `Invalid JSON: ${err.message}` }
    }
  }

  /**
   * Initialize backup directory.
   */
  setup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
    // Create initial backup
    if (fs.existsSync(this.configPath)) {
      const config = this._readConfig()
      this._createBackup(config)
    }
  }

  /**
   * Check if gateway is responding.
   */
  async healthCheck() {
    return this._checkHealth()
  }

  /**
   * Check if gateway process is running.
   */
  isGatewayRunning() {
    try {
      execSync('pgrep -f openclaw-gateway', { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }

  // --- Internal methods ---

  _findConfig() {
    for (const p of DEFAULT_CONFIG_PATHS) {
      if (fs.existsSync(p)) return p
    }
    return DEFAULT_CONFIG_PATHS[0] // default even if doesn't exist yet
  }

  _readConfig() {
    const content = fs.readFileSync(this.configPath, 'utf8')
    return JSON.parse(content)
  }

  _writeConfig(config) {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2) + '\n')
  }

  _createBackup(config) {
    const timestamp = Math.floor(Date.now() / 1000)
    const backupFile = `openclaw.json.${timestamp}`
    const backupPath = path.join(this.backupDir, backupFile)
    fs.writeFileSync(backupPath, JSON.stringify(config, null, 2) + '\n')
    return String(timestamp)
  }

  _restoreBackup(backupId) {
    const backupPath = path.join(this.backupDir, `openclaw.json.${backupId}`)
    if (!fs.existsSync(backupPath)) throw new Error(`Backup not found: ${backupId}`)
    const content = fs.readFileSync(backupPath, 'utf8')
    JSON.parse(content) // validate
    fs.writeFileSync(this.configPath, content)
  }

  _restartGateway() {
    try {
      execSync('kill -USR1 $(pgrep -f openclaw-gateway)', { stdio: 'pipe', timeout: 5000 })
    } catch {
      // Process might not exist, that's fine
    }
  }

  async _waitForHealth() {
    const start = Date.now()
    const deadline = start + this.timeout * 1000

    // Initial delay for restart
    await sleep(3000)

    while (Date.now() < deadline) {
      if (await this._checkHealth()) return true
      await sleep(2000)
    }
    return false
  }

  _checkHealth() {
    return new Promise((resolve) => {
      const req = http.get(`${this.gatewayUrl}/`, { timeout: 3000 }, (res) => {
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.on('timeout', () => {
        req.destroy()
        resolve(false)
      })
    })
  }

  _pruneBackups() {
    const backups = this.listBackups()
    if (backups.length > this.maxBackups) {
      for (const old of backups.slice(this.maxBackups)) {
        try {
          fs.unlinkSync(old.path)
        } catch {}
      }
    }
  }

  _log(msg, force = false) {
    if (this.verbose || force) console.log(`[configguard] ${msg}`)
  }
}

// --- Utilities ---

function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

function jsonDiff(a, b, prefix = '', _topLevel = true) {
  const lines = []
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])

  for (const key of allKeys) {
    const keyPath = prefix ? `${prefix}.${key}` : key
    const aVal = a?.[key]
    const bVal = b?.[key]

    if (aVal === undefined && bVal !== undefined) {
      lines.push(`+ ${keyPath}: ${JSON.stringify(bVal)}`)
    } else if (aVal !== undefined && bVal === undefined) {
      lines.push(`- ${keyPath}: ${JSON.stringify(aVal)}`)
    } else if (
      aVal &&
      bVal &&
      typeof aVal === 'object' &&
      typeof bVal === 'object' &&
      !Array.isArray(aVal) &&
      !Array.isArray(bVal)
    ) {
      const nested = jsonDiff(aVal, bVal, keyPath, false)
      lines.push(...nested)
    } else if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
      lines.push(`- ${keyPath}: ${JSON.stringify(aVal)}`)
      lines.push(`+ ${keyPath}: ${JSON.stringify(bVal)}`)
    }
  }
  return _topLevel ? lines.join('\n') : lines
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = { ConfigGuard, deepMerge, jsonDiff }
