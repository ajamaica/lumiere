# ElevenLabs API Setup

Set your API key as an environment variable:

```bash
# Add this to your ~/.zshrc
export ELEVEN_LABS_API_KEY="sk_538130dd2eef3cda1943467305698de2fdf34662afcd176e"

# Then reload your shell
source ~/.zshrc
```

This is used by the **sag** skill (ElevenLabs TTS) for:

- Voice stories and storytelling
- Movie summaries in voice
- Funny character voices
- Making AI responses more engaging

**Why environment variable?**

- Keeps the key out of git/history
- More secure than hardcoding
- Easy to rotate/change
