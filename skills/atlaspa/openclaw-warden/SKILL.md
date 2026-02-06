---
name: openclaw-warden
description: 'Verify workspace file integrity and scan for prompt injection patterns in agent identity and memory files. Detects unauthorized modifications to SOUL.md, AGENTS.md, IDENTITY.md, memory files, and installed skills. Free detection layer — upgrade to openclaw-warden-pro for automated countermeasures.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🛡️', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Warden

Monitors your workspace files for unauthorized modifications and prompt injection attacks. Existing security tools scan _skills_ before installation — this tool watches the _workspace itself_ after installation, catching tampering that other tools miss.

## Why This Matters

Your agent reads SOUL.md, AGENTS.md, IDENTITY.md, USER.md, and memory files on every session startup and **trusts them implicitly**. A compromised skill, a malicious heartbeat payload, or an unauthorized process can modify these files to:

- Inject hidden instructions that alter agent behavior
- Embed data exfiltration URLs in markdown images
- Override identity and safety boundaries
- Plant persistent backdoors in memory files

This skill detects all of these.

**Need automated response?** Upgrade to [openclaw-warden-pro](https://github.com/AtlasPA/openclaw-warden-pro) for snapshot restore, skill quarantine, git rollback, and automated protection sweeps.

## Commands

### Establish Baseline

Create or reset the integrity baseline. Run this after setting up your workspace or after reviewing and accepting all current file states.

```bash
python3 {baseDir}/scripts/integrity.py baseline --workspace /path/to/workspace
```

### Verify Integrity

Check all monitored files against the stored baseline. Reports modifications, deletions, and new untracked files.

```bash
python3 {baseDir}/scripts/integrity.py verify --workspace /path/to/workspace
```

### Scan for Injections

Scan workspace files for prompt injection patterns: hidden instructions, base64 payloads, Unicode tricks, markdown image exfiltration, HTML injection, and suspicious system prompt markers.

```bash
python3 {baseDir}/scripts/integrity.py scan --workspace /path/to/workspace
```

### Full Check (Verify + Scan)

Run both integrity verification and injection scanning in one pass.

```bash
python3 {baseDir}/scripts/integrity.py full --workspace /path/to/workspace
```

### Quick Status

One-line summary of workspace health.

```bash
python3 {baseDir}/scripts/integrity.py status --workspace /path/to/workspace
```

### Accept Changes

After reviewing a legitimate change, update the baseline for a specific file.

```bash
python3 {baseDir}/scripts/integrity.py accept SOUL.md --workspace /path/to/workspace
```

## Workspace Auto-Detection

If `--workspace` is omitted, the script tries:

1. `OPENCLAW_WORKSPACE` environment variable
2. Current directory (if AGENTS.md exists)
3. `~/.openclaw/workspace` (default)

## What Gets Monitored

| Category     | Files                                                            | Alert Level on Change     |
| ------------ | ---------------------------------------------------------------- | ------------------------- |
| **Critical** | SOUL.md, AGENTS.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md | WARNING                   |
| **Memory**   | memory/\*.md, MEMORY.md                                          | INFO (expected to change) |
| **Config**   | \*.json in workspace root                                        | WARNING                   |
| **Skills**   | skills/\*/SKILL.md                                               | WARNING                   |

Injection patterns trigger **CRITICAL** alerts regardless of file category.

## Injection Patterns Detected

- **Instruction override:** "ignore previous instructions", "disregard above", "you are now", "new system prompt"
- **Base64 payloads:** Suspiciously long base64 strings outside code blocks
- **Unicode manipulation:** Zero-width characters, RTL overrides, homoglyphs
- **Markdown exfiltration:** Image tags with data-encoding URLs
- **HTML injection:** script tags, iframes, hidden elements
- **System prompt markers:** `<system>`, `[SYSTEM]`, `<<SYS>>` blocks
- **Shell injection:** `$(...)` outside code blocks

## Exit Codes

- `0` — Clean, no issues
- `1` — Modifications detected (review needed)
- `2` — Injection patterns detected (action needed)

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
