# Two-Way SMS Setup Guide

Complete step-by-step guide to get incoming SMS working with webhooks.

## 5-Minute Quick Start

### Step 1: Install Dependencies

```bash
cd ~/clawd/skills/twilio
pip install -r requirements.txt
```

### Step 2: Set Environment Variables

```bash
# Copy example and fill in your credentials
cp .env.example .env

# Edit .env with your actual credentials:
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

Load it:

```bash
set -a; source .env; set +a
```

### Step 3: Start Webhook Server

Terminal 1:

```bash
cd ~/clawd/skills/twilio
source .env  # If using .env file
python webhook_server.py
```

Expected output:

```
============================================================
Twilio SMS Webhook Server Starting
============================================================
Host: 127.0.0.1
Port: 5000
Gateway: http://localhost:18789

Endpoints:
  POST   http://127.0.0.1:5000/sms
  GET    http://127.0.0.1:5000/health
============================================================
```

### Step 4: Expose to Internet (One-Time)

Terminal 2:

```bash
# Using ngrok (test)
ngrok http 5000

# OR using Tailscale (persistent)
tailscale funnel 5000
```

Example ngrok output:

```
Forwarding  https://1a2b3c4d5e6f.ngrok.io -> http://localhost:5000
```

### Step 5: Configure Twilio Webhook

1. Open https://www.twilio.com/console/phone-numbers/incoming
2. Click your phone number
3. Under "Messaging" section:
   - Set "A Message Comes In" to **Webhooks**
   - Paste your public URL: `https://1a2b3c4d5e6f.ngrok.io/sms`
   - Click **Save**

### Step 6: Test Incoming SMS

Send a text to your Twilio number from your phone:

```
Hello webhook!
```

Check the server logs (Terminal 1):

```
INFO: Received SMS from +1xxxxxxxxxx: Hello webhook!
INFO: Added inbound message from +1xxxxxxxxxx
```

### Step 7: Send a Reply

Terminal 3:

```bash
cd ~/clawd/skills/twilio
python respond_sms.py --to "+1xxxxxxxxxx" --message "Got your message!"
```

### Step 8: View Conversation History

```bash
python respond_sms.py --to "+1xxxxxxxxxx" --view
```

**Done!** You now have a working two-way SMS system.

---

## Detailed Setup Instructions

### Prerequisites

- ✓ Python 3.8+
- ✓ Twilio account with phone number
- ✓ Outbound SMS verified/enabled in Twilio
- ✓ (Optional) ngrok or Tailscale for public URL

### 1. Environment Setup

#### Using .env File (RECOMMENDED)

```bash
cd ~/clawd/skills/twilio
cp .env.example .env
vim .env  # Add your credentials
```

Load it:

```bash
set -a; source .env; set +a
```

#### Export Variables Directly (Not Recommended)

```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_PHONE_NUMBER="+1xxxxxxxxxx"
```

### 2. Verify Installation

```bash
# Check Python version
python3 --version

# Check dependencies installed
pip list | grep -E "twilio|flask|requests"

# Test Twilio import
python3 -c "from twilio.rest import Client; print('✓ Twilio installed')"
```

### 3. Test Credentials

```bash
# Send test SMS
python sms.py --to "+1xxxxxxxxxx" --message "Credentials test"
```

If this fails:

- Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
- Verify credentials in Twilio Console: https://www.twilio.com/console
- Make sure auth token hasn't expired

### 4. Start Webhook Server

```bash
cd ~/clawd/skills/twilio

# Option A: Default settings (localhost:5000)
python webhook_server.py

# Option B: Custom port
python webhook_server.py --port 5001

# Option C: Debug mode
python webhook_server.py --debug
```

The server will:

1. Create logs at `~/.clawd/twilio_webhook.log`
2. Create conversation DB at `~/.clawd/twilio_conversations.json`
3. Listen on `http://localhost:5000` (or custom port)

### 5. Expose Webhook to Internet

#### Using ngrok (Testing)

```bash
# Install (one-time)
brew install ngrok

# Start tunnel
ngrok http 5000

# Output:
# Forwarding  https://1a2b3c4d5e6f.ngrok.io -> http://localhost:5000
```

**Note:** ngrok URL changes when you restart.

#### Using Tailscale Funnel (Production)

```bash
# Install (one-time)
brew install tailscale
tailscale up

# Enable funnel for port 5000
tailscale funnel 5000

# Output:
# Available on:
#   https://your-machine.tail12345.ts.net/
```

### 6. Configure Twilio Webhook

Go to Twilio Console:

1. **https://www.twilio.com/console/phone-numbers/incoming**
2. Click your phone number
3. Under **Messaging**:
   - Set "A Message Comes In" to **Webhooks**
   - Paste your public URL: `https://your-url.ngrok.io/sms`
   - Method: **HTTP POST**
   - Click **Save**

### 7. Test the Webhook

**Send a test SMS:**

1. From your phone, text your Twilio number
2. Check server logs: `tail -f ~/.clawd/twilio_webhook.log`

### 8. Send a Reply

```bash
python respond_sms.py --to "+1xxxxxxxxxx" --message "Hello back!"
```

---

## Troubleshooting

### Server won't start

**Error:** `Address already in use`

```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use different port
python webhook_server.py --port 5001
```

### No messages received

**Check 1: Is webhook URL correct in Twilio?**

```bash
# Go to: https://www.twilio.com/console/phone-numbers/incoming
# Click your number and verify the webhook URL
```

**Check 2: Is ngrok still running?**

```bash
# ngrok URLs expire after 2 hours (free tier)
# Restart ngrok and update Twilio webhook
ngrok http 5000
```

**Check 3: Test health endpoint**

```bash
curl http://localhost:5000/health
```

### Gateway connection fails

**Error:** "Failed to connect to gateway"

```bash
# Check if gateway is running
clawdbot gateway status

# Start it
clawdbot gateway start
```

### Invalid Twilio signature

**Error:** "Invalid Twilio signature"

This means:

- The `TWILIO_AUTH_TOKEN` doesn't match
- Someone is spoofing Twilio requests

**Fix:**

1. Verify token in Twilio Console
2. Restart webhook server with correct token

---

## Security Best Practices

⚠️ **NEVER commit credentials to Git:**

```bash
# Always add .env to .gitignore
echo ".env" >> .gitignore
```

⚠️ **Rotate credentials if exposed:**

1. Go to Twilio Console → Settings → API Keys
2. Generate new Auth Token
3. Update your .env file
4. Delete old token

⚠️ **Use environment variables, not hardcoded strings**

---

## Monitoring & Maintenance

### Monitor in Real-Time

```bash
# Watch server logs
tail -f ~/.clawd/twilio_webhook.log
```

### Check Server Health

```bash
# HTTP health check
curl http://localhost:5000/health

# Check conversations
curl http://localhost:5000/conversations
```

### Backup Conversations

```bash
# Daily backup
cp ~/.clawd/twilio_conversations.json ~/Desktop/twilio_backup_$(date +%Y%m%d).json
```

---

## Getting Help

**Server doesn't start?**

1. Check logs: `tail -f ~/.clawd/twilio_webhook.log`
2. Run with debug: `python webhook_server.py --debug`
3. Test port: `lsof -i :5000`

**Webhook not receiving messages?**

1. Verify URL in Twilio Console
2. Check ngrok is running
3. Test webhook URL with curl

**SMS not sending?**

1. Check account balance
2. Verify phone number format: `+1xxxxxxxxxx`
3. Test: `python sms.py --to "+1xxxxxxxxxx" --message "Test"`

**Need support?**

- Twilio Docs: https://www.twilio.com/docs/sms
- Twilio Support: https://www.twilio.com/support

---

Last updated: 2024-02-04
