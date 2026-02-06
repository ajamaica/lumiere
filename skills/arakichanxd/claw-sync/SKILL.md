---
name: claw-sync
description: Secure sync for OpenClaw memory and workspace. Use /sync to push, /restore to pull, /sync-status to check. Supports versioned backups and disaster recovery.
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
    description: Show sync configuration and local backups
    usage: /sync-status
    run: node skills/claw-sync/index.js status
  - name: sync-list
    description: List all available backup versions
    usage: /sync-list
    run: node skills/claw-sync/index.js list
---

# Claw Sync

Secure, versioned sync for OpenClaw memory and workspace.

## Commands

### /sync

Push your memory and skills to the remote repository.

```
/sync              → Push and create versioned backup
/sync --dry-run    → Preview what would be synced
```

### /restore

Restore memory and skills from the remote repository.

```
/restore                        → Restore latest version
/restore latest                 → Same as above
/restore backup-20260202-1430   → Restore specific version
/restore latest --force         → Skip confirmation
```

### /sync-status

Show sync configuration and local backup info.

```
/sync-status
```

### /sync-list

List all available backup versions.

```
/sync-list
```

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

## Setup Required

Create `~/.openclaw/.backup.env`:

```
BACKUP_REPO=https://github.com/username/your-repo
BACKUP_TOKEN=ghp_your_token
```

## Features

- 🏷️ **Versioned** - Each sync creates a restorable version
- 💾 **Disaster Recovery** - Local backup before every restore
- 🔒 **Secure** - No config files synced, token sanitization
- 🖥️ **Cross-platform** - Windows, Mac, Linux
