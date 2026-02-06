---
name: openclaw-ledger
description: 'Tamper-evident audit trail for agent sessions. Hash-chained logs of workspace changes with cryptographic verification. Know exactly what changed, when, and detect if anyone altered the record. Free alert layer — upgrade to openclaw-ledger-pro for freeze, forensics, and chain restoration.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '📒', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Ledger

Tamper-evident audit trail for agent workspaces. Every workspace change is recorded in a hash-chained log — if anyone alters an entry, the chain breaks and you know.

## The Problem

Agents modify files, execute commands, install skills — and leave no verifiable record. If something goes wrong, you can't trace what happened. If logs exist, nothing proves they haven't been altered after the fact.

**Need automated forensics?** Upgrade to [openclaw-ledger-pro](https://github.com/AtlasPA/openclaw-ledger-pro) for freeze, forensics, and chain restoration.

## Commands

### Initialize

Create the ledger and snapshot current workspace state.

```bash
python3 {baseDir}/scripts/ledger.py init --workspace /path/to/workspace
```

### Record Changes

Snapshot current state and log all changes since last record.

```bash
python3 {baseDir}/scripts/ledger.py record --workspace /path/to/workspace
python3 {baseDir}/scripts/ledger.py record -m "Installed new skill" --workspace /path/to/workspace
```

### Verify Chain

Verify the hash chain is intact — no entries tampered with.

```bash
python3 {baseDir}/scripts/ledger.py verify --workspace /path/to/workspace
```

### View Log

Show recent ledger entries.

```bash
python3 {baseDir}/scripts/ledger.py log --workspace /path/to/workspace
python3 {baseDir}/scripts/ledger.py log -n 20 --workspace /path/to/workspace
```

### Quick Status

```bash
python3 {baseDir}/scripts/ledger.py status --workspace /path/to/workspace
```

## How It Works

Each entry contains:

- Timestamp
- SHA-256 hash of the previous entry
- Event type and data (file changes, snapshots)

If any entry is modified, inserted, or deleted, the hash chain breaks and `verify` detects it.

## Exit Codes

- `0` — Clean / chain intact
- `1` — No ledger or minor issues
- `2` — Chain tampered / corrupt entries

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
