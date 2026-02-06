#!/usr/bin/env python3
"""View notifications and pending actions from Magda's SMS commands."""

import json
import os
from datetime import datetime
from pathlib import Path

SKILL_DIR = Path.home() / "clawd" / "skills" / "twilio"


def view_notifications():
    """View notifications for Eric."""
    notify_file = SKILL_DIR / "eric_notifications.log"
    
    if not notify_file.exists():
        print("No notifications yet.")
        return
    
    with open(notify_file, "r") as f:
        lines = f.readlines()
    
    if not lines:
        print("No new notifications.")
        return
    
    # Clear after reading
    open(notify_file, "w").close()
    
    print(f"\n{'📱 Notifications from Magda':=^60}")
    
    for line in lines:
        try:
            note = json.loads(line.strip())
            print(f"\n[{note.get('timestamp', '')[:16]}]")
            print(note.get('message', ''))
            print("-" * 60)
        except json.JSONDecodeError:
            continue


def view_pending():
    """View pending actions that need confirmation."""
    pending_file = SKILL_DIR / "pending_actions.json"
    
    if not pending_file.exists():
        print("No pending actions.")
        return
    
    with open(pending_file, "r") as f:
        pending = json.load(f)
    
    if not pending:
        print("No pending actions.")
        return
    
    print(f"\n{'⏳ Pending Actions':=^60}")
    
    for i, action in enumerate(pending, 1):
        cmd = action.get('command', {})
        print(f"\n{i}. [{action.get('timestamp', '')[:16]}]")
        print(f"   Type: {cmd.get('type', 'unknown')}")
        
        if cmd.get('type') == 'calendar':
            print(f"   Event: {cmd.get('title')}")
            print(f"   When: {cmd.get('date')} at {cmd.get('time')}")
        elif cmd.get('type') == 'task':
            print(f"   Task: {cmd.get('title')}")
            if cmd.get('due_date'):
                print(f"   Due: {cmd.get('due_date')}")
        
        print(f"   Original: '{cmd.get('original', '')[:60]}...'")
    
    print(f"\n{len(pending)} action(s) pending confirmation")
    print("\nTo confirm: Run 'python confirm_actions.py'")


def view_notes():
    """View notes/messages from Magda."""
    notes_file = SKILL_DIR / "magda_notes.txt"
    
    if not notes_file.exists():
        print("No notes yet.")
        return
    
    with open(notes_file, "r") as f:
        content = f.read()
    
    if not content.strip():
        print("No notes yet.")
        return
    
    print(f"\n{'📝 Messages from Magda':=^60}")
    print(content)


def clear_all():
    """Clear all notifications and pending actions."""
    files = [
        SKILL_DIR / "eric_notifications.log",
        SKILL_DIR / "pending_actions.json",
        SKILL_DIR / "magda_notes.txt"
    ]
    
    for f in files:
        if f.exists():
            f.unlink()
    
    print("✅ All notifications cleared")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="View Magda's SMS notifications")
    parser.add_argument("--pending", "-p", action="store_true", help="View pending actions")
    parser.add_argument("--notes", "-n", action="store_true", help="View notes")
    parser.add_argument("--all", "-a", action="store_true", help="View all (default)")
    parser.add_argument("--clear", "-c", action="store_true", help="Clear all notifications")
    
    args = parser.parse_args()
    
    if args.clear:
        clear_all()
        return
    
    if args.pending:
        view_pending()
    elif args.notes:
        view_notes()
    else:
        # Default: show notifications
        view_notifications()
        view_pending()


if __name__ == "__main__":
    main()
