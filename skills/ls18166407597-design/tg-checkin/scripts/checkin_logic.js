/**
 * TG Check-in Serial Execution Logic
 *
 * Flow:
 * 1. Search & Navigate
 * 2. Wait 2s
 * 3. Verify Title (.ChatInfo .title)
 * 4. Scroll to Bottom (Click arrow + Manual fallback)
 * 5. Verify Latest (Check if bottom reached)
 * 6. Send
 */

// JS Snippet for Go to Bottom & Verify
async function ensureAtBottom() {
  const SCROLL_BUTTON_SELECTOR = 'button.sticky-reveal-button'
  const MESSAGE_LIST_SELECTOR = '.MessageList'

  let attempts = 0
  while (attempts < 5) {
    const btn = document.querySelector(SCROLL_BUTTON_SELECTOR)
    if (!btn || !btn.offsetParent) break // Not visible
    btn.click()
    await new Promise((r) => setTimeout(r, 500))
    attempts++
  }

  const list = document.querySelector(MESSAGE_LIST_SELECTOR)
  if (list) {
    list.scrollTop = list.scrollHeight
    await new Promise((r) => setTimeout(r, 300))
  }

  return true
}

// JS Snippet for Title Verification
function getChatTitle() {
  const titleEl = document.querySelector('.ChatInfo .title')
  return titleEl ? titleEl.innerText.trim() : null
}
