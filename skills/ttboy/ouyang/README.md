# Jasper Recall 🦊

Local RAG (Retrieval-Augmented Generation) system for AI agent memory. Gives your agent the ability to remember and search past conversations using ChromaDB and sentence-transformers.

## Features

- **Semantic search** over session logs and memory files
- **Local embeddings** — no API keys needed
- **Incremental indexing** — only processes changed files
- **Session digests** — automatically extracts key info from chat logs
- **OpenClaw integration** — works seamlessly with OpenClaw agents

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

## Configuration

Set environment variables to customize paths:

```bash
export RECALL_WORKSPACE=~/.openclaw/workspace
export RECALL_CHROMA_DB=~/.openclaw/chroma-db
export RECALL_SESSIONS_DIR=~/.openclaw/agents/main/sessions
export RECALL_VENV=~/.openclaw/rag-env
```

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
