# YouTube Voice Summarizer

Transform any YouTube video into a podcast-style voice summary in under 60 seconds.

## Features

- **Fast** - Full voice summary in ~60 seconds
- **Natural Voice** - ElevenLabs multilingual v2
- **Any Video Length** - Works with 10 minutes or 10 hours
- **Multiple Voices** - 4 voice styles to choose from
- **Customizable Length** - Short, medium, or detailed summaries

## Quick Start

1. Deploy the backend server from [GitHub](https://github.com/Franciscomoney/elevenlabs-moltbot)
2. Configure your API keys (ElevenLabs, Supadata, OpenRouter)
3. Add this skill to your OpenClaw bot
4. Send YouTube links and receive voice summaries!

## How It Works

```
YouTube URL → Supadata (transcript) → AI (summary) → ElevenLabs (voice) → You
```

## API Keys Required

| Service    | Purpose             | Link                  |
| ---------- | ------------------- | --------------------- |
| ElevenLabs | Text-to-speech      | https://elevenlabs.io |
| Supadata   | YouTube transcripts | https://supadata.ai   |
| OpenRouter | AI summarization    | https://openrouter.ai |

## License

MIT - Francisco Cordoba
