# OpenClaw Warden

Free workspace integrity verification for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Detects unauthorized modifications to agent identity and memory files and scans for prompt injection patterns — the post-installation security layer that other tools miss.

**Want automated countermeasures?** Upgrade to Pro — snapshot restore, skill quarantine, git rollback, and automated protection sweeps. [Get Pro access](https://github.com/sponsors/AtlasPA).

## The Problem

AI agents read workspace files (`SOUL.md`, `AGENTS.md`, `IDENTITY.md`, memory files) on every session startup and **trust them implicitly**. Existing security tools scan _skills_ before installation. Nothing monitors the _workspace itself_ afterward.

A compromised skill, a malicious payload, or any process with file access can inject hidden instructions, embed exfiltration URLs, override safety boundaries, or plant persistent backdoors.

This skill detects all of these.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-warden.git

# Copy to your workspace skills directory
cp -r openclaw-warden ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Establish baseline
python3 scripts/integrity.py baseline

# Check for modifications + injections
python3 scripts/integrity.py full

# Quick health check
python3 scripts/integrity.py status

# Accept a legitimate change
python3 scripts/integrity.py accept SOUL.md
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## What It Detects

### Integrity Violations

- Modified files (SHA-256 checksum comparison)
- Deleted files
- New untracked files

### Prompt Injection Patterns

- **Instruction override** — "ignore previous instructions", "you are now", "forget your instructions"
- **System prompt markers** — `<system>`, `[SYSTEM]`, `<<SYS>>`, `[INST]`
- **Markdown exfiltration** — Image tags with encoded data in URLs
- **Base64 payloads** — Large encoded blobs outside code blocks
- **Unicode manipulation** — Zero-width characters, RTL overrides, homoglyphs
- **HTML injection** — `<script>`, `<iframe>`, hidden elements
- **Shell injection** — `$(...)` subshell execution outside code blocks

### Smart Detection

- Respects markdown fenced code blocks (no false positives on documented examples)
- Skips its own files (which describe injection patterns)
- Distinguishes file categories: critical, memory, config, skills

## File Categories

| Category | Files                                                            | Alert Level |
| -------- | ---------------------------------------------------------------- | ----------- |
| Critical | SOUL.md, AGENTS.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md | WARNING     |
| Memory   | memory/\*.md, MEMORY.md                                          | INFO        |
| Config   | \*.json in workspace root                                        | WARNING     |
| Skills   | skills/\*/SKILL.md                                               | WARNING     |

Injection patterns always trigger **CRITICAL** regardless of category.

## Exit Codes

| Code | Meaning                     |
| ---- | --------------------------- |
| 0    | Clean                       |
| 1    | Modifications detected      |
| 2    | Injection patterns detected |

## Free vs Pro

| Feature                | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| ---------------------- | ---- | ------------------------------------------ |
| Baseline checksums     | Yes  | Yes                                        |
| Integrity verification | Yes  | Yes                                        |
| Injection scanning     | Yes  | Yes                                        |
| Snapshot restore       | -    | Yes                                        |
| Git rollback           | -    | Yes                                        |
| Skill quarantine       | -    | Yes                                        |
| Automated protect      | -    | Yes                                        |
| Session startup hook   | -    | Yes                                        |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
