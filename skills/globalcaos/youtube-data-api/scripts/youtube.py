#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-api-python-client>=2.0.0",
#     "google-auth-oauthlib>=1.0.0",
#     "google-auth-httplib2>=0.1.0",
# ]
# ///
"""
YouTube Data API CLI - Self-contained script for OpenClaw skill.

Usage:
    uv run youtube.py <command> [options]

Commands:
    auth                    Authenticate with YouTube (opens browser)
    accounts                List authenticated accounts
    channel [ID]            Get channel info (yours if no ID)
    subscriptions           List your subscriptions
    playlists               List your playlists
    playlist-items ID       List videos in a playlist
    search QUERY            Search YouTube videos
    video ID                Get video details
    captions ID             List available captions for a video
    liked                   List your liked videos

Examples:
    uv run youtube.py auth
    uv run youtube.py search "python tutorial" -l 5
    uv run youtube.py video dQw4w9WgXcQ -v
"""

import argparse
import os
import sys
import pickle
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl'
]

CONFIG_DIR = Path.home() / '.config' / 'youtube-skill'
# Support multiple credential locations for flexibility
CREDENTIAL_PATHS = [
    Path.home() / '.config' / 'youtube-skill' / 'credentials.json',
    Path.home() / '.config' / 'gogcli' / 'credentials.json',  # Shared with gog
]
DEFAULT_ACCOUNT = 'default'

_current_account = DEFAULT_ACCOUNT


def get_credentials_file():
    """Find OAuth credentials file."""
    for path in CREDENTIAL_PATHS:
        if path.exists():
            return path
    return None


def get_token_file(account=None):
    """Get token file path for account."""
    acc = account or _current_account
    if acc == DEFAULT_ACCOUNT:
        return CONFIG_DIR / 'token.pickle'
    return CONFIG_DIR / f'token.{acc}.pickle'


def get_youtube_service(account=None):
    """Get authenticated YouTube service."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    token_file = get_token_file(account)

    creds = None
    if token_file.exists():
        with open(token_file, 'rb') as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            creds_file = get_credentials_file()
            if not creds_file:
                print("Error: OAuth credentials not found.", file=sys.stderr)
                print("Please place credentials.json in one of:", file=sys.stderr)
                for p in CREDENTIAL_PATHS:
                    print(f"  - {p}", file=sys.stderr)
                print("\nTo get credentials:", file=sys.stderr)
                print("1. Go to https://console.cloud.google.com/apis/credentials", file=sys.stderr)
                print("2. Create OAuth 2.0 Client ID (Desktop app)", file=sys.stderr)
                print("3. Download JSON and save as credentials.json", file=sys.stderr)
                sys.exit(1)

            flow = InstalledAppFlow.from_client_secrets_file(str(creds_file), SCOPES)
            creds = flow.run_local_server(port=0)

        with open(token_file, 'wb') as token:
            pickle.dump(creds, token)

    return build('youtube', 'v3', credentials=creds)


def cmd_auth(args):
    """Authenticate with YouTube."""
    token_file = get_token_file()
    if token_file.exists():
        token_file.unlink()
    get_youtube_service()
    acc_name = _current_account if _current_account != DEFAULT_ACCOUNT else 'default'
    print(f"YouTube authentication successful! (account: {acc_name})")


def cmd_accounts(args):
    """List authenticated accounts."""
    print("Authenticated accounts:")
    if not CONFIG_DIR.exists():
        print("  (none)")
        return
    found = False
    for f in CONFIG_DIR.glob('token*.pickle'):
        name = f.stem.replace('token.', '').replace('token', 'default')
        print(f"  - {name}")
        found = True
    if not found:
        print("  (none)")


def cmd_subscriptions(args):
    """List subscriptions."""
    youtube = get_youtube_service()
    request = youtube.subscriptions().list(
        part='snippet',
        mine=True,
        maxResults=args.limit
    )
    response = request.execute()

    for item in response.get('items', []):
        snippet = item['snippet']
        print(f"{snippet['title']}")
        if args.verbose:
            print(f"  Channel: {snippet['resourceId']['channelId']}")
            print(f"  Description: {snippet['description'][:100]}...")


def cmd_playlists(args):
    """List playlists."""
    youtube = get_youtube_service()
    request = youtube.playlists().list(
        part='snippet,contentDetails',
        mine=True,
        maxResults=args.limit
    )
    response = request.execute()

    for item in response.get('items', []):
        snippet = item['snippet']
        count = item['contentDetails']['itemCount']
        print(f"{snippet['title']} ({count} videos)")
        if args.verbose:
            print(f"  ID: {item['id']}")
            print(f"  Description: {snippet['description'][:100]}...")


def cmd_playlist_items(args):
    """List items in a playlist."""
    youtube = get_youtube_service()
    request = youtube.playlistItems().list(
        part='snippet',
        playlistId=args.playlist_id,
        maxResults=args.limit
    )
    response = request.execute()

    for item in response.get('items', []):
        snippet = item['snippet']
        video_id = snippet['resourceId']['videoId']
        print(f"{snippet['title']}")
        print(f"  https://youtube.com/watch?v={video_id}")


def cmd_search(args):
    """Search YouTube."""
    youtube = get_youtube_service()
    request = youtube.search().list(
        part='snippet',
        q=args.query,
        type='video',
        maxResults=args.limit
    )
    response = request.execute()

    for item in response.get('items', []):
        snippet = item['snippet']
        video_id = item['id']['videoId']
        print(f"{snippet['title']}")
        print(f"  https://youtube.com/watch?v={video_id}")
        if args.verbose:
            print(f"  Channel: {snippet['channelTitle']}")
            print(f"  Published: {snippet['publishedAt']}")


def cmd_video(args):
    """Get video details."""
    youtube = get_youtube_service()
    request = youtube.videos().list(
        part='snippet,contentDetails,statistics',
        id=args.video_id
    )
    response = request.execute()

    if not response.get('items'):
        print("Video not found")
        return

    item = response['items'][0]
    snippet = item['snippet']
    stats = item.get('statistics', {})

    print(f"Title: {snippet['title']}")
    print(f"Channel: {snippet['channelTitle']}")
    print(f"Published: {snippet['publishedAt']}")
    print(f"Views: {stats.get('viewCount', 'N/A')}")
    print(f"Likes: {stats.get('likeCount', 'N/A')}")
    print(f"Duration: {item['contentDetails']['duration']}")
    if args.verbose:
        print(f"\nDescription:\n{snippet['description']}")


def cmd_captions(args):
    """List video captions."""
    youtube = get_youtube_service()
    request = youtube.captions().list(
        part='snippet',
        videoId=args.video_id
    )
    response = request.execute()

    if not response.get('items'):
        print("No captions available")
        return

    for item in response['items']:
        snippet = item['snippet']
        kind = 'auto' if snippet['trackKind'] == 'ASR' else 'manual'
        print(f"{snippet['language']} - {snippet['name']} ({kind})")
        print(f"  ID: {item['id']}")


def cmd_liked(args):
    """List liked videos."""
    youtube = get_youtube_service()
    request = youtube.videos().list(
        part='snippet',
        myRating='like',
        maxResults=args.limit
    )
    response = request.execute()

    for item in response.get('items', []):
        snippet = item['snippet']
        print(f"{snippet['title']}")
        print(f"  https://youtube.com/watch?v={item['id']}")


def cmd_channel(args):
    """Get channel info."""
    youtube = get_youtube_service()
    if args.channel_id:
        request = youtube.channels().list(
            part='snippet,statistics',
            id=args.channel_id
        )
    else:
        request = youtube.channels().list(
            part='snippet,statistics',
            mine=True
        )
    response = request.execute()

    if not response.get('items'):
        print("Channel not found")
        return

    for item in response['items']:
        snippet = item['snippet']
        stats = item.get('statistics', {})
        print(f"Channel: {snippet['title']}")
        print(f"  ID: {item['id']}")
        print(f"  Subscribers: {stats.get('subscriberCount', 'hidden')}")
        print(f"  Videos: {stats.get('videoCount', 'N/A')}")
        print(f"  Views: {stats.get('viewCount', 'N/A')}")
        if args.verbose:
            print(f"\nDescription:\n{snippet['description']}")


def main():
    global _current_account

    parser = argparse.ArgumentParser(
        description='YouTube Data API CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('-a', '--account', default=DEFAULT_ACCOUNT,
                        help='Account name (default, work, etc.)')
    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # auth
    auth_parser = subparsers.add_parser('auth', help='Authenticate with YouTube')
    auth_parser.set_defaults(func=cmd_auth)

    # accounts
    acc_parser = subparsers.add_parser('accounts', help='List authenticated accounts')
    acc_parser.set_defaults(func=cmd_accounts)

    # channel
    ch_parser = subparsers.add_parser('channel', aliases=['ch'], help='Get channel info')
    ch_parser.add_argument('channel_id', nargs='?', help='Channel ID (omit for your channel)')
    ch_parser.set_defaults(func=cmd_channel)

    # subscriptions
    subs_parser = subparsers.add_parser('subscriptions', aliases=['subs'], help='List subscriptions')
    subs_parser.add_argument('-l', '--limit', type=int, default=25, help='Max results')
    subs_parser.set_defaults(func=cmd_subscriptions)

    # playlists
    pl_parser = subparsers.add_parser('playlists', aliases=['pl'], help='List playlists')
    pl_parser.add_argument('-l', '--limit', type=int, default=25, help='Max results')
    pl_parser.set_defaults(func=cmd_playlists)

    # playlist items
    pli_parser = subparsers.add_parser('playlist-items', aliases=['pli'], help='List playlist items')
    pli_parser.add_argument('playlist_id', help='Playlist ID')
    pli_parser.add_argument('-l', '--limit', type=int, default=25, help='Max results')
    pli_parser.set_defaults(func=cmd_playlist_items)

    # search
    search_parser = subparsers.add_parser('search', help='Search YouTube')
    search_parser.add_argument('query', help='Search query')
    search_parser.add_argument('-l', '--limit', type=int, default=10, help='Max results')
    search_parser.set_defaults(func=cmd_search)

    # video
    video_parser = subparsers.add_parser('video', help='Get video details')
    video_parser.add_argument('video_id', help='Video ID')
    video_parser.set_defaults(func=cmd_video)

    # captions
    cap_parser = subparsers.add_parser('captions', aliases=['caps'], help='List video captions')
    cap_parser.add_argument('video_id', help='Video ID')
    cap_parser.set_defaults(func=cmd_captions)

    # liked
    liked_parser = subparsers.add_parser('liked', help='List liked videos')
    liked_parser.add_argument('-l', '--limit', type=int, default=25, help='Max results')
    liked_parser.set_defaults(func=cmd_liked)

    args = parser.parse_args()
    _current_account = args.account

    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == '__main__':
    main()
