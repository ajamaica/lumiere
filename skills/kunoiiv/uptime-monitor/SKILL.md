---
name: uptime-monitor
description: 24/7 OpenClaw uptime monitor. Every 5min cron ping → writes dead.json if down, uptime.json after 7d (168h) continuous alive streak. Use when setting up persistent monitoring (cron setup, streak tracking, status files).
---

# Uptime Monitor

Silent 24/7 sentinel: Tracks OpenClaw/Gateway alive → dead.json (fail) or uptime.json (7d streak). Files in workspace/uptime/.

## Quick Setup (One-Shot)

```bash
# Install cron (5min pings)
📊 cron add uptime-5m '{"kind":"every","everyMs":300000}' '{"kind":"systemEvent","text":"UPTIME CHECK 👻"}' --sessionTarget main

# View status/logs
📊 cron list
📊 cron runs uptime-5m
```

## Workflow (Auto on "UPTIME CHECK")

1. **Ping**: `📊 session_status` + `openclaw gateway status` (via exec).
2. **Success**: Update `uptime/streak.json` (hours += 5/60). If >=168h → write `uptime/uptime.json`.
3. **Fail**: Write `uptime/dead.json` {ts, downtime_start: now}.
4. **Dirs**: Auto-mkdir `uptime/`.

**Streak Reset**: On fail → streak=0.

## Files (Workspace/uptime/)

- `streak.json`: `{"streak_hours": 24.5, "last_ping": 1738746800000}`
- `uptime.json`: `{"streak_hours": 168.1, "verified": true, "end_ts": 1738746800000}` (7d+)
- `dead.json`: `{"ts": 1738746800000, "downtime_start": 1738746800000}`

## Edge Handling

- First run: streak=0.
- Cron miss: Streak holds (no false-dead).
- Manual: `message "UPTIME CHECK 👻"` triggers.

No alerts/deps. Pure files. Prod eternal.

## Script (Optional Exec)

`scripts/uptime-check.js`: Standalone Node ping (for manual/cron spawn).

Prod: Cron → silent forever.
