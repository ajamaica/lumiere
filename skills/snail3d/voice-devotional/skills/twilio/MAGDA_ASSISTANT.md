# 🤖 SMS Assistant for Magda

Your wife can text your Twilio number and I'll take actions on your behalf — add calendar events, create tasks, send you notes, and more.

## What Magda Can Do

### 📅 Add to Calendar

```
"Add to calendar: Dinner with parents Friday at 7pm"
"Schedule dentist appointment tomorrow at 2pm"
"Remind Eric about the meeting on Monday at 9am"
```

### ✅ Create Tasks

```
"Add task: Pick up milk on the way home"
"Tell Eric to call mom tomorrow"
"Remind Eric to submit the report by Friday"
```

### 📝 Send Notes

```
"Tell Eric the package arrived"
"Let Eric know I'm running late"
"Remind Eric we need diapers"
```

## How It Works

```
Magda sends SMS
      ↓
Twilio receives it
      ↓
Webhook server processes it
      ↓
SMS Assistant parses the intent
      ↓
Action executed (calendar, task, note)
      ↓
Confirmation sent back to Magda
      ↓
You get notified in Telegram
```

## Quick Start

### 1. Start the Webhook Server

```bash
cd ~/clawd/skills/twilio
source .venv/bin/activate
python webhook_server.py 5000
```

### 2. Expose to Internet

**Using ngrok:**

```bash
ngrok http 5000
```

**Using Tailscale:**

```bash
tailscale funnel 5000
```

### 3. Configure Twilio

1. Go to [Twilio Console](https://www.twilio.com/console/phone-numbers/active)
2. Click your number: **(915) 223-7302**
3. Under **Messaging**:
   - **Webhook URL**: `https://your-ngrok-url/sms`
   - **HTTP Method**: POST
4. Save

### 4. Authorize Magda

Edit `sms_assistant.py` and add her number:

```python
ALLOWED_SENDERS = ["+19153097085"]  # Already done!
```

### 5. Test It

Have Magda text: _"Add to calendar: Test event tomorrow at 3pm"_

She should get back: _"✅ Added 'Test event' to Eric's calendar on 2025-02-04 at 15:00"_

## Viewing Actions & Notifications

### Check Notifications

```bash
python view_notifications.py
```

Shows you:

- What Magda requested
- What actions were taken
- Any pending confirmations

### View Pending Actions

```bash
python view_notifications.py --pending
```

### View All Notes

```bash
python view_notifications.py --notes
```

### Clear Everything

```bash
python view_notifications.py --clear
```

## Files

```
twilio/
├── sms_assistant.py          # Parses SMS and takes actions
├── webhook_server.py         # Receives webhooks from Twilio
├── view_notifications.py     # View actions taken
├── conversations.py          # Manage SMS conversations
├── conversations.json        # Conversation history
├── pending_actions.json      # Actions awaiting confirmation
├── eric_notifications.log    # Notifications for you
└── magda_notes.txt          # Notes/messages from Magda
```

## Supported Commands

### Calendar

- "Add to calendar: [event] on [date] at [time]"
- "Schedule [event] for [date]"
- "Put on calendar: [event] [date] [time]"
- "Remind Eric about [event] on [date]"

**Date formats:** today, tomorrow, Monday-Sunday, next week
**Time formats:** 3pm, 3:00 PM, 15:00

### Tasks

- "Add task: [task description]"
- "Tell Eric to [action]"
- "Remind Eric to [action]"
- "Todo: [task]"

### Notes

- "Tell Eric [message]"
- "Let Eric know [message]"
- "Message Eric: [message]"

## Safety Features

✅ **Authorized Senders Only** — Only Magda's number is allowed  
✅ **Confirmation Mode** — Calendar/tasks saved for your confirmation if automation fails  
✅ **Audit Trail** — Everything logged for you to review  
✅ **Reply Confirmations** — Magda knows if something worked or needs your OK

## Customization

### Add More Family Members

Edit `sms_assistant.py`:

```python
ALLOWED_SENDERS = [
    "+19153097085",  # Magda
    "+19155551234",  # Your mom
    "+19155555678",  # Your dad
]
```

### Auto-Confirm vs Manual Mode

```python
# In sms_assistant.py

# This mode asks you before executing:
DELEGATION_MODE = "confirm"

# This mode just does it:
DELEGATION_MODE = "auto"
```

### Custom Actions

Add new command types in `sms_assistant.py`:

```python
# In parse() method
if "check weather" in self.message:
    return {"type": "weather", "location": "El Paso"}

# In ActionExecutor.execute()
if cmd_type == "weather":
    return self.check_weather(cmd, sender)
```

## Troubleshooting

### "Sorry, I'm not authorized..."

- Check `ALLOWED_SENDERS` has the right number
- Make sure number format is `+1XXXXXXXXXX`

### Actions not working

- Check `pending_actions.json` — they may be saved for confirmation
- Run `view_notifications.py` to see what happened
- Check webhook server console for errors

### Calendar not adding events

- Make sure `gog` CLI is installed and configured
- May need to save to pending instead

### Tasks not creating

- Make sure `things` CLI is available
- Falls back to pending if Things isn't working

### Webhook not receiving messages

- Ensure ngrok/tailscale is running
- Check Twilio webhook URL is correct
- Verify the server is running on the right port

## Future Ideas

- [ ] Real-time Telegram notifications (instead of log file)
- [ ] Voice call confirmations ("Eric, Magda wants to add X to your calendar, approve?")
- [ ] Smart home integration ("Turn off the lights", "Set thermostat to 72")
- [ ] Shopping list ("Add milk to the shopping list")
- [ ] Location sharing ("Where is Eric?" → checks Find My/calendar)

## Security

- Only whitelisted numbers can trigger actions
- All actions logged for review
- Sensitive credentials in environment variables
- No hardcoded secrets in code

---

**Status:** Ready for Magda! 🎉
