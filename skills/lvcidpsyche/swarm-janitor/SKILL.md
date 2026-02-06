---
name: swarm-janitor
description: Enterprise-grade OpenClaw skill for cleaning up orphaned subagent processes, archiving transcripts to SuperMemory, and freeing disk space without losing work. Features dry-run mode, configurable retention policies, and comprehensive safety checks.
homepage: https://github.com/openclawdad/swarm-janitor
author: OpenClawdad (Redclay)
tags: [maintenance, cleanup, subagents, memory-management, enterprise]
metadata:
  clawdbot:
    emoji: 🧹
    requires:
      bins: [python3]
    install: []
---

# Swarm Janitor

Enterprise-grade cleanup tool for OpenClaw subagent management.

## What It Does

Automatically identifies and cleans up orphaned subagent sessions while preserving important work through SuperMemory archival.

### Core Functions

- **Scan**: Analyze session directory for orphaned/abandoned subagents
- **Archive**: Save transcripts to SuperMemory before deletion
- **Clean**: Safely remove orphaned sessions freeing disk space
- **Report**: Generate detailed cleanup reports

## Safety First

This skill implements multiple safety layers:

- ✅ **Never deletes active sessions** — checks process status
- ✅ **Dry-run mode** — preview changes before executing
- ✅ **SuperMemory backup** — transcripts archived before deletion
- ✅ **Configurable retention** — customize age thresholds
- ✅ **Detailed logging** — full audit trail of all actions

## Quick Start

```bash
# Preview what would be cleaned (dry-run)
python3 scripts/swarm_janitor.py --dry-run

# Archive old sessions to SuperMemory, then clean
python3 scripts/swarm_janitor.py --archive --clean

# Custom retention (7 days instead of default 3)
python3 scripts/swarm_janitor.py --retention-days 7 --clean
```

## Installation

1. Copy this skill to your OpenClaw workspace:

   ```bash
   cp -r skills/swarm-janitor ~/.openclaw/workspace/skills/
   ```

2. Configure retention policy (optional):

   ```bash
   # Edit config to customize
   nano references/config.yaml
   ```

3. Run first scan:
   ```bash
   python3 ~/.openclaw/workspace/skills/swarm-janitor/scripts/swarm_janitor.py --dry-run
   ```

## Usage Patterns

### Daily Maintenance (Cron)

```cron
# Run daily at 3 AM, archive sessions older than 3 days
0 3 * * * python3 ~/.openclaw/workspace/skills/swarm-janitor/scripts/swarm_janitor.py --archive --clean --retention-days 3 >> /var/log/swarm-janitor.log 2>&1
```

### Manual Cleanup

```bash
# See what would be deleted
python3 scripts/swarm_janitor.py --dry-run --verbose

# Archive transcripts to SuperMemory
python3 scripts/swarm_janitor.py --archive

# Clean without archiving (not recommended)
python3 scripts/swarm_janitor.py --clean --no-archive

# Full report
python3 scripts/swarm_janitor.py --report --output json
```

### Emergency Cleanup

```bash
# Aggressive cleanup with 1-day retention
python3 scripts/swarm_janitor.py --clean --retention-days 1 --force
```

## Configuration

See [references/config.yaml](references/config.yaml) for:

- Retention policies
- Archive destinations
- Safety thresholds
- Logging options

## How It Works

1. **Discovery**: Scans `~/.openclaw/agents/main/sessions/`
2. **Analysis**: Determines session age, activity status, size
3. **Classification**: Identifies orphaned vs active sessions
4. **Archival**: Saves transcripts to SuperMemory (if enabled)
5. **Cleanup**: Safely removes orphaned session files
6. **Reporting**: Generates summary of actions taken

## Safety Mechanisms

| Check            | Description                                        |
| ---------------- | -------------------------------------------------- |
| Process Check    | Verifies no active process owns the session        |
| Age Verification | Only processes sessions older than threshold       |
| Size Limits      | Warns on unusually large deletions                 |
| Dry-Run Default  | Preview mode is default — explicit action required |
| Backup First     | Archives to SuperMemory before any deletion        |

## Troubleshooting

**Q: It says "permission denied"**
A: Ensure you have write access to the sessions directory

**Q: Sessions not being detected**
A: Check the path in config.yaml matches your OpenClaw installation

**Q: SuperMemory archive failing**
A: Verify SuperMemory skill is configured with valid API key

## Enterprise Features

- **Audit Logging**: All actions logged with timestamps
- **Configurable Policies**: YAML-based configuration
- **Metrics Export**: JSON/CSV output for monitoring
- **Dry-Run Mode**: Test changes before applying
- **Retention Policies**: Age-based and count-based rules

## License

MIT - Created by OpenClawdad (Redclay) for the OpenClaw community.
