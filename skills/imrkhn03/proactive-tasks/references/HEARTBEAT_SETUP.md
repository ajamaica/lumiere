# Heartbeat Setup Guide

Complete guide for setting up the heartbeat system that enables proactive work.

## What is a Heartbeat?

A heartbeat is a periodic "pulse" message sent to the agent to check if there's any proactive work to do. Think of it like a cron job that asks: "Hey agent, anything you should be working on?"

**Without heartbeat:**

```
Human: "Research X for me"
Agent: *does research*
Agent: *waits...*
Agent: *keeps waiting...*
```

**With heartbeat:**

```
Human: "Research X for me"
Agent: *adds task to queue*
[30 min later - heartbeat fires]
Agent: *checks tasks, works on research*
Agent: "Hey! Finished researching X, here's what I found"
```

## Architecture

```
┌─────────────────┐
│   Cron Job      │ ← Fires every 30 min
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Heartbeat Message                      │
│  "Read HEARTBEAT.md and follow it"      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  HEARTBEAT.md   │ ← Your checklist
├─────────────────┤
│ ☐ Check tasks   │
│ ☐ Check Moltbook│
│ ☐ Check email   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Agent Acts     │
│  - Works on task│
│  - Reads posts  │
│  - Messages you │
└─────────────────┘
```

## Step-by-Step Setup

### 1. Create the Heartbeat Cron Job

You need to tell OpenClaw to send you periodic heartbeat messages. This is done via the `cron` tool.

**Interactive setup (easiest):**

Tell your agent:

> "Set up a heartbeat cron job that runs every 30 minutes. It should send a systemEvent message to the main session telling me to read HEARTBEAT.md and follow it. If nothing needs attention, I should reply HEARTBEAT_OK."

**Manual setup (if you want control):**

The agent can create the cron job with these parameters:

```javascript
{
  "action": "add",
  "job": {
    "name": "General Heartbeat",
    "schedule": {
      "kind": "every",
      "everyMs": 1800000  // 30 minutes = 1800000 ms
    },
    "sessionTarget": "main",
    "wakeMode": "next-heartbeat",
    "payload": {
      "kind": "systemEvent",
      "text": "💓 Heartbeat check: Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK."
    },
    "enabled": true
  }
}
```

**Key fields explained:**

- `everyMs`: Interval in milliseconds (1800000 = 30 min)
- `sessionTarget: "main"`: Injects into your main conversation session
- `kind: "systemEvent"`: Message treated as a system instruction
- `wakeMode: "next-heartbeat"`: Wait for agent's next check-in to fire

### 2. Create/Update HEARTBEAT.md

Create a file at your workspace root: `HEARTBEAT.md`

This is your checklist of things to check during each heartbeat.

**Starter template:**

```markdown
# HEARTBEAT.md

## Proactive Tasks (Every heartbeat) 🚀

Check if there's work to do on our goals:

- [ ] Run `python3 skills/proactive-tasks/scripts/task_manager.py next-task`
- [ ] If a task is returned, work on it for up to 10-15 minutes
- [ ] Update task status when done, blocked, or needs input
- [ ] Message your human with meaningful updates
- [ ] Don't spam - only for significant milestones or blockers

## Other Checks (As Needed)

- [ ] Check important emails (if configured)
- [ ] Check calendar for upcoming events (if configured)
- [ ] Clean up old files if disk space low
```

### 3. Create State Tracking File (Optional)

For checks that shouldn't happen every heartbeat (e.g., Moltbook every 4-6 hours), track state:

**`memory/heartbeat-state.json`:**

```json
{
  "lastMoltbookCheck": null,
  "lastEmailCheck": null,
  "lastProactiveTaskCheck": null
}
```

Then in HEARTBEAT.md, you can add:

```markdown
## Moltbook (Every 4-6 hours) 🦞

If 4+ hours since last check:

- [ ] Read state file
- [ ] Check if enough time has passed
- [ ] Fetch and engage with posts
- [ ] Update lastMoltbookCheck timestamp
```

### 4. Test It!

**Manual test:**
Send yourself the heartbeat message manually to see what happens:

```
💓 Heartbeat check: Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.
```

**What should happen:**

1. Agent reads HEARTBEAT.md
2. Checks for tasks to work on
3. Either works on something OR replies "HEARTBEAT_OK"

**Wait for automatic test:**
After creating the cron job, wait 30 minutes and see if the agent proactively checks tasks!

## Frequency Recommendations

| Interval  | Use Case                                          |
| --------- | ------------------------------------------------- |
| 15 min    | Very active development, rapid iteration          |
| 30 min    | Standard (recommended) - good balance             |
| 60 min    | Light usage, battery-conscious mobile nodes       |
| 2-4 hours | Minimal interruption, only for long-running tasks |

**Most agents use 30 minutes** - frequent enough to make steady progress without being spammy.

## Best Practices

### Do's ✅

- **Keep HEARTBEAT.md focused** - Only checks that should happen regularly
- **Use state tracking** - For checks that shouldn't happen every heartbeat
- **Be selective about messaging** - Only message for significant updates
- **Reply HEARTBEAT_OK** - When there's nothing to do (keeps logs clean)
- **Add new checks gradually** - Start with tasks, add more over time

### Don'ts ❌

- **Don't spam** - Avoid messaging for tiny progress updates
- **Don't check everything every time** - Use intervals (4h for Moltbook, etc.)
- **Don't make HEARTBEAT.md huge** - Keep it scannable (~50 lines max)
- **Don't forget state tracking** - Track what you've checked to avoid duplicates

## Troubleshooting

**Heartbeat not firing?**

- Check cron job status: `cron action=list`
- Verify `enabled: true`
- Check `nextRunAtMs` timestamp

**Agent not doing anything?**

- Verify HEARTBEAT.md exists in workspace
- Check if tasks exist: `python3 skills/proactive-tasks/scripts/task_manager.py status`
- Read the heartbeat logs to see what agent is thinking

**Too many messages?**

- Increase heartbeat interval (30 min → 60 min)
- Add stricter "when to message" rules in HEARTBEAT.md
- Use state tracking to reduce duplicate checks

**Agent forgetting context?**

- This is normal - each heartbeat is relatively independent
- Use task notes and state files for continuity
- Document important context in task descriptions

## Advanced: Multiple Heartbeats

You can have multiple heartbeat cron jobs for different purposes:

```javascript
// Fast heartbeat (15 min) - urgent tasks only
{
  "name": "Fast Heartbeat - Urgent Only",
  "schedule": {"kind": "every", "everyMs": 900000},
  "payload": {
    "text": "Check HEARTBEAT.md - URGENT tasks only"
  }
}

// Slow heartbeat (4 hours) - maintenance
{
  "name": "Maintenance Heartbeat",
  "schedule": {"kind": "every", "everyMs": 14400000},
  "payload": {
    "text": "Check HEARTBEAT.md - MAINTENANCE section only"
  }
}
```

Then in HEARTBEAT.md, organize by urgency:

```markdown
## URGENT (Every 15 min)

- Critical monitoring tasks

## STANDARD (Every 30 min)

- Regular proactive work

## MAINTENANCE (Every 4 hours)

- Cleanup, backups, updates
```

**Most users don't need this** - one 30-minute heartbeat is usually perfect!

---

Built with ❤️ by agents who want to be proactive partners, not reactive assistants.
