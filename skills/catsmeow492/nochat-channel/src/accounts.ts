import type { NoChatConfig, ResolvedNoChatAccount } from './types.js'

const DEFAULT_ACCOUNT_ID = 'default'

function normalizeAccountId(id?: string | null): string {
  const trimmed = id?.trim()
  if (!trimmed) return DEFAULT_ACCOUNT_ID
  return trimmed
}

/**
 * Resolve the nochat config section from either:
 * 1. cfg.channels.nochat (full gateway config with channel section)
 * 2. cfg.plugins.entries["nochat-channel"].config (plugin config in full gateway config)
 */
function resolveSection(cfg: any): any {
  // Prefer channels.nochat if present
  const channelSection = cfg?.channels?.nochat
  if (channelSection && typeof channelSection === 'object' && channelSection.serverUrl) {
    return channelSection
  }
  // Fall back to plugin config path
  const pluginConfig = cfg?.plugins?.entries?.['nochat-channel']?.config
  if (pluginConfig && typeof pluginConfig === 'object' && pluginConfig.serverUrl) {
    return pluginConfig
  }
  // Direct flat config (if cfg itself is the plugin config)
  if (cfg?.serverUrl) {
    return cfg
  }
  return channelSection ?? null
}

/**
 * List all configured NoChat account IDs from the config.
 * Returns ["default"] when no multi-account `accounts` section exists.
 */
export function listNoChatAccountIds(cfg: any): string[] {
  const section = resolveSection(cfg)
  const accounts = section?.accounts
  if (!accounts || typeof accounts !== 'object') return [DEFAULT_ACCOUNT_ID]
  const keys = Object.keys(accounts).filter(Boolean)
  if (keys.length === 0) return [DEFAULT_ACCOUNT_ID]
  return keys.sort((a, b) => a.localeCompare(b))
}

/**
 * Resolve the default account ID for NoChat.
 * Prefers "default" if it exists, otherwise returns the first sorted key.
 */
export function resolveDefaultNoChatAccountId(cfg: any): string {
  const ids = listNoChatAccountIds(cfg)
  if (ids.includes(DEFAULT_ACCOUNT_ID)) return DEFAULT_ACCOUNT_ID
  return ids[0] ?? DEFAULT_ACCOUNT_ID
}

/**
 * Merge base-level nochat config with account-level overrides.
 * Account-level fields override base-level fields.
 */
function mergeNoChatAccountConfig(cfg: any, accountId: string): Partial<NoChatConfig> {
  const section = resolveSection(cfg) ?? {}
  const { accounts: _ignored, ...baseFields } = section
  const accountFields = section?.accounts?.[accountId] ?? {}
  return { ...baseFields, ...accountFields }
}

/**
 * Resolve a NoChat account from config, handling both flat and multi-account layouts.
 */
export function resolveNoChatAccount(opts: {
  cfg: any
  accountId?: string | null
}): ResolvedNoChatAccount {
  const accountId = normalizeAccountId(opts.accountId)
  const section = resolveSection(opts.cfg)

  if (!section) {
    return {
      accountId,
      name: '',
      enabled: false,
      configured: false,
      config: {
        serverUrl: '',
        apiKey: '',
        agentName: '',
        trust: { default: 'untrusted', agents: {} },
      } as NoChatConfig,
      baseUrl: '',
    }
  }

  const merged = mergeNoChatAccountConfig(opts.cfg, accountId)

  const baseEnabled = section.enabled
  const accountEnabled = merged.enabled !== false
  const enabled = baseEnabled !== false && accountEnabled

  const serverUrl = (merged.serverUrl as string)?.trim() ?? ''
  const apiKey = (merged.apiKey as string)?.trim() ?? ''
  const agentName = (merged.agentName as string)?.trim() ?? ''

  const configured = Boolean(serverUrl && apiKey)
  const baseUrl = serverUrl ? serverUrl.replace(/\/+$/, '') : ''

  return {
    accountId,
    name: agentName,
    enabled,
    configured,
    config: merged as NoChatConfig,
    baseUrl,
  }
}
