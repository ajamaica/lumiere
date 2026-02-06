# OpenClaw Sentinel Pro

Full supply chain security suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-sentinel](https://github.com/AtlasPA/openclaw-sentinel) (free) plus automated countermeasures: quarantine, reject, SBOM generation, continuous monitoring, and full automated protection sweeps.

**Free version alerts. Pro version subverts, quarantines, and defends.**

## The Problem

You install skills from the community and trust them to run in your workspace. Any skill can contain obfuscated payloads, post-install hooks that execute arbitrary code, or supply chain attacks that silently modify other skills. Detection alone is not enough — you need automated response capabilities that neutralize threats before they cause damage.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-sentinel-pro.git

# Copy to your workspace skills directory
cp -r openclaw-sentinel-pro ~/.openclaw/workspace/skills/
```

## Quick Start

```bash
# Full automated protection (recommended for session startup)
python3 scripts/sentinel.py protect

# Scan all skills
python3 scripts/sentinel.py scan

# Quarantine a risky skill
python3 scripts/sentinel.py quarantine suspicious-skill

# Generate SBOM
python3 scripts/sentinel.py sbom

# Monitor for changes
python3 scripts/sentinel.py monitor
```

## Usage

### Detection (also in free version)

```bash
# Scan all installed skills for supply chain risks
python3 scripts/sentinel.py scan

# Scan a specific skill
python3 scripts/sentinel.py scan openclaw-warden

# Pre-install inspection (before copying to workspace)
python3 scripts/sentinel.py inspect /path/to/downloaded-skill

# View threat database stats
python3 scripts/sentinel.py threats

# Import community threat list
python3 scripts/sentinel.py threats --update-from community-threats.json

# Quick status (includes quarantine info)
python3 scripts/sentinel.py status
```

### Pro Countermeasures

```bash
# Quarantine a risky skill (disables it, records evidence)
python3 scripts/sentinel.py quarantine bad-skill

# Restore a quarantined skill after investigation
python3 scripts/sentinel.py unquarantine bad-skill

# Permanently remove a HIGH+ risk skill (moves to evidence archive)
python3 scripts/sentinel.py reject bad-skill

# Generate Software Bill of Materials
python3 scripts/sentinel.py sbom

# Compare current scan against previous (detect changes)
python3 scripts/sentinel.py monitor

# Full automated sweep: scan + auto-quarantine + SBOM + report
python3 scripts/sentinel.py protect
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## Free vs Pro

| Feature                                       | Free | Pro |
| --------------------------------------------- | ---- | --- |
| Deep supply chain scanning                    | Yes  | Yes |
| Pre-install inspection (SAFE/REVIEW/REJECT)   | Yes  | Yes |
| Local threat database                         | Yes  | Yes |
| Risk scoring (0-100 per skill)                | Yes  | Yes |
| Obfuscation detection                         | Yes  | Yes |
| Dependency confusion detection                | Yes  | Yes |
| Metadata inconsistency checks                 | Yes  | Yes |
| Scan history                                  | Yes  | Yes |
| **Quarantine risky skills**                   | -    | Yes |
| **Unquarantine after review**                 | -    | Yes |
| **Reject and archive HIGH+ risk skills**      | -    | Yes |
| **SBOM generation (file hashes, deps, risk)** | -    | Yes |
| **Continuous monitoring (diff scans)**        | -    | Yes |
| **Automated protection sweep**                | -    | Yes |
| **Quarantine evidence recording**             | -    | Yes |
| **Session startup integration**               | -    | Yes |

## What It Detects

- **Encoded Execution** — eval(base64.b64decode(...)), exec(compile(...)), eval/exec with encoded strings
- **Dynamic Imports** — \_\_import\_\_('os').system(...), dynamic subprocess/ctypes imports
- **Shell Injection** — subprocess with shell=True + string concatenation, os.system()
- **Remote Code Execution** — urllib/requests combined with exec/eval (download-and-run)
- **Obfuscation** — Lines over 1000 chars, high-entropy strings, minified code blocks
- **Install Behaviors** — Post-install hooks, auto-exec in \_\_init\_\_.py, cross-skill file writes
- **Hidden Files** — Non-standard dotfiles and hidden directories
- **Dependency Confusion** — Skills shadowing popular package names, typosquatting near-matches
- **Metadata Mismatch** — Undeclared binaries, undeclared env vars, invocable flag inconsistencies
- **Serialization Attacks** — pickle.loads, marshal.loads (arbitrary code via deserialization)
- **Known-Bad Hashes** — File SHA-256 matches against a local threat database

## How Protection Works

The `protect` command runs a four-phase automated sweep:

1. **Scan** — Deep scan of all installed skills with full pattern matching
2. **Quarantine** — Auto-quarantine any skill with CRITICAL risk (score 75+), recording evidence
3. **SBOM** — Generate a Software Bill of Materials for remaining skills
4. **Report** — Save scan history and produce a summary of actions taken

Skills are quarantined by renaming the directory with a `.quarantined-` prefix. Evidence is recorded in `.quarantine/sentinel/{skill}-evidence.json` including findings, file inventory, and SHA-256 hashes.

## Exit Codes

| Code | Meaning                         |
| ---- | ------------------------------- |
| 0    | Clean                           |
| 1    | Review needed                   |
| 2    | Threats detected or quarantined |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
