---
name: basecred
description: Fetch onchain reputation profiles via BaseCred SDK (Ethos, Talent Protocol, Farcaster/Neynar). Use when the user wants to check wallet reputation, builder score, creator score, Ethos credibility, or Farcaster account quality for any 0x address. Supports multi-source unified profiles with level derivation and recency tracking.
---

# BaseCred — Onchain Reputation Queries

## Prerequisites

1. **Package installed** in workspace: `npm i basecred-sdk`
2. **API keys** in workspace `.env`:
   ```
   TALENT_PROTOCOL_API_KEY=<key>
   NEYNAR_API_KEY=<key>          # optional — enables Farcaster scoring
   ```
   Ethos Network requires no key.

## Quick workflow

1. Run the query script from the workspace:

   ```bash
   node /path/to/skills/basecred/scripts/query.mjs <0x-address>
   ```

   The script auto-locates `node_modules/basecred-sdk` and `.env` by walking up from cwd. Run it with cwd set to the workspace.

2. Parse the JSON output and present results to the user. Use the level tables in `references/output-schema.md` to translate raw scores into human-readable levels.

## Presenting results

Summarize the three facets clearly:

- **Ethos** — score + credibility level + review sentiment + vouches. Flag `hasNegativeReviews` if true.
- **Talent Protocol** — builder score/level + creator score/level. Note verified status.
- **Farcaster** — quality score (0–1) and whether it passes threshold.
- **Recency** — `recent` / `stale` / `dormant`. Mention if stale or dormant as a caveat.

Highlight actionable signals: e.g. zero vouches on Ethos is an easy win, or a dormant Talent score that needs activity.

## Reference

- **Output schema + all level tables:** `references/output-schema.md` — read when you need to map scores → levels or explain the shape of a response.
