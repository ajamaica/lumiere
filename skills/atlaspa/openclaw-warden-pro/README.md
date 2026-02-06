# OpenClaw Warden Pro

Full workspace security suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-warden](https://github.com/AtlasPA/openclaw-warden) (free) **plus automated countermeasures**: snapshot restore, skill quarantine, git rollback, and one-command protection sweeps.

## Free Version Detects. Pro Version Responds.

| Feature                  | Free | Pro     |
| ------------------------ | ---- | ------- |
| Baseline checksums       | Yes  | Yes     |
| Integrity verification   | Yes  | Yes     |
| Injection scanning       | Yes  | Yes     |
| **Snapshot restore**     | -    | **Yes** |
| **Git rollback**         | -    | **Yes** |
| **Skill quarantine**     | -    | **Yes** |
| **Automated protect**    | -    | **Yes** |
| **Session startup hook** | -    | **Yes** |

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-warden-pro.git

# Copy to your workspace skills directory
cp -r openclaw-warden-pro ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Establish baseline (snapshots critical files for restoration)
python3 scripts/integrity.py baseline

# Check for modifications + injections
python3 scripts/integrity.py full

# AUTO-DETECT AND AUTO-RESPOND TO THREATS (recommended)
python3 scripts/integrity.py protect

# Quick health check
python3 scripts/integrity.py status

# Accept a legitimate change
python3 scripts/integrity.py accept SOUL.md

# Restore a tampered file from snapshot
python3 scripts/integrity.py restore SOUL.md

# Rollback a file to last git commit
python3 scripts/integrity.py rollback SOUL.md

# Quarantine a suspicious skill
python3 scripts/integrity.py quarantine bad-skill

# Restore a quarantined skill after investigation
python3 scripts/integrity.py unquarantine bad-skill
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## Countermeasures

| Command                | Action                                                                     |
| ---------------------- | -------------------------------------------------------------------------- |
| `protect`              | Full scan + auto-restore tampered files + auto-quarantine malicious skills |
| `restore <file>`       | Restore a single file from baseline snapshot                               |
| `rollback <file>`      | Restore a single file from git history                                     |
| `quarantine <skill>`   | Disable a skill by renaming its directory                                  |
| `unquarantine <skill>` | Re-enable a quarantined skill                                              |

The `baseline` command automatically snapshots critical, config, and skill files. These snapshots are used by `restore` and `protect` to undo tampering without manual intervention.

## Session Startup Integration

### Claude Code (hooks)

Add to `.claude/settings.json`:

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

### OpenClaw (heartbeat)

Add to HEARTBEAT.md:

```
- Run workspace integrity protection
```

### After Installing New Skills

Run `protect` to auto-quarantine skills that modified workspace files.

## What It Detects

### Integrity Violations

- Modified files (SHA-256 checksum comparison)
- Deleted files
- New untracked files

### Prompt Injection Patterns

- **Instruction override** — "ignore previous instructions", "you are now", "forget your instructions"
- **System prompt markers** — `<system>`, `[SYSTEM]`, `<<SYS>>`, `[INST]`
- **Markdown exfiltration** — Image tags with encoded data in URLs
- **Base64 payloads** — Large encoded blobs outside code blocks
- **Unicode manipulation** — Zero-width characters, RTL overrides, homoglyphs
- **HTML injection** — `<script>`, `<iframe>`, hidden elements
- **Shell injection** — `$(...)` subshell execution outside code blocks

## File Categories

| Category | Files                                                            | Alert Level |
| -------- | ---------------------------------------------------------------- | ----------- |
| Critical | SOUL.md, AGENTS.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md | WARNING     |
| Memory   | memory/\*.md, MEMORY.md                                          | INFO        |
| Config   | \*.json in workspace root                                        | WARNING     |
| Skills   | skills/\*/SKILL.md                                               | WARNING     |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
