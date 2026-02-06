#!/usr/bin/env python3
"""
Get Manus task result
Usage: python3 get_result.py TASK_ID
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

def get_task_result(api_key, task_id):
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

def extract_result(task):
    """Extract text result from task."""
    output = task.get("output", [])
    
    # Find assistant messages with results
    results = []
    for item in output:
        if item.get("role") == "assistant" and item.get("type") == "message":
            content = item.get("content", [])
            for c in content:
                if c.get("type") == "output_text":
                    results.append(c.get("text", ""))
    
    return "\n\n".join(results)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 get_result.py TASK_ID")
        sys.exit(1)
    
    task_id = sys.argv[1]
    api_key = get_api_key()
    
    task = get_task_result(api_key, task_id)
    
    status = task.get("status", "unknown")
    if status != "completed":
        print(f"⚠️ Task not completed yet. Status: {status}")
        print(f"Check: https://manus.im/app/{task_id}")
        sys.exit(1)
    
    result = extract_result(task)
    
    print("📝 RESULT")
    print("=" * 60)
    print(result)
    print("=" * 60)
    
    credit_usage = task.get("credit_usage", 0)
    print(f"\n💰 Credit usage: {credit_usage}")
    print(f"🔗 Full result: https://manus.im/app/{task_id}")

if __name__ == "__main__":
    main()
