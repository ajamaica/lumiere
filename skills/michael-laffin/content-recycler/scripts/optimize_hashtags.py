#!/usr/bin/env python3
"""
Content Recycler - Generate optimized hashtags for platforms.
"""

import argparse
import sys

HASHTAG_DATABASE = {
    "tech": {
        "high": ["#technology", "#innovation", "#digital", "#tech", "#future"],
        "medium": ["#techlife", "#digitaltransformation", "#innovationtech", "#techtrends"],
        "niche": ["#techstrategy", "#digitalmarketing", "#techtips", "#techsolutions"],
    },
    "marketing": {
        "high": ["#marketing", "#business", "#growth", "#entrepreneur", "#branding"],
        "medium": ["#digitalmarketing", "#marketingtips", "#brandstrategy", "#growthhacking"],
        "niche": ["#contentmarketing", "#marketingstrategy", "#brandbuilding", "#marketinghacks"],
    },
    "finance": {
        "high": ["#finance", "#money", "#investing", "#business", "#wealth"],
        "medium": ["#financialfreedom", "#investingtips", "#moneytips", "#personalfinance"],
        "niche": ["#financialplanning", "#investmentstrategy", "#wealthbuilding", "#financetips"],
    },
    "health": {
        "high": ["#health", "#wellness", "#fitness", "#selfcare", "#lifestyle"],
        "medium": ["#healthylifestyle", "#wellnessjourney", "#fitnesstips", "#selfimprovement"],
        "niche": ["#healthyliving", "#wellnessgoals", "#fitnessmotivation", "#selfcaretips"],
    },
    "default": {
        "high": ["#motivation", "#inspiration", "#success", "#lifestyle", "#growth"],
        "medium": ["#dailyinspiration", "#mindset", "#tips", "#advice", "#wisdom"],
        "niche": ["#lifelessons", "#growthmindset", "#inspire", "#successmindset"],
    }
}


def generate_hashtags(topic: str, platform: str, count: int, niche: str = None) -> list:
    """Generate platform-optimized hashtags."""
    # Determine niche
    if niche and niche in HASHTAG_DATABASE:
        hashtag_sets = HASHTAG_DATABASE[niche]
    else:
        hashtag_sets = HASHTAG_DATABASE["default"]

    # Platform-specific adjustments
    platform_configs = {
        "instagram": {"ratio": [0.3, 0.4, 0.3]},  # 30% high, 40% medium, 30% niche
        "linkedin": {"ratio": [0.5, 0.3, 0.2]},  # More professional tags
        "twitter": {"ratio": [0.6, 0.4, 0.0]},   # Only high and medium, fewer total
        "facebook": {"ratio": [0.4, 0.4, 0.2]},   # Moderate mix
        "tiktok": {"ratio": [0.2, 0.3, 0.5]},    # More niche/trending
    }

    config = platform_configs.get(platform, platform_configs["instagram"])
    ratio = config["ratio"]

    # Calculate counts per tier
    high_count = max(1, int(count * ratio[0]))
    medium_count = max(1, int(count * ratio[1]))
    niche_count = max(0, count - high_count - medium_count)

    # Select hashtags
    hashtags = []

    hashtags.extend(hashtag_sets["high"][:high_count])
    hashtags.extend(hashtag_sets["medium"][:medium_count])
    hashtags.extend(hashtag_sets["niche"][:niche_count])

    # Add topic-specific hashtags
    topic_tags = [f"#{word}" for word in topic.split()[:2]]
    hashtags.extend(topic_tags)

    # Remove duplicates and limit
    hashtags = list(dict.fromkeys(hashtags))  # Remove duplicates while preserving order
    hashtags = hashtags[:count]

    return hashtags


def main():
    parser = argparse.ArgumentParser(description="Generate optimized hashtags")
    parser.add_argument("--input", required=True, help="Input content or topic")
    parser.add_argument("--platforms", default="instagram,linkedin,twitter", help="Target platforms")
    parser.add_argument("--count", type=int, default=15, help="Number of hashtags per platform")
    parser.add_argument("--niche", choices=["tech", "marketing", "finance", "health"], help="Industry/niche")

    args = parser.parse_args()

    # Parse platforms
    platforms = [p.strip() for p in args.platforms.split(",")]

    # Generate hashtags for each platform
    print(f"# Hashtag Recommendations for: {args.input}\n")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    for platform in platforms:
        hashtags = generate_hashtags(args.input, platform, args.count, args.niche)

        print(f"## {platform.title()}")
        print(f"**Count:** {len(hashtags)} hashtags\n")
        print(" ".join(hashtags))
        print(f"\n---\n")


if __name__ == "__main__":
    from datetime import datetime
    main()
