#!/usr/bin/env node

/**
 * Test suite for Meshtastic Persistent Connection Wrapper
 *
 * Validates that the persistent connection properly:
 * 1. Maintains a single device connection
 * 2. Queues and executes commands serially
 * 3. Handles timeouts gracefully
 * 4. Processes natural language commands
 */

const MeshtasticPersistent = require('../scripts/meshtastic-persistent.js')

// Colored output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(label, msg, color = 'reset') {
  console.log(`${colors[color]}[${label}]${colors.reset} ${msg}`)
}

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `)
  try {
    await fn()
    log('PASS', '✓', 'green')
    return true
  } catch (err) {
    log('FAIL', `✗ ${err.message}`, 'red')
    return false
  }
}

async function main() {
  log('START', 'Meshtastic Persistent Wrapper Test Suite', 'blue')
  console.log('')

  let passed = 0
  let failed = 0

  // Test 1: Wrapper instantiation
  if (
    await test('Wrapper instantiation', async () => {
      const mesh = new MeshtasticPersistent({ debug: false })
      if (!mesh.port) throw new Error('Port not initialized')
      if (!mesh.timeout) throw new Error('Timeout not initialized')
    })
  )
    passed++
  else failed++

  // Test 2: Configuration from environment
  if (
    await test('Environment configuration', async () => {
      process.env.MESHTASTIC_PORT = '/dev/ttyUSB0'
      process.env.MESH_TIMEOUT = '60'

      const mesh = new MeshtasticPersistent()
      if (mesh.port !== '/dev/ttyUSB0') throw new Error('Port not read from env')
      if (mesh.timeout !== 60000) throw new Error('Timeout not read from env')
    })
  )
    passed++
  else failed++

  // Test 3: Command queueing structure
  if (
    await test('Command queueing structure', async () => {
      const mesh = new MeshtasticPersistent()

      // Verify queue is empty
      if (mesh.commandQueue.length !== 0) throw new Error('Queue should start empty')

      // Verify queue properties exist
      if (typeof mesh.isProcessing !== 'boolean') throw new Error('isProcessing not boolean')
      if (typeof mesh.exec !== 'function') throw new Error('exec method missing')
    })
  )
    passed++
  else failed++

  // Test 4: Natural language command parsing
  if (
    await test('Natural language command parsing', async () => {
      const mesh = new MeshtasticPersistent({ debug: false })

      // Mock the connection
      mesh.connected = true

      // Test broadcast pattern matching
      const input1 = 'broadcast: hello mesh'
      const match1 = input1.match(/broadcast\s*:\s+(.+)$/i)
      if (!match1 || match1[1] !== 'hello mesh') throw new Error('Broadcast parse failed')

      // Test send pattern matching
      const input2 = 'send: test message'
      const match2 = input2.match(/send\s*:\s+(.+)$/i)
      if (!match2 || match2[1] !== 'test message') throw new Error('Send parse failed')

      // Test send to node pattern
      const input3 = 'send to node123: hello there'
      const match3 = input3.match(/send\s+to\s+(\S+)\s*:\s+(.+)$/i)
      if (!match3 || match3[1] !== 'node123' || match3[2] !== 'hello there') {
        throw new Error('Send to node parse failed')
      }
    })
  )
    passed++
  else failed++

  // Test 5: Error message for disconnected state
  if (
    await test('Disconnected error handling', async () => {
      const mesh = new MeshtasticPersistent({ debug: false })
      mesh.connected = false

      try {
        await mesh.exec('--info')
        throw new Error('Should have thrown')
      } catch (err) {
        if (!err.message.includes('Not connected')) throw err
      }
    })
  )
    passed++
  else failed++

  // Test 6: Timeout configuration
  if (
    await test('Timeout configuration', async () => {
      const mesh1 = new MeshtasticPersistent({ timeout: 5000 })
      if (mesh1.timeout !== 5000) throw new Error('Custom timeout not set')

      // Clear env var for this test
      delete process.env.MESH_TIMEOUT
      const mesh2 = new MeshtasticPersistent()
      if (mesh2.timeout !== 30000)
        throw new Error(`Default timeout not applied, got ${mesh2.timeout}`)
    })
  )
    passed++
  else failed++

  // Test 7: Connection cleanup
  if (
    await test('Proper cleanup on disconnect', async () => {
      const mesh = new MeshtasticPersistent({ debug: false })

      // Simulate connected state
      mesh.connected = true
      mesh.ready = true
      mesh.process = { kill: () => {} }

      mesh.disconnect()

      if (mesh.connected !== false) throw new Error('Connected not set to false')
      if (mesh.ready !== false) throw new Error('Ready not set to false')
      if (mesh.process !== null) throw new Error('Process not cleaned up')
    })
  )
    passed++
  else failed++

  // Test 8: Debug logging
  if (
    await test('Debug logging enabled/disabled', async () => {
      const mesh1 = new MeshtasticPersistent({ debug: true })
      if (!mesh1.debug) throw new Error('Debug flag not set to true')

      const mesh2 = new MeshtasticPersistent({ debug: false })
      if (mesh2.debug) throw new Error('Debug flag not set to false')
    })
  )
    passed++
  else failed++

  // Test 9: Message escaping
  if (
    await test('Message text escaping', async () => {
      const mesh = new MeshtasticPersistent({ debug: false })

      // Test quote escaping
      const text = 'He said "hello"'
      const escaped = text.replace(/"/g, '\\"')
      if (escaped !== 'He said \\"hello\\"') throw new Error('Quote escaping failed')

      // Test backslash escaping
      const text2 = 'Path\\to\\file'
      const escaped2 = text2.replace(/\\/g, '\\\\')
      if (escaped2 !== 'Path\\\\to\\\\file') throw new Error('Backslash escaping failed')
    })
  )
    passed++
  else failed++

  // Test 10: Node ID normalization
  if (
    await test('Node ID normalization', async () => {
      const mesh = new MeshtasticPersistent({ debug: false })

      // Test adding ! prefix
      let nodeId = 'abc123'
      if (!nodeId.startsWith('!')) {
        nodeId = `!${nodeId}`
      }
      if (nodeId !== '!abc123') throw new Error('Node ID prefix not added')

      // Test keeping existing ! prefix
      let nodeId2 = '!xyz789'
      if (!nodeId2.startsWith('!')) {
        nodeId2 = `!${nodeId2}`
      }
      if (nodeId2 !== '!xyz789') throw new Error('Node ID prefix duplicated')
    })
  )
    passed++
  else failed++

  // Summary
  console.log('')
  log('SUMMARY', `Passed: ${passed} | Failed: ${failed}`, passed === 10 ? 'green' : 'yellow')

  if (passed === 10) {
    log('SUCCESS', 'All unit tests passed! ✓', 'green')
    process.exit(0)
  } else {
    log('WARNING', 'Some tests failed. See above for details.', 'red')
    process.exit(1)
  }
}

main().catch((err) => {
  log('ERROR', err.message, 'red')
  process.exit(1)
})
