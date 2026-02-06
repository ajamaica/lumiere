#!/usr/bin/env python3
"""
Check Manus task status
Usage: python3 check_status.py TASK_ID
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

def get_task_status(api_key, task_id):
    url = f"{API_BASE}/tasks/{task_id}"
    headers = {
        "accept": "application/json",
        "API_KEY": api_key
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error: {response.text}")
        sys.exit(1)
    
    return response.json()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 check_status.py TASK_ID")
        sys.exit(1)
    
    task_id = sys.argv[1]
    api_key = get_api_key()
    
    task = get_task_status(api_key, task_id)
    
    status = task.get("status", "unknown")
    status_icons = {
        "pending": "⏳ Pending",
        "running": "🔄 Running",
        "completed": "✅ Completed",
        "failed": "❌ Failed"
    }
    
    print("📋 Task Status")
    print("=" * 40)
    print(f"ID: {task_id}")
    print(f"Status: {status_icons.get(status, status)}")
    print(f"Model: {task.get('model', 'N/A')}")
    
    created_at = task.get("created_at", "")
    if created_at:
        print(f"Created: {created_at}")
    
    credit_usage = task.get("credit_usage", 0)
    if credit_usage:
        print(f"Credits: {credit_usage}")
    
    if status == "completed":
        print(f"\n🔗 URL: https://manus.im/app/{task_id}")

if __name__ == "__main__":
    main()
