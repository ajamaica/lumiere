#!/usr/bin/env node
/**
 * Jasper Recall CLI
 * Local RAG system for AI agent memory
 *
 * Usage:
 *   npx jasper-recall setup     # Install dependencies and create scripts
 *   npx jasper-recall recall    # Run a query (alias)
 *   npx jasper-recall index     # Index files (alias)
 *   npx jasper-recall digest    # Digest sessions (alias)
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Read version from package.json
const packageJson = require('../package.json')
const VERSION = packageJson.version

// Check for updates in background (non-blocking)
const { checkInBackground } = require('./update-check')
checkInBackground()
const VENV_PATH = path.join(os.homedir(), '.openclaw', 'rag-env')
const CHROMA_PATH = path.join(os.homedir(), '.openclaw', 'chroma-db')
const BIN_PATH = path.join(os.homedir(), '.local', 'bin')
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts')

function log(msg) {
  console.log(`🦊 ${msg}`)
}

function error(msg) {
  console.error(`❌ ${msg}`)
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', ...opts })
  } catch (e) {
    if (!opts.ignoreError) {
      error(`Command failed: ${cmd}`)
      process.exit(1)
    }
    return null
  }
}

function setup() {
  log('Jasper Recall — Setup')
  console.log('='.repeat(40))

  // Check Python
  log('Checking Python...')
  let python = 'python3'
  try {
    const version = execSync(`${python} --version`, { encoding: 'utf8' })
    console.log(`  ✓ ${version.trim()}`)
  } catch {
    error('Python 3 is required. Install it first.')
    process.exit(1)
  }

  // Create venv
  log('Creating Python virtual environment...')
  fs.mkdirSync(path.dirname(VENV_PATH), { recursive: true })
  if (!fs.existsSync(VENV_PATH)) {
    run(`${python} -m venv ${VENV_PATH}`)
    console.log(`  ✓ Created: ${VENV_PATH}`)
  } else {
    console.log(`  ✓ Already exists: ${VENV_PATH}`)
  }

  // Install Python dependencies
  log('Installing Python dependencies (this may take a minute)...')
  const pip = path.join(VENV_PATH, 'bin', 'pip')
  run(`${pip} install --quiet chromadb sentence-transformers`)
  console.log('  ✓ Installed: chromadb, sentence-transformers')

  // Create bin directory
  fs.mkdirSync(BIN_PATH, { recursive: true })

  // Copy scripts
  log('Installing CLI scripts...')

  const scripts = [
    { src: 'recall.py', dest: 'recall', shebang: `#!${path.join(VENV_PATH, 'bin', 'python3')}` },
    {
      src: 'index-digests.py',
      dest: 'index-digests',
      shebang: `#!${path.join(VENV_PATH, 'bin', 'python3')}`,
    },
    { src: 'digest-sessions.sh', dest: 'digest-sessions', shebang: '#!/bin/bash' },
    {
      src: 'summarize-old.py',
      dest: 'summarize-old',
      shebang: `#!${path.join(VENV_PATH, 'bin', 'python3')}`,
    },
  ]

  for (const script of scripts) {
    const srcPath = path.join(SCRIPTS_DIR, script.src)
    const destPath = path.join(BIN_PATH, script.dest)

    let content = fs.readFileSync(srcPath, 'utf8')

    // Replace generic shebang with specific one for Python scripts
    if (script.src.endsWith('.py')) {
      content = content.replace(/^#!.*python3?\n/, script.shebang + '\n')
    }

    fs.writeFileSync(destPath, content)
    fs.chmodSync(destPath, 0o755)
    console.log(`  ✓ Installed: ${destPath}`)
  }

  // Create chroma directory
  fs.mkdirSync(CHROMA_PATH, { recursive: true })

  // Verify PATH
  const pathEnv = process.env.PATH || ''
  if (!pathEnv.includes(BIN_PATH)) {
    console.log('')
    log('Add to your PATH (add to ~/.bashrc or ~/.zshrc):')
    console.log(`  export PATH="$HOME/.local/bin:$PATH"`)
  }

  console.log('')
  console.log('='.repeat(40))
  log('Setup complete!')
  console.log('')
  console.log('Next steps:')
  console.log('  1. index-digests     # Index your memory files')
  console.log('  2. recall "query"    # Search your memory')
  console.log('  3. digest-sessions   # Process session logs')
}

function showHelp() {
  console.log(`
Jasper Recall v${VERSION}
Local RAG system for AI agent memory

USAGE:
  npx jasper-recall <command>

COMMANDS:
  setup       Install dependencies and CLI scripts
  doctor      Run system health check
  recall      Search your memory (alias for the recall command)
  index       Index memory files (alias for index-digests)
  digest      Process session logs (alias for digest-sessions)
  summarize   Compress old entries to save tokens (alias for summarize-old)
  serve       Start HTTP API server (for sandboxed agents)
  config      Show or set configuration
  update      Check for updates
  help        Show this help message

CONFIGURATION:
  Config file: ~/.jasper-recall/config.json
  
  Environment variables (override config file):
    RECALL_WORKSPACE   Memory workspace path
    RECALL_CHROMA_DB   ChromaDB storage path
    RECALL_VENV        Python venv path
    RECALL_PORT        Server port (default: 3458)
    RECALL_HOST        Server host (default: 127.0.0.1)

EXAMPLES:
  npx jasper-recall setup
  recall "what did we discuss yesterday"
  index-digests
  digest-sessions --dry-run
  npx jasper-recall serve --port 3458
`)
}

// Main
const command = process.argv[2]

switch (command) {
  case 'setup':
    setup()
    break
  case 'recall':
    // Pass through to recall script
    const recallScript = path.join(BIN_PATH, 'recall')
    if (fs.existsSync(recallScript)) {
      const args = process.argv.slice(3)
      spawn(recallScript, args, { stdio: 'inherit' })
    } else {
      error('Run "npx jasper-recall setup" first')
    }
    break
  case 'index':
    const indexScript = path.join(BIN_PATH, 'index-digests')
    if (fs.existsSync(indexScript)) {
      spawn(indexScript, [], { stdio: 'inherit' })
    } else {
      error('Run "npx jasper-recall setup" first')
    }
    break
  case 'digest':
    const digestScript = path.join(BIN_PATH, 'digest-sessions')
    if (fs.existsSync(digestScript)) {
      const args = process.argv.slice(3)
      spawn(digestScript, args, { stdio: 'inherit' })
    } else {
      error('Run "npx jasper-recall setup" first')
    }
    break
  case 'summarize':
    const summarizeScript = path.join(BIN_PATH, 'summarize-old')
    if (fs.existsSync(summarizeScript)) {
      const args = process.argv.slice(3)
      spawn(summarizeScript, args, { stdio: 'inherit' })
    } else {
      error('Run "npx jasper-recall setup" first')
    }
    break
  case 'serve':
  case 'server':
    // Start the HTTP server for sandboxed agents
    const { runCLI } = require('./server')
    runCLI(process.argv.slice(3))
    break
  case 'update':
  case 'check-update':
    // Check for updates explicitly
    const { checkForUpdates } = require('./update-check')
    checkForUpdates().then((result) => {
      if (result && !result.updateAvailable) {
        console.log(`✓ You're on the latest version (${result.current})`)
      } else if (!result) {
        console.log('Could not check for updates')
      }
    })
    break
  case 'doctor':
    // Run system health check
    const { runDoctor } = require('./doctor')
    process.exit(runDoctor())
    break
  case 'config':
    // Configuration management
    const config = require('./config')
    const configArg = process.argv[3]
    if (configArg === 'init') {
      config.init()
    } else if (configArg === 'path') {
      console.log(config.CONFIG_FILE)
    } else {
      config.show()
    }
    break
  case '--version':
  case '-v':
    console.log(VERSION)
    break
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp()
    break
  default:
    error(`Unknown command: ${command}`)
    showHelp()
    process.exit(1)
}
