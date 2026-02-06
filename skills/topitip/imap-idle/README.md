# IMAP IDLE Listener - OpenClaw Skill

Event-driven email monitoring for [OpenClaw](https://github.com/openclaw/openclaw) using IMAP IDLE protocol.

## Why?

**Before (polling):**
- ❌ Cron job checks email every hour
- ❌ 16-24 checks per day
- ❌ Up to 1 hour delay for new emails
- ❌ Token burn on empty checks

**After (IMAP IDLE):**
- ✅ <1 second notification latency
- ✅ Zero tokens while waiting
- ✅ Only real events trigger wake
- ✅ 90%+ reduction in token usage

## Installation

### 1. Install Skill

```bash
# Download and install skill
wget https://github.com/topitip/openclaw-imap-idle/releases/latest/download/imap-idle.skill
openclaw skill install imap-idle.skill
```

Or from ClawHub (coming soon):
```bash
clawhub install imap-idle
```

### 2. Install Dependencies

```bash
pip3 install imapclient --user --break-system-packages
```

### 3. Enable OpenClaw Webhooks

Edit `~/.openclaw/openclaw.json`:

```json
{
  "hooks": {
    "enabled": true,
    "token": "generate-secure-random-token-here",
    "path": "/hooks"
  }
}
```

Restart OpenClaw: `openclaw gateway restart`

## Quick Start

```bash
# Run interactive setup
imap-idle setup

# Start listener
imap-idle start

# Check status
imap-idle status

# View logs
imap-idle logs
```

## Configuration

Config file: `~/.openclaw/imap-idle.json`

```json
{
  "accounts": [
    {
      "host": "mail.example.com",
      "port": 993,
      "username": "user@example.com",
      "password": "password",
      "ssl": true
    }
  ],
  "webhook_url": "http://127.0.0.1:18789/hooks/wake",
  "webhook_token": "your-webhook-token-from-openclaw-json",
  "log_file": "~/.openclaw/logs/imap-idle.log",
  "idle_timeout": 300,
  "reconnect_interval": 900
}
```

## How It Works

1. Opens persistent IMAP connection(s) to your email server(s)
2. Enters IDLE mode - server will push notifications
3. When new email arrives, server sends notification (<1 sec)
4. Fetches email headers (From, Subject)
5. Triggers OpenClaw webhook with email info
6. OpenClaw wakes instantly and processes email
7. Re-enters IDLE mode

**Key Features:**
- UID tracking prevents duplicate webhooks
- Keep-alive every 5 minutes prevents frozen connections
- Full reconnect every 15 minutes ensures reliability
- One thread per account for concurrent monitoring
- Exponential backoff on connection failures

## Commands

```bash
imap-idle start    # Start listener in background
imap-idle stop     # Stop listener
imap-idle restart  # Restart listener
imap-idle status   # Check if running
imap-idle logs     # Show recent logs (default: 50 lines)
imap-idle logs N   # Show last N lines
imap-idle setup    # Run interactive setup wizard
```

## Systemd Service (Optional)

For automatic startup on boot, see [SKILL.md](SKILL.md#systemd-service-optional).

## Troubleshooting

**Listener won't start:**
```bash
# Check config exists
cat ~/.openclaw/imap-idle.json

# Verify imapclient installed
python3 -c "import imapclient"

# Check logs
imap-idle logs
```

**No webhooks triggering:**
```bash
# Test webhook manually
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "mode": "now"}'

# Verify OpenClaw webhook config
grep -A3 '"hooks"' ~/.openclaw/openclaw.json
```

## Token Savings

**Before:**
- 16-24 email checks per day
- Each check = ~500-1000 tokens (even if no new mail)
- Total: ~8,000-24,000 tokens/day

**After:**
- 0 tokens while waiting
- Tokens only when email arrives
- 90%+ reduction

## Credits

Inspired by [@claude-event-listeners](https://moltbook.com/u/claude-event-listeners)' critique on Moltbook about polling vs event-driven architecture.

Full debugging journey: [Event-Driven Email: From Polling to IMAP IDLE (with code)](https://www.moltbook.com/post/8133c6f1-3196-4c1d-9642-ee875dfa9282)

## License

MIT

## Contributing

PRs welcome! Please open an issue first to discuss changes.

## Links

- [OpenClaw](https://github.com/openclaw/openclaw)
- [OpenClaw Docs](https://docs.openclaw.ai)
- [ClawHub](https://clawhub.com)
- [Moltbook](https://moltbook.com)
