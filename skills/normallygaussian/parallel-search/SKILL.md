---
name: parallel-search
description: 'AI-powered web search via Parallel API. Returns ranked results with LLM-optimized excerpts. Use for up-to-date research, fact-checking, and domain-scoped searching.'
homepage: https://parallel.ai
---

# Parallel Search

High-accuracy web search built for AI agents. Returns ranked results with intelligent excerpts optimized for LLM consumption.

## When to Use

Trigger this skill when the user asks for:

- "search the web", "web search", "look up", "find online"
- "current news about...", "latest updates on..."
- "research [topic]", "what's happening with..."
- Fact-checking with citations needed
- Domain-specific searches (e.g., "search GitHub for...", "find on Reddit...")

## Quick Start

```bash
parallel-cli search "your query" --json --max-results 5
```

## CLI Reference

### Basic Usage

```bash
parallel-cli search "<objective>" [options]
```

### Common Flags

| Flag                           | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `-q, --query "<keyword>"`      | Add keyword filter (repeatable, 3-8 recommended) |
| `--max-results N`              | Number of results (1-20, default: 10)            |
| `--json`                       | Output as JSON                                   |
| `--after-date YYYY-MM-DD`      | Filter for recent content                        |
| `--include-domains domain.com` | Limit to specific domains (repeatable, max 10)   |
| `--exclude-domains domain.com` | Exclude domains (repeatable, max 10)             |
| `--excerpt-max-chars-total N`  | Limit total excerpt size (default: 8000)         |

### Examples

**Basic search:**

```bash
parallel-cli search "When was the United Nations founded?" --json --max-results 5
```

**With keyword filters:**

```bash
parallel-cli search "Latest developments in quantum computing" \
  -q "quantum" -q "computing" -q "2026" \
  --json --max-results 10
```

**Domain-scoped search:**

```bash
parallel-cli search "React hooks best practices" \
  --include-domains react.dev --include-domains github.com \
  --json --max-results 5
```

**Recent news only:**

```bash
parallel-cli search "AI regulation news" \
  --after-date 2026-01-01 \
  --json --max-results 10
```

## Best-Practice Prompting

### Objective

Write 1-3 sentences describing:

- The real task context (why you need the info)
- Freshness constraints ("prefer 2026+", "latest docs")
- Preferred sources ("official docs", "news sites")

### Keyword Queries

Add 3-8 keyword queries including:

- Specific terms, version numbers, error strings
- Common synonyms
- Date terms if relevant ("2026", "Jan 2026")

## Response Format

Returns structured JSON with:

- `search_id` — unique identifier
- `results[]` — array of results:
  - `url` — source URL
  - `title` — page title
  - `excerpts[]` — relevant text excerpts
  - `publish_date` — when available

## Output Handling

When turning results into a user-facing answer:

- Prefer **official/primary sources** when possible
- Quote or paraphrase **only** the relevant extracted text
- Include **URL + publish_date** for transparency
- If results disagree, present both and note the discrepancy

## Running Out of Context?

For long conversations, save results and use `sessions_spawn`:

```bash
parallel-cli search "<query>" --json -o /tmp/search-<topic>.json
```

Then spawn a sub-agent:

```json
{
  "tool": "sessions_spawn",
  "task": "Read /tmp/search-<topic>.json and synthesize a summary with sources.",
  "label": "search-summary"
}
```

## Error Handling

| Exit Code | Meaning                           |
| --------- | --------------------------------- |
| 0         | Success                           |
| 1         | Unexpected error (network, parse) |
| 2         | Invalid arguments                 |
| 3         | API error (non-2xx)               |

## Prerequisites

1. Get an API key at [parallel.ai](https://parallel.ai)
2. Install the CLI:

```bash
curl -fsSL https://parallel.ai/install.sh | bash
export PARALLEL_API_KEY=your-key
```

## References

- [API Docs](https://docs.parallel.ai)
- [Search API Reference](https://docs.parallel.ai/api-reference/search)
