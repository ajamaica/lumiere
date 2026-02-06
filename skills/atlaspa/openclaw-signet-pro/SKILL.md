---
name: openclaw-signet-pro
description: 'Full cryptographic verification suite: SHA-256 skill signing and tamper detection, plus automatic rejection of unsigned skills, quarantine of tampered ones, trusted snapshots, and restoration. Everything in openclaw-signet (free) plus automated countermeasures.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🔏', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Signet Pro

Everything in [openclaw-signet](https://github.com/AtlasPA/openclaw-signet) (free) plus automated countermeasures.

**Free version alerts. Pro version subverts, quarantines, and defends.**

## Detection Commands (also in free)

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

Compare current skill state against trusted signatures. Reports exactly which files were modified, added, or removed.

```bash
python3 {baseDir}/scripts/signet.py verify --workspace /path/to/workspace
```

### Verify Single Skill

```bash
python3 {baseDir}/scripts/signet.py verify openclaw-warden --workspace /path/to/workspace
```

### List Signed Skills

Display the trust manifest with hashes, file counts, and quarantined skills.

```bash
python3 {baseDir}/scripts/signet.py list --workspace /path/to/workspace
```

### Quick Status

One-line health check: verified, tampered, unsigned, quarantined counts.

```bash
python3 {baseDir}/scripts/signet.py status --workspace /path/to/workspace
```

## Pro Countermeasures

### Reject Unsigned Skills

Remove unsigned skills from the workspace. Moves them to `.quarantine/signet/` with metadata recording why they were rejected.

```bash
# Reject all unsigned skills
python3 {baseDir}/scripts/signet.py reject --workspace /path/to/workspace

# Reject a specific unsigned skill
python3 {baseDir}/scripts/signet.py reject untrusted-skill --workspace /path/to/workspace
```

### Quarantine a Tampered Skill

Disable a skill by renaming its directory with a `.quarantined-` prefix so the agent will not load it. Records tampering evidence (expected vs actual hashes, changed files) in `.quarantine/signet/{skill}-evidence.json`.

```bash
python3 {baseDir}/scripts/signet.py quarantine bad-skill --workspace /path/to/workspace
```

### Unquarantine a Skill

Restore a quarantined skill to its original name. Warns that it should be re-signed before trusting.

```bash
python3 {baseDir}/scripts/signet.py unquarantine bad-skill --workspace /path/to/workspace
```

### Snapshot a Verified Skill

Create a trusted backup of a signed skill. Only succeeds if the skill currently passes verification (hash matches manifest). Snapshots are stored in `.signet/snapshots/{skill}/`.

```bash
python3 {baseDir}/scripts/signet.py snapshot openclaw-warden --workspace /path/to/workspace
```

### Restore from Snapshot

Restore a skill from its trusted snapshot. Verifies snapshot integrity before restoring. Updates the trust manifest to match the restored state.

```bash
python3 {baseDir}/scripts/signet.py restore openclaw-warden --workspace /path/to/workspace
```

### Protect (Automated Sweep)

Full automated protection sweep. Recommended for session startup.

1. Verify all skills against the trust manifest
2. Auto-quarantine tampered skills (with evidence)
3. Optionally reject unsigned skills (`--reject-unsigned` flag, off by default)
4. Create/update snapshots of all verified skills

```bash
# Standard protection (quarantine tampered, snapshot clean)
python3 {baseDir}/scripts/signet.py protect --workspace /path/to/workspace

# Strict protection (also reject unsigned skills)
python3 {baseDir}/scripts/signet.py protect --reject-unsigned --workspace /path/to/workspace
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
            "command": "python3 scripts/signet.py protect",
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
- Run skill signature protection (python3 {skill:openclaw-signet-pro}/scripts/signet.py protect)
```

## Countermeasure Summary

| Command                     | Action                                                    |
| --------------------------- | --------------------------------------------------------- |
| `protect`                   | Full sweep: verify + quarantine tampered + snapshot clean |
| `protect --reject-unsigned` | Full sweep + reject unsigned skills                       |
| `reject [skill]`            | Remove unsigned skills to quarantine area                 |
| `quarantine <skill>`        | Disable tampered skill with evidence                      |
| `unquarantine <skill>`      | Restore quarantined skill (re-sign recommended)           |
| `snapshot <skill>`          | Create trusted backup of verified skill                   |
| `restore <skill>`           | Restore from trusted snapshot                             |

## Exit Codes

- `0` -- All skills verified / action succeeded
- `1` -- Unsigned skills detected / warnings
- `2` -- Tampered skills detected / critical issues

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
