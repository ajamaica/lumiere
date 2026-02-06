#!/usr/bin/env python3
"""
Local Approvals CLI Module

Command-line interface for managing local agent approval workflows.
Provides commands for approving/denying requests, viewing history, and managing categories.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Import core functions
from core import (
    STATE_DIR,
    STATE_FILE,
    PENDING_FILE,
    _ensure_state_dir,
    _load_state,
    _save_state,
    _load_pending,
    _save_pending,
    check_auto_approve,
    submit_request,
    learn_category,
    get_request,
    update_request,
    list_pending,
    get_agent_approvals,
)


def approve(request_id: str, reviewer: str = "user", auto_learn: bool = False) -> bool:
    """
    Approve a pending request.
    
    Args:
        request_id: The ID of the request to approve
        reviewer: Who is approving (default: "user")
        auto_learn: Whether to add category to auto-approve list
    
    Returns:
        True if approved successfully, False if not found
    """
    request = get_request(request_id)
    if request is None:
        print(f"❌ Error: Request '{request_id}' not found")
        return False
    
    if request["status"] != "pending":
        print(f"⚠️  Request '{request_id}' is not pending (status: {request['status']})")
        return False
    
    # Update the request
    updated = update_request(request_id, "approved", reviewer)
    if updated:
        print(f"✅ Approved request '{request_id}'")
        print(f"   Agent: {updated['agent']}")
        print(f"   Category: {updated['category']}")
        print(f"   Operation: {updated['operation']}")
        
        # Auto-learn the category if requested
        if auto_learn:
            learn_category(updated['agent'], updated['category'])
            print(f"   📚 Category '{updated['category']}' added to auto-approve for agent '{updated['agent']}'")
        
        return True
    
    return False


def deny(request_id: str, reviewer: str = "user") -> bool:
    """
    Deny a pending request.
    
    Args:
        request_id: The ID of the request to deny
        reviewer: Who is denying (default: "user")
    
    Returns:
        True if denied successfully, False if not found
    """
    request = get_request(request_id)
    if request is None:
        print(f"❌ Error: Request '{request_id}' not found")
        return False
    
    if request["status"] != "pending":
        print(f"⚠️  Request '{request_id}' is not pending (status: {request['status']})")
        return False
    
    # Update the request
    updated = update_request(request_id, "denied", reviewer)
    if updated:
        print(f"❌ Denied request '{request_id}'")
        print(f"   Agent: {updated['agent']}")
        print(f"   Category: {updated['category']}")
        print(f"   Operation: {updated['operation']}")
        return True
    
    return False


def list_pending_cmd(agent: str = None) -> None:
    """
    List all pending requests, optionally filtered by agent.
    
    Args:
        agent: If provided, only show requests from this agent
    """
    pending = list_pending(agent)
    
    if not pending:
        if agent:
            print(f"✓ No pending requests for agent '{agent}'")
        else:
            print("✓ No pending requests")
        return
    
    print(f"\n📋 Pending Requests ({len(pending)}):")
    print("-" * 60)
    
    for req_id, req in sorted(pending.items(), key=lambda x: x[1].get('submitted_at', '')):
        print(f"\nID: {req_id}")
        print(f"  Agent:     {req['agent']}")
        print(f"  Category:  {req['category']}")
        print(f"  Operation: {req['operation']}")
        print(f"  Reasoning: {req['reasoning']}")
        print(f"  Submitted: {req['submitted_at']}")
    
    print("-" * 60)


def show_history(limit: int = 20) -> None:
    """
    Show approval history from state.json.
    
    Args:
        limit: Maximum number of history entries to show
    """
    state = _load_state()
    
    # Check if history exists in the expected location
    # The core module may have a different structure, so we need to handle both
    history = state.get("history", [])
    
    if not history:
        print("✓ No approval history found")
        return
    
    # Show the most recent entries (up to limit)
    recent_history = history[-limit:] if len(history) > limit else history
    
    print(f"\n📜 Approval History (showing {len(recent_history)} of {len(history)}):")
    print("-" * 60)
    
    for entry in reversed(recent_history):
        timestamp = entry.get("timestamp", "Unknown time")
        agent = entry.get("agent", "Unknown agent")
        action = entry.get("action", "Unknown action")
        decision = entry.get("decision", "Unknown decision")
        reason = entry.get("reason", "")
        
        status_emoji = "✅" if decision == "approved" else "❌"
        print(f"\n{status_emoji} {timestamp}")
        print(f"   Agent:     {agent}")
        print(f"   Action:    {action}")
        print(f"   Decision:  {decision}")
        if reason:
            print(f"   Reason:    {reason}")
    
    print("-" * 60)


def reset_categories(agent: str) -> bool:
    """
    Reset an agent's auto-approved categories list.
    
    Args:
        agent: The agent ID to reset
    
    Returns:
        True if reset successfully, False if agent not found
    """
    state = _load_state()
    
    # Check for both possible structures
    auto_approve = state.get("auto_approve", {})
    
    if agent not in auto_approve:
        print(f"⚠️  Agent '{agent}' has no auto-approved categories to reset")
        return False
    
    # Clear the categories for this agent
    categories = auto_approve[agent]
    del auto_approve[agent]
    state["auto_approve"] = auto_approve
    
    _save_state(state)
    
    print(f"🔄 Reset auto-approved categories for agent '{agent}'")
    print(f"   Removed categories: {', '.join(categories)}")
    return True


def show_categories(agent: str = None) -> None:
    """
    Show auto-approved categories for one or all agents.
    
    Args:
        agent: If provided, only show categories for this agent
    """
    state = _load_state()
    auto_approve = state.get("auto_approve", {})
    
    if not auto_approve:
        print("✓ No auto-approved categories configured")
        return
    
    if agent:
        if agent not in auto_approve:
            print(f"⚠️  Agent '{agent}' has no auto-approved categories")
            return
        agents_to_show = {agent: auto_approve[agent]}
    else:
        agents_to_show = auto_approve
    
    print("\n📚 Auto-Approved Categories:")
    print("-" * 60)
    
    for agent_id, categories in agents_to_show.items():
        if categories:
            print(f"\n{agent_id}:")
            for cat in categories:
                print(f"  ✓ {cat}")
        else:
            print(f"\n{agent_id}: (none)")
    
    print("-" * 60)


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="Local Approvals CLI - Manage agent approval requests and categories",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s approve abc123              # Approve request abc123
  %(prog)s approve abc123 --learn      # Approve and auto-learn the category
  %(prog)s deny abc123                 # Deny request abc123
  %(prog)s list                        # List all pending requests
  %(prog)s list --agent assistant      # List pending requests from assistant
  %(prog)s history                     # Show approval history
  %(prog)s history --limit 50          # Show last 50 history entries
  %(prog)s categories                  # Show all auto-approved categories
  %(prog)s categories --agent planner  # Show categories for planner agent
  %(prog)s reset assistant            # Reset assistant's categories
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Approve command
    approve_parser = subparsers.add_parser("approve", help="Approve a pending request")
    approve_parser.add_argument("id", help="Request ID to approve")
    approve_parser.add_argument("--learn", action="store_true", 
                               help="Add the category to agent's auto-approve list")
    approve_parser.add_argument("--reviewer", default="user",
                               help="Who is approving (default: user)")
    
    # Deny command
    deny_parser = subparsers.add_parser("deny", help="Deny a pending request")
    deny_parser.add_argument("id", help="Request ID to deny")
    deny_parser.add_argument("--reviewer", default="user",
                            help="Who is denying (default: user)")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List pending requests")
    list_parser.add_argument("--agent", help="Filter by agent ID")
    
    # History command
    history_parser = subparsers.add_parser("history", help="Show approval history")
    history_parser.add_argument("--limit", type=int, default=20,
                               help="Maximum number of entries to show (default: 20)")
    
    # Categories command
    cat_parser = subparsers.add_parser("categories", help="Show auto-approved categories")
    cat_parser.add_argument("--agent", help="Show categories for specific agent")
    
    # Reset command
    reset_parser = subparsers.add_parser("reset", help="Reset an agent's auto-approved categories")
    reset_parser.add_argument("agent", help="Agent ID to reset")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Execute the appropriate command
    if args.command == "approve":
        success = approve(args.id, args.reviewer, args.learn)
        sys.exit(0 if success else 1)
    
    elif args.command == "deny":
        success = deny(args.id, args.reviewer)
        sys.exit(0 if success else 1)
    
    elif args.command == "list":
        list_pending_cmd(args.agent)
    
    elif args.command == "history":
        show_history(args.limit)
    
    elif args.command == "categories":
        show_categories(args.agent)
    
    elif args.command == "reset":
        success = reset_categories(args.agent)
        sys.exit(0 if success else 1)
    
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
