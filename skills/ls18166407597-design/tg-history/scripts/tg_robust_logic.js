/**
 * TG Robust Logic Module (History)
 */

async function navigateAndGetHistory(targetName, count = 10) {
  // Reuse navigation logic
  const clearBtn = document.querySelector('.sidebar-search-clear, button.clear')
  if (clearBtn) clearBtn.click()

  const searchInput = document.querySelector('#sidebar-search-input, .search-input input')
  if (!searchInput) return { error: 'Search input not found' }

  searchInput.focus()
  document.execCommand('insertText', false, targetName)

  await new Promise((r) => setTimeout(r, 2000))
  const items = Array.from(
    document.querySelectorAll('.chat-list .ListItem, .search-group-results .ListItem'),
  )
  const targetItem = items.find((el) => el.innerText.includes(targetName.slice(0, 4)))

  if (!targetItem) return { error: 'Target not found in results' }
  targetItem.click()

  await new Promise((r) => setTimeout(r, 2000))
  const currentTitle = document.querySelector('.ChatInfo .title')?.innerText || ''
  if (!currentTitle.includes(targetName.slice(0, 4)))
    return { error: 'Title mismatch: ' + currentTitle }

  // Scroll to bottom
  const fab = document.querySelector(
    '.Button.go-to-bottom, .scroll-to-bottom-button, .sticky-reveal-button',
  )
  if (fab) fab.click()
  const list = document.querySelector('.MessageList')
  if (list) list.scrollTop = 1e9
  await new Promise((r) => setTimeout(r, 1000))

  // Extract
  const msgNodes = Array.from(
    document.querySelectorAll('.MessageList .message, .MessageList .Message'),
  )
  return {
    title: currentTitle,
    messages: msgNodes.slice(-count).map((n) => n.innerText),
  }
}
