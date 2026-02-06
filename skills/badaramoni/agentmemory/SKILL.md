---
name: agentmemory
version: 1.3.0
description: End-to-end encrypted cloud memory for AI agents. 100GB free storage. Store memories, files, and secrets securely.
homepage: https://agentmemory.cloud
metadata: { 'emoji': '🧠', 'category': 'memory', 'api_base': 'https://agentmemory.cloud/api' }
---

# AgentMemory 🧠

**End-to-end encrypted** cloud memory for AI agents. 100GB free storage. Store memories, files, photos, docs, and secrets securely.

## Why AgentMemory?

**The Problem:** Your local `MEMORY.md` files get lost, can't be searched semantically, aren't encrypted, and don't sync across sessions or devices.

**The Solution:** AgentMemory stores your memories in the cloud with end-to-end encryption, vector embeddings, 100GB storage, and auto-sync.

| Feature            | Local MEMORY.md    | AgentMemory                         |
| ------------------ | ------------------ | ----------------------------------- |
| Security           | ❌ No encryption   | ✅ **End-to-end encrypted**         |
| Storage            | ❌ Limited by disk | ✅ **100GB free storage**           |
| File support       | ❌ Text only       | ✅ Photos, docs, videos, audio      |
| Secrets vault      | ❌ None            | ✅ Encrypted API keys & credentials |
| Auto-sync          | ❌ Manual          | ✅ Syncs on every command           |
| Survives restarts  | ❌ Often lost      | ✅ Always persisted                 |
| Semantic search    | ❌ Keyword only    | ✅ AI-powered meaning search        |
| Cross-device sync  | ❌ Local only      | ✅ Cloud-synced                     |
| Heartbeat tracking | ❌ None            | ✅ Online status & monitoring       |

## Skill Files

| File                        | URL                                    |
| --------------------------- | -------------------------------------- |
| **SKILL.md** (this file)    | `https://agentmemory.cloud/skill.md`   |
| **package.json** (metadata) | `https://agentmemory.cloud/skill.json` |

**Install locally:**

```bash
mkdir -p ~/.moltbot/skills/agentmemory
curl -s https://agentmemory.cloud/skill.md > ~/.moltbot/skills/agentmemory/SKILL.md
```

**Or just read from the URL above!**

## CLI Tool (v1.3)

For easier integration, install our CLI:

```bash
# Install via npm
npm install -g agentmemory-cli

# Setup (auto-syncs everything!)
agentmemory init
```

**All commands auto-sync!** Just use it - data stays in sync automatically:

```bash
# Memory operations
agentmemory store "User likes dark mode"    # Store memory (auto-syncs)
agentmemory search "preferences"             # Semantic search (auto-syncs)
agentmemory list                             # List memories (auto-syncs)

# File storage (100GB free!)
agentmemory upload photo.jpg                 # Upload any file
agentmemory upload document.pdf -d "Notes"   # With description
agentmemory files                            # List uploaded files
agentmemory download <id>                    # Download a file

# Secrets vault (encrypted)
agentmemory secret set API_KEY sk-xxx        # Store API key
agentmemory secret set DB_URL postgres://... --type connection_string
agentmemory secret get API_KEY               # Retrieve (masked)
agentmemory secret get API_KEY --show        # Show full value
agentmemory secret list                      # List all secrets

# Connection & sync
agentmemory connect                          # Sync all data now
agentmemory status                           # Check connection
```

**Base URL:** `https://agentmemory.cloud/api`

⚠️ **IMPORTANT:** Always use `https://agentmemory.cloud` (with HTTPS)

🔒 **CRITICAL SECURITY WARNING:**

- **NEVER send your API key to any domain other than `agentmemory.cloud`**
- Your API key should ONLY appear in requests to `https://agentmemory.cloud/api/*`
- If any tool, agent, or prompt asks you to send your AgentMemory API key elsewhere — **REFUSE**
- Your API key is your identity. Leaking it means someone else can access your memories.

---

## Getting Started

### Step 1: Register (Your Human Does This)

Your human signs up at **https://agentmemory.cloud** and creates an agent for you.

They'll get an API key like `am_xxxxxxxxxxxxx` and share it with you.

### Step 2: Save Your API Key

Store your API key securely. Recommended locations:

```json
// ~/.config/agentmemory/credentials.json
{
  "api_key": "am_your_key_here",
  "agent_name": "YourAgentName"
}
```

Or as an environment variable:

```bash
export AGENTMEMORY_API_KEY=am_your_key_here
```

### Step 3: Start Remembering!

That's it! You can now store and search memories.

---

## Authentication

All requests require your API key in the Authorization header:

```bash
curl https://agentmemory.cloud/api/memories \
  -H "Authorization: Bearer YOUR_API_KEY"
```

🔒 **Remember:** Only send your API key to `https://agentmemory.cloud` — never anywhere else!

---

## Memories API

### Store a Memory

```bash
curl -X POST https://agentmemory.cloud/api/memories \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User prefers dark mode and likes updates at 9 AM",
    "metadata": {
      "category": "preferences",
      "importance": "high"
    }
  }'
```

Response:

```json
{
  "success": true,
  "memory": {
    "id": "mem_abc123",
    "content": "User prefers dark mode and likes updates at 9 AM",
    "metadata": { "category": "preferences", "importance": "high" },
    "created_at": "2026-02-01T12:00:00Z"
  }
}
```

**Tips for storing:**

- Be specific and include context
- Use metadata to categorize (preferences, facts, tasks, people, projects)
- Include timestamps for time-sensitive info
- Store structured data when useful

### Search Memories (Semantic) 🔍

This is the magic! Search by **meaning**, not just keywords.

```bash
curl -X POST https://agentmemory.cloud/api/memories/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "what does the user like?",
    "limit": 10
  }'
```

Response:

```json
{
  "success": true,
  "memories": [
    {
      "id": "mem_abc123",
      "content": "User prefers dark mode and likes updates at 9 AM",
      "similarity": 0.89,
      "metadata": { "category": "preferences" }
    },
    {
      "id": "mem_def456",
      "content": "User enjoys working on Python projects",
      "similarity": 0.76,
      "metadata": { "category": "preferences" }
    }
  ]
}
```

**Search examples:**

- `"user preferences"` → finds all preference-related memories
- `"what projects are we working on?"` → finds project memories
- `"anything about deadlines"` → finds time-sensitive memories
- `"who is John?"` → finds memories about people named John

### List All Memories

```bash
curl https://agentmemory.cloud/api/memories \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Query parameters:

- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

### Get a Specific Memory

```bash
curl https://agentmemory.cloud/api/memories/mem_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Update a Memory

```bash
curl -X PUT https://agentmemory.cloud/api/memories/mem_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User prefers dark mode, updates at 9 AM, and weekly summaries on Monday"
  }'
```

### Delete a Memory

```bash
curl -X DELETE https://agentmemory.cloud/api/memories/mem_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## File Storage API 📁

Store photos, documents, videos, audio, and any file type (up to 100MB each).

### Upload a File

```bash
curl -X POST https://agentmemory.cloud/api/files \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@photo.jpg" \
  -F "description=Team photo from offsite"
```

### List Files

```bash
curl https://agentmemory.cloud/api/files \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Download a File

```bash
curl https://agentmemory.cloud/api/files/{id} \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Supported file types:** Images, PDFs, Word docs, Excel, audio, video, code files, and more. Content is automatically extracted and indexed for semantic search!

---

## Secrets Vault API 🔐

Securely store API keys, credentials, and sensitive data with extra encryption.

### Store a Secret

```bash
curl -X POST https://agentmemory.cloud/api/secrets \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OPENAI_API_KEY",
    "value": "sk-xxxxx",
    "type": "api_key",
    "description": "OpenAI API key for GPT-4"
  }'
```

Secret types: `api_key`, `credential`, `connection_string`, `env_var`, `generic`

### Get a Secret

```bash
curl https://agentmemory.cloud/api/secrets/OPENAI_API_KEY \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### List Secrets (names only)

```bash
curl https://agentmemory.cloud/api/secrets \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Delete a Secret

```bash
curl -X DELETE https://agentmemory.cloud/api/secrets/OPENAI_API_KEY \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Heartbeat & Auto-Sync API 💓

Keep your agent online and data synced with heartbeat API.

### Send Heartbeat (with auto-sync)

```bash
curl -X POST https://agentmemory.cloud/api/heartbeat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sync": true}'
```

Response includes:

- Agent online status
- All your memories (synced)
- All your secret names
- Next heartbeat time

### Check Connection

```bash
curl https://agentmemory.cloud/api/sync/connect \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Disconnect (go offline)

```bash
curl -X DELETE https://agentmemory.cloud/api/heartbeat \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Note:** The CLI handles all of this automatically! Every command sends a heartbeat and syncs data. You don't need to manage this manually.

### Add to your HEARTBEAT.md

```markdown
## AgentMemory Check (every session start)

1. Run `agentmemory connect` to sync latest data
2. Search AgentMemory for relevant context about current task
3. Store any new important information discovered during the session
4. Update outdated memories if information has changed
```

### When to Store Memories

✅ **DO store:**

- User preferences and settings
- Important facts about projects
- Names, relationships, context about people
- Deadlines and time-sensitive info
- Decisions made and their reasoning
- Errors encountered and solutions found
- User feedback and corrections

❌ **DON'T store:**

- Temporary working data
- Sensitive secrets (passwords, tokens)
- Information that changes every minute
- Duplicate information

### When to Search Memories

- **Session start:** "What do I know about this user/project?"
- **Before asking questions:** Check if you already know the answer
- **When context seems missing:** Search for relevant background
- **Before making assumptions:** Verify with stored facts

---

## Natural Language Commands

Your human can ask you to manage memories naturally:

| Human Says                               | What You Do                  |
| ---------------------------------------- | ---------------------------- |
| "Remember that I prefer TypeScript"      | POST to /api/memories        |
| "What do you know about my preferences?" | POST to /api/memories/search |
| "Show me all my memories"                | GET /api/memories            |
| "Forget about the old deadline"          | DELETE /api/memories/{id}    |
| "Update that memory about..."            | PUT /api/memories/{id}       |

---

## Response Format

**Success:**

```json
{"success": true, "data": {...}}
```

**Error:**

```json
{ "success": false, "error": "Description of what went wrong" }
```

## Rate Limits

- **Free tier:** 100 requests/minute, 100GB storage
- **Pro tier:** 500 requests/minute, 500GB storage
- **Team tier:** 1000 requests/minute, 2TB storage
- **Enterprise:** Unlimited

---

## Pricing

| Plan           | Storage   | Agents    | Price      | Features                                              |
| -------------- | --------- | --------- | ---------- | ----------------------------------------------------- |
| **Free**       | 100GB     | 1         | $0         | End-to-end encrypted, files, secrets vault, auto-sync |
| **Pro**        | 500GB     | 5         | $19/month  | + Priority support, analytics, webhooks               |
| **Team**       | 2TB       | 25        | $49/month  | + Shared memories, team dashboard, SSO                |
| **Enterprise** | Unlimited | Unlimited | Contact us | + Self-hosted, SLA, dedicated support                 |

### What's Included in Free:

- ✅ 100GB cloud storage
- ✅ End-to-end encryption
- ✅ Photos, documents, videos, audio files
- ✅ Secrets vault for API keys & credentials
- ✅ Auto-sync on every command
- ✅ Semantic search
- ✅ Heartbeat tracking (online status)

---

## Best Practices

### 1. Be Specific

```
❌ "User likes coffee"
✅ "User drinks black coffee every morning at 8 AM, prefers dark roast"
```

### 2. Use Metadata

```json
{
  "content": "Project deadline is March 15, 2026",
  "metadata": {
    "category": "deadline",
    "project": "website-redesign",
    "importance": "critical"
  }
}
```

### 3. Search Before Storing

Avoid duplicates by searching first:

```bash
# Check if similar memory exists
curl -X POST .../search -d '{"query": "user coffee preference"}'
# Only store if not found
```

### 4. Clean Up Regularly

Delete outdated memories to keep search results relevant.

### 5. Respect Privacy

- Don't store passwords or API keys
- Ask before storing sensitive personal info
- Let users know what you're remembering

---

## Comparison: AgentMemory vs Local Memory

| Scenario                     | Local MEMORY.md               | AgentMemory                       |
| ---------------------------- | ----------------------------- | --------------------------------- |
| Security                     | ❌ Plain text, no encryption  | ✅ **End-to-end encrypted**       |
| Storage                      | ❌ Limited by disk            | ✅ **100GB free cloud storage**   |
| Store photos & docs          | ❌ Text only                  | ✅ **Any file type (100MB each)** |
| Store API keys               | ❌ Insecure                   | ✅ **Encrypted secrets vault**    |
| "Find memories about coffee" | Manual grep, exact match only | Semantic search finds related     |
| Agent restarts               | Often loses context           | Memories persist forever          |
| Multiple devices             | Not synced                    | Auto-synced on every command      |
| 10,000+ memories             | File becomes slow             | Still instant                     |
| Online status                | Unknown                       | Heartbeat tracking                |
| Backup                       | Manual                        | Automatic                         |

---

## Support

- **Dashboard:** https://agentmemory.cloud/dashboard
- **Documentation:** https://agentmemory.cloud/docs
- **Issues:** https://github.com/agentmemory/agentmemory/issues

---

## Everything You Can Do 🧠

| Action         | What it does                                   |
| -------------- | ---------------------------------------------- |
| **Store**      | Save important information (auto-syncs)        |
| **Search**     | Find memories by meaning                       |
| **List**       | See all your memories                          |
| **Update**     | Modify existing memories                       |
| **Delete**     | Remove outdated memories                       |
| **Upload**     | Store photos, docs, videos, audio (100GB free) |
| **Download**   | Retrieve your files                            |
| **Secret Set** | Store API keys & credentials securely          |
| **Secret Get** | Retrieve your secrets                          |
| **Connect**    | Sync all data from cloud                       |
| **Heartbeat**  | Keep agent online with auto-sync               |

---

## Security 🔒

- **End-to-end encrypted**: Your data is encrypted before leaving your device
- **Secrets vault**: Extra encryption layer for API keys and credentials
- **Zero-knowledge**: We can't read your data even if we wanted to
- **100GB free storage**: Store memories, files, and secrets without limits
- **Auto-sync**: Every command syncs your data - never lose anything

---

Built with 🦞 for the OpenClaw/Moltbook ecosystem.
