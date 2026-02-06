#!/usr/bin/env python3
"""
Open Camoufox for manual login via VNC.
Session will be saved to profile for future automated use.

Usage:
  DISPLAY=:1 python3 login_session.py <url> [--timeout <minutes>]

Requires VNC server running on the display.
"""

import argparse
import os
import sys
import time

def main():
    parser = argparse.ArgumentParser(description='Open browser for manual login')
    parser.add_argument('url', help='URL to open (e.g., https://x.com/login)')
    parser.add_argument('--timeout', '-t', type=int, default=10,
                        help='Minutes to keep browser open (default: 10)')
    parser.add_argument('--profile', default=os.path.expanduser('~/.openclaw/camoufox-profile'),
                        help='Profile directory')
    args = parser.parse_args()

    if not os.environ.get('DISPLAY'):
        print("ERROR: DISPLAY not set. Run with DISPLAY=:1 or use VNC.", file=sys.stderr)
        print("Example: DISPLAY=:1 python3 login_session.py https://x.com/login", file=sys.stderr)
        sys.exit(1)

    try:
        from camoufox.sync_api import Camoufox
    except ImportError:
        print("ERROR: camoufox not installed. Run setup.sh first.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.profile, exist_ok=True)

    print(f"Opening {args.url} for manual login...")
    print(f"Browser will stay open for {args.timeout} minutes.")
    print(f"Session will be saved to: {args.profile}")
    print("Close browser or wait for timeout when done.")

    with Camoufox(
        headless=False,
        os='linux',
        humanize=True,
        persistent_context=True,
        user_data_dir=args.profile
    ) as browser:
        page = browser.new_page()
        page.set_viewport_size({'width': 1400, 'height': 900})
        page.goto(args.url, timeout=60000)
        
        print(f"\nBrowser open. Waiting {args.timeout} minutes...")
        try:
            time.sleep(args.timeout * 60)
        except KeyboardInterrupt:
            print("\nInterrupted.")
        
        print("Session saved!")

if __name__ == '__main__':
    main()
