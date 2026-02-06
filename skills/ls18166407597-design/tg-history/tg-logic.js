/**
 * Robust Telegram Web (A) Automation Logic
 * This script provides a reliable way to switch chats, scroll to the bottom,
 * and interact with messages.
 */

window.TG_UTILS = {
  /**
   * Switches to a specific chat by title.
   * Includes strict title verification and waiting.
   */
  async switchToChat(targetTitle) {
    console.log(`[TG] Attempting to switch to chat: "${targetTitle}"`)

    // 1. Find the chat in the sidebar
    const findTarget = () => {
      const items = document.querySelectorAll('.ListItem-button')
      for (const item of items) {
        const titleEl = item.querySelector('.title, .name')
        if (titleEl && titleEl.textContent.trim() === targetTitle) {
          return item
        }
      }
      return null
    }

    let targetItem = findTarget()
    if (!targetItem) {
      throw new Error(
        `Chat "${targetTitle}" not found in sidebar. Please ensure it is visible or use search.`,
      )
    }

    // 2. Click the chat
    targetItem.click()

    // 3. Wait for the header to update (Strict Verification)
    const startTime = Date.now()
    const timeout = 10000

    while (Date.now() - startTime < timeout) {
      const headerTitleEl = document.querySelector(
        '.middle-header .title-wrapper .title, .ChatInfo .title, .top-info .title',
      )
      const currentTitle = headerTitleEl ? headerTitleEl.textContent.trim() : ''

      if (currentTitle === targetTitle) {
        console.log(`[TG] Successfully switched to chat: "${targetTitle}"`)
        await new Promise((r) => setTimeout(r, 1000))
        return { success: true, title: currentTitle }
      }

      await new Promise((r) => setTimeout(r, 500))
    }

    const finalTitle = document.querySelector('.ChatInfo .title')?.textContent.trim()
    throw new Error(
      `Title verification failed. Expected "${targetTitle}", but got "${finalTitle}" after 10s.`,
    )
  },

  /**
   * Robustly scrolls to the bottom of the current chat.
   */
  async scrollToBottom() {
    console.log('[TG] Scrolling to bottom...')
    const container = document.querySelector('.MessageList, .messages-layout .scrollable-List')
    if (!container) throw new Error('Message container not found.')

    const clickBottomButton = () => {
      const btn = document.querySelector('.ScrollDownButton, .scroll-button, .btn-scroll-down')
      if (btn && btn.offsetParent !== null) {
        console.log("[TG] Clicking 'Go to Bottom' button.")
        btn.click()
        return true
      }
      return false
    }

    for (let i = 0; i < 3; i++) {
      clickBottomButton()
      container.scrollTop = container.scrollHeight
      await new Promise((r) => setTimeout(r, 1000))
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      if (isAtBottom && !document.querySelector('.ScrollDownButton:not(.hidden)')) {
        break
      }
    }
    return { success: true }
  },

  /**
   * High-level "Serial Execution" flow for history extraction.
   */
  async extractHistory(targetTitle, limit = 20) {
    try {
      await this.switchToChat(targetTitle)
      await this.scrollToBottom()

      const messages = document.querySelectorAll('.Message, .message-list-item')
      const history = []
      const startIdx = Math.max(0, messages.length - limit)

      for (let i = startIdx; i < messages.length; i++) {
        const msg = messages[i]
        const senderEl = msg.querySelector('.message-title, .sender-name')
        const textEl = msg.querySelector('.text-content, .message, .text')
        const timeEl = msg.querySelector('.message-time, .time')

        if (textEl) {
          history.push({
            sender: senderEl ? senderEl.textContent.trim() : 'System',
            text: textEl.textContent.trim(),
            time: timeEl ? timeEl.textContent.trim() : '',
          })
        }
      }

      return { success: true, group: targetTitle, history }
    } catch (err) {
      console.error(`[TG] History extraction failed for ${targetTitle}:`, err)
      return { success: false, group: targetTitle, error: err.message }
    }
  },
}

;('TG_UTILS LOADED')
