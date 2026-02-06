# Two-Way SMS Setup Guide

This guide sets up two-way SMS messaging with Twilio so you can receive and respond to text messages.

## Overview

```
[Person sends SMS] → [Twilio] → [Your Webhook] → [Clawdbot notification]
                                                          ↓
[Person receives SMS] ← [Twilio] ← [Your Reply] ← [You respond]
```

## Quick Setup (5 minutes)

### 1. Start the Webhook Server

```bash
cd ~/clawd/skills/twilio
source .venv/bin/activate
python webhook_server.py 5000
```

Server is now running on port 5000.

### 2. Expose to Internet (Choose One)

**Option A: ngrok (easiest)**

```bash
# Install ngrok if needed: brew install ngrok
ngrok http 5000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Option B: Tailscale Funnel**

```bash
tailscale funnel 5000
```

Copy the URL (e.g., `https://your-machine.tailnet-xyz.ts.net`)

### 3. Configure Twilio Webhook

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click your phone number (915-223-7302)
4. Under **Messaging**, set:
   - **Webhook URL**: `https://your-ngrok-url/sms` (replace with your URL)
   - **HTTP Method**: POST
5. Save changes

### 4. Test It

Send an SMS to **(915) 223-7302** from your phone.

You should see the message appear in the webhook server console.

## Managing Conversations

### View New Messages

```bash
python conversations.py poll
```

### List All Conversations

```bash
python conversations.py list
```

### View Full Conversation

```bash
python conversations.py show "+19153097085"
```

### Send a Reply

```bash
python conversations.py reply \
  --to "+19153097085" \
  --message "Got it, thanks!"
```

## Integration with Clawdbot

To have Clawdbot automatically notify you of new SMS:

### Option 1: Polling Script (Simple)

Create a cron job to poll for new messages:

```bash
# Edit crontab
crontab -e

# Add this line to check every minute
* * * * * cd ~/clawd/skills/twilio && source .venv/bin/activate && python -c "import json,os,subprocess; f='incoming_sms.log'; (open(f,'r').read() and subprocess.run(['clawdbot', 'message', 'send', '--target', 'telegram:YOUR_CHAT_ID', '--message', json.dumps({'text': f'📱 SMS from {json.loads(line)[\"from\"]}: {json.loads(line)[\"body\"]}'})]) for line in open(f,'r')) and open(f,'w').close()) if os.path.exists(f) and os.path.getsize(f)>0 else None" 2>/dev/null
```

### Option 2: Webhook to Clawdbot (Advanced)

Modify `webhook_server.py` to call Clawdbot's gateway API directly:

```python
# In the log_message function, add:
import subprocess
subprocess.run([
    "curl", "-X", "POST",
    "http://localhost:18789/api/message",
    "-H", f"Authorization: Bearer {os.getenv('CLAWDBOT_TOKEN')}",
    "-d", json.dumps({
        "channel": "telegram",
        "target": "YOUR_CHAT_ID",
        "message": f"📱 SMS from {from_number}: {body}"
    })
])
```

## File Structure

```
twilio/
├── webhook_server.py      # Receives SMS from Twilio
├── conversations.py       # Manage conversations & replies
├── conversations.json     # Conversation history (auto-created)
├── incoming_sms.log      # New messages queue (auto-created)
├── call.py               # Make voice calls
├── sms.py                # Send one-way SMS
└── ...
```

## Troubleshooting

### "Webhook URL not accessible"

- Ensure ngrok/tailscale is running
- Check the URL is HTTPS (Twilio requires this)
- Verify the port matches (5000)

### "Messages not appearing"

- Check Twilio console for delivery errors
- Verify webhook URL is correct in Twilio settings
- Check webhook server is running and accessible
- Look at Twilio's error logs

### "Can't send replies"

- Ensure Twilio credentials are set
- Check the phone number format (E.164: +1XXXXXXXXXX)
- Verify your Twilio account has SMS sending enabled

### "Webhook server crashes"

- Check conversations.json isn't corrupted
- Ensure port 5000 isn't in use: `lsof -i :5000`
- Try a different port: `python webhook_server.py 5001`

## Security Notes

- Keep your ngrok/tailscale URLs private
- Don't commit `.env` file with real credentials
- The webhook validates Twilio's signature in production
- Consider adding rate limiting for production use
- Use HTTPS for webhook URLs (Twilio requirement)

## Advanced: Auto-Reply Bot

Create a simple auto-responder:

```python
# auto_reply.py
import json
import os
import time
from conversations import send_reply

def auto_responder():
    while True:
        if os.path.exists("incoming_sms.log"):
            with open("incoming_sms.log", 'r') as f:
                lines = f.readlines()

            open("incoming_sms.log", 'w').close()  # Clear

            for line in lines:
                msg = json.loads(line)
                body = msg.get("body", "").lower()
                from_num = msg.get("from")

                # Simple responses
                if "help" in body:
                    send_reply(from_num, "Commands: status, stop, info")
                elif "status" in body:
                    send_reply(from_num, "All systems operational ✅")
                else:
                    send_reply(from_num, "Thanks for your message! I'll get back to you soon.")

        time.sleep(5)

if __name__ == "__main__":
    auto_responder()
```

Run it:

```bash
python auto_reply.py
```

## Next Steps

- [ ] Set up persistent ngrok domain (ngrok.com dashboard)
- [ ] Add Twilio signature validation
- [ ] Create Clawdbot integration for real-time notifications
- [ ] Build conversation threading
- [ ] Add media message (MMS) support
