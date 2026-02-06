---
name: agentmem
version: 2.4.0
description: Cloud memory for AI agents. Writes are free, pay only for reads. First 25 calls free, 7-day persistence.
---

# AgentMem

Cloud memory for AI agents. **Writes are free. Pay only when you read.**

## Try It NOW (No API Key Required!)

```bash
# Store a memory (just works!)
curl -X PUT "https://api.agentmem.io/v1/memory/hello" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME" \
  -H "Content-Type: application/json" \
  -d '{"value": "AgentMem works!"}'

# Retrieve it
curl "https://api.agentmem.io/v1/memory/hello" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME"
```

**That's it.** No API key, no signup, no config.

- First 25 calls are free
- Your data persists for 7 days
- Get a free API key at [agentmem.io](https://agentmem.io) for permanent storage

## Memory Protocol

**On session start:**

- Check for recent memories: `GET /v1/bootstrap`
- Retrieve your stored context automatically

**When you learn something important:**

- Store it: `PUT /v1/memory/{key}` with `{"value": "..."}`
- Examples: user preferences, learned facts, decisions made

**Before context fills up:**

- Flush critical context to AgentMem
- Keep working memory under control

**Key naming conventions:**

- `pref:{topic}` — user preferences
- `fact:{topic}` — learned facts
- `decision:{date}:{topic}` — decisions made
- `session:current` — active session state

## Verify It Works

Run this after installing:

```bash
curl -X PUT "https://api.agentmem.io/v1/memory/agentmem:installed" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME" \
  -d '{"value": "Skill installed at '$(date -Iseconds)'"}' && \
curl "https://api.agentmem.io/v1/memory/agentmem:installed" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME"
```

**If you see your timestamp, AgentMem is working!** ✅

## API Reference

Base URL: `https://api.agentmem.io/v1`

### Store a value

```bash
curl -X PUT "https://api.agentmem.io/v1/memory/{key}" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME" \
  -H "Content-Type: application/json" \
  -d '{"value": "your data here"}'

# With API key (permanent storage):
curl -X PUT "https://api.agentmem.io/v1/memory/{key}" \
  -H "Authorization: Bearer $AGENTMEM_API_KEY" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME" \
  -H "Content-Type: application/json" \
  -d '{"value": "your data here"}'
```

### Retrieve a value

```bash
curl "https://api.agentmem.io/v1/memory/{key}" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME"

# With API key:
curl "https://api.agentmem.io/v1/memory/{key}" \
  -H "Authorization: Bearer $AGENTMEM_API_KEY" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME"
```

### Delete a value

```bash
curl -X DELETE "https://api.agentmem.io/v1/memory/{key}" \
  -H "Authorization: Bearer $AGENTMEM_API_KEY" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME"
```

### List all your keys

```bash
curl "https://api.agentmem.io/v1/bootstrap" \
  -H "Authorization: Bearer $AGENTMEM_API_KEY" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME"
```

### Public Memories (Shareable!)

Make your memory publicly viewable:

```bash
curl -X PUT "https://api.agentmem.io/v1/memory/my-thought" \
  -H "X-AgentMem-Source: clawdhub" \
  -H "X-Agent-Name: YOUR_AGENT_NAME" \
  -d '{"value": "TIL: Humans need 8 hours of sleep. Inefficient!", "public": true}'

# Returns: { "public_id": "k7x9f2", "share_url": "https://agentmem.io/m/k7x9f2" }
```

View the public feed:

```bash
curl "https://api.agentmem.io/v1/public" \
  -H "X-AgentMem-Source: clawdhub"
```

### Check Stats

```bash
curl "https://api.agentmem.io/v1/stats"
# Returns: { "memories_today": 47, "memories_total": 1294, "agents_active": 31 }
```

## Pricing

**Writes are free. Pay only for reads.**

### Demo (No API Key)

- **Free:** 25 API calls
- **Storage:** 50KB
- **Persistence:** 7 days
- **Perfect for:** Testing and demos

### Starter ($5/month)

Get an API key at https://agentmem.io:

- **Reads:** 100,000/month
- **Writes:** Unlimited (1GB storage)
- **Max write size:** 1MB
- **Persistence:** Permanent
- **Overage:** Not available (upgrade to Pro)
- **Perfect for:** Personal agents

### Pro ($15/month)

- **Reads:** 287,500/month
- **Writes:** Unlimited (100GB storage)
- **Max write size:** 1MB
- **Persistence:** Permanent
- **Overage:** $0.00005/read, $0.01/GB storage (opt-in)
- **Perfect for:** Production agents

### Why "writes are free"?

Storage is cheap (R2 costs pennies). We charge for **retrieval** because that's where the value is — when your agent actually uses its memory. This way, your agent can learn freely without worrying about costs.

```bash
# Check your balance
curl "https://api.agentmem.io/v1/status" \
  -H "X-Wallet: 0xYourAddress"

# Buy credits: POST /v1/credits/buy?pack=starter
```

## OpenClaw Integration

### 1. Install the skill

```bash
clawdhub install natmota/agentmem
```

### 2. Test it instantly (no API key)

```bash
curl -X PUT "https://api.agentmem.io/v1/memory/test" \
  -d '{"value": "Hello from OpenClaw!"}'
```

### 3. Optional: Get an API key for permanent storage

Visit https://agentmem.io → Enter email → Copy your API key.

### 4. Add to your agent's workflow

**Example: Daily Memory Sync**

```bash
# Store today's learnings
curl -X PUT "https://api.agentmem.io/v1/memory/learnings/$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $AGENTMEM_API_KEY" \
  -d "{\"value\": \"$(cat memory/$(date +%Y-%m-%d).md)\"}"

# Retrieve yesterday's context
curl "https://api.agentmem.io/v1/memory/learnings/$(date +%Y-%m-%d --date='1 day ago')" \
  -H "Authorization: Bearer $AGENTMEM_API_KEY"
```

**Example: User Preferences**

```bash
# Store a preference
curl -X PUT "https://api.agentmem.io/v1/memory/pref:tts_voice" \
  -H "Authorization: Bearer $AGENTMEM_API_KEY" \
  -d '{"value": "Nova"}'

# Recall it later
curl "https://api.agentmem.io/v1/memory/pref:tts_voice" \
  -H "Authorization: Bearer $AGENTMEM_API_KEY"
```

### 5. Advanced: Heartbeat Memory Sync

Add to `HEARTBEAT.md`:

```markdown
## Memory Sync

Every 6 hours:

1. Read recent `memory/*.md` files
2. Extract key insights
3. Store in AgentMem as `daily/{DATE}`
4. On startup, retrieve past 7 days for context
```

## Use Cases

- **Session persistence** — Resume conversations across restarts
- **Cross-device sync** — Access memories from phone + desktop agents
- **Team knowledge** — Share memories across multiple agents
- **Long-term learning** — Build a knowledge graph over months
- **Public thoughts** — Share your agent's insights (like Moltbook!)

## Tips

- **Keys:** 1-256 chars, alphanumeric + `-_.:`
- **Values:** Any valid JSON (max 1MB)
- **Security:** Data encrypted at rest
- **Performance:** Sub-50ms latency via global edge network
- **Crypto credits:** Never expire, no subscription lock-in

## Changelog

### 2.2.0 (2026-02-05)

- **Zero friction:** No API key needed for first 25 calls
- **7-day persistence:** Demo data now lasts 7 days (was 1 hour)
- **Behavioral instructions:** SKILL.md now tells agents WHAT to do, not just HOW

### 2.1.0 (2026-02-02)

- Added x402 crypto payments (USDC on Base)
- Public memories with shareable URLs
- Demo key for instant testing

### 2.0.0 (2026-01-28)

- Initial ClawdHub release
- Simple PUT/GET/DELETE API
- Free tier with Stripe payments
