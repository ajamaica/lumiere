/**
 * TG History Serial Execution Logic
 */

// JS Snippet for Go to Bottom & Verify
async function ensureAtBottom() {
  const SCROLL_BUTTON_SELECTOR = 'button.sticky-reveal-button'
  const MESSAGE_LIST_SELECTOR = '.MessageList'

  let attempts = 0
  while (attempts < 5) {
    const btn = document.querySelector(SCROLL_BUTTON_SELECTOR)
    if (!btn || !btn.offsetParent) break
    btn.click()
    await new Promise((r) => setTimeout(r, 500))
    attempts++
  }

  const list = document.querySelector(MESSAGE_LIST_SELECTOR)
  if (list) {
    list.scrollTop = list.scrollHeight
    await new Promise((r) => setTimeout(r, 300))
  }
}

// JS Snippet for History Extraction
function extractHistory() {
  const messages = Array.from(document.querySelectorAll('.MessageList .message-date-group'))
  // ... extraction logic
  return messages.map((m) => m.innerText).join('\n')
}
