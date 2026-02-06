#!/usr/bin/env node

/**
 * Meshtastic Direct CLI - Uses meshtastic CLI directly (no Mesh Master needed)
 */

const { execSync, spawn } = require('child_process')
const readline = require('readline')

class MeshtasticDirect {
  constructor() {
    this.port = process.env.MESHTASTIC_PORT || '/dev/tty.usbmodem21201'
    this.debug = process.env.MESH_DEBUG === 'true'
  }

  log(msg) {
    if (this.debug) console.log(`[Meshtastic] ${msg}`)
  }

  /**
   * Run meshtastic CLI command
   */
  exec(args) {
    try {
      const cmd = `meshtastic --port ${this.port} ${args}`
      this.log(`Running: ${cmd}`)
      const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 })
      return { success: true, output }
    } catch (e) {
      return { success: false, error: e.message || e.toString() }
    }
  }

  /**
   * Get all nodes
   */
  getNodes() {
    const result = this.exec('--nodes')
    if (result.success) {
      return `📡 Mesh Nodes:\n${result.output}`
    } else {
      return `❌ Failed to fetch nodes: ${result.error}`
    }
  }

  /**
   * Get device info
   */
  getInfo() {
    const result = this.exec('--info')
    if (result.success) {
      return `ℹ️ Device Info:\n${result.output}`
    } else {
      return `❌ Failed: ${result.error}`
    }
  }

  /**
   * Send message
   */
  sendMessage(destination, text, channel = 0) {
    // Format: meshtastic --sendtext "message" --dest !abc123 --ch-index 0
    let cmd = `--sendtext "${text}"`

    // Handle destination
    if (destination === 'broadcast' || destination === 'all' || destination === '^all') {
      // Broadcast - no --dest needed
    } else if (destination.startsWith('!')) {
      cmd += ` --dest ${destination}`
    } else {
      // Try as short name
      cmd += ` --dest ${destination}`
    }

    if (channel !== 0) {
      cmd += ` --ch-index ${channel}`
    }

    const result = this.exec(cmd)
    if (result.success) {
      return `✅ Message sent to ${destination}`
    } else {
      return `❌ Failed: ${result.error}`
    }
  }

  /**
   * Get radio config
   */
  getConfig() {
    const result = this.exec('--get lora')
    if (result.success) {
      return `📻 LoRa Config:\n${result.output}`
    }

    const result2 = this.exec('--get device')
    if (result2.success) {
      return `📻 Device Config:\n${result2.output}`
    }

    return '❌ Failed to get config'
  }

  /**
   * Set config value
   */
  setSetting(path, value) {
    const result = this.exec(`--set ${path} ${value}`)
    if (result.success) {
      return `✅ Set ${path} = ${value}\n${result.output}`
    } else {
      return `❌ Failed: ${result.error}`
    }
  }

  /**
   * Parse natural language command
   */
  async process(input) {
    const lower = input.toLowerCase().trim()

    // Show nodes
    if (lower.includes('node') || lower.includes('show') || lower.includes('list')) {
      return this.getNodes()
    }

    // Device info
    if (lower.includes('info') || lower.includes('status')) {
      return this.getInfo()
    }

    // Send message
    if (
      lower.includes('send') ||
      lower.includes('msg') ||
      lower.includes('broadcast') ||
      lower.startsWith('/')
    ) {
      // Try: "broadcast: message"
      let match = input.match(/broadcast\s*:\s+(.+)$/i)
      if (match) {
        return this.sendMessage('broadcast', match[1])
      }

      // Try: "send: message"
      match = input.match(/send\s*:\s+(.+)$/i)
      if (match) {
        return this.sendMessage('broadcast', match[1])
      }

      // Try: "/message"
      match = input.match(/^\/(.+)$/)
      if (match) {
        return this.sendMessage('broadcast', match[1])
      }

      return 'Format: "broadcast: hello" or "send: message"'
    }

    // Config
    if (lower.includes('config') || lower.includes('set ')) {
      if (lower.includes('show')) {
        return this.getConfig()
      }

      // Parse "set lora.region to US"
      const match = input.match(/set\s+(\S+)\s+(?:to\s+)?(.+)$/i)
      if (match) {
        return this.setSetting(match[1], match[2])
      }
      return 'Format: "set lora.region to US"'
    }

    return 'Unknown command. Try: nodes, info, send, config'
  }
}

// Interactive mode
async function interactive() {
  const cli = new MeshtasticDirect()

  console.log('🤖 Meshtastic Direct CLI\n')
  console.log(`Port: ${cli.port}\n`)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  })

  rl.prompt()

  rl.on('line', async (line) => {
    if (line.toLowerCase() === 'exit') {
      rl.close()
      process.exit(0)
    }

    const result = await cli.process(line)
    console.log(result)
    console.log('')
    rl.prompt()
  })
}

// CLI mode: single command
if (process.argv.length > 2) {
  const command = process.argv.slice(2).join(' ')
  const cli = new MeshtasticDirect()
  cli.process(command).then((result) => {
    console.log(result)
  })
} else {
  interactive()
}
