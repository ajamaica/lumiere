# OpenClaw Triage

Free incident response and forensics for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Investigates compromises, builds event timelines, assesses blast radius, and collects forensic evidence — pulling together data from warden, ledger, signet, and sentinel into unified incident reports.

**Want automated countermeasures?** Upgrade to Pro — quarantine, playbooks, evidence chain-of-custody, and post-incident hardening. [Get Pro access](https://github.com/sponsors/AtlasPA).

## The Problem

When something goes wrong in an agent workspace — unexpected file changes, anomalous skill behavior, or a security tool flags an alert — you need to quickly understand what happened, how far it spread, and what to do about it.

Existing OpenClaw security tools each monitor one dimension: warden watches file integrity, ledger tracks the audit chain, signet verifies skill signatures, sentinel scans for threats. But no single tool correlates all of that data into a coherent incident picture.

Triage is the detective that ties it all together.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-triage.git

# Copy to your workspace skills directory
cp -r openclaw-triage ~/.openclaw/workspace/skills/
```

## Usage

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

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## What It Does

### Investigate

Runs a comprehensive incident investigation:

- **Workspace inventory** — Collects file hashes, modification times, and sizes for every file
- **Compromise indicators** — Checks for recently modified critical files (SOUL.md, AGENTS.md, etc.), new/modified skills, off-hours modifications, large files, and hidden files
- **Cross-reference** — Pulls data from warden (baseline deviations), ledger (chain breaks), signet (tampered signatures), and sentinel (known threats)
- **Timeline** — Builds a summary of recent events based on file modification times
- **Severity scoring** — Calculates an overall incident severity: CRITICAL, HIGH, MEDIUM, or LOW

### Timeline

Builds a detailed chronological view of workspace activity:

- Lists all file modifications grouped by hour
- Highlights suspicious burst activity (many files modified in a short window)
- Shows which directories and skills were affected
- Cross-references with ledger entries if available

### Scope

Assesses the blast radius of a potential compromise:

- Categorizes all files by risk: critical workspace files, memory files, skill files, config files
- Scans recently modified files for credential exposure patterns (API keys, tokens, AWS keys)
- Scans for outbound exfiltration URLs (ngrok, webhook.site, raw IPs, etc.)
- Estimates scope level: CONTAINED, SPREADING, or SYSTEMIC

### Evidence Collection

Preserves forensic data before remediation:

- Snapshots full workspace state (file list with SHA-256 hashes, sizes, timestamps)
- Copies all security tool data (.integrity/, .ledger/, .signet/, .sentinel/)
- Generates a collection summary
- Saves everything to `.triage/evidence-{timestamp}/` or a custom directory

Always run evidence collection before any remediation to preserve the forensic trail.

### Status

Quick check of triage state: last investigation timestamp, current threat level, and whether evidence has been collected.

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

| Feature                                            | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| -------------------------------------------------- | ---- | ------------------------------------------ |
| Full investigation                                 | Yes  | Yes                                        |
| Event timeline                                     | Yes  | Yes                                        |
| Blast radius assessment                            | Yes  | Yes                                        |
| Evidence collection                                | Yes  | Yes                                        |
| Cross-reference (warden, ledger, signet, sentinel) | Yes  | Yes                                        |
| Severity scoring                                   | Yes  | Yes                                        |
| Automated containment (quarantine affected skills) | -    | Yes                                        |
| Critical file restore from backup                  | -    | Yes                                        |
| Remediation playbooks                              | -    | Yes                                        |
| Evidence chain-of-custody                          | -    | Yes                                        |
| Incident report export (JSON, HTML)                | -    | Yes                                        |
| Integration hooks with all OpenClaw tools          | -    | Yes                                        |
| Post-incident hardening recommendations            | -    | Yes                                        |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
