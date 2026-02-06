#!/usr/bin/env python3
"""
Monkeytype Stats Tracker - Fetches and analyzes typing stats from Monkeytype API
For use with OpenClaw/Clawd agents.

Usage:
    python monkeytype_stats.py stats           # Overall stats + PBs
    python monkeytype_stats.py history         # Recent test history
    python monkeytype_stats.py compare         # Week-over-week comparison
    python monkeytype_stats.py leaderboard     # Leaderboard lookup
    python monkeytype_stats.py setup           # Interactive setup
"""

import json
import sys
import os
import argparse
import requests
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

# Paths - check both skill-local and workspace config
SCRIPT_DIR = Path(__file__).parent
SKILL_CONFIG = SCRIPT_DIR.parent / "config" / "monkeytype.json"
WORKSPACE_CONFIG = Path.home() / ".openclaw" / "workspace" / "config" / "monkeytype.json"
CACHE_FILE = SCRIPT_DIR / "monkeytype_cache.json"

BASE_URL = "https://api.monkeytype.com"

def load_config() -> dict:
    """Load config with security priority: ENV var > config file
    
    Priority:
    1. MONKEYTYPE_APE_KEY environment variable (most secure)
    2. Skill-local config file
    3. Workspace config file
    """
    # Check environment variable first (most secure)
    ape_key = os.getenv('MONKEYTYPE_APE_KEY')
    if ape_key:
        return {
            'apeKey': ape_key,
            'automations': {
                'dailyReport': False,
                'weeklyReport': False,
                'reportTime': '20:00'
            }
        }
    
    # Fall back to config files
    for config_file in [SKILL_CONFIG, WORKSPACE_CONFIG]:
        if config_file.exists():
            with open(config_file) as f:
                return json.load(f)
    return {}

def save_config(config: dict):
    """Save config to workspace location"""
    WORKSPACE_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    with open(WORKSPACE_CONFIG, 'w') as f:
        json.dump(config, f, indent=2)

def load_cache() -> dict:
    """Load cached data"""
    if CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            return json.load(f)
    return {}

def save_cache(cache: dict):
    """Save cache to file"""
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)

def get_headers(config: dict) -> dict:
    """Get API headers with auth"""
    ape_key = config.get("apeKey", "")
    return {"Authorization": f"ApeKey {ape_key}"}

def api_get(endpoint: str, config: dict, params: dict = None) -> dict:
    """Make API GET request with proper error handling"""
    headers = get_headers(config)
    try:
        r = requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params or {}, timeout=10)
        
        # Handle specific error codes
        if r.status_code == 471:
            data = r.json()
            if "inactive" in data.get("message", "").lower():
                print("ERROR_INACTIVE_KEY: Your API key is inactive. Go to Monkeytype -> Account Settings -> Ape Keys and check the checkbox next to your key to activate it.")
                sys.exit(2)
            else:
                print(f"ERROR_API: {data.get('message', 'Unknown error')}")
                sys.exit(2)
        elif r.status_code == 401:
            print("ERROR_UNAUTHORIZED: Your API key is invalid. Please set up a new key.")
            sys.exit(3)
        elif r.status_code == 429:
            print("ERROR_RATE_LIMIT: Hit the API rate limit. Try again in a minute.")
            sys.exit(4)
        
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        print("ERROR_NETWORK: Couldn't reach Monkeytype servers. Check your connection.")
        sys.exit(5)
    except requests.exceptions.Timeout:
        print("ERROR_TIMEOUT: Request timed out. Try again.")
        sys.exit(5)

def cmd_stats(config: dict, args):
    """Show overall stats and personal bests"""
    print("=" * 50)
    print("MONKEYTYPE STATS")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)
    
    # Overall stats
    print("\n[OVERALL]")
    try:
        data = api_get("/users/stats", config).get("data", {})
        print(f"Tests Started: {data.get('startedTests', 0):,}")
        print(f"Tests Completed: {data.get('completedTests', 0):,}")
        hours = data.get('timeTyping', 0) / 3600
        print(f"Time Typing: {hours:.1f} hours")
    except Exception as e:
        print(f"Error: {e}")
    
    # Personal bests
    print("\n[PERSONAL BESTS - Time Mode]")
    for duration in ["15", "30", "60", "120"]:
        try:
            data = api_get("/users/personalBests", config, {"mode": "time", "mode2": duration}).get("data", [])
            if data:
                best = max(data, key=lambda x: x.get("wpm", 0))
                print(f"  {duration:>3}s: {best.get('wpm', 0):.0f} WPM | {best.get('acc', 0):.1f}% acc")
        except:
            print(f"  {duration:>3}s: --")
    
    # Streak
    print("\n[STREAK]")
    try:
        data = api_get("/users/streak", config).get("data", {})
        print(f"Current: {data.get('length', 0)} days")
        print(f"Max: {data.get('maxLength', 0)} days")
    except Exception as e:
        print(f"Error: {e}")

def cmd_history(config: dict, args):
    """Show recent test history with analysis"""
    limit = args.limit or 50
    
    print("=" * 50)
    print(f"RECENT TESTS (Last {limit})")
    print("=" * 50)
    
    try:
        data = api_get("/results", config, {"limit": limit}).get("data", [])
        
        if not data:
            print("No recent tests found.")
            return
        
        # Stats
        wpms = [r.get("wpm", 0) for r in data]
        accs = [r.get("acc", 0) for r in data]
        cons = [r.get("consistency", 0) for r in data]
        
        print("\n[SUMMARY]")
        print(f"Avg WPM: {sum(wpms)/len(wpms):.1f}")
        print(f"Avg Accuracy: {sum(accs)/len(accs):.1f}%")
        print(f"Avg Consistency: {sum(cons)/len(cons):.1f}%")
        print(f"Best: {max(wpms):.0f} WPM | Worst: {min(wpms):.0f} WPM")
        
        if len(wpms) > 1:
            import statistics
            std = statistics.stdev(wpms)
            print(f"StdDev: {std:.1f} {'(inconsistent!)' if std > 15 else '(good)' if std < 10 else ''}")
        
        # Raw data
        print("\n[TESTS]")
        print(f"{'Date':12} {'Mode':10} {'WPM':>6} {'Acc':>6} {'Cons':>6}")
        print("-" * 45)
        for r in data[:20]:
            ts = datetime.fromtimestamp(r.get("timestamp", 0) / 1000).strftime("%m/%d %H:%M")
            mode = f"{r.get('mode', '?')}-{r.get('mode2', '?')}"
            print(f"{ts:12} {mode:10} {r.get('wpm', 0):>6.0f} {r.get('acc', 0):>5.1f}% {r.get('consistency', 0):>5.1f}%")
        
        # Cache for comparison
        cache = load_cache()
        cache["lastFetch"] = datetime.now().isoformat()
        cache["recentResults"] = data
        save_cache(cache)
        
    except Exception as e:
        print(f"Error: {e}")

def cmd_compare(config: dict, args):
    """Compare this week vs last week"""
    print("=" * 50)
    print("WEEK-OVER-WEEK COMPARISON")
    print("=" * 50)
    
    try:
        # Get last 200 results for comparison
        data = api_get("/results", config, {"limit": 200}).get("data", [])
        
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        
        this_week = []
        last_week = []
        
        for r in data:
            ts = datetime.fromtimestamp(r.get("timestamp", 0) / 1000)
            if ts >= week_ago:
                this_week.append(r)
            elif ts >= two_weeks_ago:
                last_week.append(r)
        
        if not this_week:
            print("No tests this week.")
            return
        if not last_week:
            print("No tests last week to compare.")
            return
        
        tw_wpm = sum(r.get("wpm", 0) for r in this_week) / len(this_week)
        lw_wpm = sum(r.get("wpm", 0) for r in last_week) / len(last_week)
        
        tw_acc = sum(r.get("acc", 0) for r in this_week) / len(this_week)
        lw_acc = sum(r.get("acc", 0) for r in last_week) / len(last_week)
        
        print(f"\n{'Metric':<15} {'This Week':>12} {'Last Week':>12} {'Change':>10}")
        print("-" * 50)
        
        wpm_diff = tw_wpm - lw_wpm
        print(f"{'Avg WPM':<15} {tw_wpm:>12.1f} {lw_wpm:>12.1f} {wpm_diff:>+10.1f}")
        
        acc_diff = tw_acc - lw_acc
        print(f"{'Avg Accuracy':<15} {tw_acc:>11.1f}% {lw_acc:>11.1f}% {acc_diff:>+9.1f}%")
        
        print(f"{'Tests':<15} {len(this_week):>12} {len(last_week):>12} {len(this_week)-len(last_week):>+10}")
        
    except Exception as e:
        print(f"Error: {e}")

def cmd_leaderboard(config: dict, args):
    """Show leaderboard"""
    mode = args.mode or "time"
    mode2 = args.mode2 or "60"
    
    print("=" * 50)
    print(f"LEADERBOARD ({mode}-{mode2})")
    print("=" * 50)
    
    try:
        data = api_get("/leaderboards", config, {
            "language": "english",
            "mode": mode,
            "mode2": mode2,
            "skip": 0,
            "limit": 10
        }).get("data", [])
        
        print(f"\n{'Rank':>4} {'Name':<20} {'WPM':>8} {'Acc':>8}")
        print("-" * 45)
        for i, entry in enumerate(data, 1):
            print(f"{i:>4} {entry.get('name', '?'):<20} {entry.get('wpm', 0):>8.1f} {entry.get('acc', 0):>7.1f}%")
            
    except Exception as e:
        print(f"Error: {e}")

def cmd_setup(config: dict, args):
    """Interactive setup - outputs prompts for agent to use"""
    print("SETUP_REQUIRED")
    print("Ask user for their Monkeytype ApeKey.")
    print("Instructions: Monkeytype -> Settings -> ApeKeys -> Generate")
    print("After receiving key, save to config/monkeytype.json")
    print("Then ask about automation preferences (daily/weekly reports)")

def main():
    parser = argparse.ArgumentParser(description="Monkeytype Stats Tracker")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Stats command
    subparsers.add_parser("stats", help="Show overall stats and PBs")
    
    # History command
    history_parser = subparsers.add_parser("history", help="Show recent test history")
    history_parser.add_argument("--limit", type=int, default=50, help="Number of results")
    
    # Compare command
    subparsers.add_parser("compare", help="Week-over-week comparison")
    
    # Leaderboard command
    lb_parser = subparsers.add_parser("leaderboard", help="Show leaderboard")
    lb_parser.add_argument("--mode", default="time", help="Mode (time/words)")
    lb_parser.add_argument("--mode2", default="60", help="Mode2 (15/30/60/120)")
    
    # Setup command
    subparsers.add_parser("setup", help="Interactive setup")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    config = load_config()
    
    if args.command == "setup":
        cmd_setup(config, args)
        return
    
    if not config.get("apeKey"):
        print("ERROR_NO_CONFIG: Monkeytype is not set up. No API key found.")
        print("SETUP_HINT: Ask user for their ApeKey from Monkeytype -> Account Settings -> Ape Keys")
        return
    
    commands = {
        "stats": cmd_stats,
        "history": cmd_history,
        "compare": cmd_compare,
        "leaderboard": cmd_leaderboard,
    }
    
    if args.command in commands:
        commands[args.command](config, args)

if __name__ == "__main__":
    main()
