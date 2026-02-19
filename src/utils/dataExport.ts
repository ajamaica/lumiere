import type { FavoriteItem, ServersDict, SessionAliases, TriggersDict } from '../store/types'

/**
 * Version-stamped backup format that includes all user data.
 *
 * Servers intentionally exclude tokens/passwords — those must be re-entered
 * after import to avoid leaking credentials through backup files.
 */
export interface LumiereBackup {
  version: 2
  exportedAt: string
  servers: Array<{
    id: string
    name: string
    url: string
    clientId?: string
    providerType: string
    model?: string
    createdAt: number
  }>
  favorites: FavoriteItem[]
  triggers: TriggersDict
  sessionAliases: SessionAliases
}

/**
 * Build a full backup object from the current app state.
 *
 * Tokens and passwords are intentionally excluded for security.
 */
export function buildFullBackup(data: {
  servers: ServersDict
  favorites: FavoriteItem[]
  triggers: TriggersDict
  sessionAliases: SessionAliases
}): LumiereBackup {
  const serversList = Object.values(data.servers).sort((a, b) => a.createdAt - b.createdAt)

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    servers: serversList.map(({ id, name, url, clientId, providerType, model, createdAt }) => ({
      id,
      name,
      url,
      clientId,
      providerType,
      model,
      createdAt,
    })),
    favorites: data.favorites,
    triggers: data.triggers,
    sessionAliases: data.sessionAliases,
  }
}

/**
 * Validate that a parsed JSON object looks like a Lumiere backup.
 *
 * Returns the parsed backup or `null` if the structure is invalid.
 */
export function parseBackup(json: unknown): LumiereBackup | null {
  if (!json || typeof json !== 'object') return null
  const obj = json as Record<string, unknown>

  // Support both v1 (servers-only) and v2 (full) backups
  if (obj.version !== 1 && obj.version !== 2) return null
  if (!Array.isArray(obj.servers)) return null

  return {
    version: 2,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    servers: obj.servers,
    favorites: Array.isArray(obj.favorites) ? obj.favorites : [],
    triggers:
      obj.triggers && typeof obj.triggers === 'object' ? (obj.triggers as TriggersDict) : {},
    sessionAliases:
      obj.sessionAliases && typeof obj.sessionAliases === 'object'
        ? (obj.sessionAliases as SessionAliases)
        : {},
  }
}
