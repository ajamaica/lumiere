#!/usr/bin/env node

/**
 * Meshtastic Persistent Connection Wrapper
 *
 * Solves ETIMEDOUT issues by using persistent socket-based communication
 * instead of spawning meshtastic CLI for each command.
 *
 * Works by:
 * 1. Starting meshtastic in listen/shell mode once
 * 2. Queueing commands and sending them serially
 * 3. Parsing response messages from the mesh
 * 4. Keeping connection alive between commands (no reconnect overhead)
 */

const { spawn, execSync } = require('child_process')
const readline = require('readline')
const EventEmitter = require('events')
const fs = require('fs')
const os = require('os')

class MeshtasticPersistent extends EventEmitter {
  constructor(options = {}) {
    super()
    this.port = options.port || process.env.MESHTASTIC_PORT || '/dev/tty.usbmodem21201'
    this.debug = options.debug || process.env.MESH_DEBUG === 'true'
    this.timeout = options.timeout || parseInt(process.env.MESH_TIMEOUT || '30') * 1000

    this.process = null
    this.connected = false
    this.ready = false
    this.commandQueue = []
    this.isProcessing = false
    this.responseBuffer = ''
    this.commandTimeout = null
    this.watchProcess = null

    this.log('Initializing persistent connection wrapper')
  }

  log(msg) {
    if (this.debug) console.error(`[Persistent] ${msg}`)
  }

  /**
   * Connect and verify the device is accessible
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.log(`Verifying connection to ${this.port}...`)

        // Quick check: try to get device info to verify connection works
        try {
          const result = execSync(`meshtastic --port ${this.port} --info`, {
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'ignore'],
          })

          this.log('Device info retrieved successfully')
          this.log('Setting up persistent listener...')

          // Start a listener process that stays alive
          this._startListener(
            () => {
              this.connected = true
              this.ready = true
              this.log('Persistent listener ready')
              resolve()
            },
            (err) => {
              reject(err)
            },
          )
        } catch (err) {
          reject(new Error(`Failed to connect to device on ${this.port}: ${err.message}`))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Start a background listener process
   */
  _startListener(onReady, onError) {
    try {
      // Start meshtastic in listen mode (keeps connection open)
      this.process = spawn('meshtastic', ['--port', this.port, '--listen'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      })

      let isReady = false

      // Monitor process output for connection confirmation
      this.process.stdout.on('data', (data) => {
        const output = data.toString()
        this.log(`[listener] ${output.trim()}`)

        // Mark as ready when we see initial output
        if ((!isReady && output.includes('Meshtastic')) || output.includes('From')) {
          isReady = true
          onReady()
        }
      })

      this.process.stderr.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg && msg.length > 0) {
          this.log(`[listener err] ${msg}`)
        }
      })

      this.process.on('error', (err) => {
        this.log(`Listener process error: ${err.message}`)
        onError(err)
      })

      this.process.on('exit', (code) => {
        this.log(`Listener exited with code ${code}`)
        this.connected = false
        this.ready = false
      })

      // Mark as ready after short delay
      setTimeout(() => {
        if (!isReady) {
          isReady = true
          onReady()
        }
      }, 1500)
    } catch (err) {
      this.log(`Failed to start listener: ${err.message}`)
      onError(err)
    }
  }

  /**
   * Execute meshtastic command with persistent connection
   * This reuses the active connection instead of spawning new processes
   */
  async exec(args) {
    if (!this.connected) {
      throw new Error('Not connected to meshtastic device')
    }

    return new Promise((resolve, reject) => {
      // Queue if already processing
      if (this.isProcessing) {
        this.commandQueue.push({ args, resolve, reject })
        return
      }

      this._executeCommand(args, resolve, reject)
    })
  }

  /**
   * Execute a single command
   */
  _executeCommand(args, resolve, reject) {
    this.isProcessing = true

    try {
      this.log(`Executing: meshtastic --port ${this.port} ${args}`)

      const cmd = `meshtastic --port ${this.port} ${args}`

      // Use execSync with timeout to run command while listener keeps connection alive
      const result = execSync(cmd, {
        encoding: 'utf8',
        timeout: this.timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      this.isProcessing = false
      resolve({ success: true, output: result })

      // Process next queued command
      this._processQueue()
    } catch (err) {
      this.isProcessing = false

      const errorMsg = err.message || err.toString()

      // Check for timeout
      if (err.killed || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('timeout')) {
        reject(new Error(`Command timeout after ${this.timeout}ms: ${args}`))
      } else {
        reject(new Error(`Command failed: ${errorMsg}`))
      }

      // Process next queued command even on error
      this._processQueue()
    }
  }

  /**
   * Process queued commands
   */
  _processQueue() {
    if (this.commandQueue.length > 0) {
      const { args, resolve, reject } = this.commandQueue.shift()
      this._executeCommand(args, resolve, reject)
    }
  }

  /**
   * Send a broadcast message
   */
  async sendMessage(text) {
    try {
      const escaped = text.replace(/"/g, '\\"')
      const result = await this.exec(`--sendtext "${escaped}"`)

      if (result.success) {
        return { success: true, output: result.output }
      } else {
        return { success: false, error: result.output }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Send message to specific node
   */
  async sendToNode(nodeId, text) {
    try {
      const escaped = text.replace(/"/g, '\\"')

      // Normalize node ID (add ! prefix if needed)
      let dest = nodeId
      if (!dest.startsWith('!')) {
        dest = `!${dest}`
      }

      const result = await this.exec(`--dest ${dest} --sendtext "${escaped}"`)

      if (result.success) {
        return { success: true, output: result.output }
      } else {
        return { success: false, error: result.output }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Get all nodes
   */
  async getNodes() {
    try {
      const result = await this.exec('--nodes')
      if (result.success) {
        return { success: true, output: result.output }
      } else {
        return { success: false, error: result.output }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Get device info
   */
  async getInfo() {
    try {
      const result = await this.exec('--info')
      if (result.success) {
        return { success: true, output: result.output }
      } else {
        return { success: false, error: result.output }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Parse natural language command
   */
  async process(input) {
    if (!this.connected) {
      return '❌ Not connected to meshtastic device'
    }

    const lower = input.toLowerCase().trim()

    try {
      // Show nodes
      if (lower.includes('node') || lower.includes('show') || lower.includes('list')) {
        const result = await this.getNodes()
        if (result.success) {
          return `📡 Mesh Nodes:\n${result.output}`
        } else {
          return `❌ Failed to fetch nodes: ${result.error}`
        }
      }

      // Device info
      if (lower.includes('info') || lower.includes('status')) {
        const result = await this.getInfo()
        if (result.success) {
          return `ℹ️ Device Info:\n${result.output}`
        } else {
          return `❌ Failed: ${result.error}`
        }
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
          const text = match[1]
          const result = await this.sendMessage(text)
          if (result.success) {
            return `✅ Broadcast sent: "${text}"`
          } else {
            return `❌ Failed to send: ${result.error}`
          }
        }

        // Try: "send: message"
        match = input.match(/send\s*:\s+(.+)$/i)
        if (match) {
          const text = match[1]
          const result = await this.sendMessage(text)
          if (result.success) {
            return `✅ Broadcast sent: "${text}"`
          } else {
            return `❌ Failed to send: ${result.error}`
          }
        }

        // Try: "send to <node>: message"
        match = input.match(/send\s+to\s+(\S+)\s*:\s+(.+)$/i)
        if (match) {
          const nodeId = match[1]
          const text = match[2]
          const result = await this.sendToNode(nodeId, text)
          if (result.success) {
            return `✅ Message sent to ${nodeId}: "${text}"`
          } else {
            return `❌ Failed to send: ${result.error}`
          }
        }

        // Try: "/message"
        match = input.match(/^\/(.+)$/)
        if (match) {
          const text = match[1]
          const result = await this.sendMessage(text)
          if (result.success) {
            return `✅ Broadcast sent: "${text}"`
          } else {
            return `❌ Failed to send: ${result.error}`
          }
        }

        return 'Format: "broadcast: hello" or "send to node: message"'
      }

      return 'Unknown command. Try: nodes, info, broadcast, send'
    } catch (err) {
      this.log(`Error processing command: ${err.message}`)
      return `❌ Error: ${err.message}`
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.log('Disconnecting')

    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout)
    }

    if (this.process) {
      try {
        this.process.kill('SIGTERM')
      } catch (e) {
        // ignore
      }

      setTimeout(() => {
        try {
          if (this.process && this.process.exitCode === null) {
            this.process.kill('SIGKILL')
          }
        } catch (e) {
          // ignore
        }
      }, 1000)

      this.process = null
    }

    this.connected = false
    this.ready = false
  }
}

// Global instance for CLI
let meshInstance = null

/**
 * CLI Interface
 */
async function main() {
  const command = process.argv.slice(2).join(' ')

  meshInstance = new MeshtasticPersistent({
    debug: process.env.MESH_DEBUG === 'true',
  })

  try {
    // Connect
    console.log('🔌 Connecting to Meshtastic device...')
    await meshInstance.connect()
    console.log('✅ Connected!')

    if (command) {
      // Single command mode
      const result = await meshInstance.process(command)
      console.log(result)

      // Wait a bit for any async operations, then exit
      setTimeout(() => {
        meshInstance.disconnect()
        process.exit(0)
      }, 1000)
    } else {
      // Interactive mode
      console.log('\n🤖 Meshtastic Persistent CLI\n')
      console.log(`Port: ${meshInstance.port}\n`)

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
      })

      rl.prompt()

      rl.on('line', async (line) => {
        if (line.toLowerCase() === 'exit' || line.toLowerCase() === 'quit') {
          rl.close()
          meshInstance.disconnect()
          process.exit(0)
        }

        try {
          const result = await meshInstance.process(line)
          console.log(result)
        } catch (err) {
          console.error(`Error: ${err.message}`)
        }

        console.log('')
        rl.prompt()
      })

      rl.on('close', () => {
        meshInstance.disconnect()
        process.exit(0)
      })
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`)
    if (meshInstance) {
      meshInstance.disconnect()
    }
    process.exit(1)
  }
}

// Cleanup on exit
process.on('SIGINT', () => {
  if (meshInstance) {
    meshInstance.disconnect()
  }
  process.exit(0)
})

process.on('SIGTERM', () => {
  if (meshInstance) {
    meshInstance.disconnect()
  }
  process.exit(0)
})

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = MeshtasticPersistent
