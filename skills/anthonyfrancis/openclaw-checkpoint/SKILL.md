---
name: openclaw-checkpoint
description: Backup and restore OpenClaw workspace state across machines using git. Enables disaster recovery by syncing SOUL.md, MEMORY.md, memory files, and configuration to a remote repository. Use when user wants to checkpoint their OpenClaw state, restore on a new machine, migrate between computers, or protect against data loss. Provides commands checkpoint-setup (interactive onboarding), checkpoint, checkpoint-resume, checkpoint-schedule (auto-backup), checkpoint-stop, checkpoint-status, checkpoint-init, and checkpoint-reset.
---

# OpenClaw Checkpoint Skill

Backup and restore your OpenClaw identity, memory, and configuration across machines.

**Platform:** macOS and Linux only. Windows is not supported.

## Overview

This skill provides disaster recovery for OpenClaw by syncing your workspace to a git repository. It preserves:

- **Identity**: SOUL.md, IDENTITY.md, USER.md (who you and the assistant are)
- **Memory**: MEMORY.md and memory/\*.md files (conversation history and context)
- **Configuration**: TOOLS.md, AGENTS.md, HEARTBEAT.md (tool setups and conventions)
- **Scripts**: Custom tools and automation you've built

**Not synced** (security): API keys (.env.\*), credentials, OAuth tokens

## Installation

### Option 1: One-Liner Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/AnthonyFrancis/openclaw-checkpoint/main/scripts/install-openclaw-checkpoint.sh | bash
```

This will:

- Download and install the skill
- Add commands to your PATH automatically
- Offer to run the interactive setup wizard

### Option 2: Manual Install

```bash
# Clone the skill repo
git clone https://github.com/AnthonyFrancis/openclaw-checkpoint.git ~/.openclaw/skills/openclaw-checkpoint

# Copy scripts to tools directory
mkdir -p ~/.openclaw/workspace/tools
cp ~/.openclaw/skills/openclaw-checkpoint/scripts/checkpoint* ~/.openclaw/workspace/tools/
chmod +x ~/.openclaw/workspace/tools/checkpoint*

# Add to PATH (also add to ~/.zshrc or ~/.bashrc for persistence)
export PATH="${HOME}/.openclaw/workspace/tools:${PATH}"

# Run setup wizard
checkpoint-setup
```

## Commands

### checkpoint-setup

**Interactive onboarding flow for first-time setup.**

```bash
checkpoint-setup
```

**What it does:**

- Guides you through creating a PRIVATE GitHub repository
- Sets up SSH authentication (recommended) or Personal Access Token
- Automatically detects if SSH key is already authorized on GitHub
- Generates a README.md with recovery instructions and commands
- Commits ALL workspace files (not just .gitignore)
- Configures automatic backups
- Tests the backup system
- Shows final status

**When to use:**

- First time setting up checkpoint system
- After installing the skill
- After running `checkpoint-reset`
- Recommended starting point for new users

### checkpoint-auth

**Authenticate with GitHub (browser-based).**

```bash
checkpoint-auth
```

**What it does:**

- Option 1: GitHub CLI (opens browser automatically)
- Option 2: Personal Access Token (expires, needs renewal)
- Option 3: SSH Key (recommended - no token expiry)
- Automatically adds GitHub to known_hosts
- Tests authentication after setup

**When to use:**

- Authentication expired or failed
- Switching authentication methods
- Setting up on a new machine

**SSH is recommended** because:

- No token expiration to worry about
- Works reliably without password prompts
- GitHub no longer accepts password authentication for HTTPS

### checkpoint

Save current state to remote repository.

```bash
checkpoint
```

**What it does:**

- Commits all changes in ~/.openclaw/workspace
- Pushes to origin/main
- Shows commit hash and timestamp

**When to use:**

- Before switching computers
- After significant changes (new memory, updated SOUL.md)
- Any time you want to ensure changes are saved

### checkpoint-schedule

Set up automatic backups with configurable frequency.

```bash
checkpoint-schedule 15min      # Every 15 minutes
checkpoint-schedule 30min      # Every 30 minutes
checkpoint-schedule hourly     # Every hour (default)
checkpoint-schedule 2hours     # Every 2 hours
checkpoint-schedule 4hours     # Every 4 hours
checkpoint-schedule daily      # Once per day at 9am
checkpoint-schedule disable    # Turn off auto-backup
```

**What it does:**

- macOS: Creates launchd plist for reliable background backups
- Linux: Adds cron job for scheduled backups
- Logs all activity to ~/.openclaw/logs/checkpoint.log

**When to use:**

- First time setup: `checkpoint-schedule hourly`
- Change frequency: `checkpoint-schedule 15min`
- Stop backups: `checkpoint-schedule disable`

### checkpoint-status

Check backup health and status.

```bash
checkpoint-status
```

**What it shows:**

- Last backup time and commit
- Whether local is behind remote
- Uncommitted changes
- Auto-backup schedule status
- Recent backup activity log

**When to use:**

- Before switching machines (verify synced)
- Troubleshooting backup issues
- Regular health checks

### checkpoint-resume

Restore state from remote repository, with first-time onboarding.

```bash
checkpoint-resume          # Normal resume (or onboarding if not set up)
checkpoint-resume --force  # Discard local changes, pull remote
```

**What it does:**

- **First-time users:** Launches interactive restore onboarding flow
  - Guides you through GitHub authentication (SSH, GitHub CLI, or PAT)
  - Lets you specify your existing backup repository
  - Verifies access and restores your checkpoint
  - Handles merge/replace options if local files exist
- **Returning users:** Fetches and pulls latest changes from remote

**When to use:**

- Starting OpenClaw on a new machine
- After hardware failure/disaster
- When resuming work on different computer
- First-time restore from an existing backup

**Onboarding flow triggers when:**

- No workspace exists
- Workspace exists but not a git repository
- Git repository exists but no remote configured

### checkpoint-init

Initialize workspace for checkpoint system.

```bash
checkpoint-init
```

**What it does:**

- Creates git repository in ~/.openclaw/workspace
- Generates .gitignore (excludes secrets and ephemeral files)
- Creates initial commit

**When to use:**

- First time setting up checkpoint system
- After restoring from backup to new machine

### checkpoint-reset

Reset checkpoint system for fresh setup.

```bash
checkpoint-reset
```

**What it does:**

- Option 1: Removes local git repository only (keeps SSH keys)
- Option 2: Removes everything (git repo + SSH keys + GitHub from known_hosts)
- Reminds you to delete the GitHub repo manually

**When to use:**

- Starting over with a fresh setup
- Switching to a different GitHub repository
- Troubleshooting persistent authentication issues

### checkpoint-stop

Stop automatic backups.

```bash
checkpoint-stop
```

**What it does:**

- Disables scheduled automatic backups
- Removes cron job (Linux) or launchd agent (macOS)

**When to use:**

- Temporarily pausing backups
- Before making major workspace changes
- If backups are causing issues

**To restart:** `checkpoint-schedule hourly` (or any frequency)

## Setup

### Easy Setup (Recommended)

Just run the interactive wizard:

```bash
checkpoint-setup
```

This handles everything: git init, SSH keys, GitHub setup, and first backup.

### First Time Setup (Manual)

```bash
# 1. Initialize checkpoint system
checkpoint-init

# 2. Create PRIVATE GitHub repository
# Go to https://github.com/new
# Name: openclaw-state
# ⚠️  Visibility: PRIVATE (important - contains your personal data!)

# 3. Add remote (use SSH, not HTTPS)
cd ~/.openclaw/workspace
git remote add origin git@github.com:YOURUSER/openclaw-state.git
checkpoint
```

### Setup on Second Machine

**Option 1: Interactive Restore (Recommended)**

```bash
# Install the checkpoint skill first
curl -fsSL https://raw.githubusercontent.com/AnthonyFrancis/openclaw-checkpoint/main/scripts/install-openclaw-checkpoint.sh | bash

# Run checkpoint-resume - it will guide you through the entire process
checkpoint-resume
```

This will:

- Help you authenticate with GitHub (if not already)
- Ask for your backup repository details
- Clone/restore your checkpoint automatically

**Option 2: Manual Clone**

```bash
# 1. Clone repository (use SSH)
git clone git@github.com:YOURUSER/openclaw-state.git ~/.openclaw/workspace

# 2. Restore secrets from 1Password/password manager
# Create ~/.openclaw/workspace/.env.thisweek
# Create ~/.openclaw/workspace/.env.stripe
# (Copy from secure storage)

# 3. Start OpenClaw
openclaw gateway start
```

## Automated Backups

### Easy Setup (Recommended)

```bash
# Enable hourly backups
checkpoint-schedule hourly

# Or choose your frequency:
checkpoint-schedule 15min   # Every 15 minutes - high activity
checkpoint-schedule 30min   # Every 30 minutes - medium activity
checkpoint-schedule 2hours  # Every 2 hours - low activity
checkpoint-schedule daily   # Once per day - minimal activity
```

### Check Status

```bash
checkpoint-status
```

Shows:

- Last backup time
- Whether synced with remote
- Auto-backup schedule
- Recent activity log

### Manual Cron Setup (Advanced)

If you prefer manual cron:

```bash
# Edit crontab
crontab -e

# Add line for hourly backups:
0 * * * * /Users/$(whoami)/.openclaw/workspace/skills/openclaw-checkpoint/scripts/checkpoint >> ~/.openclaw/logs/checkpoint.log 2>&1
```

## Disaster Recovery Workflow

**Scenario: Home server dies**

```bash
# On new machine:

# 1. Install OpenClaw
brew install openclaw  # or your install method

# 2. Install checkpoint skill and run interactive restore
curl -fsSL https://raw.githubusercontent.com/AnthonyFrancis/openclaw-checkpoint/main/scripts/install-openclaw-checkpoint.sh | bash
checkpoint-resume
# Follow the interactive prompts to:
# - Authenticate with GitHub
# - Enter your backup repository (e.g., YOURUSER/openclaw-state)
# - Restore your checkpoint

# 3. Restore secrets from 1Password (API keys are not backed up for security)
cat > ~/.openclaw/workspace/.env.thisweek << 'EOF'
THISWEEK_API_KEY=your_key_here
EOF

# 4. Enable automatic backups on this machine
checkpoint-schedule hourly

# 5. Start OpenClaw
openclaw gateway start

# 6. Verify
# Ask assistant: "What were we working on?"
# Should recall everything up to last checkpoint
```

## Security Considerations

### ⚠️ CRITICAL: Repository MUST be PRIVATE

Your backup contains sensitive personal data:

- SOUL.md, MEMORY.md (your identity & memories)
- Personal notes and conversation history
- Custom scripts and configurations

**If you make the repo public, anyone can see your data!**

**What gets backed up:**

- ✅ Memory files (conversation history)
- ✅ Identity files (SOUL.md, etc.)
- ✅ Scripts and tools
- ✅ Configuration

**What does NOT get backed up:**

- ❌ API keys (.env.\*) — keep in 1Password
- ❌ OAuth tokens — re-authenticate on new machine
- ❌ Downloaded media — ephemeral
- ❌ Temporary files — ephemeral

**Best practices:**

- **Always use a PRIVATE repository**
- Use SSH authentication (no token expiry)
- Store API keys in password manager, not in backed-up files
- Enable 2FA on GitHub account
- Consider encrypting sensitive notes before adding to memory

## Troubleshooting

### "Not a git repository" or "'origin' does not appear to be a git repository"

Running `checkpoint-resume` will now automatically start the interactive restore onboarding flow to help you connect to your backup repository. Alternatively, run `checkpoint-setup` to create a new backup from scratch.

### "Failed to push checkpoint"

Another machine pushed changes. Run `checkpoint-resume` first, then `checkpoint`.

### "You have uncommitted changes"

You have local work that isn't checkpointed. Either:

- Run `checkpoint` to save it first
- Or `checkpoint-resume --force` to discard it

### Behind remote after resume

This is expected if another machine checkpointed since you last synced.

### GitHub prompting for username/password

GitHub no longer accepts password authentication for HTTPS. Switch to SSH:

```bash
cd ~/.openclaw/workspace
git remote set-url origin git@github.com:YOURUSER/REPO.git
```

### "Host key verification failed"

GitHub's SSH host key isn't in your known_hosts. Fix with:

```bash
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
```

### "Permission denied (publickey)"

Your SSH key isn't added to GitHub. Run `checkpoint-auth` and choose SSH option.

### GitHub repo is empty after setup

The old `checkpoint-init` only committed `.gitignore`. This is fixed now. Run:

```bash
cd ~/.openclaw/workspace && git add -A && git commit -m "Full backup" && git push
```

### Starting fresh

Run `checkpoint-reset` to remove local git repo and optionally SSH keys, then `checkpoint-setup`.

## Limitations

- **Single machine at a time**: Don't run OpenClaw on multiple machines simultaneously
- **Max data loss**: 1 hour if using hourly backups (cron)
- **Secrets not synced**: Must restore API keys manually on new machine
- **Large files**: GitHub has 100MB file limit (your text files are fine)

## File Reference

See [references/setup.md](references/setup.md) for detailed setup instructions.
