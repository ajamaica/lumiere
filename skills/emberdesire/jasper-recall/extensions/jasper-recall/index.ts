/**
 * Jasper Recall OpenClaw Plugin
 *
 * Semantic search over indexed memory using ChromaDB.
 * "Remember everything. Recall what matters."
 *
 * Features:
 * - `recall` tool for manual searches
 * - `/recall` command for quick lookups
 * - Auto-recall: inject relevant memories before agent processing
 */

import { execFileSync, execSync } from 'child_process'
import * as os from 'os'
import * as path from 'path'

interface PluginConfig {
  enabled?: boolean
  autoRecall?: boolean
  defaultLimit?: number
  publicOnly?: boolean
  minScore?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

interface PluginApi {
  config: {
    plugins?: {
      entries?: {
        'jasper-recall'?: {
          config?: PluginConfig
        }
      }
    }
  }
  logger: {
    info: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
    debug: (msg: string) => void
  }
  registerTool: (tool: any) => void
  registerCommand: (cmd: any) => void
  registerGatewayMethod: (name: string, handler: any) => void
  on: (event: string, handler: (event: any) => Promise<any>) => void
}

const BIN_PATH = path.join(os.homedir(), '.local', 'bin')

function runRecall(
  query: string,
  options: { limit?: number; json?: boolean; publicOnly?: boolean } = {},
): string {
  const args = [JSON.stringify(query)]
  if (options.limit) args.push('-n', String(options.limit))
  if (options.json) args.push('--json')
  if (options.publicOnly) args.push('--public-only')

  const recallPath = path.join(BIN_PATH, 'recall')
  try {
    return execFileSync(recallPath, args, { encoding: 'utf8', timeout: 30000 })
  } catch (err: any) {
    throw new Error(`Recall failed: ${err.message}`)
  }
}

function getSimilarity(result: any): number {
  return typeof result?.similarity === 'number' ? result.similarity : (result?.score ?? 0)
}

export default function register(api: PluginApi) {
  const cfg = api.config.plugins?.entries?.['jasper-recall']?.config ?? {}

  if (cfg.enabled === false) {
    api.logger.info('[jasper-recall] Plugin disabled')
    return
  }

  const defaultLimit = cfg.defaultLimit ?? 5
  const publicOnly = cfg.publicOnly ?? false
  const autoRecall = cfg.autoRecall ?? false
  const minScore = cfg.minScore ?? 0.3

  api.logger.info(
    `[jasper-recall] Initialized (limit=${defaultLimit}, publicOnly=${publicOnly}, autoRecall=${autoRecall})`,
  )

  // ============================================================================
  // Auto-Recall: inject relevant memories before agent processes the message
  // ============================================================================

  if (autoRecall) {
    api.on('before_agent_start', async (event: { prompt?: string }) => {
      // Skip if no prompt or too short
      if (!event.prompt || event.prompt.length < 10) {
        return
      }

      // Skip system/internal prompts
      if (event.prompt.startsWith('HEARTBEAT') || event.prompt.includes('NO_REPLY')) {
        return
      }

      try {
        const results = runRecall(event.prompt, {
          limit: 3,
          json: true,
          publicOnly,
        })

        const parsed = JSON.parse(results)

        // Filter by minimum score
        const relevant = parsed.filter((r: any) => getSimilarity(r) >= minScore)

        if (relevant.length === 0) {
          api.logger.debug?.('[jasper-recall] No relevant memories found for auto-recall')
          return
        }

        // Format memories for context injection
        const memoryContext = relevant
          .map(
            (r: any) =>
              `- [${r.source || 'memory'}] ${r.content.slice(0, 500)}${r.content.length > 500 ? '...' : ''}`,
          )
          .join('\n')

        api.logger.info(`[jasper-recall] Auto-injecting ${relevant.length} memories into context`)

        return {
          prependContext: `<relevant-memories>\nThe following memories may be relevant to this conversation:\n${memoryContext}\n</relevant-memories>`,
        }
      } catch (err: any) {
        api.logger.warn(`[jasper-recall] Auto-recall failed: ${err.message}`)
      }
    })
  }

  // ============================================================================
  // Tool: recall
  // ============================================================================

  api.registerTool({
    name: 'recall',
    description:
      'Semantic search over indexed memory (daily notes, session digests, documentation). Use to find context from past conversations, decisions, and learnings.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query - natural language question or keywords',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
      },
      required: ['query'],
    },
    execute: async (_id: string, { query, limit }: { query: string; limit?: number }) => {
      try {
        const results = runRecall(query, {
          limit: limit ?? defaultLimit,
          json: true,
          publicOnly,
        })

        const parsed = JSON.parse(results)

        // Format results for agent consumption
        let formatted = `## Recall Results for: "${query}"\n\n`

        if (parsed.length === 0) {
          formatted += '_No relevant memories found._\n'
        } else {
          for (const result of parsed) {
            formatted += `### ${result.source || 'Memory'}\n`
            formatted += `**Similarity:** ${(getSimilarity(result) * 100).toFixed(1)}%\n\n`
            formatted += `${result.content}\n\n---\n\n`
          }
        }

        api.logger.info(`[jasper-recall] Query "${query}" returned ${parsed.length} results`)

        return { content: [{ type: 'text', text: formatted }] }
      } catch (err: any) {
        api.logger.error(`[jasper-recall] Error: ${err.message}`)
        return { content: [{ type: 'text', text: `Recall error: ${err.message}` }] }
      }
    },
  })

  // ============================================================================
  // Command: /recall
  // ============================================================================

  api.registerCommand({
    name: 'recall',
    description: 'Search memory for relevant context',
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: { args?: string }) => {
      const query = ctx.args?.trim()
      if (!query) {
        return { text: '⚠️ Usage: /recall <search query>' }
      }

      try {
        const results = runRecall(query, { limit: defaultLimit, publicOnly })
        return { text: `🧠 **Recall Results**\n\n${results}` }
      } catch (err: any) {
        return { text: `❌ Recall failed: ${err.message}` }
      }
    },
  })

  // ============================================================================
  // Command: /index
  // ============================================================================

  api.registerCommand({
    name: 'index',
    description: 'Re-index memory files into ChromaDB',
    acceptsArgs: false,
    requireAuth: true,
    handler: async () => {
      try {
        const indexPath = path.join(BIN_PATH, 'index-digests')
        const output = execSync(indexPath, { encoding: 'utf8', timeout: 120000 })
        return { text: `🔄 **Memory Indexed**\n\n${output}` }
      } catch (err: any) {
        return { text: `❌ Index failed: ${err.message}` }
      }
    },
  })

  // ============================================================================
  // RPC Methods
  // ============================================================================

  api.registerGatewayMethod('recall.search', async ({ params, respond }: any) => {
    try {
      const { query, limit } = params
      const results = runRecall(query, { limit: limit ?? defaultLimit, json: true, publicOnly })
      respond(true, JSON.parse(results))
    } catch (err: any) {
      respond(false, { error: err.message })
    }
  })

  api.registerGatewayMethod('recall.index', async ({ respond }: any) => {
    try {
      const indexPath = path.join(BIN_PATH, 'index-digests')
      execSync(indexPath, { encoding: 'utf8', timeout: 120000 })
      respond(true, { status: 'indexed' })
    } catch (err: any) {
      respond(false, { error: err.message })
    }
  })
}

export const id = 'jasper-recall'
export const name = 'Jasper Recall - Local RAG Memory'
