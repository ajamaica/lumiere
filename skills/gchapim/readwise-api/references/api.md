# Readwise & Reader API Reference

## Authentication

All endpoints use `Authorization: Token XXX` header. Token from https://readwise.io/access_token.

Verify: `GET https://readwise.io/api/v2/auth/` → 204 OK

## Rate Limits

| Scope                     | Limit       |
| ------------------------- | ----------- |
| General (v2)              | 240 req/min |
| Highlight LIST, Book LIST | 20 req/min  |
| Reader general (v3)       | 20 req/min  |
| Document CREATE/UPDATE    | 50 req/min  |

On 429, retry after `Retry-After` header seconds.

---

## Reader API (v3) — Documents

Base: `https://readwise.io/api/v3`

### POST /save/ — Save Document

```json
{
  "url": "https://example.com/article", // required
  "html": "<p>content</p>", // optional, raw HTML
  "should_clean_html": true, // clean provided HTML
  "title": "Article Title",
  "author": "Author Name",
  "summary": "Brief summary",
  "published_date": "2024-01-15",
  "image_url": "https://...",
  "location": "later", // new|later|archive|feed
  "category": "article", // article|email|rss|highlight|note|pdf|epub|tweet|video
  "saved_using": "clawdbot",
  "tags": ["tag1", "tag2"],
  "notes": "My notes"
}
```

Response: `{id, url, title, author, source, category, location, ...}`

### GET /list/ — List Documents

| Param            | Type     | Notes                                                         |
| ---------------- | -------- | ------------------------------------------------------------- |
| id               | string   | Filter by document ID                                         |
| updatedAfter     | ISO 8601 | Only docs updated after date                                  |
| location         | string   | new, later, shortlist, archive, feed                          |
| category         | string   | article, email, rss, highlight, note, pdf, epub, tweet, video |
| tag              | string   | Up to 5 tag filters                                           |
| limit            | int      | 1–100 (default 100)                                           |
| pageCursor       | string   | For pagination                                                |
| withHtmlContent  | bool     | Include HTML body                                             |
| withRawSourceUrl | bool     | Include original source URL                                   |

Response: `{count, nextPageCursor, results: [{id, url, source_url, title, author, source, category, location, tags, site_name, word_count, created_at, updated_at, published_date, summary, image_url, reading_progress, ...}]}`

Notes in Reader have `parent_id` pointing to their document.

### PATCH /update/{document_id}/ — Update Document

Body fields (all optional): `title, author, summary, published_date, image_url, seen, location, category, tags, notes`

### DELETE /delete/{document_id}/ — Delete Document

Returns 204.

### GET /tags/ — List Tags

Response: `{count, nextPageCursor, results: [{key, name}]}`

---

## Readwise API (v2) — Highlights & Books

Base: `https://readwise.io/api/v2`

### POST /highlights/ — Create Highlights

```json
{
  "highlights": [
    {
      "text": "The highlighted passage", // required
      "title": "Book or Article Title",
      "author": "Author",
      "image_url": "https://...",
      "source_url": "https://...",
      "source_type": "clawdbot",
      "category": "books", // books|articles|tweets|podcasts
      "note": "My note on this highlight",
      "location": 42,
      "location_type": "page",
      "highlighted_at": "2024-01-15T10:30:00Z",
      "highlight_url": "https://..."
    }
  ]
}
```

De-duplicates by title+author+text+source_url.

### GET /export/ — Export Highlights (paginated)

| Param          | Type     | Notes                         |
| -------------- | -------- | ----------------------------- |
| updatedAfter   | ISO 8601 | Filter by update time         |
| ids            | string   | Comma-separated user_book_ids |
| includeDeleted | bool     | Include deleted highlights    |
| pageCursor     | string   | Pagination cursor             |

Response: `{count, nextPageCursor, results: [{user_book_id, title, author, readable_title, source, cover_image_url, unique_url, book_tags, category, readwise_url, source_url, asin, highlights: [{id, text, note, location, location_type, url, color, updated, book_id, tags: [{id, name}]}]}]}`

### GET /highlights/ — List Highlights

| Param                   | Type     | Notes                    |
| ----------------------- | -------- | ------------------------ |
| page_size               | int      | Max 1000                 |
| page                    | int      | Page number              |
| book_id                 | int      | Filter by book           |
| updated\_\_lt/gt        | ISO 8601 | Filter by update time    |
| highlighted_at\_\_lt/gt | ISO 8601 | Filter by highlight time |

### GET /highlights/{id}/ — Highlight Detail

### PATCH /highlights/{id}/ — Update Highlight

Body: `{text?, note?, location?, url?, color?}` — color: yellow, blue, pink, orange, green, purple

### DELETE /highlights/{id}/ — Delete Highlight

### Highlight Tags

- `GET /highlights/{id}/tags/` — list tags
- `POST /highlights/{id}/tags/` — add tag `{name: "tag"}`
- `DELETE /highlights/{id}/tags/{tag_id}` — remove tag

### GET /books/ — List Books

| Param                      | Type     | Notes                                            |
| -------------------------- | -------- | ------------------------------------------------ |
| page_size                  | int      | Results per page                                 |
| page                       | int      | Page number                                      |
| category                   | string   | books, articles, tweets, supplementals, podcasts |
| source                     | string   | Filter by source                                 |
| updated\_\_lt/gt           | ISO 8601 | Filter by update time                            |
| last_highlight_at\_\_lt/gt | ISO 8601 | Filter by last highlight                         |

Response: `{count, next, previous, results: [{id, title, author, category, source, num_highlights, last_highlight_at, updated, cover_image_url, highlights_url, source_url, asin, tags, document_note}]}`

### GET /books/{id}/ — Book Detail

### Book Tags — same pattern as highlight tags at `/books/{id}/tags/`

### GET /review/ — Daily Review

Response: `{review_id, review_url, review_completed, highlights: [{id, text, note, title, author, url, source_url, source_type, category, location, location_type, highlighted_at, highlight_url, image_url, color, book_id, tags}]}`
