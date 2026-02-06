# Readwise MCP — Recipes (opinionated workflows)

These are higher-level workflows built from the Readwise MCP tools.
Use them when you want to *do something useful* (triage, digest, quiz, recommend, organize), not when you’re just testing auth.

---

## 1) Triage inbox (or Later fallback)
Goal: grab the newest 10 docs in **inbox** (location=`new`). If inbox is empty, fall back to **later**. Then present a punchy list: *worth reading now* vs *archive/ignore*.

Commands:

```bash
# 1) Try inbox first
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 10,
    "location": "new",
    "response_fields":["title","author","url","category","location","created_at","tags","summary","reading_time"]
  }' --output json

# 2) If results is empty (or count==0), fall back to later
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 10,
    "location": "later",
    "response_fields":["title","author","url","category","location","created_at","tags","summary","reading_time"]
  }' --output json
```

Assistant workflow:
- For each doc: infer topic + expected value.
- Output two buckets:
  - **Read next (why + what to extract)**
  - **Archive/skip (why)**
- Offer actions:
  - Move to `shortlist` or `later`
  - Move to `archive`
  - Add tags (if you have a tagging system)

Optional actions:
```bash
# Move a doc
mcporter call readwise.reader_move_document \
  --args '{"document_id":"<id>","location":"archive"}' \
  --output json

# Add tags
mcporter call readwise.reader_add_tags_to_document \
  --args '{"document_id":"<id>","tag_names":["to-read","topic-ai"]}' \
  --output json
```

---

## 2) Feed digest (last day/week) + “mark as seen” option
Goal: scan what landed recently, summarize the “news”, then let the user either (a) open/read, or (b) mark as **seen** (without archiving).

Notes:
- This is best for RSS/feed items, but can also work for *all* docs updated recently.
- “Mark as seen” uses `reader_edit_document_metadata` with `seen: true`.

Commands:

```bash
# Last 24h (use ISO datetime; pick your timezone and convert if needed)
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 50,
    "updated_after": "2026-02-01T00:00:00Z",
    "response_fields":["title","author","url","category","location","updated_at","created_at","tags","summary"]
  }' --output json

# Alternative: restrict to RSS/feed items only
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 50,
    "updated_after": "2026-02-01T00:00:00Z",
    "category": "rss",
    "response_fields":["title","author","url","category","location","updated_at","created_at","tags","summary"]
  }' --output json
```

Assistant workflow:
- Cluster items into 5–10 themes.
- Write a short digest: “what happened” + “why you might care”.
- Offer per-item actions:
  - **Read** (open URL)
  - **Mark seen** (without moving/archiving)

Mark as seen:
```bash
mcporter call readwise.reader_edit_document_metadata \
  --args '{"document_id":"<id>","seen":true}' \
  --output json
```

---

## 3) Quiz the user on a recently read archived document
Goal: pick a recent doc from `archive`, fetch full content, generate multiple-choice questions, and grade each answer.

Commands:

```bash
# 1) List candidates (most recently added to archive)
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 10,
    "location": "archive",
    "response_fields":["title","author","url","category","created_at","updated_at"]
  }' --output json

# 2) Pull full content for the chosen doc
mcporter call readwise.reader_get_document_details \
  --args '{"document_id":"<id>"}' \
  --output json
```

Assistant workflow:
- Read the markdown content.
- Generate 5–10 multiple-choice questions:
  - 3 comprehension (what did it say)
  - 2–3 application (what would you do with it)
  - 1 “gotcha” (common misread)
- Run an interactive loop:
  - Ask Q1 → user answers (A/B/C/D)
  - Grade immediately + explain
  - Track score

Optional: write a note back to the doc with the user’s score + missed concepts.
```bash
mcporter call readwise.reader_set_document_notes \
  --args '{"document_id":"<id>","notes":"Quiz score: 7/10. Missed: X, Y. Follow-up: Z."}' \
  --output json
```

---

## 4) Recommendations (build a reading profile → pick next best doc)
Goal: infer the user’s interests from highlights + documents, then recommend 1–3 items from their library that they’ll actually want *right now*.

Commands (suggested building blocks):

```bash
# 1) Get a few recent docs across library for candidate recommendations
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 30,
    "response_fields":["title","author","url","category","location","created_at","tags","summary","reading_time"]
  }' --output json

# 2) Pull highlight signals by vector search across a few seed concepts
mcporter call readwise.readwise_search_highlights \
  --args '{"vector_search_term":"incentives", "limit": 20}' \
  --output json
mcporter call readwise.readwise_search_highlights \
  --args '{"vector_search_term":"distribution", "limit": 20}' \
  --output json
mcporter call readwise.readwise_search_highlights \
  --args '{"vector_search_term":"ai", "limit": 20}' \
  --output json
```

Assistant workflow:
- Build a lightweight profile:
  - Top topics (5–10)
  - Preferred formats (article/pdf/epub/video/podcast)
  - “Energy level” (short vs deep)
- Recommend items using constraints:
  - If user has 10 minutes → short article
  - If user wants deep work → epub/pdf
  - If user is in skim mode → shortlist tweets/videos
- Pitch each recommendation with:
  - 1-line hook
  - expected payoff
  - suggested extraction question (what to highlight)

Optional: move the winner to `shortlist`.
```bash
mcporter call readwise.reader_move_document \
  --args '{"document_id":"<id>","location":"shortlist"}' \
  --output json
```

---

## 5) Library organizer (tagging + inbox-zero + taxonomy enforcement)
Goal: help the user organize their Reader library by tagging + moving items to `later` / `shortlist` / `archive` (and optionally marking items as seen).

Recommended minimal taxonomy (keep it small):
- **status**: `to-read`, `skim`, `reference`, `done`
- **topic**: `topic-ai`, `topic-product`, `topic-marketing`, `topic-investing`, `topic-health`, …
- **format** (optional): `format-podcast`, `format-video`, `format-epub`, `format-article`

Commands (building blocks):

```bash
# 1) Pull a working set (start with inbox)
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 50,
    "location": "new",
    "response_fields":["title","author","url","category","location","created_at","tags","summary","reading_time"]
  }' --output json

# 2) If inbox is empty, pull Later
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 50,
    "location": "later",
    "response_fields":["title","author","url","category","location","created_at","tags","summary","reading_time"]
  }' --output json

# 3) Find untagged docs anywhere (tag=[""] means documents with no tags)
mcporter call readwise.reader_list_documents \
  --args '{
    "limit": 50,
    "tag": [""],
    "response_fields":["title","author","url","category","location","created_at","tags","summary"]
  }' --output json
```

Assistant workflow (opinionated but effective):
1) **Classify each doc quickly** (title/author/summary/category)
   - **Read next** → move to `shortlist` + tag `to-read` + add 1–2 topic tags
   - **Worth keeping, not now** → move to `later` + tag `reference` or `skim`
   - **Low signal / already absorbed** → mark `seen:true` (optional) + move to `archive`
2) **Enforce tag hygiene**
   - kebab-case
   - prefer a small controlled vocabulary; avoid inventing 20 near-duplicate tags
3) **Batch proposal before writing**
   - “I propose: shortlist 3, later 12, archive 20; add tags X/Y/Z. Approve?”

Write actions:
```bash
# Add tags
mcporter call readwise.reader_add_tags_to_document \
  --args '{"document_id":"<id>","tag_names":["to-read","topic-ai"]}' \
  --output json

# Move between locations
mcporter call readwise.reader_move_document \
  --args '{"document_id":"<id>","location":"later"}' \
  --output json

# Mark as seen (without moving)
mcporter call readwise.reader_edit_document_metadata \
  --args '{"document_id":"<id>","seen":true}' \
  --output json
```

Optional “inbox zero” loop:
- Run organizer on `location:"new"` until empty.
- When done, surface `shortlist` as the next reading queue.
