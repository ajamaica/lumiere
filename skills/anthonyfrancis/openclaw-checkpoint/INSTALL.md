# Installation

## One-Liner Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/AnthonyFrancis/openclaw-checkpoint/main/scripts/install-openclaw-checkpoint.sh | bash
```

This will:

- Download the skill from GitHub
- Add commands to your PATH
- Offer to run the setup wizard

## Manual Install

```bash
git clone https://github.com/AnthonyFrancis/openclaw-checkpoint.git ~/.openclaw/skills/openclaw-checkpoint

mkdir -p ~/.openclaw/workspace/tools
cp ~/.openclaw/skills/openclaw-checkpoint/scripts/checkpoint* ~/.openclaw/workspace/tools/
chmod +x ~/.openclaw/workspace/tools/checkpoint*

export PATH="${HOME}/.openclaw/workspace/tools:${PATH}"

checkpoint-setup
```

Add the `export PATH` line to your `~/.zshrc` or `~/.bashrc` for persistence.

## Requirements

- macOS or Linux (Windows not supported)
- Git
- GitHub account (for private backup repository)

## After Installation

### New Setup (First Time)

Run the setup wizard to create a new backup:

```bash
checkpoint-setup
```

This guides you through creating a private GitHub repo and configuring automatic backups.

### Restore from Existing Backup

If you already have a checkpoint backup on GitHub (e.g., setting up a new machine):

```bash
checkpoint-resume
```

This launches an interactive restore wizard that:

- Helps you authenticate with GitHub
- Connects to your existing backup repository
- Restores your OpenClaw state

## Commands Available After Install

| Command               | Description                  |
| --------------------- | ---------------------------- |
| `checkpoint-setup`    | Interactive first-time setup |
| `checkpoint`          | Backup now                   |
| `checkpoint-resume`   | Restore from backup          |
| `checkpoint-status`   | Check backup health          |
| `checkpoint-schedule` | Configure auto-backup        |
| `checkpoint-stop`     | Stop automatic backups       |
| `checkpoint-auth`     | Fix authentication           |
| `checkpoint-reset`    | Reset for fresh setup        |

## More Information

Full documentation: [GitHub Repository](https://github.com/AnthonyFrancis/openclaw-checkpoint)
