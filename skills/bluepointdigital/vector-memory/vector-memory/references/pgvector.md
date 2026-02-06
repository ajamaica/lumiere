# pgvector Version

For large-scale deployments (>1000 chunks) or team use, use the pgvector version with PostgreSQL.

## Prerequisites

- Docker
- OpenAI API key (for embeddings)

## Setup

```bash
# Start pgvector
docker-compose -f docker-compose.yml up -d

# Sync memory
node vector_memory.js --sync
```

## Configuration

Environment variables:

```bash
export PG_HOST=localhost
export PG_PORT=5433
export PG_DATABASE=memory
export PG_USER=openclaw
export PG_PASSWORD=openclaw_memory_2025
export OPENAI_API_KEY=sk-...
```

## Usage

Same CLI as local version:

```bash
node vector_memory.js --search "query"
node vector_memory.js --sync
node vector_memory.js --status
```

## When to Use

| Scenario             | Use              |
| -------------------- | ---------------- |
| Personal agent       | Local version    |
| Team/shared          | pgvector version |
| > 1000 memory chunks | pgvector version |
| Need real-time sync  | pgvector version |

## Migration

To migrate from local to pgvector:

1. Set up pgvector (see above)
2. Run `node vector_memory.js --sync`
3. Point skill.json to `vector_memory.js` instead of `vector_memory_local.js`
