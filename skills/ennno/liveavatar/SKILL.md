---
name: liveavatar
description: Talk face-to-face with your OpenClaw agent using a real-time video avatar powered by LiveAvatar
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'emoji': '🎭',
        'requires': { 'env': ['LIVEAVATAR_API_KEY'], 'bins': ['node', 'npm'] },
        'install':
          [
            {
              'id': 'node',
              'kind': 'node',
              'package': 'openclaw-liveavatar',
              'bins': ['openclaw-liveavatar'],
              'label': 'Install LiveAvatar (npm)',
            },
          ],
      },
  }
---

# OpenClaw LiveAvatar

Give your OpenClaw agent a face and voice! This skill launches a real-time AI avatar that you can talk to naturally using your microphone. The avatar listens to you, sends your speech to your OpenClaw agent, and speaks the response back with lip-synced video.

Powered by [LiveAvatar](https://liveavatar.com) - real-time AI avatar technology.

## Setup

### 1. Get Your API Key (Free)

1. Go to [app.liveavatar.com](https://app.liveavatar.com)
2. Create a free account
3. Copy your API key from the dashboard

### 2. Set Your API Key

```bash
export LIVEAVATAR_API_KEY=your_api_key_here
```

Or add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "liveavatar": {
        "env": {
          "LIVEAVATAR_API_KEY": "your_api_key_here"
        }
      }
    }
  }
}
```

## Usage

Run `/liveavatar` to start the video avatar interface.

When the user runs this command:

1. **Check if LIVEAVATAR_API_KEY is set**. If not, tell them:

   > You need a LiveAvatar API key. Get one free at https://app.liveavatar.com
   > Then set it: `export LIVEAVATAR_API_KEY=your_key`

2. **Launch the interface**:

   ```bash
   npx openclaw-liveavatar
   ```

3. **Tell the user**:
   > Your LiveAvatar interface is starting at http://localhost:3001
   > It will connect automatically to your OpenClaw Gateway.
   >
   > Tips:
   >
   > - Allow microphone access when prompted
   > - Click the green mic button to speak
   > - The avatar will respond with your agent's answers
   > - Click the X button to end the session

## How It Works

```
You speak → Avatar transcribes → OpenClaw processes → Avatar speaks response
```

1. **Voice Input**: Speak into your microphone
2. **Transcription**: LiveAvatar converts speech to text
3. **Agent Processing**: Text sent to OpenClaw Gateway (port 18789)
4. **Response**: Agent response returned
5. **Avatar Speech**: Avatar speaks with natural lip-sync

## Features

- Real-time video avatar with expressions
- Voice-to-voice conversations
- Text chat fallback option
- Smart TTS summarization for long responses
- Echo cancellation (won't respond to itself)
- Multiple avatar choices

## Requirements

- OpenClaw Gateway running (`openclaw gateway`)
- LiveAvatar API key
- Modern browser with microphone
- Node.js 18+

## Troubleshooting

**"OpenClaw Disconnected"**

```bash
openclaw gateway
```

**"No avatars available"**

- Check LIVEAVATAR_API_KEY is set correctly

**Voice not working**

- Allow microphone access in browser
- Check system audio settings

## Links

- [LiveAvatar](https://liveavatar.com) - Real-time avatar platform
- [OpenClaw](https://openclaw.ai) - Your personal AI assistant
- [GitHub](https://github.com/eNNNo/openclaw-liveavatar) - Source code
