# WhatsApp Analyzer

Automatically detect appointments and urgent messages from WhatsApp, alert via Telegram, and optionally add to Google Calendar.

## How It Works

```
WhatsApp message arrives
        ↓
WAHA (Docker) captures it
        ↓
Webhook → Message Store → messages.jsonl
        ↓
OpenClaw cron (every 60s) → Agent analyzes
        ↓
RDV detected? → Telegram: "Add to calendar? OUI/NON"
        ↓
User confirms → Google Calendar event created
```

## Quick Start

```bash
./setup.sh
# Enter your Telegram Chat ID when prompted
# Scan the QR code with WhatsApp
# Done! 🎉
```

## Requirements

- Docker
- Node.js
- OpenClaw with Telegram configured
- `gog` CLI for Google Calendar (optional)

## What Gets Detected

| Type | Keywords | Action |
|------|----------|--------|
| **RDV** | meeting, rdv, rendez-vous, reunion, appointment + time | Telegram alert + Calendar option |
| **Urgent** | urgent, important, asap, help, sos | Telegram alert |

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| `message-store.js` | `~/.openclaw/workspace/.whatsapp-messages/` | Webhook receiver |
| `messages.jsonl` | same | Message storage |
| `.last-ts` | same | Last processed timestamp |
| `.env` | same | WAHA credentials |

## Commands

```bash
# Check WAHA status
source ~/.openclaw/workspace/.whatsapp-messages/.env
curl -s -H "X-Api-Key: $WAHA_API_KEY" http://localhost:3000/api/sessions/default | jq '.status'

# View recent messages
tail -5 ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl | jq '.text'

# Restart message store
launchctl unload ~/Library/LaunchAgents/ai.openclaw.whatsapp-store.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.whatsapp-store.plist

# Get new QR code (if disconnected)
curl -s -H "X-Api-Key: $WAHA_API_KEY" http://localhost:3000/api/default/auth/qr --output /tmp/qr.png
open /tmp/qr.png
```

## Troubleshooting

### WhatsApp disconnected
```bash
# Get new QR
source ~/.openclaw/workspace/.whatsapp-messages/.env
curl -s -H "X-Api-Key: $WAHA_API_KEY" http://localhost:3000/api/default/auth/qr --output /tmp/qr.png
open /tmp/qr.png
```

### Messages not arriving
1. Check WAHA: `docker logs whatsapp-waha | tail -10`
2. Check message store: `cat /tmp/whatsapp-store.log`
3. Check webhook config in WAHA dashboard: http://localhost:3000

### Calendar not working
Make sure `gog` is configured:
```bash
gog auth login
gog calendar events primary --from today --to tomorrow
```

## Privacy

- All data stored locally
- No external servers (except WhatsApp/Telegram/Google APIs)
- Credentials in `.env` (not committed to git)
