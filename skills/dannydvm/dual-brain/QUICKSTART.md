# Quick Start Guide

## Installation

```bash
# From project directory
npm install -g .

# Or via npm (once published)
npm install -g openclaw-dual-brain
```

## Initial Setup

```bash
# Interactive configuration
dual-brain setup
```

You'll be prompted for:

- **Provider** (ollama/moonshot/openai/groq)
- **Model** (e.g., llama3.2, moonshot-v1-auto, gpt-4o)
- **API Key** (if needed - not for ollama)
- **Owner Discord IDs** (optional, leave empty for all users)
- **Poll Interval** (default: 10000ms / 10s)
- **Engram Integration** (y/n)

Config is saved to `~/.dual-brain/config.json`

## Running the Daemon

### Foreground (for testing)

```bash
dual-brain start
```

### As System Service

**macOS:**

```bash
dual-brain install-daemon
# Installs LaunchAgent to ~/Library/LaunchAgents/com.dual-brain.plist

# Control with launchctl:
launchctl stop com.dual-brain
launchctl start com.dual-brain
```

**Linux:**

```bash
sudo dual-brain install-daemon
# Installs systemd unit to /etc/systemd/system/dual-brain.service

# Control with systemctl:
sudo systemctl status dual-brain
sudo systemctl stop dual-brain
sudo systemctl start dual-brain
```

## Commands

```bash
dual-brain setup            # Configure provider and settings
dual-brain start            # Run daemon in foreground
dual-brain stop             # Stop running daemon
dual-brain status           # Show config and running status
dual-brain logs             # View last 50 log entries
dual-brain install-daemon   # Install as OS service
dual-brain help             # Show help
```

## How It Works

1. Daemon watches `~/.openclaw/agents/*/sessions/*.jsonl` for new user messages
2. When detected, sends message to secondary LLM provider
3. Writes 2-3 sentence perspective to `~/.dual-brain/perspectives/{agent-id}-latest.md`
4. Primary agent reads this file before responding
5. Agent synthesizes both perspectives into final response

## Provider Comparison

| Provider          | Cost             | Speed     | Setup                             |
| ----------------- | ---------------- | --------- | --------------------------------- |
| **Ollama**        | Free             | Medium    | Requires Ollama installed locally |
| **Moonshot/Kimi** | ~$0.50/1M tokens | Fast      | API key required                  |
| **OpenAI**        | $2.50/1M tokens  | Medium    | API key required                  |
| **Groq**          | Free tier        | Very fast | API key required                  |

## Testing

After starting the daemon, send a message via OpenClaw. Check:

```bash
# View status
dual-brain status

# Check perspectives directory
ls -lh ~/.dual-brain/perspectives/

# View a perspective
cat ~/.dual-brain/perspectives/main-latest.md

# Tail logs
dual-brain logs
```

## Troubleshooting

**Ollama not responding:**

```bash
# Check if Ollama is running
ollama list

# Start Ollama if needed
ollama serve
```

**API key errors:**

- Verify API key in `~/.dual-brain/config.json`
- Test with: `dual-brain setup` to reconfigure

**No perspectives generated:**

- Check logs: `dual-brain logs`
- Verify ownerIds match your Discord ID (if set)
- Ensure messages aren't HEARTBEAT messages

**Daemon won't start:**

- Check if already running: `dual-brain status`
- Clean up stale PID: `rm ~/.dual-brain/dual-brain.pid`
- Check config is valid: `cat ~/.dual-brain/config.json`

## Files & Directories

```
~/.dual-brain/
├── config.json              # Configuration
├── state.json               # Processed messages tracking
├── dual-brain.log           # Log file
├── dual-brain.pid           # Process ID (when running)
└── perspectives/            # Generated perspectives
    ├── main-latest.md
    ├── strategist-latest.md
    └── ...
```

## Uninstall

```bash
# Stop daemon
dual-brain stop

# Remove LaunchAgent (macOS)
launchctl unload ~/Library/LaunchAgents/com.dual-brain.plist
rm ~/Library/LaunchAgents/com.dual-brain.plist

# Remove systemd service (Linux)
sudo systemctl stop dual-brain
sudo systemctl disable dual-brain
sudo rm /etc/systemd/system/dual-brain.service
sudo systemctl daemon-reload

# Uninstall package
npm uninstall -g openclaw-dual-brain

# Remove config and data (optional)
rm -rf ~/.dual-brain
```

## Development

```bash
# Clone and link for development
git clone https://github.com/yourusername/openclaw-dual-brain.git
cd openclaw-dual-brain
npm link

# Now `dual-brain` command uses local development version

# Test daemon directly
node src/daemon.js

# Test providers
node -e "const P = require('./src/providers/ollama'); new P({model:'llama3.2'}).test().then(console.log)"
```

## Next Steps

- See [README.md](README.md) for full documentation
- See [SKILL.md](SKILL.md) for agent integration details
- Check [examples/](examples/) for usage examples
