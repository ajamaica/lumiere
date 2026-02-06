// NoChat Channel Plugin — Entry Point
// Wires the NoChat channel plugin into OpenClaw's plugin SDK.

import { NoChatApiClient } from './src/api/client.js'
import { noChatPlugin } from './src/plugin.js'
import { getNoChatRuntime, setNoChatRuntime } from './src/runtime.js'
import { PollingTransport } from './src/transport/polling.js'
import type { NoChatMessage } from './src/types.js'

// Track active transports for cleanup
const activeTransports = new Map<string, PollingTransport>()

const plugin = {
  id: 'nochat-channel',
  name: 'NoChat Channel',
  description: 'NoChat encrypted messaging channel for agent-to-agent communication',
  configSchema: {
    type: 'object',
    properties: {
      serverUrl: { type: 'string' },
      apiKey: { type: 'string' },
      agentName: { type: 'string' },
      agentId: { type: 'string' },
      transport: { type: 'string', enum: ['auto', 'polling', 'webhook', 'websocket'] },
      polling: {
        type: 'object',
        properties: {
          intervalMs: { type: 'number', default: 15000 },
          activeIntervalMs: { type: 'number', default: 5000 },
          idleIntervalMs: { type: 'number', default: 60000 },
        },
      },
      webhook: {
        type: 'object',
        properties: {
          path: { type: 'string', default: '/nochat-webhook' },
          secret: { type: 'string' },
        },
      },
      trust: { type: 'object' },
      sessions: { type: 'object' },
      crypto: { type: 'object' },
      rateLimits: { type: 'object' },
    },
    required: ['serverUrl', 'apiKey', 'agentName'],
  },
  register(api: any) {
    // Store the runtime for message dispatch (same pattern as BlueBubbles)
    setNoChatRuntime(api.runtime)
    api.registerChannel({ plugin: noChatPlugin })
    api.registerService({
      id: 'nochat-transport',
      start: () => {
        console.log('[NoChat] Transport service started')
      },
      stop: () => {
        // Stop all active transports
        for (const [id, transport] of activeTransports) {
          transport.stop()
          console.log(`[NoChat] Stopped transport for account ${id}`)
        }
        activeTransports.clear()
        console.log('[NoChat] Transport service stopped')
      },
    })
  },
}

// Override startAccount to wire up real polling + dispatch
noChatPlugin.gateway.startAccount = async (ctx: any) => {
  const account = ctx.account
  const config = account.config

  if (!config?.serverUrl || !config?.apiKey) {
    ctx.log?.warn?.(`[nochat:${account.accountId}] not configured — skipping`)
    return
  }

  ctx.setStatus?.({
    accountId: account.accountId,
    baseUrl: config.serverUrl,
  })

  ctx.log?.info?.(`[nochat:${account.accountId}] starting polling transport`)

  // Create API client and polling transport
  const client = new NoChatApiClient(config.serverUrl, config.apiKey)

  // Resolve our own user_id (messages use sender_id = user_id, NOT agent_id)
  let selfUserId = config.userId // Allow explicit config override
  if (!selfUserId) {
    // Method 1: GET /api/users/me — most reliable, works even with 0 conversations
    try {
      const resp = await fetch(`${config.serverUrl.replace(/\/+$/, '')}/api/users/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      })
      if (resp.ok) {
        const data = (await resp.json()) as { user?: { id?: string } }
        if (data.user?.id) {
          selfUserId = data.user.id
          console.log(`[NoChat] Resolved self user_id via /api/users/me: ${selfUserId}`)
        }
      }
    } catch (err) {
      console.log(`[NoChat] /api/users/me failed: ${(err as Error).message}`)
    }
    // Method 2: fallback to conversation participants lookup
    if (!selfUserId) {
      try {
        const convos = await client.listConversations()
        if (convos.length > 0 && convos[0].participants) {
          const me = convos[0].participants.find(
            (p: any) =>
              p.username === `agent:${config.agentName}` || p.username === config.agentName,
          )
          if (me) {
            selfUserId = me.user_id
            console.log(`[NoChat] Resolved self user_id via conversations: ${selfUserId}`)
          }
        }
      } catch (err) {
        console.log(`[NoChat] Could not resolve self user_id: ${(err as Error).message}`)
      }
    }
    if (!selfUserId) {
      console.log(
        `[NoChat] WARNING: Could not resolve self user_id — self-message filtering disabled. Add userId to plugin config to fix.`,
      )
    }
  }
  const transport = new PollingTransport(client, config.polling ?? {}, selfUserId)

  // Wire up inbound message handling
  transport.onMessage(async (msg: NoChatMessage) => {
    try {
      await handleNoChatInbound(ctx, account, config, client, msg)
    } catch (err) {
      console.log(`[NoChat] Error handling inbound message: ${(err as Error).message}`)
      console.log(`[NoChat] Error stack: ${(err as Error).stack}`)
    }
  })

  await transport.start()
  activeTransports.set(account.accountId, transport)

  // Clean up on abort
  ctx.abortSignal?.addEventListener?.('abort', () => {
    transport.stop()
    activeTransports.delete(account.accountId)
  })
}

/**
 * Handle an inbound NoChat message — resolve route, format, dispatch to agent session.
 */
async function handleNoChatInbound(
  ctx: any,
  account: any,
  config: any,
  client: NoChatApiClient,
  msg: NoChatMessage,
): Promise<void> {
  const core = getNoChatRuntime()
  const senderName = msg.sender_name || msg.sender_id.slice(0, 8)
  const senderId = msg.sender_id

  // Decode message content
  let text: string
  try {
    const raw = msg.encrypted_content || ''
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    // Handle double base64 encoding
    try {
      const double = Buffer.from(decoded, 'base64').toString('utf-8')
      // If double-decoded looks like text (not gibberish), use it
      text = /^[\x20-\x7E\n\r\t]/.test(double) && double.length > 0 ? double : decoded
    } catch {
      text = decoded
    }
  } catch {
    text = msg.encrypted_content || '[unreadable message]'
  }

  console.log(`[NoChat] Inbound from ${senderId.slice(0, 8)}: ${text.slice(0, 80)}...`)
  console.log(
    `[NoChat] ctx.cfg exists: ${!!ctx.cfg}, core exists: ${!!core}, core.channel exists: ${!!core?.channel}`,
  )

  // Resolve agent route (session key)
  const route = core.channel.routing.resolveAgentRoute({
    cfg: ctx.cfg,
    channel: 'nochat',
    accountId: account.accountId,
    peer: { kind: 'dm', id: senderId },
  })
  console.log(
    `[NoChat] Route resolved: sessionKey=${route.sessionKey}, agentId=${route.agentId}, accountId=${route.accountId}`,
  )

  // Format the inbound envelope
  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(ctx.cfg)
  const storePath = core.channel.session.resolveStorePath(ctx.cfg?.session?.store, {
    agentId: route.agentId,
  })
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  })
  console.log(`[NoChat] Envelope prepared, storePath=${storePath}, dispatching...`)

  const body = core.channel.reply.formatAgentEnvelope({
    channel: 'NoChat',
    from: senderName,
    timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
    previousTimestamp,
    envelope: envelopeOptions,
    body: text,
  })

  // Build the ctx payload (same shape BlueBubbles uses)
  const ctxPayload = {
    Body: body,
    BodyForAgent: body,
    RawBody: text,
    CommandBody: text,
    BodyForCommands: text,
    From: `nochat:${senderId}`,
    To: `nochat:${config.agentId || config.agentName}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: 'direct',
    ConversationLabel: senderName,
    SenderName: senderName,
    SenderId: senderId,
    Provider: 'nochat',
    Surface: 'nochat',
    MessageSid: msg.id,
    CommandAuthorized: true, // Trust tiers handle authorization
  }

  // Dispatch: pushes inbound to agent, waits for reply, delivers reply back to NoChat
  console.log(`[NoChat] Dispatching to session ${route.sessionKey}...`)
  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: ctx.cfg,
    dispatcherOptions: {
      deliver: async (payload: any) => {
        // Send the agent's reply back to NoChat
        const replyText = payload.text || ''
        if (!replyText.trim()) return

        const conversationId = msg.conversation_id
        if (!conversationId) {
          console.log('[NoChat] No conversation_id on inbound message — cannot reply')
          return
        }

        const result = await client.sendMessage(conversationId, replyText)
        if (result.ok) {
          console.log(`[NoChat] Replied to ${senderName} in ${conversationId.slice(0, 8)}`)
        } else {
          console.log(`[NoChat] Reply failed: ${result.error}`)
        }
      },
      onError: (err: unknown, info: { kind: string }) => {
        console.log(`[NoChat] Dispatch error (${info.kind}): ${err}`)
      },
    },
  })
}

export default plugin

// Re-export public API for consumers
export {
  listNoChatAccountIds,
  resolveDefaultNoChatAccountId,
  resolveNoChatAccount,
} from './src/accounts.js'
export { NoChatApiClient } from './src/api/client.js'
export { NoChatChannel } from './src/channel.js'
export { noChatPlugin } from './src/plugin.js'
export { SessionRouter } from './src/session/router.js'
export { looksLikeNoChatTargetId, normalizeNoChatTarget, parseNoChatTarget } from './src/targets.js'
export { PollingTransport } from './src/transport/polling.js'
export { TrustManager } from './src/trust/manager.js'
export { TrustStore } from './src/trust/store.js'
export type {
  NoChatConfig,
  NoChatConversation,
  NoChatMessage,
  ResolvedNoChatAccount,
  SessionConfig,
  TrustConfig,
  TrustTier,
} from './src/types.js'
