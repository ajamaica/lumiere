#!/usr/bin/env node

const cli = require('../src/cli')

const command = process.argv[2]

const commands = {
  setup: cli.setup,
  start: cli.start,
  stop: cli.stop,
  status: cli.status,
  logs: cli.logs,
  'install-daemon': cli.installDaemon,
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(`
🧠 Dual-Brain - Multi-LLM Perspective Synthesis for OpenClaw

Usage:
  dual-brain setup            Interactive configuration
  dual-brain start            Start daemon (foreground)
  dual-brain stop             Stop running daemon
  dual-brain status           Show status and config
  dual-brain logs             View recent logs
  dual-brain install-daemon   Install as system service (launchd/systemd)
  dual-brain help             Show this help

Examples:
  dual-brain setup            # First-time setup
  dual-brain start            # Run daemon
  dual-brain status           # Check if running

More info: https://github.com/yourusername/openclaw-dual-brain
`)
  process.exit(0)
}

const handler = commands[command]
if (!handler) {
  console.error(`Unknown command: ${command}`)
  console.log('Run "dual-brain help" for usage')
  process.exit(1)
}

// Handle both sync and async commands
Promise.resolve(handler()).catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
