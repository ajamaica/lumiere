#!/usr/bin/env python3
"""
Price Tracker - Bulk monitor multiple products from CSV.
"""

import argparse
import csv
import sys
from typing import Dict, List

# Import from track_product.py
from track_product import (
    PLATFORMS,
    mock_search_product,
    calculate_margin,
)


def load_products_from_csv(csv_path: str) -> List[Dict]:
    """Load products to monitor from CSV file."""
    products = []

    with open(csv_path, "r", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            products.append(
                {
                    "name": row.get("product", ""),
                    "platforms": [p.strip() for p in row.get("platforms", "").split(",")],
                    "alert_below": float(row.get("alert_below", 0)),
                    "alert_margin": float(row.get("alert_margin", 0)),
                }
            )

    return products


def monitor_product(product: Dict, margin_threshold: float) -> List[Dict]:
    """Monitor a single product and find opportunities."""
    platforms = [p for p in product["platforms"] if p in PLATFORMS]

    if not platforms:
        return []

    # Search for product
    all_products = []
    for platform in platforms:
        results = mock_search_product(product["name"], platform)
        all_products.extend(results)

    # Calculate arbitrage opportunities
    opportunities = []
    for i, buy in enumerate(all_products):
        for j, sell in enumerate(all_products):
            if i == j:
                continue

            margin = calculate_margin(buy["price"], sell["price"], buy["platform"], sell["platform"])

            if margin >= margin_threshold:
                opportunities.append(
                    {
                        "product": product["name"],
                        "buy_from": buy["platform"],
                        "buy_price": buy["price"],
                        "sell_on": sell["platform"],
                        "sell_price": sell["price"],
                        "margin": margin,
                        "margin_percent": f"{margin * 100:.1f}%",
                    }
                )

    return opportunities


def main():
    parser = argparse.ArgumentParser(description="Bulk monitor multiple products from CSV")
    parser.add_argument("--csv", required=True, help="Path to CSV file")
    parser.add_argument("--margin-threshold", type=float, default=0.20, help="Minimum margin to report")
    parser.add_argument("--alert-frequency", choices=["hourly", "daily", "weekly"], default="daily", help="Frequency of alerts")
    parser.add_argument("--output", help="Output file for alerts")

    args = parser.parse_args()

    # Load products from CSV
    try:
        products = load_products_from_csv(args.csv)
    except FileNotFoundError:
        print(f"Error: CSV file not found: {args.csv}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        sys.exit(1)

    if not products:
        print("Error: No products found in CSV file")
        sys.exit(1)

    # Monitor each product
    all_opportunities = []

    for product in products:
        opportunities = monitor_product(product, args.margin_threshold)
        all_opportunities.extend(opportunities)

    # Sort by margin descending
    all_opportunities.sort(key=lambda x: x["margin"], reverse=True)

    # Generate output
    output_lines = []
    output_lines.append(f"# Bulk Price Monitoring Report")
    output_lines.append(f"# Margin Threshold: {args.margin_threshold * 100:.0f}%")
    output_lines.append(f"# Alert Frequency: {args.alert_frequency}")
    output_lines.append("")

    if not all_opportunities:
        output_lines.append("No arbitrage opportunities found.")
    else:
        output_lines.append(f"Found {len(all_opportunities)} arbitrage opportunities:")
        output_lines.append("")

        for opp in all_opportunities:
            output_lines.append(f"## {opp['product']}")
            output_lines.append(f"- Buy from: {opp['buy_from']} @ ${opp['buy_price']:.2f}")
            output_lines.append(f"- Sell on: {opp['sell_on']} @ ${opp['sell_price']:.2f}")
            output_lines.append(f"- Margin: {opp['margin_percent']}")
            output_lines.append("")

    output = "\n".join(output_lines)

    # Print to stdout
    print(output)

    # Write to output file if specified
    if args.output:
        with open(args.output, "w") as f:
            f.write(output)

    # Print summary to stderr
    if all_opportunities:
        print(f"\n---ALERTS ({len(all_opportunities)} opportunities found)---", file=sys.stderr)


if __name__ == "__main__":
    main()
