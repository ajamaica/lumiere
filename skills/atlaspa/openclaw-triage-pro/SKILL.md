---
name: openclaw-triage-pro
description: 'Full incident response suite: investigate compromises, auto-contain threats, guided remediation, evidence export, post-incident hardening, and pre-built response playbooks. Cross-references all OpenClaw security tools for unified analysis. Everything in openclaw-triage (free) plus automated response.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🚨', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Triage Pro

Full incident response suite for agent workspaces. When something goes wrong — a skill behaves unexpectedly, files change without explanation, or another security tool flags an anomaly — triage investigates what happened, contains the threat, remediates the damage, and hardens against recurrence.

Everything in [openclaw-triage](https://github.com/AtlasPA/openclaw-triage) (free) plus automated containment, guided remediation, evidence export, post-incident hardening, and pre-built incident response playbooks.

## Free Commands (included)

### Full Investigation

Run a comprehensive incident investigation. Collects workspace state, checks for signs of compromise (recently modified critical files, new skills, unusual permissions, off-hours modifications, large files, hidden files), cross-references with warden/ledger/signet/sentinel data, builds an event timeline, and calculates an incident severity score (CRITICAL / HIGH / MEDIUM / LOW).

```bash
python3 {baseDir}/scripts/triage.py investigate --workspace /path/to/workspace
```

### Event Timeline

Build a chronological timeline of all file modifications in the workspace. Groups events by hour, highlights suspicious burst activity, shows which directories and skills were affected, and cross-references with ledger entries if available.

```bash
python3 {baseDir}/scripts/triage.py timeline --workspace /path/to/workspace
```

Look back further than the default 24 hours:

```bash
python3 {baseDir}/scripts/triage.py timeline --hours 72 --workspace /path/to/workspace
```

### Blast Radius (Scope)

Assess the blast radius of a potential compromise. Categorizes all files by risk level (critical, memory, skill, config), checks for credential exposure patterns in recently modified files, scans for outbound exfiltration URLs, and estimates scope as CONTAINED, SPREADING, or SYSTEMIC.

```bash
python3 {baseDir}/scripts/triage.py scope --workspace /path/to/workspace
```

### Evidence Collection

Collect and preserve forensic evidence before remediation. Snapshots the full workspace state (file list with SHA-256 hashes, sizes, timestamps), copies all available security tool data, and generates a summary report.

```bash
python3 {baseDir}/scripts/triage.py evidence --workspace /path/to/workspace
```

Save to a custom output directory:

```bash
python3 {baseDir}/scripts/triage.py evidence --output /path/to/evidence/dir --workspace /path/to/workspace
```

### Quick Status

One-line summary of triage state: last investigation timestamp, current threat level, containment and remediation history, and whether evidence has been collected.

```bash
python3 {baseDir}/scripts/triage.py status --workspace /path/to/workspace
```

## Pro Commands

### Automated Containment

Quarantine all skills flagged in the investigation, lock down critical files (read-only backups), and disable any suspicious hooks. Skills are moved to `.triage/quarantine/` and can be restored during remediation.

```bash
python3 {baseDir}/scripts/triage.py contain --workspace /path/to/workspace
```

### Guided Remediation

Restore critical files from warden snapshots (if available), re-sign skills with signet, re-record with ledger, and rebuild baselines. Integrates with all available OpenClaw security tools automatically.

```bash
python3 {baseDir}/scripts/triage.py remediate --workspace /path/to/workspace
```

### Incident Report Export

Export a full incident report for external review. Includes timeline, scope, evidence, and all actions taken. JSON for machine processing, text for human reading.

```bash
python3 {baseDir}/scripts/triage.py export --format text --workspace /path/to/workspace
python3 {baseDir}/scripts/triage.py export --format json --output report.json --workspace /path/to/workspace
```

### Post-Incident Hardening

Check which security tools are installed and suggest missing ones, recommend policy changes, and suggest hook configurations. Outputs actionable steps sorted by priority.

```bash
python3 {baseDir}/scripts/triage.py harden --workspace /path/to/workspace
```

### Incident Response Playbooks

Pre-built step-by-step incident response playbooks for common scenarios:

```bash
# List available playbooks
python3 {baseDir}/scripts/triage.py playbook --workspace /path/to/workspace

# Run a specific playbook
python3 {baseDir}/scripts/triage.py playbook --scenario skill-compromise --workspace /path/to/workspace
python3 {baseDir}/scripts/triage.py playbook --scenario injection-attack --workspace /path/to/workspace
python3 {baseDir}/scripts/triage.py playbook --scenario credential-leak --workspace /path/to/workspace
python3 {baseDir}/scripts/triage.py playbook --scenario chain-break --workspace /path/to/workspace
```

### Full Automated Sweep (Protect)

Full automated protection sweep: investigate, contain critical threats, collect evidence, and generate a report. Recommended for session startup.

```bash
python3 {baseDir}/scripts/triage.py protect --workspace /path/to/workspace
```

## Workspace Auto-Detection

If `--workspace` is omitted, the script tries:

1. `OPENCLAW_WORKSPACE` environment variable
2. Current directory (if AGENTS.md exists)
3. `~/.openclaw/workspace` (default)

## Cross-Reference Sources

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
