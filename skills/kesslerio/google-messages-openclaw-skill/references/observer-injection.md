# Injecting the SMS Observer

The SMS observer watches for incoming messages and forwards them to the webhook server.

## Prerequisites

1. Webhook server running: `node <skill>/sms-webhook-server.js`
2. Google Messages page loaded and paired
3. Browser tab open at messages.google.com

## Injection Command

Use the browser tool to inject the observer script:

```
browser action=act profile=openclaw request={"kind": "evaluate", "fn": "<minified_observer>"}
```

## Minified Observer Script

Copy this entire script for the `fn` parameter:

```javascript
;(function () {
  var WEBHOOK_URL = 'http://127.0.0.1:19888/sms-inbound',
    CHECK_INTERVAL = 2000,
    lastSeenMessages = new Map(),
    initialized = false,
    observerAttached = false
  function logAlways() {
    console.log.apply(console, ['[SMS Observer]'].concat(Array.prototype.slice.call(arguments)))
  }
  function getConversations() {
    var convos = [],
      items = document.querySelectorAll(
        'mws-conversation-list-item,[data-e2e-conversation],[role="option"]',
      )
    items.forEach(function (item, i) {
      var nameEl = item.querySelector('h2,[data-e2e-conversation-name],.name'),
        previewEl = item.querySelector('[data-e2e-conversation-snippet],.snippet'),
        timeEl = item.querySelector('[data-e2e-conversation-timestamp],.timestamp,time'),
        preview = ''
      if (previewEl) preview = previewEl.innerText || ''
      if (!preview) {
        var divs = item.querySelectorAll('div')
        for (var j = 0; j < divs.length; j++) {
          var t = divs[j].innerText
          if (t && t.trim().length > 5 && t.trim().length < 200) {
            preview = t.trim()
            break
          }
        }
      }
      convos.push({
        contact: nameEl ? nameEl.innerText.trim() : 'Unknown',
        preview: preview.substring(0, 150),
        time: timeEl ? timeEl.innerText.trim() : '',
      })
    })
    return convos
  }
  function checkForNewMessages() {
    var conversations = getConversations()
    if (!initialized) {
      conversations.forEach(function (c) {
        lastSeenMessages.set(c.contact, { preview: c.preview, time: c.time })
      })
      initialized = true
      logAlways('Initialized with', conversations.length, 'conversations')
      return
    }
    conversations.forEach(function (c) {
      var lastSeen = lastSeenMessages.get(c.contact)
      var isNew = !lastSeen || (lastSeen.preview !== c.preview && c.preview)
      var isIncoming = c.preview && !c.preview.startsWith('You:')
      if (isNew && isIncoming) {
        logAlways('New message:', c.contact, '-', c.preview.substring(0, 50))
        fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact: c.contact,
            preview: c.preview,
            time: c.time,
            timestamp: Date.now(),
          }),
        })
          .then(function (r) {
            if (!r.ok) logAlways('Webhook error', r.status)
          })
          .catch(function (e) {
            logAlways('Webhook error:', e.message)
          })
      }
      lastSeenMessages.set(c.contact, { preview: c.preview, time: c.time })
    })
  }
  function setupObserver() {
    if (observerAttached) return
    var target = document.querySelector(
      'mws-conversations-list,[data-e2e-conversation-list],nav,main',
    )
    if (!target) {
      setTimeout(setupObserver, 2000)
      return
    }
    var observer = new MutationObserver(function () {
      clearTimeout(window._smsTO)
      window._smsTO = setTimeout(checkForNewMessages, 500)
    })
    observer.observe(target, { childList: true, subtree: true, characterData: true })
    observerAttached = true
    logAlways('Observer attached to', target.tagName)
    checkForNewMessages()
    setInterval(checkForNewMessages, CHECK_INTERVAL)
  }
  logAlways('Starting...')
  logAlways('Webhook:', WEBHOOK_URL)
  if (document.readyState === 'complete') setupObserver()
  else window.addEventListener('load', setupObserver)
  window._smsObserver = { check: checkForNewMessages, getConversations: getConversations }
  return 'SMS Observer injected'
})()
```

## Verifying Injection

After injection, check the browser console for:

```
[SMS Observer] Starting...
[SMS Observer] Webhook: http://127.0.0.1:19888/sms-inbound
[SMS Observer] Observer attached to MAIN
[SMS Observer] Initialized with N conversations
```

## Debugging

Access the observer API in browser console:

```javascript
window._smsObserver.check() // Force check for new messages
window._smsObserver.getConversations() // Get current conversation list
```

## Re-injection

The observer is lost when the page reloads. Re-inject after:

- Page refresh
- Browser restart
- Session re-pairing
