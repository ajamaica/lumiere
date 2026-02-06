#!/usr/bin/env python3
"""
Content Recycler - Generate multi-day content calendar.
"""

import argparse
import sys
from datetime import datetime, timedelta

from recycle_content import read_input, create_twitter_thread, create_linkedin_post, create_facebook_post


def generate_day_schedule(content: str, day: int, themes: list) -> dict:
    """Generate content for a single day."""
    theme = themes[day % len(themes)]
    schedule = {"day": day + 1, "theme": theme, "platforms": {}}

    if theme == "teaser":
        schedule["platforms"]["twitter"] = f"🚀 Big news coming tomorrow! Stay tuned..."
        schedule["platforms"]["instagram"] = "✨ Something exciting drops tomorrow! 📱"
        schedule["platforms"]["story"] = "Countdown: 24 hours..."

    elif theme == "release":
        lines = content.strip().split("\n\n")
        hook = lines[0] if lines else "New content live!"
        schedule["platforms"]["twitter"] = f"{hook} 🧵\n\n👇 Thread below"
        schedule["platforms"]["linkedin"] = create_linkedin_post(content)
        schedule["platforms"]["facebook"] = f"{hook}\n\nCheck it out and let me know what you think!"

    elif theme == "followup":
        schedule["platforms"]["twitter"] = "📌 Key takeaway from yesterday's post:\n\n[Main point]\n\nWhat do you think?"
        schedule["platforms"]["instagram"] = "💡 Quick tip from yesterday!\n\n[Tip]\n\n💾 Save this!"
        schedule["platforms"]["linkedin"] = "Following up on yesterday's topic with a bonus insight..."

    elif theme == "behind_scenes":
        schedule["platforms"]["instagram"] = "🎬 Behind the scenes of creating the content!\n\n BTS"
        schedule["platforms"]["tiktok"] = "Watch me create [content] from scratch! 📹"
        schedule["platforms"]["twitter"] = "Fun fact: It took me X hours to research and write this!"

    elif theme == "qa":
        schedule["platforms"]["twitter"] = "🤔 Q&A time! Ask me anything about [topic] below!"
        schedule["platforms"]["instagram"] = "Got questions? Drop them in the comments! 👇"
        schedule["platforms"]["facebook"] = "I'm answering your questions about [topic] today! Ask away!"

    elif theme == "summary":
        schedule["platforms"]["twitter"] = "📊 This week's stats:\n\n• [Stat 1]\n• [Stat 2]\n• [Stat 3]\n\n#thread"
        schedule["platforms"]["linkedin"] = "📈 Weekly insights summary:\n\n[Key takeaways from the week]"
        schedule["platforms"]["instagram"] = "📈 This week's highlights!\n\n[Top 3 moments]"

    elif theme == "cta":
        schedule["platforms"]["twitter"] = "🎯 What should I cover next week? Vote below!"
        schedule["platforms"]["instagram"] = "🎯 What content do you want more of? Comment below!"
        schedule["platforms"]["email"] = "Thanks for following along! Here's a special bonus just for you..."

    return schedule


def generate_content_calendar(content: str, days: int, platforms: list) -> str:
    """Generate full content calendar."""
    themes = ["teaser", "release", "followup", "behind_scenes", "qa", "summary", "cta"]
    calendar = []
    start_date = datetime.now() + timedelta(days=1)

    calendar.append("# Content Calendar\n")
    calendar.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    calendar.append(f"Duration: {days} days starting {start_date.strftime('%Y-%m-%d')}\n")
    calendar.append("---\n\n")

    for day in range(days):
        date = start_date + timedelta(days=day)
        schedule = generate_day_schedule(content, day, themes)

        calendar.append(f"## Day {schedule['day']} - {date.strftime('%A, %B %d, %Y')}\n")
        calendar.append(f"**Theme:** {schedule['theme'].title().replace('_', ' ')}\n\n")

        for platform in platforms:
            if platform in schedule["platforms"]:
                calendar.append(f"### {platform.title()}\n")
                content_text = schedule["platforms"][platform]
                calendar.append(f"```\n{content_text}\n```\n\n")

        calendar.append("---\n\n")

    return "".join(calendar)


def main():
    parser = argparse.ArgumentParser(description="Generate multi-day content calendar")
    parser.add_argument("--input", required=True, help="Input file path")
    parser.add_argument("--days", type=int, default=7, help="Number of days")
    parser.add_argument("--platforms", default="twitter,linkedin,facebook,instagram,tiktok,email", help="Comma-separated platforms")
    parser.add_argument("--output", default="calendar.md", help="Output file")

    args = parser.parse_args()

    # Read input
    try:
        content = read_input(args.input)
    except FileNotFoundError:
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    # Parse platforms
    platforms = [p.strip() for p in args.platforms.split(",")]

    # Generate calendar
    calendar = generate_content_calendar(content, args.days, platforms)

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(calendar)

    print(f"✅ Content calendar generated: {args.output}")
    print(f"   {args.days} days, {len(platforms)} platforms")


if __name__ == "__main__":
    main()
