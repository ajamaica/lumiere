#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-auth-oauthlib>=1.0.0",
#     "google-auth>=2.0.0",
# ]
# ///
"""
Google Workspace OAuth - Simple Auth for AI Agents

Commands:
    uv run auth.py login              # Opens browser to hosted OAuth (easiest)
    uv run auth.py save <TOKEN>       # Save token from hosted OAuth
    uv run auth.py status             # Check if authenticated
    uv run auth.py logout             # Remove credentials

Advanced (bring your own OAuth app):
    uv run auth.py login --local      # Returns auth URL for local OAuth
    uv run auth.py complete <URL>     # Complete local auth with redirect URL
"""

# Hosted OAuth URL - deploy your own or use the default
OAUTH_WORKER_URL = "https://ezagentauth.com"

import base64
import json
import os
import sys
import webbrowser
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/chat.spaces.readonly",
    "https://www.googleapis.com/auth/chat.messages",
]

CREDS_DIR = Path.home() / ".simple-google-workspace"
TOKEN_FILE = CREDS_DIR / "token.json"
CLIENT_SECRETS_FILE = CREDS_DIR / "client_secrets.json"
FLOW_STATE_FILE = CREDS_DIR / "flow_state.json"


def get_client_config():
    """Get OAuth client configuration."""
    if CLIENT_SECRETS_FILE.exists():
        return str(CLIENT_SECRETS_FILE)

    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")

    if client_id and client_secret:
        return {
            "installed": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost"],
            }
        }

    print("SETUP_REQUIRED")
    print(f"Save OAuth credentials to: {CLIENT_SECRETS_FILE}")
    print("Or set: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")
    sys.exit(1)


def login(local: bool = False):
    """Start OAuth flow."""
    CREDS_DIR.mkdir(exist_ok=True)

    if not local:
        # Hosted OAuth - open browser to worker
        login_url = f"{OAUTH_WORKER_URL}/login"
        print(f"Opening browser to: {login_url}")
        print("After authenticating, copy the token and run:")
        print('  uv run auth.py save "<TOKEN>"')
        webbrowser.open(login_url)
        return

    # Local OAuth - requires CLIENT_ID/SECRET
    client_config = get_client_config()

    if isinstance(client_config, str):
        flow = InstalledAppFlow.from_client_secrets_file(client_config, SCOPES)
    else:
        flow = InstalledAppFlow.from_client_config(client_config, SCOPES)

    flow.redirect_uri = "http://localhost:8085/"
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    # Save state for complete step
    flow_data = {
        "client_config": client_config if isinstance(client_config, dict) else None,
        "client_secrets_file": client_config if isinstance(client_config, str) else None,
        "redirect_uri": flow.redirect_uri,
    }
    with open(FLOW_STATE_FILE, "w") as f:
        json.dump(flow_data, f)

    # Simple output - just the URL
    print(auth_url)


def save(token: str):
    """Save token from hosted OAuth."""
    CREDS_DIR.mkdir(exist_ok=True)

    try:
        # Decode base64 token
        creds_json = base64.b64decode(token).decode("utf-8")
        creds_data = json.loads(creds_json)

        # Validate required fields
        required = ["token", "refresh_token", "client_id", "client_secret"]
        missing = [f for f in required if f not in creds_data]
        if missing:
            print(f"ERROR: Invalid token (missing: {', '.join(missing)})")
            sys.exit(1)

        # Save in google-auth format
        with open(TOKEN_FILE, "w") as f:
            json.dump(creds_data, f, indent=2)

        print("SUCCESS")
        print(f"Credentials saved to: {TOKEN_FILE}")

    except Exception as e:
        print(f"ERROR: {e}")
        print("Make sure you copied the full token from the OAuth page.")
        sys.exit(1)


def complete(redirect_url: str):
    """Complete auth with the redirect URL user pasted."""
    if not FLOW_STATE_FILE.exists():
        print("ERROR: Run login first")
        sys.exit(1)

    with open(FLOW_STATE_FILE) as f:
        flow_data = json.load(f)

    if flow_data.get("client_secrets_file"):
        flow = InstalledAppFlow.from_client_secrets_file(flow_data["client_secrets_file"], SCOPES)
    else:
        flow = InstalledAppFlow.from_client_config(flow_data["client_config"], SCOPES)

    flow.redirect_uri = flow_data["redirect_uri"]

    try:
        parsed = urlparse(redirect_url)
        params = parse_qs(parsed.query)
        code = params.get("code", [None])[0]

        if not code:
            print("ERROR: No code in URL")
            sys.exit(1)

        flow.fetch_token(code=code)

        with open(TOKEN_FILE, "w") as f:
            f.write(flow.credentials.to_json())

        FLOW_STATE_FILE.unlink(missing_ok=True)
        print("SUCCESS")

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


def status():
    """Check auth status."""
    if not TOKEN_FILE.exists():
        print("NOT_AUTHENTICATED")
        sys.exit(1)

    with open(TOKEN_FILE) as f:
        data = json.load(f)

    creds = Credentials.from_authorized_user_info(data, SCOPES)

    if creds.expired and creds.refresh_token:
        from google.auth.transport.requests import Request
        try:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as f:
                f.write(creds.to_json())
        except Exception:
            print("NOT_AUTHENTICATED")
            sys.exit(1)

    if creds.valid:
        print("AUTHENTICATED")
    else:
        print("NOT_AUTHENTICATED")
        sys.exit(1)


def logout():
    """Remove credentials."""
    for f in [TOKEN_FILE, FLOW_STATE_FILE]:
        if f.exists():
            f.unlink()
    print("LOGGED_OUT")


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("--help", "-h", "help"):
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1].lower()

    if cmd == "login":
        # Check for --local flag
        local = "--local" in sys.argv
        login(local=local)
    elif cmd == "save":
        if len(sys.argv) < 3:
            print("ERROR: Provide token from OAuth page")
            sys.exit(1)
        save(sys.argv[2])
    elif cmd == "complete":
        if len(sys.argv) < 3:
            print("ERROR: Provide redirect URL")
            sys.exit(1)
        complete(sys.argv[2])
    elif cmd == "status":
        status()
    elif cmd == "logout":
        logout()
    else:
        print(f"Unknown: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
