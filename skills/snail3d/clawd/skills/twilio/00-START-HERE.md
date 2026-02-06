# 🚀 START HERE - Twilio Two-Way SMS System

**Welcome!** You now have a complete two-way SMS system. This file guides you through the first steps.

---

## ✅ What You Have

✓ **webhook_server.py** - Receive incoming SMS  
✓ **respond_sms.py** - Send replies  
✓ **Comprehensive documentation** - Everything explained  
✓ **Test script** - Verify setup  
✓ **Production-ready code** - Clean and secure

---

## 🎯 3-Minute Overview

**The system works like this:**

```
Someone texts your Twilio number
        ↓
webhook_server.py receives it
        ↓
Message stored & forwarded
        ↓
You reply with respond_sms.py
        ↓
SMS sent back to them
```

---

## 📖 Quick Navigation

### I'm in a hurry

Read this file, then run:

```bash
cd ~/clawd/skills/twilio
bash test_twilio_setup.sh
```

### I want the 5-minute overview

Read: `TWO_WAY_SMS_README.md`

### I want detailed setup instructions

Read: `TWO_WAY_SMS_SETUP.md` (step-by-step)

### I want quick commands/reference

Read: `QUICK_REFERENCE.md`

### I want to understand everything

Read: `SKILL.md` (complete documentation)

### I'm looking for something specific

Read: `INDEX.md` (master index)

---

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd ~/clawd/skills/twilio
pip install -r requirements.txt
```

### Step 2: Set Your Credentials

```bash
export TWILIO_ACCOUNT_SID="AC35fce9f5069e4a19358da26286380ca9"
export TWILIO_AUTH_TOKEN="a7700999dcff89b738f62c78bd1e33c1"
export TWILIO_PHONE_NUMBER="+19152237302"
```

Or create `.env` and load it:

```bash
cp .env.example .env
vim .env  # Edit with your credentials
set -a; source .env; set +a
```

### Step 3: Verify Everything Works

```bash
bash test_twilio_setup.sh
```

If all checks pass ✓, you're ready!

### Step 4: Start the Server

```bash
python webhook_server.py
```

You should see:

```
============================================================
Twilio SMS Webhook Server Starting
============================================================
Host: 127.0.0.1
Port: 5000
...
============================================================
```

### Step 5: Expose to Internet (Terminal 2)

```bash
ngrok http 5000
```

You'll see something like:

```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:5000
```

Copy the HTTPS URL (the `https://abc123def456.ngrok.io` part).

### Step 6: Configure Twilio

1. Open: https://www.twilio.com/console/phone-numbers/incoming
2. Click your phone number: **(915) 223-7302**
3. Find "Messaging" section
4. Set "A Message Comes In" to **Webhooks**
5. Paste your ngrok URL + `/sms`:
   ```
   https://abc123def456.ngrok.io/sms
   ```
6. Click **Save**

### Step 7: Test It!

Text your Twilio number from your phone:

```
Hello webhook!
```

Check Terminal 1 (server logs):

```
INFO: Received SMS from +19152134309: Hello webhook!
INFO: Successfully forwarded message to gateway
```

### Step 8: Send a Reply (Terminal 3)

```bash
python respond_sms.py --to "+19152134309" --message "Got your message!"
```

**Done!** 🎉 You have a working two-way SMS system!

---

## 📞 Common Commands

```bash
# Receive SMS (always running)
python webhook_server.py

# Send a reply
python respond_sms.py --to "+19152134309" --message "Hi!"

# View a conversation
python respond_sms.py --to "+19152134309" --view

# List all conversations
python respond_sms.py --list-conversations

# Check server health
curl http://localhost:5000/health

# View logs
tail -f ~/.clawd/twilio_webhook.log
```

---

## 🐛 Troubleshooting (3 Steps)

### Step 1: Run the Test Script

```bash
bash test_twilio_setup.sh
```

This checks everything. If it passes ✓, skip to Step 3.

### Step 2: Check Common Issues

- **Port 5000 in use?** → `lsof -i :5000` then `kill -9 <PID>`
- **ngrok not running?** → `ngrok http 5000` in another terminal
- **Credentials wrong?** → `echo $TWILIO_ACCOUNT_SID` should show your ID
- **No messages received?** → Check Twilio webhook URL is correct

### Step 3: Read the Full Guide

See: `TWO_WAY_SMS_SETUP.md` → Troubleshooting section

---

## 📚 Documentation Files

| File                      | When to Read            | Time   |
| ------------------------- | ----------------------- | ------ |
| 00-START-HERE.md          | First! (you are here)   | 2 min  |
| TWO_WAY_SMS_README.md     | Quick overview          | 5 min  |
| TWO_WAY_SMS_SETUP.md      | Detailed setup          | 15 min |
| QUICK_REFERENCE.md        | Need a command          | 1 min  |
| SKILL.md                  | Full reference          | 30 min |
| INDEX.md                  | Find something          | 5 min  |
| IMPLEMENTATION_SUMMARY.md | Understand architecture | 10 min |

---

## 🔐 Security Notes

✅ **This system includes:**

- Twilio signature validation (prevents spoofing)
- Environment variable credentials (no hardcoded secrets)
- HTTPS only (ngrok/Tailscale handle encryption)
- Error logging without exposing sensitive data

⚠️ **Remember:**

- Never share your Account SID or Auth Token
- Keep `.env` file secret (add to `.gitignore`)
- Monitor Twilio logs for unusual activity

---

## 🎯 What Happens Next?

### Immediate

1. Get it working with ngrok
2. Send and receive test messages
3. View conversation history

### Next Week

1. Switch to Tailscale Funnel (persistent URL)
2. Set up monitoring/alerts
3. Create message templates

### Next Month

1. Integrate with Clawdbot chat
2. Add auto-reply features
3. Archive old conversations

---

## 💬 Getting Help

**Not working?**

1. Read: `TWO_WAY_SMS_SETUP.md` → Troubleshooting
2. Run: `bash test_twilio_setup.sh`
3. Check: `tail -f ~/.clawd/twilio_webhook.log`

**Need reference?**

- `QUICK_REFERENCE.md` - Copy-paste commands
- `SKILL.md` - Complete documentation
- `INDEX.md` - Find anything

**Still stuck?**
Check official docs:

- Twilio SMS: https://www.twilio.com/docs/sms
- ngrok: https://ngrok.com/docs
- Flask: https://flask.palletsprojects.com/

---

## ✨ Cool Things You Can Do

```bash
# Send bulk replies
for phone in "+1234567890" "+0987654321"; do
  python respond_sms.py --to "$phone" --message "Hello!"
done

# Monitor all new messages
watch -n 1 'python respond_sms.py --list-conversations'

# Export all conversations
python respond_sms.py --list-conversations | tee conversations.txt

# Check server is healthy
curl http://localhost:5000/health | jq .
```

---

## 🎉 You're Ready!

Everything is set up. Time to:

1. **Install:** `pip install -r requirements.txt`
2. **Test:** `bash test_twilio_setup.sh`
3. **Start:** `python webhook_server.py`
4. **Expose:** `ngrok http 5000`
5. **Configure:** Set Twilio webhook URL
6. **Test:** Send SMS from your phone
7. **Reply:** `python respond_sms.py --to "+1..." --message "..."`

---

**Questions?** → Read the appropriate guide above  
**Ready?** → Start with Step 1 in "Get Started in 5 Minutes"  
**Want more info?** → Open `TWO_WAY_SMS_README.md`

---

**Happy texting!** 📱

Last updated: February 3, 2024
