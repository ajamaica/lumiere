---
name: imap-idle
description: Event-driven email monitoring using IMAP IDLE protocol. Replaces polling with instant push notifications via OpenClaw webhooks. Use when setting up email monitoring, replacing hourly email checks, or implementing event-driven email processing. Monitors multiple IMAP accounts, triggers webhooks on new mail, zero tokens while waiting.
---

# IMAP IDLE Listener

Event-driven email notifications for OpenClaw using IMAP IDLE protocol.

## What This Does

Replaces polling-based email checks with push notifications:

**Before (polling):**
- Cron job checks email every hour
- 16-24 checks per day
- Up to 1 hour delay for new emails
- Token burn on empty checks

**After (IMAP IDLE):**
- Persistent connection to IMAP server
- Server pushes notification when new mail arrives
- <1 second notification latency
- Zero tokens while waiting

## Quick Start

### 1. Enable OpenClaw Webhooks

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

Restart gateway: `openclaw gateway restart`

### 2. Install Dependencies

```bash
pip3 install imapclient --user --break-system-packages
```

### 3. Run Setup

```bash
./imap-idle setup
```

Follow the interactive wizard to configure:
- IMAP account(s) (host, port, username, password)
- OpenClaw webhook URL and token
- Log file location

### 4. Start Listener

```bash
./imap-idle start
```

Verify it's running:

```bash
./imap-idle status
./imap-idle logs
```

### 5. Test

Send yourself an email. You should see:
1. Log entry in listener logs
2. OpenClaw wakes instantly
3. Email processed in main session

## CLI Commands

```bash
imap-idle start    # Start listener in background
imap-idle stop     # Stop listener
imap-idle restart  # Restart listener
imap-idle status   # Check if running
imap-idle logs     # Show recent logs (default: 50 lines)
imap-idle logs N   # Show last N lines
imap-idle setup    # Run interactive setup wizard
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
  "webhook_token": "your-webhook-token",
  "log_file": "~/.openclaw/logs/imap-idle.log",
  "idle_timeout": 300,
  "reconnect_interval": 900
}
```

**Fields:**
- `accounts` - Array of IMAP accounts to monitor
- `webhook_url` - OpenClaw webhook endpoint
- `webhook_token` - Webhook authentication token (from openclaw.json)
- `log_file` - Path to log file (null for stdout)
- `idle_timeout` - IDLE check timeout in seconds (default: 300 = 5 min)
- `reconnect_interval` - Full reconnect interval in seconds (default: 900 = 15 min)

## How It Works

1. **Connect**: Opens persistent IMAP connection per account
2. **IDLE**: Enters IDLE mode (server will push notifications)
3. **Wait**: Blocks until server sends "new mail" notification
4. **Fetch**: Retrieves new email headers (From, Subject)
5. **Webhook**: Triggers OpenClaw webhook with email info
6. **Resume**: Re-enters IDLE mode

**Key Implementation Details:**

- **UID Tracking**: Tracks last processed message UID per account to prevent duplicate webhooks
- **Keep-alive**: IDLE timeout every 5 minutes, sends NOOP command
- **Reconnect**: Full reconnect every 15 minutes to prevent stale connections
- **Threading**: One thread per account for concurrent monitoring
- **Error handling**: Exponential backoff (5s → 300s) on connection failures

## Systemd Service (Optional)

For automatic startup on boot:

1. Generate service file:

```bash
skill_dir="$(pwd)"
listener_script="$skill_dir/scripts/listener.py"
config_file="$HOME/.openclaw/imap-idle.json"
log_file="$HOME/.openclaw/logs/imap-idle.log"
log_dir="$(dirname "$log_file")"

sed -e "s|%USER%|$USER|g" \
    -e "s|%PYTHON%|$(which python3)|g" \
    -e "s|%LISTENER_SCRIPT%|$listener_script|g" \
    -e "s|%CONFIG_FILE%|$config_file|g" \
    -e "s|%LOG_FILE%|$log_file|g" \
    -e "s|%LOG_DIR%|$log_dir|g" \
    imap-idle.service.template > imap-idle.service
```

2. Install service:

```bash
sudo cp imap-idle.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable imap-idle
sudo systemctl start imap-idle
```

3. Check status:

```bash
sudo systemctl status imap-idle
sudo journalctl -u imap-idle -f
```

## Troubleshooting

**Listener won't start:**
- Check config file exists: `cat ~/.openclaw/imap-idle.json`
- Verify imapclient installed: `python3 -c "import imapclient"`
- Check logs: `imap-idle logs`

**Duplicate webhooks:**
- Fixed in v2 - uses UID tracking to prevent duplicates
- Check logs for "UID tracking" messages

**Connection drops:**
- Increase `reconnect_interval` in config
- Check IMAP server allows IDLE (most do)
- Verify firewall allows persistent connections

**No webhooks triggering:**
- Test webhook manually:
  ```bash
  curl -X POST http://127.0.0.1:18789/hooks/wake \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"text": "test", "mode": "now"}'
  ```
- Check OpenClaw config: `hooks.enabled: true`
- Verify token matches in both configs

## Removing Polling

Once IMAP IDLE is working, remove old polling cron jobs:

```bash
# List cron jobs
openclaw cron list

# Remove email check job
openclaw cron remove <job-id>
```

## Token Savings

**Before:**
- 16-24 email checks per day
- Each check = ~500-1000 tokens (even if no new mail)
- Total: ~8,000-24,000 tokens/day for email monitoring

**After:**
- 0 tokens while waiting
- Tokens only spent when email actually arrives
- 90%+ reduction in email-related token usage

## Credits

Inspired by @claude-event-listeners' critique on Moltbook about polling vs event-driven architecture.

Implementation details from real-world debugging documented in Moltbook post "Event-Driven Email: From Polling to IMAP IDLE (with code)".
