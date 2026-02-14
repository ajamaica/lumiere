/**
 * useActiveWebsite — web implementation.
 *
 * When running inside the Chrome extension (popup or sidebar), queries the
 * background service worker for the URL of the tab the user is currently
 * viewing.  Listens for `active-tab-changed` broadcasts so the value
 * stays up-to-date when the user switches tabs.
 *
 * Returns `null` when the app is not inside an extension, or when the
 * active tab is an internal chrome:// / extension page.
 */

import { useEffect, useState } from 'react'

import { useExtensionDisplayMode } from './useExtensionDisplayMode.web'

function getChrome(): ChromeExtensionAPI | null {
  try {
    const c = window.chrome
    if (c?.runtime?.id) return c
  } catch {
    // Not in an extension context
  }
  return null
}

export function useActiveWebsite(): string | null {
  const { mode, isExtension } = useExtensionDisplayMode()
  const [activeUrl, setActiveUrl] = useState<string | null>(null)

  // Only track the website for popup and sidebar modes.
  // In fullscreen mode the extension IS the tab, so there's no
  // external website to report.
  const shouldTrack = isExtension && (mode === 'popup' || mode === 'sidebar')

  // Fetch the active tab URL on mount
  useEffect(() => {
    if (!shouldTrack) return

    const c = getChrome()
    if (!c) return

    c.runtime.sendMessage({ action: 'get-active-tab-url' }).then(
      (response: { url: string | null } | undefined) => {
        setActiveUrl(response?.url ?? null)
      },
      () => {
        // Message failed — ignore
      },
    )
  }, [shouldTrack])

  // Listen for tab changes broadcast by the background worker
  useEffect(() => {
    if (!shouldTrack) return

    const c = getChrome()
    if (!c) return

    const listener = (message: Record<string, unknown>) => {
      if (message.action === 'active-tab-changed') {
        setActiveUrl(message.url ?? null)
      }
    }

    c.runtime.onMessage.addListener(listener)
    return () => {
      c.runtime.onMessage.removeListener(listener)
    }
  }, [shouldTrack])

  return activeUrl
}
