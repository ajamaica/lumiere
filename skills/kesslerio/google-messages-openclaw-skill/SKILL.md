---
name: google-messages
description: Send and receive SMS/RCS via Google Messages web interface (messages.google.com). Use when asked to "send a text", "check texts", "SMS", "text message", "Google Messages", or forward incoming texts to other channels.
metadata:
  {
    'openclaw':
      {
        'emoji': '💬',
        'requires':
          {
            'tools': ['browser'],
            'bins': ['node'],
            'env': ['SMS_NOTIFICATION_TARGET', 'SMS_NOTIFICATION_CHANNEL'],
          },
      },
  }
---

# Google Messages Browser Skill

Automate SMS/RCS messaging via messages.google.com using the `browser` tool.

## Overview

Google Messages for Web allows you to send/receive texts from your Android phone via browser. This skill automates that interface.

**Requirements:**

- Android phone with Google Messages app
- Phone and computer on same network (for initial QR pairing)
- Browser profile with persistent session (use `openclaw` or your preferred profile)

**Note:** Replace `profile=openclaw` in examples with your preferred browser profile if different.

---

## Quick Reference

| Action            | Command                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Open pairing page | `browser action=open profile=openclaw targetUrl="https://messages.google.com/web/authentication"` |
| Check session     | `browser action=snapshot profile=openclaw` — look for conversation list vs QR code                |
| Take screenshot   | `browser action=screenshot profile=openclaw`                                                      |

---

## Initial Setup (QR Pairing)

First-time setup requires scanning a QR code:

1. **Open Google Messages Web**

   ```
   browser action=open profile=openclaw targetUrl="https://messages.google.com/web/authentication"
   ```

2. **Screenshot the QR code** and share with user

   ```
   browser action=screenshot profile=openclaw
   ```

3. **User scans with phone:**
   - Open Google Messages app on Android
   - Tap ⋮ menu → "Device pairing" → "QR code scanner"
   - Scan the QR code

4. **Verify connection** — snapshot should show conversation list, not QR code

**Important:** Enable "Remember this computer" to persist the session.

---

## Sending Messages

1. **Navigate to conversations**

   ```
   browser action=navigate profile=openclaw targetUrl="https://messages.google.com/web/conversations"
   ```

2. **Take snapshot and find conversation**

   ```
   browser action=snapshot profile=openclaw
   ```

   Look for the contact in the conversation list, note the `ref`.

3. **Click conversation**

   ```
   browser action=act profile=openclaw request={"kind": "click", "ref": "<ref>"}
   ```

4. **Type message** (find textarea ref from snapshot)

   ```
   browser action=act profile=openclaw request={"kind": "type", "ref": "<input_ref>", "text": "Your message"}
   ```

5. **Click send** (find send button ref)
   ```
   browser action=act profile=openclaw request={"kind": "click", "ref": "<send_ref>"}
   ```

---

## Receiving Messages (Real-time Notifications)

This skill includes a webhook system for real-time incoming SMS notifications.

### Components

1. **sms-webhook-server.js** — receives notifications, forwards to OpenClaw channels
2. **sms-observer.js** — browser script that watches for new messages

### Setup

1. **Set environment variables:**

   ```bash
   export SMS_NOTIFICATION_TARGET="telegram:YOUR_CHAT_ID"
   export SMS_NOTIFICATION_CHANNEL="telegram"
   ```

2. **Start webhook server:**

   ```bash
   node <skill>/sms-webhook-server.js
   ```

3. **Inject observer into browser** (see `references/observer-injection.md`)

### Systemd Service (Persistent)

```bash
cp <skill>/systemd/google-messages-webhook.service ~/.config/systemd/user/
# Edit service file: set SMS_NOTIFICATION_TARGET in Environment=
systemctl --user daemon-reload
systemctl --user enable --now google-messages-webhook
```

---

## Reading Messages

See `references/snippets.md` for JavaScript snippets to:

- Get recent conversations
- Get messages in current conversation
- Check session status

---

## Troubleshooting

| Problem                | Solution                                                    |
| ---------------------- | ----------------------------------------------------------- |
| QR code shown          | Session expired, re-pair                                    |
| Elements not found     | Google updated UI, check snapshot for new selectors         |
| Send button disabled   | Message input empty or phone disconnected                   |
| Observer not detecting | Check browser console for `[SMS Observer]` logs             |
| Webhook not receiving  | Verify server running: `curl http://127.0.0.1:19888/health` |

---

## Selectors Reference

Google Messages uses Angular components. These may change with updates.

| Element           | Selector                          |
| ----------------- | --------------------------------- |
| Conversation list | `mws-conversations-list`          |
| Conversation item | `mws-conversation-list-item`      |
| Message input     | `textarea[aria-label*="message"]` |
| Send button       | `button[aria-label*="Send"]`      |
| QR code           | `mw-qr-code`                      |

---

## Limitations

- Phone must be online (messages sync through phone)
- Browser tab must stay open for notifications
- Session expires after ~14 days of inactivity
- Observer lost on page reload (re-inject needed)

---

## Security

- Webhook listens on localhost only (127.0.0.1)
- No credentials stored (session in browser cookies)
- QR pairing links to your phone — treat as sensitive

---

## License

Apache-2.0
