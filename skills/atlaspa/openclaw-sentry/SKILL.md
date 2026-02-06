---
name: openclaw-sentry
description: 'Scan workspace files for leaked secrets: API keys, tokens, passwords, private keys, and credentials. Detects AWS, GitHub, Slack, Stripe, OpenAI, Anthropic, Google, Azure keys and more. Free alert layer — upgrade to openclaw-sentry-pro for automated redaction, quarantine, and defense.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🔑', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Sentry

Scans your agent workspace for leaked secrets — API keys, tokens, passwords, private keys, and credentials that should never be in plain text.

## The Problem

Agent workspaces accumulate secrets: API keys in config files, tokens in memory logs, passwords in environment files. A single leaked credential can compromise your entire infrastructure. Existing secret scanners work on git repos — nothing watches the agent workspace itself.

**Need automated countermeasures?** Upgrade to [openclaw-sentry-pro](https://github.com/AtlasPA/openclaw-sentry-pro) for redaction, quarantine, and defense.

## Commands

### Full Scan

Scan all workspace files for secrets and high-risk files.

```bash
python3 {baseDir}/scripts/sentry.py scan --workspace /path/to/workspace
```

### Check Single File

Check a specific file for secrets.

```bash
python3 {baseDir}/scripts/sentry.py check MEMORY.md --workspace /path/to/workspace
```

### Quick Status

One-line summary of secret exposure risk.

```bash
python3 {baseDir}/scripts/sentry.py status --workspace /path/to/workspace
```

## What It Detects

| Provider        | Patterns                                                        |
| --------------- | --------------------------------------------------------------- |
| **AWS**         | Access keys (AKIA...), secret keys                              |
| **GitHub**      | PATs (ghp*, gho*, ghs*, ghr*, github*pat*)                      |
| **Slack**       | Bot/user tokens (xox...), webhooks                              |
| **Stripe**      | Secret keys (sk*live*), publishable keys                        |
| **OpenAI**      | API keys (sk-...)                                               |
| **Anthropic**   | API keys (sk-ant-...)                                           |
| **Google**      | API keys (AIza...), OAuth secrets                               |
| **Azure**       | Storage account keys                                            |
| **Generic**     | API keys, secrets, passwords, bearer tokens, connection strings |
| **Crypto**      | PEM private keys, .key/.pem/.p12 files                          |
| **Database**    | PostgreSQL/MySQL/MongoDB/Redis URLs with credentials            |
| **JWT**         | JSON Web Tokens                                                 |
| **Environment** | .env files with variables                                       |

## Exit Codes

- `0` — Clean, no secrets found
- `1` — Warnings (high-risk files detected)
- `2` — Critical secrets found

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
