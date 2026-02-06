---
name: perplexity-search
description: Search the web using Perplexity's Search API for ranked, real-time web results with advanced filtering. Use when you need to search for current information, market research, trending topics, or when Brave Search is unavailable. Supports recency filtering (day/week/month/year) and returns structured results with titles, URLs, and snippets.
metadata:
  openclaw:
    emoji: 🔍
    requires:
      env:
        - PERPLEXITY_API_KEY
    primaryEnv: PERPLEXITY_API_KEY
---

# Perplexity Search

Search the web using Perplexity's Search API for ranked, real-time results.

## Quick Start

Basic search:

```bash
python3 {baseDir}/scripts/search.py "your search query"
```

With options:

```bash
# Get 10 results
python3 {baseDir}/scripts/search.py "AI trends 2024" --count 10

# Filter by recency
python3 {baseDir}/scripts/search.py "recent AI news" --recency week

# Get raw JSON output
python3 {baseDir}/scripts/search.py "market research" --json
```

## API Key Setup

The script requires a `PERPLEXITY_API_KEY` environment variable.

**Option 1: Set in OpenClaw config** (recommended)

Add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "perplexity-search": {
      "env": {
        "PERPLEXITY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Option 2: Environment variable**

```bash
export PERPLEXITY_API_KEY="your-api-key-here"
```

Get your API key from: https://perplexity.ai/account/api

## Parameters

- `query` - Search query string (required)
- `--count N` - Number of results (1-10, default: 5)
- `--recency FILTER` - Recency filter: `day`, `week`, `month`, or `year`
- `--json` - Output raw JSON instead of formatted results

## Response Format

The API returns:

```json
{
  "results": [
    {
      "title": "Article title",
      "url": "https://example.com/article",
      "snippet": "Brief excerpt from the page...",
      "date": "2024-01-15",
      "last_updated": "2024-02-01"
    }
  ],
  "id": "search-request-id"
}
```

## Use Cases

**Market Research:**

```bash
python3 {baseDir}/scripts/search.py "golf coaching Instagram trends" --count 10
```

**Recent News:**

```bash
python3 {baseDir}/scripts/search.py "AI regulation updates" --recency week
```

**Competitive Analysis:**

```bash
python3 {baseDir}/scripts/search.py "AI golf training apps" --count 10
```

## Pricing

Perplexity Search API: **$5 per 1,000 requests**

Track your usage at: https://perplexity.ai/account/api

## Security

- API key loaded from environment only - never hardcoded
- Output sanitization prevents terminal injection
- Error messages don't expose sensitive information
- 30-second timeout prevents hanging requests
- Input validation on all parameters

## Notes

- Results are ranked by relevance
- Includes real-time web data
- Supports filtering by recency
- Returns structured JSON or formatted text
- Rate limits apply based on your Perplexity plan
