# ElevenLabs – Links and reference

## Key URLs

| Resource | URL |
|----------|-----|
| Sign up / get started (affiliate) | https://try.elevenlabs.io/ipu2xmg9cwqu |
| Main app / dashboard | https://elevenlabs.io |
| API keys (settings) | https://elevenlabs.io/app/settings/api-keys |
| API documentation | https://elevenlabs.io/docs |
| API reference | https://elevenlabs.io/docs/api-reference |

All links use HTTPS.

## What you get with an account

- **Creative Platform:** Text-to-speech, voice cloning, music, SFX, image/video. Use in the browser or via API.
- **Agents Platform:** Conversational voice and chat agents (phone, chat, email, WhatsApp). Configure and deploy in the app.
- **API:** TTS, speech-to-text, music, and more. Authenticate with an API key in the `xi-api-key` header.

## Gotchas

- Store the API key in environment variables or a secrets manager; never commit it to code or config in version control.
- Use API keys only server-side; do not expose them in client-side or mobile code.
- Free tier has usage limits; check [Pricing](https://elevenlabs.io/pricing) on the site for current plans.
