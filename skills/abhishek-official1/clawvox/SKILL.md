---
name: clawvox
description: ClawVox - ElevenLabs voice studio for OpenClaw. Generate speech, transcribe audio, clone voices, create sound effects, and more.
homepage: https://elevenlabs.io/developers
metadata:
  {
    'openclaw':
      {
        'emoji': '🎙️',
        'skillKey': 'clawvox',
        'requires': { 'bins': ['curl', 'jq'], 'env': ['ELEVENLABS_API_KEY'] },
        'primaryEnv': 'ELEVENLABS_API_KEY',
      },
  }
---

# ClawVox

Transform your OpenClaw assistant into a professional voice production studio with ClawVox - powered by ElevenLabs.

## Quick Reference

| Action     | Command                                                | Description             |
| ---------- | ------------------------------------------------------ | ----------------------- |
| Speak      | `{baseDir}/scripts/speak.sh 'text'`                    | Convert text to speech  |
| Transcribe | `{baseDir}/scripts/transcribe.sh audio.mp3`            | Speech to text          |
| Clone      | `{baseDir}/scripts/clone.sh --name "Voice" sample.mp3` | Clone a voice           |
| SFX        | `{baseDir}/scripts/sfx.sh "thunder storm"`             | Generate sound effects  |
| Voices     | `{baseDir}/scripts/voices.sh list`                     | List available voices   |
| Dub        | `{baseDir}/scripts/dub.sh --target es audio.mp3`       | Translate audio         |
| Isolate    | `{baseDir}/scripts/isolate.sh audio.mp3`               | Remove background noise |

## Setup

1. Get your API key from [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
2. Configure in `~/.openclaw/openclaw.json`:

```json5
{
  skills: {
    entries: {
      clawvox: {
        apiKey: 'YOUR_ELEVENLABS_API_KEY',
        config: {
          defaultVoice: 'Rachel',
          defaultModel: 'eleven_turbo_v2_5',
          outputDir: '~/.openclaw/audio',
        },
      },
    },
  },
}
```

Or set the environment variable:

```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

## Voice Generation (TTS)

### Basic Text-to-Speech

```bash
# Quick speak with default voice (Rachel)
{baseDir}/scripts/speak.sh 'Hello, I am your personal AI assistant.'

# Specify voice by name
{baseDir}/scripts/speak.sh --voice Adam 'Hello from Adam'

# Save to file
{baseDir}/scripts/speak.sh --out ~/audio/greeting.mp3 'Welcome to the show'

# Use specific model
{baseDir}/scripts/speak.sh --model eleven_multilingual_v2 'Bonjour'

# Adjust voice settings
{baseDir}/scripts/speak.sh --stability 0.5 --similarity 0.8 'Expressive speech'

# Adjust speed
{baseDir}/scripts/speak.sh --speed 1.2 'Faster speech'

# Use multilingual model for other languages
{baseDir}/scripts/speak.sh --model eleven_multilingual_v2 --voice Rachel 'Hola, que tal'
{baseDir}/scripts/speak.sh --model eleven_multilingual_v2 --voice Adam 'Guten Tag'
```

### Voice Models

| Model                    | Latency | Languages | Best For                   |
| ------------------------ | ------- | --------- | -------------------------- |
| `eleven_flash_v2_5`      | ~75ms   | 32        | Real-time, streaming       |
| `eleven_turbo_v2_5`      | ~250ms  | 32        | Balanced quality/speed     |
| `eleven_multilingual_v2` | ~500ms  | 29        | Long-form, highest quality |

### Available Voices

Premade voices: Rachel, Adam, Antoni, Bella, Domi, Elli, Josh, Sam, Callum, Charlie, George, Liam, Matilda, Alice, Bill, Brian, Chris, Daniel, Eric, Jessica, Laura, Lily, River, Roger, Sarah, Will

### Long-Form Content

```bash
# Generate audio from text file
{baseDir}/scripts/speak.sh --input chapter.txt --voice "George" --out audiobook.mp3
```

## Speech-to-Text (Transcription)

### Basic Transcription

```bash
# Transcribe audio file
{baseDir}/scripts/transcribe.sh recording.mp3

# Save to file
{baseDir}/scripts/transcribe.sh --out transcript.txt audio.mp3

# Transcribe with language hint
{baseDir}/scripts/transcribe.sh --language es spanish_audio.mp3

# Include timestamps
{baseDir}/scripts/transcribe.sh --timestamps podcast.mp3
```

### Supported Formats

- MP3, MP4, MPEG, MPGA, M4A, WAV, WebM
- Maximum file size: 100MB

## Voice Cloning

### Instant Voice Clone

```bash
# Clone from single sample (minimum 30 seconds recommended)
{baseDir}/scripts/clone.sh --name MyVoice recording.mp3

# Clone with description
{baseDir}/scripts/clone.sh --name BusinessVoice \
  --description 'Professional male voice' \
  sample.mp3

# Clone with labels
{baseDir}/scripts/clone.sh --name MyVoice \
  --labels '{"gender":"male","age":"adult"}' \
  sample.mp3

# Remove background noise during cloning
{baseDir}/scripts/clone.sh --name CleanVoice \
  --remove-bg-noise \
  sample.mp3

# Test cloned voice
{baseDir}/scripts/speak.sh --voice MyVoice 'Testing my cloned voice'
```

## Voice Library Management

```bash
# List all available voices
{baseDir}/scripts/voices.sh list

# Get voice details
{baseDir}/scripts/voices.sh info --name Rachel
{baseDir}/scripts/voices.sh info --id 21m00Tcm4TlvDq8ikWAM

# Search voices (filter output with grep)
{baseDir}/scripts/voices.sh list | grep -i "female"

# Filter by category
{baseDir}/scripts/voices.sh list --category premade
{baseDir}/scripts/voices.sh list --category cloned

# Download voice preview
{baseDir}/scripts/voices.sh preview --name Rachel -o preview.mp3

# Delete custom voice
{baseDir}/scripts/voices.sh delete --id "voice_id"
```

## Sound Effects

```bash
# Generate sound effect
{baseDir}/scripts/sfx.sh 'Heavy rain on a tin roof'

# With duration
{baseDir}/scripts/sfx.sh --duration 5 'Forest ambiance with birds'

# With prompt influence (higher = more accurate)
{baseDir}/scripts/sfx.sh --influence 0.8 'Sci-fi laser gun firing'

# Save to file
{baseDir}/scripts/sfx.sh --out effects/thunder.mp3 'Rolling thunder'
```

**Note:** Duration range is 0.5 to 22 seconds (rounded to nearest 0.5)

## Voice Isolation

```bash
# Remove background noise and isolate voice
{baseDir}/scripts/isolate.sh noisy_recording.mp3

# Save to specific file
{baseDir}/scripts/isolate.sh --out clean_voice.mp3 meeting_recording.mp3

# Don't tag audio events
{baseDir}/scripts/isolate.sh --no-audio-events recording.mp3
```

**Requirements:**

- Minimum duration: 4.6 seconds
- Supported formats: MP3, WAV, M4A, OGG, FLAC

## Dubbing (Multi-Language Translation)

```bash
# Dub audio to Spanish
{baseDir}/scripts/dub.sh --target es audio.mp3

# Dub with source language specified
{baseDir}/scripts/dub.sh --source en --target ja video.mp4

# Check dubbing status
{baseDir}/scripts/dub.sh --status --id "dubbing_id"

# Download dubbed audio
{baseDir}/scripts/dub.sh --download --id "dubbing_id" --out dubbed.mp3
```

**Supported languages:** en, es, fr, de, it, pt, pl, hi, ar, zh, ja, ko, nl, ru, tr, vi, sv, da, fi, cs, el, he, id, ms, no, ro, uk, hu, th

## API Usage Examples

For direct API access, all scripts use curl under the hood:

```bash
# Direct TTS API call
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "model_id": "eleven_turbo_v2_5"}' \
  --output speech.mp3
```

## Error Handling

All scripts provide helpful error messages:

- **401**: Authentication failed - Check your API key
- **403**: Permission denied - Your API key may not have access
- **429**: Rate limit exceeded - Wait before trying again
- **500/502/503**: ElevenLabs API issues - Try again later

## Testing

Run the test suite to verify everything works:

```bash
{baseDir}/test.sh YOUR_API_KEY
```

Or with environment variable:

```bash
export ELEVENLABS_API_KEY="your_key"
{baseDir}/test.sh
```

## Troubleshooting

### Common Issues

1. **"exec host not allowed (requested gateway)"**
   - The skill needs to run commands in a sandbox environment
   - Configure OpenClaw to use sandbox: `tools.exec.host: "sandbox"`
   - Or enable sandboxing in your OpenClaw config
   - Alternative: Configure exec approvals for gateway host (see OpenClaw docs)

2. **Parse errors with quotes or exclamation marks**
   - Use single quotes instead of double quotes: `'Hello world'` not `"Hello world!"`
   - Avoid exclamation marks (`!`) in text when using double quotes
   - For complex text, use the `--input` option with a file

3. **"ELEVENLABS_API_KEY not set"**
   - Ensure `ELEVENLABS_API_KEY` is set or configured in openclaw.json
   - Check that the API key is at least 20 characters long

4. **"jq is required but not installed"**
   - Install jq: `apt-get install jq` (Linux) or `brew install jq` (macOS)

5. **"Rate limited"**
   - Check your ElevenLabs plan quota at elevenlabs.io/app/usage
   - Free tier: ~10,000 characters/month

6. **"Voice not found"**
   - Use `{baseDir}/scripts/voices.sh list` to see available voices
   - Check if the voice ID is correct

7. **"Dubbing failed"**
   - Ensure source audio is clear and audible
   - Check supported language codes

8. **"File too large"**
   - Transcription: 100MB max
   - Dubbing: 500MB max
   - Voice cloning: 50MB per file

### Debug Mode

```bash
# Enable verbose output
DEBUG=1 {baseDir}/scripts/speak.sh 'test'

# Show API request details
DEBUG=1 {baseDir}/scripts/transcribe.sh audio.mp3
```

## Pricing Notes

ElevenLabs API pricing (approximate):

- **Flash v2.5**: ~$0.06/min
- **Turbo v2.5**: ~$0.06/min
- **Multilingual v2**: ~$0.12/min
- **Voice cloning**: Included in plan
- **Sound effects**: ~$0.02/generation
- **Transcription**: ~$0.02/min (Scribe v1)

Free tier: ~10,000 characters/month

## Links

- [ElevenLabs Dashboard](https://elevenlabs.io/app)
- [API Documentation](https://elevenlabs.io/docs)
- [Voice Library](https://elevenlabs.io/voice-library)
- [Pricing](https://elevenlabs.io/pricing)
