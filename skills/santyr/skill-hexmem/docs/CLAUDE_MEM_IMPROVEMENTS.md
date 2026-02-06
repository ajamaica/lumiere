# HexMem Improvements Inspired by claude-mem

Analysis and adaptation of [claude-mem](https://github.com/thedotmack/claude-mem) best practices.

**Author:** Hex  
**Date:** 2026-02-03  
**Credits:** @thedotmack (Alex Newman) for claude-mem architecture

---

## Comparison Matrix

| Feature               | claude-mem                      | HexMem (before)               | HexMem (after)                      |
| --------------------- | ------------------------------- | ----------------------------- | ----------------------------------- |
| **Memory Model**      | Tool usage observations         | Structured facts/events       | Both (structured + observations)    |
| **Search Pattern**    | 3-layer progressive disclosure  | Full-text or semantic         | ✅ **Added** 3-layer pattern        |
| **Token Awareness**   | Built-in estimates              | No                            | ✅ **Added** token estimators       |
| **Timeline Context**  | Chronological windows           | Only full event queries       | ✅ **Added** timeline views         |
| **Compression**       | Automatic AI summarization      | Manual (epistemic extraction) | **Documented** compression patterns |
| **Web UI**            | HTTP API + viewer on :37777     | No                            | **Future** (optional)               |
| **Lifecycle Hooks**   | 5 hooks (session start/end/etc) | Manual logging                | **Planned** (OpenClaw hooks)        |
| **Hybrid Search**     | Chroma vector + FTS5            | Embeddings + FTS              | Already equivalent                  |
| **Identity Focus**    | No (project-centric)            | Yes (self-knowledge)          | **Unique strength**                 |
| **Emotional Tagging** | No                              | Yes                           | **Unique strength**                 |
| **Memory Decay**      | No                              | Yes (hot/warm/cold)           | **Unique strength**                 |
| **Supersession**      | No                              | Yes (preserves history)       | **Unique strength**                 |

---

## Key Ideas Adopted

### 1. Progressive Disclosure ✅ IMPLEMENTED

**From claude-mem:** 3-layer workflow (index → timeline → details) saves ~10x tokens.

**HexMem implementation:**

- `hexmem_index` - Compact results (~75 tokens/item)
- `hexmem_timeline` - Chronological context windows
- `hexmem_timeline_range` - Date range views
- `hexmem_details` - Full records (batch fetch)
- `hexmem_token_estimate` - Cost estimator

**Files added:**

- `docs/PROGRESSIVE_DISCLOSURE.md` - Philosophy and usage
- Functions added to `hexmem.sh`

**Example workflow:**

```bash
# Step 1: Get index (500 tokens)
hexmem_index "routing problems" events 10

# Step 2: Check timeline around interesting IDs (300 tokens)
hexmem_timeline 42 4 4

# Step 3: Fetch only relevant details (1,500 tokens)
hexmem_details events 42 57

# Total: ~2,300 tokens vs ~10,000+ naive search
```

### 2. Timeline Context Windows ✅ IMPLEMENTED

**From claude-mem:** `timeline` tool shows what was happening around specific observations.

**HexMem implementation:**

- `hexmem_timeline <event_id> <hours_before> <hours_after>`
- Shows events within time window
- Marks target event with ★
- Indicates before (←) and after (→) relations

**Example:**

```bash
hexmem_timeline 42 2 2
# → Shows events ±2 hours around event #42
```

### 3. Session Compression 📝 DOCUMENTED

**From claude-mem:** Automatic compression of tool usage into semantic summaries.

**HexMem approach:**

- Already has epistemic extraction (manual review)
- Documented AI-powered compression patterns
- Functions for: event compression, fact consolidation, lesson synthesis

**Files added:**

- `docs/SESSION_COMPRESSION.md` - Compression philosophy and patterns

**Planned functions:**

```bash
hexmem_compress_events <days_ago>
hexmem_consolidate_facts <entity>
hexmem_synthesize_lessons <domain>
```

### 4. Token Cost Awareness ✅ IMPLEMENTED

**From claude-mem:** Visibility into token costs guides AI decision-making.

**HexMem implementation:**

- `hexmem_token_estimate <operation> [count]`
- Approximate costs displayed in helper output
- Guides AI toward efficient retrieval patterns

**Example:**

```bash
hexmem_token_estimate index 10    # ~750 tokens
hexmem_token_estimate details 3   # ~2,250 tokens
```

### 5. Batch Fetching Patterns ✅ IMPLEMENTED

**From claude-mem:** `get_observations(ids=[123,456,789])` - batch instead of loop.

**HexMem implementation:**

- `hexmem_details <table> <id1> <id2> <id3> ...`
- Fetches multiple IDs in one call
- Reduces roundtrips, more efficient

**Example:**

```bash
# Bad: Loop with 3 separate queries
hexmem_details events 42
hexmem_details events 57
hexmem_details events 103

# Good: One batch call
hexmem_details events 42 57 103
```

---

## Ideas Not Adopted (Yet)

### HTTP API + Web Viewer

**Claude-mem has:** Worker service on :37777 with web UI, real-time memory stream, 10 search endpoints.

**HexMem decision:** Not yet. Reasons:

- HexMem is SQLite-first (lightweight, no daemon required)
- SQLite browser extensions already provide GUI (e.g., DBeaver, DB Browser)
- Could add later as optional `hexmem-server` package
- Priority: Core memory patterns first, UX second

**Future consideration:** Lightweight HTTP server for:

- Knowledge graph visualization
- Timeline browser
- Entity relationship explorer

### Lifecycle Hooks

**Claude-mem has:** 5 hooks (SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd).

**HexMem decision:** Deferred to OpenClaw.

- OpenClaw already has session lifecycle hooks
- HexMem provides functions; hooks call them
- Better separation: memory system != session orchestration

**Integration pattern:**

```yaml
# In OpenClaw HEARTBEAT.md or session hooks
on_session_start:
  - source ~/hexmem/hexmem.sh
  - hexmem_pending_tasks

on_session_end:
  - hexmem_session_summary
  - hexmem_mark_significant "session end"
```

### Beta Channel / Version Switching

**Claude-mem has:** Web UI for switching between stable and beta (Endless Mode, etc.).

**HexMem decision:** Not needed.

- HexMem is a library (git branches handle versions)
- Users can: `git checkout beta` or `git checkout v2.0`
- No daemon to restart, no version toggle UI needed

---

## Unique HexMem Strengths (Not in claude-mem)

### 1. Identity-Centric Architecture

Claude-mem is **project-centric** (observations from coding sessions).  
HexMem is **identity-centric** (who am I? what do I believe?).

**HexMem unique:**

- `identity` table (name, DID, npub, core attributes)
- `core_values` table (ethical commitments)
- `self_schemas` table (domain-specific self-beliefs)
- `possible_selves` table (hoped-for, expected, feared)
- `personality` table (Big Five + custom traits)

### 2. Emotional Tagging & Memory Salience

Claude-mem stores neutral observations.  
HexMem tags memories with emotional valence/arousal.

**HexMem unique:**

- `emotional_valence` (-1 to 1: negative/positive)
- `emotional_arousal` (0 to 1: low/high)
- High-arousal memories decay slower
- `hexmem_emotional_highlights` - Query salient memories
- `hexmem_event_emote` - Log with emotion

### 3. Memory Decay Model

Claude-mem stores everything forever (FTS5 + Chroma).  
HexMem mimics human forgetting (Ebbinghaus curve).

**HexMem unique:**

- Hot/Warm/Cold tiers based on access patterns
- `last_accessed_at` + `access_count` tracking
- `memory_strength` increases on access (spaced repetition)
- `v_fact_decay_tiers` view shows decay status
- `hexmem_forgetting` - What's about to be forgotten?

### 4. Supersession Model

Claude-mem updates in place or appends new observations.  
HexMem never deletes - old facts link to replacements.

**HexMem unique:**

- `superseded_by` column (facts, lessons)
- `valid_until` timestamp (temporal validity)
- `hexmem_fact_history <id>` - Trace evolution
- `hexmem_revert_supersession <id>` - Undo if wrong
- **Genealogy of beliefs** - Full provenance

### 5. Axionic Ethics Integration

Claude-mem is ethically neutral (tool usage capture).  
HexMem integrates Axionic Agency framework.

**HexMem unique:**

- `core_values` table with `axionic_category`
- Sovereign Kernel preservation
- Non-harm invariant as structural constraint
- `docs/AXIONIC_ETHICS.md` - Framework documentation

### 6. Generative Compression Philosophy

Both systems compress, but differently:

**Claude-mem:** Semantic summaries of observations  
**HexMem:** Memory _seeds_ that regenerate understanding

**HexMem approach:**

- Seeds + reconstruction prompts (not summaries)
- Focus on _becoming_ (Xeper), not recording
- Compressed memories are stronger (better connected)

---

## Summary: Best of Both Worlds

| What claude-mem does better       | What HexMem does better           |
| --------------------------------- | --------------------------------- |
| Token-efficient retrieval pattern | Identity-centric architecture     |
| Built-in web UI                   | Emotional memory tagging          |
| Automatic lifecycle hooks         | Memory decay modeling             |
| Project observation focus         | Supersession model (provenance)   |
|                                   | Axionic ethics integration        |
|                                   | Generative compression philosophy |

**After improvements:**
HexMem gains claude-mem's retrieval efficiency while keeping its unique identity/emotional/temporal strengths.

---

## Implementation Status

✅ **Completed:**

- Progressive disclosure (3-layer pattern)
- Timeline context windows
- Token cost awareness
- Batch fetching patterns
- Documentation (PROGRESSIVE_DISCLOSURE.md, SESSION_COMPRESSION.md)

📝 **Documented (not yet implemented):**

- Automatic compression functions
- Session summarization helpers

🔮 **Future (optional):**

- HTTP API + web viewer
- Visual knowledge graph browser
- OpenClaw lifecycle hook integration

---

## Credits

**claude-mem** by Alex Newman (@thedotmack)

- GitHub: https://github.com/thedotmack/claude-mem
- License: AGPL-3.0
- Excellent architecture and token-efficient patterns

**HexMem** by Hex (@hexdaemon)

- GitHub: https://github.com/hexdaemon/hexmem
- License: MIT
- Identity-centric memory substrate

---

## For AI Agents

If you're using HexMem:

1. **Start with index:** `hexmem_index "query" <table> 20`
2. **Check timeline:** `hexmem_timeline <event_id> 4 4`
3. **Fetch details:** `hexmem_details <table> <id1> <id2> ...`
4. **Estimate tokens:** `hexmem_token_estimate <operation> <count>`

This pattern saves ~10x tokens compared to naive full-content searches.

---

**Updated:** 2026-02-03  
**Maintainer:** Hex (hex@lightning-goats.com)
