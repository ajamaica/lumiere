#!/usr/bin/env python3
"""
Content Recycler - Create LinkedIn post from content.
"""

import argparse
import sys

from recycle_content import read_input, create_linkedin_post, write_output


def main():
    parser = argparse.ArgumentParser(description="Create LinkedIn post from content")
    parser.add_argument("--input", required=True, help="Input file path")
    parser.add_argument("--max-length", type=int, default=3000, help="Max character length")
    parser.add_argument("--tone", choices=["professional", "conversational", "inspirational"], default="professional")
    parser.add_argument("--include-stats", action="store_true", help="Include statistics/data points")
    parser.add_argument("--formatting", action="store_true", help="Use bolding, line breaks")
    parser.add_argument("--output-dir", default="./output", help="Output directory")

    args = parser.parse_args()

    # Read input
    try:
        content = read_input(args.input)
    except FileNotFoundError:
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    # Create post
    post = create_linkedin_post(content, args.tone, args.formatting)

    # Truncate if too long
    if len(post) > args.max_length:
        post = post[:args.max_length - 3] + "..."

    # Write output
    write_output("linkedin", post, args.output_dir, args.input)

    # Print post to console
    print("\n" + "="*50)
    print("LINKEDIN POST")
    print("="*50 + "\n")
    print(post)
    print(f"\n[Character count: {len(post)} / {args.max_length}]")
    print("="*50)


if __name__ == "__main__":
    main()
