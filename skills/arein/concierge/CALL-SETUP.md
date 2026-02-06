# Voice Call Setup Guide

This guide walks you through setting up the voice call system for concierge.

## Overview

The voice call system uses:

- **Twilio** - Phone number and call routing
- **Deepgram** - Real-time speech-to-text
- **ElevenLabs** - Text-to-speech with natural voices
- **Anthropic Claude** - AI conversation intelligence
- **ngrok** - Local tunnel for Twilio webhooks

## Step 1: Create Accounts

### Twilio (Phone Calls)

1. **Sign up** at https://www.twilio.com/try-twilio
   - Free trial includes $15.50 credit (enough for ~10 hours of calls)
   - You'll need to verify your email and phone number

2. **Get your credentials** from the Console Dashboard (https://console.twilio.com):
   - **Account SID** - Visible on the dashboard, starts with `AC`
   - **Auth Token** - Click "Show" to reveal, starts with a lowercase letter

3. **Buy a phone number** (this is your outbound caller ID):
   - Go to: Console → Phone Numbers → Manage → Buy a number
   - Or direct link: https://console.twilio.com/us1/develop/phone-numbers/manage/search
   - Click "Buy a number" (blue button)
   - Search options:
     - Country: Select your country (US numbers work best)
     - Capabilities: Check "Voice" (required), SMS optional
     - Number type: "Local" is cheapest (~$1.15/month)
   - Click "Search" to see available numbers
   - Pick any number and click "Buy" → "Buy +1XXX..."
   - Cost: ~$1.15/month (deducted from your trial credit)

4. **Verify the number is ready**:
   - Go to: Console → Phone Numbers → Manage → Active numbers
   - You should see your new number listed
   - Copy the full number in E.164 format (e.g., `+14155551234`)

### Deepgram (Speech-to-Text)

1. Sign up at https://console.deepgram.com/signup
   - Free tier includes $200 credit
2. Create an API key:
   - API Keys → Create a New API Key
   - Copy the key (only shown once!)

### ElevenLabs (Text-to-Speech)

1. Sign up at https://elevenlabs.io/sign-up
   - Free tier: 10,000 characters/month
2. Get your API key:
   - Profile Settings → API Keys → Create API Key
3. Choose a voice:
   - Voice Library → Pick a voice
   - Copy the Voice ID from the URL or voice details
   - Recommended: "Rachel" (`EXAVITQu4vr4xnSDxMaL`) or "Adam" (`pNInz6obpgDQGcFmaJgB`)

### Anthropic (AI Conversation)

1. Sign up at https://console.anthropic.com
2. Get your API key:
   - Go to API Keys section
   - Create a new key and copy it

### ngrok (Local Tunnel)

1. Sign up at https://ngrok.com
   - Free tier works fine
2. Install ngrok:

   ```bash
   # macOS
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

3. Authenticate:
   ```bash
   ngrok config add-authtoken <your-token>
   ```

## Step 2: Configure concierge

Set all required configuration values:

```bash
# Twilio credentials (from https://console.twilio.com)
concierge config set twilioAccountSid ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
concierge config set twilioAuthToken xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Use the full E.164 format with country code, e.g., +14155551234
concierge config set twilioPhoneNumber +14155551234

# Deepgram
concierge config set deepgramApiKey xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ElevenLabs
concierge config set elevenLabsApiKey xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
concierge config set elevenLabsVoiceId EXAVITQu4vr4xnSDxMaL

# Anthropic (for AI conversation)
concierge config set anthropicApiKey sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: custom port (default: 3000)
concierge config set callServerPort 3000
```

Verify your configuration:

```bash
concierge config show
```

## Step 3: Start the Server

1. **Start ngrok** (keep this running):

   ```bash
   ngrok http 3000
   ```

   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

2. **Start the call server**:

   ```bash
   concierge server start --public-url https://abc123.ngrok.io
   ```

3. **Verify it's running**:
   ```bash
   concierge server status
   ```

## Step 4: Test a Call

Call your own phone to test:

```bash
concierge call "+1-YOUR-PHONE-NUMBER" \
  --goal "Test the connection" \
  --context "This is a test call"
```

You should:

1. Receive a call from your Twilio number
2. Hear the AI voice when you answer
3. See transcriptions in your terminal

## Usage Examples

### Book a hotel room

```bash
concierge call "+1-800-HILTON" \
  --goal "Book a room for 2 nights" \
  --context "Check-in: Feb 15, Guest: John Smith, King bed, non-smoking"
```

### Make a restaurant reservation

```bash
concierge call "+1-555-RESTAURANT" \
  --goal "Make a dinner reservation" \
  --context "Party of 4, 7:30 PM Saturday, name: Garcia"
```

### Interactive mode

For real-time control over what the AI says:

```bash
concierge call "+1-555-1234" \
  --goal "Custom conversation" \
  --interactive
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  concierge call                                           │
│  "Call the hotel at +1-555-1234 and book a room for Feb 15"     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Call Server (Node.js)                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Call Session                                                ││
│  │  ├── Deepgram STT: human speech → text                      ││
│  │  ├── ConversationAI: text → Claude → AI response            ││
│  │  └── ElevenLabs TTS: AI response → speech                   ││
│  └─────────────────────────────────────────────────────────────┘│
│  - POST /call - Initiate calls                                   │
│  - WS /control - Command channel                                 │
│  - WS /media-stream - Twilio audio stream                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ngrok tunnel
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Twilio Media Streams                                            │
│  - Real-time bidirectional audio                                 │
│  - 8kHz mulaw format                                             │
└─────────────────────────────────────────────────────────────────┘
```

The call flow:

1. Human speaks → Twilio captures audio → Deepgram transcribes
2. Transcript sent to Claude with the call's goal
3. Claude generates contextual response
4. ElevenLabs converts response to speech
5. Audio sent back through Twilio to the caller

## Troubleshooting

### "Server is not running"

Start the server first:

```bash
concierge server start --public-url <your-ngrok-url>
```

### "Missing required configuration"

Check which keys are missing:

```bash
concierge config show
```

### Call doesn't connect

1. Check Twilio console for errors
2. Verify ngrok is running and URL is correct
3. Check Twilio account balance

### Poor audio quality

- This is expected - phone audio is 8kHz
- The system uses models optimized for telephony

### High latency

Target is <500ms voice-to-voice. If higher:

1. Check internet connection
2. Try a different ElevenLabs voice
3. Ensure server is running locally, not remotely

## Costs

Approximate costs per call (varies by region and duration):

| Service              | Cost                |
| -------------------- | ------------------- |
| Twilio outbound call | ~$0.02/min          |
| Twilio phone number  | ~$1.15/month        |
| Deepgram             | ~$0.0043/min        |
| ElevenLabs           | ~$0.18/1000 chars   |
| Anthropic Claude     | ~$0.003/1000 tokens |

A typical 5-minute call costs approximately $0.30-0.50.

## Security Notes

- API keys are stored in `~/.config/concierge/config.json5`
- Keys are masked when displayed with `config show`
- The server runs locally - don't expose it directly to the internet
- Use ngrok only for development; consider proper hosting for production
