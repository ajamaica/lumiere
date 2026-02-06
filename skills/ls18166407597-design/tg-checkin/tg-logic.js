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
    // We look for the title in the sidebar list items
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

    // If not found, try to search? (Optional, but usually it should be in the sidebar)
    if (!targetItem) {
      throw new Error(
        `Chat "${targetTitle}" not found in sidebar. Please ensure it is visible or use search.`,
      )
    }

    // 2. Click the chat
    targetItem.click()

    // 3. Wait for the header to update (Strict Verification)
    const startTime = Date.now()
    const timeout = 10000 // 10 seconds timeout

    while (Date.now() - startTime < timeout) {
      // The header title in version A is usually inside .ChatInfo or .middle-header
      const headerTitleEl = document.querySelector(
        '.middle-header .title-wrapper .title, .ChatInfo .title, .top-info .title',
      )
      const currentTitle = headerTitleEl ? headerTitleEl.textContent.trim() : ''

      if (currentTitle === targetTitle) {
        console.log(`[TG] Successfully switched to chat: "${targetTitle}"`)
        // Wait a tiny bit more for messages to load
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
   * Handles the "Go to Bottom" arrow button.
   */
  async scrollToBottom() {
    console.log('[TG] Scrolling to bottom...')
    const container = document.querySelector('.MessageList, .messages-layout .scrollable-List')
    if (!container) throw new Error('Message container not found.')

    // Function to click the "Go to Bottom" button if visible
    const clickBottomButton = () => {
      const btn = document.querySelector('.ScrollDownButton, .scroll-button, .btn-scroll-down')
      if (btn && btn.offsetParent !== null) {
        // Check if visible
        console.log("[TG] Clicking 'Go to Bottom' button.")
        btn.click()
        return true
      }
      return false
    }

    // Try a few times because the button might appear/re-appear as content loads
    for (let i = 0; i < 3; i++) {
      clickBottomButton()

      // Also manually scroll just in case the button is broken or missing
      container.scrollTop = container.scrollHeight

      // Wait for any dynamic loading
      await new Promise((r) => setTimeout(r, 1000))

      // Check if we are at the bottom (within a small margin)
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      if (isAtBottom && !document.querySelector('.ScrollDownButton:not(.hidden)')) {
        break
      }
    }

    return { success: true }
  },

  /**
   * Verifies the latest message in the chat.
   * Useful for ensuring we are seeing the most recent data.
   */
  async getLatestMessage() {
    const messages = document.querySelectorAll('.Message, .message-list-item')
    if (messages.length === 0) return null

    const latest = messages[messages.length - 1]
    const textEl = latest.querySelector('.text-content, .message, .text')
    const timeEl = latest.querySelector('.message-time, .time')

    return {
      text: textEl ? textEl.textContent.trim() : '',
      time: timeEl ? timeEl.textContent.trim() : '',
      index: messages.length,
    }
  },

  /**
   * Sends a message to the current chat.
   */
  async sendMessage(text) {
    const input = document.querySelector('.message-input-text, [contenteditable="true"]')
    if (!input) throw new Error('Message input field not found.')

    input.focus()
    // Clear and insert text using execCommand for better event handling in Telegram Web
    document.execCommand('selectAll', false, null)
    document.execCommand('delete', false, null)
    document.execCommand('insertText', false, text)

    // Wait a moment for the UI to register the input
    await new Promise((r) => setTimeout(r, 500))

    // Try to click the send button
    const sendBtn = document.querySelector('.btn-send, .Button.send, .send-button')
    if (sendBtn) {
      sendBtn.click()
    } else {
      // Fallback: Dispatch Enter key
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
      })
      input.dispatchEvent(enterEvent)
    }

    console.log(`[TG] Message sent: ${text}`)
    return { success: true }
  },

  /**
   * High-level "Serial Execution" flow for check-in.
   */
  async performCheckin(targetTitle, checkinText = '签到') {
    try {
      await this.switchToChat(targetTitle)
      await this.scrollToBottom()
      const latest = await this.getLatestMessage()
      console.log(`[TG] Latest message before send: "${latest?.text}" at ${latest?.time}`)

      await this.sendMessage(checkinText)
      return { success: true, group: targetTitle }
    } catch (err) {
      console.error(`[TG] Checkin failed for ${targetTitle}:`, err)
      return { success: false, group: targetTitle, error: err.message }
    }
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
