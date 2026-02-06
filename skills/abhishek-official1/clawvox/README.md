# ElevenLabs Voice Studio for OpenClaw

A comprehensive voice production studio skill for OpenClaw, powered by ElevenLabs. Transform your personal AI assistant into a full-featured voice platform with text-to-speech, speech-to-text, voice cloning, sound effects, and multilingual dubbing capabilities.

## 🎙️ Features

- **Text-to-Speech (TTS)** - Generate lifelike speech with multiple voice models
- **Speech-to-Text (STT)** - Transcribe audio with high accuracy
- **Voice Cloning** - Clone voices from audio samples
- **Sound Effects** - Generate custom audio effects from text descriptions
- **Voice Isolation** - Remove background noise from audio
- **Multilingual Dubbing** - Translate and dub audio/video to 32+ languages
- **Voice Library Management** - Browse and manage available voices

## 🚀 Quick Start

### Installation

1. Copy this skill to your OpenClaw skills directory:

```bash
cp -r elevenlabs-voice-studio ~/.openclaw/skills/
```

2. Set your ElevenLabs API key:

```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

Or configure in `~/.openclaw/openclaw.json`:

```json5
{
  skills: {
    entries: {
      'elevenlabs-voice-studio': {
        apiKey: 'your_api_key_here',
      },
    },
  },
}
```

3. Get your API key from [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)

### Basic Usage

```bash
# Text to Speech
elevenlabs speak "Hello from ElevenLabs Voice Studio!"
elevenlabs speak -v Adam "Hello from Adam's voice"

# Transcribe Audio
elevenlabs transcribe meeting.mp3
elevenlabs transcribe -o transcript.txt recording.mp3

# Clone a Voice
elevenlabs clone -n MyVoice sample.mp3

# List Voices
elevenlabs voices list
elevenlabs voices info --name Rachel

# Generate Sound Effects
elevenlabs sfx "Thunder storm with heavy rain"

# Remove Background Noise
elevenlabs isolate noisy_recording.mp3 -o clean.mp3

# Dub to Another Language
elevenlabs dub -t es audio.mp3  # Spanish
elevenlabs dub -s en -t ja video.mp4  # English to Japanese
```

## 📚 Available Commands

### speak - Text to Speech

```bash
elevenlabs speak [options] <text>

Options:
  -v, --voice <name>        Voice name or ID (default: Rachel)
  -m, --model <model>       TTS model: eleven_flash_v2_5, eleven_turbo_v2_5, eleven_multilingual_v2
  -o, --out <file>          Output file path
  -i, --input <file>        Read text from file
  --stability <0-1>         Voice stability
  --similarity <0-1>        Similarity boost
  --style <0-1>             Style exaggeration
  --speaker-boost           Enable speaker boost
```

### transcribe - Speech to Text

```bash
elevenlabs transcribe [options] <audio_file>

Options:
  -o, --out <file>          Output file path
  -l, --language <code>     Language hint (en, es, fr, etc.)
  -t, --timestamps          Include word timestamps
```

### clone - Voice Cloning

```bash
elevenlabs clone [options] <sample_files...>

Options:
  -n, --name <name>         Name for the cloned voice (required)
  -d, --description <text>  Voice description
  -l, --labels <json>       Labels as JSON
  --remove-bg-noise         Remove background noise from samples
```

### voices - Voice Library

```bash
elevenlabs voices list
elevenlabs voices info --id <voice_id>
elevenlabs voices delete --id <voice_id>
```

### sfx - Sound Effects

```bash
elevenlabs sfx [options] <description>

Options:
  -d, --duration <seconds>  Approximate duration
  -o, --out <file>          Output file path
  --influence <0-1>         Prompt influence
```

### isolate - Voice Isolation

```bash
elevenlabs isolate [options] <audio_file>

Options:
  -o, --out <file>          Output file path
```

### dub - Audio/Video Dubbing

```bash
elevenlabs dub [options] <file>

Options:
  -t, --target <lang>       Target language (required)
  -s, --source <lang>       Source language (auto-detected if not specified)
  -o, --out <file>          Output file path
  --status --id <id>        Check dubbing status
  --download --id <id>      Download dubbed audio

Supported Languages:
  en (English), es (Spanish), fr (French), de (German), it (Italian),
  pt (Portuguese), pl (Polish), hi (Hindi), ar (Arabic), zh (Chinese),
  ja (Japanese), ko (Korean), nl (Dutch), ru (Russian), tr (Turkish),
  vi (Vietnamese), sv (Swedish), da (Danish), fi (Finnish), and more...
```

## 🔧 Environment Variables

| Variable                   | Description                        | Default           |
| -------------------------- | ---------------------------------- | ----------------- |
| `ELEVENLABS_API_KEY`       | Your ElevenLabs API key (required) | -                 |
| `ELEVENLABS_DEFAULT_VOICE` | Default voice name                 | Rachel            |
| `ELEVENLABS_DEFAULT_MODEL` | Default TTS model                  | eleven_turbo_v2_5 |
| `ELEVENLABS_OUTPUT_DIR`    | Default output directory           | ~/.openclaw/audio |

## 📖 Voice Models

| Model                    | Latency | Languages | Best For                   |
| ------------------------ | ------- | --------- | -------------------------- |
| `eleven_flash_v2_5`      | ~75ms   | 32        | Real-time, streaming       |
| `eleven_turbo_v2_5`      | ~250ms  | 32        | Balanced quality/speed     |
| `eleven_multilingual_v2` | ~500ms  | 29        | Long-form, highest quality |

## 🎭 Built-in Voices

- **Rachel** - Calm and professional female voice
- **Adam** - Confident male voice
- **Antoni** - Energetic male voice
- **Bella** - Soft female voice
- **Domi** - Strong female voice
- **Elli** - Warm female voice
- **Josh** - Deep male voice
- **Sam** - Young male voice

## 💰 Pricing

ElevenLabs API pricing (approximate):

- **Flash v2.5**: ~$0.06/min
- **Turbo v2.5**: ~$0.06/min
- **Multilingual v2**: ~$0.12/min
- **Voice cloning**: Included in plan
- **Sound effects**: ~$0.02/generation

Free tier: ~10,000 characters/month

## 🧪 Testing

Run the test suite:

```bash
./test.sh <your_api_key>
```

## 🔗 Links

- [ElevenLabs Dashboard](https://elevenlabs.io/app)
- [API Documentation](https://elevenlabs.io/docs)
- [Voice Library](https://elevenlabs.io/voice-library)
- [Pricing](https://elevenlabs.io/pricing)

## 📝 License

MIT License - See OpenClaw project license

## 🏆 Hackathon Submission

This skill was created for the Clawdbot x ElevenLabs Developer Challenge.

**Features:**

- ✅ Full ElevenLabs API coverage (TTS, STT, Clone, SFX, Dub, Isolate)
- ✅ OpenClaw-native implementation with SKILL.md
- ✅ Comprehensive CLI with help and error handling
- ✅ Multi-language support (32+ languages)
- ✅ Voice library management
- ✅ Test suite included

**Technically Deep:**

- Implements all major ElevenLabs APIs
- Proper error handling and rate limit awareness
- JSON processing with jq
- File handling and directory management
- Form data and multipart uploads

**Practically Useful:**

- Content creators: audiobooks, podcasts, video narration
- Multi-channel users: voice messages across all OpenClaw channels
- Business users: professional voice content
- Accessibility: voice interaction for text-based tasks

**Thoughtfully Implemented:**

- Follows OpenClaw skill conventions
- Secure API key handling
- Graceful error messages
- Comprehensive documentation
- Easy installation and setup
