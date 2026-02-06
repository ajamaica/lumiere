/**
 * Jasper Recall Doctor
 * System health check for RAG dependencies
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const VENV_PATH = path.join(os.homedir(), '.openclaw', 'rag-env')
const CHROMA_PATH = path.join(os.homedir(), '.openclaw', 'chroma-db')
const MEMORY_PATH = path.join(os.homedir(), '.openclaw', 'workspace', 'memory')

function exec(cmd, opts = {}) {
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: opts.silent !== false ? 'pipe' : 'inherit',
      ...opts,
    })
    return { success: true, output: result.trim() }
  } catch (e) {
    return { success: false, output: e.message, stderr: e.stderr?.toString() }
  }
}

function checkVersion(requirement, actual) {
  const reqParts = requirement.replace('>=', '').split('.').map(Number)
  const actParts = actual.split('.').map(Number)

  for (let i = 0; i < reqParts.length; i++) {
    if (actParts[i] > reqParts[i]) return true
    if (actParts[i] < reqParts[i]) return false
  }
  return true
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}

function getLastIndexTime() {
  try {
    if (!fs.existsSync(CHROMA_PATH)) return null

    const files = fs.readdirSync(CHROMA_PATH, { recursive: true })
    let latestMtime = 0

    for (const file of files) {
      const fullPath = path.join(CHROMA_PATH, file)
      const stats = fs.statSync(fullPath)
      if (stats.isFile() && stats.mtimeMs > latestMtime) {
        latestMtime = stats.mtimeMs
      }
    }

    if (latestMtime === 0) return null
    return Date.now() - latestMtime
  } catch (e) {
    return null
  }
}

function countCollections() {
  try {
    if (!fs.existsSync(CHROMA_PATH)) return 0

    const sqliteFile = path.join(CHROMA_PATH, 'chroma.sqlite3')
    if (!fs.existsSync(sqliteFile)) return 0

    // Try to count collections from the database
    const result = exec(`sqlite3 "${sqliteFile}" "SELECT COUNT(*) FROM collections;"`, {
      silent: true,
    })
    if (result.success) {
      return parseInt(result.output.trim()) || 0
    }

    // Fallback: count directories
    const entries = fs.readdirSync(CHROMA_PATH, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).length
  } catch (e) {
    return 0
  }
}

function countMemoryFiles() {
  try {
    if (!fs.existsSync(MEMORY_PATH)) return 0

    const files = fs.readdirSync(MEMORY_PATH)
    return files.filter((f) => f.endsWith('.md') && !f.startsWith('.')).length
  } catch (e) {
    return 0
  }
}

function runDoctor() {
  console.log('🏥 Jasper Recall Doctor\n')

  const checks = []

  // Node.js version check
  const nodeResult = exec('node --version')
  const nodeVersion = nodeResult.output.replace('v', '')
  const nodeOk = nodeResult.success && checkVersion('18.0.0', nodeVersion)
  checks.push({
    label: 'Node.js',
    status: nodeOk ? '✅' : '❌',
    value: nodeResult.success ? `v${nodeVersion}` : 'not found',
    ok: nodeOk,
  })

  // Python version check
  const pythonResult = exec('python3 --version')
  const pythonMatch = pythonResult.output.match(/Python (\d+\.\d+\.\d+)/)
  const pythonVersion = pythonMatch ? pythonMatch[1] : null
  const pythonOk = pythonResult.success && pythonVersion
  checks.push({
    label: 'Python',
    status: pythonOk ? '✅' : '❌',
    value: pythonVersion || 'not found',
    ok: pythonOk,
  })

  // ChromaDB check
  const pipPath = path.join(VENV_PATH, 'bin', 'pip')
  const chromaResult = exec(
    `${pipPath} show chromadb 2>/dev/null || pip3 show chromadb 2>/dev/null`,
  )
  const chromaMatch = chromaResult.output.match(/Version: ([\d.]+)/)
  const chromaVersion = chromaMatch ? chromaMatch[1] : null
  const chromaOk = chromaResult.success && chromaVersion
  checks.push({
    label: 'ChromaDB',
    status: chromaOk ? '✅' : '❌',
    value: chromaVersion ? `installed (${chromaVersion})` : 'not installed',
    ok: chromaOk,
  })

  // Sentence-transformers check
  const transformersResult = exec(
    `${pipPath} show sentence-transformers 2>/dev/null || pip3 show sentence-transformers 2>/dev/null`,
  )
  const transformersMatch = transformersResult.output.match(/Version: ([\d.]+)/)
  const transformersVersion = transformersMatch ? transformersMatch[1] : null
  const transformersOk = transformersResult.success && transformersVersion
  checks.push({
    label: 'Transformers',
    status: transformersOk ? '✅' : '❌',
    value: transformersVersion ? 'sentence-transformers installed' : 'not installed',
    ok: transformersOk,
  })

  // Virtual environment check
  const venvExists = fs.existsSync(VENV_PATH)
  checks.push({
    label: 'Venv',
    status: venvExists ? '✅' : '❌',
    value: venvExists ? VENV_PATH : 'not found',
    ok: venvExists,
  })

  // ChromaDB directory check
  const chromaExists = fs.existsSync(CHROMA_PATH)
  const collections = countCollections()
  checks.push({
    label: 'Database',
    status: chromaExists ? '✅' : '❌',
    value: chromaExists ? `${CHROMA_PATH} (${collections} collections)` : 'not found',
    ok: chromaExists,
  })

  // Memory files check
  const memoryExists = fs.existsSync(MEMORY_PATH)
  const memoryCount = countMemoryFiles()
  checks.push({
    label: 'Memory files',
    status: memoryExists ? '✅' : '⚠️',
    value: memoryExists ? `${memoryCount} files in memory/` : 'directory not found',
    ok: memoryExists,
  })

  // Last index time
  const lastIndexMs = getLastIndexTime()
  const lastIndexOk = lastIndexMs !== null && lastIndexMs < 7 * 24 * 60 * 60 * 1000 // < 7 days
  checks.push({
    label: 'Last indexed',
    status: lastIndexMs === null ? '⚠️' : lastIndexOk ? '✅' : '⚠️',
    value: lastIndexMs === null ? 'never' : formatTime(lastIndexMs),
    ok: lastIndexMs !== null,
  })

  // Print results
  const maxLabelLength = Math.max(...checks.map((c) => c.label.length))
  for (const check of checks) {
    const padding = ' '.repeat(maxLabelLength - check.label.length)
    console.log(`  ${check.label}:${padding} ${check.status} ${check.value}`)
  }

  console.log('')

  // Summary
  const allOk = checks.every((c) => c.ok)
  if (allOk) {
    console.log('✅ All systems operational!\n')
    return 0
  } else {
    const failed = checks.filter((c) => !c.ok)
    console.log(`⚠️  ${failed.length} issue${failed.length > 1 ? 's' : ''} detected.\n`)

    if (!pythonOk) {
      console.log('→ Install Python 3: https://www.python.org/downloads/')
    }
    if (!venvExists || !chromaOk || !transformersOk) {
      console.log('→ Run: npx jasper-recall setup')
    }
    if (!memoryExists) {
      console.log(`→ Create memory directory: mkdir -p ${MEMORY_PATH}`)
    }
    if (lastIndexMs === null || !lastIndexOk) {
      console.log('→ Index your memory: index-digests')
    }

    console.log('')
    return 1
  }
}

module.exports = { runDoctor }

// Allow direct execution
if (require.main === module) {
  process.exit(runDoctor())
}
