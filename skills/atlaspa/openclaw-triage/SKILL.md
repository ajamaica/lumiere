---
name: openclaw-triage
description: 'Incident response and forensics for agent workspaces. Investigate compromises, build timelines, assess blast radius, and collect evidence. Cross-references data from warden, ledger, signet, and sentinel for unified analysis. Free alert layer — upgrade to openclaw-triage-pro for automated containment, remediation playbooks, and evidence export.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🚨', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Triage

Incident response and forensics for agent workspaces. When something goes wrong — a skill behaves unexpectedly, files change without explanation, or another security tool flags an anomaly — triage investigates what happened, assesses the damage, and guides recovery.

This is the "detective" that pulls together evidence from all OpenClaw security tools into a unified incident report.

**Need automated containment and remediation?** Upgrade to [openclaw-triage-pro](https://github.com/AtlasPA/openclaw-triage-pro) for quarantine, playbooks, evidence chain-of-custody, and post-incident hardening.

## Commands

### Full Investigation

Run a comprehensive incident investigation. Collects workspace state, checks for signs of compromise (recently modified critical files, new skills, unusual permissions, off-hours modifications, large files, hidden files), cross-references with warden/ledger/signet/sentinel data, builds an event timeline, and calculates an incident severity score (CRITICAL / HIGH / MEDIUM / LOW).

```bash
python3 {baseDir}/scripts/triage.py investigate --workspace /path/to/workspace
```

### Event Timeline

Build a chronological timeline of all file modifications in the workspace. Groups events by hour, highlights suspicious burst activity (many files modified in a short window), shows which directories and skills were affected, and cross-references with ledger entries if available.

```bash
python3 {baseDir}/scripts/triage.py timeline --workspace /path/to/workspace
```

Look back further than the default 24 hours:

```bash
python3 {baseDir}/scripts/triage.py timeline --hours 72 --workspace /path/to/workspace
```

### Blast Radius (Scope)

Assess the blast radius of a potential compromise. Categorizes all files by risk level (critical, memory, skill, config), checks for credential exposure patterns in recently modified files, scans for outbound exfiltration URLs, and estimates scope as CONTAINED (single area), SPREADING (multiple skills), or SYSTEMIC (workspace-level).

```bash
python3 {baseDir}/scripts/triage.py scope --workspace /path/to/workspace
```

### Evidence Collection

Collect and preserve forensic evidence before remediation. Snapshots the full workspace state (file list with SHA-256 hashes, sizes, timestamps), copies all available security tool data (.integrity/, .ledger/, .signet/, .sentinel/), and generates a summary report. Always run this before any remediation to preserve the forensic trail.

```bash
python3 {baseDir}/scripts/triage.py evidence --workspace /path/to/workspace
```

Save to a custom output directory:

```bash
python3 {baseDir}/scripts/triage.py evidence --output /path/to/evidence/dir --workspace /path/to/workspace
```

### Quick Status

One-line summary of triage state: last investigation timestamp, current threat level, and whether evidence has been collected.

```bash
python3 {baseDir}/scripts/triage.py status --workspace /path/to/workspace
```

## Workspace Auto-Detection

If `--workspace` is omitted, the script tries:

1. `OPENCLAW_WORKSPACE` environment variable
2. Current directory (if AGENTS.md exists)
3. `~/.openclaw/workspace` (default)

## Cross-Reference Sources

Triage automatically checks for data from these OpenClaw tools:

| Tool         | Data Path                  | What Triage Checks                                               |
| ------------ | -------------------------- | ---------------------------------------------------------------- |
| **Warden**   | `.integrity/manifest.json` | Baseline deviations — files modified since last known-good state |
| **Ledger**   | `.ledger/chain.jsonl`      | Chain breaks, unparseable entries, suspicious log entries        |
| **Signet**   | `.signet/manifest.json`    | Tampered skill signatures — skills modified after signing        |
| **Sentinel** | `.sentinel/threats.json`   | Known threats and high-severity findings                         |

## Incident Severity Levels

| Level        | Meaning                     | Trigger                                      |
| ------------ | --------------------------- | -------------------------------------------- |
| **CRITICAL** | Immediate response required | Any critical finding, or 3+ high findings    |
| **HIGH**     | Investigation warranted     | High-severity findings from any source       |
| **MEDIUM**   | Review recommended          | Multiple medium findings or volume threshold |
| **LOW**      | No immediate action         | Informational findings only                  |

## Exit Codes

- `0` — Clean, no actionable findings
- `1` — Findings detected (investigation recommended)
- `2` — Critical findings (immediate action needed)

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
