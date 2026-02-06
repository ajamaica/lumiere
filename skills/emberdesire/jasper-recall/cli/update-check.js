/**
 * Check for updates and notify user
 * Non-blocking, caches check for 24 hours
 */

const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PACKAGE_NAME = 'jasper-recall'
const CACHE_FILE = path.join(os.homedir(), '.openclaw', '.jasper-recall-update-check')
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get current package version
 */
function getCurrentVersion() {
  try {
    const pkg = require('../package.json')
    return pkg.version
  } catch {
    return null
  }
}

/**
 * Check if we should run update check
 */
function shouldCheck() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const stat = fs.statSync(CACHE_FILE)
      const age = Date.now() - stat.mtimeMs
      if (age < CHECK_INTERVAL_MS) {
        return false // Checked recently
      }
    }
  } catch {
    // Ignore errors, just check
  }
  return true
}

/**
 * Save check timestamp
 */
function saveCheckTime(latestVersion) {
  try {
    const dir = path.dirname(CACHE_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({
        checked: new Date().toISOString(),
        latest: latestVersion,
      }),
    )
  } catch {
    // Ignore errors
  }
}

/**
 * Fetch latest version from npm
 */
function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
      {
        timeout: 3000,
        headers: { Accept: 'application/json' },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const pkg = JSON.parse(data)
            resolve(pkg.version)
          } catch (e) {
            reject(e)
          }
        })
      },
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

/**
 * Compare semver versions
 */
function isNewer(latest, current) {
  const l = latest.split('.').map(Number)
  const c = current.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true
    if ((l[i] || 0) < (c[i] || 0)) return false
  }
  return false
}

/**
 * Check for updates (non-blocking)
 */
async function checkForUpdates(silent = false) {
  if (!shouldCheck()) {
    return null
  }

  const current = getCurrentVersion()
  if (!current) return null

  try {
    const latest = await fetchLatestVersion()
    saveCheckTime(latest)

    if (isNewer(latest, current)) {
      if (!silent) {
        console.log('')
        console.log(`📦 Update available: ${current} → ${latest}`)
        console.log(`   Run: npm update -g jasper-recall`)
        console.log('')
      }
      return { current, latest, updateAvailable: true }
    }

    return { current, latest, updateAvailable: false }
  } catch {
    // Silent fail - don't block user
    return null
  }
}

/**
 * Run check in background (fire and forget)
 */
function checkInBackground() {
  // Don't await - let it run async
  checkForUpdates().catch(() => {})
}

module.exports = { checkForUpdates, checkInBackground, getCurrentVersion }
