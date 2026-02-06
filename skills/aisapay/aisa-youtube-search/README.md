# OpenClaw YouTube 📺

YouTube SERP Scout for autonomous agents. Search top-ranking videos, channels, and trends.

## Features

- **SERP Search**: Find top-ranking videos for any query
- **Country/Language Filters**: Target specific regions
- **Competitor Research**: Track competitor content
- **Trend Discovery**: Find what's popular now

## Quick Start

```bash
export AISA_API_KEY="your-key"

# Basic search
python scripts/youtube_client.py search --query "AI agents tutorial"

# Search with country filter
python scripts/youtube_client.py search --query "machine learning" --country us

# Find top videos
python scripts/youtube_client.py top-videos --query "GPT-5" --count 10

# Competitor research
python scripts/youtube_client.py competitor --name "OpenAI" --topic "tutorial"
```

## Use Cases

1. **Content Research** - Find what's ranking to plan your content
2. **Competitor Tracking** - Monitor competitor YouTube presence
3. **Trend Discovery** - Identify trending topics
4. **Keyword Research** - Discover popular search terms
5. **Audience Research** - Understand regional preferences

## Documentation

See [SKILL.md](SKILL.md) for complete API documentation.
