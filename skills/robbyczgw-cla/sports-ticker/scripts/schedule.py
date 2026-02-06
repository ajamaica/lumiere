#!/usr/bin/env python3
"""
Schedule - Show upcoming fixtures for configured teams.

Usage:
    schedule.py                     # All teams, next 14 days
    schedule.py --days 30           # All teams, next 30 days  
    schedule.py --team spurs        # Specific team
    schedule.py --team spurs --days 7 --json   # JSON output
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).parent))
from espn import get_team_fixtures, format_fixture, LEAGUES
from config import get_teams, get_team_by_name


def get_team_schedule(team: dict, days: int = 14) -> list:
    """Get schedule for a single team."""
    espn_id = team.get("espn_id")
    if not espn_id:
        return []
    
    leagues = team.get("espn_leagues", ["eng.1"])
    sport = team.get("sport", "soccer")
    
    return get_team_fixtures(espn_id, days=days, sport=sport, leagues=leagues)


def format_team_schedule(team: dict, fixtures: list, compact: bool = False) -> str:
    """Format schedule output for a team."""
    name = team.get("name", "Unknown")
    emoji = team.get("emoji", "⚽")
    
    lines = [f"{emoji} **{name}** - Upcoming Fixtures\n"]
    
    if not fixtures:
        lines.append("No fixtures found in the next period.")
    else:
        for f in fixtures:
            if compact:
                # Compact one-liner
                date_str = f.get("date", "")
                try:
                    dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    date_fmt = dt.strftime("%d/%m %H:%M")
                except:
                    date_fmt = date_str[:10]
                
                loc = "vs" if f.get("is_home") else "@"
                opp = f.get("opponent_short", f.get("opponent", "?"))
                comp = f.get("competition", "")
                lines.append(f"  {date_fmt} {loc} {opp} ({comp})")
            else:
                lines.append(format_fixture(f, include_venue=True))
                lines.append("")
    
    return "\n".join(lines)


def all_teams_schedule(days: int = 14, compact: bool = False) -> str:
    """Get schedule for all configured teams."""
    teams = get_teams()
    
    if not teams:
        return "No teams configured. Run setup.py first!"
    
    parts = []
    for team in teams:
        if team.get("espn_id"):
            fixtures = get_team_schedule(team, days)
            parts.append(format_team_schedule(team, fixtures, compact))
    
    if not parts:
        return "No teams with ESPN IDs configured."
    
    return ("\n" + "─" * 40 + "\n").join(parts)


def get_all_fixtures_json(days: int = 14, team_name: str = None) -> list:
    """Get all fixtures as JSON-serializable list."""
    teams = get_teams()
    all_fixtures = []
    
    for team in teams:
        if not team.get("espn_id"):
            continue
        
        # Filter by team name if specified
        if team_name:
            name_lower = team_name.lower()
            if name_lower not in team.get("name", "").lower() and \
               name_lower not in team.get("short_name", "").lower():
                continue
        
        fixtures = get_team_schedule(team, days)
        for f in fixtures:
            f["team_name"] = team.get("name")
            f["team_short"] = team.get("short_name")
            f["team_emoji"] = team.get("emoji", "⚽")
            f["team_espn_id"] = team.get("espn_id")
            all_fixtures.append(f)
    
    # Sort all fixtures by date
    all_fixtures.sort(key=lambda x: x.get("date", ""))
    
    return all_fixtures


def main():
    parser = argparse.ArgumentParser(description="Show upcoming fixtures for your teams")
    parser.add_argument("--days", "-d", type=int, default=14, 
                       help="Number of days to look ahead (default: 14)")
    parser.add_argument("--team", "-t", type=str,
                       help="Filter by team name")
    parser.add_argument("--compact", "-c", action="store_true",
                       help="Compact output (one line per fixture)")
    parser.add_argument("--json", "-j", action="store_true",
                       help="Output as JSON")
    
    args = parser.parse_args()
    
    if args.json:
        fixtures = get_all_fixtures_json(days=args.days, team_name=args.team)
        print(json.dumps(fixtures, indent=2))
    elif args.team:
        team = get_team_by_name(args.team)
        if team:
            fixtures = get_team_schedule(team, days=args.days)
            print(format_team_schedule(team, fixtures, compact=args.compact))
        else:
            print(f"Team '{args.team}' not found in config.")
            sys.exit(1)
    else:
        print(all_teams_schedule(days=args.days, compact=args.compact))


if __name__ == "__main__":
    main()
