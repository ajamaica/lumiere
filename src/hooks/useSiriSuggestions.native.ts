import { useAtomValue } from 'jotai'
import { useEffect } from 'react'

import { donateOpenChatActivity, isAvailable } from '../../modules/apple-shortcuts'
import {
  currentServerIdAtom,
  currentSessionKeyAtom,
  parseSessionKey,
  serversAtom,
  type ServersDict,
  type SessionAliases,
  sessionAliasesAtom,
} from '../store'

/**
 * Resolves an atom value, handling the Promise that
 * atomWithStorage may return before hydration completes.
 */
async function resolveAtom<T>(raw: T | Promise<T>): Promise<T> {
  return raw instanceof Promise ? await raw : raw
}

/**
 * Donates NSUserActivity to Siri whenever the active server/session changes,
 * allowing iOS to learn usage patterns and surface Siri Suggestions.
 *
 * Call once in the root layout.
 */
export function useSiriSuggestions() {
  const serverId = useAtomValue(currentServerIdAtom)
  const sessionKey = useAtomValue(currentSessionKeyAtom)
  const servers = useAtomValue(serversAtom)
  const aliases = useAtomValue(sessionAliasesAtom)

  useEffect(() => {
    if (!isAvailable()) return
    if (!serverId || !sessionKey) return

    async function donate() {
      const resolvedServers = await resolveAtom<ServersDict>(servers)
      const resolvedAliases = await resolveAtom<SessionAliases>(aliases)

      const server = resolvedServers[serverId]
      if (!server) return

      const { sessionName: rawSessionName } = parseSessionKey(sessionKey)
      const sessionName = resolvedAliases[sessionKey] || rawSessionName

      await donateOpenChatActivity(serverId, server.name, sessionKey, sessionName)
    }

    donate()
  }, [serverId, sessionKey, servers, aliases])
}
