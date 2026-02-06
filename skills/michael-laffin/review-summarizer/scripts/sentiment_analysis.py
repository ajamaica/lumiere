#!/usr/bin/env python3
"""
Review Summarizer - Sentiment analysis module.
"""

import argparse
import re
from typing import Dict, List


# Simple sentiment word lists (replace with NLP models in production)
POSITIVE_WORDS = [
    "excellent", "great", "love", "amazing", "perfect", "outstanding",
    "good", "recommend", "happy", "best", "fantastic", "awesome",
    "impressed", "satisfied", "pleased", "delighted", "wonderful"
]

NEGATIVE_WORDS = [
    "disappointed", "not great", "cheap", "issues", "complaints",
    "average", "okay", "expected", "bad", "poor", "terrible",
    "awful", "horrible", "waste", "frustrating", "annoying"
]


def calculate_sentiment(text: str) -> float:
    """Calculate sentiment score from text."""
    if not text:
        return 0.0

    text_lower = text.lower()

    # Count positive and negative words
    positive_count = sum(1 for word in POSITIVE_WORDS if word in text_lower)
    negative_count = sum(1 for word in NEGATIVE_WORDS if word in text_lower)

    # Check for negations (not good = negative)
    negations = ["not ", "n't ", "never ", "no ", "don't ", "doesn't "]
    for neg in negations:
        # Find positive words after negation
        matches = re.finditer(f"{neg}({'|'.join(POSITIVE_WORDS)})", text_lower)
        for match in matches:
            positive_count -= 1
            negative_count += 1

    # Calculate sentiment
    if positive_count + negative_count == 0:
        return 0.0

    sentiment = (positive_count - negative_count) / max(positive_count + negative_count, 1)
    return round(sentiment, 2)


def analyze_aspects(text: str, aspects: List[str] = None) -> Dict[str, float]:
    """Analyze sentiment for specific aspects."""
    if not aspects:
        aspects = ["battery", "sound", "quality", "shipping", "price", "service", "support"]

    aspect_sentiments = {}

    for aspect in aspects:
        # Find sentences mentioning the aspect
        sentences = re.split(r'[.!?]', text)
        aspect_sentences = [s for s in sentences if aspect.lower() in s.lower()]

        if aspect_sentences:
            # Calculate sentiment for aspect-specific sentences
            aspect_text = " ".join(aspect_sentences)
            aspect_sentiments[aspect] = calculate_sentiment(aspect_text)

    return aspect_sentiments


def main():
    parser = argparse.ArgumentParser(description="Analyze sentiment")
    parser.add_argument("--input", required=True, help="Input file or text")
    parser.add_argument("--type", choices=["file", "text", "url"], default="file", help="Input type")
    parser.add_argument("--aspects", help="Analyze specific aspects (comma-separated)")
    parser.add_argument("--output", default="sentiment_report.md", help="Output file")

    args = parser.parse_args()

    # Load input
    if args.type == "file":
        with open(args.input, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        text = args.input

    # Calculate overall sentiment
    overall_sentiment = calculate_sentiment(text)

    # Generate report
    report = "# Sentiment Analysis Report\n\n"
    report += f"**Overall Sentiment:** {overall_sentiment:+.2f}\n\n"

    if overall_sentiment > 0.3:
        report += "**Tone:** Positive\n\n"
    elif overall_sentiment < -0.3:
        report += "**Tone:** Negative\n\n"
    else:
        report += "**Tone:** Neutral\n\n"

    # Aspect analysis if requested
    if args.aspects:
        aspects_list = [a.strip() for a in args.aspects.split(",")]
        aspect_sentiments = analyze_aspects(text, aspects_list)

        report += "## Aspect-Based Sentiment\n\n"
        for aspect, sentiment in aspect_sentiments.items():
            report += f"- **{aspect}:** {sentiment:+.2f}\n"

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"✅ Sentiment analysis complete: {args.output}")


if __name__ == "__main__":
    main()
