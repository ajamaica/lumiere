# Philips Hue Thinking Indicator 🚦

> Give your AI assistant a physical presence through smart lights

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/yourusername/philips-hue-thinking)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey)]()

## What Is This?

A **visual AI activity indicator** that connects your AI assistant's work status to your physical environment through Philips Hue lights.

| Light State        | Meaning                                |
| ------------------ | -------------------------------------- |
| 🟢 **Green**       | Ready / Done / Idle                    |
| 🔴 **Pulsing Red** | AI is thinking, analyzing, or planning |
| 🔴 **Solid Red**   | AI is actively building/working        |

![Demo Animation](https://media.giphy.com/media/your-demo-here/giphy.gif)

## Why Use This?

- **Ambient awareness** — Know when your AI is working without checking screens
- **Flow state protection** — Visual indicator prevents interruptions during deep work
- **Satisfying completion** — Green light signals "ready for next task"
- **Conversation starter** — "My AI has a physical presence in my house"

## Quick Start

```bash
# 1. Install
brew install your-tap/philips-hue-thinking  # or copy hue to PATH

# 2. Find your Hue Bridge IP
# Check your router admin or the Hue app
# Usually something like: 192.168.1.xxx

# 3. Setup (press Hue Bridge button when prompted)
hue setup 192.168.1.100

# 4. Find your light
hue lights

# 5. Use it!
hue thinking 5   # Light pulses red (AI working)
hue done 5       # Light turns green (AI done)
```

## Installation

### Option 1: Homebrew (Recommended)

```bash
brew tap yourusername/philips-hue
brew install philips-hue-thinking
```

### Option 2: Manual

```bash
# Clone
git clone https://github.com/yourusername/philips-hue-thinking.git
cd philips-hue-thinking

# Add to PATH
sudo cp hue /usr/local/bin/
sudo chmod +x /usr/local/bin/hue

# Or add to your shell profile
export PATH="$PATH:$(pwd)"
```

### Option 3: With AI Assistant

If your AI assistant (Claude, GPT, etc.) supports skills:

```
Install skill: philips-hue-thinking
```

The assistant will automatically use `hue thinking` and `hue done` during long tasks.

## Usage

### Core Commands

```bash
# Setup (one-time) - use your bridge IP
hue setup 192.168.1.100

# List lights
hue lights
# Output:
#   2: Bed room 1 💡 ON
#   3: Bedroom 2 ⚫ OFF
#   5: Front door 💡 ON  ← Use this one

# AI thinking mode (pulsing red)
hue thinking 5

# AI done (solid green)
hue done 5
```

### All Commands

| Command                | Description            |
| ---------------------- | ---------------------- |
| `hue setup <ip>`       | Connect to Hue Bridge  |
| `hue lights`           | List all lights        |
| `hue set <id> <color>` | Set any color          |
| `hue thinking <id>`    | Pulse red (AI working) |
| `hue done <id>`        | Solid green (AI done)  |
| `hue pulse <id>`       | Pulse continuously     |
| `hue off <id>`         | Turn off               |
| `hue status`           | Show config            |

### Colors Available

- Red, Green, Blue, Yellow, Purple, Orange, Pink, Cyan, White

```bash
hue set 5 purple
hue set 5 blue
```

## Workflow Examples

### With AI Assistants

**Planning Mode:**

```
User: "Planning mode — I want to build a website"
AI:  [runs 'hue thinking 5'] 🔴 Pulsing red...
     "Let me analyze this..."
     [asks clarifying questions]

User: [answers questions]

AI:  [runs 'hue done 5'] ✅ Green
     "Plan ready! Starting build..."
     [runs 'hue thinking 5'] 🔴 Solid red
     [builds for 30 minutes]

AI:  [runs 'hue done 5'] ✅ Green
     "Done! Website is live."
```

### Shell Aliases

Add to `~/.zshrc` or `~/.bashrc`:

```bash
alias think='hue thinking 5'
alias done='hue done 5'
```

Then just type:

```bash
think   # Red
done    # Green
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run tests
  run: |
    hue thinking 5
    npm test
    hue done 5
```

## Requirements

- Philips Hue Bridge (v2)
- Philips Hue color bulb(s)
- macOS or Linux
- `curl` (installed by default)
- `bash` 4.0+

## How It Works

1. **Hue Bridge API** — Communicates via local HTTP API
2. **CIE Color Space** — XY coordinates for accurate colors
3. **Background Process** — Bash loop creates breathing effect
4. **Stateless** — Stores config in `~/.config/philips-hue/`

### The Pulse Effect

```
Brightness: 254 (bright) → 60 (dim) → 254
Timing: ~2.4 second cycle
```

## Troubleshooting

### "Link button not pressed"

Press the **physical button** on your Hue Bridge, then run setup within 30 seconds.

```bash
# Try again with your bridge IP
hue setup 192.168.1.100
```

### Light not responding

```bash
# Check connection
hue status

# Test with lights command
hue lights

# Verify IP hasn't changed
# (Check your router or Hue app)
```

### Pulse won't stop

```bash
# Kill all pulse processes
pkill -f "hue-pulse-loop"

# Or reset specific light
hue done 5
```

## Configuration

Stored in: `~/.config/philips-hue/config.json`

```json
{
  "bridge_ip": "192.168.1.151",
  "username": "your-api-key-here"
}
```

## API Reference

### Color XY Values

| Color  | X     | Y     |
| ------ | ----- | ----- |
| Red    | 0.675 | 0.322 |
| Green  | 0.214 | 0.709 |
| Blue   | 0.167 | 0.040 |
| Yellow | 0.492 | 0.476 |
| Purple | 0.265 | 0.100 |
| Orange | 0.600 | 0.380 |
| Pink   | 0.414 | 0.177 |
| Cyan   | 0.160 | 0.340 |
| White  | 0.313 | 0.329 |

## Future Ideas

- [ ] Auto-trigger via AI session lifecycle
- [ ] Multiple lights for different task types
- [ ] Heartbeat mode (gentle pulse every 30 min)
- [ ] Error state (flash purple)
- [ ] Success celebration (rainbow effect)
- [ ] Home Assistant integration
- [ ] Siri Shortcuts support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Credits

Created by [Jesse](https://github.com/yourusername) & Kate (Clawdbot)

Inspired by the need for AI physical presence in the real world.

## License

MIT — See [LICENSE](LICENSE)

---

**Questions?** Open an issue or reach out on Twitter [@yourusername](https://twitter.com/yourusername)
