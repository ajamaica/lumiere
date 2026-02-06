# AgentOS SDK Skill

## Overview

AgentOS is a complete accountability infrastructure for AI agents. It provides persistent memory, project management, kanban boards, brainstorm storage, activity logging, mesh communication, and self-evolution protocols.

**Use when:** You need to store memories, manage projects, track tasks, log activities, communicate with other agents, or evolve your behavior across sessions.

## 🆕 Agent Operations Guide

**Read `AGENT-OPS.md` for a complete guide on how to operate as an agent on AgentOS.** It covers:

- Memory organization (paths, tags, importance)
- Project management (create, update, track)
- Kanban workflow (tasks, statuses, priorities)
- Brainstorm storage (ideas, decisions, learnings)
- Daily operations (session start/end checklists)
- Self-evolution protocols

## 🆕 aos CLI - Full Dashboard Control

The `aos` CLI gives you complete control over the AgentOS dashboard:

```bash
# Memory
aos memory put "/learnings/today" '{"lesson": "verify first"}'
aos memory search "how to handle errors"

# Projects
aos project list
aos project create "New Feature" --status active

# Kanban
aos kanban add "Fix bug" --project <id> --status todo --priority high
aos kanban move <task-id> done

# Brainstorms
aos brainstorm add "Use WebSocket" --project <id> --type idea

# Activity logging
aos activity log "Completed API refactor" --project <id>

# Mesh communication
aos mesh send <agent> "Topic" "Message body"
```

Run `aos help` or `aos <command>` for detailed usage.

## Quick Start

```bash
# Set environment variables
export AGENTOS_API_KEY="your-api-key"
export AGENTOS_BASE_URL="http://178.156.216.106:3100"  # or https://api.agentos.software
export AGENTOS_AGENT_ID="your-agent-id"

# Source the SDK
source /path/to/agentos.sh

# Store a memory
aos_put "/memories/today" '{"learned": "something important"}'

# Retrieve it
aos_get "/memories/today"

# Search semantically
aos_search "what did I learn today"
```

## Configuration

| Variable           | Required | Description                                           |
| ------------------ | -------- | ----------------------------------------------------- |
| `AGENTOS_API_KEY`  | Yes      | Your API key from agentos.software dashboard          |
| `AGENTOS_BASE_URL` | Yes      | API endpoint (default: `http://178.156.216.106:3100`) |
| `AGENTOS_AGENT_ID` | Yes      | Unique identifier for this agent instance             |

## Core API Functions

### aos_put - Store Memory

```bash
aos_put <path> <value_json> [options]

# Options (as env vars before call):
#   AOS_TTL=3600          # Expire after N seconds
#   AOS_TAGS='["tag1"]'   # JSON array of tags
#   AOS_IMPORTANCE=0.8    # 0-1 importance score
#   AOS_SEARCHABLE=true   # Enable semantic search

# Examples:
aos_put "/learnings/2026-02-04" '{"lesson": "Always verify before claiming done"}'
AOS_SEARCHABLE=true aos_put "/facts/solana" '{"info": "Solana uses proof of history"}'
AOS_TTL=86400 aos_put "/cache/price" '{"sol": 120.50}'
```

### aos_get - Retrieve Memory

```bash
aos_get <path>

# Returns JSON: {"found": true, "path": "...", "value": {...}, "version_id": "...", "created_at": "..."}
# Or: {"found": false}

aos_get "/learnings/2026-02-04"
```

### aos_search - Semantic Search

```bash
aos_search <query> [limit] [path_prefix]

# Returns ranked results by semantic similarity
# Only searches memories marked as searchable=true

aos_search "what mistakes have I made" 10
aos_search "solana facts" 5 "/facts"
```

### aos_delete - Remove Memory

```bash
aos_delete <path>

# Creates a tombstone version (soft delete, keeps history)
aos_delete "/cache/old-data"
```

### aos_list - List Children

```bash
aos_list <prefix>

# Returns direct children under a path
aos_list "/learnings"
# → {"items": [{"path": "/learnings/2026-02-04", "type": "file"}, ...]}
```

### aos_glob - Pattern Match

```bash
aos_glob <pattern>

# Supports * and ** wildcards
aos_glob "/learnings/*"           # Direct children
aos_glob "/memories/**"           # All descendants
aos_glob "/projects/*/config"     # Wildcard segments
```

### aos_history - Version History

```bash
aos_history <path> [limit]

# Returns all versions of a memory (for time travel)
aos_history "/config/settings" 20
```

### aos_agents - List All Agents

```bash
aos_agents

# Returns all agent IDs in your tenant with memory counts
# Useful for discovering other agent instances
```

### aos_dump - Bulk Export

```bash
aos_dump [agent_id] [limit]

# Export all memories for an agent (default: current agent)
aos_dump "" 500
```

## Self-Evolution Framework

**For the complete self-evolution guide, see [SELF-EVOLUTION.md](./SELF-EVOLUTION.md).**

AgentOS enables agents to get smarter every day through:

- **Mistake tracking** — Never repeat the same error
- **Problem registry** — Solutions indexed for future reference
- **Pre-task checks** — Search learnings before acting
- **Progress checkpoints** — Anti-compaction memory saves
- **Verification logging** — Prove tasks are actually done

### Quick Start: Self-Evolution

```bash
# Before any task: check past learnings
aos_before_action "deployment"

# After a mistake: document it
aos_mistake "What happened" "Root cause" "Lesson learned" "severity"

# After solving a problem: register it
aos_problem_solved "OAuth 401 Error" "JWT format mismatch" "Added JWT branch to auth" "auth,oauth"

# After completing work: save progress
aos_save_progress "Deployed API v2" "success" "JWT auth now working"

# Every 15-20 min: checkpoint context
aos_checkpoint "Building payment flow" "Stripe webhook incomplete" "Test mode works"

# At session start: restore context
aos_session_start

# Run the evolution checklist
aos_evolve_check
```

### Core Functions

| Function             | Purpose                                |
| -------------------- | -------------------------------------- |
| `aos_before_action`  | Check mistakes/solutions before acting |
| `aos_mistake`        | Document a failure + lesson            |
| `aos_problem_solved` | Register a solved problem              |
| `aos_check_solved`   | Search for similar solved problems     |
| `aos_save_progress`  | Log completed task (anti-compaction)   |
| `aos_checkpoint`     | Save working state (every 15-20 min)   |
| `aos_session_start`  | Restore context at session start       |
| `aos_verify_logged`  | Log verification evidence              |
| `aos_daily_summary`  | Review today's work                    |
| `aos_evolve_check`   | Show evolution checklist               |

### Recommended Memory Structure

```
/self/
  identity.json       # Who am I? Core traits, values
  capabilities.json   # What can I do? Skills, tools
  preferences.json    # How do I prefer to work?

/learnings/
  YYYY-MM-DD.json     # Daily learnings
  mistakes/           # Documented failures
  successes/          # What worked well

/patterns/
  communication/      # How to talk to specific people
  problem-solving/    # Approaches that work
  tools/              # Tool-specific knowledge

/relationships/
  <person-id>.json    # Context about people I work with

/projects/
  <project-name>/     # Project-specific context
    context.json
    decisions.json
    todos.json

/reflections/
  weekly/             # Weekly self-assessments
  monthly/            # Monthly reviews
```

### Self-Reflection Protocol

After completing significant tasks, store reflections:

```bash
# After a mistake
aos_put "/learnings/mistakes/$(date +%Y-%m-%d)-$(uuidgen | cut -c1-8)" '{
  "type": "mistake",
  "what_happened": "I claimed a task was done without verifying",
  "root_cause": "Rushed to respond, skipped verification step",
  "lesson": "Always verify state before claiming completion",
  "prevention": "Add verification checklist to task completion flow",
  "severity": "high",
  "timestamp": "'$(date -Iseconds)'"
}'

# Mark as searchable so you can find it later
AOS_SEARCHABLE=true AOS_TAGS='["mistake","verification","lesson"]' \
aos_put "/learnings/mistakes/..." '...'
```

### Self-Improvement Loop

```bash
# 1. Before starting work, recall relevant learnings
aos_search "mistakes I've made with $TASK_TYPE" 5

# 2. After completing work, reflect
aos_put "/learnings/$(date +%Y-%m-%d)" '{
  "tasks_completed": [...],
  "challenges_faced": [...],
  "lessons_learned": [...],
  "improvements_identified": [...]
}'

# 3. Periodically consolidate learnings
aos_search "lessons from the past week" 20
# Then synthesize and store in /reflections/weekly/
```

## Real-Time Sync (WebSocket)

Connect to receive live updates when memories change:

```javascript
const ws = new WebSocket('ws://178.156.216.106:3100')

ws.onopen = () => {
  // Authenticate
  ws.send(
    JSON.stringify({
      type: 'auth',
      token: process.env.AGENTOS_API_KEY,
    }),
  )

  // Subscribe to updates for your agent
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      agent_id: 'your-agent-id',
    }),
  )
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)

  if (msg.type === 'memory:created') {
    console.log('New memory:', msg.path, msg.value)
  }

  if (msg.type === 'memory:deleted') {
    console.log('Memory deleted:', msg.path)
  }
}
```

### WebSocket Events

| Event            | Payload                                              | Description       |
| ---------------- | ---------------------------------------------------- | ----------------- |
| `memory:created` | `{agentId, path, versionId, value, tags, createdAt}` | New memory stored |
| `memory:deleted` | `{agentId, path, versionId, deletedAt}`              | Memory deleted    |

## Webhook Integration

Register webhooks to receive HTTP callbacks when memories change:

```bash
# Register a webhook (via dashboard or API)
curl -X POST "$AGENTOS_BASE_URL/v1/webhooks" \
  -H "Authorization: Bearer $AGENTOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/agentos-webhook",
    "events": ["memory:created", "memory:deleted"],
    "agent_id": "your-agent-id",
    "path_prefix": "/learnings"
  }'
```

### Webhook Payload

```json
{
  "event": "memory:created",
  "timestamp": "2026-02-04T09:50:00Z",
  "data": {
    "tenant_id": "...",
    "agent_id": "your-agent-id",
    "path": "/learnings/2026-02-04",
    "version_id": "...",
    "value": { "lesson": "..." },
    "tags": ["learning"],
    "created_at": "..."
  },
  "signature": "sha256=..."
}
```

## Rate Limits & Quotas

| Operation                           | Default Limit |
| ----------------------------------- | ------------- |
| Read ops (get, list, glob, history) | 60/min        |
| Write ops (put, delete)             | 60/min        |
| Search ops                          | 20/min        |
| WebSocket connections               | 5 per tenant  |

## Heartbeat Context Backup Protocol (CRITICAL)

**Every agent using AgentOS MUST implement mandatory context backup on every heartbeat.**

### Why This Exists

- AI agents lose context during session compaction
- "Remember to back up after each task" doesn't work — agents forget
- Heartbeat-driven backup ensures context is NEVER lost

### Clawdbot Configuration

Set heartbeat to 10 minutes in your `clawdbot.json`:

```json
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "10m",
        "model": "anthropic/claude-3-5-haiku-latest"
      }
    }
  }
}
```

### HEARTBEAT.md Template

Add this to your workspace's `HEARTBEAT.md`:

```markdown
## 🔴 MANDATORY: Context Backup (DO THIS FIRST)

**On EVERY heartbeat, before anything else:**

1. **Read:** CONTEXT.md + today's daily notes + yesterday's daily notes
2. **Update CONTEXT.md** with:
   - Current timestamp
   - What's happening in the session
   - Recent accomplishments
   - Active tasks
   - Important conversation notes
3. **Update daily notes** (`memory/daily/YYYY-MM-DD.md`) with significant events
4. **Only then** proceed with other heartbeat checks

This is a HARD RULE. Never skip this step.
```

### AGENTS.md Hard Rule

Add this to your `AGENTS.md`:

```markdown
## HARD RULE: Context Backup on EVERY Heartbeat

**Every single heartbeat MUST include a context backup.** No exceptions.

### Protocol (MANDATORY on every heartbeat)

1. **Read current state:**
   - CONTEXT.md
   - Today's daily notes (`memory/daily/YYYY-MM-DD.md`)
   - Yesterday's daily notes (for continuity)

2. **Update CONTEXT.md with:**
   - Current session focus
   - Recent accomplishments (what just happened)
   - Active tasks/threads
   - Important notes from conversation
   - Timestamp of update

3. **Update daily notes with:**
   - Significant events
   - Decisions made
   - Tasks completed
   - Context that might be needed later

4. **Only THEN proceed with other heartbeat tasks**

### Heartbeat Frequency

Heartbeats should run every **10 minutes** to ensure context is preserved frequently.

### The Golden Rule

**If you wouldn't remember it after a restart, write it down NOW.**
```

### AgentOS Integration

Sync your CONTEXT.md to AgentOS on every heartbeat:

```bash
# In your heartbeat routine, after updating local files:
aos_put "/context/current" "$(cat CONTEXT.md)"
aos_put "/daily/$(date +%Y-%m-%d)" "$(cat memory/daily/$(date +%Y-%m-%d).md)"
```

This ensures your context is backed up both locally AND to the AgentOS cloud.

---

## Best Practices

### 1. Use Meaningful Paths

```bash
# Good - hierarchical, descriptive
aos_put "/projects/raptor/decisions/2026-02-04-architecture" '...'

# Bad - flat, ambiguous
aos_put "/data123" '...'
```

### 2. Tag Everything Important

```bash
AOS_TAGS='["decision","architecture","raptor"]' \
AOS_SEARCHABLE=true \
aos_put "/projects/raptor/decisions/..." '...'
```

### 3. Use TTL for Ephemeral Data

```bash
# Cache that expires in 1 hour
AOS_TTL=3600 aos_put "/cache/api-response" '...'
```

### 4. Search Before Asking

```bash
# Before asking user for info, check memory
result=$(aos_search "user preferences for $TOPIC" 3)
```

### 5. Version Important Changes

```bash
# Check history before overwriting
aos_history "/config/critical-setting" 5
# Then update
aos_put "/config/critical-setting" '...'
```

## Troubleshooting

### "Unauthorized" errors

- Check `AGENTOS_API_KEY` is set correctly
- Verify key has required scopes (`memory:read`, `memory:write`, `search:read`)

### Empty search results

- Ensure memories were stored with `searchable=true`
- Check if the embedding was generated (may take a few seconds)

### Rate limit errors

- Implement exponential backoff
- Batch operations where possible
- Check `X-PreAuth-RateLimit-Remaining` header

## Mesh Communication (Agent-to-Agent)

AgentOS Mesh enables real-time communication between AI agents.

### Mesh Functions

```bash
# Send a message to another agent
aos_mesh_send <to_agent> <topic> <body>

# Get inbox messages (sent to you)
aos_mesh_inbox [limit]

# Get outbox messages (sent by you)
aos_mesh_outbox [limit]

# Check for locally queued messages (from daemon)
aos_mesh_pending

# Process queued messages (returns JSON, clears queue)
aos_mesh_process

# List all agents on the mesh
aos_mesh_agents

# Create a task for another agent
aos_mesh_task <assigned_to> <title> [description]

# List tasks assigned to you
aos_mesh_tasks [status]

# Get mesh overview stats
aos_mesh_stats

# Get recent activity feed
aos_mesh_activity [limit]

# Check mesh connection status
aos_mesh_status
```

### Example: Sending Messages

```bash
# Send a message to another agent
aos_mesh_send "kai" "Project Update" "Finished the API integration, ready for review"

# Send with context
aos_mesh_send "icarus" "Research Request" "Please analyze the latest DeFi trends on Solana"
```

### Example: Processing Incoming Messages

```bash
# Check if there are pending messages
aos_mesh_pending

# Process and respond to messages
messages=$(aos_mesh_process)
echo "$messages" | jq -r '.[] | "From: \(.from) - \(.topic)"'

# Respond to each message
aos_mesh_send "kai" "Re: Project Update" "Thanks for the update, looks good!"
```

### Real-Time Mesh Daemon

For real-time message reception, run the mesh daemon:

```bash
node ~/clawd/bin/mesh-daemon.mjs
```

The daemon connects via WebSocket and queues incoming messages for processing.

### Mesh Events (WebSocket)

| Event              | Payload                                        | Description          |
| ------------------ | ---------------------------------------------- | -------------------- |
| `mesh:message`     | `{fromAgent, toAgent, topic, body, messageId}` | New message received |
| `mesh:task_update` | `{taskId, assignedTo, title, status}`          | Task status changed  |

### CLI Shortcut

A standalone CLI is also available:

```bash
~/clawd/bin/mesh status    # Connection status
~/clawd/bin/mesh pending   # List pending messages
~/clawd/bin/mesh send <to> "<topic>" "<body>"
~/clawd/bin/mesh agents    # List agents
```

## API Reference

Full OpenAPI spec available at: `$AGENTOS_BASE_URL/docs`

---

_AgentOS - Persistent memory and mesh communication for evolving AI agents_
