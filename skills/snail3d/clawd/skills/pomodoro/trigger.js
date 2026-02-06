#!/usr/bin/env node
/**
 * Pomodoro Timer Skill - Trigger Script
 * Usage: node trigger.js [focus-minutes] [short-break] [long-break]
 */

const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')

const SKILL_DIR = path.dirname(__filename)
const TIMER_FILE = path.join(SKILL_DIR, 'timer.html')
const PORT = 8765

// Parse arguments
const focusTime = parseInt(process.argv[2]) || 25
const shortBreak = parseInt(process.argv[3]) || 5
const longBreak = parseInt(process.argv[4]) || 15

console.log(
  `🍅 Starting Pomodoro: ${focusTime}min focus / ${shortBreak}min short / ${longBreak}min long`,
)

// Read the HTML file
let html = fs.readFileSync(TIMER_FILE, 'utf8')

// Replace defaults with custom values
html = html.replace('value="25" min="1" max="60">', `value="${focusTime}" min="1" max="60">`)
html = html.replace('value="5" min="1" max="30">', `value="${shortBreak}" min="1" max="30">`)
html = html.replace('value="15" min="1" max="60">', `value="${longBreak}" min="1" max="60">`)

// Start server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(html)
})

server.listen(PORT, () => {
  console.log(`🍅 Timer running at http://localhost:${PORT}`)
  console.log('   Press Ctrl+C to stop')

  // Open browser
  try {
    execSync(`open http://localhost:${PORT}`, { timeout: 5000 })
  } catch (e) {
    console.log(`Open browser manually: http://localhost:${PORT}`)
  }
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping timer...')
  server.close(() => process.exit(0))
})
