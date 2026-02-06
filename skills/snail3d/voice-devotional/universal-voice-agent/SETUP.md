# Universal Voice Agent - Setup Guide

## Environment Variables

Create a `.env` file in the `universal-voice-agent` directory with your API keys:

```bash
# Twilio (already have these)
TWILIO_ACCOUNT_SID=AC35fce9f5069e4a19358da26286380ca9
TWILIO_AUTH_TOKEN=a7700999dcff89b738f62c78bd1e33c1
TWILIO_PHONE=+19152237302

# Groq Whisper (speech-to-text)
GROQ_API_KEY=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

# ElevenLabs (text-to-speech in your voice)
ELEVENLABS_API_KEY=sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a
ELEVENLABS_VOICE_ID=YOUR_VOICE_ID  # Get this from ElevenLabs dashboard

# Anthropic/Claude (for Haiku reasoning)
ANTHROPIC_API_KEY=YOUR_API_KEY_HERE
# OR use OpenRouter (if you have that):
# OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY

# Optional: SMS notification number
NOTIFY_TO=+19157308926
```

## Steps to Run

### 1. Install Dependencies

```bash
cd /Users/ericwoodard/clawd/universal-voice-agent
npm install
```

### 2. Get Your ElevenLabs Voice ID

Go to https://elevenlabs.io → Voices → Click on your voice → Copy the Voice ID

Add it to `.env`:

```
ELEVENLABS_VOICE_ID=your_voice_id_here
```

### 3. Get Anthropic API Key

If using native Anthropic API:

- Go to https://console.anthropic.com
- Create API key
- Add to `.env`

If using OpenRouter (recommended, no new signup needed):

- You likely have OpenRouter API key from Clawdbot config
- It works transparently with Anthropic models

### 4. Start the WebSocket Server

```bash
# Load environment variables and start
node scripts/websocket-server.js
```

You should see:

```
🚀 WebSocket server running on port 5000
📍 Webhook URL: http://localhost:5000/call-webhook
🔌 WebSocket URL: wss://localhost:5000/media-stream
```

### 5. Expose with ngrok

In another terminal:

```bash
ngrok http 5000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

### 6. Update Twilio Webhook

Go to Twilio Console:

1. Phone Numbers → Manage → Your Number
2. Voice & Fax section → Webhook
3. Set URL to: `https://abc123.ngrok.io/call-webhook`
4. Method: POST

### 7. Make a Test Call

```bash
curl -X POST http://localhost:5000/make-call \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1-555-123-4567",
    "goal": "Order 2 large pepperoni pizzas for pickup at 6pm"
  }'
```

## What Happens During a Call

1. **Twilio dials** the phone number
2. **TwiML response** tells Twilio to connect to your WebSocket
3. **WebSocket opens** - audio streams from the call come to your server
4. **Real-time loop:**
   - 🔊 **Transcribe** (Groq Whisper) - What did they say?
   - 🤖 **Think** (Haiku) - What should I say next?
   - 🎤 **Speak** (ElevenLabs) - Say it in your voice
   - Repeat until goal achieved or timeout
5. **SMS summary** sent to `NOTIFY_TO` number

## Troubleshooting

### WebSocket won't connect

- Check ngrok is running and the webhook URL matches exactly
- Verify Twilio webhook is set to POST
- Check server logs for errors

### No audio from Groq

- Verify `GROQ_API_KEY` is correct and has quota
- Check audio codec (Twilio sends μ-law PCM 8kHz)
- Monitor server logs for Groq API errors

### Haiku not responding

- Check `ANTHROPIC_API_KEY` is set and valid
- Verify model name is correct: `claude-3-5-haiku-20241022`
- Check Claude API console for rate limits

### ElevenLabs audio not playing

- Verify `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` are set
- Check audio codec format is compatible with Twilio
- Verify voice ID is a valid ElevenLabs voice

### Call ends abruptly

- May be timeout (20 min max) or silence timeout (5 min)
- Check logs for error messages
- Verify WebSocket connection is stable

## Architecture Overview

```
You: "Call and order pizza"
        ↓
[Twilio Dials Number]
        ↓
[TwiML Webhook Responds]
        ↓
[WebSocket Connected]
        ↓
[Real-time Loop]
├─ Groq Whisper: Transcribe incoming audio
├─ Haiku: Generate response based on goal
├─ ElevenLabs: Convert to speech in your voice
└─ Send back to Twilio
        ↓
[Call Ends]
        ↓
[SMS Summary Sent]
```

## Next Steps

1. **Test with mock calls** first (no real phone numbers)
2. **Monitor latency** - target <2 seconds per turn
3. **Adjust Haiku prompts** for better responses
4. **Set up logging** for debugging
5. **Deploy to production** when confident

## Production Deployment

To deploy beyond ngrok:

1. **Cloud hosting** (AWS, Google Cloud, Heroku)
2. **Get permanent HTTPS domain**
3. **Update Twilio webhook** to production URL
4. **Set up monitoring** and alerting
5. **Enable request logging** for debugging

See `references/WEBSOCKET_SETUP.md` for more details.
