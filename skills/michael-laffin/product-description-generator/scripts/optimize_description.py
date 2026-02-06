#!/usr/bin/env python3
"""
Product Description Generator - Optimize existing description.
"""

import argparse
from generate_description import generate_description


def optimize_description(input_path: str, target_keyword: str, platform: str, add_cta: bool = False, add_social_proof: bool = False) -> str:
    """Optimize an existing description."""
    # Read existing description
    with open(input_path, "r", encoding="utf-8") as f:
        existing = f.read()

    # Extract product name (first line after #)
    lines = existing.split("\n")
    product = lines[0].replace("# ", "").replace("Amazon Listing: ", "").replace("Shopify Product: ", "")

    # Generate new optimized version
    features = ["High-quality materials", "Optimal performance", "Reliable construction"]
    benefits = ["Better experience", "Longer lifespan", "Professional results"]
    keywords = [target_keyword, f"best {target_keyword}", f"premium {target_keyword}"]

    optimized = generate_description(
        product,
        platform,
        features,
        benefits,
        "professional",
        keywords,
        True,
        True
    )

    return optimized


def main():
    parser = argparse.ArgumentParser(description="Optimize description")
    parser.add_argument("--input", required=True, help="Input file path")
    parser.add_argument("--target-keyword", required=True, help="Primary keyword")
    parser.add_argument("--platform", choices=["amazon", "shopify", "ebay", "etsy", "custom"], required=True, help="Target platform")
    parser.add_argument("--add-cta", action="store_true", help="Add strong CTA")
    parser.add_argument("--add-social-proof", action="store_true", help="Add social proof")
    parser.add_argument("--output", default="optimized.md", help="Output file")

    args = parser.parse_args()

    # Optimize description
    optimized = optimize_description(
        args.input,
        args.target_keyword,
        args.platform,
        args.add_cta,
        args.add_social_proof
    )

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(optimized)

    print(f"✅ Description optimized: {args.output}")


if __name__ == "__main__":
    main()
