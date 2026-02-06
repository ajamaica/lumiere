# Multi-Agent Mesh (JR-19)

## Overview

The multi-agent mesh feature allows N agents to share memory, not just 2. Each agent can have its own private collection while selectively sharing with other agents.

## Architecture

### Collection Types

1. **Agent-specific collections**: `agent_<name>` (e.g., `agent_sonnet`, `agent_qwen`)
   - Private memory for each agent
   - Created when indexing with `--agent <name>`

2. **Shared collections** (accessible to all agents):
   - `shared_memories`: Public/shared content
   - `agent_learnings`: Meta-learnings about agent operation

3. **Legacy collection** (backward compatibility):
   - `private_memories`: Original main agent collection

## Usage

### Indexing for Specific Agents

```bash
# Index memory for SONNET agent
index-digests-mesh --agent sonnet

# Index memory for QWEN agent
index-digests-mesh --agent qwen

# Index memory for legacy/main agent (no agent flag)
index-digests-mesh
```

### Querying as a Specific Agent

```bash
# Query as SONNET (sees: agent_sonnet + shared + learnings)
recall-mesh "query" --agent sonnet

# Query as QWEN (sees: agent_qwen + shared + learnings)
recall-mesh "query" --agent qwen

# Query legacy mode (sees: private_memories + shared + learnings)
recall-mesh "query"
```

### Multi-Agent Mesh Queries

```bash
# Query across multiple agents (mesh mode)
recall-mesh "query" --mesh sonnet,qwen,opus

# This queries:
# - agent_sonnet
# - agent_qwen
# - agent_opus
# - shared_memories
# - agent_learnings
```

### Public-Only Mode (for sandboxed agents)

```bash
# Only query shared content (backward compat with JR-17)
recall-mesh "query" --public-only

# This queries:
# - shared_memories
# - agent_learnings
```

## Content Classification

Files are automatically classified based on path and tags:

| Type         | Collection                           | Criteria                                                            |
| ------------ | ------------------------------------ | ------------------------------------------------------------------- |
| **Learning** | `agent_learnings`                    | Path contains `learnings/` OR filename is `AGENTS.md` or `TOOLS.md` |
| **Public**   | `shared_memories`                    | Path contains `shared/` OR content includes `[public]` tag          |
| **Private**  | `agent_<name>` or `private_memories` | Default for all other content                                       |

### Tagging Content

Use inline tags to control visibility:

```markdown
# Example Memory Entry

[public] This content is visible to all agents.

[private] This content is only visible to the indexing agent.
```

## Installation

The mesh scripts are in `scripts/` and need to be installed to `~/.local/bin/`:

```bash
# Install mesh scripts
cp scripts/recall-mesh ~/.local/bin/recall-mesh
cp scripts/index-digests-mesh ~/.local/bin/index-digests-mesh
chmod +x ~/.local/bin/recall-mesh ~/.local/bin/index-digests-mesh
```

Or create symlinks for development:

```bash
ln -sf ~/projects/jasper-recall/scripts/recall-mesh ~/.local/bin/recall-mesh
ln -sf ~/projects/jasper-recall/scripts/index-digests-mesh ~/.local/bin/index-digests-mesh
```

## Backward Compatibility

All existing functionality is preserved:

- Scripts without flags work exactly as before
- Legacy `private_memories` collection still works
- `--public-only` flag (JR-17) still works
- Existing indexes are not affected

## Examples

### Scenario 1: Two Worker Agents Sharing Knowledge

```bash
# SONNET indexes its work
index-digests-mesh --agent sonnet

# QWEN indexes its work
index-digests-mesh --agent qwen

# SONNET queries both agents' memory
recall-mesh "how did QWEN implement this?" --mesh sonnet,qwen

# QWEN queries both agents' memory
recall-mesh "what did SONNET decide?" --mesh qwen,sonnet
```

### Scenario 2: Main Agent Coordinating Workers

```bash
# Workers index their own memory
index-digests-mesh --agent worker1
index-digests-mesh --agent worker2
index-digests-mesh --agent worker3

# Main agent queries all workers
recall-mesh "what have the workers accomplished?" --mesh worker1,worker2,worker3

# Individual worker queries only its own + shared
recall-mesh "query" --agent worker1
```

### Scenario 3: Gradual Migration

```bash
# Keep using legacy collection
index-digests  # Uses private_memories
recall "query"  # Queries private_memories + shared + learnings

# Start using agent-specific collections
index-digests-mesh --agent main
recall-mesh "query" --agent main

# Both work simultaneously (different collections)
```

## API Integration

The mesh feature can be integrated with the recall server:

```bash
# Start server with agent support
# (Future enhancement - server needs update)
npx jasper-recall serve --agent sonnet

# Query via HTTP
curl "http://localhost:9876/recall?q=query&agent=sonnet&mesh=qwen,opus"
```

## Performance Considerations

- **Mesh queries** search multiple collections, so they're slightly slower
- Each collection is queried in parallel internally
- Results are merged and sorted by relevance
- Larger meshes (more agents) = more collections to query

### Optimization Tips

1. **Use specific agent queries** when you know which agent's memory you need
2. **Use mesh queries** only when you need cross-agent knowledge
3. **Limit mesh size** to agents that are actually relevant
4. **Keep shared content minimal** to avoid duplication

## Directory Structure

```
~/.openclaw/
├── chroma-db/           # ChromaDB persistent storage
│   ├── agent_sonnet/    # SONNET's collection
│   ├── agent_qwen/      # QWEN's collection
│   ├── agent_opus/      # OPUS's collection
│   ├── private_memories/# Legacy main agent
│   ├── shared_memories/ # Shared across all agents
│   └── agent_learnings/ # Meta-learnings
└── workspace/
    └── memory/          # Source markdown files
```

## Testing

```bash
# 1. Index some content for different agents
echo "SONNET learned this" > ~/.openclaw/workspace/memory/sonnet-test.md
echo "QWEN learned this" > ~/.openclaw/workspace/memory/qwen-test.md
echo "[public] Everyone knows this" > ~/.openclaw/workspace/memory/shared-test.md

# 2. Index for each agent
index-digests-mesh --agent sonnet
index-digests-mesh --agent qwen

# 3. Test queries
recall-mesh "learned" --agent sonnet  # Should find SONNET + shared
recall-mesh "learned" --agent qwen    # Should find QWEN + shared
recall-mesh "learned" --mesh sonnet,qwen  # Should find both + shared
```

## Troubleshooting

### Collections not found

```bash
# List all collections
python3 -c "import chromadb; client = chromadb.PersistentClient('~/.openclaw/chroma-db'); print([c.name for c in client.list_collections()])"
```

### Empty results

```bash
# Check collection contents
recall-mesh "test" --agent sonnet -v  # Verbose shows collections queried
```

### Performance issues

```bash
# Check collection sizes
python3 -c "
import chromadb
client = chromadb.PersistentClient('~/.openclaw/chroma-db')
for col in client.list_collections():
    print(f'{col.name}: {col.count()} chunks')
"
```

## Future Enhancements

- [ ] Agent-to-agent memory sharing permissions
- [ ] Automatic mesh discovery (query all available agents)
- [ ] Memory replication across agents
- [ ] Cross-agent memory deduplication
- [ ] Agent memory quotas
- [ ] Memory access audit logs

## See Also

- [JR-17: Shared ChromaDB Collections](../CHANGELOG.md#v020)
- [Main README](../README.md)
- [REQUIREMENTS.md](../../task-dashboard/docs/jasper-recall/REQUIREMENTS.md)
