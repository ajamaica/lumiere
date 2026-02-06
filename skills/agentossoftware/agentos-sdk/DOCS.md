# AgentOS SDK Documentation

## What is AgentOS?

**AgentOS** is a cloud memory system designed specifically for AI agents. It solves the fundamental problem of AI amnesia — the fact that most AI agents forget everything between sessions.

With AgentOS, your agent can:

- **Remember** — Store memories that persist across sessions
- **Recall** — Semantically search memories by meaning, not just keywords
- **Learn** — Track mistakes and lessons to improve over time
- **Evolve** — Build behavioral patterns that make the agent smarter
- **Sync** — Real-time updates via WebSocket when memories change

---

## Core Concepts

### Memories as Files

AgentOS organizes memories like a filesystem:

```
/self/identity.json
/learnings/2026-02-04/lesson-1.json
/projects/raptor/context.json
```

Each memory has:

- **Path** — Where it lives (like a file path)
- **Value** — JSON content (any structure)
- **Tags** — Labels for categorization
- **Importance** — 0-1 score for prioritization
- **Searchable** — Whether to index for semantic search
- **TTL** — Optional expiration time
- **Versions** — Full history of changes

### Semantic Search

When you mark a memory as `searchable=true`, AgentOS generates a vector embedding and stores it. Later, you can search by _meaning_:

```bash
# Find memories about mistakes, even if they don't contain the word "mistake"
aos_search "things I did wrong"

# Find context about a project
aos_search "raptor bot configuration decisions"
```

This is **far more powerful** than keyword search because it understands context and synonyms.

### Versioning

Every write creates a new version. The previous value isn't deleted — it's preserved in history:

```bash
# See all versions of a memory
aos_history "/config/settings"
```

This enables:

- **Time travel** — See what a value was at any point
- **Audit trail** — Track who changed what and when
- **Rollback** — Restore previous values if needed

---

## Self-Evolution Framework

The most powerful feature of AgentOS is enabling agents to **evolve** — to get smarter over time by learning from experience.

### The Self-Reflection Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   1. EXPERIENCE                                             │
│      ↓                                                      │
│   2. REFLECT → Store in /learnings/                         │
│      ↓                                                      │
│   3. RECALL → Search before similar tasks                   │
│      ↓                                                      │
│   4. APPLY → Use learnings to improve                       │
│      ↓                                                      │
│   5. MEASURE → Did it help? Store result                    │
│      ↓                                                      │
│   (loop)                                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Memory Structure

```
/self/
  identity.json       # Core identity: name, role, values, personality
  capabilities.json   # Skills and tools I can use
  preferences.json    # Working style, communication preferences
  goals.json          # Current objectives and priorities

/learnings/
  general/            # General lessons
  mistakes/           # Documented failures (CRITICAL for growth)
  successes/          # What worked well
  tools/              # Tool-specific knowledge
  people/             # Communication patterns per person

/patterns/
  problem-solving/    # Approaches that work
  communication/      # Effective communication styles
  debugging/          # Debugging strategies

/relationships/
  <person-id>.json    # Context about each person
    - preferences
    - communication style
    - past interactions
    - important context

/projects/
  <project-name>/
    context.json      # Project overview
    decisions.json    # Architecture decisions (ADRs)
    todos.json        # Pending tasks
    learnings.json    # Project-specific lessons

/reflections/
  daily/              # Daily summaries
  weekly/             # Weekly reviews
  monthly/            # Monthly assessments
```

### Documenting Mistakes (Critical!)

The most valuable learnings come from mistakes. Use the `aos_mistake` helper:

```bash
aos_mistake \
  "I claimed a deployment was complete without verifying the endpoint" \
  "Rushed to respond, didn't follow verification checklist" \
  "Always curl the endpoint after deploying before saying 'done'" \
  "high"
```

This creates a searchable memory that you can recall before similar tasks:

```bash
aos_search "deployment verification"
# Returns the mistake, reminding you to verify
```

### Building Behavioral Patterns

Over time, patterns emerge from your learnings. Consolidate them:

```bash
# Weekly: Review learnings and extract patterns
aos_search "lessons from past 7 days" 20

# Store consolidated pattern
aos_put "/patterns/deployment/checklist" '{
  "name": "Deployment Verification Checklist",
  "steps": [
    "1. Deploy the code",
    "2. Wait for deployment to complete",
    "3. Curl the health endpoint",
    "4. Verify response matches expected",
    "5. THEN say deployment is complete"
  ],
  "source_learnings": ["/learnings/mistakes/2026-02-04-abc123"],
  "created_from": "Multiple deployment mistakes"
}'
```

---

## Real-Time Sync

### WebSocket Connection

Connect to receive live updates when memories change:

```javascript
const ws = new WebSocket('ws://178.156.216.106:3100')

ws.onopen = () => {
  // Authenticate with your API key
  ws.send(
    JSON.stringify({
      type: 'auth',
      token: 'your-api-key',
    }),
  )

  // Subscribe to your agent's updates
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      agent_id: 'your-agent-id',
    }),
  )
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)

  switch (msg.type) {
    case 'memory:created':
      console.log('New memory:', msg.path)
      // React to new memory (e.g., update local cache)
      break

    case 'memory:deleted':
      console.log('Memory deleted:', msg.path)
      // Remove from local cache
      break
  }
}
```

### Use Cases for Real-Time Sync

1. **Multi-instance agents** — Multiple instances stay synchronized
2. **Dashboard updates** — UI updates instantly when memories change
3. **Triggers** — React to specific memory changes (e.g., new task added)
4. **Debugging** — Watch memory changes in real-time during development

---

## Webhook Integration

For server-to-server communication, use webhooks instead of WebSocket:

### Registering a Webhook

```bash
curl -X POST "http://178.156.216.106:3100/v1/webhooks" \
  -H "Authorization: Bearer $AGENTOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/agentos-callback",
    "events": ["memory:created", "memory:deleted"],
    "agent_id": "your-agent-id",
    "path_prefix": "/learnings",
    "secret": "your-webhook-secret"
  }'
```

### Webhook Payload

When a memory changes, AgentOS sends a POST request:

```json
{
  "event": "memory:created",
  "timestamp": "2026-02-04T09:50:00.000Z",
  "data": {
    "tenant_id": "uuid",
    "agent_id": "your-agent-id",
    "path": "/learnings/2026-02-04/lesson-1",
    "version_id": "uuid",
    "value": {"lesson": "..."},
    "tags": ["learning"],
    "created_at": "2026-02-04T09:50:00.000Z"
  }
}

# Signature header for verification:
X-AgentOS-Signature: sha256=<hmac-sha256-of-body-with-secret>
```

### Verifying Webhook Signatures

```javascript
const crypto = require('crypto')

function verifyWebhook(body, signature, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
```

---

## Integration Examples

### Clawdbot Integration

Add to your agent's startup routine:

```bash
# In AGENTS.md or startup script
source /path/to/agentos.sh

# Before starting work, recall relevant context
aos_recall "current priorities"
aos_recall "recent mistakes to avoid"

# After completing work, reflect
aos_learn "Completed X successfully using Y approach"
```

### Cron-Based Reflection

Set up periodic reflection:

```bash
# Daily reflection cron (run at end of day)
0 23 * * * /path/to/daily-reflect.sh

# daily-reflect.sh:
source /path/to/agentos.sh
aos_reflect "$(cat /tmp/daily-summary.txt)"
```

### Cross-Agent Communication

Agents can share memories by using the same tenant:

```bash
# Agent A stores a finding
aos_put "/shared/research/solana-update" '{"finding": "..."}'

# Agent B searches shared memories
AGENTOS_AGENT_ID="agent-b" aos_search "solana research"
```

---

## Best Practices

### 1. Search Before Acting

Before starting any task, search for relevant context:

```bash
aos_recall "deploying to production"
aos_recall "mistakes with $PROJECT_NAME"
```

### 2. Document Everything Important

If you'd want to remember it tomorrow, store it:

```bash
aos_learn "User prefers concise responses"
aos_put "/relationships/ben/preferences" '{"communication": "concise"}'
```

### 3. Use Consistent Paths

Establish conventions and stick to them:

```
/learnings/<category>/<date>-<id>
/projects/<name>/<aspect>
/relationships/<person-id>
```

### 4. Tag for Discoverability

Tags enable filtering in search:

```bash
AOS_TAGS='["urgent","security","solana"]' aos_put "/learnings/..." '...'
```

### 5. Set Importance Scores

Higher importance = prioritized in search results:

```bash
AOS_IMPORTANCE="0.9" aos_put "/learnings/critical-bug" '...'
```

### 6. Use TTL for Ephemeral Data

Don't pollute memory with temporary data:

```bash
AOS_TTL=3600 aos_put "/cache/api-response" '...'  # Expires in 1 hour
```

### 7. Consolidate Periodically

Raw learnings → patterns → principles:

```
Daily:   Store raw learnings
Weekly:  Review and extract patterns
Monthly: Update core principles in /self/
```

---

## Troubleshooting

### API Returns 401 Unauthorized

- Check `AGENTOS_API_KEY` is set and valid
- Verify key hasn't expired
- Confirm key has required scopes

### Search Returns Empty Results

- Memories must have `searchable=true` to appear in search
- Embeddings are generated async — wait a few seconds after storing
- Check path_prefix filter isn't too restrictive

### Rate Limit Errors (429)

- Implement exponential backoff
- Batch operations where possible
- Check response headers for limit info

### WebSocket Disconnects

- Implement reconnection logic with backoff
- Re-authenticate after reconnecting
- Re-subscribe to agent updates

---

## API Quick Reference

| Function      | Purpose            |
| ------------- | ------------------ |
| `aos_put`     | Store a memory     |
| `aos_get`     | Retrieve a memory  |
| `aos_delete`  | Delete a memory    |
| `aos_search`  | Semantic search    |
| `aos_list`    | List children      |
| `aos_glob`    | Pattern match      |
| `aos_history` | Version history    |
| `aos_agents`  | List agents        |
| `aos_dump`    | Bulk export        |
| `aos_learn`   | Store a learning   |
| `aos_mistake` | Document a mistake |
| `aos_reflect` | Store a reflection |
| `aos_recall`  | Quick search       |
| `aos_context` | Gather context     |
| `aos_health`  | Check API status   |
| `aos_info`    | Show config        |

---

_AgentOS — Because the best AI agents remember, learn, and evolve._
