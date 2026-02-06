# OpenClaw Signet Pro

Full cryptographic skill verification suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-signet](https://github.com/AtlasPA/openclaw-signet) (free) **plus automated countermeasures**: reject unsigned skills, quarantine tampered ones, create trusted snapshots, and restore from them.

## Free Version Alerts. Pro Version Responds.

| Feature                           | Free | Pro     |
| --------------------------------- | ---- | ------- |
| SHA-256 skill signing             | Yes  | Yes     |
| Tamper detection                  | Yes  | Yes     |
| File-level change report          | Yes  | Yes     |
| Trust manifest                    | Yes  | Yes     |
| Quick status check                | Yes  | Yes     |
| **Reject unsigned skills**        | -    | **Yes** |
| **Quarantine tampered skills**    | -    | **Yes** |
| **Tampering evidence collection** | -    | **Yes** |
| **Trusted snapshots**             | -    | **Yes** |
| **Restore from snapshot**         | -    | **Yes** |
| **Automated protection sweep**    | -    | **Yes** |

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-signet-pro.git

# Copy to your workspace skills directory
cp -r openclaw-signet-pro ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Sign all installed skills
python3 scripts/signet.py sign

# Sign a specific skill
python3 scripts/signet.py sign openclaw-warden

# Verify all skills
python3 scripts/signet.py verify

# List signed skills
python3 scripts/signet.py list

# Quick status
python3 scripts/signet.py status

# FULL PROTECTION SWEEP (recommended for session startup)
python3 scripts/signet.py protect

# Strict mode: also reject unsigned skills
python3 scripts/signet.py protect --reject-unsigned

# Reject unsigned skills
python3 scripts/signet.py reject

# Quarantine a tampered skill
python3 scripts/signet.py quarantine bad-skill

# Unquarantine after investigation
python3 scripts/signet.py unquarantine bad-skill

# Create trusted snapshot of a verified skill
python3 scripts/signet.py snapshot openclaw-warden

# Restore a skill from its trusted snapshot
python3 scripts/signet.py restore openclaw-warden
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## How It Works

```
sign:        Compute SHA-256 of every file -> composite hash -> store in manifest
verify:      Recompute hashes -> compare to manifest -> report differences
reject:      Move unsigned skills to .quarantine/signet/ with metadata
quarantine:  Rename tampered skill with .quarantined- prefix, save evidence
snapshot:    Copy verified skill to .signet/snapshots/ with integrity metadata
restore:     Verify snapshot integrity -> replace skill dir -> update manifest
protect:     verify + quarantine tampered + (optionally reject unsigned) + snapshot clean
```

## Countermeasures

| Command                     | Action                                                      |
| --------------------------- | ----------------------------------------------------------- |
| `protect`                   | Full sweep: verify all, quarantine tampered, snapshot clean |
| `protect --reject-unsigned` | Full sweep + reject unsigned skills                         |
| `reject [skill]`            | Move unsigned skills to quarantine area                     |
| `quarantine <skill>`        | Disable tampered skill with evidence recording              |
| `unquarantine <skill>`      | Re-enable quarantined skill (re-sign recommended)           |
| `snapshot <skill>`          | Create trusted backup of a verified skill                   |
| `restore <skill>`           | Restore from trusted snapshot with integrity check          |

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
            "command": "python3 scripts/signet.py protect",
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
- Run skill signature protection
```

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
