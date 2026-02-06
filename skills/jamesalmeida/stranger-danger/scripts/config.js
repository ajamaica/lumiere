const fs = require('fs')
const os = require('os')
const path = require('path')

const CONFIG_DIR = path.join(os.homedir(), '.openclaw')
const CONFIG_PATH = path.join(CONFIG_DIR, 'stranger-danger.json')
const LEGACY_CONFIG_DIR = path.join(os.homedir(), '.clawdbot')
const LEGACY_CONFIG_PATH = path.join(LEGACY_CONFIG_DIR, 'stranger-danger.json')

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }
}

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
    return JSON.parse(raw)
  }
  if (fs.existsSync(LEGACY_CONFIG_PATH)) {
    const raw = fs.readFileSync(LEGACY_CONFIG_PATH, 'utf8')
    ensureDir()
    fs.writeFileSync(CONFIG_PATH, raw, { mode: 0o600 })
    return JSON.parse(raw)
  }
  return null
}

function saveConfig(config) {
  ensureDir()
  const data = JSON.stringify(config, null, 2)
  fs.writeFileSync(CONFIG_PATH, data, { mode: 0o600 })
}

function clearConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    fs.rmSync(CONFIG_PATH)
  }
}

module.exports = {
  CONFIG_PATH,
  loadConfig,
  saveConfig,
  clearConfig,
}
