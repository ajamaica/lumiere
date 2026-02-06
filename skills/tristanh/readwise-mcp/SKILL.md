---
name: readwise-mcp
description: Set up, OAuth-authenticate, and use the Readwise MCP server (mcp2.readwise.io/mcp) via the mcporter CLI. Use when a user asks to connect/auth Readwise MCP, reset or troubleshoot OAuth login (stale redirect ports, invalid state), verify the connection, or run Readwise tools through mcporter.
---

# Readwise MCP (mcporter)

This skill is intentionally kept **short**.
High-level workflows live in: `skills/readwise-mcp/RECIPES.md`.

## Preflight

```bash
command -v mcporter && mcporter --version
```

Ensure you’re in the Clawdbot workspace root where `config/mcporter.json` lives.

## Quick setup (first time)

```bash
# Add the server to the *project* config
mcporter config add readwise https://mcp2.readwise.io/mcp \
  --auth oauth \
  --description "Readwise MCP"

# Start OAuth login (will open a browser)
mcporter auth readwise --reset
```

## Verify it works

```bash
mcporter list readwise --output json
mcporter call readwise.reader_list_tags --args '{}' --output json
```

## Troubleshooting OAuth (common failure modes)

### “Invalid OAuth state”
Cause: you approved in a stale browser tab (old auth attempt / old port).

Fix:
- Close old Readwise OAuth tabs.
- Re-run:

```bash
mcporter auth readwise --reset
```

### Redirecting to an old port even after reset
Cause: browser session reuse.

Fix:
- Use Incognito/Private window.
- Or copy the *new* authorize URL into a fresh profile.

### “Waiting for browser approval…” but you already approved
You must land on:

`http://127.0.0.1:<PORT>/callback?code=...&state=...`

If the redirect hits a different port, mcporter will keep waiting.

To find the expected port:

```bash
cat ~/.mcporter/credentials.json
```

Look for `redirect_uris` and ensure the browser redirect matches exactly.

## Using the server

General pattern:

```bash
mcporter call readwise.<tool_name> --args '{...}' --output json
```

Notes:
- `--args` must be valid JSON (prefer single quotes in shell).
- For Reader locations: `new` = inbox, `later`, `shortlist`, `archive`, `feed` (RSS only).

## Tool index (what’s available)
- `readwise_search_highlights` — search **highlights** (vector + optional field filters)
- `reader_search_documents` — search **Reader documents** (hybrid search)
- `reader_create_document` — save a URL or HTML into Reader
- `reader_list_documents` — list newest documents (and paginate)
- `reader_get_document_details` — fetch a document’s full Markdown content
- `reader_get_document_highlights` — fetch highlights for a document
- `reader_list_tags` — list tag names
- `reader_add_tags_to_document` / `reader_remove_tags_from_document`
- `reader_add_tags_to_highlight` / `reader_remove_tags_from_highlight`
- `reader_set_document_notes` / `reader_set_highlight_notes`
- `reader_move_document` — move between inbox/later/shortlist/archive
- `reader_edit_document_metadata` — edit metadata (including `seen`)
- `reader_export_documents` — export Reader docs as a ZIP

## Quick examples (most-used)

### 1) Search highlights (idea-first / semantic)
```bash
mcporter call readwise.readwise_search_highlights \
  --args '{"vector_search_term":"incentives", "limit": 10}' \
  --output json
```

### 2) Search Reader documents (hybrid)
```bash
mcporter call readwise.reader_search_documents \
  --args '{"query":"MCP", "limit": 10}' \
  --output json
```

### 3) List newest docs in inbox (thin fields)
```bash
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 10,
    "location": "new",
    "response_fields":["title","author","url","category","location","created_at","tags"]
  }' \
  --output json
```

### 4) Get a document’s full content (markdown)
```bash
mcporter call readwise.reader_get_document_details \
  --args '{"document_id":"<id>"}' \
  --output json
```

## Recipes
See: `skills/readwise-mcp/RECIPES.md`

Recipe names:
- Triage inbox (or Later fallback)
- Feed digest (last day/week) + mark as seen
- Quiz the user on a recently read archived document
- Recommendations (build a reading profile → pick next best doc)
- Library organizer (tagging + inbox-zero)

## Shortlist semantics (important)
Readwise supports a `shortlist` *location*, but many people use it differently.

Default assumption (most users): **inbox / later / archive**
- “Shortlisting” means: add a `shortlist` tag AND move the doc to `later`.

Alternative setup: **later / shortlist / archive**
- “Shortlisting” means: move the doc to location=`shortlist`.

So: before applying any shortlisting action, confirm which setup the user uses.
If unknown, assume the default (tag + move to later).

## Safety / defaults
When a workflow proposes **writes** (tagging, moving, setting notes/seen), default to:
- show a **read-only plan** first (counts + which docs)
- ask for approval before applying changes
