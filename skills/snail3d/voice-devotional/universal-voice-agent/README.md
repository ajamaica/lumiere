# Universal Voice Agent

Goal-oriented calling system using real-time voice streaming, AI reasoning, and natural language processing.

## Quick Start

### 1. Start the WebSocket Server

```bash
cd /Users/ericwoodard/clawd/universal-voice-agent
node scripts/websocket-server.js
```

### 2. Expose to Internet (ngrok)

In another terminal:

```bash
ngrok http 5000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

### 3. Update Twilio

Go to: Twilio Console → Phone Numbers → Your Number → Voice Configuration

Set **Webhook URL** to: `https://abc123.ngrok.io/call-webhook`

### 4. Make a Call

```bash
curl -X POST http://localhost:5000/make-call \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1-555-123-4567",
    "goal": "Order 2 large pepperoni pizzas for pickup at 6pm"
  }'
```

## How It Works

1. **You call**: `"Goal: Order pizza"`
2. **Twilio dials** the restaurant
3. **WebSocket connects** your server to the call
4. **Real-time loop**:
   - 🔊 Listen (Groq Whisper transcribes their response)
   - 🤖 Think (Haiku reasons about what to say next)
   - 🎤 Speak (ElevenLabs generates audio in your voice)
5. **Repeats** until goal achieved or timeout
6. **SMS summary** sent to you with results

## Files

- `SKILL.md` - Full skill documentation
- `scripts/websocket-server.js` - Main WebSocket server (handles real-time audio)
- `scripts/agent.js` - Older agent (simulator, for reference)
- `references/WEBSOCKET_SETUP.md` - Detailed setup guide
- `references/ARCHITECTURE.md` - System architecture

## Features

✅ Real-time voice streaming (WebSocket)
✅ Automatic speech-to-text (Groq Whisper)
✅ AI reasoning (Claude Haiku)
✅ Natural speech generation (ElevenLabs in your voice)
✅ Silence detection & intelligent timeout handling
✅ Goal-oriented conversation (not scripted)
✅ SMS summary after calls
✅ Works for: ordering, customer service, reservations, encouragement, etc.

## Configuration

All credentials in environment or code:

- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE` - Your Twilio phone number
- `GROQ_API_KEY` - Groq API key for Whisper transcription
- `ELEVENLABS_API_KEY` - ElevenLabs API key for TTS

## Next Steps

1. **Integrate Groq Whisper** in `processAudio()` to transcribe incoming audio
2. **Integrate Haiku** to generate responses based on goal + history
3. **Integrate ElevenLabs** to convert responses to audio
4. **Test** with real calls

See `references/WEBSOCKET_SETUP.md` for detailed implementation guide.

## Troubleshooting

**WebSocket won't connect?**

- Check ngrok is running and webhook URL matches

**No audio coming through?**

- Check Groq API key is valid
- Verify audio payload in WebSocket messages

**Audio not playing back?**

- Check ElevenLabs integration
- Verify audio codec matches Twilio's format

See `references/WEBSOCKET_SETUP.md` for more troubleshooting.
