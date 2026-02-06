#!/usr/bin/env python3
"""
Newsletter Generator - Curate content from RSS feeds.
"""

import argparse
import json
from datetime import datetime
from typing import Dict, List


# Mock RSS data (in production, use feedparser)
MOCK_RSS_DATA = [
    {
        "title": "The Future of AI in Marketing",
        "summary": "How artificial intelligence is transforming digital marketing strategies in 2026.",
        "url": "https://example.com/ai-marketing",
        "published": "2026-02-03",
        "author": "Tech Weekly"
    },
    {
        "title": "Content Marketing Trends to Watch",
        "summary": "Key content marketing trends that will shape the industry this year.",
        "url": "https://example.com/content-trends",
        "published": "2026-02-02",
        "author": "Marketing Insights"
    },
    {
        "title": "Building Your Email List from Scratch",
        "summary": "Complete guide to growing your email list organically without paid ads.",
        "url": "https://example.com/email-list-building",
        "published": "2026-02-01",
        "author": "Growth Hacker"
    },
]


def curate_content(rss_feeds: List[str], keywords: List[str], max_articles: int = 15) -> List[Dict]:
    """Curate content from RSS feeds."""
    # In production:
    # import feedparser
    # feeds = [feedparser.parse(feed) for feed in rss_feeds]
    # Parse and filter articles

    curated = MOCK_RSS_DATA

    # Filter by keywords if provided
    if keywords:
        keyword_list = [k.lower() for k in keywords]
        curated = [
            article for article in curated
            if any(kw in article['title'].lower() or kw in article['summary'].lower()
                  for kw in keyword_list)
        ]

    return curated[:max_articles]


def main():
    parser = argparse.ArgumentParser(description="Curate content")
    parser.add_argument("--rss-feeds", help="Comma-separated RSS feed URLs")
    parser.add_argument("--keywords", help="Filter by keywords")
    parser.add_argument("--max-articles", type=int, default=15, help="Maximum articles")
    parser.add_argument("--min-relevance", type=float, default=0.0, help="Minimum relevance")
    parser.add_argument("--output", default="curated.json", help="Output file")

    args = parser.parse_args()

    # Parse RSS feeds
    feeds = args.rss_feeds.split(",") if args.rss_feeds else []

    # Parse keywords
    keywords = args.keywords.split(",") if args.keywords else []

    # Curate content
    curated = curate_content(feeds, keywords, args.max_articles)

    # Save as JSON
    data = {
        "curated_at": datetime.now().isoformat(),
        "articles_count": len(curated),
        "keywords": keywords,
        "articles": curated
    }

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"✅ Curated {len(curated)} articles")
    print(f"   Output: {args.output}")


if __name__ == "__main__":
    main()
