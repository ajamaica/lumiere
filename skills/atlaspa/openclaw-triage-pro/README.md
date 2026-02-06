# OpenClaw Triage Pro

Full incident response suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Investigates compromises, auto-contains threats, guides remediation, exports incident reports, hardens security posture, and provides pre-built response playbooks — pulling together data from warden, ledger, signet, and sentinel into a unified incident response workflow.

Everything in [openclaw-triage](https://github.com/AtlasPA/openclaw-triage) (free) plus automated containment, guided remediation, evidence export, post-incident hardening, and incident response playbooks.

## The Problem

When something goes wrong in an agent workspace — unexpected file changes, anomalous skill behavior, or a security tool flags an alert — you need to quickly understand what happened, contain the damage, remediate the cause, and harden against recurrence.

The free version of triage tells you what happened. The Pro version does something about it.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-triage-pro.git

# Copy to your workspace skills directory
cp -r openclaw-triage-pro ~/.openclaw/workspace/skills/
```

## Usage

### Free Commands (included)

```bash
# Full incident investigation
python3 scripts/triage.py investigate

# Build event timeline (last 24 hours)
python3 scripts/triage.py timeline

# Timeline with custom window
python3 scripts/triage.py timeline --hours 72

# Assess blast radius
python3 scripts/triage.py scope

# Collect forensic evidence
python3 scripts/triage.py evidence

# Evidence to custom directory
python3 scripts/triage.py evidence --output /path/to/dir

# Quick status check
python3 scripts/triage.py status
```

### Pro Commands

```bash
# Automated containment: quarantine threats, lock critical files, disable suspicious hooks
python3 scripts/triage.py contain

# Guided remediation: restore from snapshots, re-sign, re-record, rebuild baselines
python3 scripts/triage.py remediate

# Export incident report (text or JSON)
python3 scripts/triage.py export --format text
python3 scripts/triage.py export --format json --output report.json

# Post-incident hardening recommendations
python3 scripts/triage.py harden

# Incident response playbooks
python3 scripts/triage.py playbook --scenario skill-compromise
python3 scripts/triage.py playbook --scenario injection-attack
python3 scripts/triage.py playbook --scenario credential-leak
python3 scripts/triage.py playbook --scenario chain-break

# Full automated sweep (recommended for session startup)
python3 scripts/triage.py protect
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## What It Does

### Investigate (free)

Runs a comprehensive incident investigation: workspace inventory, compromise indicators, cross-reference with all security tools, timeline summary, and severity scoring.

### Timeline (free)

Builds a detailed chronological view of workspace activity with hourly grouping, burst detection, directory breakdown, and ledger cross-reference.

### Scope (free)

Assesses the blast radius: file categorization by risk, credential exposure scanning, exfiltration URL detection, and scope estimation (CONTAINED / SPREADING / SYSTEMIC).

### Evidence (free)

Preserves forensic data: full workspace snapshot with SHA-256 hashes, security tool data copies, and collection summary.

### Status (free)

Quick check of triage state: investigation history, threat level, containment and remediation history, and evidence collection status.

### Contain (pro)

Automated threat containment. Quarantines flagged skills by moving them to `.triage/quarantine/`, creates read-only backups of critical files in `.triage/backups/`, and disables suspicious hook configurations that may be part of an attack chain.

### Remediate (pro)

Guided four-step remediation:

1. Restore critical files from warden snapshots or containment backups
2. Re-sign all skills with signet (if installed)
3. Record remediation event in ledger (if installed)
4. Rebuild warden baselines (if installed)

Automatically discovers and integrates with all available OpenClaw security tools.

### Export (pro)

Generates a full incident report including findings, timeline, scope, all actions taken, and security tool status. Supports text format (human-readable) and JSON format (machine-processable). Output to stdout or file.

### Harden (pro)

Post-incident hardening analysis:

- Checks which security tools are installed and flags missing ones
- Reviews warden baseline freshness and signet coverage
- Recommends hook configurations for continuous monitoring
- Outputs prioritized actionable steps (HIGH / MEDIUM / LOW)

### Playbook (pro)

Pre-built incident response playbooks for four common scenarios:

- **skill-compromise** — Malicious or tampered skill discovered
- **injection-attack** — Prompt injection detected in workspace files
- **credential-leak** — Secrets or credentials exposed
- **chain-break** — Ledger audit chain broken or tampered

Each playbook provides step-by-step instructions with the specific commands to run.

### Protect (pro)

Full automated protection sweep in four phases:

1. Investigate — identify all threats
2. Contain — quarantine critical threats automatically
3. Evidence — preserve forensic data
4. Report — generate incident report

Recommended for session startup to catch issues early.

## Cross-Reference Sources

| Tool     | Data Path                  | What Triage Checks               |
| -------- | -------------------------- | -------------------------------- |
| Warden   | `.integrity/manifest.json` | Baseline deviations              |
| Ledger   | `.ledger/chain.jsonl`      | Chain breaks, suspicious entries |
| Signet   | `.signet/manifest.json`    | Tampered skill signatures        |
| Sentinel | `.sentinel/threats.json`   | Known threats                    |

## Exit Codes

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| 0    | Clean, no actionable findings                 |
| 1    | Findings detected (investigation recommended) |
| 2    | Critical findings (immediate action needed)   |

## Free vs Pro

| Feature                                                   | Free | Pro |
| --------------------------------------------------------- | ---- | --- |
| Full investigation                                        | Yes  | Yes |
| Event timeline                                            | Yes  | Yes |
| Blast radius assessment                                   | Yes  | Yes |
| Evidence collection                                       | Yes  | Yes |
| Cross-reference (warden, ledger, signet, sentinel)        | Yes  | Yes |
| Severity scoring                                          | Yes  | Yes |
| Automated containment (quarantine, lock, disable hooks)   | -    | Yes |
| Guided remediation (restore, re-sign, re-record, rebuild) | -    | Yes |
| Incident report export (JSON, text)                       | -    | Yes |
| Post-incident hardening recommendations                   | -    | Yes |
| Incident response playbooks (4 scenarios)                 | -    | Yes |
| Full automated protection sweep                           | -    | Yes |
| Session startup integration                               | -    | Yes |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
