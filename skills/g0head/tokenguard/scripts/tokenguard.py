#!/usr/bin/env python3
"""
TokenGuard — API Cost Guardian for AI Agents
Track and limit API spending per session. Prevent runaway costs.

Usage:
    tokenguard status              Show current limit and spending
    tokenguard set <amount>        Set spending limit (e.g., 20 for $20)
    tokenguard log <amount> [desc] Log a cost after API call
    tokenguard check <cost>        Check if action fits budget (exit 1 if not)
    tokenguard reset               Clear session spending
    tokenguard history             Show all entries
    tokenguard extend <amount>     Add to limit (e.g., extend 5 for +$5)
    tokenguard override            One-time flag to proceed despite limit
"""

import argparse
import json
import os
import sys
from datetime import datetime, date
from pathlib import Path

# Storage directory (configurable via env)
TOKENGUARD_DIR = Path(os.environ.get("TOKENGUARD_DIR", Path.home() / ".tokenguard"))
LIMIT_FILE = TOKENGUARD_DIR / "limit.json"
SESSION_FILE = TOKENGUARD_DIR / "session.json"
OVERRIDE_FILE = TOKENGUARD_DIR / "override.flag"

# Defaults (configurable via env)
DEFAULT_LIMIT = float(os.environ.get("TOKENGUARD_DEFAULT_LIMIT", "20.0"))
WARNING_THRESHOLD = float(os.environ.get("TOKENGUARD_WARNING_PCT", "0.8"))

# Branding
TOOL_NAME = "TokenGuard"
TOOL_EMOJI = "🛡️"


def ensure_storage():
    """Create storage directory if it doesn't exist."""
    TOKENGUARD_DIR.mkdir(parents=True, exist_ok=True)


def load_json(path: Path, default: dict) -> dict:
    """Load JSON file or return default."""
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return default
    return default


def save_json(path: Path, data: dict):
    """Save data to JSON file."""
    ensure_storage()
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def get_limit() -> dict:
    """Get current limit configuration."""
    default = {
        "limit": DEFAULT_LIMIT,
        "set_at": datetime.now().isoformat(),
        "set_by": "default"
    }
    return load_json(LIMIT_FILE, default)


def get_session() -> dict:
    """Get current session data, reset if new day."""
    today = date.today().isoformat()
    default = {
        "date": today,
        "total_spent": 0.0,
        "entries": []
    }
    session = load_json(SESSION_FILE, default)
    
    # Reset if new day
    if session.get("date") != today:
        session = default
        save_json(SESSION_FILE, session)
    
    return session


def check_override() -> bool:
    """Check if override flag is set, clear it if so."""
    if OVERRIDE_FILE.exists():
        OVERRIDE_FILE.unlink()
        return True
    return False


def cmd_status(args):
    """Show current limit and spending."""
    limit_config = get_limit()
    session = get_session()
    
    limit = limit_config["limit"]
    spent = session["total_spent"]
    remaining = limit - spent
    pct_used = (spent / limit * 100) if limit > 0 else 0
    
    print(f"╭─────────────────────────────────────╮")
    print(f"│     {TOOL_EMOJI}  {TOOL_NAME.upper()} STATUS          │")
    print(f"├─────────────────────────────────────┤")
    print(f"│  Limit:     ${limit:>10.2f}            │")
    print(f"│  Spent:     ${spent:>10.4f}            │")
    print(f"│  Remaining: ${remaining:>10.4f}            │")
    print(f"│  Used:      {pct_used:>9.1f}%            │")
    print(f"├─────────────────────────────────────┤")
    print(f"│  Session: {session['date']}              │")
    print(f"│  Entries: {len(session['entries']):>3}                       │")
    print(f"╰─────────────────────────────────────╯")
    
    if pct_used >= WARNING_THRESHOLD * 100:
        print(f"\n⚠️  WARNING: Approaching limit ({pct_used:.1f}% used)")
    
    if session["entries"]:
        print(f"\nRecent entries:")
        for entry in session["entries"][-5:]:
            desc = entry.get('description', 'unspecified')[:35]
            print(f"  ${entry['amount']:<8.4f} {desc}")


def cmd_set(args):
    """Set the spending limit."""
    try:
        new_limit = float(args.amount)
        if new_limit <= 0:
            print("Error: Limit must be positive")
            sys.exit(1)
    except ValueError:
        print(f"Error: Invalid amount '{args.amount}'")
        sys.exit(1)
    
    limit_config = {
        "limit": new_limit,
        "set_at": datetime.now().isoformat(),
        "set_by": "user"
    }
    save_json(LIMIT_FILE, limit_config)
    print(f"✅ Limit set to ${new_limit:.2f}")


def cmd_log(args):
    """Log a cost entry."""
    try:
        amount = float(args.amount)
        if amount < 0:
            print("Error: Amount cannot be negative")
            sys.exit(1)
    except ValueError:
        print(f"Error: Invalid amount '{args.amount}'")
        sys.exit(1)
    
    description = args.description or "unspecified"
    session = get_session()
    
    session["entries"].append({
        "amount": amount,
        "description": description,
        "time": datetime.now().isoformat()
    })
    session["total_spent"] += amount
    save_json(SESSION_FILE, session)
    
    limit = get_limit()["limit"]
    remaining = limit - session["total_spent"]
    
    print(f"📝 Logged: ${amount:.4f} — {description}")
    print(f"   Total: ${session['total_spent']:.4f} | Remaining: ${remaining:.4f}")
    
    if session["total_spent"] >= limit:
        print(f"\n🚨 LIMIT EXCEEDED! Total: ${session['total_spent']:.4f} / ${limit:.2f}")
        sys.exit(2)
    elif session["total_spent"] >= limit * WARNING_THRESHOLD:
        print(f"\n⚠️  Warning: {session['total_spent']/limit*100:.1f}% of limit used")


def cmd_check(args):
    """Check if an estimated cost is within budget."""
    try:
        estimated = float(args.cost)
    except ValueError:
        print(f"Error: Invalid cost '{args.cost}'")
        sys.exit(1)
    
    limit = get_limit()["limit"]
    session = get_session()
    spent = session["total_spent"]
    would_be = spent + estimated
    
    # Check for override flag
    if would_be > limit and check_override():
        print(f"⚡ OVERRIDE ACTIVE — proceeding despite limit")
        print(f"   Current: ${spent:.4f} | Action: +${estimated:.4f}")
        print(f"   Total: ${would_be:.4f} (over ${limit:.2f} limit)")
        return  # Exit 0
    
    if would_be > limit:
        over_by = would_be - limit
        print(f"🚫 BUDGET EXCEEDED")
        print(f"╭──────────────────────────────────────────╮")
        print(f"│  Current spent:  ${spent:>10.4f}            │")
        print(f"│  This action:    ${estimated:>10.4f}            │")
        print(f"│  Would total:    ${would_be:>10.4f}            │")
        print(f"│  Limit:          ${limit:>10.2f}            │")
        print(f"│  Over by:        ${over_by:>10.4f}            │")
        print(f"╰──────────────────────────────────────────╯")
        print(f"\n💡 Options:")
        print(f"   tokenguard extend {int(over_by + 1)}    # Add to limit")
        print(f"   tokenguard set <amt>       # Set new limit")
        print(f"   tokenguard reset           # Clear session")
        print(f"   tokenguard override        # One-time bypass")
        sys.exit(1)
    else:
        remaining_after = limit - would_be
        print(f"✅ Within budget")
        print(f"   Current: ${spent:.4f} | Action: +${estimated:.4f}")
        print(f"   Total: ${would_be:.4f} | After: ${remaining_after:.4f} remaining")
        
        if would_be >= limit * WARNING_THRESHOLD:
            print(f"\n⚠️  Note: Would use {would_be/limit*100:.1f}% of limit")


def cmd_reset(args):
    """Reset session spending."""
    session = {
        "date": date.today().isoformat(),
        "total_spent": 0.0,
        "entries": []
    }
    save_json(SESSION_FILE, session)
    print("🔄 Session reset. Spending cleared.")


def cmd_history(args):
    """Show spending history."""
    session = get_session()
    
    if not session["entries"]:
        print("No entries yet today.")
        return
    
    print(f"📊 Spending History ({session['date']})")
    print("─" * 55)
    
    for i, entry in enumerate(session["entries"], 1):
        desc = entry.get('description', 'unspecified')[:40]
        print(f"{i:3}. ${entry['amount']:<10.4f} {desc}")
    
    print("─" * 55)
    print(f"Total: ${session['total_spent']:.4f}")


def cmd_extend(args):
    """Extend the limit by a specified amount."""
    try:
        amount = float(args.amount)
        if amount <= 0:
            print("Error: Amount must be positive")
            sys.exit(1)
    except ValueError:
        print(f"Error: Invalid amount '{args.amount}'")
        sys.exit(1)
    
    limit_config = get_limit()
    old_limit = limit_config["limit"]
    new_limit = old_limit + amount
    
    limit_config["limit"] = new_limit
    limit_config["extended_at"] = datetime.now().isoformat()
    limit_config["extended_by"] = amount
    save_json(LIMIT_FILE, limit_config)
    
    session = get_session()
    remaining = new_limit - session["total_spent"]
    
    print(f"📈 Limit extended!")
    print(f"   {old_limit:.2f} → ${new_limit:.2f} (+${amount:.2f})")
    print(f"   Remaining: ${remaining:.4f}")


def cmd_override(args):
    """Set one-time override flag."""
    ensure_storage()
    with open(OVERRIDE_FILE, "w") as f:
        f.write(datetime.now().isoformat())
    
    print(f"⚡ Override flag set!")
    print(f"   Next budget check will pass regardless of limit.")
    print(f"   Flag auto-clears after one use.")


def cmd_export(args):
    """Export session data as JSON (for integrations)."""
    session = get_session()
    limit_config = get_limit()
    
    export_data = {
        "limit": limit_config["limit"],
        "spent": session["total_spent"],
        "remaining": limit_config["limit"] - session["total_spent"],
        "date": session["date"],
        "entry_count": len(session["entries"]),
        "pct_used": (session["total_spent"] / limit_config["limit"] * 100) if limit_config["limit"] > 0 else 0
    }
    
    if args.full:
        export_data["entries"] = session["entries"]
        export_data["limit_config"] = limit_config
    
    print(json.dumps(export_data, indent=2))


def main():
    parser = argparse.ArgumentParser(
        prog="tokenguard",
        description=f"{TOOL_EMOJI} {TOOL_NAME} — API Cost Guardian for AI Agents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    tokenguard status           # Check current spending
    tokenguard set 50           # Set $50 limit
    tokenguard check 5.00       # Check if $5 action fits budget
    tokenguard log 2.50 "GPT-4" # Log $2.50 spent on GPT-4
    tokenguard extend 10        # Add $10 to current limit

Environment Variables:
    TOKENGUARD_DIR              Storage directory (default: ~/.tokenguard)
    TOKENGUARD_DEFAULT_LIMIT    Default limit in USD (default: 20.0)
    TOKENGUARD_WARNING_PCT      Warning threshold 0-1 (default: 0.8)
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # status
    sub_status = subparsers.add_parser("status", help="Show current limit and spending")
    sub_status.set_defaults(func=cmd_status)
    
    # set
    sub_set = subparsers.add_parser("set", help="Set the spending limit")
    sub_set.add_argument("amount", help="Limit amount in dollars")
    sub_set.set_defaults(func=cmd_set)
    
    # log
    sub_log = subparsers.add_parser("log", help="Log a cost entry")
    sub_log.add_argument("amount", help="Cost amount in dollars")
    sub_log.add_argument("description", nargs="?", default="", help="Description")
    sub_log.set_defaults(func=cmd_log)
    
    # check
    sub_check = subparsers.add_parser("check", help="Check if cost is within budget")
    sub_check.add_argument("cost", help="Estimated cost in dollars")
    sub_check.set_defaults(func=cmd_check)
    
    # reset
    sub_reset = subparsers.add_parser("reset", help="Reset session spending")
    sub_reset.set_defaults(func=cmd_reset)
    
    # history
    sub_history = subparsers.add_parser("history", help="Show spending history")
    sub_history.set_defaults(func=cmd_history)
    
    # extend
    sub_extend = subparsers.add_parser("extend", help="Extend the limit")
    sub_extend.add_argument("amount", help="Amount to add to limit")
    sub_extend.set_defaults(func=cmd_extend)
    
    # override
    sub_override = subparsers.add_parser("override", help="One-time budget bypass")
    sub_override.set_defaults(func=cmd_override)
    
    # export
    sub_export = subparsers.add_parser("export", help="Export data as JSON")
    sub_export.add_argument("--full", action="store_true", help="Include entries")
    sub_export.set_defaults(func=cmd_export)
    
    args = parser.parse_args()
    
    if args.command is None:
        args.func = cmd_status
        args.func(args)
    else:
        args.func(args)


if __name__ == "__main__":
    main()
