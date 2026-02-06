#!/usr/bin/env python3
"""LinkedIn automation CLI — single entry point for all actions."""
import sys, os, json, argparse, logging

# Ensure lib is importable
sys.path.insert(0, os.path.dirname(__file__))

from lib.browser import check_session
from lib.actions import create_post, comment_on_post, delete_comment, edit_comment, repost_with_thoughts
from lib.feed import read_feed
from lib.profile import scrape_activity
from lib.analytics import get_post_analytics, get_profile_stats
from lib.like_monitor import scan_recent_likes
from lib.style_learner import learn_profile, get_style


def main():
    parser = argparse.ArgumentParser(description="LinkedIn automation CLI")
    sub = parser.add_subparsers(dest="action")

    # check-session
    sub.add_parser("check-session", help="Check if LinkedIn session is valid")

    # feed
    p_feed = sub.add_parser("feed", help="Read LinkedIn feed")
    p_feed.add_argument("--count", type=int, default=10)

    # post
    p_post = sub.add_parser("post", help="Create a new post")
    p_post.add_argument("--text", required=True)
    p_post.add_argument("--image", default=None)

    # comment
    p_comment = sub.add_parser("comment", help="Comment on a post")
    p_comment.add_argument("--url", required=True)
    p_comment.add_argument("--text", required=True)

    # delete-comment
    p_del = sub.add_parser("delete-comment", help="Delete a comment by text match")
    p_del.add_argument("--url", required=True)
    p_del.add_argument("--match", required=True, help="Text fragment to identify the comment")

    # edit-comment
    p_edit = sub.add_parser("edit-comment", help="Edit a comment by text match")
    p_edit.add_argument("--url", required=True)
    p_edit.add_argument("--match", required=True, help="Text fragment to identify the comment")
    p_edit.add_argument("--text", required=True, help="New comment text")

    # repost
    p_repost = sub.add_parser("repost", help="Repost with your thoughts")
    p_repost.add_argument("--url", required=True)
    p_repost.add_argument("--thoughts", required=True)

    # activity
    p_activity = sub.add_parser("activity", help="Scrape profile activity")
    p_activity.add_argument("--profile-url", required=True)
    p_activity.add_argument("--count", type=int, default=10)

    # analytics
    p_analytics = sub.add_parser("analytics", help="Get engagement stats for recent posts")
    p_analytics.add_argument("--count", type=int, default=10)

    # profile-stats
    sub.add_parser("profile-stats", help="Get profile-level stats (views, followers)")

    # scan-likes
    p_likes = sub.add_parser("scan-likes", help="Scan recent likes for new ones since last check")
    p_likes.add_argument("--count", type=int, default=15)

    # learn-profile
    p_learn = sub.add_parser("learn-profile", help="Scan your posts/comments to learn your voice and topics")
    p_learn.add_argument("--count", type=int, default=15)

    # get-style
    sub.add_parser("get-style", help="Show the learned style profile")

    args = parser.parse_args()

    if os.environ.get("LINKEDIN_DEBUG"):
        logging.basicConfig(level=logging.DEBUG)

    if not args.action:
        parser.print_help()
        sys.exit(1)

    if args.action == "check-session":
        result = check_session()
    elif args.action == "feed":
        result = read_feed(args.count)
    elif args.action == "post":
        result = create_post(args.text, args.image)
    elif args.action == "comment":
        result = comment_on_post(args.url, args.text)
    elif args.action == "delete-comment":
        result = delete_comment(args.url, args.match)
    elif args.action == "edit-comment":
        result = edit_comment(args.url, args.match, args.text)
    elif args.action == "repost":
        result = repost_with_thoughts(args.url, args.thoughts)
    elif args.action == "activity":
        result = scrape_activity(args.profile_url, args.count)
    elif args.action == "analytics":
        result = get_post_analytics(args.count)
    elif args.action == "profile-stats":
        result = get_profile_stats()
    elif args.action == "scan-likes":
        result = scan_recent_likes(args.count)
    elif args.action == "learn-profile":
        result = learn_profile(args.count)
    elif args.action == "get-style":
        result = get_style() or {"error": "No style learned yet. Run: linkedin.py learn-profile"}
    else:
        parser.print_help()
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
