---
name: searxng
description: Privacy-first web search via local SearXNG instance. Google-free meta-search using DuckDuckGo, Brave, Qwant, Startpage, and more. Use for any web search query.
homepage: http://localhost:8888
metadata: { 'clawdbot': { 'emoji': '🔍', 'requires': { 'bins': ['curl', 'jq'] } } }
---

# SearXNG - Private Web Search

Local SearXNG instance at `http://localhost:8888` with Google/Bing disabled.

## Search (JSON API)

Basic search:

```bash
curl -s "http://localhost:8888/search?q=YOUR_QUERY&format=json" | jq -r '.results[:5] | .[] | "[\(.title)](\(.url))\n\(.content)\n"'
```

With result limit:

```bash
curl -s "http://localhost:8888/search?q=YOUR_QUERY&format=json" | jq -r '.results[:10] | .[] | {title, url, content}'
```

Get just URLs:

```bash
curl -s "http://localhost:8888/search?q=YOUR_QUERY&format=json" | jq -r '.results[:5] | .[].url'
```

## Categories

Search specific categories:

```bash
# Images
curl -s "http://localhost:8888/search?q=YOUR_QUERY&categories=images&format=json" | jq '.results[:5]'

# Videos
curl -s "http://localhost:8888/search?q=YOUR_QUERY&categories=videos&format=json" | jq '.results[:5]'

# News
curl -s "http://localhost:8888/search?q=YOUR_QUERY&categories=news&format=json" | jq '.results[:5]'

# IT/Tech
curl -s "http://localhost:8888/search?q=YOUR_QUERY&categories=it&format=json" | jq '.results[:5]'

# Science
curl -s "http://localhost:8888/search?q=YOUR_QUERY&categories=science&format=json" | jq '.results[:5]'
```

## Time Filters

Recent results:

```bash
# Last day
curl -s "http://localhost:8888/search?q=YOUR_QUERY&time_range=day&format=json" | jq '.results[:5]'

# Last week
curl -s "http://localhost:8888/search?q=YOUR_QUERY&time_range=week&format=json" | jq '.results[:5]'

# Last month
curl -s "http://localhost:8888/search?q=YOUR_QUERY&time_range=month&format=json" | jq '.results[:5]'

# Last year
curl -s "http://localhost:8888/search?q=YOUR_QUERY&time_range=year&format=json" | jq '.results[:5]'
```

## Language/Region

```bash
# English results
curl -s "http://localhost:8888/search?q=YOUR_QUERY&language=en&format=json" | jq '.results[:5]'

# Specific region (US)
curl -s "http://localhost:8888/search?q=YOUR_QUERY&language=en-US&format=json" | jq '.results[:5]'
```

## Enabled Search Engines

Privacy-respecting only (no Google, Bing):

- DuckDuckGo (weight 1.5)
- Brave Search (weight 1.5)
- Startpage (weight 1.2)
- Mojeek (weight 1.0)
- Qwant (weight 1.0)
- Wikipedia (weight 1.5)
- GitHub
- StackOverflow
- Reddit
- arXiv
- Piped/Invidious (YouTube privacy frontends)

## Tips

- URL-encode spaces: `q=hello%20world` or `q=hello+world`
- Combine filters: `categories=news&time_range=week`
- For complex queries, use the web UI: http://localhost:8888

## Example Usage

Find recent AI news:

```bash
curl -s "http://localhost:8888/search?q=artificial+intelligence+news&categories=news&time_range=week&format=json" | jq -r '.results[:5] | .[] | "## \(.title)\n\(.url)\n\(.content)\n"'
```

Search GitHub repos:

```bash
curl -s "http://localhost:8888/search?q=python+web+scraper&categories=repos&format=json" | jq '.results[:5]'
```
