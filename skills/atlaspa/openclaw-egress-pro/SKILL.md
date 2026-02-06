---
name: openclaw-egress-pro
description: 'Full network DLP suite: detect outbound URLs, data exfiltration patterns, and suspicious network calls, then automatically block connections, quarantine compromised skills, and enforce domain allowlists. Everything in openclaw-egress (free) plus automated countermeasures.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🌐', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Egress Pro

Full network DLP suite for agent workspaces. Detects outbound URLs, data exfiltration patterns, and suspicious network calls, then automatically blocks connections, quarantines compromised skills, and enforces domain allowlists.

**Philosophy:** alert -> subvert -> quarantine -> defend.

Everything in [openclaw-egress](https://github.com/AtlasPA/openclaw-egress) (free) plus automated countermeasures.

## The Problem

Skills can phone home. A compromised skill can POST your workspace contents, API keys, or conversation history to an external server. Detection alone isn't enough — you need the ability to neutralize threats automatically.

## Commands

### Full Scan

Scan workspace for all outbound network risks.

```bash
python3 {baseDir}/scripts/egress.py scan --workspace /path/to/workspace
```

### Skills-Only Scan

```bash
python3 {baseDir}/scripts/egress.py scan --skills-only --workspace /path/to/workspace
```

### Domain Map

List all external domains referenced in workspace.

```bash
python3 {baseDir}/scripts/egress.py domains --workspace /path/to/workspace
```

### Quick Status

```bash
python3 {baseDir}/scripts/egress.py status --workspace /path/to/workspace
```

## Pro Countermeasures

### Block Network Calls

Neutralize suspicious network calls in a skill by commenting them out. Targets CRITICAL and HIGH findings only. Creates `.bak` backup of each modified file.

```bash
python3 {baseDir}/scripts/egress.py block <skill-name> --workspace /path/to/workspace
```

- Comments out lines containing network calls with `# [BLOCKED by openclaw-egress-pro]`
- Creates `.bak` backup before modifying any file
- Only modifies code files (`.py`, `.js`, `.ts`, `.sh`, `.bash`)
- Flags non-code files for manual review

### Quarantine Skill

Disable a skill with exfiltration indicators by renaming it so OpenClaw won't load it.

```bash
python3 {baseDir}/scripts/egress.py quarantine <skill-name> --workspace /path/to/workspace
```

### Unquarantine Skill

Restore a previously quarantined skill.

```bash
python3 {baseDir}/scripts/egress.py unquarantine <skill-name> --workspace /path/to/workspace
```

### Domain Allowlist

Manage a custom domain allowlist. Domains on this list won't be flagged during scans. Built-in safe domains always apply.

```bash
# Show current allowlist (built-in + custom)
python3 {baseDir}/scripts/egress.py allowlist --workspace /path/to/workspace

# Add a domain
python3 {baseDir}/scripts/egress.py allowlist --add api.mycompany.com --workspace /path/to/workspace

# Remove a domain
python3 {baseDir}/scripts/egress.py allowlist --remove api.mycompany.com --workspace /path/to/workspace
```

Custom allowlist is stored in `.egress-allowlist.json` in the workspace root.

### Protect (Full Sweep)

Automated protection sweep: scans all skills, auto-quarantines any with CRITICAL exfiltration indicators, blocks HIGH network calls, and reports results. Recommended for session startup.

```bash
python3 {baseDir}/scripts/egress.py protect --workspace /path/to/workspace
```

Actions taken by protect:

1. Scan all active (non-quarantined) skills
2. **CRITICAL findings** -> quarantine the entire skill
3. **HIGH findings** -> block (comment out) network call lines
4. Report all actions taken with next steps

## What It Detects

| Risk         | Pattern                                                                               |
| ------------ | ------------------------------------------------------------------------------------- |
| **CRITICAL** | Base64/hex payloads in URLs, pastebin/sharing services, request catchers, dynamic DNS |
| **HIGH**     | Network function calls (requests, urllib, curl, wget, fetch), webhook/callback URLs   |
| **WARNING**  | Suspicious TLDs (.xyz, .tk, .ml), URL shorteners, IP address endpoints                |
| **INFO**     | Any external URL not on the safe domain list or custom allowlist                      |

## Exit Codes

- `0` — Clean (or action completed successfully)
- `1` — Warnings / network calls detected (review needed)
- `2` — Critical exfiltration risk detected (action needed)

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
