#!/usr/bin/env python3
"""
Postiz Social Media Poster

Post to X/Twitter, LinkedIn, and Bluesky with automatic character validation.

Usage:
    # Single platform
    uv run post.py --platform x --content "Your tweet" --schedule "2026-02-05T15:00:00Z"
    
    # Multi-platform
    uv run post.py --x "Short tweet" --linkedin "Longer post" --schedule "2026-02-05T15:00:00Z"
    
    # Post now
    uv run post.py --platform x --content "Posting now!" --now
    
    # With image
    uv run post.py --platform x --content "Check this out!" --image /path/to/image.png --schedule "2026-02-05T15:00:00Z"

Environment Variables:
    POSTIZ_URL       - Postiz instance URL (e.g., https://postiz.example.com)
    POSTIZ_EMAIL     - Login email
    POSTIZ_PASSWORD  - Login password
    
    # Integration IDs (get these from your Postiz dashboard)
    POSTIZ_X_ID       - X/Twitter integration ID
    POSTIZ_LINKEDIN_ID - LinkedIn integration ID
    POSTIZ_BLUESKY_ID  - Bluesky integration ID
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

import requests

# Configuration from environment
POSTIZ_URL = os.environ.get("POSTIZ_URL", "").rstrip("/")
COOKIE_FILE = "/tmp/postiz-cookies.txt"
CREDENTIALS = {
    "email": os.environ.get("POSTIZ_EMAIL", ""),
    "password": os.environ.get("POSTIZ_PASSWORD", ""),
    "provider": "LOCAL"
}

# Platform configurations (IDs from environment)
PLATFORMS = {
    "x": {
        "id": os.environ.get("POSTIZ_X_ID", ""),
        "char_limit": 280,
        "type": "x",
        "name": "X/Twitter"
    },
    "linkedin": {
        "id": os.environ.get("POSTIZ_LINKEDIN_ID", ""),
        "char_limit": 3000,
        "type": "linkedin",
        "name": "LinkedIn"
    },
    "bluesky": {
        "id": os.environ.get("POSTIZ_BLUESKY_ID", ""),
        "char_limit": 300,
        "type": "bluesky",
        "name": "Bluesky"
    }
}


def check_config():
    """Verify required environment variables are set."""
    missing = []
    if not POSTIZ_URL:
        missing.append("POSTIZ_URL")
    if not CREDENTIALS["email"]:
        missing.append("POSTIZ_EMAIL")
    if not CREDENTIALS["password"]:
        missing.append("POSTIZ_PASSWORD")
    
    if missing:
        print(f"❌ Missing required environment variables: {', '.join(missing)}")
        print("\nSet them in your shell or .env file:")
        print("  export POSTIZ_URL='https://your-postiz.example.com'")
        print("  export POSTIZ_EMAIL='your@email.com'")
        print("  export POSTIZ_PASSWORD='your-password'")
        sys.exit(1)


class PostizClient:
    def __init__(self):
        self.session = requests.Session()
        self._load_cookies()
    
    def _load_cookies(self):
        """Load cookies from file if they exist."""
        cookie_path = Path(COOKIE_FILE)
        if cookie_path.exists():
            # Parse Netscape cookie file format
            with open(cookie_path) as f:
                for line in f:
                    if line.startswith('#') or not line.strip():
                        continue
                    parts = line.strip().split('\t')
                    if len(parts) >= 7:
                        self.session.cookies.set(parts[5], parts[6], domain=parts[0])
    
    def _save_cookies(self):
        """Save cookies to file in Netscape format."""
        with open(COOKIE_FILE, 'w') as f:
            f.write("# Netscape HTTP Cookie File\n")
            for cookie in self.session.cookies:
                f.write(f"{cookie.domain}\tTRUE\t{cookie.path}\t"
                       f"{'TRUE' if cookie.secure else 'FALSE'}\t"
                       f"{cookie.expires or 0}\t{cookie.name}\t{cookie.value}\n")
    
    def login(self):
        """Authenticate with Postiz."""
        resp = self.session.post(
            f"{POSTIZ_URL}/api/auth/login",
            json=CREDENTIALS
        )
        if resp.status_code == 200:
            self._save_cookies()
            return True
        return False
    
    def _ensure_auth(self):
        """Ensure we're authenticated, login if needed."""
        # Try a simple request to check auth
        resp = self.session.get(f"{POSTIZ_URL}/api/integrations/list")
        if resp.status_code == 401:
            if not self.login():
                raise Exception("Failed to authenticate with Postiz")
    
    def upload_media(self, file_path: str) -> dict:
        """Upload an image and return media info."""
        self._ensure_auth()
        with open(file_path, 'rb') as f:
            resp = self.session.post(
                f"{POSTIZ_URL}/api/media/upload-simple",
                files={"file": f}
            )
        if resp.status_code != 200:
            raise Exception(f"Failed to upload media: {resp.text}")
        return resp.json()
    
    def get_posts(self, start_date: str, end_date: str) -> list:
        """Get posts in date range for deduplication check."""
        self._ensure_auth()
        resp = self.session.get(
            f"{POSTIZ_URL}/api/posts",
            params={"startDate": start_date, "endDate": end_date}
        )
        if resp.status_code != 200:
            return []
        return resp.json().get("posts", [])
    
    def create_post(self, posts: list, schedule_date: str = None, post_type: str = "schedule") -> dict:
        """
        Create a post to one or more platforms.
        
        Args:
            posts: List of {platform, content, image} dicts
            schedule_date: ISO date string for scheduling (required for 'schedule' type)
            post_type: 'schedule', 'draft', or 'now'
        """
        self._ensure_auth()
        
        post_items = []
        for post in posts:
            platform = post["platform"]
            config = PLATFORMS[platform]
            
            # Check integration ID is configured
            if not config["id"]:
                raise ValueError(
                    f"No integration ID configured for {config['name']}. "
                    f"Set POSTIZ_{platform.upper()}_ID environment variable."
                )
            
            # Validate character limit
            content = post["content"]
            if len(content) > config["char_limit"]:
                raise ValueError(
                    f"{config['name']} content exceeds {config['char_limit']} chars "
                    f"(got {len(content)}). Please shorten."
                )
            
            # Build post item
            value = [{"content": content, "image": post.get("image", [])}]
            post_items.append({
                "integration": {"id": config["id"]},
                "value": value,
                "settings": {"__type": config["type"]}
            })
        
        payload = {
            "type": post_type,
            "shortLink": False,
            "posts": post_items
        }
        
        if schedule_date and post_type == "schedule":
            payload["date"] = schedule_date
        elif post_type == "schedule" and not schedule_date:
            raise ValueError("Schedule date required for scheduled posts")
        
        resp = self.session.post(
            f"{POSTIZ_URL}/api/posts",
            json=payload
        )
        
        if resp.status_code not in (200, 201):
            raise Exception(f"Failed to create post: {resp.text}")
        
        return resp.json()


def validate_content(platform: str, content: str) -> tuple[bool, str]:
    """Validate content length for platform. Returns (is_valid, message)."""
    config = PLATFORMS.get(platform)
    if not config:
        return False, f"Unknown platform: {platform}"
    
    char_count = len(content)
    limit = config["char_limit"]
    
    if char_count > limit:
        return False, f"❌ {config['name']}: {char_count}/{limit} chars (over by {char_count - limit})"
    elif char_count > limit * 0.9:
        return True, f"⚠️  {config['name']}: {char_count}/{limit} chars (close to limit)"
    else:
        return True, f"✓ {config['name']}: {char_count}/{limit} chars"


def main():
    parser = argparse.ArgumentParser(description="Post to social media via Postiz")
    
    # Single platform mode
    parser.add_argument("--platform", "-p", choices=["x", "linkedin", "bluesky"],
                       help="Platform to post to (single platform mode)")
    parser.add_argument("--content", "-c", help="Post content (single platform mode)")
    
    # Multi-platform mode
    parser.add_argument("--x", help="Content for X/Twitter (280 chars max)")
    parser.add_argument("--linkedin", help="Content for LinkedIn (3000 chars max)")
    parser.add_argument("--bluesky", help="Content for Bluesky (300 chars max)")
    
    # Scheduling
    parser.add_argument("--schedule", "-s", help="Schedule date (ISO 8601, e.g. 2026-02-05T15:00:00Z)")
    parser.add_argument("--now", action="store_true", help="Post immediately")
    parser.add_argument("--draft", action="store_true", help="Save as draft (don't publish)")
    
    # Media
    parser.add_argument("--image", "-i", help="Path to image file to attach")
    
    # Utility
    parser.add_argument("--validate", "-v", action="store_true", 
                       help="Only validate content length, don't post")
    parser.add_argument("--list", "-l", help="List posts for date range (e.g. '7d' for last 7 days)")
    
    args = parser.parse_args()
    
    # Check config for operations that need it
    if not args.validate:
        check_config()
    
    # List mode
    if args.list:
        client = PostizClient()
        days = int(args.list.rstrip('d'))
        from datetime import timedelta
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=days)
        posts = client.get_posts(start.isoformat(), end.isoformat())
        for post in posts:
            platform = post.get("integration", {}).get("providerIdentifier", "?")
            state = post.get("state", "?")
            date = post.get("publishDate", "?")[:10]
            content = post.get("content", "")[:60]
            print(f"[{state:10}] {date} {platform:10} {content}...")
        return
    
    # Build posts list
    posts = []
    
    if args.platform and args.content:
        # Single platform mode
        posts.append({"platform": args.platform, "content": args.content})
    else:
        # Multi-platform mode
        if args.x:
            posts.append({"platform": "x", "content": args.x})
        if args.linkedin:
            posts.append({"platform": "linkedin", "content": args.linkedin})
        if args.bluesky:
            posts.append({"platform": "bluesky", "content": args.bluesky})
    
    if not posts:
        parser.print_help()
        print("\nError: No content provided. Use --platform/--content or --x/--linkedin/--bluesky")
        sys.exit(1)
    
    # Validate all content
    print("Content validation:")
    all_valid = True
    for post in posts:
        valid, msg = validate_content(post["platform"], post["content"])
        print(f"  {msg}")
        if not valid:
            all_valid = False
    
    if not all_valid:
        print("\n❌ Content validation failed. Please fix and retry.")
        sys.exit(1)
    
    if args.validate:
        print("\n✓ Validation passed (--validate mode, not posting)")
        return
    
    # Determine post type
    if args.now:
        post_type = "now"
    elif args.draft:
        post_type = "draft"
    else:
        post_type = "schedule"
        if not args.schedule:
            print("\nError: --schedule DATE required (or use --now / --draft)")
            sys.exit(1)
    
    # Handle image upload
    client = PostizClient()
    if args.image:
        print(f"\nUploading image: {args.image}")
        media = client.upload_media(args.image)
        image_data = [{"id": media.get("id"), "path": media.get("path")}]
        for post in posts:
            post["image"] = image_data
    
    # Create the post
    print(f"\nCreating {post_type} post...")
    try:
        result = client.create_post(posts, args.schedule, post_type)
        print(f"✓ Post created successfully!")
        if post_type == "schedule":
            print(f"  Scheduled for: {args.schedule}")
        elif post_type == "now":
            print(f"  Posted immediately!")
        else:
            print(f"  Saved as draft")
        
        # Show platforms
        platforms = [PLATFORMS[p["platform"]]["name"] for p in posts]
        print(f"  Platforms: {', '.join(platforms)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
