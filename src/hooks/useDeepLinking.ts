import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { getDefaultStore } from 'jotai'
import { useEffect } from 'react'

import {
  currentServerIdAtom,
  currentSessionKeyAtom,
  pendingTriggerMessageAtom,
  triggersAtom,
} from '../store'

const VALID_ROUTES = [
  'settings',
  'servers',
  'sessions',
  'overview',
  'scheduler',
  'favorites',
  'gallery',
  'triggers',
] as const

type ValidRoute = (typeof VALID_ROUTES)[number]

function isValidRoute(path: string): path is ValidRoute {
  return VALID_ROUTES.includes(path as ValidRoute)
}

interface DeepLinkResult {
  type: 'navigate'
  route: string
  params: Record<string, string>
}

interface TriggerResult {
  type: 'trigger'
  slug: string
}

function parseDeepLink(url: string): DeepLinkResult | TriggerResult | null {
  try {
    const parsed = Linking.parse(url)
    const path = parsed.path?.replace(/^\/+/, '').replace(/\/+$/, '') ?? ''

    if (!path || path === '') {
      return {
        type: 'navigate',
        route: '/',
        params: (parsed.queryParams as Record<string, string>) ?? {},
      }
    }

    // Match trigger deep links: lumiere://trigger/autotrigger/{slug}
    const triggerMatch = path.match(/^trigger\/autotrigger\/([a-zA-Z0-9]{8})$/)
    if (triggerMatch) {
      return { type: 'trigger', slug: triggerMatch[1] }
    }

    if (isValidRoute(path)) {
      return {
        type: 'navigate',
        route: `/${path}`,
        params: (parsed.queryParams as Record<string, string>) ?? {},
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Executes a trigger by switching to the trigger's server/session and
 * setting a pending message that ChatScreen will pick up and auto-send.
 */
async function executeTrigger(slug: string) {
  const store = getDefaultStore()
  const rawTriggers = store.get(triggersAtom)

  // atomWithStorage may return a Promise before hydration completes
  const triggers = rawTriggers instanceof Promise ? await rawTriggers : rawTriggers

  const trigger = triggers[slug]

  if (!trigger) {
    // Slug doesn't exist — silently ignore
    return
  }

  // Switch to the trigger's server and session
  store.set(currentServerIdAtom, trigger.serverId)
  store.set(currentSessionKeyAtom, trigger.sessionKey)

  // Set the pending message so ChatScreen auto-sends it once connected
  store.set(pendingTriggerMessageAtom, trigger.message)
}

/**
 * Handles deep links that arrive while the app is already running.
 * Expo Router automatically handles deep links on cold start via the scheme config,
 * but this hook handles URLs received while the app is in the foreground/background.
 */
export function useDeepLinking() {
  const router = useRouter()

  useEffect(() => {
    // Handle the URL that launched / resumed the app (cold start + background resume)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl) {
        handleUrl(initialUrl)
      }
    }
    handleInitialURL()

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url)
    })

    function handleUrl(url: string) {
      const result = parseDeepLink(url)
      if (!result) return

      if (result.type === 'trigger') {
        executeTrigger(result.slug)
        // Navigate to home so the chat screen is visible
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/' as any)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(result.route as any)
    }

    return () => {
      subscription.remove()
    }
  }, [router])
}
