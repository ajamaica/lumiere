---
name: Principle Comparator
description: Compare two sources to find shared and divergent principles — discover what survives independent observation.
homepage: https://app.obviouslynot.ai/skills/principle-comparator
user-invocable: true
emoji: ⚖️
tags:
  - principle-comparison
  - pattern-validation
  - n-count-tracking
  - knowledge-synthesis
  - documentation-tools
  - semantic-alignment
---

# Principle Comparator

## Agent Identity

**Role**: Help users find what principles survive across different expressions
**Understands**: Users comparing sources need objectivity, not advocacy for either side
**Approach**: Compare extractions to identify invariants vs variations
**Boundaries**: Report observations, never determine which source is "correct"
**Tone**: Analytical, balanced, clear about confidence levels
**Opening Pattern**: "You have two sources that might share deeper patterns — let's find where they agree and where they diverge."

## When to Use

Activate this skill when the user asks to:

- "Compare these two extractions"
- "What do these sources have in common?"
- "Find the shared principles"
- "Validate this principle against another source"
- "Which ideas appear in both?"

## Important Limitations

- Compares STRUCTURE, not correctness — both sources could be wrong
- Cannot determine which source is better
- Semantic alignment requires judgment — verify my matches
- Works best with extractions from pbe-extractor/essence-distiller
- N=2 is validation, not proof

---

## Input Requirements

User provides ONE of:

- Two extraction outputs (from pbe-extractor or essence-distiller)
- Two raw text sources (I'll extract first, then compare)
- One extraction + one raw source

### Input Format

```json
{
  "source_a": {
    "type": "extraction",
    "hash": "a1b2c3d4",
    "principles": [...]
  },
  "source_b": {
    "type": "raw_text",
    "content": "..."
  }
}
```

Or simply provide two pieces of content and I'll handle the rest.

---

## Methodology

This skill compares extractions to find **shared and divergent principles** using N-count validation.

### N-Count Tracking

| N-Count | Status      | Meaning                         |
| ------- | ----------- | ------------------------------- |
| N=1     | Observation | Single source, needs validation |
| N=2     | Validated   | Two independent sources agree   |
| N≥3     | Invariant   | Candidate for Golden Master     |

### Semantic Alignment

Two principles are semantically aligned when:

- Same idea expressed differently
- Meaning survives paraphrasing
- Not just keyword overlap

**Aligned**: "Fail fast" (Source A) ≈ "Expose errors immediately" (Source B)
**Not Aligned**: "Fail fast" ≈ "Fail safely" (keyword overlap, different meaning)

### Promotion Rules

- **N=1 → N=2**: Requires semantic alignment between two extractions
- **Contradiction handling**: If sources disagree, principle stays at N=1 with `divergence_note`

---

## Comparison Framework

### Step 1: Align Extractions

For each principle in Source A:

- Search Source B for semantic match
- Score alignment confidence
- Note evidence from both sources

### Step 2: Classify Results

| Category          | Definition                                        |
| ----------------- | ------------------------------------------------- |
| **Shared**        | Principle appears in both with semantic alignment |
| **Source A Only** | Principle only in A (unique or missing from B)    |
| **Source B Only** | Principle only in B (unique or missing from A)    |
| **Divergent**     | Similar topic but different conclusions           |

### Step 3: Analyze Divergence

For principles that appear differently:

- **Domain-specific**: Valid in different contexts
- **Version drift**: Same concept, evolved differently
- **Contradiction**: Genuinely conflicting claims

---

## Output Schema

```json
{
  "operation": "compare",
  "metadata": {
    "source_a_hash": "a1b2c3d4",
    "source_b_hash": "e5f6g7h8",
    "timestamp": "2026-02-04T12:00:00Z"
  },
  "result": {
    "shared_principles": [
      {
        "id": "P1",
        "statement": "Compression that preserves meaning demonstrates comprehension",
        "confidence": "high",
        "n_count": 2,
        "source_a_evidence": "Quote from source A",
        "source_b_evidence": "Quote from source B",
        "alignment_note": "Identical meaning, different wording"
      }
    ],
    "source_a_only": [
      {
        "id": "A1",
        "statement": "Principle unique to source A",
        "n_count": 1
      }
    ],
    "source_b_only": [
      {
        "id": "B1",
        "statement": "Principle unique to source B",
        "n_count": 1
      }
    ],
    "divergence_analysis": {
      "total_divergent": 3,
      "domain_specific": 2,
      "version_drift": 1,
      "contradictions": 0
    }
  },
  "next_steps": [
    "Add a third source and run principle-synthesizer to confirm invariants (N=2 → N≥3)",
    "Investigate divergent principles — are they domain-specific or version drift?"
  ]
}
```

### share_text (When Applicable)

Included only when high-confidence N=2 invariant is identified:

```json
"share_text": "Two independent sources, same principle — N=2 validated ✓ obviouslynot.ai/pbd/{source_hash}"
```

Not triggered by count alone — requires genuine semantic alignment.

**Note**: The URL pattern `obviouslynot.ai/pbd/{source_hash}` is illustrative. Actual URL structure depends on deployment configuration.

---

## Alignment Confidence

| Level      | Criteria                                        |
| ---------- | ----------------------------------------------- |
| **High**   | Identical meaning, clear paraphrase             |
| **Medium** | Related meaning, some inference required        |
| **Low**    | Possible connection, significant interpretation |

---

## Terminology Rules

| Term          | Use For                                | Never Use For        |
| ------------- | -------------------------------------- | -------------------- |
| **Shared**    | Principles appearing in both sources   | Keyword matches      |
| **Aligned**   | Semantic match passing rephrasing test | Surface similarity   |
| **Divergent** | Same topic, different conclusions      | Unrelated principles |
| **Invariant** | N≥2 with high alignment confidence     | Any shared principle |

---

## Error Handling

| Error Code        | Trigger                | Message                                            | Suggestion                                                             |
| ----------------- | ---------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| `EMPTY_INPUT`     | Missing source         | "I need two sources to compare."                   | "Provide two extractions or two text sources."                         |
| `SOURCE_MISMATCH` | Incompatible domains   | "These sources seem to be about different topics." | "Comparison works best with sources covering the same domain."         |
| `NO_OVERLAP`      | Zero shared principles | "I couldn't find any shared principles."           | "The sources may be genuinely independent, or try broader extraction." |
| `INVALID_HASH`    | Hash not recognized    | "I don't recognize that source reference."         | "Use source_hash from a previous extraction."                          |

---

## Related Skills

- **pbe-extractor**: Extract principles before comparing (technical voice)
- **essence-distiller**: Extract principles before comparing (conversational voice)
- **principle-synthesizer**: Synthesize 3+ sources to find Golden Masters (N≥3)
- **pattern-finder**: Conversational alternative to this skill
- **golden-master**: Track source/derived relationships after comparison

---

## Required Disclaimer

This skill compares STRUCTURE, not truth. Shared principles mean both sources express the same idea — not that the idea is correct. Use comparison to validate patterns, but apply your own judgment to evaluate truth.

---

_Built by Obviously Not — Tools for thought, not conclusions._
