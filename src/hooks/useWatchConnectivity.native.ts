import { getDefaultStore, useAtomValue } from 'jotai'
import { useEffect } from 'react'

import {
  addTriggerRequestListener,
  addVoiceMessageListener,
  sendResponseToWatch,
  syncTriggers,
} from '../../modules/watch-connectivity'
import {
  ChatProviderEvent,
  createChatProvider,
  ProviderConfig,
  SendMessageParams,
} from '../services/providers'
import { currentServerIdAtom, currentSessionKeyAtom, serversAtom, triggersAtom } from '../store'

/**
 * Resolves an atom value that may be a Promise (atomWithStorage hydration).
 * Read the raw value once and await if needed.
 */
async function resolveAtom<T>(raw: T | Promise<T>): Promise<T> {
  return raw instanceof Promise ? await raw : raw
}

/**
 * Send a message via a ChatProvider and collect the full streamed response.
 * Returns the complete response text.
 */
async function sendAndCollectResponse(
  config: ProviderConfig,
  params: SendMessageParams,
): Promise<string> {
  const provider = createChatProvider(config)
  let fullResponse = ''

  try {
    await provider.connect()
    await provider.sendMessage(params, (event: ChatProviderEvent) => {
      if (event.type === 'delta' && event.delta) {
        fullResponse += event.delta
      }
    })
  } finally {
    provider.disconnect()
  }

  return fullResponse
}

/**
 * Syncs user-created triggers to the Apple Watch and handles
 * trigger requests and voice messages from the Watch.
 *
 * When the Watch sends a trigger slug, this hook resolves the trigger,
 * creates a provider, sends the message, collects the streamed response,
 * and sends it back to the Watch for display.
 *
 * Call once in the root layout alongside useAppleShortcuts.
 */
export function useWatchConnectivity() {
  const triggers = useAtomValue(triggersAtom)
  const servers = useAtomValue(serversAtom)

  // Sync triggers → Watch whenever they change
  useEffect(() => {
    async function sync() {
      const resolved = await resolveAtom(triggers)
      const resolvedServers = await resolveAtom(servers)

      const items = Object.values(resolved)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((t) => ({
          id: t.id,
          name: t.message.length > 40 ? `${t.message.slice(0, 37)}...` : t.message,
          serverName: resolvedServers[t.serverId]?.name ?? 'Unknown server',
        }))

      await syncTriggers(items)
    }

    sync()
  }, [triggers, servers])

  // Handle trigger requests from Watch
  useEffect(() => {
    const cleanup = addTriggerRequestListener(async (slug) => {
      try {
        const store = getDefaultStore()
        const resolved = await resolveAtom(store.get(triggersAtom))
        const trigger = resolved[slug]
        if (!trigger) return

        const resolvedServers = await resolveAtom(store.get(serversAtom))
        const server = resolvedServers[trigger.serverId]
        if (!server) return

        // Switch to the trigger's server and session
        store.set(currentServerIdAtom, trigger.serverId)
        store.set(currentSessionKeyAtom, trigger.sessionKey)

        // Build provider config from the server
        const config: ProviderConfig = {
          type: server.providerType,
          url: server.url,
          token: server.clientId ?? '',
          clientId: server.clientId,
          model: server.model,
          serverId: server.id,
        }

        const response = await sendAndCollectResponse(config, {
          message: trigger.message,
          sessionKey: trigger.sessionKey,
        })

        await sendResponseToWatch(slug, response)
      } catch {
        await sendResponseToWatch(slug, 'Error: Could not get a response.')
      }
    })

    return cleanup
  }, [])

  // Handle voice dictation messages from Watch
  useEffect(() => {
    const cleanup = addVoiceMessageListener(async (text) => {
      try {
        const store = getDefaultStore()

        // Use the current active server and session — read each atom
        // once and await if still hydrating.
        const serverId = await resolveAtom(store.get(currentServerIdAtom))
        const sessionKey = await resolveAtom(store.get(currentSessionKeyAtom))

        if (!serverId || !sessionKey) return

        const resolvedServers = await resolveAtom(store.get(serversAtom))
        const server = resolvedServers[serverId]
        if (!server) return

        const config: ProviderConfig = {
          type: server.providerType,
          url: server.url,
          token: server.clientId ?? '',
          clientId: server.clientId,
          model: server.model,
          serverId: server.id,
        }

        const response = await sendAndCollectResponse(config, {
          message: text,
          sessionKey,
        })

        await sendResponseToWatch('voice', response)
      } catch {
        await sendResponseToWatch('voice', 'Error: Could not get a response.')
      }
    })

    return cleanup
  }, [])
}
