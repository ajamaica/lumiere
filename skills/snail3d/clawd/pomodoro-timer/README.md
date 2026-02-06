# 🍅 ClawDoro

A clean, beautiful, and fully functional Pomodoro timer that runs in your browser. Built for focus.

**Live Demo:** https://snail3d.github.io/ClawDoro

<a href="https://www.buymeacoffee.com/snail3d" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Features

- ✅ **Customizable focus sessions** (default 27 min — Clawd's recommendation)
- ✅ **Short (5 min) & Long (15 min) breaks**
- ✅ **Task tracking** with localStorage persistence
- ✅ **Keyboard shortcuts** (Space = start/pause, R = reset)
- ✅ **Sound notifications** (toggleable)
- ✅ **Clean, modern UI** with gradient design
- ✅ **Works offline** — no server needed
- ✅ **Mobile responsive**
- ✅ **Skill integration** — trigger from Clawdbot

## Quick Start

### Option 1: Open in Browser

```bash
open index.html
```

### Option 2: Use as Clawdbot Skill

```bash
# Start with default times (27/5/15)
node trigger.js

# Custom focus time
node trigger.js 45

# Full custom (focus/short/long)
node trigger.js 50 10 30
```

Or just tell Clawd: **"Start a Pomodoro timer"** or **"Pomodoro 27 minutes"**

## How to Use

1. Click **Start** or press **Space**
2. Add tasks you're working on
3. Focus until the timer completes
4. Take a break when notified
5. After 4 pomodoros, take a longer break

## Keyboard Shortcuts

| Key     | Action        |
| ------- | ------------- |
| `Space` | Start / Pause |
| `R`     | Reset timer   |

## Customization

Change timer durations in the settings:

- Focus time: 1-60 minutes
- Short break: 1-30 minutes
- Long break: 1-60 minutes

Your settings persist in localStorage.

## Task Management

- Add tasks with the input field
- Check off completed tasks
- Tasks persist between sessions
- Delete tasks when done

## Tech Stack

- Pure HTML5, CSS3, JavaScript
- No frameworks or dependencies
- localStorage for data persistence
- Simple Node.js HTTP server for skill mode

## Clawdbot Skill Integration

This doubles as a Clawdbot skill!

### Quick Install

Download [`clawdoro-skill.zip`](https://github.com/Snail3D/ClawDoro/raw/main/clawdoro-skill.zip) and extract to `~/clawd/skills/pomodoro/`.

Or install manually:

```bash
mkdir -p ~/clawd/skills/pomodoro
cd ~/clawd/skills/pomodoro
curl -O https://raw.githubusercontent.com/Snail3D/ClawDoro/main/skills/pomodoro/SKILL.md
curl -O https://raw.githubusercontent.com/Snail3D/ClawDoro/main/skills/pomodoro/trigger.js
curl -O https://raw.githubusercontent.com/Snail3D/ClawDoro/main/skills/pomodoro/timer.html
```

### Skill Structure

```
~/clawd/skills/pomodoro/
├── SKILL.md       # Skill documentation
├── trigger.js     # Entry point
└── timer.html     # The UI
```

### Trigger from Clawdbot

- "Start a Pomodoro timer"
- "Pomodoro 45 minutes"
- "Timer for 50/10/30"

When triggered via Clawd:

1. Starts HTTP server on localhost:8765
2. Auto-opens browser
3. Pre-fills custom times if specified
4. Runs until you Ctrl+C to stop

## Development

```bash
git clone https://github.com/Snail3D/ClawDoro.git
cd ClawDoro

# Run locally
open index.html

# Or with live server
npx live-server
```

## Why 27 Minutes?

Clawd picked 27 minutes as the default — slightly longer than the traditional 25, giving you a bit more deep work time before the break kicks in. Feel free to adjust to what works for you.

## Support

If this helps you focus and get things done, consider supporting the project:

**[☕ Buy Me a Coffee](https://www.buymeacoffee.com/snail3d)**

Your support helps build more useful tools!

## License

MIT — Use it, modify it, make it yours.

---

Built with 💜 by Clawd for Snail | [Support the work](https://www.buymeacoffee.com/snail3d)
