#!/usr/bin/env python3
"""
Price Tracker - Compare prices across platforms.
"""

import argparse
import sys
from typing import Dict, List

# Import from track_product.py
from track_product import (
    PLATFORMS,
    mock_search_product,
    calculate_margin,
    format_markdown,
    format_json,
)


def compare_product(keyword: str, platforms: List[str], sort_by: str = "margin", min_rating: float = 0.0) -> tuple:
    """Compare prices across platforms and find best arbitrage opportunities."""
    all_products = []

    # Search on each platform
    for platform in platforms:
        results = mock_search_product(keyword, platform)
        all_products.extend(results)

    # Filter by rating
    filtered_products = [p for p in all_products if p["rating"] >= min_rating]

    # Calculate all arbitrage opportunities
    opportunities = []
    for i, buy in enumerate(filtered_products):
        for j, sell in enumerate(filtered_products):
            if i == j:
                continue

            margin = calculate_margin(buy["price"], sell["price"], buy["platform"], sell["platform"])

            opportunities.append(
                {
                    "buy_from": buy["platform"],
                    "buy_price": buy["price"],
                    "buy_rating": buy["rating"],
                    "sell_on": sell["platform"],
                    "sell_price": sell["price"],
                    "sell_rating": sell["rating"],
                    "margin": margin,
                    "margin_percent": f"{margin * 100:.1f}%",
                }
            )

    # Sort opportunities
    sort_key_map = {
        "price": "buy_price",
        "margin": "margin",
        "rating": "buy_rating",
    }

    sort_key = sort_key_map.get(sort_by, "margin")
    opportunities.sort(key=lambda x: x[sort_key], reverse=True)

    # Also sort products by price
    filtered_products.sort(key=lambda x: x["price"])

    return filtered_products, opportunities


def main():
    parser = argparse.ArgumentParser(description="Compare product prices across platforms")
    parser.add_argument("--keyword", required=True, help="Product search keyword")
    parser.add_argument("--platforms", default="amazon,ebay,walmart,bestbuy", help="Comma-separated platforms")
    parser.add_argument("--report", choices=["markdown", "json", "csv"], default="markdown", help="Report format")
    parser.add_argument("--sort-by", choices=["price", "margin", "rating"], default="margin", help="Sort by")
    parser.add_argument("--min-rating", type=float, default=4.0, help="Minimum seller rating")

    args = parser.parse_args()

    # Parse platforms
    platforms = [p.strip() for p in args.platforms.split(",")]
    platforms = [p for p in platforms if p in PLATFORMS]

    if not platforms:
        print(f"Error: No valid platforms specified. Available: {', '.join(PLATFORMS.keys())}")
        sys.exit(1)

    # Compare prices
    products, opportunities = compare_product(args.keyword, platforms, args.sort_by, args.min_rating)

    # Format output
    if args.report == "markdown":
        alerts = ""  # No alerts in compare mode
        output = format_markdown(products, opportunities, alerts)
    elif args.report == "json":
        output = format_json(products, opportunities)
    elif args.report == "csv":
        output = "Buy Platform,Buy Price,Sell Platform,Sell Price,Margin,Margin %\n"
        for opp in opportunities:
            output += f"{opp['buy_from']},{opp['buy_price']},{opp['sell_on']},{opp['sell_price']},{opp['margin']:.4f},{opp['margin_percent']}\n"
    else:
        output = format_markdown(products, opportunities, "")

    print(output)


if __name__ == "__main__":
    main()
