import * as path from 'path'

import { ClawVault } from '../lib/vault.js'
import type { SessionRecap } from '../types.js'
import { clearDirtyFlag } from './checkpoint.js'
import { recover, type RecoveryInfo } from './recover.js'

export interface WakeOptions {
  vaultPath: string
  handoffLimit?: number
  brief?: boolean
}

export interface WakeResult {
  recovery: RecoveryInfo
  recap: SessionRecap
  recapMarkdown: string
  summary: string
}

const DEFAULT_HANDOFF_LIMIT = 3

function formatSummaryItems(items: string[], maxItems: number = 2): string {
  const cleaned = items.map((item) => item.trim()).filter(Boolean)
  if (cleaned.length === 0) return ''
  if (cleaned.length <= maxItems) return cleaned.join(', ')
  return `${cleaned.slice(0, maxItems).join(', ')} +${cleaned.length - maxItems} more`
}

export function buildWakeSummary(recovery: RecoveryInfo, recap: SessionRecap): string {
  if (recovery.checkpoint?.workingOn) {
    return recovery.checkpoint.workingOn
  }

  const latestHandoff = recap.recentHandoffs[0]
  if (latestHandoff?.workingOn?.length) {
    return formatSummaryItems(latestHandoff.workingOn)
  }

  if (recap.activeProjects.length > 0) {
    return formatSummaryItems(recap.activeProjects)
  }

  return 'No recent work summary found.'
}

export async function wake(options: WakeOptions): Promise<WakeResult> {
  const vaultPath = path.resolve(options.vaultPath)
  const recovery = await recover(vaultPath, { clearFlag: true })
  await clearDirtyFlag(vaultPath)

  const vault = new ClawVault(vaultPath)
  await vault.load()
  const recap = await vault.generateRecap({
    handoffLimit: options.handoffLimit ?? DEFAULT_HANDOFF_LIMIT,
    brief: options.brief ?? true,
  })
  const summary = buildWakeSummary(recovery, recap)
  const recapMarkdown = vault.formatRecap(recap, { brief: options.brief ?? true })

  return {
    recovery,
    recap,
    recapMarkdown,
    summary,
  }
}
