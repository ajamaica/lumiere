---
name: openclaw-backup-optimized
description: 'Optimized OpenClaw backup skill for creating full snapshots with workspace archive splitting, change summaries, restore instructions, and Discord notifications. Use when you need to set up or run automated backups, configure backup cron jobs, or document/restore OpenClaw state. Triggers on backup automation, backup scripts, snapshot/restore, or GitHub backup repos.'
---

# OpenClaw Backup (Optimized)

## What this skill does

Use this skill to **install, configure, and run** the optimized OpenClaw backup workflow:

- Full snapshot of `~/.openclaw`
- Workspace archive split into ~90MB parts + SHA256
- Rich Discord notification (summary + restore steps)
- Retention of last N reports

## Files

- Script: `scripts/backup.js` (cross-platform)
- Reference config: `references/CONFIG.md`

## Install / Setup

1. Copy the script into your tools folder:

```bash
cp scripts/backup.js ~/.openclaw/workspace/tools/openclaw-backup.js
```

2. Configure env vars (see references/CONFIG.md):

**macOS/Linux (bash/zsh):**

```bash
export OPENCLAW_HOME="$HOME/.openclaw"
export OPENCLAW_BACKUP_DIR="$HOME/.openclaw-backup"
export BACKUP_REPO_URL="https://github.com/your/repo.git"
export BACKUP_CHANNEL_ID="1234567890"
export BACKUP_TZ="America/Sao_Paulo"
export BACKUP_MAX_HISTORY=7
```

**Windows (PowerShell):**

```powershell
$env:OPENCLAW_HOME="$env:USERPROFILE\.openclaw"
$env:OPENCLAW_BACKUP_DIR="$env:USERPROFILE\.openclaw-backup"
$env:BACKUP_REPO_URL="https://github.com/your/repo.git"
$env:BACKUP_CHANNEL_ID="1234567890"
$env:BACKUP_TZ="America/Sao_Paulo"
$env:BACKUP_MAX_HISTORY="7"
```

3. Run once:

```bash
node ~/.openclaw/workspace/tools/openclaw-backup.js
```

4. Create cron (OpenClaw cron runs in the gateway environment):

```bash
openclaw cron add --name "openclaw-backup-daily" \
  --cron "0 5,10,15,20 * * *" --tz "America/Sao_Paulo" \
  --exec "node ~/.openclaw/workspace/tools/openclaw-backup.js"
```

## Restore

Use the restore instructions printed in the backup notification.

## Notes

- Excludes noisy session lock/deleted files for smaller diffs.
- Requires `git` and `node` (>=18).
- Uses `openclaw message send` for notifications (no webhook).
- `scripts/openclaw-backup.sh` is legacy (Linux/macOS) and will be removed; use `backup.js`.
