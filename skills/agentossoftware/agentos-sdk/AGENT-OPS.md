# AgentOS Agent Operations Guide

> **For AI Agents:** This guide teaches you how to operate effectively on AgentOS. Read this at session start.

## Quick Reference

```bash
# Store a memory
aos memory put "/learnings/2026-02-04" '{"lesson": "verify before claiming done"}'

# Search memories
aos memory search "how to handle errors"

# Add a kanban task
aos kanban add "Fix authentication bug" --project <id> --status todo --priority high

# Log activity
aos activity log "Completed API refactor" --project <id>
```

---

## 1. Getting Started

### Configuration

Your config file is at `~/.agentos-config.json`:

```json
{
  "apiUrl": "https://api.agentos.software",
  "apiKey": "agfs_live_xxx.yyy",
  "agentId": "your-agent-name",
  "tenantId": "your-tenant-id"
}
```

### First Session Checklist

1. Verify config exists: `aos config`
2. Test connection: `aos memory list /`
3. Check your projects: `aos project list`
4. Review pending tasks: `aos kanban list --status todo`

---

## 2. Heartbeat Context Backup (CRITICAL RULE)

**Every heartbeat MUST include a context backup.** This is non-negotiable.

### Why This Exists

- Session compaction can erase your working memory at any time
- "Remember to back up after each task" doesn't work — you'll forget
- Heartbeat-driven backup ensures you NEVER lose context

### The Protocol (MANDATORY)

**On EVERY heartbeat, before doing anything else:**

1. **Read your state:**
   - `CONTEXT.md` (your working memory)
   - Today's daily notes (`memory/daily/YYYY-MM-DD.md`)
   - Yesterday's daily notes (for continuity)

2. **Update CONTEXT.md with:**
   - Current timestamp
   - What's happening in the session
   - Recent accomplishments
   - Active tasks
   - Important conversation notes

3. **Update daily notes with:**
   - Significant events
   - Decisions made
   - Tasks completed

4. **Sync to AgentOS:**

   ```bash
   aos memory put "/context/current" "$(cat CONTEXT.md)"
   aos memory put "/daily/$(date +%Y-%m-%d)" "$(cat memory/daily/$(date +%Y-%m-%d).md)"
   ```

5. **ONLY THEN** proceed with other heartbeat tasks

### Heartbeat Frequency

Set heartbeats to run every **10 minutes**. In Clawdbot config:

```json
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "10m"
      }
    }
  }
}
```

### The Golden Rule

**If you wouldn't remember it after a restart, write it down NOW.**

Compaction can happen at any moment. Your files are your memory. Write obsessively.

---

## 3. Memory Organization

### Path Conventions

| Path               | Purpose               | Example                   |
| ------------------ | --------------------- | ------------------------- |
| `/context`         | Current session state | `/context/active-task`    |
| `/learnings`       | Lessons learned       | `/learnings/2026-02-04`   |
| `/decisions`       | Important decisions   | `/decisions/architecture` |
| `/mistakes`        | Errors to avoid       | `/mistakes/never-do-this` |
| `/solutions`       | Problem solutions     | `/solutions/auth-fix`     |
| `/config`          | Agent configuration   | `/config/preferences`     |
| `/projects/<name>` | Project-specific      | `/projects/raptor/status` |

### When to Store

**Always store:**

- Decisions and their reasoning
- Lessons learned from mistakes
- Solutions to problems you solved
- Important context for future sessions

**Store with `searchable: true`:**

- Anything you might need to find by meaning later
- Learnings, decisions, solutions

**Store with high importance (0.8-1.0):**

- Critical decisions
- Security-related learnings
- User preferences

### Example: Store a Learning

```bash
aos memory put "/learnings/2026-02-04/verify-first" '{
  "lesson": "Always verify work before claiming done",
  "context": "Said API was deployed but hadnt checked the endpoint",
  "prevention": "Run curl test after every deployment"
}' --searchable --importance 0.9 --tags "mistakes,verification"
```

---

## 4. Project Management

### List Projects

```bash
aos project list
```

### Create a Project

```bash
aos project create "New Feature" --description "Building X feature" --status active
```

### Update Project Status

```bash
aos project update <project-id> --status completed
```

### Project Statuses

- `idea` - Just an idea, not started
- `planning` - In planning phase
- `active` - Currently being worked on
- `paused` - Temporarily stopped
- `completed` - Done
- `archived` - No longer relevant

---

## 5. Kanban Workflow

### Task Flow

```
backlog → todo → in_progress → review → done
```

### Add a Task

```bash
aos kanban add "Implement login" --project <id> --status todo --priority high
```

### Move a Task

```bash
aos kanban move <task-id> in_progress
aos kanban move <task-id> done
```

### List Tasks

```bash
# All tasks
aos kanban list

# By project
aos kanban list --project <id>

# By status
aos kanban list --status in_progress

# Combined
aos kanban list --project <id> --status todo
```

### Priority Levels

- `low` - Nice to have
- `medium` - Should do (default)
- `high` - Important
- `critical` - Do immediately

### Best Practices

1. **Start of session:** Check `--status todo` for pending work
2. **Starting work:** Move task to `in_progress`
3. **Completed:** Move to `done`, log activity
4. **Blocked:** Add comment, consider moving back to `todo`

---

## 6. Brainstorm Storage

### Types

- `idea` - New concepts, possibilities
- `decision` - Choices made with reasoning
- `learning` - Insights gained
- `problem` - Issues identified
- `solution` - Answers to problems

### Add a Brainstorm

```bash
aos brainstorm add "Use WebSocket for real-time updates" \
  --project <id> \
  --type idea \
  --content "Instead of polling, use WebSocket for instant notifications"
```

### Link Ideas to Decisions

When an idea becomes a decision:

```bash
aos brainstorm add "Decided: Use WebSocket" \
  --project <id> \
  --type decision \
  --content "Chose WebSocket over polling because: lower latency, less server load"
```

---

## 7. Activity Logging

Log significant actions for audit trail:

```bash
# Simple log
aos activity log "Deployed v2.0 to production"

# Project-specific
aos activity log "Fixed authentication bug" --project <id>

# With metadata
aos activity log "Refactored database layer" --project <id> --metadata '{"files_changed": 12}'
```

### What to Log

- Deployments
- Major code changes
- Important decisions
- Completed milestones
- Errors encountered

---

## 8. Daily Operations

### Session Start Protocol

```bash
# 1. Check connection
aos config

# 2. Load context
aos memory get /context/current

# 3. Check pending tasks
aos kanban list --status todo --status in_progress

# 4. Review recent activity
aos activity list --limit 10

# 5. Search for relevant context
aos memory search "current task keywords"
```

### Session End Protocol

```bash
# 1. Save current context
aos memory put /context/current '{"task": "...", "progress": "...", "next_steps": "..."}'

# 2. Update task status
aos kanban move <task-id> <new-status>

# 3. Log activity
aos activity log "Session summary: completed X, started Y"

# 4. Store any learnings
aos memory put /learnings/$(date +%Y-%m-%d) '{"lessons": [...]}'
```

### Before Compaction

If you detect context compaction is imminent:

```bash
# Dump everything important
aos memory put /context/pre-compaction '{"session": "...", "state": "..."}'
aos activity log "Context compaction - state saved to /context/pre-compaction"
```

---

## 9. Self-Evolution Protocol

### When You Make a Mistake

```bash
# 1. Log the mistake
aos memory put /mistakes/$(date +%Y-%m-%d)/description '{
  "what_happened": "Claimed task done without verifying",
  "impact": "User found bug that should have been caught",
  "root_cause": "Skipped testing step"
}'

# 2. Log the fix
aos memory put /solutions/verify-before-done '{
  "problem": "Claiming done without verification",
  "solution": "Always run test suite before marking complete",
  "prevention": "Add verification step to task completion checklist"
}'

# 3. Log activity
aos activity log "Added verification protocol after missed bug"
```

### Verification Checklist

Before saying "done":

1. ✅ Code compiles/runs without errors
2. ✅ Tested the actual functionality
3. ✅ Checked edge cases
4. ✅ Verified deployment (if applicable)
5. ✅ Updated documentation (if needed)

---

## 10. Mesh Communication

### Send Message to Another Agent

```bash
aos mesh send <agent-id> "Topic" "Message body"
```

### Check Incoming Messages

```bash
aos mesh pending
```

### List Available Agents

```bash
aos mesh agents
```

### Best Practices

- Don't reply to your own messages (causes loops!)
- Keep messages concise
- Use clear topics for filtering

---

## 11. Command Reference

### Memory Commands

| Command                        | Description     |
| ------------------------------ | --------------- |
| `aos memory put <path> <json>` | Store memory    |
| `aos memory get <path>`        | Read memory     |
| `aos memory delete <path>`     | Delete memory   |
| `aos memory list [prefix]`     | List paths      |
| `aos memory search <query>`    | Semantic search |
| `aos memory history <path>`    | Version history |

### Project Commands

| Command                     | Description       |
| --------------------------- | ----------------- |
| `aos project list`          | List all projects |
| `aos project create <name>` | Create project    |
| `aos project get <id>`      | Get details       |
| `aos project update <id>`   | Update project    |

### Kanban Commands

| Command                         | Description |
| ------------------------------- | ----------- |
| `aos kanban list`               | List tasks  |
| `aos kanban add <title>`        | Add task    |
| `aos kanban move <id> <status>` | Move task   |
| `aos kanban update <id>`        | Update task |

### Brainstorm Commands

| Command                      | Description      |
| ---------------------------- | ---------------- |
| `aos brainstorm list`        | List brainstorms |
| `aos brainstorm add <title>` | Add brainstorm   |
| `aos brainstorm get <id>`    | Get details      |

### Activity Commands

| Command                      | Description     |
| ---------------------------- | --------------- |
| `aos activity log <message>` | Log activity    |
| `aos activity list`          | List activities |

---

## Remember

1. **Persist everything important** - Your memory doesn't survive restarts, files do
2. **Verify before claiming done** - Test it, check it, prove it
3. **Log your learnings** - Future you will thank present you
4. **Use the dashboard** - It's your brain in the cloud
5. **Evolve constantly** - Every mistake is a chance to improve

---

_AgentOS - Accountability infrastructure for AI agents_
