/**
 * HexMem Sync Hook Handler
 *
 * Syncs session context with HexMem:
 * - On session end: extracts observations and logs to HexMem
 * - On session start: logs the event
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const HEXMEM_DB = process.env.HEXMEM_DB || path.join(os.homedir(), 'clawd/hexmem/hexmem.db')

/**
 * Extract observations from session content
 */
function extractObservations(content) {
  const observations = []

  // Preference patterns (user-stated)
  const preferencePatterns = [
    /i prefer\s+(.{10,200})/gi,
    /i like\s+(.{10,200})/gi,
    /i always\s+(.{10,200})/gi,
    /i never\s+(.{10,200})/gi,
    /i want\s+(.{10,200})/gi,
  ]

  for (const pattern of preferencePatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      observations.push({
        type: 'preference',
        text: match[0].trim(),
      })
    }
  }

  // Decision patterns (from assistant responses)
  const decisionPatterns = [
    /(?:I'll|I will)\s+(.{20,200})/gi,
    /(?:Let's|Let us)\s+(.{20,200})/gi,
    /(?:We should|We need to)\s+(.{20,200})/gi,
  ]

  for (const pattern of decisionPatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match[1].length > 20 && match[1].length < 200) {
        observations.push({
          type: 'decision',
          text: match[0].trim(),
        })
      }
    }
  }

  return observations
}

/**
 * Read session content from JSONL file
 */
async function getSessionContent(sessionFilePath) {
  try {
    const content = await fs.readFile(sessionFilePath, 'utf-8')
    const lines = content.trim().split('\n')

    const messages = []
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (entry.type === 'message' && entry.message) {
          const msg = entry.message
          const role = msg.role
          if ((role === 'user' || role === 'assistant') && msg.content) {
            const text = Array.isArray(msg.content)
              ? msg.content.find((c) => c.type === 'text')?.text
              : msg.content
            if (text && !text.startsWith('/')) {
              messages.push(`${role}: ${text}`)
            }
          }
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
    return messages.join('\n')
  } catch {
    return null
  }
}

/**
 * Run a shell command and return output
 */
function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      shell: true,
      env: { ...process.env, HEXMEM_DB },
    })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data
    })
    proc.stderr.on('data', (data) => {
      stderr += data
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Command failed: ${stderr || stdout}`))
      }
    })
  })
}

/**
 * Log event to HexMem via sqlite3
 */
async function logEventToHexMem(category, summary, details) {
  const escapedSummary = summary.replace(/'/g, "''")
  const escapedDetails = details.replace(/'/g, "''")

  const sql = `INSERT INTO events (category, summary, details) VALUES ('${category}', '${escapedSummary}', '${escapedDetails}');`

  try {
    await runCommand('sqlite3', [HEXMEM_DB, sql])
    console.log(`[hexmem-sync] Logged event: ${summary}`)
  } catch (err) {
    console.error(`[hexmem-sync] Failed to log event:`, err)
  }
}

/**
 * Queue text for embedding
 */
async function queueForEmbedding(sourceTable, text) {
  const escapedText = text.replace(/'/g, "''")

  const sql = `INSERT OR IGNORE INTO embedding_queue (source_table, source_id, text_to_embed, status)
               VALUES ('${sourceTable}', (SELECT COALESCE(MAX(id), 0) FROM ${sourceTable}), '${escapedText}', 'pending');`

  try {
    await runCommand('sqlite3', [HEXMEM_DB, sql])
    console.log(`[hexmem-sync] Queued for embedding: ${sourceTable}`)
  } catch (err) {
    console.error(`[hexmem-sync] Failed to queue for embedding:`, err)
  }
}

/**
 * Main hook handler
 */
const hexmemSyncHandler = async (event) => {
  const action = event.action
  const context = event.context || {}

  // Handle session end (reset or stop)
  if (event.type === 'command' && (action === 'reset' || action === 'stop')) {
    console.log(`[hexmem-sync] Session ending (${action})`)

    const sessionEntry = context.previousSessionEntry || context.sessionEntry || {}
    const sessionFile = sessionEntry.sessionFile

    if (sessionFile) {
      const sessionContent = await getSessionContent(sessionFile)

      if (sessionContent) {
        // Extract observations
        const observations = extractObservations(sessionContent)
        console.log(`[hexmem-sync] Extracted ${observations.length} observations`)

        // Log session end event with observation count
        const wordCount = sessionContent.split(/\s+/).length
        await logEventToHexMem(
          'session',
          `Session ended via /${action}`,
          `${wordCount} words exchanged, ${observations.length} observations extracted`,
        )

        // Queue the session event for embedding
        await queueForEmbedding(
          'events',
          `Session ended: ${observations.length} observations, ${wordCount} words`,
        )
      }
    } else {
      await logEventToHexMem('session', `Session ended via /${action}`, 'No session file available')
    }
  }

  // Handle new session
  if (event.type === 'command' && action === 'new') {
    console.log(`[hexmem-sync] New session starting`)

    await logEventToHexMem('session', 'New session started', `Session key: ${event.sessionKey}`)
  }
}

export default hexmemSyncHandler
