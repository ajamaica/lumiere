#!/usr/bin/env python3
"""
ClawdHub Skills Monitor - Main monitoring script
Tracks trending, new, and updated skills from ClawdHub API
"""

import sys
import json
import argparse
import time
from datetime import datetime, timedelta
from pathlib import Path

# Add scripts dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from clawdhub_api import ClawdHubAPI
from formatter import Formatter
from filter_engine import FilterEngine
from cache import Cache

def load_config(config_path):
    """Load config from JSON file"""
    if not config_path or not Path(config_path).exists():
        return {}
    
    with open(config_path, 'r') as f:
        return json.load(f)

def save_state(state_file, state):
    """Save monitoring state (for watch mode)"""
    with open(state_file, 'w') as f:
        json.dump(state, f, indent=2)

def load_state(state_file):
    """Load monitoring state"""
    if Path(state_file).exists():
        with open(state_file, 'r') as f:
            return json.load(f)
    return {}

def main():
    parser = argparse.ArgumentParser(description="Monitor trending skills from ClawdHub")
    
    parser.add_argument("--days", type=int, default=7, help="Days to look back")
    parser.add_argument("--interests", type=str, help="Comma-separated interests")
    parser.add_argument("--top", type=int, help="Top N skills")
    parser.add_argument("--format", choices=["text", "json", "markdown"], default="text")
    parser.add_argument("--category", type=str, help="Filter by category")
    parser.add_argument("--sort", choices=["downloads", "installs", "rating", "updated", "new"], default="downloads")
    parser.add_argument("--watch", action="store_true", help="Watch mode")
    parser.add_argument("--interval", type=int, default=3600, help="Check interval")
    parser.add_argument("--config", type=str, help="Config file path")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Initialize components
    api = ClawdHubAPI(verbose=args.verbose)
    formatter = Formatter(format_type=args.format)
    filter_engine = FilterEngine()
    cache = Cache()
    
    # Load config if provided
    config = load_config(args.config)
    
    # Parse interests
    interests = []
    if args.interests:
        interests = [i.strip() for i in args.interests.split(",")]
    elif "interests" in config:
        interests = config.get("interests", [])
    
    # State file for watch mode
    state_file = Path.home() / ".cache" / "trending-skills-monitor.json"
    state_file.parent.mkdir(parents=True, exist_ok=True)
    
    if args.verbose:
        print(f"📊 ClawdHub Skills Monitor", file=sys.stderr)
        print(f"   Format: {args.format}", file=sys.stderr)
        print(f"   Days: {args.days}", file=sys.stderr)
        if interests:
            print(f"   Interests: {', '.join(interests)}", file=sys.stderr)
        if args.category:
            print(f"   Category: {args.category}", file=sys.stderr)
        print(f"   Sort by: {args.sort}", file=sys.stderr)
        print("", file=sys.stderr)
    
    def fetch_and_report():
        """Fetch data and generate report"""
        try:
            # Fetch data from API
            new_skills = api.get_new_skills(days=args.days)
            trending_skills = api.get_trending_skills(top=args.top or 20)
            updated_skills = api.get_recently_updated_skills(days=args.days)
            
            # Apply filters
            if interests or args.category:
                new_skills = filter_engine.filter_by_interests(new_skills, interests, args.category)
                trending_skills = filter_engine.filter_by_interests(trending_skills, interests, args.category)
                updated_skills = filter_engine.filter_by_interests(updated_skills, interests, args.category)
            
            # Sort results
            trending_skills = sort_skills(trending_skills, args.sort)
            new_skills = sort_skills(new_skills, "new")
            updated_skills = sort_skills(updated_skills, "updated")
            
            # Limit results if requested
            if args.top:
                trending_skills = trending_skills[:args.top]
            
            # Generate report
            report = {
                "timestamp": datetime.now().isoformat(),
                "new_skills": new_skills,
                "trending_skills": trending_skills,
                "updated_skills": updated_skills,
                "filters": {
                    "days": args.days,
                    "interests": interests,
                    "category": args.category,
                    "sort": args.sort
                }
            }
            
            # Cache for comparison in watch mode
            prev_state = load_state(state_file)
            new_ids = {s['id'] for s in new_skills}
            prev_ids = {s['id'] for s in prev_state.get('new_skills', [])}
            added = new_ids - prev_ids
            
            # Format and output
            output = formatter.format(report)
            print(output)
            
            # Save state
            save_state(state_file, report)
            
            if args.watch and added:
                print(f"\n🆕 {len(added)} new skill(s) discovered!", file=sys.stderr)
            
            return True
        
        except Exception as e:
            print(f"❌ Error: {e}", file=sys.stderr)
            return False
    
    # Main loop
    if args.watch:
        print(f"👀 Watch mode enabled (checking every {args.interval}s)", file=sys.stderr)
        check_count = 0
        while True:
            check_count += 1
            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Check #{check_count}", file=sys.stderr)
            fetch_and_report()
            time.sleep(args.interval)
    else:
        fetch_and_report()

def sort_skills(skills, sort_by):
    """Sort skills list by specified criteria"""
    if sort_by == "downloads":
        return sorted(skills, key=lambda x: x.get('downloads', 0), reverse=True)
    elif sort_by == "installs":
        return sorted(skills, key=lambda x: x.get('installs', 0), reverse=True)
    elif sort_by == "rating":
        return sorted(skills, key=lambda x: x.get('rating', 0), reverse=True)
    elif sort_by == "updated":
        return sorted(skills, key=lambda x: x.get('updated_at', ''), reverse=True)
    elif sort_by == "new":
        return sorted(skills, key=lambda x: x.get('created_at', ''), reverse=True)
    return skills

if __name__ == "__main__":
    main()
