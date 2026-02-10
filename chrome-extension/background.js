// Lumiere Chrome Extension — Background Service Worker
//
// Default behaviour: clicking the extension icon opens the app in a new tab
// (or focuses an existing one).  If the browser supports the Side Panel API
// (Chrome 114+) and the user right-clicks → "Open in side panel", it will
// open there instead via the side_panel manifest entry.

const APP_PATH = 'index.html'

// Keep track of the tab we opened so we can re-focus it instead of opening duplicates.
let appTabId = null

chrome.action.onClicked.addListener(async () => {
  // If we previously opened a tab, check whether it still exists.
  if (appTabId !== null) {
    try {
      const tab = await chrome.tabs.get(appTabId)
      if (tab) {
        // Tab still exists — focus it.
        await chrome.tabs.update(appTabId, { active: true })
        await chrome.windows.update(tab.windowId, { focused: true })
        return
      }
    } catch {
      // Tab was closed; fall through to create a new one.
      appTabId = null
    }
  }

  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL(APP_PATH),
  })
  appTabId = tab.id
})

// Clear the tracked tab id when it's closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === appTabId) {
    appTabId = null
  }
})
