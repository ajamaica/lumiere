# JavaScript Snippets for Google Messages

Use with `browser action=act request={"kind": "evaluate", "fn": "..."}`.

## Check Session Status

```javascript
;(() => {
  if (document.querySelector('mw-qr-code, [data-e2e-qr-code]')) return 'QR_REQUIRED'
  if (document.querySelector('mws-conversations-list, [data-e2e-conversation-list]'))
    return 'SESSION_ACTIVE'
  if (document.querySelector('mat-spinner, .loading')) return 'LOADING'
  return 'UNKNOWN'
})()
```

## Get Recent Conversations

```javascript
;(() => {
  const convos = document.querySelectorAll('mws-conversation-list-item')
  const results = []

  for (let i = 0; i < Math.min(convos.length, 10); i++) {
    const name = convos[i].querySelector('h2')?.innerText || 'Unknown'
    const preview = convos[i].querySelector('[data-e2e-conversation-snippet]')?.innerText || ''
    const time = convos[i].querySelector('[data-e2e-conversation-timestamp]')?.innerText || ''

    results.push({
      name: name.trim(),
      preview: preview.trim().substring(0, 50),
      time: time.trim(),
    })
  }

  return JSON.stringify(results, null, 2)
})()
```

## Get Messages in Current Conversation

```javascript
;(() => {
  const messages = document.querySelectorAll('mws-message-wrapper')
  const results = []
  const start = Math.max(0, messages.length - 10)

  for (let i = start; i < messages.length; i++) {
    const msg = messages[i]
    const text = msg.querySelector('[data-e2e-message-text]')?.innerText || ''
    const time = msg.querySelector('[data-e2e-message-timestamp]')?.innerText || ''
    const isOutgoing = msg.classList.contains('outgoing')

    if (text) {
      results.push({
        text: text.trim(),
        time: time.trim(),
        direction: isOutgoing ? 'sent' : 'received',
      })
    }
  }

  return JSON.stringify(results, null, 2)
})()
```

## Open Conversation by Contact Name

```javascript
;(async () => {
  const CONTACT = 'John Doe' // Change this
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const convos = document.querySelectorAll('mws-conversation-list-item')

  for (const convo of convos) {
    const name = convo.querySelector('h2')?.innerText || ''
    if (name.toLowerCase().includes(CONTACT.toLowerCase())) {
      convo.click()
      await sleep(500)
      return 'OPENED: ' + name
    }
  }

  return 'NOT_FOUND: ' + CONTACT
})()
```
