# Jasper Recall 🦊

Local RAG (Retrieval-Augmented Generation) system for AI agent memory. Gives your agent the ability to remember and search past conversations using ChromaDB and sentence-transformers.

## Features

- **Semantic search** over session logs and memory files
- **Local embeddings** — no API keys needed
- **Incremental indexing** — only processes changed files
- **Session digests** — automatically extracts key info from chat logs
- **OpenClaw integration** — works seamlessly with OpenClaw agents

### New in v0.2.0: Shared Agent Memory

- **Memory tagging** — Mark entries `[public]` or `[private]` to control visibility
- **Privacy filtering** — `--public-only` flag for sandboxed agents
- **Shared memory sync** — Bidirectional learning between main and sandboxed agents
- **Privacy checker** — Scan content for sensitive data before sharing

### New in v0.3.0: Multi-Agent Mesh (JR-19)

- **Multi-agent memory sharing** — N agents can share memory, not just 2
- **Agent-specific collections** — Each agent gets private memory (`agent_sonnet`, `agent_qwen`, etc.)
- **Mesh queries** — Query across multiple agents: `recall-mesh "query" --mesh sonnet,qwen,opus`
- **Backward compatible** — Legacy collections still work

### New in v0.2.1: Recall Server

- **HTTP API server** — `npx jasper-recall serve` for Docker-isolated agents
- **Public-only by default** — Secure API access for untrusted callers
- **CORS enabled** — Works from browsers and agent containers

## Quick Start

```bash
# One-command setup
npx jasper-recall setup

# Search your memory
recall "what did we decide about the API"

# Index your files
index-digests

# Process new session logs
digest-sessions
```

### Multi-Agent Mesh (v0.3.0+)

```bash
# Index memory for specific agents
index-digests-mesh --agent sonnet
index-digests-mesh --agent qwen

# Query as specific agent
recall-mesh "query" --agent sonnet

# Query across multiple agents (mesh mode)
recall-mesh "query" --mesh sonnet,qwen,opus
```

See [Multi-Agent Mesh Documentation](docs/MULTI-AGENT-MESH.md) for details.

## What Gets Indexed

By default, indexes markdown files from `~/.openclaw/workspace/memory/`:

- Daily notes (`*.md`)
- Session digests (`session-digests/*.md`)
- Project docs (`repos/*.md`)
- SOPs (`sops/*.md`)

## How It Works

```
┌────────────────┐     ┌──────────────┐     ┌───────────┐
│ Session Logs   │────▶│ digest-      │────▶│ Markdown  │
│ (.jsonl)       │     │ sessions     │     │ Digests   │
└────────────────┘     └──────────────┘     └─────┬─────┘
                                                  │
                                                  ▼
┌────────────────┐     ┌──────────────┐     ┌───────────┐
│ Memory Files   │────▶│ index-       │────▶│ ChromaDB  │
│ (*.md)         │     │ digests      │     │ Vectors   │
└────────────────┘     └──────────────┘     └─────┬─────┘
                                                  │
                                                  ▼
                       ┌──────────────┐     ┌───────────┐
                       │ recall       │◀────│ Query     │
                       │ "query"      │     │           │
                       └──────────────┘     └───────────┘
```

## CLI Reference

### recall

Search your indexed memory:

```bash
recall "query"              # Basic search
recall "query" -n 10        # More results
recall "query" --json       # JSON output
recall "query" -v           # Show similarity scores
recall "query" --public-only  # Only shared content (for sandboxed agents)
```

### index-digests

Index markdown files into ChromaDB:

```bash
index-digests               # Index all files
```

### digest-sessions

Extract summaries from session logs:

```bash
digest-sessions             # Process new sessions only
digest-sessions --all       # Reprocess everything
digest-sessions --dry-run   # Preview without writing
```

### privacy-check (v0.2.0+)

Scan content for sensitive data before sharing:

```bash
privacy-check "text to scan"     # Check inline text
privacy-check --file notes.md    # Check a file
```

Detects: emails, API keys, internal IPs, home paths, credentials.

### summarize-old (v0.3.0+)

Compress old memory entries to save tokens:

```bash
summarize-old                    # Summarize entries older than 30 days
summarize-old --days 14          # Summarize entries older than 14 days
summarize-old --dry-run          # Preview what would be summarized
summarize-old --min-size 1000    # Only summarize files larger than 1000 chars
```

- Archives originals to `memory/archive/`
- Rule-based summarization (no LLM required)
- Preserves headings, bullets, dates, and key markers

### sync-shared (v0.2.0+)

Extract `[public]` tagged entries to shared memory:

```bash
sync-shared                 # Sync recent entries
sync-shared --all           # Reprocess all daily notes
sync-shared --dry-run       # Preview without writing
```

## Shared Agent Memory (v0.2.0+)

For multi-agent setups where sandboxed agents need access to some (but not all) memory:

### Memory Tagging

Tag daily note sections as public or private:

```markdown
## 2026-02-05 [public] - Shipped new feature

Released v1.0, good reception from users.

## 2026-02-05 [private] - Personal notes

User mentioned travel plans next week.
```

- `[public]` — Visible to all agents (synced to `memory/shared/`)
- `[private]` — Main agent only (default if untagged)

### Setup for Sandboxed Agents

1. Create shared directory: `mkdir -p ~/.openclaw/workspace/memory/shared`
2. Symlink to sandboxed workspace: `ln -s ~/.openclaw/workspace/memory/shared ~/.openclaw/workspace-sandbox/shared`
3. Use `--public-only` flag in sandboxed agent's recall queries

### Sync Workflow

```bash
# Extract [public] entries to shared/
sync-shared

# Index everything (including shared/)
index-digests

# Sandboxed agent queries only public content
recall "product info" --public-only
```

## Recall Server (v0.2.1+)

For **Docker-isolated agents** that can't run the CLI directly, start an HTTP API server:

```bash
npx jasper-recall serve              # Default: localhost:3458
npx jasper-recall serve --port 8080  # Custom port
npx jasper-recall serve --host 0.0.0.0  # Allow external access
```

### API Endpoints

```
GET /recall?q=search+query&limit=5
GET /health
```

### Example

```bash
# Query from Docker container
curl "http://host.docker.internal:3458/recall?q=product+info"
```

Response:

```json
{
  "ok": true,
  "query": "product info",
  "public_only": true,
  "count": 3,
  "results": [{ "content": "...", "file": "memory/shared/product-updates.md", "score": 0.85 }]
}
```

### Security

- **`public_only=true` is enforced by default** — API callers only see public content
- To allow private queries (dangerous!), set `RECALL_ALLOW_PRIVATE=true`
- Bind to `127.0.0.1` (default) to prevent external access

## Configuration

Set environment variables to customize paths:

```bash
export RECALL_WORKSPACE=~/.openclaw/workspace
export RECALL_CHROMA_DB=~/.openclaw/chroma-db
export RECALL_SESSIONS_DIR=~/.openclaw/agents/main/sessions
export RECALL_VENV=~/.openclaw/rag-env
```

## OpenClaw Plugin (v0.4.0+)

Jasper Recall includes an OpenClaw plugin with **auto-recall** — automatically inject relevant memories before every message is processed.

### Installation

```bash
# Full setup including plugin
npx jasper-recall setup
```

Add to `openclaw.json`:

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/jasper-recall/extensions/jasper-recall"]
    },
    "entries": {
      "jasper-recall": {
        "enabled": true,
        "config": {
          "autoRecall": true,
          "minScore": 0.3,
          "defaultLimit": 5
        }
      }
    }
  }
}
```

### Auto-Recall

When `autoRecall: true`, the plugin hooks into `before_agent_start` and:

1. Takes the incoming message
2. Searches ChromaDB for relevant memories
3. Filters by `minScore` (default 30% similarity)
4. Injects results as `<relevant-memories>` context

```xml
<relevant-memories>
The following memories may be relevant to this conversation:
- [memory/2026-02-05.md] Worker orchestration decisions...
- [MEMORY.md] Git workflow: feature → develop → main...
</relevant-memories>
```

### Plugin Options

| Option         | Default | Description                              |
| -------------- | ------- | ---------------------------------------- |
| `autoRecall`   | `false` | Auto-inject memories before processing   |
| `minScore`     | `0.3`   | Minimum similarity (0-1) for auto-recall |
| `defaultLimit` | `5`     | Max results for tool/auto-recall         |
| `publicOnly`   | `false` | Restrict to public memory (sandboxed)    |

### Tools & Commands

The plugin registers:

- `recall` tool — semantic search from agent code
- `/recall <query>` — quick search from chat
- `/index` — re-index memory files

## OpenClaw Integration

Add to your agent's HEARTBEAT.md for automatic memory maintenance:

```markdown
## Memory Maintenance

- [ ] New sessions? → `digest-sessions`
- [ ] Files updated? → `index-digests`
```

Or schedule via cron:

```json
{
  "schedule": { "kind": "cron", "expr": "0 */6 * * *" },
  "payload": {
    "kind": "agentTurn",
    "message": "Run index-digests to update memory index"
  },
  "sessionTarget": "isolated"
}
```

## Technical Details

- **Embedding model**: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions, ~80MB)
- **Vector store**: ChromaDB (persistent, local)
- **Chunking**: 500 chars with 100 char overlap
- **Deduplication**: Content hash check skips unchanged files

## Requirements

- Python 3.10+
- Node.js 18+ (for setup CLI)
- ~500MB disk space (model + dependencies)

## License

MIT

## Links

- [GitHub](https://github.com/E-x-O-Entertainment-Studios-Inc/jasper-recall)
- [ClawHub](https://clawhub.ai/skills/jasper-recall)
- [Documentation](https://exohaven.online/products/jasper-recall)
