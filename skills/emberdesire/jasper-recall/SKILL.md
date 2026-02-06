---
name: jasper-recall
version: 0.3.1
description: Local RAG system for agent memory using ChromaDB and sentence-transformers. v0.3.0 adds multi-agent mesh (N agents sharing memory), OpenClaw plugin with autoRecall, and agent-specific collections. Commands: recall, index-digests, digest-sessions, privacy-check, sync-shared, serve, recall-mesh.
---

# Jasper Recall v0.2.3

Local RAG (Retrieval-Augmented Generation) system for AI agent memory. Gives your agent the ability to remember and search past conversations.

**New in v0.2.2:** Shared ChromaDB Collections — separate collections for private, shared, and learnings content. Better isolation for multi-agent setups.

**New in v0.2.1:** Recall Server — HTTP API for Docker-isolated agents that can't run CLI directly.

**New in v0.2.0:** Shared Agent Memory — bidirectional learning between main and sandboxed agents with privacy controls.

## When to Use

- **Memory recall**: Search past sessions for context before answering
- **Continuous learning**: Index daily notes and decisions for future reference
- **Session continuity**: Remember what happened across restarts
- **Knowledge base**: Build searchable documentation from your agent's experience

## Quick Start

### Setup

One command installs everything:

```bash
npx jasper-recall setup
```

This creates:

- Python venv at `~/.openclaw/rag-env`
- ChromaDB database at `~/.openclaw/chroma-db`
- CLI scripts in `~/.local/bin/`

### Basic Usage

**Search your memory:**

```bash
recall "what did we decide about the API design"
recall "hopeIDS patterns" --limit 10
recall "meeting notes" --json
```

**Index your files:**

```bash
index-digests  # Index memory files into ChromaDB
```

**Create session digests:**

```bash
digest-sessions          # Process new sessions
digest-sessions --dry-run  # Preview what would be processed
```

## How It Works

### Three Components

1. **digest-sessions** — Extracts key info from session logs (topics, tools used)
2. **index-digests** — Chunks and embeds markdown files into ChromaDB
3. **recall** — Semantic search across your indexed memory

### What Gets Indexed

By default, indexes files from `~/.openclaw/workspace/memory/`:

- `*.md` — Daily notes, MEMORY.md
- `session-digests/*.md` — Session summaries
- `repos/*.md` — Project documentation
- `founder-logs/*.md` — Development logs (if present)

### Embedding Model

Uses `sentence-transformers/all-MiniLM-L6-v2`:

- 384-dimensional embeddings
- ~80MB download on first run
- Runs locally, no API needed

## Agent Integration

### Memory-Augmented Responses

```python
# Before answering questions about past work
results = exec("recall 'project setup decisions' --json")
# Include relevant context in your response
```

### Automated Indexing (Heartbeat)

Add to HEARTBEAT.md:

```markdown
## Memory Maintenance

- [ ] New session logs? → `digest-sessions`
- [ ] Memory files updated? → `index-digests`
```

### Cron Job

Schedule regular indexing:

```json
{
  "schedule": { "kind": "cron", "expr": "0 */6 * * *" },
  "payload": {
    "kind": "agentTurn",
    "message": "Run index-digests to update the memory index"
  },
  "sessionTarget": "isolated"
}
```

## Shared Agent Memory (v0.2.0+)

For multi-agent setups where sandboxed agents need access to some memories:

### Memory Tagging

Tag entries in daily notes:

```markdown
## 2026-02-05 [public] - Feature shipped

This is visible to all agents.

## 2026-02-05 [private] - Personal note

This is main agent only (default if untagged).

## 2026-02-05 [learning] - Pattern discovered

Learnings shared bidirectionally between agents.
```

### ChromaDB Collections (v0.2.2+)

Memory is stored in separate collections for isolation:

| Collection         | Purpose                          | Who accesses     |
| ------------------ | -------------------------------- | ---------------- |
| `private_memories` | Main agent's private content     | Main agent only  |
| `shared_memories`  | [public] tagged content          | Sandboxed agents |
| `agent_learnings`  | Learnings from any agent         | All agents       |
| `jasper_memory`    | Legacy unified (backward compat) | Fallback         |

**Collection selection:**

```bash
# Main agent (default) - searches private_memories
recall "api design"

# Sandboxed agents - searches shared_memories only
recall "product info" --public-only

# Search learnings only
recall "patterns" --learnings

# Search all collections (merged results)
recall "everything" --all

# Specific collection
recall "something" --collection private_memories

# Legacy mode (single collection)
recall "old way" --legacy
```

### Sandboxed Agent Access

```bash
# Sandboxed agents use --public-only
recall "product info" --public-only

# Main agent can see everything
recall "product info"
```

### Privacy Workflow

```bash
# Check for sensitive data before sharing
privacy-check "text to scan"
privacy-check --file notes.md

# Extract [public] entries to shared directory
sync-shared
sync-shared --dry-run  # Preview first
```

## CLI Reference

### recall

```
recall "query" [OPTIONS]

Options:
  -n, --limit N     Number of results (default: 5)
  --json            Output as JSON
  -v, --verbose     Show similarity scores and collection source
  --public-only     Search shared_memories only (sandboxed agents)
  --learnings       Search agent_learnings only
  --all             Search all collections (merged results)
  --collection X    Search specific collection by name
  --legacy          Use legacy jasper_memory collection
```

### serve (v0.2.1+)

```
npx jasper-recall serve [OPTIONS]

Options:
  --port, -p N    Port to listen on (default: 3458)
  --host, -h H    Host to bind (default: 127.0.0.1)

Starts HTTP API server for Docker-isolated agents.

Endpoints:
  GET /recall?q=query&limit=5    Search memories
  GET /health                    Health check

Security: public_only=true enforced by default.
Set RECALL_ALLOW_PRIVATE=true to allow private queries.
```

**Example (from Docker container):**

```bash
curl "http://host.docker.internal:3458/recall?q=product+info"
```

### privacy-check (v0.2.0+)

```
privacy-check "text"     # Scan inline text
privacy-check --file X   # Scan a file

Detects: emails, API keys, internal IPs, home paths, credentials.
Returns: CLEAN or list of violations.
```

### sync-shared (v0.2.0+)

```
sync-shared [OPTIONS]

Options:
  --dry-run    Preview without writing
  --all        Process all daily notes

Extracts [public] tagged entries to memory/shared/.
```

### index-digests

```
index-digests

Indexes markdown files from:
  ~/.openclaw/workspace/memory/*.md
  ~/.openclaw/workspace/memory/session-digests/*.md
  ~/.openclaw/workspace/memory/repos/*.md
  ~/.openclaw/workspace/memory/founder-logs/*.md

Skips files that haven't changed (content hash check).
```

### digest-sessions

```
digest-sessions [OPTIONS]

Options:
  --dry-run    Preview without writing
  --all        Process all sessions (not just new)
  --recent N   Process only N most recent sessions
```

## Configuration

### Custom Paths

Set environment variables:

```bash
export RECALL_WORKSPACE=~/.openclaw/workspace
export RECALL_CHROMA_DB=~/.openclaw/chroma-db
export RECALL_SESSIONS_DIR=~/.openclaw/agents/main/sessions
```

### Chunking

Default settings in index-digests:

- Chunk size: 500 characters
- Overlap: 100 characters

## Troubleshooting

**"No index found"**

```bash
index-digests  # Create the index first
```

**"Collection not found"**

```bash
rm -rf ~/.openclaw/chroma-db  # Clear and rebuild
index-digests
```

**Model download slow**
First run downloads ~80MB model. Subsequent runs are instant.

## Links

- **GitHub**: https://github.com/E-x-O-Entertainment-Studios-Inc/jasper-recall
- **npm**: https://www.npmjs.com/package/jasper-recall
- **ClawHub**: https://clawhub.ai/skills/jasper-recall
