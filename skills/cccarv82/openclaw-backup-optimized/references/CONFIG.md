# Backup skill configuration

## Environment variables

- `OPENCLAW_HOME`: OpenClaw home path (default `~/.openclaw`)
- `OPENCLAW_BACKUP_DIR`: backup destination (default `~/.openclaw-backup`)
- `BACKUP_REPO_URL`: git repo for push (e.g., https://github.com/cccarv82/openclaw-backup.git)
- `BACKUP_CHANNEL_ID`: Discord channel id for notifications (optional)
- `BACKUP_TZ`: timezone (default America/Sao_Paulo)
- `BACKUP_MAX_HISTORY`: local history retention (default 7)

## Requirements

- Node.js >= 18
- git
- tar or zip (for workspace archive)

## Policies

- Excludes `media/inbound`
- Excludes `agents/main/sessions/*.jsonl.lock`
- Excludes `agents/main/sessions/*.jsonl.deleted.*`
- Workspace archive is split into parts (~90MB)

## Suggested cron

0 5,10,15,20 \* \* \* (America/Sao_Paulo)

## Restore

Use the block generated in the backup notification.
