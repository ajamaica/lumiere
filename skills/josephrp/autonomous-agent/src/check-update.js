#!/usr/bin/env node

/**
 * Check for updates - compares local version against latest GitHub release/tag
 * Can be run standalone or imported by other scripts for periodic nag
 *
 * Usage:
 *   node src/check-update.js              # Check for updates
 *   node src/check-update.js --json       # JSON output
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_PATH = join(__dirname, '..', 'package.json')
const REPO = 'FinTechTonic/autonomous-agent'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
const STATE_FILE = join(__dirname, '..', '.update-check.json')

/**
 * Get local version from package.json
 */
export function getLocalVersion() {
  const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'))
  return pkg.version
}

/**
 * Fetch latest version from GitHub tags (works with public repos)
 * Falls back to GitHub API with token if available
 */
async function fetchLatestVersion() {
  // Try GitHub API (works for public repos, or private with GH_TOKEN)
  const headers = { 'User-Agent': 'autonomous-agent' }

  // Check for GitHub token in environment
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Try releases first
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers })
    if (res.ok) {
      const data = await res.json()
      return data.tag_name.replace(/^v/, '')
    }
  } catch {}

  // Fall back to tags
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/tags?per_page=1`, { headers })
    if (res.ok) {
      const tags = await res.json()
      if (tags.length > 0) {
        return tags[0].name.replace(/^v/, '')
      }
    }
  } catch {}

  // Fall back to raw package.json on main branch
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/main/package.json`, {
      headers,
    })
    if (res.ok) {
      const pkg = await res.json()
      return pkg.version
    }
  } catch {}

  return null
}

/**
 * Compare two semver strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareSemver(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

/**
 * Load/save check state to avoid hitting API too frequently
 */
function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

/**
 * Check for updates — returns update info or null
 * Respects CHECK_INTERVAL_MS to avoid spamming the API
 * @param {boolean} force - bypass interval check
 */
export async function checkForUpdate(force = false) {
  const localVersion = getLocalVersion()

  // Check if we should skip (already checked recently)
  if (!force) {
    const state = loadState()
    if (state.lastCheck && Date.now() - state.lastCheck < CHECK_INTERVAL_MS) {
      // Use cached result
      if (state.latestVersion && compareSemver(state.latestVersion, localVersion) > 0) {
        return {
          updateAvailable: true,
          currentVersion: localVersion,
          latestVersion: state.latestVersion,
          cached: true,
        }
      }
      return null
    }
  }

  const latestVersion = await fetchLatestVersion()

  // Save state
  try {
    writeFileSync(
      STATE_FILE,
      JSON.stringify(
        {
          lastCheck: Date.now(),
          latestVersion,
          currentVersion: localVersion,
        },
        null,
        2,
      ),
    )
  } catch {}

  if (!latestVersion) return null

  if (compareSemver(latestVersion, localVersion) > 0) {
    return {
      updateAvailable: true,
      currentVersion: localVersion,
      latestVersion,
    }
  }

  return null
}

/**
 * Print update nag line (for use by other scripts)
 */
export async function printUpdateNag() {
  try {
    const update = await checkForUpdate()
    if (update) {
      console.error(
        `\n⚠️  Update available: ${update.currentVersion} → ${update.latestVersion} — run: clawdhub update autonomous-agent\n`,
      )
    }
  } catch {
    // Silent fail — never block the main command
  }
}

// CLI mode
if (process.argv[1] && process.argv[1].includes('check-update')) {
  const jsonFlag = process.argv.includes('--json')
  const forceFlag = process.argv.includes('--force')

  const localVersion = getLocalVersion()
  const update = await checkForUpdate(forceFlag)

  if (jsonFlag) {
    console.log(
      JSON.stringify(
        {
          currentVersion: localVersion,
          latestVersion: update?.latestVersion || localVersion,
          updateAvailable: !!update?.updateAvailable,
          repo: REPO,
        },
        null,
        2,
      ),
    )
  } else {
    console.log(`Current version: ${localVersion}`)
    if (update) {
      console.log(`⚠️  Update available: ${update.currentVersion} → ${update.latestVersion}`)
      console.log(`Run: clawdhub update autonomous-agent`)
    } else {
      console.log('✅ Up to date')
    }
  }
}
