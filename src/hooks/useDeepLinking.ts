import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { getDefaultStore } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'

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
 *
 * @param isLocked – when true (biometric lock active), deep links are queued
 *                   and processed once the app is unlocked.
 */
export function useDeepLinking(isLocked: boolean) {
  const router = useRouter()
  const pendingUrlRef = useRef<string | null>(null)
  const isLockedRef = useRef(isLocked)
  useEffect(() => {
    isLockedRef.current = isLocked
  }, [isLocked])

  const handleUrl = useCallback(
    async (url: string) => {
      const result = parseDeepLink(url)
      if (!result) return

      if (result.type === 'trigger') {
        // Wait for atoms to be set before touching navigation
        await executeTrigger(result.slug)
        // Dismiss any open modals to reveal the existing chat screen.
        // All non-index routes are modals, so this brings us back to the
        // home/chat screen without remounting it.
        if (router.canDismiss()) {
          router.dismissAll()
        }
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(result.route as any)
    },
    [router],
  )

  // Process any queued deep link once the app is unlocked
  useEffect(() => {
    if (!isLocked && pendingUrlRef.current) {
      const url = pendingUrlRef.current
      pendingUrlRef.current = null
      handleUrl(url)
    }
  }, [isLocked, handleUrl])

  useEffect(() => {
    // Handle the URL that launched / resumed the app (cold start + background resume)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl) {
        if (isLockedRef.current) {
          pendingUrlRef.current = initialUrl
        } else {
          handleUrl(initialUrl)
        }
      }
    }
    handleInitialURL()

    const subscription = Linking.addEventListener('url', (event) => {
      if (isLockedRef.current) {
        pendingUrlRef.current = event.url
      } else {
        handleUrl(event.url)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [router, handleUrl])
}
