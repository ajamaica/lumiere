#!/usr/bin/env python3
"""
Upload a file to Manus
Usage: python3 upload_file.py /path/to/file.txt
"""

import os
import sys
import json
import requests

API_BASE = "https://api.manus.ai/v1"

def get_api_key():
    api_key = os.environ.get("MANUS_API_KEY")
    config_path = os.path.expanduser("~/.clawdbot/clawdbot.json")
    if os.path.exists(config_path):
        try:
            with open(config_path) as f:
                config = json.load(f)
            api_key = config.get("skills", {}).get("manus", {}).get("apiKey", api_key)
        except:
            pass
    return api_key

def upload_file(api_key, file_path):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    
    url = f"{API_BASE}/files"
    headers = {
        "API_KEY": api_key
    }
    
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f)}
        response = requests.post(url, files=files, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error uploading: {response.text}")
        sys.exit(1)
    
    return response.json()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 upload_file.py /path/to/file")
        sys.exit(1)
    
    file_path = sys.argv[1]
    api_key = get_api_key()
    
    print("📤 Uploading file...")
    result = upload_file(api_key, file_path)
    
    print(f"✅ File uploaded!")
    print(f"   ID: {result.get('id')}")
    print(f"   Filename: {result.get('filename')}")
    print(f"   Size: {result.get('size')} bytes")

if __name__ == "__main__":
    main()
