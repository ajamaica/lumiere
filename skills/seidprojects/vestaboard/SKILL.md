---
name: vestaboard
description: Read and write messages on a Vestaboard using the Vestaboard Cloud API (cloud.vestaboard.com) and optional legacy RW endpoint. Use when asked to display text on a Vestaboard, update a sign/board, show a short status message, render simple pixel-art using color/filled character codes, or retrieve the current board message.
---

# Vestaboard

## Security

- Require a token via environment variables (never inline keys in prompts, logs, or commits).
  - Preferred: `VESTABOARD_TOKEN`
  - Optional legacy fallback: `VESTABOARD_RW_KEY`

## Constraints

- Flagship Vestaboard layout is **6 rows x 22 cols**.
- Text input is formatted to 6x22 by default (uppercase + word wrap; truncates overflow).

## Quick usage (local CLI)

```bash
# from repo root
npm install

# Preview formatting only
node scripts/vb.js preview "Hello from Quarterbridge Farm"

# Read current message (JSON)
node scripts/vb.js read

# Write text
node scripts/vb.js write "EGGS READY"

# Write a numeric layout (6x22 array of character codes)
node scripts/vb.js write-layout content/layouts/forest-depth.json
```

## Sample content

- Numeric layouts live in `content/layouts/*.json`
- Human review previews live in `content/previews/*.md`
