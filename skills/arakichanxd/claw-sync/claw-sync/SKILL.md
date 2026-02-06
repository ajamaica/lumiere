---
name: claw-sync
description: Secure sync for OpenClaw memory and workspace. Use /sync to push, /restore to pull, /sync-status to check. Supports versioned snapshots and disaster recovery.
version: 2.0.2
author: arakichanxd
repository: https://github.com/arakichanxd/Claw-Sync
tags:
  - sync
  - github
  - memory
  - skills
  - disaster-recovery
files:
  - name: SKILL.md
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/SKILL.md
  - name: README.md
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/README.md
  - name: index.js
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/index.js
  - name: package.json
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/package.json
  - name: config.example.env
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/config.example.env
  - name: scripts/push.js
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/push.js
  - name: scripts/pull.js
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/pull.js
  - name: scripts/status.js
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/status.js
  - name: scripts/setup-cron.js
    url: https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/setup-cron.js
commands:
  - name: sync
    description: Push memory and skills to remote repository
    usage: /sync [--dry-run]
    run: node skills/claw-sync/index.js sync
  - name: restore
    description: Restore memory and skills from remote
    usage: /restore [latest|<version>] [--force]
    run: node skills/claw-sync/index.js restore
  - name: sync-status
    description: Show sync configuration and local snapshots
    usage: /sync-status
    run: node skills/claw-sync/index.js status
  - name: sync-list
    description: List all available sync versions
    usage: /sync-list
    run: node skills/claw-sync/index.js list
---

# Claw Sync

Secure, versioned sync for OpenClaw memory and workspace to GitHub.

**Repository:** https://github.com/arakichanxd/Claw-Sync

## File References

| File                    | Description           | Link                                                                             |
| ----------------------- | --------------------- | -------------------------------------------------------------------------------- |
| `SKILL.md`              | AI agent instructions | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/SKILL.md)              |
| `README.md`             | User documentation    | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/README.md)             |
| `index.js`              | Command router        | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/index.js)              |
| `package.json`          | NPM config            | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/package.json)          |
| `scripts/push.js`       | Sync to remote        | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/push.js)       |
| `scripts/pull.js`       | Restore from remote   | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/pull.js)       |
| `scripts/status.js`     | Show status           | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/status.js)     |
| `scripts/setup-cron.js` | Auto-sync setup       | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/setup-cron.js) |

---

## Installation

### Step 1: Clone the skill

```bash
cd ~/.openclaw/workspace/skills
git clone https://github.com/arakichanxd/Claw-Sync.git claw-sync
```

### Step 2: Create a GitHub repository

1. Go to https://github.com/new
2. Create a **private** repository (e.g., `my-openclaw-sync`)
3. Leave it empty (no README)

### Step 3: Create a GitHub token

1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Name: `openclaw-sync`
4. Repository access: Select your sync repository
5. Permissions: Contents → Read and Write
6. Generate and copy the token

### Step 4: Configure the skill

Create file `~/.openclaw/.backup.env`:

```
BACKUP_REPO=https://github.com/YOUR_USERNAME/YOUR_REPO
BACKUP_TOKEN=ghp_YOUR_TOKEN_HERE
```

### Step 5: Test the setup

```bash
/sync-status
```

If configured correctly, you'll see ✅ Configured.

### Step 6: First sync

```bash
/sync
```

---

## Commands

### /sync

Push memory and skills to remote.

```
/sync              → Create versioned snapshot
/sync --dry-run    → Preview what would sync (no changes)
```

### /restore

Restore from remote.

```
/restore                        → Restore latest
/restore latest                 → Same as above
/restore backup-20260202-1430   → Restore specific version
/restore --force                → Skip confirmation
```

### /sync-status

Show configuration and local snapshots.

### /sync-list

List all available versions to restore.

---

## What Gets Synced

| File          | Description      |
| ------------- | ---------------- |
| `MEMORY.md`   | Long-term memory |
| `USER.md`     | User profile     |
| `SOUL.md`     | Agent persona    |
| `IDENTITY.md` | Agent identity   |
| `TOOLS.md`    | Tool configs     |
| `AGENTS.md`   | Workspace rules  |
| `memory/*.md` | Daily logs       |
| `skills/*`    | Custom skills    |

## NOT Synced (security)

- `openclaw.json` - Contains API keys
- `.env` - Contains secrets

---

## Troubleshooting

### "Sync not configured"

Create `~/.openclaw/.backup.env` with BACKUP_REPO and BACKUP_TOKEN.

### "Invalid repository URL"

URL must be HTTPS and from github.com, gitlab.com, or bitbucket.org.

### "Token appears too short"

Token must be at least 20 characters. Get a new one from GitHub.

### Clone failed

Check that your token has Contents read/write permission.

---

## Disaster Recovery

Before every restore, a local backup is automatically saved to:

```
~/.openclaw/.local-backup/<timestamp>/
```

If something goes wrong, manually copy files from there.

---

## Auto-Sync Setup

To sync automatically every 12 hours:

```bash
node skills/claw-sync/index.js setup
```

---

## Features

- 🏷️ **Versioned** - Each sync creates a restorable version (git tag)
- 💾 **Disaster Recovery** - Local backup before every restore
- 🔒 **Secure** - No config files synced, token sanitization
- 🖥️ **Cross-platform** - Windows, Mac, Linux

---

## Source Code

Full source: https://github.com/arakichanxd/Claw-Sync
