#!/usr/bin/env python3
"""
Price Tracker - Retrieve and analyze historical price data.
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List
import random

# Import from track_product.py
from track_product import (
    PLATFORMS,
    mock_search_product,
    format_markdown,
    format_json,
)


def generate_mock_history(base_price: float, days: int) -> List[Dict]:
    """Generate mock historical price data."""
    history = []

    for i in range(days):
        date = (datetime.now() - timedelta(days=days - i)).strftime("%Y-%m-%d")

        # Simulate price volatility (±15%)
        volatility = random.uniform(-0.15, 0.15)
        price = base_price * (1 + volatility)

        history.append(
            {
                "date": date,
                "price": round(price, 2),
                "low": round(price * 0.95, 2),
                "high": round(price * 1.05, 2),
            }
        )

    return history


def analyze_trend(history: List[Dict]) -> Dict:
    """Analyze price trend and make predictions."""
    if len(history) < 2:
        return {"trend": "insufficient_data", "direction": "unknown"}

    prices = [entry["price"] for entry in history]

    # Calculate trend
    first_price = prices[0]
    last_price = prices[-1]
    avg_price = sum(prices) / len(prices)
    min_price = min(prices)
    max_price = max(prices)

    # Determine direction
    if last_price > first_price * 1.05:
        direction = "upward"
        trend = "increasing"
    elif last_price < first_price * 0.95:
        direction = "downward"
        trend = "decreasing"
    else:
        direction = "stable"
        trend = "stable"

    # Simple prediction (linear extrapolation with mean reversion)
    if trend == "increasing":
        predicted = last_price * 1.02  # 2% growth
    elif trend == "decreasing":
        predicted = last_price * 0.98  # 2% decline
    else:
        predicted = avg_price  # Mean reversion

    return {
        "trend": trend,
        "direction": direction,
        "first_price": first_price,
        "last_price": last_price,
        "avg_price": avg_price,
        "min_price": min_price,
        "max_price": max_price,
        "predicted_price": round(predicted, 2),
        "volatility": round((max_price - min_price) / avg_price, 3),
    }


def get_price_history(product: str, platform: str, days: int) -> List[Dict]:
    """Get historical price data for a product."""
    # Get current price
    current = mock_search_product(product, platform)
    if not current:
        return []

    base_price = current[0]["price"]

    # Generate history
    history = generate_mock_history(base_price, days)

    return history


def main():
    parser = argparse.ArgumentParser(description="Retrieve and analyze historical price data")
    parser.add_argument("--product", required=True, help="Product name/keyword")
    parser.add_argument("--days", type=int, default=30, help="Number of days of history")
    parser.add_argument("--platform", help="Specific platform (default: all)")
    parser.add_argument("--output", choices=["markdown", "json", "csv"], default="markdown", help="Output format")
    parser.add_argument("--trend-analysis", action="store_true", help="Include trend analysis and predictions")

    args = parser.parse_args()

    # Determine platforms
    if args.platform:
        platforms = [args.platform] if args.platform in PLATFORMS else []
    else:
        platforms = list(PLATFORMS.keys())

    if not platforms:
        print(f"Error: Invalid platform. Available: {', '.join(PLATFORMS.keys())}")
        sys.exit(1)

    # Get history for each platform
    all_history = {}
    all_trends = {}

    for platform in platforms:
        history = get_price_history(args.product, platform, args.days)
        all_history[platform] = history

        if args.trend_analysis and history:
            trend = analyze_trend(history)
            all_trends[platform] = trend

    # Format output
    if args.output == "markdown":
        output = f"# Price History Report: {args.product}\n\n"
        output += f"Time Range: Last {args.days} days\n"
        output += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

        for platform, history in all_history.items():
            output += f"## {PLATFORMS[platform]['name']}\n\n"

            if args.trend_analysis and platform in all_trends:
                trend = all_trends[platform]
                output += f"**Trend:** {trend['trend'].title()} ({trend['direction']})\n"
                output += f"**Price Range:** ${trend['min_price']:.2f} - ${trend['max_price']:.2f}\n"
                output += f"**Average:** ${trend['avg_price']:.2f}\n"
                output += f"**Volatility:** {trend['volatility'] * 100:.1f}%\n"
                output += f"**Predicted:** ${trend['predicted_price']:.2f} (7 days)\n\n"

            output += "| Date | Price | Low | High |\n"
            output += "|------|-------|-----|------|\n"

            for entry in history[-10:]:  # Show last 10 entries
                output += f"| {entry['date']} | ${entry['price']:.2f} | ${entry['low']:.2f} | ${entry['high']:.2f} |\n"

            output += "\n"

    elif args.output == "json":
        data = {
            "product": args.product,
            "days": args.days,
            "timestamp": datetime.now().isoformat(),
            "platforms": {},
        }

        for platform in platforms:
            data["platforms"][platform] = {
                "history": all_history[platform],
                "trend": all_trends.get(platform),
            }

        output = json.dumps(data, indent=2)

    elif args.output == "csv":
        output = "Platform,Date,Price,Low,High\n"

        for platform, history in all_history.items():
            for entry in history:
                output += f"{platform},{entry['date']},{entry['price']},{entry['low']},{entry['high']}\n"

    print(output)


if __name__ == "__main__":
    main()
