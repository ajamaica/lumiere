// Lumiere Chrome Extension — Background Service Worker
//
// Display modes:
//   1. Popup    — clicking the extension icon opens the app as a popup (default_popup)
//   2. Tab      — full-screen mode, opened via runtime message from popup/sidebar
//   3. Sidebar  — Chrome Side Panel (114+), opened via runtime message
//
// The popup and sidebar communicate with this worker to switch between modes.

const APP_PATH = 'index.html'

// Keep track of the full-screen tab so we can re-focus instead of opening duplicates.
let appTabId = null

// Listen for messages from the popup or side panel to switch display modes.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'open-fullscreen') {
    openFullscreen().then(() => sendResponse({ success: true }))
    return true // keep channel open for async response
  }

  if (message.action === 'open-sidebar') {
    openSidebar()
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }))
    return true
  }
})

async function openFullscreen() {
  // Re-focus existing tab if it's still open.
  if (appTabId !== null) {
    try {
      const tab = await chrome.tabs.get(appTabId)
      if (tab) {
        await chrome.tabs.update(appTabId, { active: true })
        await chrome.windows.update(tab.windowId, { focused: true })
        return
      }
    } catch {
      appTabId = null
    }
  }

  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL(APP_PATH),
  })
  appTabId = tab.id
}

async function openSidebar() {
  const win = await chrome.windows.getCurrent()
  await chrome.sidePanel.open({ windowId: win.id })
}

// Clear the tracked tab id when it's closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === appTabId) {
    appTabId = null
  }
})
