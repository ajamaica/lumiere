# Integration Guide

## For OpenClaw Agents

### Method 1: Skill Installation

1. Copy `skills/vector-memory/` to your agent's `skills/` directory
2. Copy `vector-memory/` implementation folder
3. Install dependencies: `cd vector-memory && npm install`
4. Index memory: `node vector_memory_local.js --sync`
5. Use via skill system

### Method 2: Direct Tool Replacement

Replace built-in `memory_search` with:

```javascript
// In your agent's tools configuration
{
  "name": "memory_search",
  "command": "node /path/to/vector-memory/vector_memory_local.js --search {{query}} --max-results {{max_results}}"
}
```

### Method 3: Programmatic

```javascript
import { memorySearch, memoryGet, memorySync } from './vector-memory/memory.js'

// Search
const results = await memorySearch('James values', 5)

// Get full content
const content = memoryGet('MEMORY.md', 1, 20)

// Sync after edits
memorySync()
```

## For Other Frameworks

### LangChain (Python)

```python
from sentence_transformers import SentenceTransformer
from langchain_community.vectorstores import FAISS

model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)
vectorstore = FAISS.from_embeddings(embeddings, texts)
```

### N8N

Use Function node with `@xenova/transformers`:

```javascript
const { pipeline } = require('@xenova/transformers')
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
const embedding = await embedder(query, { pooling: 'mean' })
```

### Custom Agents

Core pattern:

1. Load model: `SentenceTransformer('all-MiniLM-L6-v2')`
2. Embed chunks: `model.encode(chunks)`
3. Store: JSON, SQLite, or vector DB
4. Search: Cosine similarity between query and stored embeddings
5. Return: Full content from source files

## Environment Setup

### Required

- Node.js 18+ (for OpenClaw version)
- npm or yarn

### Optional

- Docker (for pgvector version)
- OpenAI API key (for pgvector version)

## Directory Structure

```
workspace/
├── skills/
│   └── vector-memory/          # Skill manifest
│       ├── skill.json
│       └── README.md
├── vector-memory/              # Implementation
│   ├── vector_memory_local.js  # Local embeddings
│   ├── memory.js               # OpenClaw wrapper
│   ├── package.json
│   └── node_modules/
├── memory/                     # Your memory files
│   └── *.md
└── MEMORY.md                   # Main memory file
```

## Sharing Between Agents

Shareable:

- `skill.json`
- `vector_memory_local.js`
- `memory.js`
- `package.json`

Not shareable (agent-specific):

- `vectors_local.json` (rebuild per agent)
- `node_modules/` (reinstall per agent)
- `.cache/transformers/` (model downloads per agent)

## Auto-Sync

Add to heartbeat or cron:

```bash
# Sync if memory files changed
if [ -n "$(find memory MEMORY.md -newer vector-memory/.last_sync 2>/dev/null)" ]; then
    node vector-memory/vector_memory_local.js --sync
    touch vector-memory/.last_sync
fi
```
