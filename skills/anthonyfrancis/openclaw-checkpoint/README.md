# OpenClaw Checkpoint - Personal AI Assistant Backup & Recovery

> Backup and disaster recovery for [OpenClaw](https://github.com/openclaw/openclaw) workspaces

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: macOS | Linux](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-lightgrey.svg)]()

**Platform:** macOS and Linux only. Windows is not supported.

Automatically sync your OpenClaw agent's identity, memory, and configuration to GitHub. Never lose your agent's state again.

## What Gets Backed Up

| Backed Up                            | Not Backed Up (Security) |
| ------------------------------------ | ------------------------ |
| ✅ SOUL.md, IDENTITY.md, USER.md     | ❌ API keys (.env.\*)    |
| ✅ MEMORY.md, memory/\*.md           | ❌ OAuth tokens          |
| ✅ TOOLS.md, AGENTS.md, HEARTBEAT.md | ❌ Credentials           |
| ✅ Custom scripts and tools          | ❌ Temporary files       |

## Quick Start

### One-Liner Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/AnthonyFrancis/openclaw-checkpoint/main/scripts/install-openclaw-checkpoint.sh | bash
```

This will:

- Download and install the skill
- Add commands to your PATH automatically
- Offer to run the setup wizard

### Manual Install

```bash
# Clone this repo
git clone https://github.com/AnthonyFrancis/openclaw-checkpoint.git ~/.openclaw/skills/openclaw-checkpoint

# Copy scripts to your tools directory
mkdir -p ~/.openclaw/workspace/tools
cp ~/.openclaw/skills/openclaw-checkpoint/scripts/checkpoint* ~/.openclaw/workspace/tools/
chmod +x ~/.openclaw/workspace/tools/checkpoint*

# Add to PATH (add to ~/.zshrc or ~/.bashrc for persistence)
export PATH="${HOME}/.openclaw/workspace/tools:${PATH}"

# Run setup
checkpoint-setup
```

The interactive wizard will:

1. Guide you through creating a **private** GitHub repo
2. Set up SSH authentication
3. Configure automatic backups
4. Test the backup system

## Commands

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `checkpoint-setup`    | Interactive first-time setup wizard |
| `checkpoint`          | Backup now                          |
| `checkpoint-resume`   | Restore from backup                 |
| `checkpoint-auth`     | Fix authentication issues           |
| `checkpoint-status`   | Check backup health                 |
| `checkpoint-schedule` | Configure auto-backup frequency     |
| `checkpoint-stop`     | Stop automatic backups              |
| `checkpoint-reset`    | Reset for fresh setup               |

### Auto-Backup Options

```bash
checkpoint-schedule 15min    # Every 15 minutes
checkpoint-schedule 30min    # Every 30 minutes
checkpoint-schedule hourly   # Every hour (default)
checkpoint-schedule 2hours   # Every 2 hours
checkpoint-schedule daily    # Once per day
checkpoint-schedule disable  # Turn off
```

## Disaster Recovery

When your machine dies:

```bash
# On new machine:

# 1. Clone your backup
git clone git@github.com:YOURUSER/openclaw-state.git ~/.openclaw/workspace

# 2. Restore API keys from your password manager
# (secrets are not backed up for security)

# 3. Start OpenClaw
openclaw gateway start
```

Your agent will remember everything up to the last checkpoint.

## ⚠️ Security: Use a PRIVATE Repository

Your backup contains personal data:

- Agent identity and personality
- Conversation history and memories
- Personal notes and configurations

**Always use a private GitHub repository for your backup.**

## Requirements

- macOS or Linux (Windows is not supported)
- Git
- SSH key or GitHub Personal Access Token
- A **private** GitHub repository for storing backups

## How It Works

1. **checkpoint-init** creates a git repo in `~/.openclaw/workspace`
2. **checkpoint** commits and pushes changes to GitHub
3. **checkpoint-schedule** sets up cron (Linux) or launchd (macOS) for auto-backups
4. **checkpoint-resume** pulls the latest backup from GitHub

## Troubleshooting

<details>
<summary><strong>"Not a git repository"</strong></summary>

Run `checkpoint-setup` for guided setup, or `checkpoint-init` to initialize manually.

</details>

<details>
<summary><strong>"Failed to push checkpoint"</strong></summary>

Another machine pushed changes. Run `checkpoint-resume` first, then `checkpoint`.

</details>

<details>
<summary><strong>GitHub prompting for password</strong></summary>

GitHub no longer accepts passwords. Switch to SSH:

```bash
cd ~/.openclaw/workspace
git remote set-url origin git@github.com:USER/REPO.git
```

</details>

<details>
<summary><strong>"Permission denied (publickey)"</strong></summary>

Your SSH key isn't added to GitHub. Run `checkpoint-auth` to set up SSH authentication.

</details>

## About

This is a community skill for [OpenClaw](https://github.com/openclaw/openclaw), an AI agent framework. It's not officially affiliated with the OpenClaw project.

## License

MIT
