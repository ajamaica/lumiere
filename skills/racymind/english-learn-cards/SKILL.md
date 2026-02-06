---
name: english-learn-cards
description: Flashcard-based English vocabulary learning with SQLite + SRS. Works with any chat platform when paired with an OpenClaw agent prompt.
---

# English Learn Cards (SQLite + SRS)

A portable vocabulary flashcard workflow for OpenClaw.

- Stores cards in SQLite
- Supports SRS reviews (0–3 grading, SM-2–like)
- Uses a deterministic helper CLI (`scripts/words.py`) to avoid flaky formatting

## Platform notes

This skill is **platform-agnostic** (Slack/Discord/WhatsApp/Telegram/etc.).
Your channel-specific agent prompt should decide:

- message formatting (bullets/headers)
- quiz flow UX
- how user answers are parsed

A ready-to-copy prompt template lives in:

- `skill/prompt-examples/AGENT_PROMPT_TEMPLATE.md`

## Storage

- SQLite DB path is controlled via env var:
  - `ENGLISH_LEARN_CARDS_DB` (default: `~/clawd/memory/english-learn-cards.db`)

## Helper CLI (required)

Use the helper for all DB operations:

```bash
python skill/scripts/words.py init
python skill/scripts/words.py migrate
python skill/scripts/words.py add "implement" ...
python skill/scripts/words.py render "implement" --fill-audio
python skill/scripts/words.py due
python skill/scripts/words.py grade <card_id> <0-3>
```

## Safety / publishing

Do not commit:

- your SQLite DB
- secrets / tokens
- one-off migration/enrichment scripts

Keep local-only scripts outside the repo (see `.gitignore`).
