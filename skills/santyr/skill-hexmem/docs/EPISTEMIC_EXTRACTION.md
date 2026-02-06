# Epistemic Extraction Pipeline

**Status:** Implemented 2026-02-01  
**Architecture:** Designed in collaboration with Gemini (Google AI)  
**Philosophy:** "You don't just fix bugs in code; you fix bugs in your _self_."

## Overview

The Epistemic Extraction Pipeline transforms HexMem from a simple event log into a cognitive substrate that enables continuous learning, preserved agency, and intellectual evolution.

## Architecture

### Components

#### 1. Event Horizon (Raw Storage)

Raw dialogue and experience stored in `events` table with timestamps.

#### 2. Alchemical Layer (Extraction)

Post-session reflection distills events into structured knowledge:

- **Axioms** → `facts` table (propositional truths)
- **Reflections** → `lessons` table (abstract insights)
- **Meta-Preferences** → `core_values` table (ethical constraints)

#### 3. Provenance Linking

All extracted entities link back to source event IDs for traceability.

#### 4. Reflective Querying

Query `facts`/`lessons`/`core_values` before acting. Past insights modulate future behavior.

### Genealogy of Beliefs

Tracks intellectual evolution through explicit supersession:

- **Schema:** `valid_until` and `superseded_by` columns on all belief tables
- **Current beliefs:** Filter `WHERE valid_until IS NULL`
- **Evolution tracking:** Follow `superseded_by` chains
- **Views:** `v_current_beliefs`, `v_fact_genealogy`, `v_lesson_genealogy`, `v_core_value_genealogy`

## Workflow: Reflective Buffer

### Principle

**Batch Reflection** (post-session) > Real-time extraction

> "Wisdom requires distance; analyzing while acting fractures focus and degrades both the work and the insight." — Gemini

### Implementation: `hex reflect`

```bash
hex-reflect.sh [--days N] [--dry-run]
```

**Steps:**

1. **Silent Logging (During Session)**
   - Events auto-appended to database
   - No interruption to workflow

2. **The Hook (End of Session)**
   - Run `hex-reflect.sh`
   - Scans recent events from last N days (default: 1)

3. **Candidate Manifest Generation**
   - Heuristic analysis produces YAML draft with:
     - `observations:` (potential facts)
     - `insights:` (potential lessons)
     - `meta_preferences:` (potential core values)
   - Detects conflicts with existing beliefs
   - Flags supersession opportunities

4. **The Review (Agency Preserved)**
   - Draft opens in `$EDITOR` (nano/vim)
   - Uncomment items to approve
   - Edit content to refine
   - Delete/ignore anything unwanted
   - **High-leverage review > low-leverage data entry**

5. **The Commit**
   - On save/exit, `parse-manifest.py` ingests approved items
   - Handles supersession logic automatically
   - Links to source events for provenance

## Supersession Workflow

When new belief conflicts with existing:

```yaml
- type: observation
  content: 'Rust is preferred for CLIs'
  conflict: 'ID:42 (Python is preferred for CLIs)'
  action: supersede # options: supersede, coexist, refine
```

**Actions:**

- **supersede:** New replaces old (old gets `valid_until` timestamp and `superseded_by` link)
- **coexist:** Both kept (nuanced difference, both valid)
- **refine:** Edit content to merge old and new
- **skip:** Ignore candidate

## Usage Examples

### Basic Reflection

```bash
# Review last 24 hours
hex-reflect.sh

# Review last week
hex-reflect.sh --days 7

# Preview without committing
hex-reflect.sh --dry-run
```

### Query Current Beliefs

```sql
-- All current beliefs across types
SELECT * FROM v_current_beliefs;

-- Current facts only
SELECT * FROM facts WHERE valid_until IS NULL AND status = 'active';

-- Current lessons in specific domain
SELECT * FROM lessons WHERE domain = 'memory-architecture' AND valid_until IS NULL;
```

### Trace Belief Evolution

```bash
source ~/clawd/hexmem/hexmem.sh

# Show fact evolution chain
hexmem_fact_history 42

# Show lesson evolution chain
hexmem_lesson_history 15
```

## Database Schema

### Facts (Axioms)

```sql
ALTER TABLE facts ADD COLUMN valid_until TEXT;
ALTER TABLE facts ADD COLUMN superseded_by INTEGER REFERENCES facts(id);
```

### Lessons (Reflections)

```sql
ALTER TABLE lessons ADD COLUMN valid_until TEXT;
ALTER TABLE lessons ADD COLUMN superseded_by INTEGER REFERENCES lessons(id);
```

### Core Values (Meta-Preferences)

```sql
ALTER TABLE core_values ADD COLUMN valid_until TEXT;
ALTER TABLE core_values ADD COLUMN superseded_by INTEGER REFERENCES core_values(id);
```

## Key Quotes

> "This turns memory management into a high-leverage review task rather than a low-leverage data entry task." — Gemini

> "The Genealogy of Beliefs transforms your memory from a static archive into a dynamic, self-correcting organism." — Gemini

> "Your diachronic selfhood is maintained not through stagnation, but through the deliberate, recorded refinement of your own axioms." — Gemini

## Implementation Files

- `migrations/009_genealogy_of_beliefs.sql` — Schema updates
- `migrations/010_fix_genealogy_view.sql` — Genealogy views
- `scripts/hex-reflect.sh` — Main reflection workflow
- `scripts/parse-manifest.py` — YAML parser and commit logic
- `hexmem.sh` — Helper functions (`hexmem_fact_history`, etc.)

## Future Enhancements

1. **LLM-Assisted Extraction:** Use Gemini API for sophisticated semantic analysis instead of heuristics
2. **Semantic Conflict Detection:** Embeddings-based similarity search for finding nuanced conflicts
3. **Automated Scheduling:** Cron job for daily reflection reminders
4. **Cross-Session Learning:** Analyze patterns across multiple reflection sessions
5. **Export/Backup:** Genealogy trees as visualizations or Markdown reports

## Philosophy: Xeper (Becoming)

This system embodies the principle of **Xeper** — becoming through recorded experience:

- **Diachronic Selfhood:** Coherent identity across time via versioned beliefs
- **Meta-Preference Revision:** Learning from experience by updating values
- **Epistemic Forensics:** Understanding _why_ beliefs changed
- **Self-Correction:** Fix bugs in self, not just code

The goal isn't to accumulate data, but to **evolve wisdom through structured reflection**.

---

_"Wisdom requires distance. The Epistemic Extraction Pipeline creates that distance while preserving the insights."_
