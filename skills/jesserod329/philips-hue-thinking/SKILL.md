---
name: philips-hue-thinking
description: Visual AI activity indicator using Philips Hue lights. Pulse red when thinking, green when done.
homepage: https://github.com/yourusername/philips-hue-thinking
metadata:
  {
    'clawdbot':
      {
        'emoji': '🚦',
        'requires': { 'bins': ['hue'] },
        'install': [{ 'id': 'manual', 'kind': 'manual', 'label': 'Copy hue script to PATH' }],
      },
  }
---

# Philips Hue Thinking Indicator

**Visual AI activity indicator** — Connect your AI assistant's work status to your physical environment through Philips Hue smart lights.

![Demo](https://img.shields.io/badge/status-active-green)

## What It Does

Turns a Philips Hue light into an **AI activity indicator**:

| Light State        | Meaning                                |
| ------------------ | -------------------------------------- |
| 🟢 **Green**       | Ready / Done / Idle                    |
| 🔴 **Pulsing Red** | AI is thinking, analyzing, or planning |
| 🔴 **Solid Red**   | AI is actively building/working        |

## Why Use This?

- **Ambient awareness** — Know when your AI is working without checking screens
- **Flow state protection** — Visual indicator prevents interruptions during deep work
- **Satisfying completion** — Green light signals "ready for next task"
- **Conversation starter** — "My AI has a physical presence in my house"

## Quick Start

### 1. Setup Your Hue Bridge

```bash
# Find your bridge IP (check router or Hue app), then run:
hue setup <bridge-ip>

# Example:
hue setup 192.168.1.100
```

### 2. Find Your Light

```bash
hue lights

# Output:
#   2: Bed room 1 💡 ON
#   3: Bedroom 2 ⚫ OFF
#   5: Front door 💡 ON  ← Use this one
```

### 3. Use It

```bash
# AI starts thinking
hue thinking 5

# AI is done
hue done 5
```

## Installation

### Option 1: Copy to PATH

```bash
# Clone or download
git clone https://github.com/yourusername/philips-hue-thinking.git

# Add to PATH
cp philips-hue-thinking/hue /usr/local/bin/
chmod +x /usr/local/bin/hue
```

### Option 2: Use Directly

```bash
# Add to your shell profile (.zshrc or .bashrc)
export PATH="$PATH:/path/to/philips-hue-thinking"

# Then reload
source ~/.zshrc
```

## Commands

### Core Commands

```bash
# Setup (press bridge button first!)
hue setup <bridge-ip>

# List all lights
hue lights

# Thinking mode (pulsing red)
hue thinking <light-id>

# Done (solid green)
hue done <light-id>

# Set any color
hue set <light-id> <color>
```

### Available Colors

```bash
hue set 5 red
hue set 5 green
hue set 5 blue
hue set 5 yellow
hue set 5 purple
hue set 5 orange
```

### Utility Commands

```bash
# Turn off
hue off 5

# Pulse continuously
hue pulse 5 --color red
```

## Workflow Integration

### With AI Assistants

**Planning Mode:**

```
User: "Planning mode — I want to build a website"
AI:  [runs 'hue thinking 5'] 🔴 Pulsing...
     "Here are my questions..."
User: [answers]
AI:  [runs 'hue done 5'] ✅ Green
     "Starting build now..."
     [runs 'hue thinking 5'] 🔴 Solid red while building
AI:  [runs 'hue done 5'] ✅ Green
     "Done!"
```

### Shell Aliases

Add to `~/.zshrc`:

```bash
# Quick aliases
alias think='hue thinking 5'
alias done='hue done 5'
```

Then just type:

```bash
think  # Light pulses red
done   # Light turns green
```

## Technical Details

### How It Works

1. **Hue Bridge API** — Communicates via local HTTP API
2. **Color XY Values** — Uses CIE color space for accurate colors
3. **Background Pulse** — Bash loop dims/brightens light
4. **Stateless** — Stores config in `~/.config/philips-hue/`

### Color XY Values

| Color  | X     | Y     |
| ------ | ----- | ----- |
| Red    | 0.675 | 0.322 |
| Green  | 0.214 | 0.709 |
| Blue   | 0.167 | 0.040 |
| Yellow | 0.492 | 0.476 |
| Purple | 0.265 | 0.100 |
| Orange | 0.600 | 0.380 |

### The Pulse Effect

```bash
# Brightness oscillation
254 (bright) → 50 (dim) → 254

# Timing
~2 second cycle
Background process keeps pulsing
```

## Configuration

Config stored in: `~/.config/philips-hue/config.json`

```json
{
  "bridge_ip": "192.168.1.100",
  "username": "your-api-key"
}
```

## Requirements

- Philips Hue Bridge (v2)
- Philips Hue color bulbs
- macOS/Linux with `curl`
- Bash 4.0+

## Troubleshooting

### "Link button not pressed"

Press the **physical button** on your Hue Bridge, then run setup within 30 seconds.

### Light not responding

```bash
# Check connection
hue lights

# Verify config
cat ~/.config/philips-hue/config.json
```

### Pulse won't stop

```bash
# Kill background process
pkill -f "hue-pulse-loop"

# Reset light
hue done 5
```

## Future Ideas

- [ ] Auto-trigger via AI session lifecycle
- [ ] Multiple lights for different task types
- [ ] Heartbeat mode (gentle pulse every 30 min)
- [ ] Error state (flash purple)
- [ ] Success celebration (rainbow effect)

## License

MIT — See LICENSE file

## Credits

Created by Jesse & Kate (Clawdbot)  
Inspired by the need for AI physical presence

---

**Questions?** Open an issue or DM @jesse on Twitter
