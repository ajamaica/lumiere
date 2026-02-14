/**
 * Extension display mode hook — web implementation.
 *
 * Detects whether the app is running inside a Chrome extension popup,
 * sidebar (side panel), full-screen tab, or a regular web page.
 *
 * Provides helpers to switch between modes.  Where possible we call
 * Chrome extension APIs directly (e.g. chrome.tabs.create) so there
 * is no race between sending a message and the popup closing.  The
 * background service worker is used only as a fallback.
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
/*  Chrome API helpers                                                 */
/* ------------------------------------------------------------------ */

function getChrome(): ChromeExtensionAPI | null {
  try {
    const c = window.chrome
    if (c?.runtime?.id) return c
  } catch {
    // Not in an extension context
  }
  return null
}

/* ------------------------------------------------------------------ */
/*  Mode detection (runs once per page load)                           */
/* ------------------------------------------------------------------ */

function detectMode(): { mode: ExtensionDisplayMode; isExtension: boolean } {
  const c = getChrome()
  if (!c) return { mode: 'web', isExtension: false }

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
      const c = getChrome()
      if (!c) return

      // Call chrome.tabs.create directly — avoids the race condition
      // where the popup closes before the background worker processes
      // a runtime message.
      c.tabs.create({ url: c.runtime.getURL('index.html') })
      if (mode === 'popup') window.close()
    }

    const openSidebar = () => {
      const c = getChrome()
      if (!c) return

      // sidePanel.open requires a windowId; get it then open.
      c.windows.getCurrent().then((win: { id: number }) => {
        c.sidePanel
          .open({ windowId: win.id })
          .then(() => {
            if (mode === 'popup') window.close()
          })
          .catch(() => {
            // Fallback: message the background service worker
            c.runtime.sendMessage({ action: 'open-sidebar' })
            if (mode === 'popup') setTimeout(() => window.close(), 300)
          })
      })
    }

    return { mode, isExtension, openFullscreen, openSidebar }
  }, [])
}
