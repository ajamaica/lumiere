# Jasper Recall v0.2.0 Spec: Shared Agent Memory

> Bidirectional learning between main and sandboxed agents with privacy controls

## Overview

**Problem:** Sandboxed agents (like moltbook-scanner) operate in isolation. They can't:

- Learn from main agent's daily work and decisions
- Share their learnings back to main
- Access relevant product context for authentic engagement

**Solution:** Tagged memory system with access control:

- `[public]` memories visible to all agents
- `[private]` memories restricted to main
- Bidirectional sync with privacy filtering

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MEMORY LAYER                                 │
│                                                                     │
│  ┌──────────────────────┐      ┌──────────────────────┐            │
│  │    PRIVATE ZONE      │      │    SHARED ZONE       │            │
│  │   (main only)        │      │   (all agents)       │            │
│  │                      │      │                      │            │
│  │ • memory/*.md        │ ───► │ • memory/shared/     │            │
│  │   [private] tagged   │filter│   auto-extracted     │            │
│  │ • MEMORY.md          │      │ • product-updates.md │            │
│  │ • USER.md            │      │ • learnings.md       │            │
│  └──────────────────────┘      └──────────────────────┘            │
│            │                            │                          │
│            ▼                            ▼                          │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                    ChromaDB                          │          │
│  │                                                      │          │
│  │  collection: private_memories  ◄── main only        │          │
│  │  collection: shared_memories   ◄── all agents       │          │
│  │  collection: agent_learnings   ◄── sandboxed writes │          │
│  └──────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
          ▲                                      ▲
          │                                      │
    ┌─────┴─────┐                        ┌──────┴──────┐
    │  JASPER   │                        │  MOLTBOOK   │
    │  (main)   │                        │  SCANNER    │
    │           │                        │  (sandboxed)│
    │ • rw all  │                        │ • r shared  │
    │ • tag mem │                        │ • w learnings│
    └───────────┘                        └─────────────┘
```

## Memory Tagging Convention

### Syntax

Tags appear at the start of a section header:

```markdown
## 2026-02-05 [public] - Shipped jasper-recall v0.1.0

Released the npm package, got good community reception.

## 2026-02-05 [private] - User mentioned upcoming travel

Will be unavailable Feb 10-15.
```

### Classification Rules

| Category             | Tag         | Examples                               |
| -------------------- | ----------- | -------------------------------------- |
| Product work         | `[public]`  | Feature releases, bug fixes, decisions |
| Technical learnings  | `[public]`  | Patterns, best practices, gotchas      |
| Community engagement | `[public]`  | Moltbook posts, feedback, reactions    |
| Public decisions     | `[public]`  | Architecture choices, roadmap          |
| Personal info        | `[private]` | Names, locations, schedule             |
| Secrets              | `[private]` | Keys, tokens, credentials              |
| Internal ops         | `[private]` | Server IPs, internal paths             |
| User preferences     | `[private]` | Habits, communication style            |

### Default Behavior

- Untagged content defaults to `[private]` (safe default)
- Explicit `[public]` required for sharing

## File Structure

```
~/.openclaw/workspace/
├── memory/
│   ├── 2026-02-05.md           # Daily notes (tagged)
│   ├── YYYY-MM-DD.md           # More daily notes
│   └── shared/                  # PUBLIC ZONE
│       ├── product-updates.md   # Auto-extracted from daily notes
│       ├── learnings.md         # Aggregated insights
│       └── moltbook/            # Engagement data
│           └── posts.md         # What was posted, reactions
│
~/.openclaw/workspace-moltbook/
├── shared -> ~/.openclaw/workspace/memory/shared/  # SYMLINK
├── AGENTS.md
└── PRODUCT-CONTEXT.md          # Deprecated, use shared/
```

## CLI Changes

### recall (updated)

```bash
# Existing behavior (searches all)
recall "query"

# New: public-only mode for sandboxed agents
recall "query" --public-only

# New: specify collection
recall "query" --collection shared_memories
recall "query" --collection agent_learnings
```

### index-digests (updated)

```bash
# Index with tag extraction
index-digests

# Parses [public]/[private] tags
# Routes to appropriate collection
```

### New: sync-shared

```bash
# Extract [public] content from daily notes
sync-shared

# Options
sync-shared --dry-run      # Preview only
sync-shared --force        # Re-extract all
sync-shared --since 7d     # Last 7 days only
```

### New: privacy-check

```bash
# Scan content for private data before writing
privacy-check "text to check"
privacy-check --file /path/to/file.md

# Returns: CLEAN or list of detected patterns
```

## Privacy Filter Patterns

Reuses patterns from hopeIDS where applicable:

```javascript
const PRIVATE_PATTERNS = [
  // Personal identifiers
  { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: 'phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },

  // Paths and infrastructure
  { name: 'home_path', pattern: /\/home\/\w+\//g },
  {
    name: 'internal_ip',
    pattern: /\b(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,
  },

  // Secrets
  { name: 'api_key', pattern: /sk-[a-zA-Z0-9-_]{20,}/g },
  { name: 'token', pattern: /\b[a-zA-Z0-9]{32,}\b/g }, // Generic long tokens

  // Keywords
  { name: 'secret_keyword', pattern: /\b(password|secret|private|internal|confidential)\b/gi },

  // Names (configurable allowlist)
  { name: 'product_names', allowlist: ['jasper-recall', 'hopeIDS', 'Jasper', 'OpenClaw'] },
]
```

## Implementation Plan

### Phase 1: Foundation (Day 1)

1. **JR-10**: Memory tagging convention
   - Update AGENTS.md with tagging rules
   - Add examples to daily note template
2. **JR-11**: Shared memory directory
   - Create `memory/shared/` structure
   - Symlink to moltbook-scanner workspace
   - Create initial files

### Phase 2: Privacy (Day 1-2)

3. **JR-13**: Privacy filter
   - Create `scripts/privacy-check.py`
   - Integrate hopeIDS patterns
   - Add CLI command

4. **JR-16**: Reflection workflow
   - Update moltbook-scanner AGENTS.md
   - Add pre-post checklist

### Phase 3: Indexing (Day 2)

5. **JR-12**: Public-only recall
   - Update `scripts/recall.py` with --public-only
   - Add collection routing in index-digests
   - Create shared_memories collection

### Phase 4: Sync (Day 2-3)

6. **JR-14**: Bidirectional sync cron
   - Create `scripts/sync-shared.py`
   - Extract [public] entries
   - Schedule via OpenClaw cron

7. **JR-15**: Moltbook learnings capture
   - Update post-comment.js to log engagement
   - Write to shared/moltbook/posts.md

### Phase 5: Polish (Day 3)

8. **JR-17**: ChromaDB collections
   - Migrate to multi-collection setup
   - Update all scripts

## Success Criteria

1. ✅ Moltbook-scanner can query recall for product info
2. ✅ Private data never appears in shared memory
3. ✅ Main agent sees moltbook engagement data
4. ✅ New product updates auto-sync to sandboxed agents
5. ✅ Privacy filter catches 95%+ of sensitive patterns

## Timeline

| Day | Tasks               | Deliverable                           |
| --- | ------------------- | ------------------------------------- |
| 1   | JR-10, JR-11, JR-13 | Tagging + shared dir + privacy filter |
| 2   | JR-12, JR-14, JR-16 | Public recall + sync + reflection     |
| 3   | JR-15, JR-17        | Learnings capture + collections       |

**Target:** v0.2.0 release by Feb 7, 2026

## Future Considerations

- **v0.3.0**: Multi-agent memory mesh (N agents, not just 2)
- **v0.3.0**: Encrypted shared memories for sensitive-but-shareable
- **v0.3.0**: Memory summarization (compress old entries)
