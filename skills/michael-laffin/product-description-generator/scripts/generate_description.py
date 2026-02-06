#!/usr/bin/env python3
"""
Product Description Generator - Generate optimized product descriptions.
"""

import argparse
import json
from datetime import datetime
from typing import Dict, List, Tuple


# Tone templates
TONES = {
    "professional": {
        "hook": "Engineered for excellence.",
        "transitions": ["Furthermore,", "Additionally,", "In addition,"],
        "cta": "Upgrade your experience today."
    },
    "conversational": {
        "hook": "You're going to love this.",
        "transitions": ["Plus,", "And here's the best part,", "Here's why this matters:"],
        "cta": "Ready to transform your daily routine?"
    },
    "playful": {
        "hook": "Ready to level up? Let's do this! 🚀",
        "transitions": ["Guess what?", "Here's the cool part:", "And wait, there's more:"],
        "cta": "Don't miss out - grab yours today! ✨"
    },
    "luxury": {
        "hook": "Experience unparalleled craftsmanship.",
        "transitions": ["Furthermore,", "Moreover,", "Exceptionally,"],
        "cta": "Elevate your standard of excellence."
    },
}


def generate_amazon_listing(product: str, features: List[str], benefits: List[str], tone: str = "professional", keywords: List[str] = None) -> str:
    """Generate Amazon product listing."""
    tone_data = TONES.get(tone, TONES["professional"])

    md = f"# Amazon Listing: {product}\n\n"
    md += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Title (150-200 chars)
    title = f"{product}"
    if features:
        title += f", {', '.join(features[:3])}"
    md += f"## Product Title\n\n{title[:200]}\n\n"

    # Bullet points (5-7 points)
    md += f"## Bullet Points\n\n"
    for i, (feature, benefit) in enumerate(zip(features, benefits), 1):
        md += f"- {feature}: {benefit}\n"
    md += "\n"

    # Description
    md += f"## Product Description\n\n"
    md += f"{tone_data['hook']} This {product.lower()} delivers exceptional performance and quality.\n\n"

    md += "### Why Choose This Product?\n\n"
    for i, (feature, benefit) in enumerate(zip(features, benefits), 1):
        md += f"**{feature}**: {benefit} Experience the difference that superior quality makes.\n\n"

    md += "### What's in the Box\n\n"
    md += f"- 1x {product}\n"
    md += "- Quick Start Guide\n"
    md += "- Warranty Card\n\n"

    # SEO keywords
    if keywords:
        md += f"## Backend Keywords\n\n"
        md += ", ".join(keywords) + "\n\n"

    return md


def generate_shopify_description(product: str, features: List[str], benefits: List[str], tone: str = "conversational", keywords: List[str] = None) -> str:
    """Generate Shopify product description."""
    tone_data = TONES.get(tone, TONES["conversational"])

    md = f"# Shopify Product: {product}\n\n"
    md += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Meta description
    md += "## Meta Description\n\n"
    meta_desc = f"{product}. {', '.join(benefits[:2])}. Order now for free shipping."
    md += f"{meta_desc[:155]}\n\n"

    # Handle
    md += "## URL Handle\n\n"
    handle = product.lower().replace(" ", "-").replace(",", "")
    md += f"{handle[:70]}\n\n"

    # Description
    md += f"## Product Description\n\n"
    md += f"{tone_data['hook']} If you're looking for a {product.lower()} that delivers on every promise, this is it.\n\n"

    md += "### Key Features\n\n"
    for feature, benefit in zip(features, benefits):
        md += f"**{feature}**: {benefit}\n\n"

    md += "### Perfect For\n\n"
    md += "- Daily use\n"
    md += "- Gifting\n"
    md += "- Professional environments\n\n"

    md += "### Why You'll Love It\n\n"
    md += f"{tone_data['cta']} Join thousands of satisfied customers who have already upgraded their experience.\n\n"

    return md


def generate_description(product: str, platform: str, features: List[str], benefits: List[str], tone: str = "professional", keywords: List[str] = None, include_faq: bool = False, include_specs: bool = False) -> str:
    """Generate platform-specific product description."""
    if platform == "amazon":
        return generate_amazon_listing(product, features, benefits, tone, keywords)
    elif platform == "shopify":
        return generate_shopify_description(product, features, benefits, tone, keywords)
    elif platform == "ebay":
        return generate_amazon_listing(product, features, benefits, tone, keywords)  # Similar structure
    elif platform == "etsy":
        return generate_shopify_description(product, features, benefits, "conversational", keywords)
    else:
        return generate_amazon_listing(product, features, benefits, tone, keywords)


def main():
    parser = argparse.ArgumentParser(description="Generate product description")
    parser.add_argument("--product", required=True, help="Product name")
    parser.add_argument("--platform", choices=["amazon", "shopify", "ebay", "etsy", "custom"], required=True, help="Target platform")
    parser.add_argument("--features", help="Comma-separated features")
    parser.add_argument("--benefits", help="Comma-separated benefits")
    parser.add_argument("--tone", choices=["professional", "conversational", "playful", "luxury"], default="professional", help="Tone preference")
    parser.add_argument("--target-audience", help="Target audience")
    parser.add_argument("--keywords", help="Comma-separated SEO keywords")
    parser.add_argument("--include-faq", action="store_true", help="Include FAQ section")
    parser.add_argument("--include-specs", action="store_true", help="Include specifications section")
    parser.add_argument("--output", default="description.md", help="Output file")

    args = parser.parse_args()

    # Parse features and benefits
    features = [f.strip() for f in args.features.split(",")] if args.features else []
    benefits = [b.strip() for b in args.benefits.split(",")] if args.benefits else []

    # Parse keywords
    keywords = [k.strip() for k in args.keywords.split(",")] if args.keywords else []

    # Generate description
    description = generate_description(
        args.product,
        args.platform,
        features,
        benefits,
        args.tone,
        keywords,
        args.include_faq,
        args.include_specs
    )

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(description)

    print(f"✅ Description generated: {args.output}")
    print(f"   Platform: {args.platform}")
    print(f"   Tone: {args.tone}")
    print(f"   Features: {len(features)}")
    print(f"   Benefits: {len(benefits)}")


if __name__ == "__main__":
    main()
