# Progressive Disclosure for HexMem

Inspired by claude-mem's token-efficient memory retrieval pattern.

## Philosophy

AI agents need context, but full memory dumps waste tokens. Progressive disclosure provides:

1. **Compact index** (~50-100 tokens/result) - What's available?
2. **Timeline context** (~200-300 tokens) - What was happening around X?
3. **Full details** (~500-1,000 tokens/result) - Only when needed

This gives AI the power to filter before fetching, saving ~10x tokens.

## The 3-Layer Pattern

### Layer 1: Index Search

Get a compact list of what's available:

```bash
hexmem_index "search query" [table] [limit]
```

**Returns:** IDs, timestamps, types, summaries (no full content)

**Example:**

```bash
hexmem_index "lightning routing" "events" 20
# → Shows 20 event IDs with dates and 1-line summaries
```

**Token cost:** ~50-100 tokens per result (just metadata)

### Layer 2: Timeline Context

Get chronological context around interesting results:

```bash
hexmem_timeline <event_id> [hours_before] [hours_after]
hexmem_timeline_range "2026-02-01" "2026-02-03"
```

**Returns:** What was happening around that time (compact)

**Example:**

```bash
hexmem_timeline 42 2 2
# → Events within ±2 hours of event #42
```

**Token cost:** ~200-300 tokens (surrounding context, not full details)

### Layer 3: Full Details

Fetch complete information for filtered IDs:

```bash
hexmem_details <table> <id1> [id2] [id3] ...
```

**Returns:** Full records with all fields

**Example:**

```bash
# After reviewing index and timeline, fetch only relevant IDs
hexmem_details events 42 57 103
```

**Token cost:** ~500-1,000 tokens per result (full content)

## Workflow Example

**Bad (wasteful):**

```bash
# Dumps everything, 10,000+ tokens
hexmem_search "routing problems" | head -50
```

**Good (progressive):**

```bash
# Step 1: Get index (500 tokens)
hexmem_index "routing problems" events 10
# → IDs: 42, 57, 103, 108, 201...

# Step 2: Review timestamps, check timeline (300 tokens)
hexmem_timeline 42 4 4
# → Sees event #57 was related, #201 was different context

# Step 3: Fetch only relevant details (1,500 tokens)
hexmem_details events 42 57
# Total: ~2,300 tokens instead of 10,000+
```

## Implementation

See `hexmem.sh` for functions:

- `hexmem_index` - Compact search results
- `hexmem_timeline` - Chronological context windows
- `hexmem_timeline_range` - Date range context
- `hexmem_details` - Full record fetch (batch)

## Token Estimation

| Operation                   | Approx Tokens | Use When                  |
| --------------------------- | ------------- | ------------------------- |
| `hexmem_index` (10 results) | ~500          | Always start here         |
| `hexmem_timeline` (±4h)     | ~300          | Need context around event |
| `hexmem_details` (3 items)  | ~2,000        | After filtering           |
| Naive full search           | ~10,000+      | Never (wasteful)          |

## Best Practices

**For AI agents:**

1. Always start with `hexmem_index` to see what's available
2. Review IDs and timestamps - do you really need all of them?
3. Use `hexmem_timeline` to understand context
4. Batch `hexmem_details` calls - fetch multiple IDs at once
5. Filter aggressively - only fetch what you'll use

**For humans:**

- Full queries are fine (you're reading, not paying per token)
- Use normal search helpers like `hexmem_search`, `hexmem_recent_events`
- Progressive disclosure is an AI optimization, not a human UX requirement

---

**Adapted from:** [claude-mem](https://github.com/thedotmack/claude-mem) progressive disclosure pattern  
**Credits:** @thedotmack (Alex Newman)
