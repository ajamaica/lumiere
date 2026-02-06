const { spawn } = require('child_process')
const path = require('path')

// Wrapper for backward compatibility
const script = path.join(__dirname, 'download.js')
const args = process.argv.slice(2)

const child = spawn('node', [script, ...args], { stdio: 'inherit' })

child.on('exit', (code) => {
  process.exit(code)
})
