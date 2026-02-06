# Travel Concierge

Find accommodation contact details and place AI-powered booking calls.

## Installation

```bash
skill install @skillhq/concierge
```

## Features

- **Contact Extraction**: Find phone, email, WhatsApp, and social media contacts from Airbnb, Booking.com, VRBO, and Expedia listings
- **AI Phone Calls**: Place autonomous phone calls with a goal-driven AI agent that handles the conversation until the goal is achieved

## System Dependencies (AI Calls)

AI calls require local binaries in addition to API keys:

- `ffmpeg` (must include MP3 decode support)
- `ngrok` (used when `call` auto-starts infrastructure)

Install examples:

```bash
# macOS
brew install ffmpeg ngrok

# Ubuntu/Debian (including ARM VPS)
sudo apt-get update
sudo apt-get install -y ffmpeg
# install ngrok from ngrok docs, then verify `ngrok version`
```

Verify locally:

```bash
ffmpeg -version
ffmpeg -decoders | rg -i mp3
ngrok version
```

The call preflight now fails fast with a clear error if these dependencies are missing or if ffmpeg cannot decode MP3.

## Quick Start

### Find contacts for a listing

```bash
concierge find-contact "https://www.airbnb.com/rooms/12345"
```

### Place an AI booking call

```bash
concierge call "+1-555-123-4567" \
  --goal "Book a room for March 12-14" \
  --name "John Smith" \
  --email "john@example.com" \
  --customer-phone "+1-555-000-1111"
```

## Configuration

Configuration is stored in `~/.config/concierge/config.json5`.

### For contact lookup (optional)

```bash
concierge config set googlePlacesApiKey "your-key"
```

### For AI phone calls (required)

```bash
concierge config set twilioAccountSid "<sid>"
concierge config set twilioAuthToken "<token>"
concierge config set twilioPhoneNumber "+14155551234"
concierge config set deepgramApiKey "<key>"
concierge config set elevenLabsApiKey "<key>"
concierge config set elevenLabsVoiceId "EXAVITQu4vr4xnSDxMaL"
concierge config set anthropicApiKey "<key>"
```

## Documentation

See [SKILL.md](./SKILL.md) and [CALL-SETUP.md](./CALL-SETUP.md) for full setup and troubleshooting.

## License

MIT
