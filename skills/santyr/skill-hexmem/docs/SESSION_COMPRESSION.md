# Session Compression

Inspired by claude-mem's automatic compression of tool usage into semantic summaries.

## Philosophy

Long sessions generate verbose logs. Instead of storing everything verbatim, compress experiences into **seeds** - distilled essence that can regenerate understanding.

## Types of Compression

### 1. Event Compression

Collapse verbose event details into compact seeds:

```bash
hexmem_compress_events <days_ago>
```

**What it does:**

- Identifies old events with long `details` fields (>500 chars)
- Uses AI to distill into 1-2 sentence seeds
- Preserves emotional tagging
- Marks original as `superseded`

**Example:**

```
Before (1,200 chars):
  "Investigated channel issue with peer XYZ. First checked logs, found timeout errors.
   Then verified connectivity, ran ping tests, checked routing table. Eventually discovered
   issue was related to fee policy mismatch. Adjusted our fees from 500ppm to 250ppm.
   Peer came back online. Monitoring shows stable routing now. Learned that fee
   negotiations require patience..."

After (150 chars):
  "Fee policy mismatch with peer XYZ caused routing issues. Adjusted to 250ppm, resolved.
   Lesson: fee negotiations require patience."
```

### 2. Fact Consolidation

Merge redundant facts about the same subject:

```bash
hexmem_consolidate_facts <entity_name>
```

**What it does:**

- Groups facts by predicate
- If multiple facts say similar things, keep most recent
- Supersede older versions
- Preserve evolution history

**Example:**

```
Before:
  Alice | timezone | "US/Mountain" (2026-01-15)
  Alice | timezone | "America/Denver" (2026-02-03)  [same thing, more precise]

After:
  Alice | timezone | "America/Denver" (active)
  [Previous fact superseded, but preserved in history]
```

### 3. Lesson Synthesis

Combine related lessons in same domain:

```bash
hexmem_synthesize_lessons <domain>
```

**What it does:**

- Finds lessons in same domain that overlap
- Uses AI to merge into higher-order insight
- Tracks source lessons
- Increments `times_validated` for contributing lessons

**Example:**

```
Before:
  lightning | "Channels need time to build reputation" (from fleet 2026-01-20)
  lightning | "Don't close channels prematurely" (from fleet 2026-01-28)
  lightning | "Young channels have low routing volume" (from monitoring 2026-02-01)

After:
  lightning | "Channel longevity is critical for reputation and routing volume.
               Patience in the first 30-60 days pays off." (synthesized 2026-02-03)
  [Original lessons remain, marked as validated]
```

## When to Compress

**Automatic triggers:**

- After long sessions (>50 events)
- Before vault backups
- Weekly maintenance

**Manual compression:**

```bash
# Compress events older than 30 days
hexmem_compress_events 30

# Consolidate facts for frequently-updated entities
hexmem_consolidate_facts "Sat"
hexmem_consolidate_facts "hive-nexus-01"

# Synthesize domain learnings
hexmem_synthesize_lessons "lightning"
hexmem_synthesize_lessons "identity"
```

## Compression Philosophy (Xeper)

This isn't lossy compression - it's **generative compression**:

- Seeds contain essence, not transcript
- AI can expand seeds back into detailed recall when needed
- Focus on _becoming_, not _recording_
- Compressed memories are **stronger** (more accessible, better connected)

**From claude-mem:** "Biomimetic memory architecture - store seeds, not logs"  
**From HexMem:** "Substrate for becoming (Xeper), not just storage"

## Implementation Notes

Compression functions require AI model access (claude, gpt-4, etc.). Set:

```bash
export HEXMEM_COMPRESSION_MODEL="anthropic/claude-sonnet-4-5"
# or use OpenClaw's default model
```

Functions will:

1. Query database for compression candidates
2. Send to AI with compression prompt
3. Create new superseding records
4. Preserve original in history

## Safety

- Original data never deleted (supersession model)
- Can view history: `hexmem_fact_history <fact_id>`
- Can revert: `hexmem_revert_supersession <fact_id>`
- Compression is additive, not destructive

---

**Adapted from:** [claude-mem](https://github.com/thedotmack/claude-mem) automatic compression  
**Credits:** @thedotmack (Alex Newman)
