import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'

const VALID_ROUTES = [
  'settings',
  'servers',
  'sessions',
  'overview',
  'scheduler',
  'favorites',
  'gallery',
] as const

type ValidRoute = (typeof VALID_ROUTES)[number]

function isValidRoute(path: string): path is ValidRoute {
  return VALID_ROUTES.includes(path as ValidRoute)
}

function parseDeepLink(url: string): { route: string; params: Record<string, string> } | null {
  try {
    const parsed = Linking.parse(url)
    const path = parsed.path?.replace(/^\/+/, '').replace(/\/+$/, '') ?? ''

    if (!path || path === '') {
      return { route: '/', params: (parsed.queryParams as Record<string, string>) ?? {} }
    }

    if (isValidRoute(path)) {
      return { route: `/${path}`, params: (parsed.queryParams as Record<string, string>) ?? {} }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Handles deep links that arrive while the app is already running.
 * Expo Router automatically handles deep links on cold start via the scheme config,
 * but this hook handles URLs received while the app is in the foreground/background.
 */
export function useDeepLinking() {
  const router = useRouter()

  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      const result = parseDeepLink(event.url)
      if (result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(result.route as any)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [router])
}
