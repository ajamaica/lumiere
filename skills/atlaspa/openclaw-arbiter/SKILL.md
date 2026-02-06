---
name: openclaw-arbiter
description: 'Audit installed skill permissions: detect network access, subprocess execution, file writes, unsafe deserialization, and environment variable usage. Permission matrix for every skill in your workspace. Free alert layer — upgrade to openclaw-arbiter-pro for revocation, quarantine, and policy enforcement.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '⚖️', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Arbiter

Audits installed skills to report exactly what system resources each one accesses — network, subprocess, file I/O, environment variables, and unsafe operations.

## The Problem

You install skills and trust them blindly. A skill that claims to format markdown could also open network connections, execute shell commands, or read your environment variables. Nothing reports what permissions each skill actually uses.

**Need automated enforcement?** Upgrade to [openclaw-arbiter-pro](https://github.com/AtlasPA/openclaw-arbiter-pro) for revocation, quarantine, and policy enforcement.

## Commands

### Full Audit

Deep audit of all installed skills with line-level findings.

```bash
python3 {baseDir}/scripts/arbiter.py audit --workspace /path/to/workspace
```

### Audit Single Skill

```bash
python3 {baseDir}/scripts/arbiter.py audit openclaw-warden --workspace /path/to/workspace
```

### Permission Matrix

Compact table showing permission categories per skill.

```bash
python3 {baseDir}/scripts/arbiter.py report --workspace /path/to/workspace
```

### Quick Status

One-line summary of permission risk.

```bash
python3 {baseDir}/scripts/arbiter.py status --workspace /path/to/workspace
```

## What It Detects

| Category          | Risk     | Examples                                           |
| ----------------- | -------- | -------------------------------------------------- |
| **Serialization** | CRITICAL | pickle, eval(), exec(), **import**                 |
| **Subprocess**    | HIGH     | subprocess, os.system, Popen, command substitution |
| **Network**       | HIGH     | urllib, requests, curl, wget, hardcoded URLs       |
| **File Write**    | MEDIUM   | open('w'), shutil.copy, os.remove, rm              |
| **Environment**   | MEDIUM   | os.environ, os.getenv, os.putenv                   |
| **Crypto**        | LOW      | hashlib, hmac, ssl                                 |
| **File Read**     | LOW      | open('r'), os.walk, glob                           |

## Exit Codes

- `0` — Clean, all skills within normal bounds
- `1` — Elevated permissions detected (review needed)
- `2` — Critical permissions detected (action needed)

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
