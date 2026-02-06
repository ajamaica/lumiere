---
name: phone-call
description: Make autonomous phone calls with AI voice using Twilio, Deepgram, and ElevenLabs
version: 1.2.0
triggers:
  - call
  - phone
  - dial
  - make a call
  - book by phone
  - call the hotel
  - call the restaurant
---

# Phone Call Skill

Make autonomous phone calls with a goal-driven AI agent. The AI handles the conversation until the goal is achieved.

## Prerequisites

1. **Required configuration:**

   ```bash
   concierge config set twilioAccountSid <your-sid>
   concierge config set twilioAuthToken <your-token>
   concierge config set twilioPhoneNumber <your-number>
   concierge config set deepgramApiKey <your-key>
   concierge config set elevenLabsApiKey <your-key>
   concierge config set elevenLabsVoiceId <voice-id>
   concierge config set anthropicApiKey <your-key>
   ```

2. **Optional for auto-managed ngrok:**
   ```bash
   concierge config set ngrokAuthToken <your-ngrok-token>
   ```

## Usage

### Basic call

```bash
concierge call "+1-555-123-4567" \
  --goal "Book a hotel room for February 15" \
  --name "John Smith" \
  --email "john@example.com" \
  --customer-phone "+1-555-444-1212" \
  --context "2 nights, king bed preferred"
```

### Interactive mode

```bash
concierge call "+1-555-123-4567" \
  --goal "Make a reservation" \
  --name "John Smith" \
  --email "john@example.com" \
  --customer-phone "+1-555-444-1212" \
  --interactive
```

In interactive mode, you type what the AI should say in real-time.

### Infrastructure behavior

- By default, `call` auto-starts `ngrok` and `server` if server is unavailable.
- Use `--no-auto-infra` to disable this and run everything manually.
- Auto-managed processes are stopped automatically when the call ends.
- Log files are written to:
  - `~/.config/concierge/call-runs/<run-id>/server.log`
  - `~/.config/concierge/call-runs/<run-id>/ngrok.log`

### Server management

```bash
# Check server status
concierge server status

# Start server
concierge server start --public-url <ngrok-url>

# Stop server
concierge server stop
```

## Preflight checks

Before dialing, the system validates:

- Local runtime dependencies (`ffmpeg` binary + MP3 decode support, plus `ngrok` if auto-infra is used)
- Twilio credentials/account status/from-number availability
- Deepgram API key/auth reachability
- ElevenLabs character quota sufficiency (estimated call budget)

## How It Works

1. CLI sends a call request with goal + customer identity details
2. The server places the call via Twilio
3. Audio streams bidirectionally via WebSocket
4. Deepgram transcribes human speech in real-time
5. Claude generates appropriate responses
6. ElevenLabs synthesizes speech for responses
7. Call continues until goal is achieved or human hangs up

## Examples

### Book a hotel reservation

```bash
concierge call "+1-800-HILTON" \
  --goal "Book a room for 2 nights" \
  --name "Sarah Johnson" \
  --email "sarah@example.com" \
  --customer-phone "+1-555-000-2222" \
  --context "Check-in: March 10, Guest: Sarah Johnson, King bed, non-smoking"
```

### Make a restaurant reservation

```bash
concierge call "+1-555-DINER" \
  --goal "Reserve a table for dinner" \
  --name "Garcia" \
  --email "garcia@example.com" \
  --customer-phone "+1-555-000-3333" \
  --context "Party of 4, 7:30 PM, Saturday, name: Garcia"
```

### Cancel an appointment

```bash
concierge call "+1-555-DOCTOR" \
  --goal "Cancel appointment" \
  --name "Mike Chen" \
  --email "mike@example.com" \
  --customer-phone "+1-555-000-4444" \
  --context "Patient: Mike Chen, Appointment on Tuesday at 2 PM"
```

## Supported Voice IDs

Some popular ElevenLabs voices:

- `EXAVITQu4vr4xnSDxMaL` - Rachel (default, conversational female)
- `pNInz6obpgDQGcFmaJgB` - Adam (conversational male)
- `21m00Tcm4TlvDq8ikWAM` - Rachel (narration)
- `AZnzlk1XvdvUeBnXmlld` - Domi (young female)

Set your preferred voice:

```bash
concierge config set elevenLabsVoiceId <voice-id>
```

## Latency

Target voice-to-voice latency: < 500ms

- Deepgram STT: ~150ms
- Response generation: ~100-200ms
- ElevenLabs TTS: ~75ms
- Network: ~50ms

## Troubleshooting

### Server won't start

- Check all config keys are set: `concierge config show`
- If using manual mode, ensure ngrok is running and URL is correct
- Check port 3000 is available

### Call not connecting

- Verify Twilio phone number is active
- Check Twilio account has sufficient balance
- Ensure ngrok URL is publicly accessible (manual mode)

### TTS fails mid-call

- Check ElevenLabs quota/credits.
- New preflight usually catches this before dialing.
- If it still happens, reduce prompt/context length or top up ElevenLabs.

### Audio quality issues

- ElevenLabs uses optimized phone call settings
- Deepgram uses the phone call model
- Audio is at 8kHz (telephone quality)
