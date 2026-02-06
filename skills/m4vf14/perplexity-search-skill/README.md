# Perplexity Search - OpenClaw Skill

Search the web using Perplexity's Search API. Returns ranked, real-time web results with titles, URLs, and snippets.

## Features

- 🔍 Real-time web search
- 📊 Ranked results by relevance
- ⏰ Recency filtering (day/week/month/year)
- 🛡️ Secure API key handling
- 🚀 Simple Python script, no dependencies

## Installation

### Via ClawHub (Recommended)

```bash
clawhub install perplexity-search
```

### Manual Installation

1. Clone or download this skill to your OpenClaw skills directory:

   ```bash
   cd ~/.openclaw/skills/
   git clone https://github.com/YourUsername/perplexity-search-openclaw.git perplexity-search
   ```

2. Add your API key to OpenClaw config (`~/.openclaw/openclaw.json`):

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

3. Restart OpenClaw gateway

## Usage

Your OpenClaw agent will automatically use this skill when searching the web. You can also call it directly:

```bash
python3 ~/.openclaw/skills/perplexity-search/scripts/search.py "your query"
```

### Options

- `--count N` - Number of results (1-10, default: 5)
- `--recency FILTER` - Filter by `day`, `week`, `month`, or `year`
- `--json` - Output raw JSON

### Examples

```bash
# Basic search
python3 scripts/search.py "best AI coding agents 2024"

# Get 10 results
python3 scripts/search.py "market research tools" --count 10

# Recent news only
python3 scripts/search.py "AI regulation" --recency week
```

## API Key

Get your Perplexity API key at: https://perplexity.ai/account/api

**Pricing:** $5 per 1,000 requests

## Security

- ✅ API key stored in config, never in code
- ✅ Output sanitization prevents injection attacks
- ✅ Error messages don't expose sensitive info
- ✅ 30-second timeout on requests
- ✅ Input validation on all parameters

## Requirements

- Python 3.7+
- OpenClaw
- Perplexity API key

No additional Python packages required - uses only stdlib.

## License

MIT License - See LICENSE file

## Support

- [ClawHub](https://clawhub.com)
- [OpenClaw Docs](https://docs.openclaw.ai)
- [Perplexity API Docs](https://docs.perplexity.ai)
