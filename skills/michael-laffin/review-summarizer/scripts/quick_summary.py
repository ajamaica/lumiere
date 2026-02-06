#!/usr/bin/env python3
"""
Review Summarizer - Generate quick executive summary.
"""

import argparse
from scrape_reviews import scrape_reviews, generate_summary, format_markdown


def generate_quick_summary(url: str, word_count: int = 150) -> str:
    """Generate brief executive summary."""
    # Scrape reviews
    reviews = scrape_reviews(url, max_reviews=50)

    # Generate summary
    summary = generate_summary(reviews)

    if "error" in summary:
        return summary["error"]

    # Create brief summary
    overview = summary["overview"]
    recommendation = summary["recommendation"]

    brief = f"Based on {overview['total_reviews']} reviews, "
    brief += f"this product has an average rating of {overview['average_rating']}/5.0 "
    brief += f"with {overview['overall_sentiment']:+.2f} overall sentiment. "

    # Add key insights
    aspects = summary.get("aspects", {})
    if aspects:
        top_pro = aspects.get("pros", [])[0] if aspects.get("pros") else "good quality"
        brief += f"Customers appreciate {top_pro.lower()}. "

    brief += f"{recommendation}"

    return brief


def main():
    parser = argparse.ArgumentParser(description="Generate quick summary")
    parser.add_argument("--url", required=True, help="Review URL")
    parser.add_argument("--brief", action="store_true", help="Brief summary only")
    parser.add_argument("--words", type=int, default=150, help="Summary word count")
    parser.add_argument("--output", default="summary.txt", help="Output file")

    args = parser.parse_args()

    # Generate quick summary
    summary = generate_quick_summary(args.url, args.words)

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(summary)

    print(f"✅ Summary generated: {args.output}")
    print(f"   Word count: {len(summary.split())}")


if __name__ == "__main__":
    main()
