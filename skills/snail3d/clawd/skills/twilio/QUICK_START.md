# Twilio Skill - Quick Start Guide

## 5-Minute Setup

### 1. Install & Configure

```bash
# Navigate to the skill
cd ~/clawd/skills/twilio

# Run setup script
bash setup.sh
```

### 2. Set Your Credentials

Edit the `.env` file that was created:

```bash
vim .env
```

Add your credentials:

```
TWILIO_ACCOUNT_SID=AC35fce9f5069e4a19358da26286380ca9
TWILIO_AUTH_TOKEN=a7700999dcff89b738f62c78bd1e33c1
TWILIO_PHONE_NUMBER=+19152237302
ELEVENLABS_API_KEY=sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a
```

### 3. Load Environment

```bash
set -a; source .env; set +a
```

Or add to your shell profile (~/.bashrc, ~/.zshrc):

```bash
source ~/clawd/skills/twilio/.env
```

### 4. Make Your First Call

```bash
python ~/clawd/skills/twilio/call.py \
  --phone "+19152134309" \
  --message "Hello from Twilio!"
```

### 5. Send Your First SMS

```bash
python ~/clawd/skills/twilio/sms.py \
  --phone "+19152134309" \
  --message "Hello from Twilio!"
```

## Usage Examples

### Make a Call with Logging

```bash
python call.py \
  --phone "+19152134309" \
  --message "Your appointment is confirmed" \
  --json | jq '.call_sid'
```

### Send SMS with Multiple Lines

```bash
python sms.py \
  --phone "+19152134309" \
  --message "Hi! This is a multi-line message.
Your order #12345 has shipped.
Tracking: https://example.com/track"
```

### From Python Scripts

```python
import subprocess
import json
import os

# Set environment
os.environ['TWILIO_ACCOUNT_SID'] = 'your_sid'
os.environ['TWILIO_AUTH_TOKEN'] = 'your_token'
os.environ['TWILIO_PHONE_NUMBER'] = '+19152237302'

# Make call
result = subprocess.run([
    'python', '~/clawd/skills/twilio/call.py',
    '--phone', '+19152134309',
    '--message', 'Automated call message',
    '--json'
], capture_output=True, text=True)

data = json.loads(result.stdout)
print(f"Call SID: {data['call_sid']}")
```

## Troubleshooting

### "Module not found"

```bash
cd ~/clawd/skills/twilio
pip install -r requirements.txt
```

### "Authentication failed"

```bash
# Verify credentials are set
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN

# Re-source .env if needed
set -a; source .env; set +a
```

### "Invalid phone number"

- Must be in E.164 format: `+countrycode_number`
- Example: `+19152134309` (country=1, area=915, number=2134309)

### "Call not going through"

1. Check that recipient phone number is correct
2. Verify Twilio account has outbound calling enabled
3. Check Twilio Console for detailed error logs
4. Try with a different recipient number

## Environment Variables

The skill uses these environment variables:

| Variable              | Required | Example                            |
| --------------------- | -------- | ---------------------------------- |
| `TWILIO_ACCOUNT_SID`  | Yes      | AC35fce9f5069e4a19358da26286380ca9 |
| `TWILIO_AUTH_TOKEN`   | Yes      | a7700999dcff89b738f62c78bd1e33c1   |
| `TWILIO_PHONE_NUMBER` | Yes      | +19152237302                       |
| `ELEVENLABS_API_KEY`  | Optional | sk_98316c...                       |

## Next Steps

- Read [SKILL.md](SKILL.md) for detailed documentation
- Check [README.md](README.md) for advanced usage
- See call.py and sms.py source code for extending functionality
- Review Twilio docs: https://www.twilio.com/docs

## Support

- **Twilio Docs**: https://www.twilio.com/docs
- **Twilio Console**: https://www.twilio.com/console
- **ElevenLabs**: https://elevenlabs.io/docs

## Tips

💡 **Cost Savings:**

- Calls cost $0.013-0.025 per minute
- SMS costs $0.0075 per message
- Test with short messages during development
- Monitor usage in Twilio Console

💡 **Best Practices:**

- Always use E.164 phone number format
- Store credentials in `.env` (never in code)
- Test with your own number first
- Review Twilio logs for troubleshooting

💡 **Automation:**

- Create shell aliases for common calls
- Integrate with cron for scheduled messages
- Use with Clawdbot for chat-based calling
- Build workflows with multiple contacts

---

**Version**: 1.0  
**Last Updated**: Feb 3, 2025  
**Status**: Production Ready ✅
