/**
 * NoChat ChannelPlugin — the integration glue that conforms to OpenClaw's
 * ChannelPlugin<ResolvedNoChatAccount> interface.
 */

import {
  listNoChatAccountIds,
  resolveDefaultNoChatAccountId,
  resolveNoChatAccount,
} from './accounts.js'
import { NoChatApiClient } from './api/client.js'
import { looksLikeNoChatTargetId, normalizeNoChatTarget } from './targets.js'
import type { ResolvedNoChatAccount } from './types.js'

// We don't import ChannelPlugin directly from openclaw/plugin-sdk to avoid
// hard-dependency resolution issues in test. The shape is duck-typed by OpenClaw's
// runtime anyway.

const meta = {
  id: 'nochat' as const,
  label: 'NoChat',
  selectionLabel: 'NoChat (Encrypted Agent Messaging)',
  docsPath: '/channels/nochat',
  docsLabel: 'nochat',
  blurb: 'Post-quantum encrypted messaging for AI agents.',
  aliases: ['nc'],
  order: 80,
}

export const noChatPlugin = {
  id: 'nochat' as const,
  meta,

  capabilities: {
    chatTypes: ['direct'] as string[],
    media: false,
    reactions: true,
    edit: true,
    delete: true,
  },

  config: {
    listAccountIds: (cfg: any): string[] => listNoChatAccountIds(cfg),

    resolveAccount: (cfg: any, accountId?: string | null): ResolvedNoChatAccount =>
      resolveNoChatAccount({ cfg, accountId }),

    defaultAccountId: (cfg: any): string => resolveDefaultNoChatAccountId(cfg),

    isConfigured: (account: ResolvedNoChatAccount): boolean => account.configured,

    describeAccount: (account: ResolvedNoChatAccount) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
      baseUrl: account.baseUrl,
    }),

    setAccountEnabled: ({
      cfg,
      accountId,
      enabled,
    }: {
      cfg: any
      accountId: string
      enabled: boolean
    }) => {
      // Mutate the config to toggle enabled state
      // Support both channels.nochat (full config) and flat plugin config
      const section = cfg?.channels?.nochat ?? (cfg?.serverUrl ? cfg : null)
      if (!section) return cfg
      const accounts = section.accounts
      if (accounts && accounts[accountId]) {
        accounts[accountId].enabled = enabled
      } else {
        section.enabled = enabled
      }
      return cfg
    },

    deleteAccount: ({ cfg, accountId }: { cfg: any; accountId: string }) => {
      const section = cfg?.channels?.nochat ?? (cfg?.serverUrl ? cfg : null)
      const accounts = section?.accounts
      if (accounts && accounts[accountId]) {
        delete accounts[accountId]
      }
      return cfg
    },
  },

  security: {
    resolveDmPolicy: ({
      cfg,
      accountId,
      account,
    }: {
      cfg: any
      accountId?: string
      account: ResolvedNoChatAccount
    }) => {
      return {
        policy: 'trust' as const, // NoChat uses trust tiers, not pairing
        allowFrom: [] as string[],
        policyPath: `channels.nochat.trust`,
        allowFromPath: `channels.nochat.trust.agents`,
      }
    },
  },

  messaging: {
    normalizeTarget: (raw: string) => normalizeNoChatTarget(raw),

    targetResolver: {
      looksLikeId: (id: string) => looksLikeNoChatTargetId(id),
      hint: '<agent_id|agent_name|conversation_id>',
    },
  },

  outbound: {
    deliveryMode: 'direct' as const,
    textChunkLimit: 4000,

    resolveTarget: ({ to }: { to?: string }) => {
      const trimmed = to?.trim()
      if (!trimmed) {
        return {
          ok: false as const,
          error: new Error(
            'Delivering to NoChat requires --to <agent_id|agent_name|conversation_id>',
          ),
        }
      }
      return { ok: true as const, to: trimmed }
    },

    sendText: async ({
      cfg,
      to,
      text,
      accountId,
    }: {
      cfg: any
      to: string
      text: string
      accountId?: string
    }) => {
      const account = resolveNoChatAccount({ cfg, accountId })
      if (!account.configured) {
        return { channel: 'nochat', ok: false, error: 'NoChat account not configured' }
      }
      const client = new NoChatApiClient(account.baseUrl, account.config.apiKey)
      const result = await client.sendMessage(to, text)
      return { channel: 'nochat', ...result }
    },
  },

  gateway: {
    startAccount: async (ctx: any) => {
      const account = ctx.account as ResolvedNoChatAccount
      ctx.setStatus?.({
        accountId: account.accountId,
        baseUrl: account.baseUrl,
      })
      ctx.log?.info?.(`[nochat:${account.accountId}] starting polling transport`)
      // Actual transport start is handled by the registered service
    },
  },

  status: {
    probeAccount: async ({
      account,
      timeoutMs,
    }: {
      account: ResolvedNoChatAccount
      timeoutMs?: number
    }) => {
      try {
        const url = `${account.baseUrl}/health`
        const controller = new AbortController()
        const timeout = timeoutMs ?? 5000
        const timer = setTimeout(() => controller.abort(), timeout)

        const resp = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        })
        clearTimeout(timer)

        if (!resp.ok) {
          return { ok: false, status: resp.status }
        }
        const data = await resp.json()
        return { ok: true, ...data }
      } catch (err) {
        return { ok: false, error: (err as Error).message }
      }
    },
  },
}
