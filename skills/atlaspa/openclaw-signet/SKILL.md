---
name: openclaw-signet
description: "Cryptographic skill verification. Sign installed skills with SHA-256 content hashes and verify they haven't been tampered with. Detects modified, added, and removed files within skill directories. Free alert layer — upgrade to openclaw-signet-pro for rejection, quarantine, and trust chain restoration."
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🔏', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Signet

Cryptographic verification for installed skills. Sign skills at install time, verify they haven't been tampered with later.

## The Problem

You install a skill and it works. Days later, a compromised process modifies files inside the skill directory — injecting code, altering behavior, adding exfiltration. All current defenses are heuristic (regex pattern matching). Nothing mathematically verifies that installed code is unchanged.

**Need automated enforcement?** Upgrade to [openclaw-signet-pro](https://github.com/AtlasPA/openclaw-signet-pro) for rejection, quarantine, and trust chain restoration.

## Commands

### Sign Skills

Generate SHA-256 content hashes for all installed skills and store in trust manifest.

```bash
python3 {baseDir}/scripts/signet.py sign --workspace /path/to/workspace
```

### Sign Single Skill

```bash
python3 {baseDir}/scripts/signet.py sign openclaw-warden --workspace /path/to/workspace
```

### Verify Skills

Compare current skill state against trusted signatures.

```bash
python3 {baseDir}/scripts/signet.py verify --workspace /path/to/workspace
```

### List Signed Skills

```bash
python3 {baseDir}/scripts/signet.py list --workspace /path/to/workspace
```

### Quick Status

```bash
python3 {baseDir}/scripts/signet.py status --workspace /path/to/workspace
```

## How It Works

1. `sign` computes SHA-256 hashes of every file in each skill directory
2. A composite hash represents the entire skill state
3. `verify` recomputes hashes and compares against the manifest
4. If any file is modified, added, or removed — the composite hash changes
5. Reports exactly which files changed within each tampered skill

## Exit Codes

- `0` — All skills verified
- `1` — Unsigned skills detected
- `2` — Tampered skills detected

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
