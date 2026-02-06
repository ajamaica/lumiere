# Claw Sync

Secure, versioned sync for OpenClaw memory files and custom skills.

## Features

- 🏷️ **Versioned**: Each sync creates a tagged version you can restore
- 💾 **Disaster Recovery**: Local backup created before every restore
- 🔒 **Secure**: Config files NOT synced, URL validation, path protection
- 🖥️ **Cross-platform**: Works on Windows, Mac, Linux

## Quick Start

```bash
/sync              # Push to remote
/restore           # Restore latest
/sync-list         # List versions
/sync-status       # Check status
```

## What Gets Synced

| File          | Description           |
| ------------- | --------------------- |
| `MEMORY.md`   | Long-term memory      |
| `USER.md`     | User profile          |
| `SOUL.md`     | Agent persona         |
| `IDENTITY.md` | Agent identity        |
| `TOOLS.md`    | Tool configurations   |
| `AGENTS.md`   | Workspace conventions |
| `memory/*.md` | Daily logs            |
| `skills/*`    | Custom skills         |

## NOT Synced (security)

- `openclaw.json` - Contains API keys/tokens
- `.env` - Contains secrets

## Setup

Create `~/.openclaw/.backup.env`:

```bash
BACKUP_REPO=https://github.com/yourusername/your-sync-repo
BACKUP_TOKEN=ghp_your_fine_grained_personal_access_token
```

## All Commands

| Command                         | Description                      |
| ------------------------------- | -------------------------------- |
| `/sync`                         | Push memory and skills to remote |
| `/sync --dry-run`               | Preview what would be synced     |
| `/restore`                      | Restore latest version           |
| `/restore latest`               | Same as above                    |
| `/restore backup-20260202-1430` | Restore specific version         |
| `/restore --force`              | Skip confirmation                |
| `/sync-list`                    | List all available versions      |
| `/sync-status`                  | Show config and local backups    |

## CLI Usage

You can also run commands directly:

```bash
node index.js sync              # Push
node index.js sync --dry-run    # Preview
node index.js restore           # Restore latest
node index.js restore backup-20260202-1430   # Specific version
node index.js list              # List versions
node index.js status            # Check status
```

## Disaster Recovery

Local backup automatically created before every restore at:

```
~/.openclaw/.local-backup/<timestamp>/
```

## Restore on New Machine

1. Install OpenClaw
2. Clone this skill to `skills/claw-sync/`
3. Create `.backup.env` with repo and token
4. Run `/sync-list` to see versions
5. Run `/restore` to get latest
6. Configure API keys in `openclaw.json` and `.env`
7. Restart OpenClaw

## Security Features

- No config sync (secrets never leave your machine)
- URL validation (only GitHub/GitLab/Bitbucket)
- Path protection (blocks directory traversal)
- Token sanitization (never in error messages)
- Version validation (strict format checking)

## License

MIT
