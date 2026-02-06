---
name: parallel-extract
description: 'URL content extraction via Parallel API. Extracts clean markdown from webpages, articles, PDFs, and JS-heavy sites. Use for reading specific URLs with LLM-ready output.'
homepage: https://parallel.ai
---

# Parallel Extract

Extract clean, LLM-ready content from URLs. Handles webpages, articles, PDFs, and JavaScript-heavy sites that need rendering.

## When to Use

Trigger this skill when the user asks for:

- "read this URL", "fetch this page", "extract from..."
- "get the content from [URL]"
- "what does this article say?"
- Reading PDFs, JS-heavy pages, or paywalled content
- Getting clean markdown from messy web pages

**Use Search to discover; use Extract to read.**

## Quick Start

```bash
parallel-cli extract "https://example.com/article" --json
```

## CLI Reference

### Basic Usage

```bash
parallel-cli extract "<url>" [options]
```

### Common Flags

| Flag                                   | Description                             |
| -------------------------------------- | --------------------------------------- |
| `--url "<url>"`                        | URL to extract (repeatable, max 10)     |
| `--objective "<focus>"`                | Focus extraction on specific content    |
| `--json`                               | Output as JSON                          |
| `--excerpts` / `--no-excerpts`         | Include relevant excerpts (default: on) |
| `--full-content` / `--no-full-content` | Include full page content               |
| `--excerpts-max-chars N`               | Max chars per excerpt                   |
| `--excerpts-max-total-chars N`         | Max total excerpt chars                 |
| `--full-max-chars N`                   | Max full content chars                  |
| `-o <file>`                            | Save output to file                     |

### Examples

**Basic extraction:**

```bash
parallel-cli extract "https://example.com/article" --json
```

**Focused extraction:**

```bash
parallel-cli extract "https://example.com/pricing" \
  --objective "pricing tiers and features" \
  --json
```

**Full content for PDFs:**

```bash
parallel-cli extract "https://example.com/whitepaper.pdf" \
  --full-content \
  --json
```

**Multiple URLs:**

```bash
parallel-cli extract \
  --url "https://example.com/page1" \
  --url "https://example.com/page2" \
  --json
```

## Default Workflow

1. **Search** with an objective + keyword queries
2. **Inspect** titles/URLs/dates; choose the best sources
3. **Extract** the specific pages you need (top N URLs)
4. **Answer** using the extracted excerpts/content

## Best-Practice Prompting

### Objective

When extracting, provide context:

- What specific information you're looking for
- Why you need it (helps focus extraction)

**Good:** `--objective "Find the installation steps and system requirements"`

**Poor:** `--objective "Read the page"`

## Response Format

Returns structured JSON with:

- `url` — source URL
- `title` — page title
- `excerpts[]` — relevant text excerpts (if enabled)
- `full_content` — complete page content (if enabled)
- `publish_date` — when available

## Output Handling

When turning extracted content into a user-facing answer:

- Keep content **verbatim** — do not paraphrase unnecessarily
- Extract **ALL** list items exhaustively
- Strip noise: nav menus, footers, ads, "click here" links
- Preserve all facts, names, numbers, dates, quotes
- Include **URL + publish_date** for transparency

## Running Out of Context?

For long conversations, save results and use `sessions_spawn`:

```bash
parallel-cli extract "<url>" --json -o /tmp/extract-<topic>.json
```

Then spawn a sub-agent:

```json
{
  "tool": "sessions_spawn",
  "task": "Read /tmp/extract-<topic>.json and summarize the key content.",
  "label": "extract-summary"
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
- [Extract API Reference](https://docs.parallel.ai/api-reference/extract)
