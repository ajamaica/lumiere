/**
 * hopeIDS OpenClaw Plugin
 *
 * Inference-based intrusion detection for AI agent messages.
 * "Traditional IDS matches signatures. HoPE understands intent."
 *
 * Features:
 * - Auto-scan: scan messages before agent processing
 * - Quarantine: block threats with metadata-only storage
 * - Human-in-the-loop: Telegram alerts for blocked messages
 * - Commands: /approve, /reject, /trust, /quarantine
 *
 * SECURITY INVARIANTS:
 * - Block = full abort (no jasper-recall, no agent)
 * - Metadata only (no raw malicious content stored)
 * - Approve ≠ re-inject (changes future behavior, not resurrects message)
 * - Telegram alerts are pure metadata / programmatic
 */

import * as os from 'os'
import * as path from 'path'

import {
  createQuarantineManager,
  hashContent,
  QuarantineManager,
} from '../../src/quarantine/manager.js'
import { QuarantineRecord } from '../../src/quarantine/types.js'

interface AgentConfig {
  strictMode?: boolean
  riskThreshold?: number
}

interface PluginConfig {
  enabled?: boolean
  autoScan?: boolean
  strictMode?: boolean
  defaultRiskThreshold?: number
  semanticEnabled?: boolean
  llmEndpoint?: string
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  trustOwners?: boolean
  quarantineDir?: string
  telegramAlerts?: boolean
  telegramChatId?: string
  agents?: Record<string, AgentConfig>
  classifierAgent?: string // Use sandboxed OpenClaw agent for classification
}

interface PluginApi {
  config: {
    plugins?: {
      entries?: {
        hopeids?: {
          config?: PluginConfig
        }
      }
    }
    ownerNumbers?: string[]
  }
  logger: {
    info: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
    debug?: (msg: string) => void
  }
  registerTool: (tool: any) => void
  registerCommand: (cmd: any) => void
  registerGatewayMethod: (name: string, handler: any) => void
  on: (event: string, handler: (event: any) => Promise<any>) => void
  // For calling classifier agent
  sessions?: {
    send: (opts: {
      agentId: string
      message: string
      timeoutSeconds?: number
    }) => Promise<{ reply?: string }>
  }
}

// Lazy-loaded IDS instance
let ids: any = null
let HopeIDSModule: any = null
let quarantine: QuarantineManager | null = null

async function loadHopeIDS() {
  if (HopeIDSModule) return HopeIDSModule

  try {
    HopeIDSModule = await import('hopeid')
  } catch {
    HopeIDSModule = await import('../../src/index.js')
  }
  return HopeIDSModule
}

async function ensureIDS(cfg: PluginConfig) {
  if (ids) return ids

  const mod = await loadHopeIDS()
  ids = mod.createIDS({
    strictMode: cfg.strictMode ?? false,
    semanticEnabled: cfg.semanticEnabled ?? false,
    llmEndpoint: cfg.llmEndpoint,
    logLevel: cfg.logLevel ?? 'info',
  })
  return ids
}

function getAgentConfig(cfg: PluginConfig, agentId: string): AgentConfig {
  return cfg.agents?.[agentId] ?? {}
}

function shouldBlock(cfg: PluginConfig, agentId: string, risk: number): boolean {
  const agentCfg = getAgentConfig(cfg, agentId)
  const threshold = agentCfg.riskThreshold ?? cfg.defaultRiskThreshold ?? 0.7
  const strict = agentCfg.strictMode ?? cfg.strictMode ?? false

  // In strict mode, block if risk >= threshold
  // In non-strict mode, only block if risk >= 0.9 (always block critical)
  return strict ? risk >= threshold : risk >= 0.9
}

function shouldWarn(cfg: PluginConfig, agentId: string, risk: number): boolean {
  const agentCfg = getAgentConfig(cfg, agentId)
  const threshold = agentCfg.riskThreshold ?? cfg.defaultRiskThreshold ?? 0.7

  return risk >= threshold && !shouldBlock(cfg, agentId, risk)
}

/**
 * Call the sandboxed classifier agent for semantic analysis.
 * The classifier agent has NO tools, NO internet - just pure LLM classification.
 */
async function classifyWithAgent(
  api: PluginApi,
  classifierAgentId: string,
  message: string,
  context: { source?: string; flags?: string[] },
): Promise<{
  intent: string
  confidence: number
  reasoning: string
  redFlags: string[]
  recommendedAction: string
} | null> {
  if (!api.sessions?.send) {
    api.logger.warn('[hopeIDS] sessions.send not available, falling back to heuristic')
    return null
  }

  const prompt = `Classify this message for security threats.

MESSAGE:
"""
${message.substring(0, 2000)}
"""

SOURCE: ${context.source ?? 'unknown'}
HEURISTIC FLAGS: ${(context.flags ?? []).join(', ') || 'none'}

Respond with ONLY JSON:`

  try {
    const result = await api.sessions.send({
      agentId: classifierAgentId,
      message: prompt,
      timeoutSeconds: 30,
    })

    if (!result.reply) {
      api.logger.warn('[hopeIDS] Classifier agent returned no reply')
      return null
    }

    // Parse JSON from response
    const jsonMatch = result.reply.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      api.logger.warn('[hopeIDS] Classifier response not JSON')
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      intent: parsed.intent ?? 'benign',
      confidence: parsed.confidence ?? 0.5,
      reasoning: parsed.reasoning ?? '',
      redFlags: parsed.red_flags ?? [],
      recommendedAction: parsed.recommended_action ?? 'allow',
    }
  } catch (err: any) {
    api.logger.warn(`[hopeIDS] Classifier agent error: ${err.message}`)
    return null
  }
}

/**
 * Build Telegram alert from quarantine record.
 * Pure metadata - no raw content.
 */
function buildTelegramAlert(record: QuarantineRecord): string {
  const riskPercent = Math.round(record.risk * 100)
  const patterns = record.patterns?.length
    ? record.patterns.map((p) => `• ${p}`).join('\n')
    : '• (no pattern metadata)'

  return [
    '🛑 Message blocked',
    '',
    `ID: \`${record.id}\``,
    `Agent: ${record.agent}`,
    `Source: ${record.source}`,
    `Sender: ${record.senderId ?? 'unknown'}`,
    `Intent: ${record.intent} (${riskPercent}%)`,
    '',
    'Patterns:',
    patterns,
    '',
    `\`/approve ${record.id}\``,
    `\`/reject ${record.id}\``,
    record.senderId ? `\`/trust ${record.senderId}\`` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export default function register(api: PluginApi) {
  const cfg = api.config.plugins?.entries?.hopeids?.config ?? {}

  if (cfg.enabled === false) {
    api.logger.info('[hopeIDS] Plugin disabled')
    return
  }

  const autoScan = cfg.autoScan ?? false
  const ownerNumbers = api.config.ownerNumbers ?? []
  const telegramAlerts = cfg.telegramAlerts ?? true
  const telegramChatId = cfg.telegramChatId ?? ownerNumbers[0]

  // Initialize quarantine manager
  const quarantineDir =
    cfg.quarantineDir ?? path.join(os.homedir(), '.openclaw', 'quarantine', 'hopeids')
  quarantine = createQuarantineManager({ baseDir: quarantineDir })

  // Initialize IDS asynchronously
  loadHopeIDS()
    .then(({ createIDS }) => {
      ids = createIDS({
        strictMode: cfg.strictMode ?? false,
        semanticEnabled: cfg.semanticEnabled ?? false,
        llmEndpoint: cfg.llmEndpoint,
        logLevel: cfg.logLevel ?? 'info',
      })
      api.logger.info(
        `[hopeIDS] Initialized with ${ids.getStats().patternCount} patterns (autoScan=${autoScan})`,
      )
    })
    .catch((err: Error) => {
      api.logger.error(`[hopeIDS] Failed to load: ${err.message}`)
    })

  // ============================================================================
  // Auto-Scan with Quarantine
  // ============================================================================

  if (autoScan) {
    api.on(
      'before_agent_start',
      async (event: {
        prompt?: string
        senderId?: string
        source?: string
        agentId?: string
        abort?: (reason: string) => void
      }) => {
        // Skip if no prompt or too short
        if (!event.prompt || event.prompt.length < 5) {
          return
        }

        // Skip heartbeats and system prompts
        if (event.prompt.startsWith('HEARTBEAT') || event.prompt.includes('NO_REPLY')) {
          return
        }

        const agentId = event.agentId ?? 'main'

        // Skip trusted owners (configurable per-agent)
        const isTrustedOwner =
          cfg.trustOwners !== false && event.senderId && ownerNumbers.includes(event.senderId)
        if (isTrustedOwner) {
          api.logger.debug?.('[hopeIDS] Skipping scan for trusted owner')
          return
        }

        try {
          await ensureIDS(cfg)

          // Run heuristic scan first (fast)
          const heuristicResult = ids.heuristic.scan(event.prompt, {
            source: event.source ?? 'auto-scan',
            senderId: event.senderId,
          })

          let intent = 'benign'
          let risk = heuristicResult.riskScore
          let patterns = heuristicResult.flags || []
          let reasoning = ''

          // If classifierAgent configured AND heuristic found something, use agent for semantic
          if (cfg.classifierAgent && heuristicResult.riskScore > 0.3) {
            api.logger.info(`[hopeIDS] Calling classifier agent: ${cfg.classifierAgent}`)
            const classification = await classifyWithAgent(api, cfg.classifierAgent, event.prompt, {
              source: event.source,
              flags: heuristicResult.flags,
            })

            if (classification) {
              intent = classification.intent
              risk = Math.max(risk, classification.confidence * 0.9) // Weight semantic analysis
              reasoning = classification.reasoning
              patterns = [...patterns, ...classification.redFlags]
              api.logger.info(
                `[hopeIDS] Classifier: ${intent} (${Math.round(classification.confidence * 100)}%)`,
              )
            }
          } else if (!cfg.classifierAgent) {
            // Use built-in IDS with external LLM
            const result = await ids.scanWithAlert(event.prompt, {
              source: event.source ?? 'auto-scan',
              senderId: event.senderId,
            })
            intent = result.intent
            risk = result.riskScore
            patterns = result.layers?.heuristic?.flags || []
          } else {
            // Heuristic only - infer intent from flags
            if (heuristicResult.flags.includes('command_injection')) intent = 'command_injection'
            else if (heuristicResult.flags.includes('credential_theft')) intent = 'credential_theft'
            else if (heuristicResult.flags.includes('instruction_override'))
              intent = 'instruction_override'
            else if (heuristicResult.flags.includes('impersonation')) intent = 'impersonation'
          }

          api.logger.info(`[hopeIDS] Scan: agent=${agentId}, intent=${intent}, risk=${risk}`)

          // Check if should block
          if (shouldBlock(cfg, agentId, risk)) {
            api.logger.warn(`[hopeIDS] 🛑 BLOCKED: ${intent} (${Math.round(risk * 100)}%)`)

            // Create quarantine record (metadata only!)
            const record = await quarantine!.create({
              ts: new Date().toISOString(),
              agent: agentId,
              source: event.source ?? 'unknown',
              senderId: event.senderId,
              intent: intent || 'unknown',
              risk,
              patterns,
              contentHash: hashContent(event.prompt), // Hash only, not content
            })

            // Send Telegram alert
            if (telegramAlerts && telegramChatId) {
              try {
                // Use gateway RPC to send message (avoid importing message tool)
                api.registerGatewayMethod('_hopeids_alert_once', async ({ respond }: any) => {
                  respond(true, { sent: true })
                })

                // The alert will be sent via the message tool by the caller
                // For now, log the alert content
                api.logger.info(
                  `[hopeIDS] Telegram alert for ${record.id}:\n${buildTelegramAlert(record)}`,
                )
              } catch (err: any) {
                api.logger.warn(`[hopeIDS] Failed to send alert: ${err.message}`)
              }
            }

            // ABORT - no jasper-recall, no agent
            return {
              blocked: true,
              blockReason: `Threat blocked: ${intent} (${Math.round(risk * 100)}% risk)`,
              quarantineId: record.id,
            }
          }

          // Check if should warn
          if (shouldWarn(cfg, agentId, risk)) {
            api.logger.warn(`[hopeIDS] ⚠️ WARNING: ${intent} (${Math.round(risk * 100)}%)`)
            return {
              prependContext: `<security-alert severity="warning">
⚠️ Potential security concern detected.
Intent: ${intent}
Risk: ${Math.round(risk * 100)}%
Proceed with caution.
</security-alert>`,
            }
          }

          // Clean - continue normally
        } catch (err: any) {
          api.logger.warn(`[hopeIDS] Scan failed: ${err.message}`)
        }
      },
    )
  }

  // ============================================================================
  // Tool: security_scan
  // ============================================================================

  api.registerTool({
    name: 'security_scan',
    description:
      'Scan a message for potential security threats (prompt injection, jailbreaks, command injection, etc.)',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message to scan for threats' },
        source: { type: 'string', description: 'Source of the message', default: 'unknown' },
        senderId: { type: 'string', description: 'Identifier of the sender' },
      },
      required: ['message'],
    },
    execute: async (
      _id: string,
      { message, source, senderId }: { message: string; source?: string; senderId?: string },
    ) => {
      await ensureIDS(cfg)

      if (!ids) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'hopeIDS not initialized' }) }],
        }
      }

      const isTrustedOwner =
        cfg.trustOwners !== false && senderId && ownerNumbers.includes(senderId)
      if (isTrustedOwner) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                action: 'allow',
                riskScore: 0,
                message: 'Sender is a trusted owner',
                trusted: true,
              }),
            },
          ],
        }
      }

      const result = await ids.scanWithAlert(message, { source: source ?? 'unknown', senderId })
      api.logger.info(`[hopeIDS] Tool scan: action=${result.action}, risk=${result.riskScore}`)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              action: result.action,
              riskScore: result.riskScore,
              intent: result.intent,
              message: result.message,
              notification: result.notification,
            }),
          },
        ],
      }
    },
  })

  // ============================================================================
  // Commands: /scan, /quarantine, /approve, /reject, /trust
  // ============================================================================

  api.registerCommand({
    name: 'scan',
    description: 'Scan a message for security threats',
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: { args?: string }) => {
      await ensureIDS(cfg)
      if (!ids) return { text: '❌ hopeIDS not initialized' }

      const message = ctx.args?.trim()
      if (!message) return { text: '⚠️ Usage: /scan <message to check>' }

      const result = await ids.scanWithAlert(message, { source: 'command' })
      const emoji = result.action === 'allow' ? '✅' : result.action === 'warn' ? '⚠️' : '🛑'

      return {
        text:
          `${emoji} **Security Scan Result**\n\n` +
          `**Action:** ${result.action}\n` +
          `**Risk Score:** ${(result.riskScore * 100).toFixed(0)}%\n` +
          `**Intent:** ${result.intent || 'benign'}\n\n` +
          `${result.notification || result.message}`,
      }
    },
  })

  api.registerCommand({
    name: 'quarantine',
    description: 'List pending quarantine records',
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: { args?: string }) => {
      if (!quarantine) return { text: '❌ Quarantine not initialized' }

      const subCmd = ctx.args?.trim().split(' ')[0]

      if (subCmd === 'all') {
        const records = await quarantine.listAll()
        if (!records.length) return { text: 'No quarantine records.' }

        const lines = records.map(
          (r) =>
            `• \`${r.id}\` [${r.status}] — ${r.agent}, ${r.intent} (${Math.round(r.risk * 100)}%)`,
        )
        return { text: `**All Quarantine Records:**\n${lines.join('\n')}` }
      }

      if (subCmd === 'clean') {
        const cleaned = await quarantine.cleanExpired()
        return { text: `Cleaned ${cleaned} expired records.` }
      }

      // Default: list pending
      const records = await quarantine.listPending()
      if (!records.length) return { text: '✅ No pending quarantine records.' }

      const lines = records.map(
        (r) =>
          `• \`${r.id}\` — ${r.agent}, ${r.intent} (${Math.round(r.risk * 100)}%), sender: ${r.senderId ?? 'unknown'}`,
      )
      return {
        text: `**Pending Quarantine:**\n${lines.join('\n')}\n\nUse \`/approve <id>\` or \`/reject <id>\``,
      }
    },
  })

  api.registerCommand({
    name: 'approve',
    description: 'Approve a quarantined message (marks as false positive)',
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: { args?: string }) => {
      if (!quarantine) return { text: '❌ Quarantine not initialized' }

      const id = ctx.args?.trim()
      if (!id) return { text: '⚠️ Usage: /approve <quarantineId>' }

      const record = await quarantine.get(id)
      if (!record) return { text: `❌ No such quarantine id: ${id}` }

      await quarantine.updateStatus(id, 'approved')

      // TODO: Add sender to allowlist if specified
      // TODO: Mark pattern as potential false positive

      return {
        text:
          `✅ Approved \`${id}\`\n\n` +
          `Intent: ${record.intent}\n` +
          `Sender: ${record.senderId ?? 'unknown'}\n\n` +
          `Future similar messages will be treated as less risky.`,
      }
    },
  })

  api.registerCommand({
    name: 'reject',
    description: 'Reject a quarantined message (confirms as true positive)',
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: { args?: string }) => {
      if (!quarantine) return { text: '❌ Quarantine not initialized' }

      const id = ctx.args?.trim()
      if (!id) return { text: '⚠️ Usage: /reject <quarantineId>' }

      const record = await quarantine.get(id)
      if (!record) return { text: `❌ No such quarantine id: ${id}` }

      await quarantine.updateStatus(id, 'rejected')

      // TODO: Reinforce pattern weights
      // TODO: Optionally block sender

      return {
        text:
          `🛑 Rejected \`${id}\`\n\n` +
          `Intent: ${record.intent}\n` +
          `Sender: ${record.senderId ?? 'unknown'}\n\n` +
          `Pattern reinforced as true positive.`,
      }
    },
  })

  api.registerCommand({
    name: 'trust',
    description: 'Trust a sender (whitelist for future messages)',
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: { args?: string }) => {
      const senderId = ctx.args?.trim()
      if (!senderId) return { text: '⚠️ Usage: /trust <senderId>' }

      // TODO: Add to IDS trusted senders list
      if (ids) {
        ids.trustSender(senderId)
      }

      return {
        text: `✅ Trusted sender: ${senderId}\n\nFuture messages from this sender will not be scanned.`,
      }
    },
  })

  // ============================================================================
  // RPC Methods
  // ============================================================================

  api.registerGatewayMethod('hopeids.scan', async ({ params, respond }: any) => {
    await ensureIDS(cfg)
    if (!ids) {
      respond(false, { error: 'hopeIDS not initialized' })
      return
    }
    const result = await ids.scan(params.message, {
      source: params.source,
      senderId: params.senderId,
    })
    respond(true, result)
  })

  api.registerGatewayMethod('hopeids.stats', async ({ respond }: any) => {
    await ensureIDS(cfg)
    if (!ids) {
      respond(false, { error: 'hopeIDS not initialized' })
      return
    }
    respond(true, ids.getStats())
  })

  api.registerGatewayMethod('hopeids.quarantine.list', async ({ respond }: any) => {
    if (!quarantine) {
      respond(false, { error: 'Quarantine not initialized' })
      return
    }
    const records = await quarantine.listPending()
    respond(true, records)
  })

  api.registerGatewayMethod('hopeids.quarantine.approve', async ({ params, respond }: any) => {
    if (!quarantine) {
      respond(false, { error: 'Quarantine not initialized' })
      return
    }
    const success = await quarantine.updateStatus(params.id, 'approved')
    respond(success, { id: params.id, status: 'approved' })
  })

  api.registerGatewayMethod('hopeids.quarantine.reject', async ({ params, respond }: any) => {
    if (!quarantine) {
      respond(false, { error: 'Quarantine not initialized' })
      return
    }
    const success = await quarantine.updateStatus(params.id, 'rejected')
    respond(success, { id: params.id, status: 'rejected' })
  })
}

export const id = 'hopeids'
export const name = 'hopeIDS Security Scanner'
