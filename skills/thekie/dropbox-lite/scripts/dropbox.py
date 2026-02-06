#!/usr/bin/env python3
"""
Dropbox helper for Atlas/Clawdbot
- List folders/files
- Download files
- Upload files
- Search
- Automatic token refresh on 401
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import os
import sys
import argparse
from pathlib import Path

CONFIG_PATH = Path.home() / ".config/atlas/dropbox.env"

# Global config cache
_config = None


def load_config():
    """Load all credentials from the .env file."""
    global _config
    if _config is not None:
        return _config
    
    config = {}
    with open(CONFIG_PATH) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                config[key.strip()] = value.strip()
    
    _config = config
    return config


def save_config(config):
    """Save config back to .env file."""
    global _config
    lines = []
    for key, value in config.items():
        lines.append(f"{key}={value}")
    
    with open(CONFIG_PATH, 'w') as f:
        f.write("\n".join(lines) + "\n")
    
    _config = config


def refresh_access_token():
    """Refresh the access token using the refresh token."""
    config = load_config()
    
    refresh_token = config.get("DROPBOX_REFRESH_TOKEN")
    app_key = config.get("DROPBOX_APP_KEY")
    app_secret = config.get("DROPBOX_APP_SECRET")
    
    if not all([refresh_token, app_key, app_secret]):
        raise ValueError("Missing DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, or DROPBOX_APP_SECRET in config")
    
    # Build the token refresh request
    url = "https://api.dropboxapi.com/oauth2/token"
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": app_key,
        "client_secret": app_secret
    }).encode()
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            new_access_token = result.get("access_token")
            
            if not new_access_token:
                raise ValueError("No access_token in refresh response")
            
            # Update config with new access token
            config["DROPBOX_ACCESS_TOKEN"] = new_access_token
            save_config(config)
            
            print("🔄 Access token refreshed", file=sys.stderr)
            return new_access_token
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        raise RuntimeError(f"Token refresh failed: {e.code} - {error_body}")


def get_access_token():
    """Get current access token from config."""
    config = load_config()
    return config.get("DROPBOX_ACCESS_TOKEN")


def api_call(endpoint, data=None, content_type="application/json", retry_on_401=True):
    """Make a Dropbox API call with automatic token refresh."""
    token = get_access_token()
    url = f"https://api.dropboxapi.com/2/{endpoint}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": content_type
    }
    
    req = urllib.request.Request(
        url,
        headers=headers,
        data=json.dumps(data).encode() if data else None
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 401 and retry_on_401:
            # Token expired, refresh and retry
            global _config
            _config = None  # Clear cache
            refresh_access_token()
            return api_call(endpoint, data, content_type, retry_on_401=False)
        raise


def content_api_call(endpoint, api_arg, dest_path=None, retry_on_401=True):
    """Make a Dropbox content API call (download) with automatic token refresh."""
    token = get_access_token()
    url = f"https://content.dropboxapi.com/2/{endpoint}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Dropbox-API-Arg": json.dumps(api_arg)
    }
    
    req = urllib.request.Request(url, headers=headers, data=b"")
    
    try:
        with urllib.request.urlopen(req) as resp:
            if dest_path:
                with open(dest_path, 'wb') as f:
                    f.write(resp.read())
                return {"saved": dest_path}
            return resp.read()
    except urllib.error.HTTPError as e:
        if e.code == 401 and retry_on_401:
            global _config
            _config = None
            refresh_access_token()
            return content_api_call(endpoint, api_arg, dest_path, retry_on_401=False)
        raise


def content_upload(local_path, dropbox_path, mode="add", retry_on_401=True):
    """Upload a file to Dropbox with automatic token refresh."""
    token = get_access_token()
    url = "https://content.dropboxapi.com/2/files/upload"
    
    with open(local_path, 'rb') as f:
        file_data = f.read()
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Dropbox-API-Arg": json.dumps({
            "path": dropbox_path,
            "mode": mode,
            "autorename": True,
            "mute": False
        }),
        "Content-Type": "application/octet-stream"
    }
    
    req = urllib.request.Request(url, headers=headers, data=file_data)
    
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 401 and retry_on_401:
            global _config
            _config = None
            refresh_access_token()
            return content_upload(local_path, dropbox_path, mode, retry_on_401=False)
        raise


def list_folder(path=""):
    """List contents of a folder."""
    data = api_call("files/list_folder", {"path": path, "limit": 100})
    entries = data.get("entries", [])
    
    while data.get("has_more"):
        data = api_call("files/list_folder/continue", {"cursor": data["cursor"]})
        entries.extend(data.get("entries", []))
    
    return entries


def search(query, path=""):
    """Search for files/folders."""
    data = api_call("files/search_v2", {
        "query": query,
        "options": {"path": path, "max_results": 50}
    })
    return data.get("matches", [])


def download(dropbox_path, local_path=None):
    """Download a file."""
    if not local_path:
        local_path = os.path.basename(dropbox_path)
    return content_api_call("files/download", {"path": dropbox_path}, local_path)


def upload(local_path, dropbox_path):
    """Upload a file."""
    return content_upload(local_path, dropbox_path)


def create_folder(path):
    """Create a folder."""
    return api_call("files/create_folder_v2", {"path": path, "autorename": False})


def get_account(retry_on_401=True):
    """Get current account info with automatic token refresh."""
    token = get_access_token()
    req = urllib.request.Request(
        "https://api.dropboxapi.com/2/users/get_current_account",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        data=b"null"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 401 and retry_on_401:
            global _config
            _config = None
            refresh_access_token()
            return get_account(retry_on_401=False)
        raise


def main():
    parser = argparse.ArgumentParser(description="Dropbox CLI for Atlas")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # list
    ls_parser = subparsers.add_parser("ls", help="List folder contents")
    ls_parser.add_argument("path", nargs="?", default="", help="Folder path")
    
    # search
    search_parser = subparsers.add_parser("search", help="Search files")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--path", default="", help="Limit to path")
    
    # download
    dl_parser = subparsers.add_parser("download", help="Download file")
    dl_parser.add_argument("path", help="Dropbox path")
    dl_parser.add_argument("--output", "-o", help="Local output path")
    
    # upload
    ul_parser = subparsers.add_parser("upload", help="Upload file")
    ul_parser.add_argument("local", help="Local file path")
    ul_parser.add_argument("remote", help="Dropbox destination path")
    
    # account
    subparsers.add_parser("account", help="Show account info")
    
    # mkdir
    mkdir_parser = subparsers.add_parser("mkdir", help="Create folder")
    mkdir_parser.add_argument("path", help="Folder path to create")
    
    args = parser.parse_args()
    
    if args.command == "ls":
        entries = list_folder(args.path)
        for e in entries:
            icon = "📁" if e['.tag'] == 'folder' else "📄"
            size = f" ({e.get('size', 0)} bytes)" if e['.tag'] == 'file' else ""
            print(f"{icon} {e['name']}{size}")
    
    elif args.command == "search":
        matches = search(args.query, args.path)
        for m in matches:
            meta = m.get('metadata', {}).get('metadata', {})
            icon = "📁" if meta.get('.tag') == 'folder' else "📄"
            print(f"{icon} {meta.get('path_display', 'unknown')}")
    
    elif args.command == "download":
        result = download(args.path, args.output)
        print(f"✅ Downloaded to: {result.get('saved', args.output or os.path.basename(args.path))}")
    
    elif args.command == "upload":
        result = upload(args.local, args.remote)
        print(f"✅ Uploaded to: {result.get('path_display', args.remote)}")
    
    elif args.command == "account":
        info = get_account()
        print(f"Account: {info['name']['display_name']}")
        print(f"Email: {info['email']}")
    
    elif args.command == "mkdir":
        result = create_folder(args.path)
        print(f"✅ Created: {result['metadata']['path_display']}")


if __name__ == "__main__":
    main()
