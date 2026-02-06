---
tags:
  category: system
  context: domains
---

# Domain Patterns

This document describes common organization patterns for different use cases.
These are suggestions, not requirements — adapt them to your needs.

**See also:** [conversations.md](conversations.md) for process knowledge —
understanding _how work proceeds_, not just _what we know_.

---

## Software Development

**Collections:**
| Collection | Purpose |
|------------|---------|
| `code` | Source files, organized by the codebase |
| `docs` | Documentation, READMEs, architecture decisions |
| `issues` | Bugs, errors, stack traces, problems encountered |
| `decisions` | "Why did we do X?" — architectural reasoning |

**Suggested tags:**

- `language` — python, typescript, rust, etc.
- `layer` — frontend, backend, infra, database, cli
- `module` — auth, api, ui, core, tests
- `status` — working, broken, needs_review, deprecated

**Common conversation patterns:** (see conversations.md)

- Bug report → Diagnosis → Fix → Verify
- Feature request → Clarify → Implement → Review → Accept
- Code review → Revisions → Approve

**Agent guidance:**

- Index every file you read or modify
- When encountering an error, index it with the error message as content
- Before searching the filesystem, check `keep find` — you may already know about it
- Use `keep find --id` to discover related code when working on a feature
- Record breakdowns: "Assumption X was wrong, actually Y"

---

## Market Research

**Collections:**
| Collection | Purpose |
|------------|---------|
| `sources` | Primary research — articles, reports, filings |
| `competitors` | Competitor-specific intelligence |
| `insights` | Synthesized findings and conclusions |
| `data` | Quantitative sources, datasets, statistics |

**Suggested tags:**

- `company` — specific company names
- `market` — b2b_saas, consumer_fintech, healthcare, etc.
- `source_type` — article, report, interview, sec_filing, press_release
- `credibility` — high, medium, low, unverified
- `region` — north_america, europe, apac

**Agent guidance:**

- Always index sources you fetch, even if they seem tangential
- Tag competitor information consistently for later cross-reference
- Create insights entries to capture your synthesized conclusions
- Use semantic search to find connections across different sources

---

## Personal Reflection & Growth

**Collections:**
| Collection | Purpose |
|------------|---------|
| `journal` | Reflections, conversations, daily entries |
| `goals` | Active goals and progress tracking |
| `feedback` | External feedback received |
| `patterns` | Recurring themes you've noticed |

**Suggested tags:**

- `life_area` — career, health, relationships, learning, finance, creativity
- `emotion` — confident, anxious, grateful, frustrated, energized
- `theme` — boundaries, communication, procrastination, perfectionism
- `energy` — high, low, recovering

**Agent guidance:**

- Index conversations about personal topics as journal entries
- Look for patterns when the user reports similar feelings repeatedly
- Connect current challenges to past insights
- Use `keep find --id` to surface "you've felt this way before"

---

## Healthcare Tracking

**Collections:**
| Collection | Purpose |
|------------|---------|
| `symptoms` | Symptom reports and tracking |
| `medications` | Current and historical medications |
| `appointments` | Visit notes, provider interactions |
| `research` | Health information gathered |

**Suggested tags:**

- `body_system` — cardiovascular, digestive, musculoskeletal, neurological
- `symptom` — headache, fatigue, pain, nausea (specific symptoms)
- `severity` — mild, moderate, severe
- `provider` — dr_smith, clinic_name
- `medication` — specific medication names

**Agent guidance:**

- Always index symptom reports with dates for timeline tracking
- Cross-reference symptoms with medication changes
- Index appointment outcomes for continuity
- Be precise with medical terminology in tags for accurate retrieval

---

## Cross-Domain Patterns

These patterns apply regardless of domain:

**Conversation indexing:**

```bash
# Index the current conversation
keep update "User asked about X, we discussed Y, decided Z" \
  --tag session=abc123
```

**Context tracking:**

```bash
# Record current focus for handoff
keep now "Working on feature X" --tag topic=feature_x
```

**Breakdown learning:**

```bash
# When something goes wrong, capture the learning
keep update "Assumed user wanted full rewrite, actually wanted minimal fix. \
Ask about scope before large changes." \
  --tag type=breakdown --tag conversation_type=code_change_request
```

**Temporal queries using system tags:**

```bash
# Find items updated today
keep list --tag _updated_date=2026-01-30

# Find all inline content (from remember)
keep list --tag _source=inline
```

**Progressive refinement:**

```bash
# Start broad, then narrow
keep find "authentication"
keep list --tag module=auth
```

---

## Process Knowledge

Beyond subject-matter knowledge, index _how to work effectively_:

```bash
# Index a learned pattern
keep update "Pattern: Incremental Specification. \
When requirements are vague, don't promise immediately. \
Propose interpretation → get correction → repeat until clear. \
Only then commit to action. Breakdown risk: Promising too early leads to rework." \
  --tag type=conversation_pattern --tag domain=general

# Later, retrieve it
keep list --tag type=conversation_pattern
```

See [conversations.md](conversations.md) for the full framework.
