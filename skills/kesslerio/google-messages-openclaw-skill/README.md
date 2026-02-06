# Google Messages Skill for OpenClaw

Send and receive SMS/RCS messages via Google Messages web interface using browser automation.

## Features

- 📤 **Send SMS** — Compose and send text messages
- 📥 **Receive notifications** — Real-time alerts when new messages arrive
- 🔍 **Read conversations** — Query recent messages and conversation history
- 🔗 **OpenClaw integration** — Forward incoming SMS to Telegram, WhatsApp, or other channels

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) with browser automation
- Android phone with Google Messages app
- Node.js 18+

## Quick Start

### 1. Install the skill

```bash
# Clone to your skills directory
git clone https://github.com/kesslerio/google-messages-openclaw-skill.git ~/.openclaw/skills/google-messages
```

### 2. Pair with your phone

Ask your OpenClaw agent:

```
"Open Google Messages and show me the QR code"
```

Or manually:

1. Go to https://messages.google.com/web
2. Open Google Messages on your phone
3. Tap ⋮ → Device pairing → QR code scanner
4. Scan the code

### 3. Enable notifications (optional)

Start the webhook server to receive incoming message alerts:

```bash
# Set your notification target
export SMS_NOTIFICATION_TARGET="telegram:YOUR_CHAT_ID"
export SMS_NOTIFICATION_CHANNEL="telegram"

# Start the server
node ~/.openclaw/skills/google-messages/sms-webhook-server.js
```

Then inject the observer into the browser tab. See `references/observer-injection.md` for details.

## Usage

### Sending messages

Ask your OpenClaw agent:

- "Text John that I'm running late"
- "Send an SMS to 555-1234 saying hello"
- "Message Mom on Google Messages"

### Checking messages

- "Check my texts"
- "Any new SMS messages?"
- "What did John text me?"

## Configuration

### Environment Variables

| Variable                   | Description                               | Default    |
| -------------------------- | ----------------------------------------- | ---------- |
| `SMS_WEBHOOK_PORT`         | Port for webhook server                   | `19888`    |
| `SMS_NOTIFICATION_TARGET`  | OpenClaw target (e.g., `telegram:123456`) | _(none)_   |
| `SMS_NOTIFICATION_CHANNEL` | Channel type                              | `telegram` |

### Systemd Service

For persistent notifications, install as a user service:

```bash
cp systemd/google-messages-webhook.service ~/.config/systemd/user/
# Edit service file: uncomment and set Environment= lines
systemctl --user daemon-reload
systemctl --user enable --now google-messages-webhook
```

## How It Works

1. **Browser automation** — Uses OpenClaw's browser tool to control messages.google.com
2. **MutationObserver** — Injects a script that watches the DOM for new messages
3. **Webhook** — When new messages arrive, POSTs to a local server
4. **Forwarding** — Webhook server uses `openclaw message send` to forward to your preferred channel

## Files

```
google-messages-skill/
├── SKILL.md                    # OpenClaw skill definition
├── sms-webhook-server.js       # Webhook server for notifications
├── sms-observer.js             # Browser injection script (full version)
├── references/
│   ├── snippets.md             # JavaScript helper snippets
│   └── observer-injection.md   # How to inject the observer
├── scripts/
│   └── start-webhook.sh        # Helper to start webhook
└── systemd/
    └── google-messages-webhook.service
```

## Limitations

- Phone must be online (messages sync through phone)
- Browser tab must stay open for notifications
- Session expires after ~14 days of inactivity
- QR re-pairing needed after session expiry
- Observer lost on page reload

## Security

- Webhook server listens only on localhost
- No credentials stored (session in browser profile cookies)
- Observer script runs only on messages.google.com

## License

Apache-2.0

## Contributing

Issues and PRs welcome at https://github.com/kesslerio/google-messages-openclaw-skill
