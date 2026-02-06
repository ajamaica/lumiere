/**
 * Recovery command - detect dirty death and provide recovery info
 */

import * as fs from 'fs'
import * as path from 'path'

import { formatAge } from '../lib/time.js'
import { checkDirtyDeath, CheckpointData, clearDirtyFlag } from './checkpoint.js'

export interface RecoveryInfo {
  died: boolean
  deathTime: string | null
  checkpoint: CheckpointData | null
  handoffPath: string | null
  handoffContent: string | null
  recoveryMessage: string
}

export async function recover(
  vaultPath: string,
  options: { clearFlag?: boolean; verbose?: boolean } = {},
): Promise<RecoveryInfo> {
  const { clearFlag = false } = options
  const { died, checkpoint, deathTime } = await checkDirtyDeath(vaultPath)

  if (!died) {
    return {
      died: false,
      deathTime: null,
      checkpoint: null,
      handoffPath: null,
      handoffContent: null,
      recoveryMessage: 'No context death detected. Clean startup.',
    }
  }

  // Find most recent handoff
  const handoffsDir = path.join(vaultPath, 'handoffs')
  let handoffPath: string | null = null
  let handoffContent: string | null = null

  if (fs.existsSync(handoffsDir)) {
    const files = fs
      .readdirSync(handoffsDir)
      .filter((f) => f.startsWith('handoff-') && f.endsWith('.md'))
      .sort()
      .reverse()

    if (files.length > 0) {
      handoffPath = path.join(handoffsDir, files[0])
      handoffContent = fs.readFileSync(handoffPath, 'utf-8')
    }
  }

  // Build recovery message
  let message = '⚠️ **CONTEXT DEATH DETECTED**\n\n'
  message += `Your previous session died at ${deathTime}.\n\n`

  if (checkpoint) {
    message += '**Last known state:**\n'
    if (checkpoint.workingOn) {
      message += `- Working on: ${checkpoint.workingOn}\n`
    }
    if (checkpoint.focus) {
      message += `- Focus: ${checkpoint.focus}\n`
    }
    if (checkpoint.blocked) {
      message += `- Blocked: ${checkpoint.blocked}\n`
    }
    message += '\n'
  }

  if (handoffPath) {
    message += `**Last handoff:** ${path.basename(handoffPath)}\n`
    message += 'Review and resume from where you left off.\n'
  } else {
    message += '**No handoff found.** You may have lost context.\n'
  }

  // Clear the flag if requested
  if (clearFlag) {
    await clearDirtyFlag(vaultPath)
  }

  return {
    died: true,
    deathTime,
    checkpoint,
    handoffPath,
    handoffContent,
    recoveryMessage: message,
  }
}

/**
 * Format recovery info for CLI output
 */
export function formatRecoveryInfo(
  info: RecoveryInfo,
  options: { verbose?: boolean } = {},
): string {
  const { verbose = false } = options
  if (!info.died) {
    return '✓ Clean startup - no context death detected.'
  }

  let output = '\n⚠️  CONTEXT DEATH DETECTED\n'
  output += '═'.repeat(40) + '\n\n'
  output += `Death time: ${info.deathTime}\n`
  if (info.checkpoint?.timestamp) {
    const age = formatAge(Date.now() - new Date(info.checkpoint.timestamp).getTime())
    output += `Checkpoint: ${info.checkpoint.timestamp} (${age} ago)\n`
  }
  output += '\n'

  if (info.checkpoint) {
    output += 'Last checkpoint:\n'
    if (info.checkpoint.workingOn) {
      output += `  • Working on: ${info.checkpoint.workingOn}\n`
    }
    if (info.checkpoint.focus) {
      output += `  • Focus: ${info.checkpoint.focus}\n`
    }
    if (info.checkpoint.blocked) {
      output += `  • Blocked: ${info.checkpoint.blocked}\n`
    }
    if (
      info.checkpoint.sessionKey ||
      info.checkpoint.model ||
      info.checkpoint.tokenEstimate !== undefined
    ) {
      output += '  • Session:\n'
      if (info.checkpoint.sessionKey) {
        output += `    - Key: ${info.checkpoint.sessionKey}\n`
      }
      if (info.checkpoint.model) {
        output += `    - Model: ${info.checkpoint.model}\n`
      }
      if (info.checkpoint.tokenEstimate !== undefined) {
        output += `    - Token estimate: ${info.checkpoint.tokenEstimate}\n`
      }
    }
    output += '\n'
  } else {
    output += 'No checkpoint data found.\n\n'
  }

  if (info.handoffPath) {
    output += `Last handoff: ${path.basename(info.handoffPath)}\n`
  } else {
    output += 'No handoff found - context may be lost.\n'
  }

  if (verbose) {
    if (info.checkpoint) {
      output += '\nCheckpoint JSON:\n'
      output += JSON.stringify(info.checkpoint, null, 2) + '\n'
    }
    if (info.handoffContent) {
      output += '\nHandoff content:\n'
      output += info.handoffContent.trim() + '\n'
    }
  }

  output += '\n' + '═'.repeat(40) + '\n'
  output += 'Run `clawvault recap` to see full context.\n'

  return output
}
