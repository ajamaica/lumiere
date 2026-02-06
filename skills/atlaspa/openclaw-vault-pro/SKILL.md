---
name: openclaw-vault-pro
description: 'Full credential lifecycle security: detect exposed credentials, auto-fix permissions, quarantine exposed files, rotation tracking, git history scanning, and automated protection. Everything in openclaw-vault (free) plus automated countermeasures.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🔐', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Vault Pro

Everything in [openclaw-vault](https://github.com/AtlasPA/openclaw-vault) (free) plus automated countermeasures.

**Free version detects threats. Pro version subverts, quarantines, and defends.**

## Detection Commands (also in free)

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

## Pro Countermeasures

### Fix Permissions

Auto-fix file permissions on all credential files. Sets .env files and other credential files to owner-readable only (chmod 600 on Unix, restricted ACLs via icacls on Windows).

```bash
python3 {baseDir}/scripts/vault.py fix-permissions --workspace /path/to/workspace
```

### Quarantine

Move an exposed credential file to `.quarantine/vault/` with metadata recording the original location and reason. The file is removed from its original location to prevent further exposure.

```bash
python3 {baseDir}/scripts/vault.py quarantine <file> --workspace /path/to/workspace
```

### Unquarantine

Restore a previously quarantined credential file to its original location. Matches by original path or quarantine file name.

```bash
python3 {baseDir}/scripts/vault.py unquarantine <file> --workspace /path/to/workspace
```

### Rotation Check

Check credential file ages and generate a rotation schedule. Files exceeding the max-age threshold are flagged as overdue. Files approaching the threshold are flagged as approaching. Default threshold is 90 days.

```bash
python3 {baseDir}/scripts/vault.py rotate-check --workspace /path/to/workspace
python3 {baseDir}/scripts/vault.py rotate-check --max-age 60 --workspace /path/to/workspace
```

### Git Guard

Scan git history for accidentally committed credentials. Uses `git log --diff-filter=A` to find credential files that were added (and possibly later removed). Checks whether credentials are still in HEAD or only in history. Provides remediation guidance.

```bash
python3 {baseDir}/scripts/vault.py gitguard --workspace /path/to/workspace
```

### Protect (Automated Sweep)

Full automated protection sweep in one command: audit all credentials, check exposure vectors, fix permissions, quarantine high-risk exposed files, check rotation schedule, and produce a comprehensive report. Recommended for session startup.

```bash
python3 {baseDir}/scripts/vault.py protect --workspace /path/to/workspace
python3 {baseDir}/scripts/vault.py protect --max-age 60 --workspace /path/to/workspace
```

## Recommended Integration

### Session Startup Hook (Claude Code)

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

### Heartbeat (OpenClaw)

Add to HEARTBEAT.md for periodic credential protection:

```
- Run credential protection sweep (python3 {skill:openclaw-vault-pro}/scripts/vault.py protect)
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
| **Staleness**     | Credential files older than threshold that may need rotation          |
| **Public Dirs**   | Credential files in public/, static/, www/, dist/, build/             |
| **Git History**   | Credential files in git repos that may be committed                   |
| **Docker**        | Secrets hardcoded in Dockerfile and docker-compose configs            |
| **Shell RC**      | Credentials in .bashrc, .zshrc, .profile aliases                      |
| **URL Params**    | API keys/tokens passed in URL query strings in code                   |

## Exit Codes

- `0` -- Clean, no issues
- `1` -- Warnings detected (review needed)
- `2` -- Critical exposure detected (action needed)

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
