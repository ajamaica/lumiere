# Twilio Skill - Voice Calls & SMS

A simple, secure Twilio integration skill for making voice calls and sending SMS messages. Uses environment variables for credentials and includes built-in TTS support.

## Files

- **SKILL.md** - Complete usage documentation
- **call.py** - Make outbound voice calls
- **sms.py** - Send SMS messages
- **requirements.txt** - Python dependencies
- **.env.example** - Sample environment configuration

## Quick Start

### 1. Install Dependencies

```bash
cd ~/clawd/skills/twilio
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
export TWILIO_ACCOUNT_SID="AC35fce9f5069e4a19358da26286380ca9"
export TWILIO_AUTH_TOKEN="a7700999dcff89b738f62c78bd1e33c1"
export TWILIO_PHONE_NUMBER="+19152237302"
export ELEVENLABS_API_KEY="sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a"
```

Or create a `.env` file and load it:

```bash
# Copy the example
cp .env.example .env

# Edit .env with your credentials
vim .env

# Load it (add to your shell profile for persistence)
set -a; source .env; set +a
```

### 3. Make a Call

```bash
python call.py --phone "+19152134309" --message "Hello, this is a test call"
```

### 4. Send an SMS

```bash
python sms.py --phone "+19152134309" --message "Hello from Twilio!"
```

## Architecture

```
User Request
    ↓
call.py / sms.py (CLI argument parsing)
    ↓
Credential Validation (from environment)
    ↓
Twilio Client Initialization
    ↓
API Request (calls or messages)
    ↓
Response JSON
```

## Security Notes

✅ **Good Practices Implemented:**

- No hardcoded credentials in code
- All sensitive data from environment variables
- Clear error messages without exposing secrets
- E.164 phone number validation

⚠️ **Additional Safety Tips:**

- Never commit `.env` files with real credentials
- Use strong auth tokens
- Rotate credentials periodically
- Review Twilio logs regularly for unauthorized usage
- Set up Twilio account alerts for usage thresholds

## Extending the Skill

### Adding ElevenLabs TTS Audio Hosting

To use ElevenLabs TTS instead of Twilio's built-in TTS:

1. Generate audio with ElevenLabs API
2. Host audio on a public URL (e.g., AWS S3, Cloudinary)
3. Use Twilio's `<Play>` TwiML to stream the hosted audio

### Adding Voicemail Transcription

```python
from twilio.rest import Client

# Retrieve voicemail transcription
call = client.calls(call_sid).fetch()
if call.transcription_sid:
    transcription = client.transcriptions(call.transcription_sid).fetch()
    print(transcription.transcription_text)
```

### Webhook Integration

Add callback handling for call/SMS status:

```python
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)

@app.route("/sms", methods=['POST'])
def sms_reply():
    msg = MessagingResponse()
    msg.message("Thanks for the message!")
    return str(msg)

if __name__ == "__main__":
    app.run(port=5000)
```

## Troubleshooting

### ImportError: No module named 'twilio'

```bash
pip install -r requirements.txt
```

### "Authentication failed"

Verify credentials are set:

```bash
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER
```

### "Call failed"

1. Check phone number format: `+19152134309` (E.164)
2. Verify account has outbound calling enabled
3. Check Twilio console for error details
4. Ensure recipient number can receive calls

### Long messages split?

SMS automatically segments at 160 characters. Longer messages cost more (multiple segments = multiple charges).

## Cost Estimation

- **Outbound calls:** $0.013 - $0.025 per minute (varies by destination)
- **SMS:** $0.0075 per message (SMS segments count as separate messages)
- **ElevenLabs TTS:** $0.15 per 1M characters

Check Twilio's pricing page for current rates: https://www.twilio.com/pricing

## Related Skills

- **Universal Voice Agent** - Goal-oriented calling with real-time voice
- **Jami Skill** - Peer-to-peer voice communication
- **Sentry Mode** - Webcam surveillance with alerts

## License

MIT (or your preference)
