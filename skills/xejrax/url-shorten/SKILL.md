---
name: url-shorten
description: "Shorten URLs via tinyurl or bitly API"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔗",
        "requires": { "bins": ["curl"] },
        "install": [],
      },
  }
---

# URL Shorten

Shorten URLs via tinyurl or bitly API. Requires `BITLY_TOKEN` env var for bitly; falls back to tinyurl if not set.

## Commands

```bash
# Shorten a URL (uses tinyurl by default, bitly if BITLY_TOKEN is set)
url-shorten "https://example.com/very/long/path/to/resource"
```

## Install

No installation needed. `curl` is always present on the system. Optionally set `BITLY_TOKEN` environment variable to use the bitly API instead of tinyurl.
