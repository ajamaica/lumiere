---
name: vector-memory
description: Smart memory search with automatic vector fallback. Uses semantic embeddings when available, falls back to built-in search otherwise. Zero configuration - works immediately after ClawHub install. No setup required - just install and memory_search works immediately, gets better after optional sync.
---

# Vector Memory

Smart memory search that **automatically selects the best method**:

- **Vector search** (semantic, high quality) when synced
- **Built-in search** (keyword, fast) as fallback

**Zero configuration required.** Works immediately after install.

## Quick Start

### Install from ClawHub

```bash
npx clawhub install vector-memory
```

Done! `memory_search` now works with automatic method selection.

### Optional: Sync for Better Results

```bash
node vector-memory/smart_memory.js --sync
```

After sync, searches use neural embeddings for semantic understanding.

## How It Works

### Smart Selection

```javascript
// Same call, automatic best method
memory_search('James principles values')

// If vector ready: finds "autonomy, competence, creation" (semantic match)
// If not ready: uses keyword search (fallback)
```

### Behavior Flow

1. **Check**: Is vector index ready?
2. **Yes**: Use semantic search (synonyms, concepts)
3. **No**: Use built-in search (keywords)
4. **Vector fails**: Automatically fall back

## Tools

### memory_search

**Auto-selects best method**

Parameters:

- `query` (string): Search query
- `max_results` (number): Max results (default: 5)

Returns: Matches with path, lines, score, snippet

### memory_get

Get full content from file.

### memory_sync

Index memory files for vector search. Run after edits.

### memory_status

Check which method is active.

## Comparison

| Feature  | Built-in | Vector        | Smart Wrapper   |
| -------- | -------- | ------------- | --------------- |
| Synonyms | ❌       | ✅            | ✅ (when ready) |
| Setup    | Built-in | Requires sync | ✅ Zero config  |
| Fallback | N/A      | Manual        | ✅ Automatic    |

## Usage

**Immediate (no action needed):**

```bash
node vector-memory/smart_memory.js --search "query"
```

**Better quality (after sync):**

```bash
# One-time setup
node vector-memory/smart_memory.js --sync

# Now all searches use vector
node vector-memory/smart_memory.js --search "query"
```

## Files

| File                     | Purpose                          |
| ------------------------ | -------------------------------- |
| `smart_memory.js`        | Main entry - auto-selects method |
| `vector_memory_local.js` | Vector implementation            |
| `memory.js`              | OpenClaw wrapper                 |

## Configuration

**None required.**

Optional environment variables:

```bash
export MEMORY_DIR=/path/to/memory
export MEMORY_FILE=/path/to/MEMORY.md
```

## Scaling

- **< 1000 chunks**: Built-in + JSON (current)
- **> 1000 chunks**: Use pgvector (see references/pgvector.md)

## References

- [Integration](references/integration.md) - Detailed setup
- [pgvector](references/pgvector.md) - Large-scale deployment
