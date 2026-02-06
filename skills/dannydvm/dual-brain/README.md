# 🧠 openclaw-dual-brain

**Multi-LLM perspective synthesis for OpenClaw agents.**

Give your AI agents cognitive diversity by automatically generating perspectives from a secondary LLM (different from the primary model) on every user message. The primary agent reads both viewpoints before responding — like having two brains instead of one.

## Why?

**Single-model agents have blind spots.** Different LLMs have different strengths, training data, and reasoning patterns. By synthesizing perspectives from two models, agents get:

- **Broader coverage** - One model catches what the other misses
- **Bias mitigation** - Different training = different biases
- **Quality assurance** - Second opinion validates reasoning
- **Cognitive diversity** - Like pair programming for AI

## Features

✅ **Provider-agnostic** - Supports Ollama (local), Moonshot/Kimi, OpenAI, Groq  
✅ **Zero agent overhead** - Background daemon, <1s latency  
✅ **Plug-and-play** - Works with any OpenClaw agent  
✅ **Engram integration** - Optional semantic memory storage  
✅ **System service** - Install as launchd (macOS) or systemd (Linux)  
✅ **Plain JavaScript** - No TypeScript, no build step

## Architecture

```
┌─────────────┐
│ User Message │
└──────┬──────┘
       │
       ▼
┌───────────────────────┐
│ OpenClaw Session      │
│ (~/.openclaw/agents/  │
│  */sessions/*.jsonl)  │
└──────┬────────────────┘
       │
       │ (daemon polls every 10s)
       │
       ▼
┌────────────────────────┐
│ Dual-Brain Daemon      │
│ - Detects new messages │
│ - Calls secondary LLM  │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Secondary LLM Provider     │
│ • Ollama (local, free)     │
│ • Moonshot/Kimi            │
│ • OpenAI (GPT-4o)          │
│ • Groq (fast Llama)        │
└──────┬─────────────────────┘
       │
       ▼ (2-3 sentence perspective)
       │
┌──────────────────────────────┐
│ ~/.dual-brain/perspectives/  │
│   main-latest.md             │
│   strategist-latest.md       │
│   ...                        │
└──────┬───────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Primary Agent              │
│ - Reads perspective file   │
│ - Synthesizes both views   │
│ - Responds to user         │
└────────────────────────────┘
```

## Installation

```bash
npm install -g openclaw-dual-brain
```

## Quick Start

### 1. Configure

```bash
dual-brain setup
```

Interactive prompt will ask you to choose:

- **Provider** (ollama/moonshot/openai/groq)
- **Model** (e.g., `llama3.2`, `moonshot-v1-auto`, `gpt-4o`)
- **API Key** (if needed)
- **Poll interval** (default: 10s)
- **Engram integration** (y/n)

Config saved to `~/.dual-brain/config.json`.

### 2. Start Daemon

```bash
dual-brain start
```

Runs in foreground. Use `Ctrl+C` to stop, or see "Run as Service" below.

### 3. Check Status

```bash
dual-brain status
```

Shows:

- Current configuration
- Running status (PID)
- Recent perspectives

### 4. View Logs

```bash
dual-brain logs
```

Tail of last 50 log entries.

## Run as System Service

### macOS (launchd)

```bash
dual-brain install-daemon
```

Or manually:

```bash
cp daemon/com.dual-brain.plist ~/Library/LaunchAgents/
# Edit paths for your system
launchctl load ~/Library/LaunchAgents/com.dual-brain.plist
```

### Linux (systemd)

```bash
sudo dual-brain install-daemon
```

Or manually:

```bash
sudo cp daemon/dual-brain.service /etc/systemd/system/
# Edit User and paths
sudo systemctl daemon-reload
sudo systemctl enable dual-brain
sudo systemctl start dual-brain
```

## Providers

| Provider          | Cost             | Speed     | Notes                                   |
| ----------------- | ---------------- | --------- | --------------------------------------- |
| **Ollama**        | Free             | Medium    | Local models, requires Ollama installed |
| **Moonshot/Kimi** | ~$0.50/1M tokens | Fast      | Chinese LLM, strong reasoning           |
| **OpenAI**        | $2.50/1M tokens  | Medium    | GPT-4o, GPT-4-turbo                     |
| **Groq**          | Free (limited)   | Very fast | Llama 3.3 70B                           |

### Ollama Setup (Recommended)

Install Ollama: <https://ollama.ai>

```bash
ollama pull llama3.2
dual-brain setup  # Choose ollama, model=llama3.2
```

Zero cost, runs locally. Great for development.

## Configuration

File: `~/.dual-brain/config.json`

```json
{
  "provider": "ollama",
  "model": "llama3.2",
  "apiKey": "",
  "pollInterval": 10000,
  "perspectiveDir": "~/.dual-brain/perspectives",
  "ownerIds": ["YOUR_DISCORD_ID"],
  "maxTokens": 300,
  "temperature": 0.7,
  "engramIntegration": true
}
```

**Fields:**

- `provider` - LLM provider (ollama/moonshot/openai/groq)
- `model` - Model name
- `apiKey` - API key (not needed for ollama)
- `pollInterval` - How often to check for new messages (ms)
- `perspectiveDir` - Where to write perspective files
- `ownerIds` - Discord IDs of message authors to process (empty = all)
- `maxTokens` - Max tokens for perspective response
- `temperature` - LLM temperature (0-1)
- `engramIntegration` - Store perspectives in Engram if available

## For Agent Developers

Agents should check for perspectives before responding:

```javascript
const fs = require('fs')
const perspectiveFile = `${process.env.HOME}/.dual-brain/perspectives/${agentId}-latest.md`

if (fs.existsSync(perspectiveFile)) {
  const perspective = fs.readFileSync(perspectiveFile, 'utf-8')
  // Parse timestamp from comment
  // If recent (< 30s old), consider in response
}
```

Or in bash:

```bash
cat ~/.dual-brain/perspectives/main-latest.md 2>/dev/null || echo "No perspective"
```

The perspective is 2-3 sentences highlighting:

- What the primary agent might miss
- Alternative angles to consider
- Important things to verify

**Synthesize, don't just append.** The goal is to think with two models, not just quote the secondary one.

## Engram Integration

If [Engram](https://github.com/yourusername/engram) is running on `localhost:3400`, perspectives are also stored as semantic memories for long-term recall.

Engram health check happens automatically. If unavailable, daemon falls back to flat files only.

## Development

```bash
git clone https://github.com/yourusername/openclaw-dual-brain.git
cd openclaw-dual-brain
npm link  # Makes `dual-brain` command available globally

# Run daemon directly
node src/daemon.js

# Test provider
node -e "const P = require('./src/providers/ollama'); new P({model:'llama3.2'}).test().then(console.log)"
```

## Project Structure

```
openclaw-dual-brain/
├── package.json
├── README.md
├── SKILL.md              # For ClawHub
├── bin/
│   └── dual-brain.js     # CLI entrypoint
├── src/
│   ├── cli.js            # CLI commands
│   ├── config.js         # Config management
│   ├── daemon.js         # Main daemon logic
│   └── providers/
│       ├── interface.js  # Provider contract
│       ├── moonshot.js   # Kimi/Moonshot
│       ├── openai.js     # OpenAI GPT-4o
│       ├── groq.js       # Groq Llama
│       └── ollama.js     # Local Ollama
└── daemon/
    ├── install.sh        # Installer script
    ├── com.dual-brain.plist  # macOS LaunchAgent
    └── dual-brain.service    # Linux systemd unit
```

## FAQ

**Q: Which provider should I use?**  
A: Start with Ollama (free, local). For production, Groq (fast) or Moonshot (quality).

**Q: Does this slow down agent responses?**  
A: No. The daemon runs in the background and writes perspectives asynchronously. Agents read a file, which is instant.

**Q: Can I use multiple providers at once?**  
A: Not yet, but PRs welcome! You could run multiple daemons with different configs.

**Q: How does it detect "owner" messages vs. agent messages?**  
A: Checks `ownerIds` from config against message author, or looks for messages in "main" session files. You can leave `ownerIds` empty to process all user messages.

**Q: What if the secondary LLM times out?**  
A: Daemon has 20-25s timeout. If it fails, no perspective is written, and the primary agent proceeds normally.

**Q: Does this work with non-OpenClaw setups?**  
A: Maybe! If your system uses JSONL session files, you can adapt the daemon. See `src/daemon.js` line ~120.

## Roadmap

- [ ] Web dashboard for perspective history
- [ ] Multi-provider perspectives (ensemble)
- [ ] Agent-specific provider configs
- [ ] Perspective quality metrics
- [ ] Claude/Anthropic API support
- [ ] Custom perspective prompts

## Contributing

PRs welcome! Please:

- Keep it plain JavaScript (no TypeScript)
- Follow existing code style
- Add tests if adding providers
- Update README

## License

MIT © Danny Veiga

## Credits

Built for the [OpenClaw](https://github.com/yourusername/openclaw) agent framework.

Inspired by multi-model ensemble techniques and cognitive diversity research.

---

**Get started:** `npm install -g openclaw-dual-brain && dual-brain setup`
