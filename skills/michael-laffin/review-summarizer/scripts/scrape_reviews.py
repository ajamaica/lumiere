#!/usr/bin/env python3
"""
Review Summarizer - Scrape and analyze reviews from multiple platforms.
"""

import argparse
import json
import re
from datetime import datetime
from typing import Dict, List, Tuple

# Mock data for demonstration (replace with actual scraping in production)
MOCK_REVIEWS = {
    "amazon": [
        {"rating": 5, "title": "Excellent product", "text": "Great quality, fast shipping, exactly as described. Would buy again!", "verified": True, "date": "2026-01-28"},
        {"rating": 4, "title": "Good value", "text": "Solid product for the price. Minor issues with packaging but overall happy.", "verified": True, "date": "2026-01-25"},
        {"rating": 5, "title": "Love it!", "text": "Best purchase I've made this year. Highly recommend to everyone.", "verified": False, "date": "2026-01-20"},
        {"rating": 3, "title": "Okay but not great", "text": "It works but feels a bit cheap. Customer service was helpful though.", "verified": True, "date": "2026-01-15"},
        {"rating": 5, "title": "Perfect", "text": "Everything I wanted and more. Shipping was fast, product arrived in perfect condition.", "verified": True, "date": "2026-01-10"},
        {"rating": 4, "title": "Works well", "text": "Does what it's supposed to. No complaints so far.", "verified": True, "date": "2026-01-05"},
        {"rating": 2, "title": "Disappointed", "text": "Not what I expected based on the description. Quality seems lower than advertised.", "verified": False, "date": "2025-12-28"},
        {"rating": 5, "title": "Amazing quality", "text": "Exceeded my expectations. The build quality is excellent and it works perfectly.", "verified": True, "date": "2025-12-20"},
    ],
    "google": [
        {"rating": 4, "text": "Good overall experience with the product. Minor issues but nothing major.", "date": "2026-01-22"},
        {"rating": 5, "text": "Excellent! Fast delivery and great customer support when I had questions.", "date": "2026-01-18"},
        {"rating": 3, "text": "Average product. It's okay for the price but I've seen better.", "date": "2026-01-12"},
        {"rating": 5, "text": "Outstanding! Would definitely recommend to friends and family.", "date": "2026-01-08"},
        {"rating": 4, "text": "Good quality. Arrived on time and was well packaged.", "date": "2025-12-30"},
    ],
}


def detect_platform(url: str) -> str:
    """Detect platform from URL."""
    if "amazon" in url.lower():
        return "amazon"
    elif "google" in url.lower() or "maps" in url.lower():
        return "google"
    elif "yelp" in url.lower():
        return "yelp"
    elif "tripadvisor" in url.lower():
        return "tripadvisor"
    else:
        return "unknown"


def scrape_reviews(url: str, max_reviews: int = 100, platform: str = None) -> List[Dict]:
    """Scrape reviews from URL (mock implementation)."""
    # In production, integrate with:
    # - Amazon Product Advertising API
    # - Google Places API
    # - Yelp Fusion API
    # - TripAdvisor API

    detected_platform = platform or detect_platform(url)
    if detected_platform in MOCK_REVIEWS:
        return MOCK_REVIEWS[detected_platform][:max_reviews]
    return []


def calculate_sentiment(text: str) -> float:
    """Calculate sentiment score from text (simple implementation)."""
    # In production, use NLP models:
    # - VADER (Valence Aware Dictionary and sEntiment Reasoner)
    # - TextBlob
    # - spaCy with sentiment models

    positive_words = ["excellent", "great", "love", "amazing", "perfect", "outstanding", "good", "recommend", "happy"]
    negative_words = ["disappointed", "not great", "cheap", "issues", "complaints", "average", "okay", "expected"]

    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)

    if positive_count + negative_count == 0:
        return 0.0

    sentiment = (positive_count - negative_count) / max(positive_count + negative_count, 1)
    return round(sentiment, 2)


def extract_aspects(reviews: List[Dict]) -> Dict[str, List[str]]:
    """Extract aspects mentioned in reviews (mock implementation)."""
    # In production, use aspect-based sentiment analysis:
    # - spaCy NER
    # - Custom aspect extraction models

    return {
        "pros": ["quality", "fast shipping", "exceeded expectations", "great customer service", "good value"],
        "cons": ["packaging issues", "feels cheap", "not as expected", "minor issues"],
    }


def generate_summary(reviews: List[Dict]) -> Dict:
    """Generate comprehensive summary from reviews."""
    if not reviews:
        return {"error": "No reviews found"}

    # Calculate stats
    total_reviews = len(reviews)
    avg_rating = round(sum(r["rating"] for r in reviews) / total_reviews, 2)

    # Sentiment analysis
    sentiments = [calculate_sentiment(r.get("text", "")) for r in reviews]
    avg_sentiment = round(sum(sentiments) / len(sentiments), 2)

    positive_count = sum(1 for s in sentiments if s > 0.1)
    neutral_count = sum(1 for s in sentiments if -0.1 <= s <= 0.1)
    negative_count = sum(1 for s in sentiments if s < -0.1)

    # Extract aspects
    aspects = extract_aspects(reviews)

    # Generate recommendation
    if avg_rating >= 4.0 and avg_sentiment >= 0.3:
        recommendation = "✅ **Recommended** - Strong positive sentiment with high customer satisfaction."
    elif avg_rating >= 3.0 and avg_sentiment >= 0.0:
        recommendation = "⚠️ **Conditionally Recommended** - Good overall but consider your specific needs."
    else:
        recommendation = "❌ **Not Recommended** - Low satisfaction and negative sentiment."

    return {
        "overview": {
            "total_reviews": total_reviews,
            "average_rating": avg_rating,
            "overall_sentiment": avg_sentiment,
        },
        "sentiment": {
            "positive": f"{positive_count} ({positive_count/total_reviews:.0%})",
            "neutral": f"{neutral_count} ({neutral_count/total_reviews:.0%})",
            "negative": f"{negative_count} ({negative_count/total_reviews:.0%})",
        },
        "aspects": aspects,
        "recommendation": recommendation,
    }


def format_markdown(summary: Dict, url: str, platform: str) -> str:
    """Format summary as Markdown."""
    md = f"# Product Review Summary\n\n"
    md += f"**URL:** {url}\n"
    md += f"**Platform:** {platform}\n"
    md += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    md += "---\n\n"

    if "error" in summary:
        md += f"Error: {summary['error']}\n"
        return md

    # Overview
    overview = summary["overview"]
    md += "## Overview\n\n"
    md += f"- **Reviews Analyzed:** {overview['total_reviews']}\n"
    md += f"- **Average Rating:** {overview['average_rating']}/5.0\n"
    md += f"- **Overall Sentiment:** {overview['overall_sentiment']:+.2f}\n\n"

    # Key Insights
    md += "## Key Insights\n\n"

    aspects = summary["aspects"]
    md += "### Top Pros\n"
    for i, pro in enumerate(aspects["pros"], 1):
        md += f"{i}. {pro}\n"
    md += "\n"

    md += "### Top Cons\n"
    for i, con in enumerate(aspects["cons"], 1):
        md += f"{i}. {con}\n"
    md += "\n"

    # Sentiment Analysis
    sentiment = summary["sentiment"]
    md += "## Sentiment Analysis\n\n"
    md += f"- **Positive:** {sentiment['positive']}\n"
    md += f"- **Neutral:** {sentiment['neutral']}\n"
    md += f"- **Negative:** {sentiment['negative']}\n\n"

    # Recommendation
    md += "## Recommendation\n\n"
    md += summary["recommendation"] + "\n"

    return md


def format_json(summary: Dict) -> str:
    """Format summary as JSON."""
    return json.dumps(summary, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Scrape and analyze reviews")
    parser.add_argument("--url", required=True, help="Product or business review URL")
    parser.add_argument("--platform", choices=["amazon", "google", "yelp", "tripadvisor"], help="Platform (auto-detected if omitted)")
    parser.add_argument("--max-reviews", type=int, default=100, help="Maximum reviews to fetch")
    parser.add_argument("--verified-only", action="store_true", help="Filter to verified purchases only")
    parser.add_argument("--min-rating", type=int, choices=[1, 2, 3, 4, 5], help="Minimum rating to include")
    parser.add_argument("--format", choices=["markdown", "json", "csv"], default="markdown", help="Output format")
    parser.add_argument("--output", default="summary.md", help="Output file")

    args = parser.parse_args()

    # Detect platform
    platform = args.platform or detect_platform(args.url)

    # Scrape reviews
    reviews = scrape_reviews(args.url, args.max_reviews, platform)

    # Filter reviews
    if args.verified_only:
        reviews = [r for r in reviews if r.get("verified", False)]
    if args.min_rating:
        reviews = [r for r in reviews if r["rating"] >= args.min_rating]

    # Generate summary
    summary = generate_summary(reviews)

    # Format output
    if args.format == "markdown":
        output = format_markdown(summary, args.url, platform)
    elif args.format == "json":
        output = format_json(summary)
    elif args.format == "csv":
        output = "Rating,Sentiment,Text\n"
        for r in reviews:
            sentiment = calculate_sentiment(r.get("text", ""))
            output += f"{r['rating']},{sentiment},\"{r.get('text', '')[:100]}\"\n"
    else:
        output = format_markdown(summary, args.url, platform)

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"✅ Summary generated: {args.output}")
    print(f"   Reviews analyzed: {summary.get('overview', {}).get('total_reviews', 0)}")


if __name__ == "__main__":
    main()
