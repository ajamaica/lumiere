---
name: searxng-search
description: Web search using SearXNG instance via MCP. Provides web search capability for agents with configurable SearXNG endpoint.
author: zfanmy-梦月儿
version: 1.0.1
homepage: 
license: MIT
keywords:
  - search
  - searxng
  - web
  - mcp
  - internet
requires:
  bins:
    - python3
    - curl
    - jq
---

# SearXNG Search

Web search using SearXNG instance via MCP protocol.

## Features

- 🔍 Web search with multiple result formats
- 🔧 MCP server for standard tool integration
- ⚙️ Configurable SearXNG endpoint
- 📊 JSON, Markdown, and text output formats

## Configuration

Set your SearXNG URL:

```bash
export SEARXNG_URL="http://your-searxng-instance:port"
```

Or configure in mcporter:

```json
{
  "mcpServers": {
    "searxng": {
      "command": "python3",
      "args": ["./mcp-server.py"],
      "env": {
        "SEARXNG_URL": "http://your-searxng-instance:port"
      }
    }
  }
}
```

## Installation

### 1. Configure MCP Server

Copy `config.json` to your mcporter config:

```bash
cp config.json ~/.config/mcporter/config.json
```

### 2. Install mcporter

```bash
npm install -g mcporter
```

## Usage

### Via mcporter

```bash
# List servers
mcporter list

# Search web
mcporter call searxng.web_search query="OpenClaw features" limit=5
```

### Via Script

```bash
# Configure first
export SEARXNG_URL="http://your-searxng-instance:port"

# Basic search
./searxng_search.sh "your search query"

# With options
./searxng_search.sh "query" --limit 5 --format markdown
```

### Direct API

```bash
curl "${SEARXNG_URL}/search?q=OpenClaw&format=json"
```

## Output Formats

- `text` (default): Human-readable format
- `json`: Raw JSON output
- `markdown`: Markdown formatted results

## Files

- `mcp-server.py` - MCP server implementation
- `searxng_search.sh` - Bash search script
- `config.json` - MCP configuration template

## Requirements

- Python 3.8+
- mcporter CLI
- curl, jq (for bash script)

## Author

zfanmy-梦月儿
