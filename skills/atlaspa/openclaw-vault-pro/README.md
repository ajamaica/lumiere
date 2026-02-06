# OpenClaw Vault Pro

Full credential lifecycle security for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-vault](https://github.com/AtlasPA/openclaw-vault) (free) **plus automated countermeasures**: auto-fix permissions, quarantine exposed files, rotation tracking, git history scanning, and one-command protection sweeps.

## Free Version Detects. Pro Version Defends.

| Feature                      | Free | Pro     |
| ---------------------------- | ---- | ------- |
| Full credential audit        | Yes  | Yes     |
| Exposure vector detection    | Yes  | Yes     |
| Credential inventory         | Yes  | Yes     |
| Staleness detection          | Yes  | Yes     |
| Permission analysis          | Yes  | Yes     |
| **Auto-fix permissions**     | -    | **Yes** |
| **Quarantine exposed files** | -    | **Yes** |
| **Unquarantine (restore)**   | -    | **Yes** |
| **Rotation schedule**        | -    | **Yes** |
| **Git history scanning**     | -    | **Yes** |
| **Automated protect sweep**  | -    | **Yes** |
| **Session startup hook**     | -    | **Yes** |

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-vault-pro.git

# Copy to your workspace skills directory
cp -r openclaw-vault-pro ~/.openclaw/workspace/skills/
```

## Usage

```bash
# --- Detection (also in free) ---

# Full credential audit
python3 scripts/vault.py audit

# Check exposure vectors
python3 scripts/vault.py exposure

# Credential inventory
python3 scripts/vault.py inventory

# Quick status
python3 scripts/vault.py status

# --- Pro Countermeasures ---

# Auto-fix permissions on all credential files
python3 scripts/vault.py fix-permissions

# Quarantine an exposed credential file
python3 scripts/vault.py quarantine .env.production

# Restore a quarantined file
python3 scripts/vault.py unquarantine .env.production

# Check credential rotation schedule
python3 scripts/vault.py rotate-check
python3 scripts/vault.py rotate-check --max-age 60

# Scan git history for committed credentials
python3 scripts/vault.py gitguard

# FULL AUTOMATED PROTECTION (recommended for session startup)
python3 scripts/vault.py protect
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## Pro Countermeasures

| Command               | Action                                                             |
| --------------------- | ------------------------------------------------------------------ |
| `fix-permissions`     | Set all credential files to owner-only access (chmod 600 / icacls) |
| `quarantine <file>`   | Move exposed credential to `.quarantine/vault/` with metadata      |
| `unquarantine <file>` | Restore a quarantined file to its original location                |
| `rotate-check`        | Generate rotation schedule based on credential file ages           |
| `gitguard`            | Scan git history for accidentally committed credentials            |
| `protect`             | Full sweep: audit + fix permissions + quarantine + rotation check  |

## What It Detects

### Credential Audit

- `.env` files with world-readable or group-readable permissions
- Credentials leaked in shell history (`.bash_history`, `.zsh_history`, `.python_history`)
- Credentials embedded in git config (remote URLs, plaintext credential helpers)
- Hardcoded credentials in config files (JSON, YAML, TOML, INI)
- Credentials accidentally logged in `.log` files
- Missing `.gitignore` patterns for credential files
- Stale credential files older than 90 days (rotation needed)

### Exposure Vectors

- `.env` files without restrictive permissions
- Credential files in publicly accessible directories (`public/`, `static/`, `www/`)
- Git repos with credential files that may be in commit history
- Docker/container configs with hardcoded secrets (`ENV`, `ARG`)
- Shell aliases or functions containing credentials (`.bashrc`, `.zshrc`)
- Credentials in URL query parameters in code (visible in logs and browser history)

### Pro: Automated Response

- **Fix Permissions** -- Automatically restricts credential files to owner-only access
- **Quarantine** -- Moves high-risk exposed files out of harm's way with full metadata trail
- **Rotation Schedule** -- Tracks credential age against configurable thresholds (default 90 days)
- **Git Guard** -- Deep scan of git history for credential files added then removed
- **Protect** -- One-command sweep that audits, fixes, quarantines, and reports

## Session Startup Integration

### Claude Code (hooks)

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 scripts/vault.py protect",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### OpenClaw (heartbeat)

Add to HEARTBEAT.md:

```
- Run credential protection sweep
```

## Exit Codes

| Code | Meaning                 |
| ---- | ----------------------- |
| 0    | Clean                   |
| 1    | Warnings detected       |
| 2    | Critical exposure found |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
