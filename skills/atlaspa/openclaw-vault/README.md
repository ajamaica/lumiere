# OpenClaw Vault

Credential lifecycle protection for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Audits credential exposure, detects misconfigured permissions, inventories all secrets, and identifies stale credentials needing rotation — the credential lifecycle layer that secret scanners miss.

**Want automated countermeasures?** Upgrade to Pro — auto-fix permissions, credential rotation reminders, access control policies, secure credential injection, and exposure auto-remediation. [Get Pro access](https://github.com/sponsors/AtlasPA).

## The Problem

Secret scanners find credentials in source code. But credentials also leak through misconfigured file permissions, shell history, git configs, Docker images, log files, and simple neglect (stale credentials that haven't been rotated in months).

Nothing watches the _credential lifecycle_ — how credentials are stored, exposed, aged, and transmitted. This skill does.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-vault.git

# Copy to your workspace skills directory
cp -r openclaw-vault ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Full credential audit
python3 scripts/vault.py audit

# Check exposure vectors
python3 scripts/vault.py exposure

# Credential inventory
python3 scripts/vault.py inventory

# Quick status
python3 scripts/vault.py status
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

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

### Credential Inventory

- Maps all credential files in the workspace
- Categorizes by type: API key, database URI, token, certificate, SSH key, password
- Tracks age of each credential file (last modified time)
- Flags stale and exposed credentials in a structured table

## Free vs Pro

| Feature                           | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| --------------------------------- | ---- | ------------------------------------------ |
| Full credential audit             | Yes  | Yes                                        |
| Exposure vector detection         | Yes  | Yes                                        |
| Credential inventory              | Yes  | Yes                                        |
| Staleness detection               | Yes  | Yes                                        |
| Permission analysis               | Yes  | Yes                                        |
| **Auto-fix permissions**          | -    | Yes                                        |
| **Credential rotation reminders** | -    | Yes                                        |
| **Access control policies**       | -    | Yes                                        |
| **Secure credential injection**   | -    | Yes                                        |
| **Exposure auto-remediation**     | -    | Yes                                        |
| **Session startup hook**          | -    | Yes                                        |

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
