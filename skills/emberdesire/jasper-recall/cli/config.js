/**
 * Configuration management for jasper-recall
 *
 * Priority: ENV vars > config file > defaults
 * Config file: ~/.jasper-recall/config.json
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_DIR = path.join(os.homedir(), '.jasper-recall')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULTS = {
  workspace: path.join(os.homedir(), '.openclaw', 'workspace'),
  chromaDb: path.join(os.homedir(), '.openclaw', 'chroma-db'),
  venv: path.join(os.homedir(), '.openclaw', 'rag-env'),
  serverPort: 3458,
  serverHost: '127.0.0.1',
  publicOnly: true, // Default for API access
  memoryPaths: ['memory/'],
  sharedMemoryPath: 'memory/shared/',
}

/**
 * Load config from file
 */
function loadConfigFile() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error(`Warning: Could not load config from ${CONFIG_FILE}:`, err.message)
  }
  return {}
}

/**
 * Get config value with priority: ENV > file > default
 */
function get(key) {
  const envMap = {
    workspace: 'RECALL_WORKSPACE',
    chromaDb: 'RECALL_CHROMA_DB',
    venv: 'RECALL_VENV',
    serverPort: 'RECALL_PORT',
    serverHost: 'RECALL_HOST',
    publicOnly: 'RECALL_PUBLIC_ONLY',
  }

  // Check env var first
  const envKey = envMap[key]
  if (envKey && process.env[envKey]) {
    const val = process.env[envKey]
    // Handle booleans
    if (val === 'true') return true
    if (val === 'false') return false
    // Handle numbers
    if (!isNaN(val)) return parseInt(val, 10)
    return val
  }

  // Check config file
  const fileConfig = loadConfigFile()
  if (key in fileConfig) {
    return fileConfig[key]
  }

  // Return default
  return DEFAULTS[key]
}

/**
 * Get all config
 */
function getAll() {
  const fileConfig = loadConfigFile()
  const config = { ...DEFAULTS, ...fileConfig }

  // Override with env vars
  for (const key of Object.keys(DEFAULTS)) {
    config[key] = get(key)
  }

  return config
}

/**
 * Save config to file
 */
function save(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  console.log(`Config saved to ${CONFIG_FILE}`)
}

/**
 * Initialize config interactively
 */
function init(options = {}) {
  const config = {
    workspace: options.workspace || DEFAULTS.workspace,
    chromaDb: options.chromaDb || DEFAULTS.chromaDb,
    venv: options.venv || DEFAULTS.venv,
    serverPort: options.serverPort || DEFAULTS.serverPort,
  }

  save(config)
  return config
}

/**
 * Show current config
 */
function show() {
  console.log('\nJasper Recall Configuration')
  console.log('===========================\n')
  console.log(`Config file: ${CONFIG_FILE}`)
  console.log(`Exists: ${fs.existsSync(CONFIG_FILE) ? 'yes' : 'no'}\n`)

  const config = getAll()
  for (const [key, value] of Object.entries(config)) {
    const source = process.env[`RECALL_${key.toUpperCase()}`]
      ? '(env)'
      : loadConfigFile()[key] !== undefined
        ? '(file)'
        : '(default)'
    console.log(`  ${key}: ${value} ${source}`)
  }
  console.log('')
}

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  DEFAULTS,
  get,
  getAll,
  save,
  init,
  show,
  loadConfigFile,
}
