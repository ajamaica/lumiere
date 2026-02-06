#!/usr/bin/env python3
"""
Newsletter Generator - Generate automated email newsletters.
"""

import argparse
import json
from datetime import datetime, timedelta
from typing import Dict, List


# Mock curated content
CURATED_ARTICLES = [
    {
        "title": "10 Growth Marketing Strategies for 2026",
        "summary": "Discover the latest growth marketing techniques that top companies are using to scale their businesses.",
        "url": "https://example.com/growth-strategies",
        "affiliate_product": "Marketing Course",
        "affiliate_link": "https://amazon.com/course"
    },
    {
        "title": "SEO Best Practices That Actually Work",
        "summary": "SEO expert reveals the strategies that are driving results in 2026.",
        "url": "https://example.com/seo-tips",
        "affiliate_product": "SEO Tool",
        "affiliate_link": "https://amazon.com/seo-tool"
    },
    {
        "title": "How to Build a 6-Figure Affiliate Business",
        "summary": "Step-by-step guide to building a profitable affiliate marketing business from scratch.",
        "url": "https://example.com/affiliate-guide",
        "affiliate_product": "Affiliate Marketing Course",
        "affiliate_link": "https://amazon.com/affiliate-course"
    },
]


def generate_daily_digest(articles: List[Dict], topic: str, tone: str = "conversational", affiliate_count: int = 3) -> str:
    """Generate daily newsletter digest."""
    date_str = datetime.now().strftime("%B %d, %Y")

    # Select articles
    selected_articles = articles[:min(len(articles), 10)]
    affiliate_articles = selected_articles[:affiliate_count]

    # Generate newsletter
    if tone == "conversational":
        greeting = "Hey there,"
        signoff = "Talk soon,"
    elif tone == "professional":
        greeting = "Dear Reader,"
        signoff = "Best regards,"
    elif tone == "playful":
        greeting = "What's up? 🚀"
        signoff = "Catch you on the flip side, ✨"
    else:
        greeting = "Hello,"
        signoff = "Cheers,"

    md = f"Subject: {topic.title()} Daily Digest - {date_str}\n\n"
    md += f"{greeting}\n\n"
    md += f"Here are today's top {topic} stories:\n\n"

    # Articles
    for i, article in enumerate(selected_articles, 1):
        md += f"## {i}. {article['title']}\n\n"
        md += f"{article['summary']}\n"
        md += f"[Read more →]({article['url']})\n\n"

    # Quick Tip
    md += "---\n\n"
    md += "## Quick Tip 💡\n\n"
    md += "Always test your subject lines! Small changes can increase open rates by 20-30%. "
    md += "Try A/B testing different subject line styles.\n\n"

    # Featured Resources
    if affiliate_articles:
        md += "## Featured Resources 🎯\n\n"

        for article in affiliate_articles[:2]:
            md += f"### {article['affiliate_product']}\n\n"
            md += f"{article['summary']}\n"
            md += f"[Get it here →]({article['affiliate_link']})\n\n"

    # FTC Disclosure
    md += "---\n\n"
    md += "## Disclosure\n\n"
    md += "**FTC Compliance:** This newsletter contains affiliate links. "
    md += "If you purchase through these links, I may earn a commission at no extra cost to you. "
    md += "I only recommend products I genuinely believe in.\n\n"

    # Signoff
    md += f"{signoff}\n"
    md += f"Your {topic.title()} Curator\n\n"

    # Unsubscribe
    md += "---\n\n"
    md += "Not interested anymore? [Unsubscribe](#)\n"

    return md


def generate_weekly_roundup(articles: List[Dict], topic: str, include_tutorials: bool = False, include_products: bool = False) -> str:
    """Generate weekly newsletter roundup."""
    date_str = datetime.now().strftime("%B %d, %Y")

    md = f"Subject: {topic.title()} Weekly Roundup - Top Stories\n\n"
    md += "Welcome to this week's roundup! Here's what's happening in the world of "
    md += f"{topic}:\n\n"

    md += "---\n\n"

    # Deep Dive Articles
    md += "## This Week's Deep Dives 📖\n\n"

    for i, article in enumerate(articles[:5], 1):
        md += f"### {i}. {article['title']}\n\n"
        md += f"{article['summary']}\n"
        md += f"[Read the full article →]({article['url']})\n\n"

    # Tutorial Corner
    if include_tutorials:
        md += "---\n\n"
        md += "## Tutorial Corner 🎓\n\n"
        md += "### How to Optimize Your Content Strategy\n\n"
        md += "1. **Research keywords** - Find what your audience is searching for\n\n"
        md += "2. **Create valuable content** - Solve problems, don't just sell\n\n"
        md += "3. **Distribute widely** - Use multiple platforms (check out content-recycler!)\n\n"
        md += "4. **Track and iterate** - Use analytics to improve\n\n"
        md += "Want to learn more? [Get the full course →](https://example.com/course)\n\n"

    # Recommended Products
    if include_products:
        md += "---\n\n"
        md += "## Recommended Products 🛍️\n\n"

        for article in articles[:3]:
            if article.get('affiliate_product'):
                md += f"### {article['affiliate_product']}\n\n"
                md += f"{article['summary']}\n"
                md += f"[Check it out →]({article['affiliate_link']})\n\n"

    # FTC Disclosure
    md += "---\n\n"
    md += "**FTC Disclosure:** This newsletter contains affiliate links. "
    md += "If you make a purchase, I may earn a commission at no extra cost to you. "
    md += "Thank you for supporting the newsletter!\n\n"

    return md


def generate_newsletter(newsletter_type: str, topic: str, articles_count: int = 10, tone: str = "conversational", affiliate_links: int = 3, include_tutorials: bool = False, include_products: bool = False) -> str:
    """Generate newsletter based on type."""
    articles = CURATED_ARTICLES * (articles_count // len(CURATED_ARTICLES) + 1)
    articles = articles[:articles_count]

    if newsletter_type == "daily":
        return generate_daily_digest(articles, topic, tone, affiliate_links)
    elif newsletter_type == "weekly":
        return generate_weekly_roundup(articles, topic, include_tutorials, include_products)
    else:
        return generate_daily_digest(articles, topic, tone, affiliate_links)


def main():
    parser = argparse.ArgumentParser(description="Generate newsletter")
    parser.add_argument("--type", choices=["daily", "weekly", "monthly", "roundup", "products"], default="daily", help="Newsletter type")
    parser.add_argument("--topic", default="marketing", help="Primary topic")
    parser.add_argument("--articles", type=int, default=10, help="Number of articles")
    parser.add_argument("--affiliate-links", type=int, default=3, help="Number of affiliate links")
    parser.add_argument("--include-tutorials", action="store_true", help="Include educational content")
    parser.add_argument("--include-products", action="store_true", help="Include product recommendations")
    parser.add_argument("--tone", choices=["professional", "conversational", "playful"], default="conversational", help="Newsletter tone")
    parser.add_argument("--output", default="newsletter.md", help="Output file")

    args = parser.parse_args()

    # Generate newsletter
    newsletter = generate_newsletter(
        args.type,
        args.topic,
        args.articles,
        args.tone,
        args.affiliate_links,
        args.include_tutorials,
        args.include_products
    )

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(newsletter)

    print(f"✅ Newsletter generated: {args.output}")
    print(f"   Type: {args.type}")
    print(f"   Topic: {args.topic}")
    print(f"   Articles: {args.articles}")


if __name__ == "__main__":
    main()
