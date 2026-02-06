---
name: simple-backup
description: Backup agent brain (workspace) and body (state) to local folder and optionally sync to cloud via rclone.
metadata: {"openclaw":{"emoji":"💾","requires":{"bins":["rclone","gpg","tar","jq"]}}}
---

# Simple Backup

A robust backup script that:
1.  **Auto-detects** workspace and state directories from OpenClaw config
2.  **Allows overrides** for custom/non-standard setups
3.  **Compresses & encrypts** using GPG (AES256)
4.  **Prunes** old backups (Daily/Hourly retention)
5.  **Syncs** to cloud via `rclone` (optional)

## Setup

1.  **Dependencies:**
    ```bash
    brew install rclone gnupg jq
    ```

2.  **Password:** Set encryption password (choose one):
    - File: `~/.openclaw/credentials/backup.key` (recommended)
    - Env: `export BACKUP_PASSWORD="secret"`
    - Config: Add `"password": "secret"` to skill config

3.  **Cloud (Optional):**
    ```bash
    rclone config
    ```

## Usage

```bash
simple-backup
```

## Auto-Detection

By default, paths are auto-detected from `~/.openclaw/openclaw.json`:
- **Workspace:** `agents.defaults.workspace`
- **State:** `~/.openclaw` (where config lives)
- **Backup root:** `<workspace>/BACKUPS`

## Custom Configuration

For non-standard setups, override any path in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "simple-backup": {
        "config": {
          "workspaceDir": "/custom/path/workspace",
          "stateDir": "/custom/path/state",
          "skillsDir": "/custom/path/skills",
          "backupRoot": "/custom/path/backups",
          "remoteDest": "gdrive:backups"
        }
      }
    }
  }
}
```

## Configuration Reference

| Config Key | Env Var | Auto-Detected | Description |
|------------|---------|---------------|-------------|
| `workspaceDir` | `BRAIN_DIR` | `agents.defaults.workspace` | Agent workspace |
| `stateDir` | `BODY_DIR` | `~/.openclaw` | OpenClaw state dir |
| `skillsDir` | `SKILLS_DIR` | `~/openclaw/skills` | Skills directory |
| `backupRoot` | `BACKUP_ROOT` | `<workspace>/BACKUPS` | Local backup storage |
| `remoteDest` | `REMOTE_DEST` | (none) | Rclone remote path |
| `maxDays` | `MAX_DAYS` | 7 | Days to keep daily backups |
| `hourlyRetentionHours` | `HOURLY_RETENTION_HOURS` | 24 | Hours to keep hourly |
| `password` | `BACKUP_PASSWORD` | (none) | Encryption password |

**Priority:** Config file → Env var → Auto-detect
