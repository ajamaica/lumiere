# 📸 Terminal Screenshots

> An AI agent skill for creating terminal screenshots and recordings with VHS

This skill teaches AI agents how to generate beautiful terminal screenshots and animated GIFs using [VHS](https://github.com/charmbracelet/vhs) from Charmbracelet.

## What's This For?

When AI agents need to:

- Create terminal screenshots for documentation
- Record animated GIFs of CLI demos
- Generate video tutorials for command-line tools
- Produce consistent, reproducible terminal visuals

## Quick Example

```tape
Output demo.gif

Set Width 1000
Set Height 500
Set FontSize 20
Set Theme "Dracula"

Type "echo 'Hello from VHS!'"
Enter
Sleep 2s
```

Run with:

```bash
vhs demo.gif
```

## Installation

```bash
# macOS/Linux (Homebrew)
brew install vhs

# Fedora/RHEL
sudo dnf install vhs ffmpeg

# Or use Docker
docker run --rm -v $PWD:/vhs ghcr.io/charmbracelet/vhs demo.tape
```

## Documentation

See [SKILL.md](SKILL.md) for the complete reference including:

- Tape file syntax
- All available settings
- Command reference
- Tips for clean output
- Example workflows

## Example Files

- [`basic-screenshot.tape`](basic-screenshot.tape) - Simple static screenshot
- [`demo-recording.tape`](demo-recording.tape) - Animated GIF demo

## Using as an Agent Skill

This skill is designed for [OpenClaw](https://github.com/openclaw/openclaw) and similar AI agent frameworks.

Add to your skills directory:

```bash
git clone https://github.com/ricardodantas/terminal-screenshots ~/.openclaw/workspace/skills/terminal-screenshots
```

The agent will automatically use this skill when creating terminal screenshots or recordings.

## License

[GPL-3.0](LICENSE)

## Credits

Built on top of the excellent [VHS](https://github.com/charmbracelet/vhs) by [Charmbracelet](https://charm.sh/).
