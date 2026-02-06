#!/usr/bin/env python3
"""
Camoufox Browser Script
Usage: python3 browse.py <url> [--screenshot <path>] [--text] [--wait <seconds>]
"""

import argparse
import os
import sys
import time

def main():
    parser = argparse.ArgumentParser(description='Browse with Camoufox')
    parser.add_argument('url', help='URL to visit')
    parser.add_argument('--screenshot', '-s', help='Save screenshot to path')
    parser.add_argument('--text', '-t', action='store_true', help='Print page text')
    parser.add_argument('--wait', '-w', type=int, default=3, help='Wait seconds after load')
    parser.add_argument('--profile', default=os.path.expanduser('~/.openclaw/camoufox-profile'),
                        help='Profile directory')
    args = parser.parse_args()

    try:
        from camoufox.sync_api import Camoufox
    except ImportError:
        print("ERROR: camoufox not installed. Run setup.sh first.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.profile, exist_ok=True)

    print(f"Opening {args.url}...", file=sys.stderr)
    
    with Camoufox(
        headless=False,
        os='linux',
        humanize=True,
        persistent_context=True,
        user_data_dir=args.profile
    ) as browser:
        page = browser.new_page()
        page.set_viewport_size({'width': 1920, 'height': 1080})
        page.goto(args.url, timeout=60000)
        time.sleep(args.wait)
        page.wait_for_load_state('networkidle', timeout=30000)

        title = page.title()
        print(f"Title: {title}", file=sys.stderr)

        if args.text:
            text = page.inner_text('body')
            print(text)

        if args.screenshot:
            page.screenshot(path=args.screenshot)
            print(f"Screenshot saved: {args.screenshot}", file=sys.stderr)

if __name__ == '__main__':
    main()
