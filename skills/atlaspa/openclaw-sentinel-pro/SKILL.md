---
name: openclaw-sentinel-pro
description: 'Full supply chain security suite: scan skills for obfuscation and malware patterns, auto-quarantine risky skills, generate SBOMs, continuous monitoring, and community threat feeds. Everything in openclaw-sentinel (free) plus automated countermeasures.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🏰', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Sentinel Pro

Everything in [openclaw-sentinel](https://github.com/AtlasPA/openclaw-sentinel) (free) plus automated countermeasures.

**Free version detects threats. Pro version subverts, quarantines, and defends.**

## Detection Commands (also in free)

### Scan Installed Skills

Deep scan of all installed skills for supply chain risks. Checks file hashes against a local threat database, detects obfuscated code patterns, suspicious install behaviors, dependency confusion, and metadata inconsistencies. Generates a risk score (0-100) per skill.

```bash
python3 {baseDir}/scripts/sentinel.py scan --workspace /path/to/workspace
```

### Scan a Single Skill

```bash
python3 {baseDir}/scripts/sentinel.py scan openclaw-warden --workspace /path/to/workspace
```

### Pre-Install Inspection

Scan a skill directory BEFORE copying it to your workspace. Outputs a SAFE/REVIEW/REJECT recommendation and shows exactly what binaries, network calls, and file operations the skill will perform.

```bash
python3 {baseDir}/scripts/sentinel.py inspect /path/to/skill-directory
```

### Manage Threat Database

View current threat database statistics.

```bash
python3 {baseDir}/scripts/sentinel.py threats --workspace /path/to/workspace
```

Import a community-shared threat list.

```bash
python3 {baseDir}/scripts/sentinel.py threats --update-from threats.json --workspace /path/to/workspace
```

### Quick Status

Summary of installed skills, quarantined skills, scan history, SBOM history, and risk score overview.

```bash
python3 {baseDir}/scripts/sentinel.py status --workspace /path/to/workspace
```

## Pro Countermeasures

### Quarantine a Skill

Disable a risky skill by renaming its directory with a `.quarantined-` prefix. The agent will not load quarantined skills. Records full evidence (findings, file inventory, hashes) in `.quarantine/sentinel/{skill}-evidence.json`.

```bash
python3 {baseDir}/scripts/sentinel.py quarantine bad-skill --workspace /path/to/workspace
```

### Unquarantine a Skill

Restore a quarantined skill after investigation. Shows the original quarantine evidence before restoring.

```bash
python3 {baseDir}/scripts/sentinel.py unquarantine bad-skill --workspace /path/to/workspace
```

### Reject a Skill

Permanently remove a skill with HIGH+ risk score (50+). The skill is moved to `.quarantine/sentinel/` for forensic review, not deleted. Skills below the threshold are blocked from rejection — use quarantine instead.

```bash
python3 {baseDir}/scripts/sentinel.py reject bad-skill --workspace /path/to/workspace
```

### Generate SBOM

Generate a Software Bill of Materials for all installed skills. Includes file inventory with SHA-256 hashes, declared dependencies, detected dependencies, and risk scores. Saved to `.sentinel/sbom-{timestamp}.json`.

```bash
python3 {baseDir}/scripts/sentinel.py sbom --workspace /path/to/workspace
```

### Continuous Monitoring

Compare the current scan against the previous scan. Reports new threats, changed risk scores, new skills, and removed/quarantined skills. Saves scan results to `.sentinel/scans/` for historical tracking.

```bash
python3 {baseDir}/scripts/sentinel.py monitor --workspace /path/to/workspace
```

### Protect (Automated Sweep)

Full automated protection sweep in one command: scan all skills, auto-quarantine CRITICAL risk skills (score 75+), generate SBOM, update scan history, and produce a protection report. This is the recommended command for session startup.

```bash
python3 {baseDir}/scripts/sentinel.py protect --workspace /path/to/workspace
```

## Recommended Integration

### Session Startup Hook (Claude Code)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 scripts/sentinel.py protect",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### Heartbeat (OpenClaw)

Add to HEARTBEAT.md for periodic protection:

```
- Run supply chain protection sweep (python3 {skill:openclaw-sentinel-pro}/scripts/sentinel.py protect)
```

### After Installing New Skills

Run `protect` to auto-quarantine skills that contain malicious patterns.

## Workspace Auto-Detection

If `--workspace` is omitted, the script tries:

1. `OPENCLAW_WORKSPACE` environment variable
2. Current directory (if AGENTS.md exists)
3. `~/.openclaw/workspace` (default)

## What It Detects

| Category                 | Patterns                                                                        |
| ------------------------ | ------------------------------------------------------------------------------- |
| **Encoded Execution**    | eval(base64.b64decode(...)), exec(compile(...)), eval/exec with encoded strings |
| **Dynamic Imports**      | \_\_import\_\_('os').system(...), dynamic subprocess/ctypes imports             |
| **Shell Injection**      | subprocess.Popen with shell=True + string concatenation, os.system()            |
| **Remote Code Exec**     | urllib/requests combined with exec/eval — download-and-run patterns             |
| **Obfuscation**          | Lines >1000 chars, high-entropy strings, minified code blocks                   |
| **Install Behaviors**    | Post-install hooks, auto-exec in \_\_init\_\_.py, cross-skill file writes       |
| **Hidden Files**         | Non-standard dotfiles and hidden directories                                    |
| **Dependency Confusion** | Skills shadowing popular package names, typosquatting near-matches              |
| **Metadata Mismatch**    | Undeclared binaries, undeclared env vars, invocable flag inconsistencies        |
| **Serialization**        | pickle.loads, marshal.loads — arbitrary code execution via deserialization      |
| **Known-Bad Hashes**     | File SHA-256 matches against local threat database                              |

## Risk Scoring

Each skill receives a score from 0-100:

| Score  | Label    | Meaning                                                 |
| ------ | -------- | ------------------------------------------------------- |
| 0      | CLEAN    | No issues detected                                      |
| 1-19   | LOW      | Minor findings, likely benign                           |
| 20-49  | MODERATE | Review recommended                                      |
| 50-74  | HIGH     | Significant risk, review required                       |
| 75-100 | CRITICAL | Serious supply chain risk — auto-quarantined by protect |

## Countermeasure Summary

| Command                | Action                                               |
| ---------------------- | ---------------------------------------------------- |
| `protect`              | Full scan + auto-quarantine CRITICAL + SBOM + report |
| `quarantine <skill>`   | Disable skill with evidence recording                |
| `unquarantine <skill>` | Re-enable a quarantined skill                        |
| `reject <skill>`       | Permanently remove HIGH+ risk skill                  |
| `sbom`                 | Generate Software Bill of Materials                  |
| `monitor`              | Diff current vs previous scan, report changes        |

## Exit Codes

- `0` — Clean, no issues
- `1` — Review needed
- `2` — Threats detected or quarantined

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
