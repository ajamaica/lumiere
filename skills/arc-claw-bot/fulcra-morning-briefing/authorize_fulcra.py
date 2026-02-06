#!/usr/bin/env python3
"""
One-time Fulcra OAuth2 authorization via device flow.
Run this interactively — your human approves on their phone/browser.

Usage:
    python3 authorize_fulcra.py

Requires: pip3 install fulcra-api
"""

import json
import os
from datetime import datetime

from fulcra_api.core import FulcraAPI

TOKEN_DIR = os.path.expanduser("~/.config/fulcra")
TOKEN_FILE = os.path.join(TOKEN_DIR, "token.json")


def main():
    print("🔐 Fulcra Authorization — Device Flow")
    print("=" * 45)
    print()
    print("This will open a device flow. Your human needs to:")
    print("  1. Visit the URL shown below")
    print("  2. Enter the code")
    print("  3. Log in / approve access")
    print()

    api = FulcraAPI()
    api.authorize()

    # Save token
    os.makedirs(TOKEN_DIR, exist_ok=True)
    token_data = {
        "access_token": api.fulcra_cached_access_token,
        "expiration": api.fulcra_cached_access_token_expiration.isoformat()
            if api.fulcra_cached_access_token_expiration else None,
        "user_id": api.get_fulcra_userid(),
        "authorized_at": datetime.now().isoformat(),
    }

    with open(TOKEN_FILE, "w") as f:
        json.dump(token_data, f, indent=2)

    print()
    print(f"✅ Token saved to {TOKEN_FILE}")
    print(f"   User ID: {token_data['user_id']}")
    print(f"   Expires: {token_data['expiration']}")
    print()
    print("You're all set! Run collect_briefing_data.py to get your morning briefing data.")


if __name__ == "__main__":
    main()
