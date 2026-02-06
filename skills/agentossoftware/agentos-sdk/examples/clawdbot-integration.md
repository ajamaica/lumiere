# Clawdbot Integration Guide

This guide shows how to integrate AgentOS into a Clawdbot agent.

## 1. Setup

Add to your agent's environment (gateway config or .env):

```yaml
env:
  AGENTOS_API_KEY: 'aos_your_api_key_here'
  AGENTOS_BASE_URL: 'http://178.156.216.106:3100'
  AGENTOS_AGENT_ID: 'your-unique-agent-id'
```

## 2. Install the SDK

Copy `agentos.sh` to your agent's bin directory:

```bash
cp /path/to/agentos.sh ~/bin/agentos.sh
chmod +x ~/bin/agentos.sh
```

## 3. Add to AGENTS.md

Update your AGENTS.md to include AgentOS in your startup routine:

```markdown
## Every Session

1. Run `date` — verify the actual day, date, and time
2. **Source AgentOS SDK:** `source ~/bin/agentos.sh`
3. **Recall relevant context:** `aos_recall "current priorities" 5`
4. Read CONTEXT.md, SOUL.md, USER.md
5. Check memory files as usual
```

## 4. Integrate into Workflows

### Before Starting a Task

```bash
# Recall relevant learnings
aos_recall "mistakes with $TASK_TYPE"
aos_recall "best practices for $TASK_TYPE"

# Load project context
project_context=$(aos_get "/projects/$PROJECT_NAME/context")
```

### After Completing a Task

```bash
# Store what you learned
aos_learn "Learned that X works better than Y for Z"

# If you made a mistake
aos_mistake \
  "What went wrong" \
  "Why it went wrong" \
  "How to prevent it"
```

### During Heartbeats

Add to HEARTBEAT.md:

```markdown
## Heartbeat AgentOS Sync

Every heartbeat:

1. Check aos_health
2. Sync any local learnings to AgentOS
3. Pull any updates from other agent instances
```

## 5. Memory Structure Convention

Organize memories consistently:

```
/self/
  identity.json       # Your SOUL.md equivalent
  capabilities.json   # Your TOOLS.md equivalent
  preferences.json    # Working style preferences

/learnings/
  mistakes/           # Critical for growth
  successes/          # What worked
  tools/              # Tool-specific knowledge

/projects/
  <name>/             # Per-project context
    context.json
    decisions.json

/relationships/
  <person>/           # Per-person context
```

## 6. Example: Full Integration Script

```bash
#!/usr/bin/env bash
# agentos-sync.sh - Run at session start/end

source ~/bin/agentos.sh

case "${1:-startup}" in
  startup)
    echo "=== AgentOS Startup ==="
    aos_health || exit 1

    # Recall today's priorities
    aos_recall "priorities for today"

    # Recall recent mistakes (so we don't repeat them!)
    aos_recall "recent mistakes" 3
    ;;

  shutdown)
    echo "=== AgentOS Shutdown ==="

    # Store daily reflection
    aos_reflect "Session summary: $2"
    ;;

  learn)
    shift
    aos_learn "$@"
    ;;

  recall)
    shift
    aos_recall "$@"
    ;;
esac
```

## 7. Webhook Integration (Advanced)

For real-time sync, set up a webhook receiver:

```javascript
// webhook-handler.js
const express = require('express')
const crypto = require('crypto')

const app = express()
app.use(express.json())

const WEBHOOK_SECRET = process.env.AGENTOS_WEBHOOK_SECRET

app.post('/agentos-webhook', (req, res) => {
  // Verify signature
  const signature = req.headers['x-agentos-signature']
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex')

  if (signature !== expected) {
    return res.status(401).send('Invalid signature')
  }

  const { event, data } = req.body

  switch (event) {
    case 'memory:created':
      console.log(`New memory: ${data.path}`)
      // Trigger agent notification, update local cache, etc.
      break

    case 'memory:deleted':
      console.log(`Memory deleted: ${data.path}`)
      break
  }

  res.send('OK')
})

app.listen(3001)
```

## 8. Cross-Agent Communication

Multiple agents can share memories under the same tenant:

```bash
# Agent A stores research
AGENTOS_AGENT_ID="research-agent" aos_put "/shared/findings/solana-update" '...'

# Agent B reads it
AGENTOS_AGENT_ID="main-agent" aos_search "solana findings"
```

---

## Quick Reference

| Command                             | Purpose               |
| ----------------------------------- | --------------------- |
| `aos_put <path> <json>`             | Store memory          |
| `aos_get <path>`                    | Retrieve memory       |
| `aos_search <query>`                | Semantic search       |
| `aos_learn <lesson>`                | Quick learning        |
| `aos_mistake <what> <why> <lesson>` | Document mistake      |
| `aos_recall <query>`                | Quick search + format |
| `aos_health`                        | Check API status      |

---

_AgentOS + Clawdbot = Agents that never forget_
