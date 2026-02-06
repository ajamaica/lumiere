#!/usr/bin/env python3
"""
Review Summarizer - Compare reviews across multiple platforms.
"""

import argparse
import json
from typing import Dict, List
from scrape_reviews import scrape_reviews, calculate_sentiment, generate_summary


def compare_reviews(product: str, platforms: List[str], max_reviews: int = 50) -> Dict:
    """Compare reviews for a product across multiple platforms."""
    comparison = {
        "product": product,
        "platforms": {},
        "analysis": {}
    }

    # Scrape reviews from each platform
    for platform in platforms:
        # Mock URL for each platform
        url = f"https://{platform}.com/product/{product.lower().replace(' ', '-')}"
        reviews = scrape_reviews(url, max_reviews, platform)
        summary = generate_summary(reviews)

        comparison["platforms"][platform] = summary

    # Analyze comparison
    platforms_data = comparison["platforms"]

    # Find highest rating
    highest_rated = max(
        platforms_data.items(),
        key=lambda x: x[1].get("overview", {}).get("average_rating", 0),
        default=("", {})
    )

    # Find most positive sentiment
    most_positive = max(
        platforms_data.items(),
        key=lambda x: x[1].get("overview", {}).get("overall_sentiment", -999),
        default=("", {})
    )

    comparison["analysis"] = {
        "highest_rated": {
            "platform": highest_rated[0],
            "rating": highest_rated[1].get("overview", {}).get("average_rating", 0)
        },
        "most_positive": {
            "platform": most_positive[0],
            "sentiment": most_positive[1].get("overview", {}).get("overall_sentiment", 0)
        }
    }

    return comparison


def format_comparison_markdown(comparison: Dict) -> str:
    """Format comparison as Markdown."""
    md = f"# Multi-Platform Review Comparison\n\n"
    md += f"**Product:** {comparison['product']}\n"
    md += f"**Generated:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    md += "---\n\n"

    # Platform summaries
    for platform, data in comparison["platforms"].items():
        if "error" in data:
            continue

        md += f"## {platform.title()}\n\n"

        overview = data.get("overview", {})
        md += f"- **Rating:** {overview.get('average_rating', 0)}/5.0\n"
        md += f"- **Sentiment:** {overview.get('overall_sentiment', 0):+.2f}\n"
        md += f"- **Reviews:** {overview.get('total_reviews', 0)}\n\n"

        # Top pros/cons
        aspects = data.get("aspects", {})
        if aspects:
            md += "**Pros:**\n"
            for pro in aspects.get("pros", [])[:3]:
                md += f"- {pro}\n"

            md += "\n**Cons:**\n"
            for con in aspects.get("cons", [])[:3]:
                md += f"- {con}\n"
            md += "\n"

    # Analysis
    md += "---\n\n"
    md += "## Overall Analysis\n\n"

    analysis = comparison.get("analysis", {})
    if analysis.get("highest_rated"):
        md += f"**Highest Rated:** {analysis['highest_rated']['platform'].title()} "
        md += f"({analysis['highest_rated']['rating']}/5.0)\n\n"

    if analysis.get("most_positive"):
        md += f"**Most Positive Sentiment:** {analysis['most_positive']['platform'].title()} "
        md += f"({analysis['most_positive']['sentiment']:+.2f})\n\n"

    # Recommendation
    md += "## Recommendation\n\n"

    # Simple recommendation logic
    best_platform = analysis.get("most_positive", {}).get("platform", "").capitalize()
    if best_platform:
        md += f"Based on sentiment analysis, **{best_platform}** shows the most positive customer feedback. "
        md += "Consider this platform for purchasing decisions or arbitrage opportunities.\n"

    return md


def main():
    parser = argparse.ArgumentParser(description="Compare reviews across platforms")
    parser.add_argument("--product", required=True, help="Product name or keyword")
    parser.add_argument("--platforms", default="amazon,google,yelp", help="Comma-separated platforms")
    parser.add_argument("--max-reviews", type=int, default=50, help="Max reviews per platform")
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown", help="Output format")
    parser.add_argument("--output", default="comparison.md", help="Output file")

    args = parser.parse_args()

    # Parse platforms
    platforms = [p.strip() for p in args.platforms.split(",")]

    # Compare reviews
    comparison = compare_reviews(args.product, platforms, args.max_reviews)

    # Format output
    if args.format == "markdown":
        output = format_comparison_markdown(comparison)
    else:
        output = json.dumps(comparison, indent=2)

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"✅ Comparison generated: {args.output}")
    print(f"   Platforms compared: {len(platforms)}")


if __name__ == "__main__":
    main()
