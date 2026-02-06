#!/usr/bin/env node
/**
 * ⚠️ DEPRECATION NOTICE ⚠️
 * This script is a COMPATIBILITY ALIAS.
 * 'feishu-message' should be used for complex operations (get, merge-forward).
 * For sending standard messages, use 'feishu-post' (RichText) or 'feishu-card'.
 *
 * This script forwards all arguments to 'skills/feishu-post/send.js'.
 */

const { spawn } = require('child_process')
const path = require('path')

// ANSI Colors
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

console.error(
  `${YELLOW}⚠️  [Evolution System] Redirecting 'feishu-message/send.js' -> 'feishu-post/send.js'...${RESET}`,
)

const targetScript = path.resolve(__dirname, '../feishu-post/send.js')
const args = process.argv.slice(2)

const child = spawn('node', [targetScript, ...args], {
  stdio: 'inherit',
})

child.on('exit', (code) => {
  process.exit(code)
})
child.on('error', (err) => {
  console.error('Failed to spawn child process:', err)
  process.exit(1)
})
