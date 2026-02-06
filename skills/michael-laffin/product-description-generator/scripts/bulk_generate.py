#!/usr/bin/env python3
"""
Product Description Generator - Bulk generate from CSV.
"""

import argparse
import csv
import os
from generate_description import generate_description


def bulk_generate(csv_path: str, platform: str, output_dir: str) -> None:
    """Generate descriptions for multiple products."""
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Read CSV
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            # Parse values
            features = [f.strip() for f in row.get("features", "").split(",")]
            benefits = [b.strip() for b in row.get("benefits", "").split(",")]
            keywords = [k.strip() for k in row.get("keywords", "").split(",")]

            # Generate description
            description = generate_description(
                row["product"],
                platform,
                features,
                benefits,
                row.get("tone", "professional"),
                keywords,
                False,
                False
            )

            # Save to file
            filename = f"{row['product'].lower().replace(' ', '_')}.md"
            output_path = os.path.join(output_dir, filename)

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(description)

            print(f"✅ Generated: {filename}")


def main():
    parser = argparse.ArgumentParser(description="Bulk generate descriptions")
    parser.add_argument("--csv", required=True, help="Path to CSV file")
    parser.add_argument("--platform", choices=["amazon", "shopify", "ebay", "etsy", "custom"], required=True, help="Target platform")
    parser.add_argument("--output-dir", default="./descriptions", help="Output directory")
    parser.add_argument("--format", choices=["markdown", "html", "csv"], default="markdown", help="Output format")

    args = parser.parse_args()

    # Generate descriptions
    bulk_generate(args.csv, args.platform, args.output_dir)


if __name__ == "__main__":
    main()
