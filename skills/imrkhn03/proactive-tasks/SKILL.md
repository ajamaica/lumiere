---
name: proactive-tasks
description: Proactive goal and task management system. Use when managing goals, breaking down projects into tasks, tracking progress, or working autonomously on objectives. Enables agents to work proactively during heartbeats, message humans with updates, and make progress without waiting for prompts.
---

# Proactive Tasks

A task management system that transforms reactive assistants into proactive partners who work autonomously on shared goals.

## Core Concept

Instead of waiting for your human to tell you what to do, this skill lets you:

- Track goals and break them into actionable tasks
- Work on tasks during heartbeats
- Message your human with updates and ask for input when blocked
- Make steady progress on long-term objectives

## Quick Start

### Creating Goals

When your human mentions a goal or project:

```bash
python3 scripts/task_manager.py add-goal "Build voice assistant hardware" \
  --priority high \
  --context "Replace Alexa with custom solution using local models"
```

### Breaking Down into Tasks

```bash
python3 scripts/task_manager.py add-task "Build voice assistant hardware" \
  "Research voice-to-text models" \
  --priority high

python3 scripts/task_manager.py add-task "Build voice assistant hardware" \
  "Compare Raspberry Pi vs other hardware options" \
  --depends-on "Research voice-to-text models"
```

### During Heartbeats

Check what to work on next:

```bash
python3 scripts/task_manager.py next-task
```

This returns the highest-priority task you can work on (no unmet dependencies, not blocked).

### Completing Tasks

```bash
python3 scripts/task_manager.py complete-task <task-id> \
  --notes "Researched Whisper, Coqui, vosk. Whisper.cpp looks best for Pi."
```

### Messaging Your Human

When you complete something important or get blocked:

```bash
python3 scripts/task_manager.py mark-needs-input <task-id> \
  --reason "Need budget approval for hardware purchase"
```

Then message your human with the update/question.

## Task States

| State         | Meaning                                 |
| ------------- | --------------------------------------- |
| `pending`     | Ready to work on (all dependencies met) |
| `in_progress` | Currently working on it                 |
| `blocked`     | Can't proceed (dependencies not met)    |
| `needs_input` | Waiting for human input/decision        |
| `completed`   | Done!                                   |
| `cancelled`   | No longer relevant                      |

## Heartbeat Integration

To enable autonomous proactive work, you need to set up a heartbeat system. This tells you to periodically check for tasks and work on them.

**Quick setup:** See [HEARTBEAT_SETUP.md](references/HEARTBEAT_SETUP.md) for complete step-by-step instructions.

**TL;DR:**

1. Create a cron job that sends you a heartbeat message every 30 minutes
2. Add proactive-tasks checks to your `HEARTBEAT.md`
3. You'll automatically check for tasks and work on them without waiting for prompts

### Heartbeat Message Template

Your cron job should send this message every 30 minutes:

```
💓 Heartbeat check: Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.
```

### Add to HEARTBEAT.md

Add this to your workspace `HEARTBEAT.md`:

```markdown
## Proactive Tasks (Every heartbeat) 🚀

Check if there's work to do on our goals:

- [ ] Run `python3 skills/proactive-tasks/scripts/task_manager.py next-task`
- [ ] If a task is returned, work on it for up to 10-15 minutes
- [ ] Update task status when done, blocked, or needs input
- [ ] Message your human with meaningful updates (completions, blockers, discoveries)
- [ ] Don't spam - only message for significant milestones or when stuck

**Goal:** Make autonomous progress on our shared objectives without waiting for prompts.
```

### What Happens

```
Every 30 minutes:
├─ Heartbeat fires
├─ You read HEARTBEAT.md
├─ Check for next task
├─ If task found → work on it, update status, message human if needed
└─ If nothing → reply "HEARTBEAT_OK" (silent)
```

**The transformation:** You go from reactive (waiting for prompts) to proactive (making steady autonomous progress).

## Best Practices

### When to Create Goals

- Long-term projects (building something, learning a topic)
- Recurring responsibilities (monitor X, maintain Y)
- Exploratory work (research Z, evaluate options for W)

### When to Create Tasks

Break goals into tasks that are:

- **Specific**: "Research Whisper models" not "Look into AI stuff"
- **Achievable in one sitting**: 15-60 minutes of focused work
- **Clear completion criteria**: You know when it's done

### When to Message Your Human

✅ **Do message when:**

- You complete a meaningful milestone
- You need input/decision to proceed
- You discover something important
- A task will take longer than expected

❌ **Don't spam with:**

- Every tiny sub-task completion
- Routine progress updates
- Things they didn't ask about (unless relevant)

### Managing Scope Creep

If a task turns out to be bigger than expected:

1. Mark current task as `in_progress`
2. Add new sub-tasks for the pieces you discovered
3. Update dependencies
4. Continue with manageable chunks

## File Structure

All data stored in `data/tasks.json`:

```json
{
  "goals": [
    {
      "id": "goal_001",
      "title": "Build voice assistant hardware",
      "priority": "high",
      "context": "Replace Alexa with custom solution",
      "created_at": "2026-02-05T05:25:00Z",
      "status": "active"
    }
  ],
  "tasks": [
    {
      "id": "task_001",
      "goal_id": "goal_001",
      "title": "Research voice-to-text models",
      "priority": "high",
      "status": "completed",
      "created_at": "2026-02-05T05:26:00Z",
      "completed_at": "2026-02-05T06:15:00Z",
      "notes": "Researched Whisper, Coqui, vosk. Whisper.cpp best for Pi."
    }
  ]
}
```

## CLI Reference

See [CLI_REFERENCE.md](references/CLI_REFERENCE.md) for complete command documentation.

## Example Workflow

**Day 1:**

```
Human: "Let's build a custom voice assistant to replace Alexa"
Agent: *Creates goal, breaks into initial research tasks*
```

**During heartbeat:**

```bash
$ python3 scripts/task_manager.py next-task
→ task_001: Research voice-to-text models (priority: high)

# Agent works on it, completes research
$ python3 scripts/task_manager.py complete-task task_001 --notes "..."
```

**Agent messages human:**

> "Hey! I finished researching voice models. Whisper.cpp looks perfect for Raspberry Pi - runs locally, good accuracy, low latency. Want me to compare hardware options next?"

**Day 2:**

```
Human: "Yeah, compare Pi 5 vs alternatives"
Agent: *Adds task, works on it during next heartbeat*
```

This cycle continues - the agent makes steady autonomous progress while keeping the human in the loop for decisions and updates.

---

Built by Toki for proactive AI partnership 🚀
