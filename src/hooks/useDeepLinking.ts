import * as Linking from 'expo-linking'
import { type Href, useRouter } from 'expo-router'
import { getDefaultStore, useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'

import {
  currentServerIdAtom,
  currentSessionKeyAtom,
  pendingTriggerMessageAtom,
  type TriggerConfig,
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

/**
 * Resolves the triggers atom value, handling the Promise that
 * atomWithStorage may return before hydration completes.
 */
async function resolveTriggers(
  raw: Record<string, TriggerConfig> | Promise<Record<string, TriggerConfig>>,
): Promise<Record<string, TriggerConfig>> {
  return raw instanceof Promise ? await raw : raw
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
    const triggerMatch = path.match(/^autotrigger\/([a-zA-Z0-9]{8})$/)
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
  const triggers = await resolveTriggers(store.get(triggersAtom))
  const trigger = triggers[slug]
  if (!trigger) return

  store.set(currentServerIdAtom, trigger.serverId)
  store.set(currentSessionKeyAtom, trigger.sessionKey)
  store.set(pendingTriggerMessageAtom, trigger.message)
}

/**
 * Handles deep links that arrive while the app is already running.
 * Uses the same robust hydration-aware pattern as useQuickActions to ensure
 * triggers are available before processing URLs.
 *
 * @param isLocked – when true (biometric lock active), deep links are queued
 *                   and processed once the app is unlocked.
 */
export function useDeepLinking(isLocked: boolean) {
  const router = useRouter()
  // Subscribe to triggers atom to ensure hydration completes before handling URLs
  // This matches the pattern used by useQuickActions for reliable trigger execution
  const triggers = useAtomValue(triggersAtom)
  const pendingUrlRef = useRef<string | null>(null)
  const isLockedRef = useRef(isLocked)
  const initialUrlHandledRef = useRef(false)

  useEffect(() => {
    isLockedRef.current = isLocked
  }, [isLocked])

  const handleUrl = useCallback(
    async (url: string) => {
      const result = parseDeepLink(url)
      if (!result) return

      if (result.type === 'trigger') {
        await executeTrigger(result.slug)
        // Dismiss any open modals to reveal the existing chat screen
        if (router.canDismiss()) {
          router.dismissAll()
        }
        return
      }

      router.push(result.route as Href)
    },
    [router],
  )

  // Process any queued deep link once triggers are hydrated and app is unlocked
  useEffect(() => {
    // Wait for triggers to be hydrated (not a Promise) and app unlocked
    if (triggers instanceof Promise) return
    if (isLocked) return
    if (!pendingUrlRef.current) return

    const url = pendingUrlRef.current
    pendingUrlRef.current = null
    handleUrl(url)
  }, [triggers, isLocked, handleUrl])

  // Handle cold start: check initial URL once triggers are hydrated
  useEffect(() => {
    // Skip if already handled or triggers not hydrated yet
    if (initialUrlHandledRef.current) return
    if (triggers instanceof Promise) return

    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL()
      if (!initialUrl) return

      initialUrlHandledRef.current = true

      if (isLockedRef.current) {
        pendingUrlRef.current = initialUrl
      } else {
        handleUrl(initialUrl)
      }
    }
    handleInitialURL()
  }, [triggers, handleUrl])

  // Listen for URLs received while app is in foreground/background
  useEffect(() => {
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
  }, [handleUrl])
}
