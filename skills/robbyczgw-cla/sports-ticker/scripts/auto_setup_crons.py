#!/usr/bin/env python3
"""
Auto Setup Crons - Generate cron configurations for upcoming fixtures.

Generates cron jobs for:
1. Pre-match reminder (30 mins before kickoff)
2. Live ticker activation (5 mins before kickoff)
3. Match monitoring (every 2 mins during match)

Usage:
    auto_setup_crons.py                     # All teams, next 7 days
    auto_setup_crons.py --days 14           # Next 14 days
    auto_setup_crons.py --team spurs        # Specific team
    auto_setup_crons.py --team spurs --output crons.json
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(Path(__file__).parent))
from config import get_teams, get_team_by_name

# Import schedule functions
from schedule import get_team_schedule, get_all_fixtures_json


def fixture_to_crons(fixture: dict, reminder_mins: int = 30, 
                     ticker_before_mins: int = 5, ticker_duration_mins: int = 180) -> list:
    """Generate cron configurations for a single fixture.
    
    Args:
        fixture: Fixture dict from schedule
        reminder_mins: Minutes before kickoff for reminder
        ticker_before_mins: Minutes before kickoff to start ticker
        ticker_duration_mins: How long to run ticker (default 3 hours)
    
    Returns:
        List of cron config dicts ready for OpenClaw cron API
    """
    crons = []
    
    date_str = fixture.get("date", "")
    if not date_str:
        return []
    
    try:
        kickoff = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except:
        return []
    
    # Skip if already in the past
    now = datetime.now(timezone.utc)
    if kickoff <= now:
        return []
    
    team_name = fixture.get("team_name", "Team")
    team_short = fixture.get("team_short", team_name.split()[0])
    opponent = fixture.get("opponent_short", fixture.get("opponent", "Opponent"))
    comp = fixture.get("competition", "Match")
    is_home = fixture.get("is_home", True)
    event_id = fixture.get("event_id", "")
    league = fixture.get("league", "eng.1")
    sport = fixture.get("sport", "soccer")
    
    # Match description
    home_away = "vs" if is_home else "@"
    match_desc = f"{team_short} {home_away} {opponent} ({comp})"
    
    # Date parts for cron expression
    kickoff_date = kickoff.strftime("%Y-%m-%d")
    
    # 1. Pre-match reminder
    reminder_time = kickoff - timedelta(minutes=reminder_mins)
    if reminder_time > now:
        reminder_cron = f"{reminder_time.minute} {reminder_time.hour} {reminder_time.day} {reminder_time.month} *"
        crons.append({
            "name": f"{team_short.lower()}-reminder-{kickoff_date}",
            "description": f"Pre-match reminder: {match_desc}",
            "schedule": reminder_cron,
            "oneshot": True,
            "enabled": True,
            "message": f"⏰ **Match Reminder!**\n\n{fixture.get('team_emoji', '⚽')} {match_desc}\n\n🕐 Kickoff in {reminder_mins} minutes!\n📍 {fixture.get('venue', 'TBD')}",
            "metadata": {
                "type": "reminder",
                "fixture_id": event_id,
                "kickoff": date_str,
                "team": team_short
            }
        })
    
    # 2. Live ticker start (one-shot to enable the monitoring)
    ticker_start = kickoff - timedelta(minutes=ticker_before_mins)
    if ticker_start > now:
        ticker_start_cron = f"{ticker_start.minute} {ticker_start.hour} {ticker_start.day} {ticker_start.month} *"
        
        # End time for ticker (kickoff + duration)
        ticker_end = kickoff + timedelta(minutes=ticker_duration_mins)
        
        crons.append({
            "name": f"{team_short.lower()}-ticker-start-{kickoff_date}",
            "description": f"Start live ticker: {match_desc}",
            "schedule": ticker_start_cron,
            "oneshot": True,
            "enabled": True,
            "message": f"Start live monitoring for {match_desc}. Run `python3 scripts/live_monitor.py` every 2 minutes until match ends. Event ID: {event_id}, League: {league}, Sport: {sport}",
            "metadata": {
                "type": "ticker_start",
                "fixture_id": event_id,
                "league": league,
                "sport": sport,
                "kickoff": date_str,
                "end_time": ticker_end.isoformat(),
                "team": team_short
            }
        })
    
    # 3. Live ticker (repeating during match)
    # This runs every 2 minutes for the duration of the match
    # Uses a different approach: window-based cron
    crons.append({
        "name": f"{team_short.lower()}-ticker-{kickoff_date}",
        "description": f"Live updates: {match_desc}",
        "schedule": "*/2 * * * *",  # Every 2 minutes
        "oneshot": False,
        "enabled": False,  # Disabled by default, enabled by ticker_start
        "window": {
            "start": (kickoff - timedelta(minutes=ticker_before_mins)).isoformat(),
            "end": (kickoff + timedelta(minutes=ticker_duration_mins)).isoformat()
        },
        "message": f"Check for updates on {match_desc}. Run `python3 scripts/live_monitor.py --event {event_id} --league {league} --sport {sport}`. Only report new events.",
        "metadata": {
            "type": "ticker",
            "fixture_id": event_id,
            "league": league,
            "sport": sport,
            "kickoff": date_str,
            "team": team_short
        }
    })
    
    return crons


def generate_cron_configs(fixtures: list, reminder_mins: int = 30) -> list:
    """Generate cron configs for a list of fixtures."""
    all_crons = []
    
    for fixture in fixtures:
        crons = fixture_to_crons(fixture, reminder_mins=reminder_mins)
        all_crons.extend(crons)
    
    return all_crons


def format_cron_summary(crons: list) -> str:
    """Format a human-readable summary of cron configs."""
    if not crons:
        return "No cron jobs to generate (no upcoming fixtures found)."
    
    lines = ["📅 **Generated Cron Jobs**\n"]
    
    # Group by fixture
    fixtures = {}
    for cron in crons:
        fixture_id = cron.get("metadata", {}).get("fixture_id", "unknown")
        if fixture_id not in fixtures:
            fixtures[fixture_id] = {
                "desc": cron.get("description", ""),
                "crons": []
            }
        fixtures[fixture_id]["crons"].append(cron)
    
    for fixture_id, data in fixtures.items():
        lines.append(f"\n🎯 **{data['desc'].split(': ')[-1]}**")
        for cron in data["crons"]:
            cron_type = cron.get("metadata", {}).get("type", "?")
            enabled = "✅" if cron.get("enabled") else "⏸️"
            schedule = cron.get("schedule", "?")
            lines.append(f"  {enabled} `{cron['name']}` ({cron_type})")
            lines.append(f"      Schedule: `{schedule}`")
    
    lines.append(f"\n**Total: {len(crons)} cron jobs for {len(fixtures)} fixtures**")
    
    return "\n".join(lines)


def output_openclaw_commands(crons: list) -> str:
    """Generate OpenClaw CLI commands to add these crons."""
    if not crons:
        return "# No crons to add"
    
    lines = ["# OpenClaw cron commands", "# Run these to set up match alerts\n"]
    
    for cron in crons:
        name = cron["name"]
        schedule = cron["schedule"]
        message = cron["message"].replace('"', '\\"').replace('\n', '\\n')
        enabled = "" if cron.get("enabled") else "--disabled"
        oneshot = "--oneshot" if cron.get("oneshot") else ""
        
        cmd = f'openclaw cron add "{name}" "{schedule}" "{message}" {enabled} {oneshot}'.strip()
        lines.append(cmd)
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Generate cron configurations for upcoming fixtures",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # All teams, next 7 days
  %(prog)s --days 14                 # Next 14 days
  %(prog)s --team spurs              # Only Spurs
  %(prog)s --output crons.json       # Save to file
  %(prog)s --commands                # Output as CLI commands
        """
    )
    parser.add_argument("--days", "-d", type=int, default=7,
                       help="Days to look ahead (default: 7)")
    parser.add_argument("--team", "-t", type=str,
                       help="Filter by team name")
    parser.add_argument("--reminder", "-r", type=int, default=30,
                       help="Reminder minutes before kickoff (default: 30)")
    parser.add_argument("--output", "-o", type=str,
                       help="Output JSON file path")
    parser.add_argument("--commands", "-c", action="store_true",
                       help="Output as OpenClaw CLI commands")
    parser.add_argument("--json", "-j", action="store_true",
                       help="Output as JSON")
    parser.add_argument("--summary", "-s", action="store_true",
                       help="Show human-readable summary (default)")
    
    args = parser.parse_args()
    
    # Get fixtures
    fixtures = get_all_fixtures_json(days=args.days, team_name=args.team)
    
    if not fixtures:
        print("No upcoming fixtures found.")
        sys.exit(0)
    
    # Generate cron configs
    crons = generate_cron_configs(fixtures, reminder_mins=args.reminder)
    
    # Output
    if args.output:
        Path(args.output).write_text(json.dumps(crons, indent=2))
        print(f"✅ Wrote {len(crons)} cron configs to {args.output}")
    elif args.commands:
        print(output_openclaw_commands(crons))
    elif args.json:
        print(json.dumps(crons, indent=2))
    else:
        # Default: summary
        print(format_cron_summary(crons))
        print("\n💡 Use --json or --commands for machine-readable output")


if __name__ == "__main__":
    main()
