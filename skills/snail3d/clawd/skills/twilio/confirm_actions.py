#!/usr/bin/env python3
"""Confirm and execute pending actions from Magda's SMS commands."""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SKILL_DIR = Path.home() / "clawd" / "skills" / "twilio"
PENDING_FILE = SKILL_DIR / "pending_actions.json"


def execute_calendar_action(action):
    """Execute a calendar action manually."""
    cmd = action.get('command', {})
    title = cmd.get('title', 'Event')
    date = cmd.get('date')
    time = cmd.get('time', '09:00')
    
    print(f"\n📅 Calendar Event")
    print(f"   Title: {title}")
    print(f"   Date: {date}")
    print(f"   Time: {time}")
    
    confirm = input("\nAdd to Google Calendar? (y/n): ")
    if confirm.lower() != 'y':
        return False
    
    try:
        datetime_str = f"{date} {time}"
        result = subprocess.run(
            ["gog", "calendar", "create",
             "--title", title,
             "--start", datetime_str,
             "--duration", "60"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ Added to calendar!")
            return True
        else:
            print(f"❌ Failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def execute_task_action(action):
    """Execute a task action manually."""
    cmd = action.get('command', {})
    title = cmd.get('title', 'Task')
    due_date = cmd.get('due_date')
    
    print(f"\n✅ Task")
    print(f"   Title: {title}")
    if due_date:
        print(f"   Due: {due_date}")
    
    confirm = input("\nAdd to Things? (y/n): ")
    if confirm.lower() != 'y':
        return False
    
    try:
        args = ["things", "add", title]
        if due_date:
            args.extend(["--due", due_date])
        
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("✅ Added to Things!")
            return True
        else:
            print(f"❌ Failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def confirm_actions():
    """Interactive confirmation of pending actions."""
    if not PENDING_FILE.exists():
        print("No pending actions.")
        return
    
    with open(PENDING_FILE, "r") as f:
        pending = json.load(f)
    
    if not pending:
        print("No pending actions.")
        return
    
    print(f"\n{'Pending Actions':=^60}")
    print(f"Found {len(pending)} action(s) to confirm\n")
    
    completed = []
    
    for i, action in enumerate(pending, 1):
        cmd = action.get('command', {})
        cmd_type = cmd.get('type')
        
        print(f"\n{'─' * 60}")
        print(f"Action {i} of {len(pending)}")
        
        success = False
        if cmd_type == 'calendar':
            success = execute_calendar_action(action)
        elif cmd_type == 'task':
            success = execute_task_action(action)
        
        if success:
            completed.append(action)
    
    # Remove completed actions
    remaining = [a for a in pending if a not in completed]
    
    with open(PENDING_FILE, "w") as f:
        json.dump(remaining, f, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"✅ Confirmed {len(completed)} action(s)")
    if remaining:
        print(f"⏳ {len(remaining)} still pending")
    else:
        print("🎉 All caught up!")


def auto_confirm():
    """Auto-confirm all actions (use with caution)."""
    if not PENDING_FILE.exists():
        print("No pending actions.")
        return
    
    with open(PENDING_FILE, "r") as f:
        pending = json.load(f)
    
    if not pending:
        print("No pending actions.")
        return
    
    print(f"Auto-confirming {len(pending)} action(s)...")
    
    for action in pending:
        cmd = action.get('command', {})
        cmd_type = cmd.get('type')
        
        if cmd_type == 'calendar':
            execute_calendar_action(action)
        elif cmd_type == 'task':
            execute_task_action(action)
    
    # Clear all
    with open(PENDING_FILE, "w") as f:
        json.dump([], f)
    
    print("\n✅ All actions processed")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Confirm pending SMS actions")
    parser.add_argument("--auto", "-a", action="store_true", 
                        help="Auto-confirm all (no prompts)")
    
    args = parser.parse_args()
    
    if args.auto:
        auto_confirm()
    else:
        confirm_actions()


if __name__ == "__main__":
    main()
