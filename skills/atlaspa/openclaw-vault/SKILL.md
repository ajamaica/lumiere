---
name: openclaw-vault
description: 'Credential lifecycle security for agent workspaces. Audit credential exposure, detect misconfigured permissions, inventory all secrets, and identify stale credentials needing rotation. Free alert layer — upgrade to openclaw-vault-pro for automated remediation, credential rotation, and access control.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🔐', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Vault

Protects your credential lifecycle — not just finding secrets in source code (that's what Sentry does), but tracking how credentials are exposed through services, permissions, history, configs, containers, and time.

## Why This Matters

Credentials don't just leak through source code. They leak through:

- **Permissions** — .env files readable by every user on the system
- **Shell history** — passwords and tokens visible in `.bash_history`
- **Git config** — credentials embedded in remote URLs
- **Config files** — hardcoded secrets in JSON/YAML/TOML/INI configs
- **Log files** — tokens accidentally logged during debugging
- **Docker configs** — secrets baked into container images
- **Staleness** — credentials that haven't been rotated in months

This skill watches the full credential lifecycle. Sentry finds secrets in files. Vault finds secrets that are _exposed_.

**Need automated remediation?** Upgrade to [openclaw-vault-pro](https://github.com/AtlasPA/openclaw-vault-pro) for auto-fix permissions, credential rotation reminders, access control policies, and secure credential injection.

## Commands

### Full Credential Audit

Comprehensive credential exposure audit: permission checks, shell history, git config, config file scanning, log file scanning, gitignore coverage, and staleness detection.

```bash
python3 {baseDir}/scripts/vault.py audit --workspace /path/to/workspace
```

### Exposure Check

Detect credential exposure vectors: misconfigured permissions, public directory exposure, git history risks, Docker credential embedding, shell alias leaks, and URL query parameter credentials in code.

```bash
python3 {baseDir}/scripts/vault.py exposure --workspace /path/to/workspace
```

### Credential Inventory

Build a structured inventory of all credential files in the workspace. Categorizes by type (API key, database URI, token, certificate, SSH key, password), tracks age, and flags stale or exposed credentials.

```bash
python3 {baseDir}/scripts/vault.py inventory --workspace /path/to/workspace
```

### Quick Status

One-line summary: credential count, exposure count, staleness warnings.

```bash
python3 {baseDir}/scripts/vault.py status --workspace /path/to/workspace
```

## Workspace Auto-Detection

If `--workspace` is omitted, the script tries:

1. `OPENCLAW_WORKSPACE` environment variable
2. Current directory (if AGENTS.md exists)
3. `~/.openclaw/workspace` (default)

## What It Checks

| Category          | Details                                                               |
| ----------------- | --------------------------------------------------------------------- |
| **Permissions**   | .env files with world-readable or group-readable permissions          |
| **Shell History** | Credentials in .bash_history, .zsh_history, .python_history, etc.     |
| **Git Config**    | Credentials embedded in git remote URLs, plaintext credential helpers |
| **Config Files**  | Hardcoded secrets in JSON, YAML, TOML, INI config files               |
| **Log Files**     | Credentials accidentally logged in .log files                         |
| **Gitignore**     | Missing patterns for .env, _.pem, _.key, credentials.json, etc.       |
| **Staleness**     | Credential files older than 90 days that may need rotation            |
| **Public Dirs**   | Credential files in public/, static/, www/, dist/, build/             |
| **Git History**   | Credential files in git repos that may be committed                   |
| **Docker**        | Secrets hardcoded in Dockerfile and docker-compose configs            |
| **Shell RC**      | Credentials in .bashrc, .zshrc, .profile aliases                      |
| **URL Params**    | API keys/tokens passed in URL query strings in code                   |

## Exit Codes

- `0` — Clean, no issues
- `1` — Warnings detected (review needed)
- `2` — Critical exposure detected (action needed)

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
