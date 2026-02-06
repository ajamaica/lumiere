# OpenClaw Sentry

Secret scanner for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Scans workspace files for leaked API keys, tokens, passwords, private keys, and credentials — the secrets that agent workspaces silently accumulate.

**Want automated countermeasures?** Upgrade to Pro — auto-redaction, quarantine, and defense. [Get Pro access](https://github.com/sponsors/AtlasPA).

## The Problem

Agent workspaces accumulate secrets: API keys in config files, tokens in memory logs, passwords in environment files. A single leaked credential can compromise your entire infrastructure. Existing secret scanners work on git repos — nothing watches the agent workspace itself.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-sentry.git

# Copy to your workspace skills directory
cp -r openclaw-sentry ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Full secret scan
python3 scripts/sentry.py scan

# Check a single file
python3 scripts/sentry.py check MEMORY.md

# Quick status
python3 scripts/sentry.py status
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## What It Detects

- **AWS** — Access keys (AKIA...), secret access keys
- **GitHub** — Personal access tokens (ghp*, gho*, ghs*, ghr*, github*pat*)
- **Slack** — Bot/user tokens (xox...), webhook URLs
- **Stripe** — Secret keys (sk*live*), publishable keys (pk*live*)
- **OpenAI** — API keys (sk-...)
- **Anthropic** — API keys (sk-ant-...)
- **Google** — API keys (AIza...), OAuth client secrets
- **Azure** — Storage account keys
- **Generic** — API keys, secrets, passwords, bearer tokens, connection strings
- **Private Keys** — PEM files, .key/.pem/.p12/.pfx extensions
- **Database URLs** — PostgreSQL, MySQL, MongoDB, Redis with credentials
- **JWT Tokens** — JSON Web Tokens in plain text
- **Environment Files** — .env files with variables
- **.gitignore gaps** — Missing patterns for common secret files

## Free vs Pro

| Feature                          | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| -------------------------------- | ---- | ------------------------------------------ |
| Secret detection (25+ patterns)  | Yes  | Yes                                        |
| High-risk file detection         | Yes  | Yes                                        |
| .env file scanning               | Yes  | Yes                                        |
| .gitignore gap analysis          | Yes  | Yes                                        |
| **Auto-redact secrets in files** | -    | Yes                                        |
| **Quarantine leaking skills**    | -    | Yes                                        |
| **Generate .gitignore rules**    | -    | Yes                                        |
| **Move .env to vault path**      | -    | Yes                                        |

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
