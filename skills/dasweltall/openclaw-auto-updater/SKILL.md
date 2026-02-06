---
name: openclaw-auto-updater
description: Schedule automatic OpenClaw and skill updates with reliable cron templates, timezone-safe scheduling, and clear summary outputs. Use for hands-off maintenance, scheduled upgrades, and concise update reports.
---

# OpenClaw Auto-Updater

Run **scheduled updates** for OpenClaw and installed skills using cron messages (no scripts required). Focus: safe scheduling, predictable output, and minimal manual work.

## What it does

- Runs OpenClaw updates on a fixed schedule
- Updates all installed skills via ClawHub
- Sends a concise, readable summary (updated / unchanged / failed)

## Setup (daily updates)

**Daily at 03:30 Europe/Berlin**:

```bash
openclaw cron add \
  --name "OpenClaw Auto-Update" \
  --cron "30 3 * * *" \
  --tz "Europe/Berlin" \
  --session isolated \
  --wake now \
  --deliver \
  --message "Run daily auto-updates: 1) openclaw update --yes --json 2) clawdhub update --all 3) report versions updated + errors."
```

### Weekly (Sunday 04:00)

```bash
openclaw cron add \
  --name "OpenClaw Auto-Update (Weekly)" \
  --cron "0 4 * * 0" \
  --tz "Europe/Berlin" \
  --session isolated \
  --wake now \
  --deliver \
  --message "Run weekly auto-updates: openclaw update --yes --json; clawdhub update --all; summarize changes."
```

## Safer modes

**Dry run (no changes):**

```bash
openclaw cron add \
  --name "OpenClaw Auto-Update (Dry)" \
  --cron "30 3 * * *" \
  --tz "Europe/Berlin" \
  --session isolated \
  --wake now \
  --deliver \
  --message "Check updates only: openclaw update status; clawdhub update --all --dry-run; summarize what would change."
```

**Core only (skip skills):**

```bash
openclaw cron add \
  --name "OpenClaw Auto-Update (Core Only)" \
  --cron "30 3 * * *" \
  --tz "Europe/Berlin" \
  --session isolated \
  --wake now \
  --deliver \
  --message "Update OpenClaw only: openclaw update --yes --json; summarize version change."
```

## Summary format (recommended)

```
🔄 OpenClaw Auto-Update

OpenClaw: 2026.2.1 → 2026.2.2 (OK)
Skills updated: 3
Skills unchanged: 12
Errors: none
```

## Troubleshooting

- If updates fail, include the error in the summary.
- Schedule off-hours; updates may restart the gateway.
- Use explicit timezones to avoid surprises.

## References

- `references/agent-guide.md` → deeper implementation notes
- `references/summary-examples.md` → formatting examples
