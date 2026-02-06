# Serper Google Search Plugin

Native Clawdbot plugin for Google Search via [Serper.dev](https://serper.dev) API. Returns real Google results — organic links, knowledge graph, news, and "People Also Ask" — as a single tool call.

## When to use

- You need **actual Google results** with links and snippets (not AI-synthesized answers)
- You want Google News articles on a topic
- You need knowledge graph data (quick facts, entity info)
- Complements AI search tools (Perplexity, Brave) with raw Google data

## Setup

1. Get a free API key at [serper.dev](https://serper.dev) (2,500 searches/month, no card required)
2. Set the environment variable in your Clawdbot config:

```json
{
  "env": {
    "vars": {
      "SERPER_API_KEY": "your-api-key-here"
    }
  }
}
```

Or configure directly in the plugin entry:

```json
{
  "plugins": {
    "entries": {
      "serper-search": {
        "enabled": true,
        "config": {
          "apiKey": "your-api-key-here",
          "defaultNumResults": 5
        }
      }
    }
  }
}
```

## Usage

The plugin registers a `serper_search` tool with three parameters:

| Parameter    | Type   | Default  | Description                           |
| ------------ | ------ | -------- | ------------------------------------- |
| `query`      | string | required | The search query                      |
| `num`        | number | 5        | Number of results (1-100)             |
| `searchType` | string | "search" | `"search"` for web, `"news"` for news |

### Web search

> Search for "best rust web frameworks 2026"

Returns organic results with title, link, snippet, and position, plus knowledge graph and related questions.

### News search

> Search news for "AI regulation Europe"

Returns news articles with title, link, snippet, date, and source.

## Plugin structure

```
serper-search/
  clawdbot.plugin.json   # Plugin manifest with configSchema
  package.json            # NPM package config
  index.ts                # Plugin implementation
  SKILL.md                # This file
```

## Key implementation details

- **Export**: `export default function register(api)` — not an object
- **Tool registration**: `api.registerTool(toolObject)` — direct, not callback
- **Return format**: `{ content: [{ type: "text", text: JSON.stringify(results) }] }`
- **Dependencies**: Symlink `@sinclair/typebox` from Clawdbot's own node_modules

## Author

Built by [@Samoppakiks](https://github.com/Samoppakiks) with Claude Code.
