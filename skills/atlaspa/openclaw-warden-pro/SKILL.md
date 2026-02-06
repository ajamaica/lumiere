---
name: openclaw-warden-pro
description: 'Full workspace security suite: detect unauthorized modifications, scan for prompt injection patterns, and automatically respond with countermeasures — snapshot restore, skill quarantine, git rollback, and automated protection sweeps. The complete post-installation security layer for agent workspaces.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🛡️', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Warden Pro

Everything in [openclaw-warden](https://github.com/AtlasPA/openclaw-warden) (free) plus automated countermeasures.

**Free version detects threats. Pro version responds to them.**

## Detection Commands (also in free)

```bash
python3 {baseDir}/scripts/integrity.py baseline --workspace /path/to/workspace
python3 {baseDir}/scripts/integrity.py verify --workspace /path/to/workspace
python3 {baseDir}/scripts/integrity.py scan --workspace /path/to/workspace
python3 {baseDir}/scripts/integrity.py full --workspace /path/to/workspace
python3 {baseDir}/scripts/integrity.py status --workspace /path/to/workspace
python3 {baseDir}/scripts/integrity.py accept SOUL.md --workspace /path/to/workspace
```

## Pro Countermeasures

### Restore from Snapshot

Restore a tampered file to its baseline snapshot. Critical, config, and skill files are automatically snapshotted when the baseline is established.

```bash
python3 {baseDir}/scripts/integrity.py restore SOUL.md --workspace /path/to/workspace
```

### Git Rollback

Restore a file to its last git-committed state.

```bash
python3 {baseDir}/scripts/integrity.py rollback SOUL.md --workspace /path/to/workspace
```

### Quarantine a Skill

Disable a suspicious skill by renaming its directory. The agent will not load quarantined skills.

```bash
python3 {baseDir}/scripts/integrity.py quarantine bad-skill --workspace /path/to/workspace
```

### Unquarantine a Skill

Restore a quarantined skill after investigation.

```bash
python3 {baseDir}/scripts/integrity.py unquarantine bad-skill --workspace /path/to/workspace
```

### Protect (Automated Response)

Full scan + automatic countermeasures in one pass: restore tampered critical files, quarantine malicious skills, flag remaining issues. This is the recommended command for session startup.

```bash
python3 {baseDir}/scripts/integrity.py protect --workspace /path/to/workspace
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
            "command": "python3 scripts/integrity.py protect",
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
- Run workspace integrity protection (python3 {skill:openclaw-warden-pro}/scripts/integrity.py protect)
```

### After Installing New Skills

Run `protect` to auto-quarantine skills that modified workspace files.

## What Gets Monitored

| Category     | Files                                                            | Alert Level |
| ------------ | ---------------------------------------------------------------- | ----------- |
| **Critical** | SOUL.md, AGENTS.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md | WARNING     |
| **Memory**   | memory/\*.md, MEMORY.md                                          | INFO        |
| **Config**   | \*.json in workspace root                                        | WARNING     |
| **Skills**   | skills/\*/SKILL.md                                               | WARNING     |

## Countermeasure Summary

| Command                | Action                                            |
| ---------------------- | ------------------------------------------------- |
| `protect`              | Full scan + auto-restore + auto-quarantine + flag |
| `restore <file>`       | Restore from baseline snapshot                    |
| `rollback <file>`      | Restore from git history                          |
| `quarantine <skill>`   | Disable skill by renaming directory               |
| `unquarantine <skill>` | Re-enable a quarantined skill                     |

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
