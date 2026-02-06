# HexMem Reflector (Metabolic Loop)

**Purpose:** Distill high‑fidelity working memory into curated core memory. This is an _agentic_ step, not an auto‑summarizer.

## Tiered Storage Model

**Working (Short‑term):** `memory/YYYY-MM-DD.md`

- Raw, high‑fidelity logs
- Every thought, tool output, decision
- No compression

**Core (Long‑term):** `MEMORY.md` + HexMem DB

- Curated facts, decisions, lessons
- Only what should persist
- Structured (facts/lessons/events)

## Metabolic Loop (Daily)

**When:** Once per day (sleep cycle). Not on every message.

**Process:**

1. Read last 24h working logs
2. Extract key entities/events/decisions/lessons
3. Update core memory (HexMem + MEMORY.md)
4. Archive raw logs (keep as historical record)

**Why:**

- Avoids vector noise
- Preserves signal
- Keeps core memory lean

## Triggered Hooks (Significant State Changes)

Log to core immediately when:

- Config changes
- Deploys / releases
- Fee policy changes
- Security incidents

Use:

```bash
hexmem_event "type" "category" "summary" "details"
hexmem_lesson "domain" "lesson" "context"
hexmem_mark_significant "reason"
```

## Optional Cron Reminder (Template)

**Reminder only (no auto‑summarizer):**

```bash
cron add \
  --name "hexmem-reflector" \
  --schedule '{"kind":"cron","expr":"0 3 * * *","tz":"America/Denver"}' \
  --sessionTarget main \
  --payload '{"kind":"systemEvent","text":"Reflector: review last 24h logs, distill to HexMem + MEMORY.md."}'
```

---

**Principle:** Distillation > storage. Agent decides what matters.
