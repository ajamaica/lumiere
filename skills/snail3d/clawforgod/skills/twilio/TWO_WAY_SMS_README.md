# Two-Way SMS System

Send and receive text messages with automatic replies and conversation history.

## What It Does

✅ **Receive** incoming SMS from any phone number
✅ **Store** conversation history in JSON format
✅ **Forward** messages to Clawdbot for notifications
✅ **Reply** to text messages using `respond_sms.py`
✅ **Track** all messages in conversation threads
✅ **Validate** Twilio signatures for security

## Components

| File                   | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `webhook_server.py`    | Listens for incoming SMS, stores history, forwards to gateway |
| `respond_sms.py`       | Send replies and view conversation history                    |
| `sms.py`               | Send individual SMS messages                                  |
| `call.py`              | Make voice calls                                              |
| `SKILL.md`             | Complete usage documentation                                  |
| `TWO_WAY_SMS_SETUP.md` | Step-by-step setup guide                                      |

## Quick Start (3 Steps)

### 1. Start Webhook Server

```bash
cd ~/clawd/skills/twilio
export TWILIO_ACCOUNT_SID="AC35fce9f5069e4a19358da26286380ca9"
export TWILIO_AUTH_TOKEN="a7700999dcff89b738f62c78bd1e33c1"
export TWILIO_PHONE_NUMBER="+19152237302"
python webhook_server.py
```

### 2. Expose to Internet

```bash
# Terminal 2 - ngrok (testing)
ngrok http 5000

# OR Tailscale (production)
tailscale funnel 5000
```

### 3. Configure in Twilio

1. Go to: https://www.twilio.com/console/phone-numbers/incoming
2. Click your number
3. Under "Messaging", set webhook to: `https://[your-url]/sms`
4. Save

**Done!** Now text your Twilio number and you'll receive the message.

## Usage

### Receive SMS

Just text your Twilio number. The webhook server will:

1. Log the message
2. Store in `~/.clawd/twilio_conversations.json`
3. Forward to Clawdbot gateway (if running)

### Send SMS

```bash
python sms.py --to "+19152134309" --message "Hello!"
```

### Reply to SMS

```bash
python respond_sms.py --to "+19152134309" --message "Got your message!"
```

### View Conversation

```bash
python respond_sms.py --to "+19152134309" --view
```

Output:

```
Conversation with +19152134309
Started: 2024-02-03T10:30:00
Total messages: 5

Recent messages:
[10:30] ← Them: Hey, how are you?
[10:31] → You: Doing great!
[10:35] ← Them: Cool, when are we meeting?
[10:36] → You: Tomorrow at 2pm
```

### List Conversations

```bash
python respond_sms.py --list-conversations
```

Output:

```
Phone Number    Messages   Last Message
+19152134309    5          2024-02-03
+19154567890    3          2024-02-02
+19158901234    2          2024-02-01
Total: 3 conversations
```

## Architecture

```
Incoming SMS
    ↓
    [Twilio Cloud]
    ↓
POST /sms (webhook_server.py)
    ├→ Validate signature
    ├→ Save to conversations.json
    ├→ Forward to gateway
    └→ Return 200 OK
    ↓
Clawdbot Gateway
    ├→ (Optional) Notify user in chat
    └→ (User sees message and crafts reply)
    ↓
User runs: respond_sms.py
    ├→ Send via Twilio
    ├→ Save to conversations.json
    └→ Return SID
    ↓
Outgoing SMS
```

## Files & Directories

```
~/clawd/skills/twilio/
├── webhook_server.py         ← Receive SMS
├── respond_sms.py            ← Send replies
├── sms.py                    ← Send SMS
├── call.py                   ← Make calls
├── requirements.txt          ← Python dependencies
├── SKILL.md                  ← Full documentation
├── TWO_WAY_SMS_SETUP.md     ← Setup guide
└── TWO_WAY_SMS_README.md    ← This file

~/.clawd/
├── twilio_conversations.json ← Conversation history
└── twilio_webhook.log        ← Server logs
```

## Conversation Database Format

`~/.clawd/twilio_conversations.json`:

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

## Logs

Server logs are written to `~/.clawd/twilio_webhook.log`

**View logs:**

```bash
tail -f ~/.clawd/twilio_webhook.log
```

**Find specific messages:**

```bash
grep "SMS sent" ~/.clawd/twilio_webhook.log
grep "ERROR" ~/.clawd/twilio_webhook.log
grep "+19152134309" ~/.clawd/twilio_webhook.log
```

## Webhook Endpoints

When running, the server provides:

```
GET  /health                    - Server health check
POST /sms                       - Receive Twilio webhook
GET  /conversations             - List all conversations
GET  /conversations/<phone>     - Get specific conversation
```

**Health check:**

```bash
curl http://localhost:5000/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-02-03T11:00:00",
  "gateway": "http://localhost:18789",
  "conversation_db": "/Users/ericwoodard/.clawd/twilio_conversations.json"
}
```

## Security

✅ **Implemented:**

- Twilio signature validation (rejects spoofed requests)
- No hardcoded credentials (uses environment variables)
- HTTPS for public URLs (ngrok/Tailscale)
- Request timeout handling
- Error logging without exposing secrets

⚠️ **Best Practices:**

- Never share account SID or auth token
- Keep `.env` out of version control
- Rotate credentials periodically
- Monitor Twilio logs for unusual activity
- Back up conversation history regularly

## Troubleshooting

### "Connection refused" on startup

Port 5000 is in use. Kill the existing process or use different port:

```bash
lsof -i :5000
kill -9 <PID>
# OR
python webhook_server.py --port 5001
```

### "No messages received"

1. Check Twilio webhook URL is correct and active
2. Verify ngrok/Tailscale tunnel is still running
3. Test health endpoint: `curl http://localhost:5000/health`
4. Check logs: `tail -f ~/.clawd/twilio_webhook.log`

### "Invalid Twilio signature"

Your `TWILIO_AUTH_TOKEN` doesn't match. Get the correct token from:
https://www.twilio.com/console/settings/api-keys

### "SMS failed to send"

1. Verify credentials are set
2. Check recipient phone number format: `+19152134309`
3. Ensure account has balance
4. Check Twilio logs for detailed errors

### "Gateway not found"

Clawdbot gateway isn't running. Start it:

```bash
clawdbot gateway start
```

## Testing

Run the test script:

```bash
bash test_twilio_setup.sh
```

This checks:

- Python 3.8+
- All dependencies installed
- Environment variables set
- File existence
- Port availability
- Phone number format
- And more...

## Next Steps

- [Full Setup Guide](TWO_WAY_SMS_SETUP.md) - Detailed instructions
- [Complete Documentation](SKILL.md) - All features and options
- [Twilio Docs](https://www.twilio.com/docs/sms) - Official reference

## Support

**Not working?**

1. Run: `bash test_twilio_setup.sh`
2. Check logs: `tail -f ~/.clawd/twilio_webhook.log`
3. Read: [SKILL.md](SKILL.md) → Troubleshooting section
4. Contact Twilio support if API issue

**Want more features?**

- Message filtering & auto-reply
- MMS support
- Message scheduling
- Bulk SMS
- Status callbacks

See [SKILL.md](SKILL.md) for extension examples.

---

**Happy texting!** 📱

Last updated: 2024-02-03
