---
name: newsapi-search
version: 1.0.0
description: Search news articles via NewsAPI with filtering by time windows, sources, domains, and languages.
---

# NewsAPI Search

Search 5,000+ news sources via [NewsAPI](https://newsapi.org). Supports comprehensive article discovery (/everything) and breaking headlines (/top-headlines).

## Quick Start

```bash
# Basic search
node scripts/search.js "technology" --days 7

# Filter by quality sources
node scripts/search.js "technology" --sources bbc-news,reuters,al-jazeera-english

# Exclude low-quality domains
node scripts/search.js "technology" --exclude tmz.com,radaronline.com

# Breaking headlines
node scripts/search.js "technology" --headlines --country us

# List available sources
node scripts/sources.js --country us --category general
```

## Setup

Add API key to `~/.openclaw/.env`:

```
NEWSAPI_KEY=your_api_key
```

Get key from https://newsapi.org (free tier: 100 requests/day)

## Endpoints

### Everything Search

Comprehensive search across millions of articles.

**Time Windows:**

```bash
node scripts/search.js "query" --hours 24
node scripts/search.js "query" --days 7        # default
node scripts/search.js "query" --weeks 2
node scripts/search.js "query" --months 1
node scripts/search.js "query" --from 2026-01-01 --to 2026-01-31
```

**Filters:**

```bash
node scripts/search.js "query" --sources bbc-news,cnn           # max 20
node scripts/search.js "query" --domains nytimes.com,bbc.co.uk
node scripts/search.js "query" --exclude gossip-site.com
node scripts/search.js "query" --lang en                       # or 'any'
```

**Search Fields:**

```bash
node scripts/search.js "query" --title-only                    # title only
node scripts/search.js "query" --in title,description          # specific fields
```

**Advanced Query Syntax:**

- `"exact phrase"` — exact match
- `+musthave` — required word
- `-exclude` — excluded word
- `word1 AND word2` — both required
- `word1 OR word2` — either accepted
- `(word1 OR word2) AND word3` — grouping

**Pagination & Sorting:**

```bash
node scripts/search.js "query" --page 2 --limit 20
node scripts/search.js "query" --sort relevancy      # default
node scripts/search.js "query" --sort date           # newest first
node scripts/search.js "query" --sort popularity
```

### Top Headlines

Live breaking news by country or category.

```bash
# By country
node scripts/search.js "query" --headlines --country us

# By category
node scripts/search.js --headlines --country us --category business

# By source
node scripts/search.js --headlines --sources bbc-news,cnn
```

Categories: `business`, `entertainment`, `general`, `health`, `science`, `sports`, `technology`

**Note:** Cannot mix `--country`/`--category` with `--sources` in headlines mode.

### List Sources

```bash
node scripts/sources.js                    # all sources
node scripts/sources.js --country us       # filter by country
node scripts/sources.js --category business
node scripts/sources.js --lang en
node scripts/sources.js --json             # JSON output
```

## Advanced Usage

For complete parameter reference, see [references/api-reference.md](references/api-reference.md).

For common workflows and search patterns, see [references/examples.md](references/examples.md).

## Programmatic API

```javascript
const { searchEverything, searchHeadlines, getSources } = require('./scripts/search.js')

const results = await searchEverything('climate change', {
  timeWindow: { type: 'days', value: 7 },
  sources: 'bbc-news,reuters',
  excludeDomains: 'tmz.com',
  limit: 20,
})

const headlines = await searchHeadlines('business', {
  country: 'us',
  category: 'business',
})
```

## Free Tier Limits

- 100 requests/day
- 100 results per request (max)
- 1-month delay on archived content

## Output Format

Returns structured JSON:

```json
{
  "query": "technology",
  "endpoint": "everything",
  "totalResults": 64,
  "returnedResults": 10,
  "page": 1,
  "results": [
    {
      "title": "...",
      "url": "...",
      "source": "BBC News",
      "publishedAt": "2026-02-05T14:30:00Z",
      "description": "...",
      "content": "..."
    }
  ]
}
```
