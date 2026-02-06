# OpenClaw Sentry Pro

Full secret scanning suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-sentry](https://github.com/AtlasPA/openclaw-sentry) (free) **plus automated countermeasures**: secret redaction, file quarantine, .gitignore enforcement, and one-command protection sweeps.

## Free Version Detects. Pro Version Eliminates.

| Feature                                      | Free | Pro     |
| -------------------------------------------- | ---- | ------- |
| Secret detection (25+ patterns)              | Yes  | Yes     |
| High-risk file detection                     | Yes  | Yes     |
| .env file scanning                           | Yes  | Yes     |
| .gitignore gap analysis                      | Yes  | Yes     |
| **Auto-redact secrets in files**             | -    | **Yes** |
| **Quarantine exposed files**                 | -    | **Yes** |
| **Unquarantine restored files**              | -    | **Yes** |
| **Auto-generate .gitignore rules**           | -    | **Yes** |
| **Enforcement policy (.sentry-policy.json)** | -    | **Yes** |
| **Automated protect sweep**                  | -    | **Yes** |
| **Session startup hook**                     | -    | **Yes** |

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-sentry-pro.git

# Copy to your workspace skills directory
cp -r openclaw-sentry-pro ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Full secret scan
python3 scripts/sentry.py scan

# Check a single file
python3 scripts/sentry.py check MEMORY.md

# Quick status
python3 scripts/sentry.py status

# Redact secrets in a specific file (creates .bak backup)
python3 scripts/sentry.py redact config.json

# Redact secrets in ALL workspace files
python3 scripts/sentry.py redact

# Quarantine a file containing secrets
python3 scripts/sentry.py quarantine .env

# Restore a quarantined file
python3 scripts/sentry.py unquarantine .env

# Update .gitignore + create enforcement policy
python3 scripts/sentry.py defend

# AUTO-DETECT AND AUTO-RESPOND TO SECRETS (recommended)
python3 scripts/sentry.py protect
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## Countermeasures

| Command               | Action                                                        |
| --------------------- | ------------------------------------------------------------- |
| `protect`             | Full scan + auto-redact + auto-quarantine + update .gitignore |
| `redact [file]`       | Replace secrets with masked versions, backup originals        |
| `quarantine <file>`   | Move file to `.quarantine/sentry/` with metadata              |
| `unquarantine <file>` | Restore a quarantined file to original location               |
| `defend`              | Update .gitignore + create `.sentry-policy.json`              |

### How `protect` Works

1. **Scan** all workspace files for secrets (25+ patterns)
2. **Redact** secrets in non-critical files (creates .bak backups)
3. **Quarantine** high-risk files (.env, .pem, .key) and files with high-density secrets
4. **Defend** by updating .gitignore and enforcement policy

### Redaction

Secrets are replaced with recognizable masked versions:

- `sk-ant-abc123...xyz` becomes `sk-ant-***REDACTED***`
- `ghp_abc123...xyz` becomes `ghp_***REDACTED***`
- Original files are always backed up with `.bak` extension

### Quarantine

Files moved to `.quarantine/sentry/` with a `.meta.json` sidecar recording:

- Original file path
- Timestamp
- Reason for quarantine
- All findings (type, severity, line, detail)

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
            "command": "python3 scripts/sentry.py protect",
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
- Run secret scanning protection
```

### After Adding New Configs

Run `protect` to auto-redact and quarantine any newly exposed credentials.

## What It Detects

- **AWS** -- Access keys (AKIA...), secret access keys
- **GitHub** -- Personal access tokens (ghp*, gho*, ghs*, ghr*, github*pat*)
- **Slack** -- Bot/user tokens (xox...), webhook URLs
- **Stripe** -- Secret keys (sk*live*), publishable keys (pk*live*)
- **OpenAI** -- API keys (sk-...)
- **Anthropic** -- API keys (sk-ant-...)
- **Google** -- API keys (AIza...), OAuth client secrets
- **Azure** -- Storage account keys
- **Generic** -- API keys, secrets, passwords, bearer tokens, connection strings
- **Private Keys** -- PEM files, .key/.pem/.p12/.pfx extensions
- **Database URLs** -- PostgreSQL, MySQL, MongoDB, Redis with credentials
- **JWT Tokens** -- JSON Web Tokens in plain text
- **Environment Files** -- .env files with variables
- **.gitignore gaps** -- Missing patterns for common secret files

## Exit Codes

| Code | Meaning                |
| ---- | ---------------------- |
| 0    | Clean                  |
| 1    | Warnings detected      |
| 2    | Critical secrets found |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
