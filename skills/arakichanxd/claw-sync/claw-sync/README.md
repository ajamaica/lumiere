# Claw Sync

[![GitHub](https://img.shields.io/badge/GitHub-arakichanxd%2FClaw--Sync-blue?logo=github)](https://github.com/arakichanxd/Claw-Sync)
[![Version](https://img.shields.io/badge/version-2.0.2-green)](https://github.com/arakichanxd/Claw-Sync)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Secure, versioned sync for OpenClaw memory files and custom skills.

## Features

- 🏷️ **Versioned**: Each sync creates a tagged version you can restore
- 💾 **Disaster Recovery**: Local backup created before every restore
- 🔒 **Secure**: Config files NOT synced, URL validation, path protection
- 🖥️ **Cross-platform**: Works on Windows, Mac, Linux

## File References

| File                    | Description           | Link                                                                             |
| ----------------------- | --------------------- | -------------------------------------------------------------------------------- |
| `SKILL.md`              | AI agent instructions | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/SKILL.md)              |
| `README.md`             | User documentation    | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/README.md)             |
| `index.js`              | Command router        | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/index.js)              |
| `package.json`          | NPM config            | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/package.json)          |
| `config.example.env`    | Example config        | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/config.example.env)    |
| `scripts/push.js`       | Sync to remote        | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/push.js)       |
| `scripts/pull.js`       | Restore from remote   | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/pull.js)       |
| `scripts/status.js`     | Show status           | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/status.js)     |
| `scripts/setup-cron.js` | Auto-sync setup       | [View](https://github.com/arakichanxd/Claw-Sync/blob/main/scripts/setup-cron.js) |

## Installation

### From GitHub

```bash
cd ~/.openclaw/workspace/skills
git clone https://github.com/arakichanxd/Claw-Sync.git claw-sync
```

### From ClawHub

Search for "claw-sync" in ClawHub and install.

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

## Security Features

- No config sync (secrets never leave your machine)
- URL validation (only GitHub/GitLab/Bitbucket)
- Path protection (blocks directory traversal)
- Token sanitization (never in error messages)
- Version validation (strict format checking)

## Contributing

GitHub: https://github.com/arakichanxd/Claw-Sync

## License

MIT
