#!/usr/bin/env python3
"""
Create a Manus project
Usage: python3 create_project.py "Project Name" "Description"
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

def create_project(api_key, name, description=""):
    url = f"{API_BASE}/projects"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "API_KEY": api_key
    }
    data = {
        "name": name,
        "description": description
    }
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error: {response.text}")
        sys.exit(1)
    
    return response.json()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 create_project.py 'Project Name' [Description]")
        sys.exit(1)
    
    name = sys.argv[1]
    description = sys.argv[2] if len(sys.argv) > 2 else ""
    
    api_key = get_api_key()
    
    print("📁 Creating project...")
    project = create_project(api_key, name, description)
    
    print(f"✅ Project created!")
    print(f"   ID: {project.get('id')}")
    print(f"   Name: {project.get('name')}")

if __name__ == "__main__":
    main()
