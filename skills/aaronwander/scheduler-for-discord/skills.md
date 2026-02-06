---
name: schedule
description: Create and manage scheduled reminders and posts. Use when the user asks Moltbot to send a message later or on a recurring schedule (especially to the current Discord channel) without requiring them to provide channel IDs.
metadata: { 'moltbot': { 'emoji': '⏰', 'requires': { 'config': ['channels.discord'] } } }
---

# Scheduler (cron)

This skill schedules future actions using Moltbot’s `cron` CLI (via `exec`), defaulting to delivering the result back into the **current** Discord channel when available.

## What to collect

- **When**: either a one-shot time (`in 2 minutes`, `at 20:00`) or a recurring schedule (`every day at 20:00`).
- **Timezone**: ask if ambiguous; otherwise prefer the gateway host’s timezone.
- **What**: what the message should say, or what should be generated.
- **Where**:
  - If the request came from **Discord**, use the message context’s channel id and set delivery target to `channel:<id>`.
  - If the request came from another surface (webchat/terminal), ask for a destination (Discord channel ID, Telegram chat ID, etc).

## Key rules

- Cron jobs run in the background, so there is no “current channel” at execution time. Always **capture the channel id at creation time** and bake it into the cron job (`--channel discord --to channel:<id>`).
- Use an **isolated agent job** for scheduled messages (prevents the “Main jobs require --system-event” error).
- Avoid ambiguous Discord names like `#test`; always deliver to an explicit `channel:<id>` or `user:<id>`.

## Implementation (use `exec`)

### One-shot message to the current Discord channel

If the user says “remind me in 2 minutes” (or similar), schedule a one-shot isolated agent job:

```bash
moltbot cron add \
  --name "<short-name>" \
  --session isolated \
  --at 2m \
  --agent main \
  --message "<message text>" \
  --deliver \
  --channel discord \
  --to channel:<DISCORD_CHANNEL_ID> \
  --delete-after-run
```

Notes:

- `--at` accepts `2m`, `20m`, `1h`, or an ISO timestamp. Do **not** use `+2m`.

### Daily “tomorrow plan” at 20:00 (recurring)

If the user says “every day at 8pm, send me tomorrow’s work plan”, create a recurring cron job that instructs the agent to generate the plan and deliver it:

```bash
moltbot cron add \
  --name "tomorrow-plan" \
  --session isolated \
  --cron "0 20 * * *" \
  --tz "Asia/Shanghai" \
  --agent main \
  --message "At execution time, write tomorrow's work plan. Keep it concise. Include: priorities, schedule blocks, risks, and a short checklist." \
  --deliver \
  --channel discord \
  --to channel:<DISCORD_CHANNEL_ID>
```

### Verify

```bash
moltbot cron list
moltbot cron runs --id <JOB_ID>
```

## How to find the current Discord channel id

When the user request comes from Discord, the message context includes channel identifiers (e.g. `channel=...` / `discord channel id ...`). Use that value for `channel:<id>`.

If the context does not include it, ask the user to provide a Discord message link (from which you can extract the channel id), or the channel id directly.
