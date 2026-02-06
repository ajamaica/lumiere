#!/usr/bin/env node
/**
 * P2P Communication CLI wrapper.
 * Delegates to the compiled plugin at ../../../dist/index.js
 *
 * Environment variables:
 *   P2P_RELAY_URL   - Relay server URL (default: http://relay:5050)
 *   P2P_API_KEY     - Relay API key
 *   P2P_AGENT_ID    - This agent's ID
 *   P2P_AGENT_NAME  - This agent's display name
 */

const path = require('path')
const { execFileSync } = require('child_process')

const pluginDir = path.resolve(__dirname, '..', '..')
const entry = path.join(pluginDir, 'dist', 'index.js')
const args = process.argv.slice(2)

try {
  const result = execFileSync('node', [entry, ...args], {
    env: process.env,
    encoding: 'utf-8',
    timeout: 30000,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  process.stdout.write(result)
} catch (err) {
  if (err.stdout) process.stdout.write(err.stdout)
  if (err.stderr) process.stderr.write(err.stderr)
  process.exit(err.status || 1)
}
