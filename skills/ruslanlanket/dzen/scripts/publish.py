import sys
import os
import json
import requests
import argparse

# --- Dzen Unofficial API Constants ---
BASE_URL = "https://dzen.ru"
UPLOAD_URL = f"{BASE_URL}/api/v3/uploader/transcode" # Based on research
PUBLISH_URL = f"{BASE_URL}/api/v3/editor/entry"

def upload_media(file_path, cookies, csrf_token):
    """Uploads media (image/video) to Dzen and returns the ID."""
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return None
    
    headers = {
        "X-Csrf-Token": csrf_token,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://dzen.ru/profile/editor/",
    }
    
    with open(file_path, "rb") as f:
        files = {"file": f}
        # Note: Some versions might require 'type' or other fields in the multipart form
        response = requests.post(UPLOAD_URL, headers=headers, cookies=cookies, files=files)
    
    if response.status_code == 200:
        data = response.json()
        # Common response paths for ID
        media_id = data.get("id") or data.get("data", {}).get("id")
        return media_id
    else:
        print(f"Failed to upload {file_path}: {response.status_code} - {response.text}")
        return None

def publish_post(title, text, media_paths, cookies, csrf_token):
    """Publishes a post with text and media to Dzen."""
    headers = {
        "X-Csrf-Token": csrf_token,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://dzen.ru/profile/editor/",
    }
    
    blocks = []
    
    # Title is usually separate, but some versions use a header block
    # We'll use the title field in the main payload first.
    
    # Text block
    if text:
        blocks.append({
            "type": "text",
            "data": {"text": f"<p>{text}</p>"}
        })
    
    # Media blocks
    for path in media_paths:
        ext = os.path.splitext(path)[1].lower()
        media_id = upload_media(path, cookies, csrf_token)
        
        if media_id:
            if ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
                blocks.append({
                    "type": "image",
                    "data": {
                        "id": media_id,
                        "caption": ""
                    }
                })
            elif ext in [".mp4", ".mov", ".avi", ".mkv"]:
                blocks.append({
                    "type": "video",
                    "data": {
                        "id": media_id,
                        "service": "dzen"
                    }
                })

    payload = {
        "title": title,
        "blocks": blocks,
        "type": "article"
    }
    
    response = requests.post(PUBLISH_URL, headers=headers, cookies=cookies, json=payload)
    
    if response.status_code == 200:
        print("Successfully published to Dzen!")
        return response.json()
    else:
        print(f"Failed to publish: {response.status_code} - {response.text}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Publish a post to Dzen.")
    parser.add_argument("--title", required=True, help="Post title")
    parser.add_argument("--text", help="Post text content")
    parser.add_argument("--media", nargs="*", help="List of image/video paths")
    parser.add_argument("--config", required=True, help="Path to JSON config with cookies and csrf_token")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"Error: Config file not found: {args.config}")
        sys.exit(1)
        
    with open(args.config, "r") as f:
        config = json.load(f)
        
    cookies = config.get("cookies")
    csrf_token = config.get("csrf_token")
    
    if not cookies or not csrf_token:
        print("Error: Config must contain 'cookies' and 'csrf_token'")
        sys.exit(1)
        
    publish_post(args.title, args.text, args.media or [], cookies, csrf_token)

if __name__ == "__main__":
    main()
