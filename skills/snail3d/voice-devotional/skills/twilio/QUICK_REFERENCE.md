# Two-Way SMS - Quick Reference

Copy-paste commands for common tasks.

## Setup (One-Time)

```bash
# 1. Install dependencies
cd ~/clawd/skills/twilio
pip install -r requirements.txt

# 2. Set credentials
export TWILIO_ACCOUNT_SID="AC35fce9f5069e4a19358da26286380ca9"
export TWILIO_AUTH_TOKEN="a7700999dcff89b738f62c78bd1e33c1"
export TWILIO_PHONE_NUMBER="+19152237302"

# 3. Or load from .env
cp .env.example .env
vim .env  # Edit with your credentials
set -a; source .env; set +a

# 4. Test setup
bash test_twilio_setup.sh
```

## Running the System

### Terminal 1: Start Webhook Server

```bash
cd ~/clawd/skills/twilio
python webhook_server.py
```

### Terminal 2: Expose to Internet (Choose One)

**Option A: ngrok (testing)**

```bash
ngrok http 5000
# Copy the URL: https://abc123.ngrok.io
```

**Option B: Tailscale (production)**

```bash
tailscale funnel 5000
# URL: https://your-machine.tail12345.ts.net
```

### Terminal 3: Configure Twilio

1. Go to: https://www.twilio.com/console/phone-numbers/incoming
2. Click your number
3. Set "Messaging" webhook to: `https://[your-url]/sms`
4. Save

## Send SMS

```bash
# Send message
python sms.py --to "+19152134309" --message "Hello!"

# With JSON output
python sms.py --to "+19152134309" --message "Hello!" --json
```

## Receive SMS

Text your Twilio number from your phone. Messages appear in:

- Server logs: `tail -f ~/.clawd/twilio_webhook.log`
- Conversation DB: `~/.clawd/twilio_conversations.json`

## Reply to SMS

```bash
# Send a reply
python respond_sms.py --to "+19152134309" --message "Thanks!"

# View conversation
python respond_sms.py --to "+19152134309" --view

# List all conversations
python respond_sms.py --list-conversations

# Export to JSON
python respond_sms.py --to "+19152134309" --view --json
```

## Monitoring

```bash
# Watch logs
tail -f ~/.clawd/twilio_webhook.log

# Health check
curl http://localhost:5000/health

# List conversations
curl http://localhost:5000/conversations | jq .

# Get specific conversation
curl http://localhost:5000/conversations/+19152134309 | jq .
```

## Troubleshooting

```bash
# Port in use?
lsof -i :5000
kill -9 <PID>

# Gateway running?
lsof -i :18789

# Credentials set?
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER

# Check logs
tail -100 ~/.clawd/twilio_webhook.log

# Find errors
grep ERROR ~/.clawd/twilio_webhook.log

# Test with curl
curl http://localhost:5000/health
```

## Phone Numbers

All formats accepted and auto-normalized to E.164:

```bash
# All work:
python respond_sms.py --to "+19152134309" --message "Hi"      # E.164
python respond_sms.py --to "19152134309" --message "Hi"       # No +
python respond_sms.py --to "9152134309" --message "Hi"        # 10-digit US
python respond_sms.py --to "915-213-4309" --message "Hi"      # With dashes
python respond_sms.py --to "(915) 213-4309" --message "Hi"    # Formatted
```

## Logs & Backups

```bash
# View logs
tail -f ~/.clawd/twilio_webhook.log

# Search logs
grep "ERROR" ~/.clawd/twilio_webhook.log
grep "+19152134309" ~/.clawd/twilio_webhook.log
grep "SMS sent" ~/.clawd/twilio_webhook.log

# Backup conversations
cp ~/.clawd/twilio_conversations.json ~/Desktop/backup.json

# Archive old logs
gzip ~/.clawd/twilio_webhook.log
```

## Test Commands

```bash
# Test SMS sending
python sms.py --to "+19152134309" --message "Test message"

# Test webhook server
python webhook_server.py --debug

# Test on custom port
python webhook_server.py --port 5001

# Test with custom gateway
python webhook_server.py --gateway-url "http://192.168.1.100:18789"

# Run full test suite
bash test_twilio_setup.sh
```

## Environment Variables

```bash
# Required
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="auth_token_here"
export TWILIO_PHONE_NUMBER="+19152237302"

# Optional (for ElevenLabs TTS)
export ELEVENLABS_API_KEY="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Optional (for webhook/gateway)
export GATEWAY_URL="http://localhost:18789"
export GATEWAY_TOKEN="your_token_here"
```

## File Locations

```
~/clawd/skills/twilio/
├── webhook_server.py          ← Receive SMS
├── respond_sms.py             ← Send replies
├── sms.py                     ← Send SMS
├── call.py                    ← Make calls
├── requirements.txt           ← Dependencies
├── SKILL.md                   ← Full docs
├── TWO_WAY_SMS_SETUP.md      ← Setup guide
└── QUICK_REFERENCE.md         ← This file

~/.clawd/
├── twilio_conversations.json  ← Message history
└── twilio_webhook.log         ← Server logs
```

## Common Issues & Fixes

| Issue                | Fix                                                    |
| -------------------- | ------------------------------------------------------ |
| Port 5000 in use     | `lsof -i :5000` + `kill -9 <PID>` or use `--port 5001` |
| No messages received | Check Twilio webhook URL + ngrok/Tailscale active      |
| Invalid signature    | `TWILIO_AUTH_TOKEN` doesn't match - get correct token  |
| SMS send fails       | Check credentials + phone format + account balance     |
| Gateway not found    | `clawdbot gateway start`                               |
| ngrok URL changed    | Restart ngrok, update Twilio webhook URL               |

## Python One-Liners

```python
# Send SMS
python3 -c "
from twilio.rest import Client
client = Client('AC...', 'token...')
msg = client.messages.create(to='+1...', from_='+1...', body='Hi')
print(msg.sid)
"

# Load conversations
python3 -c "
import json
with open('~/.clawd/twilio_conversations.json') as f:
    convs = json.load(f)
    print(f'Total conversations: {len(convs)}')
    for phone, conv in convs.items():
        print(f'{phone}: {conv[\"message_count\"]} messages')
"
```

## API Reference

### webhook_server.py

```
GET  /health                     Health check
POST /sms                        Receive SMS from Twilio
GET  /conversations              List all conversations
GET  /conversations/<phone>      Get specific conversation
```

### respond_sms.py

```bash
--to <phone>                   Recipient phone number
--message <text>               Message to send
--view                         View conversation
--list-conversations           List all conversations
--json                         Output as JSON
--account-sid <sid>            Twilio account SID
--auth-token <token>           Twilio auth token
--from <phone>                 Sender phone number
```

### sms.py

```bash
--to <phone>                   Recipient phone number
--message <text>               Message to send
--json                         Output as JSON
--account-sid <sid>            Twilio account SID
--auth-token <token>           Twilio auth token
--from <phone>                 Sender phone number
```

### call.py

```bash
--phone <phone>                Recipient phone number
--message <text>               Message to speak
--voice <id>                   ElevenLabs voice ID
--json                         Output as JSON
```

## Documentation

- **Complete Guide:** [SKILL.md](SKILL.md)
- **Setup Guide:** [TWO_WAY_SMS_SETUP.md](TWO_WAY_SMS_SETUP.md)
- **Quick Start:** [TWO_WAY_SMS_README.md](TWO_WAY_SMS_README.md)
- **This File:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

**Need more help?** See [SKILL.md](SKILL.md) → Troubleshooting section

Last updated: 2024-02-03
