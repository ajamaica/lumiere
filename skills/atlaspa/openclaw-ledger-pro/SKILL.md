---
name: openclaw-ledger-pro
description: 'Full audit trail suite: hash-chained logging of workspace changes with freeze, forensic analysis, chain restoration, and automated protection. Everything in openclaw-ledger (free) plus automated countermeasures.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '📒', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Ledger Pro

Full audit trail suite for agent workspaces. Every workspace change is recorded in a hash-chained log — if anyone alters an entry, the chain breaks and you know. Pro adds automated countermeasures: freeze, forensic analysis, chain restoration, export, and full protection sweeps.

## The Problem

Agents modify files, execute commands, install skills — and leave no verifiable record. If something goes wrong, you can't trace what happened. If logs exist, nothing proves they haven't been altered after the fact.

**openclaw-ledger** (free) gives you alert-level protection: log and verify.

**openclaw-ledger-pro** gives you the full suite: subvert, quarantine, and defend.

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

## Pro Countermeasures

### Freeze

Create a read-only backup of the chain file. Copies the current chain to `.ledger/frozen/chain-{timestamp}.jsonl`. Records a "freeze" event before copying. Use this regularly to maintain recovery points.

```bash
python3 {baseDir}/scripts/ledger.py freeze --workspace /path/to/workspace
```

### Forensics

Detailed forensic analysis of the chain. Shows a full timeline of all changes with file-level diffs, session boundaries, and anomaly detection (time gaps, bulk changes, timestamp regressions, duplicate timestamps).

```bash
python3 {baseDir}/scripts/ledger.py forensics --workspace /path/to/workspace
python3 {baseDir}/scripts/ledger.py forensics --from 2025-01-01 --workspace /path/to/workspace
python3 {baseDir}/scripts/ledger.py forensics --from 2025-01-01 --to 2025-01-31 --workspace /path/to/workspace
```

### Restore

Restore the chain from a frozen backup. Validates the frozen chain integrity before restoring. Backs up the current chain before overwriting. If no `--from-frozen` is specified, uses the most recent backup.

```bash
python3 {baseDir}/scripts/ledger.py restore --workspace /path/to/workspace
python3 {baseDir}/scripts/ledger.py restore --from-frozen 20250115T120000Z --workspace /path/to/workspace
```

### Export

Export the full chain as structured JSON or a readable text report for external analysis.

```bash
python3 {baseDir}/scripts/ledger.py export --workspace /path/to/workspace
python3 {baseDir}/scripts/ledger.py export --format text --workspace /path/to/workspace
python3 {baseDir}/scripts/ledger.py export --format json --workspace /path/to/workspace
```

### Protect

Full automated protection sweep. Recommended for session startup. Steps:

1. Verify chain integrity
2. If tampering detected: auto-freeze evidence, attempt restore from clean backup
3. Record current workspace state
4. Report results

```bash
python3 {baseDir}/scripts/ledger.py protect --workspace /path/to/workspace
```

## How It Works

Each entry contains:

- Timestamp
- SHA-256 hash of the previous entry
- Event type and data (file changes, snapshots)

If any entry is modified, inserted, or deleted, the hash chain breaks and `verify` detects it. The `protect` command automates the full response: detect tampering, preserve evidence, restore from clean backup, and record current state.

## Exit Codes

- `0` — Clean / chain intact
- `1` — Warnings (changes detected, minor anomalies)
- `2` — Critical (chain tampered, corrupt entries, restore failure)

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
