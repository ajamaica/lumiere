#!/usr/bin/env python3
"""
Review Summarizer - Export review data.
"""

import argparse
import json
import csv


def export_data(input_data: str, format: str = "csv", output: str = "export.csv") -> None:
    """Export review data to specified format."""
    # Load data
    try:
        with open(input_data, "r", encoding="utf-8") as f:
            if input_data.endswith(".json"):
                data = json.load(f)
            else:
                data = {"text": f.read()}
    except Exception as e:
        print(f"Error loading input: {e}")
        return

    # Export
    if format == "csv":
        if isinstance(data, dict) and "platforms" in data:
            # Comparison data
            with open(output, "w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["Platform", "Rating", "Sentiment", "Reviews"])

                for platform, summary in data["platforms"].items():
                    overview = summary.get("overview", {})
                    writer.writerow([
                        platform,
                        overview.get("average_rating", ""),
                        overview.get("overall_sentiment", ""),
                        overview.get("total_reviews", "")
                    ])
        else:
            # Single product data
            overview = data.get("overview", {})
            with open(output, "w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["Metric", "Value"])
                writer.writerow(["Rating", overview.get("average_rating", "")])
                writer.writerow(["Sentiment", overview.get("overall_sentiment", "")])
                writer.writerow(["Reviews", overview.get("total_reviews", "")])

    elif format == "json":
        with open(output, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    print(f"✅ Data exported: {output}")


def main():
    parser = argparse.ArgumentParser(description="Export review data")
    parser.add_argument("--input", required=True, help="Input file or JSON data")
    parser.add_argument("--format", choices=["csv", "json"], default="csv", help="Export format")
    parser.add_argument("--output", default="export.csv", help="Output file")

    args = parser.parse_args()

    export_data(args.input, args.format, args.output)


if __name__ == "__main__":
    main()
