# Twilio Skill - Voice Calls, SMS & Two-Way Messaging

Complete Twilio integration for making voice calls, sending SMS messages, and receiving incoming text messages with automatic replies.

## Quick Links

- **Outbound SMS:** `sms.py` - Send text messages
- **Outbound Calls:** `call.py` - Make voice calls with TTS
- **Webhook Server:** `webhook_server.py` - Receive incoming SMS
- **SMS Replies:** `respond_sms.py` - Reply to incoming texts
- **Setup Guide:** See "Setup" section below
- **Troubleshooting:** See end of this document

---

## Setup

### 1. Prerequisites

- Python 3.8+
- Twilio account with phone number and SMS/calling enabled
- (Optional) ngrok or Tailscale funnel for exposing webhook to internet

### 2. Install Dependencies

```bash
cd ~/clawd/skills/twilio
pip install -r requirements.txt
```

Verify installation:

```bash
python -c "from twilio.rest import Client; from flask import Flask; print('✓ All dependencies installed')"
```

### 3. Set Environment Variables

Export these before using any scripts:

```bash
export TWILIO_ACCOUNT_SID="AC35fce9f5069e4a19358da26286380ca9"
export TWILIO_AUTH_TOKEN="a7700999dcff89b738f62c78bd1e33c1"
export TWILIO_PHONE_NUMBER="+19152237302"
export ELEVENLABS_API_KEY="sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a"
```

Or create a `.env` file:

```bash
# .env
TWILIO_ACCOUNT_SID=AC35fce9f5069e4a19358da26286380ca9
TWILIO_AUTH_TOKEN=a7700999dcff89b738f62c78bd1e33c1
TWILIO_PHONE_NUMBER=+19152237302
ELEVENLABS_API_KEY=sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a
```

Then load it:

```bash
set -a; source .env; set +a
```

**⚠️ Important:** Never commit `.env` with real credentials. Add to `.gitignore`:

```
.env
.env.local
*.log
```

### 4. Verify Credentials

```bash
# Check that variables are set
echo "Account SID: $TWILIO_ACCOUNT_SID"
echo "Phone: $TWILIO_PHONE_NUMBER"

# Test with a simple SMS
python sms.py --phone "+19152134309" --message "Hello from Twilio skill!"
```

---

## Features

### 1. Send SMS Messages

Send text messages to any phone number.

```bash
python sms.py --phone "+19152134309" --message "Hello!"
```

**Options:**

- `--phone` (required): Recipient in E.164 format (e.g., `+19152134309`)
- `--message` (required): Message body
- `--json`: Output response as JSON

**Response:**

```json
{
  "status": "success",
  "message_sid": "SM1234567890abcdef",
  "phone": "+19152134309",
  "message": "Hello!",
  "from_number": "+1 (915) 223-7302",
  "segments": 1
}
```

### 2. Make Voice Calls

Place outbound calls with text-to-speech.

```bash
python call.py --phone "+19152134309" --message "Hello, this is a test call"
```

**Options:**

- `--phone` (required): Recipient in E.164 format
- `--message` (required): Message to speak
- `--voice` (optional): ElevenLabs voice ID (default: Rachel)
- `--json`: Output response as JSON

**Response:**

```json
{
  "status": "success",
  "call_sid": "CA1234567890abcdef",
  "phone": "+19152134309",
  "message": "Hello, this is a test call",
  "from_number": "+1 (915) 223-7302"
}
```

### 3. Receive Incoming SMS (Webhook Server)

Start the webhook server to receive incoming text messages automatically:

```bash
python webhook_server.py
```

This server:

- ✅ Listens for POST requests from Twilio (port 5000 by default)
- ✅ Stores conversation history in JSON
- ✅ Forwards messages to Clawdbot gateway
- ✅ Validates Twilio signatures for security
- ✅ Maintains conversation state per phone number

**Server Options:**

- `--host`: Bind address (default: 127.0.0.1)
- `--port`: Port number (default: 5000)
- `--debug`: Enable debug mode
- `--gateway-url`: Clawdbot gateway URL (default: http://localhost:18789)
- `--gateway-token`: Gateway auth token

**Example:**

```bash
python webhook_server.py --port 5000 --debug
```

**Server Endpoints:**

```
POST   /sms                          - Receive Twilio webhook
GET    /health                        - Health check
GET    /conversations                 - List all conversations
GET    /conversations/<phone>         - Get specific conversation
```

### 4. Send SMS Replies

Reply to incoming messages using `respond_sms.py`:

```bash
# Send a reply
python respond_sms.py --to "+19152134309" --message "Thanks for texting!"

# View conversation history
python respond_sms.py --to "+19152134309" --view

# List all active conversations
python respond_sms.py --list-conversations
```

**Options:**

- `--to`: Phone number (required for sending)
- `--message`: Reply message (required for sending)
- `--view`: View conversation with this number
- `--list-conversations`: Show all active conversations
- `--json`: Output as JSON

**Example responses:**

```bash
# Send reply
$ python respond_sms.py --to "+19152134309" --message "Got it!"
✓ SMS sent to +19152134309
  SID: SM1234567890abcdef
  Message: Got it!

# View conversation
$ python respond_sms.py --to "+19152134309" --view
Conversation with +19152134309
Started: 2024-02-03T10:30:00
Total messages: 5

Recent messages:
[10:31] ← Them: Hey, how are you?
[10:32] → You: Doing well!
[10:35] ← Them: Great, when are we meeting?
[10:36] → You: Tomorrow at 2pm
[10:37] ← Them: Perfect!

# List conversations
$ python respond_sms.py --list-conversations
Phone Number    Messages   Last Message
+19152134309    5          2024-02-03
+19154567890    3          2024-02-02
Total: 2 conversations
```

---

## Two-Way SMS Workflow

Here's how the system handles incoming and outgoing messages:

```
Incoming SMS from User
         ↓
    [Twilio Cloud]
         ↓
webhook_server.py (POST /sms)
         ├→ Validate signature
         ├→ Store in conversation_db.json
         ├→ Forward to Clawdbot gateway
         └→ Return 200 OK to Twilio
         ↓
Clawdbot Gateway
         ├→ Notify user in Telegram/chat
         └→ (User crafts reply)
         ↓
User runs: respond_sms.py --to +1234567890 --message "Reply text"
         ↓
respond_sms.py
         ├→ Create Twilio client
         ├→ Send SMS
         ├→ Record in conversation_db.json
         └→ Return success/error
         ↓
    [Twilio Cloud]
         ↓
   Outgoing SMS to User
```

---

## Public URL Setup (Required for Webhook)

The webhook server runs locally. To receive SMS from Twilio, it needs a public URL. Choose one:

### Option A: ngrok (Simple, Temporary)

Best for testing.

```bash
# Install ngrok (one-time)
brew install ngrok  # macOS
# or visit https://ngrok.com/download

# Start ngrok tunnel
ngrok http 5000

# Output:
# Forwarding  https://1a2b3c4d5e6f.ngrok.io -> http://localhost:5000
```

Your public URL is `https://1a2b3c4d5e6f.ngrok.io/sms` (note: `/sms` endpoint)

**In Twilio Console:**

1. Go to Phone Numbers → Active Numbers
2. Click your number
3. Set "A Call Comes In" → "Webhooks" → "Messaging"
4. Paste: `https://1a2b3c4d5e6f.ngrok.io/sms`
5. Save

### Option B: Tailscale Funnel (Persistent)

Best for production use on your local machine.

```bash
# Install Tailscale (one-time)
brew install tailscale
tailscale up

# Enable funnel on port 5000
tailscale funnel 5000

# Output:
# Access point: https://your-machine.tail12345.ts.net
```

Your public URL is `https://your-machine.tail12345.ts.net/sms`

**In Twilio Console:**

1. Go to Phone Numbers → Active Numbers
2. Click your number
3. Set messaging to: `https://your-machine.tail12345.ts.net/sms`
4. Save

### Option C: Static IP / Port Forwarding (Advanced)

If you have a static public IP and router access:

1. Forward port 5000 to your local machine
2. Use: `https://your-public-ip:5000/sms`
3. Consider using a domain name + SSL cert for security

---

## Running the System

### Development Setup (All-in-One)

Terminal 1: Start webhook server

```bash
cd ~/clawd/skills/twilio
source .env  # Load credentials
python webhook_server.py --port 5000 --debug
```

Terminal 2: Start ngrok tunnel

```bash
ngrok http 5000
```

Terminal 3: Test sending a reply

```bash
cd ~/clawd/skills/twilio
source .env
python respond_sms.py --to "+19152134309" --message "Test reply"
```

### Production Setup (with Tailscale)

Terminal 1: Ensure Tailscale is running

```bash
tailscale up
tailscale funnel 5000
```

Terminal 2: Start webhook server

```bash
cd ~/clawd/skills/twilio
source .env
python webhook_server.py --port 5000
```

That's it! Your server is accessible via `https://your-machine.tail12345.ts.net/sms`

---

## Conversation History

All conversations are stored in `~/.clawd/twilio_conversations.json`

**Format:**

```json
{
  "+19152134309": {
    "phone": "+19152134309",
    "created_at": "2024-02-03T10:30:00",
    "last_message_at": "2024-02-03T11:45:00",
    "message_count": 5,
    "messages": [
      {
        "timestamp": "2024-02-03T10:30:00",
        "direction": "inbound",
        "body": "Hey!",
        "sid": "SM1234567890abcdef"
      },
      {
        "timestamp": "2024-02-03T10:31:00",
        "direction": "outbound",
        "body": "Hi there!",
        "sid": "SM1234567890abcdef"
      }
    ]
  }
}
```

**View conversation:**

```bash
python respond_sms.py --to "+19152134309" --view
```

**Backup conversations:**

```bash
cp ~/.clawd/twilio_conversations.json ~/Desktop/twilio_backup.json
```

**Clear history (careful!):**

```bash
rm ~/.clawd/twilio_conversations.json
```

---

## Logs

Server logs are stored in `~/.clawd/twilio_webhook.log`

**View real-time logs:**

```bash
tail -f ~/.clawd/twilio_webhook.log
```

**Parse logs:**

```bash
grep "ERROR" ~/.clawd/twilio_webhook.log
grep "SMS sent" ~/.clawd/twilio_webhook.log
```

---

## Security & Best Practices

### ✅ Implemented

- ✓ Twilio signature validation on webhook
- ✓ Environment variable credentials (no hardcoded secrets)
- ✓ Request timeout handling
- ✓ Error logging (sensitive data scrubbed)
- ✓ Phone number format validation (E.164)

### ⚠️ Additional Recommendations

1. **Keep credentials secret:**
   - Never share account SID or auth token
   - Rotate tokens regularly
   - Use `.env` with `.gitignore`

2. **Monitor usage:**
   - Set Twilio account alerts for unusual activity
   - Review Logs regularly: https://www.twilio.com/console/logs

3. **Firewall the webhook:**
   - If using static IP, restrict to Twilio's IP ranges
   - Use IP filtering on router
   - Enable HTTPS only (ngrok/Tailscale handle this)

4. **Rate limiting:**
   - Implement rate limiting for `respond_sms.py` if used by multiple users
   - Twilio has API rate limits; be aware of costs

5. **Data protection:**
   - Conversation history stored locally (not encrypted)
   - Consider encrypting `~/.clawd/twilio_conversations.json` if sensitive
   - Backup important conversations

---

## Examples

### Example 1: Automated Status Check

```bash
#!/bin/bash
# Check server health
curl http://localhost:5000/health | jq .

# Output:
# {
#   "status": "healthy",
#   "timestamp": "2024-02-03T11:00:00",
#   "gateway": "http://localhost:18789",
#   "conversation_db": "/Users/ericwoodard/.clawd/twilio_conversations.json"
# }
```

### Example 2: Bulk Reply Script

```bash
#!/bin/bash
# Reply to multiple numbers
for phone in "+19152134309" "+19154567890" "+19158901234"; do
  python respond_sms.py --to "$phone" --message "Hello from bulk script!"
  sleep 2  # Avoid rate limiting
done
```

### Example 3: Integration with Clawdbot

```python
# In a Clawdbot skill
import subprocess
import json

def send_sms(phone, message):
    result = subprocess.run([
        'python', '/path/to/respond_sms.py',
        '--to', phone,
        '--message', message,
        '--json'
    ], capture_output=True, text=True)

    return json.loads(result.stdout)

# Use it
response = send_sms("+19152134309", "Hello from Python!")
print(response['message_sid'])
```

---

## Troubleshooting

### "Module not found: twilio"

```bash
pip install -r requirements.txt
```

### "Authentication failed"

1. Verify credentials are set:

   ```bash
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_AUTH_TOKEN
   ```

2. Check credentials in Twilio Console:
   - https://www.twilio.com/console/project/settings

3. Ensure auth token is not expired

### "Connection refused" (gateway)

The Clawdbot gateway is not running:

```bash
# Check if gateway is running
lsof -i :18789

# If not running, start it (in Clawdbot)
clawdbot gateway start

# Verify
clawdbot gateway status
```

### "Invalid Twilio signature"

Webhook validation failed. Either:

- Request really didn't come from Twilio (security issue)
- `TWILIO_AUTH_TOKEN` is wrong in your `.env`
- You're testing with curl (signatures are per-request)

To disable validation temporarily (testing only):

```bash
# In webhook_server.py, change:
if not validate_twilio_signature(request):
    return Response("Unauthorized", status=401)

# To:
# Temporarily disabled for testing
# if not validate_twilio_signature(request):
#     return Response("Unauthorized", status=401)
```

### "SMS failed to send"

1. Check recipient number format: `+19152134309` (E.164)
2. Verify Twilio account has SMS enabled
3. Check account balance
4. Review Twilio logs: https://www.twilio.com/console/logs

### "No conversations found"

The webhook hasn't received any messages yet.

1. Test webhook is running:

   ```bash
   curl http://localhost:5000/health
   ```

2. Verify ngrok/Tailscale tunnel is active

3. Check Twilio phone number config points to webhook URL

4. Try sending a test SMS from your phone

### "Webhook server won't start"

Port 5000 is already in use:

```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use different port
python webhook_server.py --port 5001
```

### Need help?

1. Check logs: `tail -f ~/.clawd/twilio_webhook.log`
2. Enable debug: `python webhook_server.py --debug`
3. Test with curl:
   ```bash
   curl -X POST http://localhost:5000/health
   ```
4. Review Twilio docs: https://www.twilio.com/docs/sms/quickstart

---

## Costs

- **SMS:** $0.0075 per message
- **Voice calls:** $0.013 - $0.025 per minute
- **ElevenLabs TTS:** $0.15 per 1M characters

**Cost control:**

- Keep messages short
- Avoid unnecessary API calls
- Monitor usage in Twilio Console
- Set account alerts for high usage

---

## Phone Number Format

All phone numbers use **E.164** format:

```
+[Country Code][Area Code][Number]
```

**Examples:**

- US: `+1 915 223 7302` → `+19152237302`
- UK: `+44 20 7122 3467` → `+442071223467`
- Canada: `+1 416 555 1234` → `+14165551234`

**Scripts accept:**

- E.164: `+19152134309` ✓
- 10-digit US: `9152134309` ✓ (auto-converted to `+19152134309`)
- Formatted: `(915) 213-4309` ✓ (spaces/dashes removed)
- Invalid: `1-915-213-4309` ✗ (use `+1` prefix)

---

## Related Skills

- **Universal Voice Agent** - Goal-oriented calling with real-time voice
- **Jami Skill** - Peer-to-peer voice communication
- **Sentry Mode** - Webcam surveillance with voice alerts

---

## License

MIT - Use freely in your projects

---

## Support

**Twilio Documentation:**

- SMS: https://www.twilio.com/docs/sms
- Voice: https://www.twilio.com/docs/voice
- Webhooks: https://www.twilio.com/docs/usage/webhooks

**Twilio Console:**

- https://www.twilio.com/console

**ElevenLabs Documentation:**

- https://elevenlabs.io/docs/

Last updated: 2024-02-03
