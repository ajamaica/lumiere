/**
 * Extension display mode hook — web implementation.
 *
 * Detects whether the app is running inside a Chrome extension popup,
 * sidebar (side panel), full-screen tab, or a regular web page.
 *
 * Provides helpers to switch between modes by messaging the background
 * service worker defined in chrome-extension/background.js.
 */

import { useMemo } from 'react'

export type ExtensionDisplayMode = 'popup' | 'sidebar' | 'fullscreen' | 'web'

export interface ExtensionDisplayModeResult {
  mode: ExtensionDisplayMode
  isExtension: boolean
  openFullscreen: () => void
  openSidebar: () => void
}

/* ------------------------------------------------------------------ */
/*  Chrome runtime helpers                                             */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getChromeRuntime(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (window as any).chrome
    if (c?.runtime?.id) return c.runtime
  } catch {
    // Not in an extension context
  }
  return null
}

function sendExtensionMessage(message: Record<string, string>): void {
  const runtime = getChromeRuntime()
  runtime?.sendMessage?.(message)
}

/* ------------------------------------------------------------------ */
/*  Mode detection (runs once per page load)                           */
/* ------------------------------------------------------------------ */

function detectMode(): { mode: ExtensionDisplayMode; isExtension: boolean } {
  const runtime = getChromeRuntime()
  if (!runtime) return { mode: 'web', isExtension: false }

  const params = new URLSearchParams(window.location.search)
  const modeParam = params.get('mode')

  if (modeParam === 'popup') return { mode: 'popup', isExtension: true }
  if (modeParam === 'sidebar') return { mode: 'sidebar', isExtension: true }

  // No mode param in a tab opened via background.js → full-screen tab
  return { mode: 'fullscreen', isExtension: true }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useExtensionDisplayMode(): ExtensionDisplayModeResult {
  return useMemo(() => {
    const { mode, isExtension } = detectMode()

    const openFullscreen = () => {
      sendExtensionMessage({ action: 'open-fullscreen' })
      // Close the popup after triggering the new tab — the background
      // worker has already received the message and will open the tab.
      if (mode === 'popup') window.close()
    }

    const openSidebar = () => {
      sendExtensionMessage({ action: 'open-sidebar' })
      if (mode === 'popup') window.close()
    }

    return { mode, isExtension, openFullscreen, openSidebar }
  }, [])
}
