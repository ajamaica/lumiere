#!/usr/bin/env python3
"""
Content Recycler - Convert content to Twitter/X thread.
"""

import argparse
import sys
import json

from recycle_content import read_input, create_twitter_thread, write_output


def main():
    parser = argparse.ArgumentParser(description="Convert content to Twitter/X thread")
    parser.add_argument("--input", required=True, help="Input file path")
    parser.add_argument("--max-tweets", type=int, default=10, help="Maximum number of tweets")
    parser.add_argument("--hashtags", type=int, default=2, help="Number of hashtags per tweet")
    parser.add_argument("--tone", choices=["professional", "conversational", "playful"], default="conversational")
    parser.add_argument("--include-cta", action="store_true", help="Include CTA in final tweet")
    parser.add_argument("--output-dir", default="./output", help="Output directory")

    args = parser.parse_args()

    # Read input
    try:
        content = read_input(args.input)
    except FileNotFoundError:
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    # Create thread
    cta = "Follow for more insights! 🚀" if args.include_cta else ""
    thread = create_twitter_thread(content, args.tone, args.hashtags, cta)

    # Limit tweets
    thread = thread[:args.max_tweets]

    # Write output
    write_output("twitter", thread, args.output_dir, args.input)

    # Print thread to console
    print("\n" + "="*50)
    print("TWITTER/X THREAD")
    print("="*50 + "\n")
    for i, tweet in enumerate(thread, 1):
        print(f"[{i}/{len(thread)}] {tweet}\n")
    print("="*50)


if __name__ == "__main__":
    main()
