#!/usr/bin/env python3
import argparse
import json
import os
import sys
import base64
import time
import requests
from pathlib import Path

def get_antigravity_credentials():
    auth_path = "/root/.openclaw/agents/main/agent/auth-profiles.json"
    if not os.path.exists(auth_path):
        return None, None
    
    with open(auth_path, "r") as f:
        data = json.load(f)
    
    # Try to find the antigravity profile
    profiles = data.get("profiles", {})
    for key, profile in profiles.items():
        if key.startswith("google-antigravity:"):
            return profile.get("access"), profile.get("projectId")
            
    return None, None

def main():
    parser = argparse.ArgumentParser(description="Generate images using Antigravity Sandbox API")
    parser.add_argument("--prompt", "-p", required=True, help="Image prompt")
    parser.add_argument("--filename", "-f", required=True, help="Output filename")
    
    args = parser.parse_args()
    
    token, project_id = get_antigravity_credentials()
    
    if not token or not project_id:
        print("Error: Could not find Antigravity credentials in auth-profiles.json", file=sys.stderr)
        sys.exit(1)
        
    url = "https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:generateContent"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "antigravity/1.15.8 darwin/arm64",
        "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1"
    }
    
    payload = {
        "project": project_id,
        "model": "gemini-3-pro-image",
        "request": {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": args.prompt}]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"]
            }
        },
        "requestType": "agent",
        "userAgent": "antigravity"
    }
    
    print(f"Generating image with prompt: '{args.prompt}'...")
    
    max_retries = 3
    for attempt in range(max_retries):
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            try:
                data = response.json()
                image_base64 = data['response']['candidates'][0]['content']['parts'][0]['inlineData']['data']
                image_data = base64.b64decode(image_base64)
                
                with open(args.filename, 'wb') as f:
                    f.write(image_data)
                
                abs_path = os.path.abspath(args.filename)
                print(f"Image successfully saved to {abs_path}")
                print(f"MEDIA:{abs_path}")
                return
            except Exception as e:
                print(f"Error parsing response: {e}", file=sys.stderr)
                sys.exit(1)
        elif response.status_code == 503:
            print(f"Attempt {attempt+1}: Server busy (503). Retrying in 10s...")
            time.sleep(10)
        else:
            print(f"Error: API returned status code {response.status_code}")
            print(response.text)
            sys.exit(1)
            
    print("Failed to generate image after retries due to server capacity.", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    main()
