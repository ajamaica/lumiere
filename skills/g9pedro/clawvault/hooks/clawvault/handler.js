/**
 * ClawVault OpenClaw Hook
 *
 * Provides automatic context death resilience:
 * - gateway:startup → detect context death, inject recovery info
 * - command:new → auto-checkpoint before session reset
 *
 * SECURITY: Uses execFileSync (no shell) to prevent command injection
 */

import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Sanitize string for safe display (prevent prompt injection via control chars)
function sanitizeForDisplay(str) {
  if (typeof str !== 'string') return ''
  // Remove control characters, limit length, escape markdown
  return str
    .replace(/[\x00-\x1f\x7f]/g, '') // Remove control chars
    .replace(/[`*_~\[\]]/g, '\\$&') // Escape markdown
    .slice(0, 200) // Limit length
}

// Validate vault path - must be absolute and exist
function validateVaultPath(vaultPath) {
  if (!vaultPath || typeof vaultPath !== 'string') return null

  // Resolve to absolute path
  const resolved = path.resolve(vaultPath)

  // Must be absolute
  if (!path.isAbsolute(resolved)) return null

  // Must exist and be a directory
  try {
    const stat = fs.statSync(resolved)
    if (!stat.isDirectory()) return null
  } catch {
    return null
  }

  // Must contain .clawvault.json
  const configPath = path.join(resolved, '.clawvault.json')
  if (!fs.existsSync(configPath)) return null

  return resolved
}

// Find vault by walking up directories
function findVaultPath() {
  // Check env first
  if (process.env.CLAWVAULT_PATH) {
    return validateVaultPath(process.env.CLAWVAULT_PATH)
  }

  // Walk up from cwd
  let dir = process.cwd()
  const root = path.parse(dir).root

  while (dir !== root) {
    const validated = validateVaultPath(dir)
    if (validated) return validated

    // Also check memory/ subdirectory (OpenClaw convention)
    const memoryDir = path.join(dir, 'memory')
    const memoryValidated = validateVaultPath(memoryDir)
    if (memoryValidated) return memoryValidated

    dir = path.dirname(dir)
  }

  return null
}

// Run clawvault command safely (no shell)
function runClawvault(args) {
  try {
    // Use execFileSync to avoid shell injection
    // Arguments are passed as array, not interpolated into shell
    const output = execFileSync('clawvault', args, {
      encoding: 'utf-8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
      // Explicitly no shell
      shell: false,
    })
    return { success: true, output: output.trim(), code: 0 }
  } catch (err) {
    return {
      success: false,
      output: err.stderr?.toString() || err.message || String(err),
      code: err.status || 1,
    }
  }
}

// Parse recovery output safely
function parseRecoveryOutput(output) {
  if (!output || typeof output !== 'string') {
    return { hadDeath: false, workingOn: null }
  }

  const hadDeath =
    output.includes('Context death detected') || output.includes('died') || output.includes('⚠️')

  let workingOn = null
  if (hadDeath) {
    const lines = output.split('\n')
    const workingOnLine = lines.find((l) => l.toLowerCase().includes('working on'))
    if (workingOnLine) {
      const parts = workingOnLine.split(':')
      if (parts.length > 1) {
        workingOn = sanitizeForDisplay(parts.slice(1).join(':').trim())
      }
    }
  }

  return { hadDeath, workingOn }
}

// Handle gateway startup - check for context death
async function handleStartup(event) {
  const vaultPath = findVaultPath()
  if (!vaultPath) {
    console.log('[clawvault] No vault found, skipping recovery check')
    return
  }

  console.log(`[clawvault] Checking for context death`)

  // Pass vault path as separate argument (not interpolated)
  const result = runClawvault(['recover', '--clear', '-v', vaultPath])

  if (!result.success) {
    console.warn('[clawvault] Recovery check failed')
    return
  }

  const { hadDeath, workingOn } = parseRecoveryOutput(result.output)

  if (hadDeath) {
    // Build safe alert message with sanitized content
    const alertParts = ['[ClawVault] Context death detected.']
    if (workingOn) {
      alertParts.push(`Last working on: ${workingOn}`)
    }
    alertParts.push('Run `clawvault wake` for full recovery context.')

    const alertMsg = alertParts.join(' ')

    // Inject into event messages if available
    if (event.messages && Array.isArray(event.messages)) {
      event.messages.push(alertMsg)
    }

    console.warn('[clawvault] Context death detected, alert injected')
  } else {
    console.log('[clawvault] Clean startup - no context death')
  }
}

// Handle /new command - auto-checkpoint before reset
async function handleNew(event) {
  const vaultPath = findVaultPath()
  if (!vaultPath) {
    console.log('[clawvault] No vault found, skipping auto-checkpoint')
    return
  }

  // Sanitize session info for checkpoint
  const sessionKey =
    typeof event.sessionKey === 'string'
      ? event.sessionKey.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 100)
      : 'unknown'
  const source =
    typeof event.context?.commandSource === 'string'
      ? event.context.commandSource.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50)
      : 'cli'

  console.log('[clawvault] Auto-checkpoint before /new')

  // Pass each argument separately (no shell interpolation)
  const result = runClawvault([
    'checkpoint',
    '--working-on',
    `Session reset via /new from ${source}`,
    '--focus',
    `Pre-reset checkpoint, session: ${sessionKey}`,
    '-v',
    vaultPath,
  ])

  if (result.success) {
    console.log('[clawvault] Auto-checkpoint created')
  } else {
    console.warn('[clawvault] Auto-checkpoint failed')
  }
}

// Main handler - route events
const handler = async (event) => {
  try {
    if (event.type === 'gateway' && event.action === 'startup') {
      await handleStartup(event)
      return
    }

    if (event.type === 'command' && event.action === 'new') {
      await handleNew(event)
      return
    }
  } catch (err) {
    console.error('[clawvault] Hook error:', err.message || 'unknown error')
  }
}

export default handler
