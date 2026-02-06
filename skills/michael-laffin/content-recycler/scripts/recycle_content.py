#!/usr/bin/env python3
"""
Content Recycler - Transform content across multiple platforms.
"""

import argparse
import json
import sys
import os
from datetime import datetime
from pathlib import Path

PLATFORMS = {
    "twitter": {"name": "Twitter/X", "char_limit": 280},
    "linkedin": {"name": "LinkedIn", "char_limit": 3000},
    "facebook": {"name": "Facebook", "char_limit": 63206},
    "instagram": {"name": "Instagram", "char_limit": 2200},
    "tiktok": {"name": "TikTok", "char_limit": 250},  # Words, not chars
    "email": {"name": "Email", "char_limit": None},
}


def read_input(file_path: str) -> str:
    """Read content from input file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def create_twitter_thread(content: str, tone: str = "conversational", hashtags: int = 2, cta: str = "") -> list:
    """Create Twitter/X thread from content."""
    # Split content into sections
    lines = content.strip().split("\n\n")
    tweets = []

    # First tweet - hook
    first_para = lines[0][:200] if lines else ""
    tweets.append(f"{first_para} 🧵 (1/?)")

    # Middle tweets
    for i, section in enumerate(lines[1:6], 2):  # Max 6 middle tweets
        if len(section) > 240:
            section = section[:237] + "..."
        tweets.append(f"{section}\n\n({i}/?)")

    # Final tweet with CTA
    if cta:
        tweets.append(f"{cta}\n\n✅ Follow for more insights! #thread")

    # Update tweet numbers
    for i, tweet in enumerate(tweets, 1):
        tweets[i-1] = tweet.replace("(1/?)", f"({i}/{len(tweets)})").replace("(?/?)", f"({i}/{len(tweets)})")

    return tweets


def create_linkedin_post(content: str, tone: str = "professional", formatting: bool = True) -> str:
    """Create LinkedIn-optimized post."""
    lines = content.strip().split("\n\n")
    post_parts = []

    # Hook - first line emphasized
    if lines:
        hook = lines[0][:150] + "..."
        post_parts.append(f"🚀 {hook}\n")

    # Main content with formatting
    for section in lines[1:4]:
        section = section.replace("\n", " ")
        if len(section) > 600:
            section = section[:597] + "..."
        post_parts.append(f"{section}\n\n")

    # CTA
    post_parts.append("💡 What's your experience? Drop a comment below.\n\n#insights #growth")

    return "\n".join(post_parts)


def create_instagram_caption(content: str, hashtags_count: int = 11) -> str:
    """Create Instagram-optimized caption."""
    lines = content.strip().split("\n\n")

    # Hook
    caption = f"✨ {lines[0][:100]}...\n\n" if lines else ""

    # Main content
    for section in lines[1:3]:
        section = section.replace("\n", " ")
        caption += f"{section}\n\n"

    # CTA
    caption += "💬 Save this for later!\n\n"

    # Hashtags (mixed volume strategy)
    hashtags = [
        "#motivation", "#inspiration", "#growthmindset",  # High volume
        "#dailyinspiration", "#mindset", "#success",  # Medium
        "#growth", "#tips", "#advice", "#wisdom", "#lifelessons"  # Niche
    ][:hashtags_count]

    caption += " ".join(hashtags)

    return caption


def create_facebook_post(content: str, tone: str = "conversational") -> str:
    """Create Facebook post."""
    lines = content.strip().split("\n\n")
    post = ""

    # Hook with question
    if lines:
        post = f"💭 Have you ever thought about this?\n\n{lines[0]}\n\n"

    # Main content
    for section in lines[1:3]:
        section = section.replace("\n", " ")
        post += f"{section}\n\n"

    # Engagement question
    post += "👇 What's your take on this? Share in the comments!"

    return post


def create_tiktok_script(content: str, duration: int = 60) -> str:
    """Create TikTok script (60-90 seconds)."""
    lines = content.strip().split("\n\n")

    # Hook (3 seconds)
    hook = lines[0][:50] + "..." if lines else "You won't believe this..."
    script = f"[0-3s] {hook}\n\n"

    # Main content (45 seconds)
    main_points = []
    for section in lines[1:4]:
        point = section.replace("\n", " ")[:80]
        main_points.append(point)

    script += "[3-48s]\n"
    script += "\n".join(f"• {point}" for point in main_points)

    # CTA (12 seconds)
    script += f"\n\n[48-60s]\nFollow for more! Link in bio 🔗"

    return script


def create_email_teaser(content: str, cta: str = "Read the full article") -> str:
    """Create email newsletter teaser."""
    lines = content.strip().split("\n\n")

    subject = f"📧 {lines[0][:50]}..." if lines else "This week's insights"
    body = ""

    body += f"Hi there!\n\n"
    body += f"I just published something you might find interesting:\n\n"
    body += f"💡 {lines[0] if lines else ''}\n\n"

    for section in lines[1:3]:
        section = section.replace("\n", " ")
        body += f"{section}\n\n"

    body += f"{cta} below.\n\n"
    body += f"See you next week!\n"

    return subject, body


def write_output(platform: str, content: str or list, output_dir: str, input_file: str):
    """Write transformed content to output file."""
    os.makedirs(output_dir, exist_ok=True)

    base_name = Path(input_file).stem
    filename = f"{base_name}_{platform}.md"
    output_path = os.path.join(output_dir, filename)

    if isinstance(content, list):
        output = "# Twitter/X Thread\n\n"
        output += f"Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        for i, tweet in enumerate(content, 1):
            output += f"## Tweet {i}\n\n{tweet}\n\n"
    else:
        output = f"# {PLATFORMS.get(platform, {}).get('name', platform)} Post\n\n"
        output += f"Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        output += "---\n\n"
        output += content

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"✅ {PLATFORMS.get(platform, {}).get('name', platform)}: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Recycle content across multiple platforms")
    parser.add_argument("--input", required=True, help="Input file path")
    parser.add_argument("--output-dir", default="./output", help="Output directory")
    parser.add_argument("--platforms", default="twitter,linkedin,facebook,instagram", help="Comma-separated platforms")
    parser.add_argument("--format", choices=["all", "threads", "posts", "captions", "scripts"], default="all")
    parser.add_argument("--tone", choices=["professional", "conversational", "playful"], default="professional")
    parser.add_argument("--include-hashtags", action="store_true", help="Include hashtag suggestions")
    parser.add_argument("--cta", default="", help="Call-to-action to include")

    args = parser.parse_args()

    # Read input
    try:
        content = read_input(args.input)
    except FileNotFoundError:
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    # Parse platforms
    requested_platforms = [p.strip() for p in args.platforms.split(",")]

    # Determine platforms to process
    if args.format == "all":
        platforms = requested_platforms
    elif args.format == "threads":
        platforms = ["twitter"]
    elif args.format == "posts":
        platforms = ["linkedin", "facebook"]
    elif args.format == "captions":
        platforms = ["instagram"]
    elif args.format == "scripts":
        platforms = ["tiktok"]
    else:
        platforms = requested_platforms

    # Process each platform
    for platform in platforms:
        if platform == "twitter":
            output = create_twitter_thread(content, args.tone, 2 if args.include_hashtags else 0, args.cta)
        elif platform == "linkedin":
            output = create_linkedin_post(content, args.tone, formatting=True)
        elif platform == "instagram":
            output = create_instagram_caption(content, 11 if args.include_hashtags else 0)
        elif platform == "facebook":
            output = create_facebook_post(content, args.tone)
        elif platform == "tiktok":
            output = create_tiktok_script(content)
        elif platform == "email":
            subject, body = create_email_teaser(content, args.cta)
            output = f"Subject: {subject}\n\n{body}"
        else:
            print(f"⚠️  Unknown platform: {platform}")
            continue

        write_output(platform, output, args.output_dir, args.input)

    print(f"\n✅ Content recycled to {len(platforms)} platforms in {args.output_dir}")


if __name__ == "__main__":
    main()
