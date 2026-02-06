#!/usr/bin/env node
const fs = require('fs')
const readline = require('readline')
const { execSync, spawn } = require('child_process')
const { loadConfig, saveConfig, getConfigPath, getConfigDir } = require('./config')

const PROVIDERS = {
  ollama: { name: 'Ollama (local, zero cost)', defaultModel: 'llama3.2', needsKey: false },
  moonshot: { name: 'Moonshot/Kimi', defaultModel: 'moonshot-v1-auto', needsKey: true },
  openai: { name: 'OpenAI', defaultModel: 'gpt-4o', needsKey: true },
  groq: { name: 'Groq (fast)', defaultModel: 'llama-3.3-70b-versatile', needsKey: true },
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function setup() {
  console.log('🧠 Dual-Brain Setup\n')

  const config = loadConfig()

  // Choose provider
  console.log('Available providers:')
  Object.entries(PROVIDERS).forEach(([key, info], idx) => {
    console.log(`  ${idx + 1}. ${info.name}`)
  })

  const providerChoice = (await ask('\nSelect provider (1-4) [default: 1]: ')) || '1'
  const providerKey = Object.keys(PROVIDERS)[parseInt(providerChoice) - 1]
  const provider = PROVIDERS[providerKey]

  if (!provider) {
    console.error('Invalid choice')
    process.exit(1)
  }

  config.provider = providerKey

  // Set model
  const model = (await ask(`Model [default: ${provider.defaultModel}]: `)) || provider.defaultModel
  config.model = model

  // API key if needed
  if (provider.needsKey) {
    const apiKey = await ask('API Key: ')
    if (!apiKey) {
      console.error('API key required for this provider')
      process.exit(1)
    }
    config.apiKey = apiKey
  } else {
    config.apiKey = ''
  }

  // Owner IDs (optional)
  const ownerIds = await ask('Owner Discord IDs (comma-separated, leave empty for all): ')
  if (ownerIds) {
    config.ownerIds = ownerIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  }

  // Poll interval
  const pollInterval = await ask(`Poll interval (ms) [default: ${config.pollInterval}]: `)
  if (pollInterval) {
    config.pollInterval = parseInt(pollInterval) || 10000
  }

  // Engram integration
  const engramChoice = (await ask('Enable Engram integration? (y/n) [default: y]: ')) || 'y'
  config.engramIntegration = engramChoice.toLowerCase() === 'y'

  saveConfig(config)

  console.log('\n✅ Configuration saved to:', getConfigPath())
  console.log('\nStart daemon with: dual-brain start')
}

function status() {
  const config = loadConfig()

  console.log('🧠 Dual-Brain Status\n')
  console.log('Configuration:')
  console.log(`  Provider: ${config.provider}`)
  console.log(`  Model: ${config.model}`)
  console.log(`  Poll Interval: ${config.pollInterval}ms`)
  console.log(`  Perspectives Dir: ${config.perspectiveDir}`)
  console.log(`  Engram Integration: ${config.engramIntegration ? 'enabled' : 'disabled'}`)

  // Check if daemon is running
  if (fs.existsSync(config.pidFile)) {
    try {
      const pid = fs.readFileSync(config.pidFile, 'utf-8').trim()
      process.kill(parseInt(pid), 0) // Test if process exists
      console.log(`\n✅ Daemon running (PID: ${pid})`)
    } catch {
      console.log('\n❌ Daemon not running (stale PID file)')
      fs.unlinkSync(config.pidFile)
    }
  } else {
    console.log('\n❌ Daemon not running')
  }

  // Show last perspective if exists
  const perspectiveFiles = fs.existsSync(config.perspectiveDir)
    ? fs.readdirSync(config.perspectiveDir).filter((f) => f.endsWith('-latest.md'))
    : []

  if (perspectiveFiles.length > 0) {
    console.log(`\nLast perspectives (${perspectiveFiles.length}):`)
    perspectiveFiles.slice(0, 3).forEach((file) => {
      const content = fs.readFileSync(`${config.perspectiveDir}/${file}`, 'utf-8')
      const preview = content.split('\n').slice(1, 2).join(' ').slice(0, 80)
      console.log(`  ${file}: ${preview}...`)
    })
  }
}

function start() {
  const config = loadConfig()

  // Check if already running
  if (fs.existsSync(config.pidFile)) {
    try {
      const pid = fs.readFileSync(config.pidFile, 'utf-8').trim()
      process.kill(parseInt(pid), 0)
      console.error('❌ Daemon already running (PID:', pid + ')')
      process.exit(1)
    } catch {
      // Stale PID file
      fs.unlinkSync(config.pidFile)
    }
  }

  console.log('🧠 Starting Dual-Brain daemon...')

  // Run daemon
  require('./daemon')
}

function stop() {
  const config = loadConfig()

  if (!fs.existsSync(config.pidFile)) {
    console.log('❌ Daemon not running')
    return
  }

  try {
    const pid = fs.readFileSync(config.pidFile, 'utf-8').trim()
    process.kill(parseInt(pid), 'SIGTERM')
    console.log('✅ Daemon stopped (PID:', pid + ')')

    // Wait a bit and clean up PID file
    setTimeout(() => {
      if (fs.existsSync(config.pidFile)) {
        fs.unlinkSync(config.pidFile)
      }
    }, 1000)
  } catch (e) {
    console.error('❌ Failed to stop daemon:', e.message)
    // Clean up stale PID file
    if (fs.existsSync(config.pidFile)) {
      fs.unlinkSync(config.pidFile)
    }
  }
}

function logs() {
  const config = loadConfig()

  if (!fs.existsSync(config.logFile)) {
    console.log('No logs yet')
    return
  }

  // Tail last 50 lines
  try {
    const content = fs.readFileSync(config.logFile, 'utf-8')
    const lines = content.split('\n').slice(-50)
    console.log(lines.join('\n'))
  } catch (e) {
    console.error('Failed to read logs:', e.message)
  }
}

function installDaemon() {
  const platform = process.platform

  if (platform === 'darwin') {
    installMacOS()
  } else if (platform === 'linux') {
    installLinux()
  } else {
    console.error('❌ Unsupported platform:', platform)
    console.log('Manual installation required')
    process.exit(1)
  }
}

function installMacOS() {
  const plistPath = `${process.env.HOME}/Library/LaunchAgents/com.dual-brain.plist`
  const nodePath = execSync('which node').toString().trim()
  const cliPath = execSync('which dual-brain').toString().trim()

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dual-brain</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${cliPath}</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${getConfigDir()}/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>${getConfigDir()}/launchd.error.log</string>
</dict>
</plist>`

  fs.writeFileSync(plistPath, plist)
  console.log('✅ LaunchAgent installed:', plistPath)

  try {
    execSync(`launchctl load ${plistPath}`)
    console.log('✅ Service loaded and started')
  } catch (e) {
    console.error('❌ Failed to load service:', e.message)
  }
}

function installLinux() {
  const servicePath = '/etc/systemd/system/dual-brain.service'
  const nodePath = execSync('which node').toString().trim()
  const cliPath = execSync('which dual-brain').toString().trim()

  const service = `[Unit]
Description=Dual-Brain Daemon
After=network.target

[Service]
Type=simple
User=${process.env.USER}
ExecStart=${nodePath} ${cliPath} start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`

  try {
    fs.writeFileSync(servicePath, service)
    console.log('✅ Systemd service installed:', servicePath)

    execSync('sudo systemctl daemon-reload')
    execSync('sudo systemctl enable dual-brain')
    execSync('sudo systemctl start dual-brain')
    console.log('✅ Service enabled and started')
  } catch (e) {
    console.error('❌ Failed to install service:', e.message)
    console.log('\nManual installation:')
    console.log(`  sudo nano ${servicePath}`)
    console.log('  sudo systemctl daemon-reload')
    console.log('  sudo systemctl enable dual-brain')
    console.log('  sudo systemctl start dual-brain')
  }
}

module.exports = {
  setup,
  status,
  start,
  stop,
  logs,
  installDaemon,
}
