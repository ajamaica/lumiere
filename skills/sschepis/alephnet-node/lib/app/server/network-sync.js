/**
 * Network Sync Module
 *
 * Handles seed node connections and memory/history synchronization.
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')
const { loggers, colors } = require('./utils')

const c = colors

/**
 * Creates network sync handlers
 * @param {Object} server - SentientServer instance
 * @returns {Object} Network sync methods
 */
function createNetworkSync(server) {
  /**
   * Fetch JSON from a seed node endpoint
   */
  async function fetchFromSeed(seedUrl, endpoint) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, seedUrl)
      const client = url.protocol === 'https:' ? https : http

      const req = client.get(url.href, { timeout: 10000 }, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data))
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`))
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`))
          }
        })
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Connection timeout'))
      })
    })
  }

  /**
   * Sync memory (thought traces) from seed node
   */
  async function syncMemoryFromSeed(seedUrl) {
    try {
      const memoryData = await fetchFromSeed(seedUrl, '/memory?count=20')

      if (memoryData.recent && Array.isArray(memoryData.recent)) {
        const imported = memoryData.recent.length
        loggers.node(`Importing ${imported} thought traces from seed`)

        // Import thought traces into local memory
        for (const trace of memoryData.recent) {
          // Use observer's memory to store
          if (server.observer && server.observer.memory) {
            // Create a minimal thought trace from the remote data
            server.observer.memory.importTrace({
              content: trace.content || trace.text,
              type: trace.type || 'imported',
              sourceNode: seedUrl,
              originalTimestamp: trace.timestamp,
              quaternion: trace.quaternion,
            })
          }
        }

        console.log(`   ${c.dim}   Imported ${imported} thought traces${c.reset}`)
      }
    } catch (error) {
      loggers.node(`Memory sync failed: ${error.message}`)
      console.log(`   ${c.yellow}   Memory sync skipped: ${error.message}${c.reset}`)
    }
  }

  /**
   * Sync conversation history from seed node
   */
  async function syncHistoryFromSeed(seedUrl) {
    try {
      const historyData = await fetchFromSeed(seedUrl, '/history')

      if (historyData.messages && Array.isArray(historyData.messages)) {
        const existing = server.conversationHistory.length
        const incoming = historyData.messages.length

        if (existing === 0 && incoming > 0) {
          // No local history, import from seed
          server.conversationHistory = historyData.messages.map((m) => ({
            ...m,
            sourceNode: seedUrl,
          }))
          server.saveConversationHistory()
          console.log(`   ${c.dim}   Imported ${incoming} conversation messages${c.reset}`)
          loggers.node(`Imported ${incoming} conversation messages from seed`)
        } else if (existing > 0) {
          console.log(`   ${c.dim}   Keeping local history (${existing} messages)${c.reset}`)
          loggers.node(`Kept local history, ${existing} messages`)
        }
      }
    } catch (error) {
      loggers.node(`History sync failed: ${error.message}`)
      console.log(`   ${c.yellow}   History sync skipped: ${error.message}${c.reset}`)
    }
  }

  /**
   * Connect to a single seed node
   */
  async function connectToSeed(seedUrl) {
    loggers.node(`Connecting to seed: ${seedUrl}`)
    console.log(`   ${c.dim}→ Connecting to ${seedUrl}...${c.reset}`)

    const connection = {
      url: seedUrl,
      status: 'connecting',
      connectedAt: null,
      lastSeen: null,
      nodeId: null,
      error: null,
    }
    server.outboundConnections.push(connection)

    try {
      // Step 1: Get node info from seed
      const nodeInfo = await fetchFromSeed(seedUrl, '/nodes')
      connection.nodeId = nodeInfo.nodeId
      loggers.node(`Seed node ID: ${nodeInfo.nodeId}`)
      console.log(`   ${c.dim}   Node ID: ${nodeInfo.nodeId}${c.reset}`)

      // Step 2: Sync memory from seed
      console.log(`   ${c.dim}   Syncing memory...${c.reset}`)
      await syncMemoryFromSeed(seedUrl)

      // Step 3: Sync conversation history
      console.log(`   ${c.dim}   Syncing conversation history...${c.reset}`)
      await syncHistoryFromSeed(seedUrl)

      // Mark as connected
      connection.status = 'connected'
      connection.connectedAt = Date.now()
      connection.lastSeen = Date.now()

      console.log(`   ${c.green}✓ Connected to ${seedUrl}${c.reset}`)
      loggers.node(`Connected to seed: ${seedUrl}`)
    } catch (error) {
      connection.status = 'failed'
      connection.error = error.message
      console.log(`   ${c.red}✗ Failed to connect to ${seedUrl}: ${error.message}${c.reset}`)
      loggers.node(`Failed to connect to ${seedUrl}: ${error.message}`)
    }
  }

  /**
   * Connect to all seed nodes and sync memory
   */
  async function connectToSeeds() {
    const seeds = server.options.seeds || []
    if (seeds.length === 0) {
      console.log(
        `${c.yellow}⚠ No seed nodes configured - running as standalone root node${c.reset}`,
      )
      loggers.node('Running as standalone root node')
      return
    }

    console.log(`${c.cyan}🌐 Connecting to ${seeds.length} seed node(s)...${c.reset}`)

    for (const seedUrl of seeds) {
      await connectToSeed(seedUrl)
    }

    // Summary
    const connected = server.outboundConnections.filter((c) => c.status === 'connected').length
    console.log(`${c.cyan}🌐 Connected to ${connected}/${seeds.length} seed nodes${c.reset}`)
  }

  return {
    connectToSeeds,
    connectToSeed,
    syncMemoryFromSeed,
    syncHistoryFromSeed,
    fetchFromSeed,
  }
}

module.exports = { createNetworkSync }
