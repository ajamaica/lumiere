/**
 * TG Robust Logic Module
 */

async function navigateToChat(targetName) {
  console.log(`Navigating to: ${targetName}`)

  // 1. Clear search first
  const clearBtn = document.querySelector('.sidebar-search-clear, button.clear')
  if (clearBtn) clearBtn.click()

  const searchInput = document.querySelector(
    '#sidebar-search-input, .search-input input, textbox[placeholder="Search"]',
  )
  if (!searchInput) throw new Error('Search input not found')

  searchInput.focus()
  document.execCommand('selectAll', false, null)
  document.execCommand('delete', false, null)
  document.execCommand('insertText', false, targetName)

  // 2. Wait for results to update (up to 5s)
  let targetItem = null
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const items = Array.from(
      document.querySelectorAll(
        '.chat-list .ListItem-button, .chat-list .ListItem, .search-group-results .ListItem',
      ),
    )
    targetItem = items.find((el) => el.innerText.includes(targetName))
    if (targetItem) break
  }

  if (!targetItem) throw new Error(`Could not find ${targetName} in search results`)

  // 3. Click and Wait
  targetItem.click()
  await new Promise((r) => setTimeout(r, 2000))

  // 4. Strict Title Verification
  const titleEl = document.querySelector('.ChatInfo .title, .middle-header .title')
  const currentTitle = titleEl ? titleEl.innerText.trim() : 'NOT_FOUND'
  if (!currentTitle.includes(targetName.slice(0, 4))) {
    // Use slice to handle potential emoji variations but keep it strict enough
    throw new Error(`Title mismatch! Expected: ${targetName}, Got: ${currentTitle}`)
  }

  console.log(`Successfully switched to: ${currentTitle}`)
  return true
}

async function scrollToBottom() {
  console.log('Scrolling to bottom...')
  let limit = 5
  while (limit-- > 0) {
    const btn = document.querySelector(
      '.Button.go-to-bottom, .scroll-to-bottom-button, .sticky-reveal-button',
    )
    if (!btn || !btn.offsetParent) break
    btn.click()
    await new Promise((r) => setTimeout(r, 800))
  }
  const list = document.querySelector('.MessageList')
  if (list) {
    list.scrollTop = 1e9
    await new Promise((r) => setTimeout(r, 500))
  }
}
