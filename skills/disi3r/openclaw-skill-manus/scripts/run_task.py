#!/usr/bin/env python3
"""
Manus AI Task Runner
Usage: python3 run_task.py "Your task prompt" [--timeout SECONDS]
"""

import os
import sys
import json
import time
import argparse
import requests

API_BASE = "https://api.manus.ai/v1"
DEFAULT_TIMEOUT = 120  # seconds

def get_api_key():
    """Get API key from environment or config."""
    api_key = os.environ.get("MANUS_API_KEY")
    
    # Try to read from config file
    config_path = os.path.expanduser("~/.clawdbot/clawdbot.json")
    if os.path.exists(config_path):
        try:
            with open(config_path) as f:
                config = json.load(f)
            api_key = config.get("skills", {}).get("manus", {}).get("apiKey", api_key)
        except:
            pass
    
    if not api_key:
        print("❌ Error: MANUS_API_KEY not found")
        print("Set it with: export MANUS_API_KEY='sk-...'")
        print("Or configure in ~/.clawdbot/clawdbot.json")
        sys.exit(1)
    
    return api_key

def create_task(api_key, prompt, title=None):
    """Create a new task."""
    url = f"{API_BASE}/tasks"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "API_KEY": api_key
    }
    data = {
        "prompt": prompt
    }
    if title:
        data["title"] = title
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error creating task: {response.text}")
        sys.exit(1)
    
    return response.json()

def get_task_status(api_key, task_id):
    """Get task status and details."""
    url = f"{API_BASE}/tasks/{task_id}"
    headers = {
        "accept": "application/json",
        "API_KEY": api_key
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error getting task: {response.text}")
        sys.exit(1)
    
    return response.json()

def wait_for_completion(api_key, task_id, timeout=DEFAULT_TIMEOUT):
    """Wait for task to complete."""
    start_time = time.time()
    
    print(f"⏳ Task started: {task_id}")
    print(f"   URL: https://manus.im/app/{task_id}")
    print()
    
    while time.time() - start_time < timeout:
        task = get_task_status(api_key, task_id)
        status = task.get("status", "unknown")
        
        # Show status
        status_icons = {
            "pending": "⏳ Pending",
            "running": "🔄 Running",
            "completed": "✅ Completed",
            "failed": "❌ Failed"
        }
        print(f"\r{status_icons.get(status, status)} ", end="", flush=True)
        
        if status == "completed":
            print("\n\n✅ Task completed!")
            return task
        
        elif status == "failed":
            print("\n\n❌ Task failed!")
            error = task.get("error", "Unknown error")
            print(f"   Error: {error}")
            return task
        
        time.sleep(2)
    
    print(f"\n\n⚠️ Timeout after {timeout}s - Task still running")
    print(f"   Check status: https://manus.im/app/{task_id}")
    return None

def extract_result(task):
    """Extract the result from a completed task."""
    output = task.get("output", [])
    
    # Find assistant messages with results
    for item in reversed(output):
        if item.get("role") == "assistant" and item.get("type") == "message":
            content = item.get("content", [])
            for c in content:
                if c.get("type") == "output_text":
                    return c.get("text", "")
    
    return "No result content found"

def main():
    parser = argparse.ArgumentParser(
        description="Run a task with Manus AI"
    )
    parser.add_argument(
        "prompt",
        help="The task prompt"
    )
    parser.add_argument(
        "--title",
        "-t",
        help="Task title (optional)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"Timeout in seconds (default: {DEFAULT_TIMEOUT})"
    )
    parser.add_argument(
        "--no-wait",
        action="store_true",
        help="Don't wait for completion, just return task ID"
    )
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    print("🧠 Manus AI Task Runner")
    print("=" * 40)
    print(f"Prompt: {args.prompt[:100]}...")
    print()
    
    # Create task
    task = create_task(api_key, args.prompt, args.title)
    task_id = task.get("task_id") or task.get("id")
    task_url = task.get("task_url", f"https://manus.im/app/{task_id}")
    
    print(f"📋 Task ID: {task_id}")
    print(f"🔗 URL: {task_url}")
    
    if args.no_wait:
        print("\n✅ Task created! Use check_status.py or get_result.py to track progress.")
        return
    
    # Wait for completion
    completed_task = wait_for_completion(api_key, task_id, args.timeout)
    
    if completed_task:
        # Extract and show result
        result = extract_result(completed_task)
        print("\n" + "=" * 40)
        print("📝 RESULT:")
        print("=" * 40)
        print(result)
        print()
        
        # Show credit usage
        credit_usage = completed_task.get("credit_usage", 0)
        print(f"💰 Credit usage: {credit_usage}")

if __name__ == "__main__":
    main()
