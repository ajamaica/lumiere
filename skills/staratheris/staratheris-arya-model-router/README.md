# Arya Model Router (Token Saver)

A routing helper for OpenClaw that reduces cost by keeping most work on cheap models and escalating only when needed.

## What it does

- **Routes** each request to one of: `cheap`, `default`, `pro`, `ultra`
- Supports **manual overrides** (`@cheap`, `@default`, `@pro`, `@ultra`)
- Supports **router mode** commands:
  - `router status`
  - `router auto on`
  - `router auto off`
- Adds a **feedback loop**:
  - `router feedback expensive` (or `router feedback caro`)
  - `router feedback weak` (or `router feedback debil`)
  - These adjust thresholds slightly over time.
- Adds **briefing** when context is too big for pro (`brief_first`).
- Adds **response policies** (max words + style hint) per tier.
- Adds **daily report mode** detection to keep reports cheap and structured.

## Why this saves tokens

1. Chat stays on `cheap` or `default`.
2. Heavy tasks use **sub-agents** with only the relevant brief.
3. Auto mode can be turned off to force cheap.

## Files

- `router.py` — classifier + state + overrides
- `rules.json` — models, thresholds, keyword signals, policies
- `state.json` — mode + last decision + feedback counts
- `brief.py` — local context compressor (no model calls)

## Typical agent integration

1. Estimate `context_chars` (roughly from current session or from the text you plan to pass).
2. Run:

```bash
python3 skills/arya-model-router/router.py --text "<user message>" --context-chars 65000
```

3. Interpret JSON:

- If `actions` contains `use_subagent`: call `sessions_spawn` with `model`.
- If `actions` contains `brief_first`: build a compact brief of the current context, and pass **that** to the sub-agent.
- Respect `response_policy` to keep answers short by default.

## Examples

Force cheap:

- `@cheap resume esto`

Turn off auto routing:

- `router auto off`

Provide feedback:

- `router feedback expensive`

## Notes

- This router is safe: it does not execute arbitrary commands or call external services.
- It only emits decisions.
