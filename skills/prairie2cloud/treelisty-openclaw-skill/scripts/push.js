/**
 * TreeListy Push Module
 * Sends trees to a live TreeListy instance via WebSocket
 *
 * Copyright (c) 2024-2026 Prairie2Cloud LLC
 * Licensed under Apache-2.0
 */

const WebSocket = require('ws')

const DEFAULT_PORT = 3456
const CONNECT_TIMEOUT = 5000
const RESPONSE_TIMEOUT = 10000

/**
 * Push a tree to a running TreeListy instance
 *
 * @param {Object} tree - The tree JSON to push
 * @param {Object} options - Connection options
 * @param {number} options.port - WebSocket port (default: 3456)
 * @param {string} options.token - Session token for authentication
 * @param {string} options.host - Host address (default: localhost)
 * @returns {Promise<Object>} Result of the push operation
 */
async function push(tree, options = {}) {
  const { port = DEFAULT_PORT, token = null, host = 'localhost' } = options

  return new Promise((resolve, reject) => {
    const wsUrl = `ws://${host}:${port}`

    // Connection timeout
    const connectTimer = setTimeout(() => {
      ws.close()
      reject(
        new Error(`Connection timeout - is TreeListy running with MCP bridge on port ${port}?`),
      )
    }, CONNECT_TIMEOUT)

    const ws = new WebSocket(wsUrl)

    ws.on('open', () => {
      clearTimeout(connectTimer)

      // Send handshake with token if provided
      const handshake = {
        type: 'handshake',
        source: 'openclaw-skill',
        version: '1.0.0',
        token: token,
      }
      ws.send(JSON.stringify(handshake))
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())

        if (msg.type === 'handshake_ack') {
          // Handshake successful, send the tree
          const pushMessage = {
            type: 'mcp_request',
            id: `push_${Date.now()}`,
            method: 'tools/call',
            params: {
              name: 'load_tree',
              arguments: {
                tree: tree,
                source: 'openclaw-skill',
              },
            },
          }
          ws.send(JSON.stringify(pushMessage))

          // Set response timeout
          setTimeout(() => {
            ws.close()
            reject(
              new Error('Response timeout - tree may have been sent but no confirmation received'),
            )
          }, RESPONSE_TIMEOUT)
        } else if (msg.type === 'mcp_response') {
          ws.close()
          if (msg.error) {
            reject(new Error(msg.error.message || 'Push failed'))
          } else {
            resolve({
              success: true,
              message: 'Tree pushed to TreeListy successfully',
              treeId: tree.treeId || tree.id,
              nodeCount: countNodesQuick(tree),
            })
          }
        } else if (msg.type === 'error') {
          ws.close()
          reject(new Error(msg.message || 'Server error'))
        } else if (msg.type === 'handshake_reject') {
          ws.close()
          reject(new Error(msg.reason || 'Handshake rejected - check token'))
        }
      } catch (e) {
        // Non-JSON message, ignore
      }
    })

    ws.on('error', (err) => {
      clearTimeout(connectTimer)
      if (err.code === 'ECONNREFUSED') {
        reject(
          new Error(
            `Cannot connect to TreeListy at ${wsUrl}. Make sure TreeListy is open with MCP bridge enabled.`,
          ),
        )
      } else {
        reject(new Error(`WebSocket error: ${err.message}`))
      }
    })

    ws.on('close', () => {
      clearTimeout(connectTimer)
    })
  })
}

/**
 * Quick node count without full traversal
 */
function countNodesQuick(tree) {
  let count = 1
  if (tree.children) {
    for (const child of tree.children) {
      count += countNodesQuick(child)
    }
  }
  if (tree.items) {
    for (const item of tree.items) {
      count += countNodesQuick(item)
    }
  }
  if (tree.subtasks) {
    for (const subtask of tree.subtasks) {
      count += countNodesQuick(subtask)
    }
  }
  return count
}

/**
 * Check if TreeListy bridge is available
 */
async function checkConnection(options = {}) {
  const { port = DEFAULT_PORT, host = 'localhost' } = options

  return new Promise((resolve) => {
    const wsUrl = `ws://${host}:${port}`
    const ws = new WebSocket(wsUrl)

    const timer = setTimeout(() => {
      ws.close()
      resolve({ available: false, reason: 'timeout' })
    }, 2000)

    ws.on('open', () => {
      clearTimeout(timer)
      ws.close()
      resolve({ available: true })
    })

    ws.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        available: false,
        reason: err.code === 'ECONNREFUSED' ? 'not_running' : err.message,
      })
    })
  })
}

module.exports = {
  push,
  checkConnection,
}
