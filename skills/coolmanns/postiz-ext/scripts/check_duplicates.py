#!/usr/bin/env python3
"""
Check for duplicate content in Postiz posts.

Usage:
    uv run check_duplicates.py                    # Check last 30 days
    uv run check_duplicates.py --days 7           # Check last 7 days  
    uv run check_duplicates.py --content "text"   # Check if text would be duplicate
"""

import argparse
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from difflib import SequenceMatcher

# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

import requests

POSTIZ_URL = "https://postiz.home.mykuhlmann.com"
COOKIE_FILE = "/tmp/postiz-cookies.txt"
CREDENTIALS = {
    "email": "sascha@mykuhlmann.com",
    "password": "Postiz2026!",
    "provider": "LOCAL"
}


def get_session():
    """Get authenticated session."""
    session = requests.Session()
    
    # Try to load existing cookies
    try:
        with open(COOKIE_FILE) as f:
            for line in f:
                if line.startswith('#') or not line.strip():
                    continue
                parts = line.strip().split('\t')
                if len(parts) >= 7:
                    session.cookies.set(parts[5], parts[6], domain=parts[0])
    except FileNotFoundError:
        pass
    
    # Check if auth works
    resp = session.get(f"{POSTIZ_URL}/api/integrations/list")
    if resp.status_code == 401:
        # Login
        resp = session.post(f"{POSTIZ_URL}/api/auth/login", json=CREDENTIALS)
        if resp.status_code != 200:
            raise Exception("Failed to authenticate")
        # Save cookies
        with open(COOKIE_FILE, 'w') as f:
            f.write("# Netscape HTTP Cookie File\n")
            for cookie in session.cookies:
                f.write(f"{cookie.domain}\tTRUE\t{cookie.path}\t"
                       f"{'TRUE' if cookie.secure else 'FALSE'}\t"
                       f"{cookie.expires or 0}\t{cookie.name}\t{cookie.value}\n")
    
    return session


def similarity(a: str, b: str) -> float:
    """Calculate string similarity ratio (0-1)."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def main():
    parser = argparse.ArgumentParser(description="Check for duplicate posts in Postiz")
    parser.add_argument("--days", "-d", type=int, default=30, help="Days to look back (default: 30)")
    parser.add_argument("--content", "-c", help="Check if this content would be a duplicate")
    parser.add_argument("--threshold", "-t", type=float, default=0.8, 
                       help="Similarity threshold for duplicates (default: 0.8)")
    args = parser.parse_args()
    
    session = get_session()
    
    # Get posts
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=args.days)
    
    resp = session.get(f"{POSTIZ_URL}/api/posts", params={
        "startDate": start.isoformat(),
        "endDate": end.isoformat()
    })
    
    if resp.status_code != 200:
        print(f"Error fetching posts: {resp.text}")
        return
    
    posts = resp.json().get("posts", [])
    print(f"Found {len(posts)} posts in last {args.days} days\n")
    
    if args.content:
        # Check if new content would be duplicate
        print(f"Checking if new content is a duplicate:")
        print(f"  \"{args.content[:60]}{'...' if len(args.content) > 60 else ''}\"\n")
        
        duplicates = []
        for post in posts:
            content = post.get("content", "")
            sim = similarity(args.content, content)
            if sim >= args.threshold:
                duplicates.append({
                    "similarity": sim,
                    "platform": post.get("integration", {}).get("providerIdentifier", "?"),
                    "state": post.get("state", "?"),
                    "date": post.get("publishDate", "?")[:10],
                    "content": content[:80]
                })
        
        if duplicates:
            print(f"⚠️  Found {len(duplicates)} potential duplicate(s):\n")
            for d in sorted(duplicates, key=lambda x: -x["similarity"]):
                print(f"  [{d['similarity']:.0%} similar] {d['date']} {d['platform']} ({d['state']})")
                print(f"    \"{d['content']}...\"\n")
        else:
            print("✓ No duplicates found - safe to post!")
        return
    
    # Find duplicates among existing posts
    by_platform = defaultdict(list)
    for post in posts:
        platform = post.get("integration", {}).get("providerIdentifier", "unknown")
        by_platform[platform].append(post)
    
    print("Checking for duplicates by platform:\n")
    
    total_dupes = 0
    for platform, platform_posts in by_platform.items():
        dupes = []
        for i, p1 in enumerate(platform_posts):
            for p2 in platform_posts[i+1:]:
                c1, c2 = p1.get("content", ""), p2.get("content", "")
                sim = similarity(c1, c2)
                if sim >= args.threshold:
                    dupes.append({
                        "similarity": sim,
                        "post1": {"id": p1["id"], "date": p1.get("publishDate", "?")[:10], 
                                 "state": p1.get("state"), "content": c1[:50]},
                        "post2": {"id": p2["id"], "date": p2.get("publishDate", "?")[:10],
                                 "state": p2.get("state"), "content": c2[:50]}
                    })
        
        if dupes:
            print(f"⚠️  {platform}: {len(dupes)} duplicate pair(s)")
            for d in sorted(dupes, key=lambda x: -x["similarity"])[:5]:
                print(f"    [{d['similarity']:.0%}] {d['post1']['date']} vs {d['post2']['date']}")
                print(f"      1: \"{d['post1']['content']}...\" ({d['post1']['state']})")
                print(f"      2: \"{d['post2']['content']}...\" ({d['post2']['state']})")
            total_dupes += len(dupes)
        else:
            print(f"✓ {platform}: No duplicates")
        print()
    
    if total_dupes == 0:
        print("✓ No duplicates found across all platforms!")
    else:
        print(f"⚠️  Total: {total_dupes} duplicate pair(s) found")
        print("\nTo delete duplicates, use the Postiz web UI or:")
        print("  curl -s -b /tmp/postiz-cookies.txt -X DELETE 'https://postiz.home.mykuhlmann.com/api/posts/POST_ID'")


if __name__ == "__main__":
    main()
