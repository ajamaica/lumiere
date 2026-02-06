#!/usr/bin/env python3
"""
Simple health query script for agent use.

Usage:
    python health_query.py summary      # Today's health summary
    python health_query.py sleep        # Sleep analysis
    python health_query.py activities   # Recent activities
    python health_query.py snapshot     # Full health snapshot (JSON)
"""

import json
import sys
from datetime import date

try:
    from garmer import GarminClient
    from garmer.auth import AuthenticationError
except ImportError:
    print("Error: garmer not installed. Run: pip install garmer", file=sys.stderr)
    sys.exit(1)


def get_client() -> GarminClient:
    """Get authenticated Garmin client."""
    try:
        return GarminClient.from_saved_tokens()
    except AuthenticationError:
        print("Error: Not authenticated. Run 'garmer login' first.", file=sys.stderr)
        sys.exit(1)


def cmd_summary():
    """Print today's health summary."""
    client = get_client()
    summary = client.get_daily_summary()

    print(f"Date: {date.today()}")
    print(f"Steps: {summary.total_steps:,} / {summary.daily_step_goal:,}")
    print(f"Distance: {summary.total_distance_meters / 1000:.2f} km")
    print(f"Calories: {summary.total_kilocalories:,}")
    if summary.resting_heart_rate:
        print(f"Resting HR: {summary.resting_heart_rate} bpm")
    if summary.avg_stress_level:
        print(f"Avg Stress: {summary.avg_stress_level}")


def cmd_sleep():
    """Print sleep data."""
    client = get_client()
    sleep = client.get_sleep()

    if sleep:
        print(f"Total Sleep: {sleep.total_sleep_hours:.1f} hours")
        print(f"Deep Sleep: {sleep.deep_sleep_hours:.1f} hours")
        print(f"REM Sleep: {sleep.rem_sleep_hours:.1f} hours")
        if sleep.overall_score:
            print(f"Sleep Score: {sleep.overall_score}")
        if sleep.avg_hrv:
            print(f"HRV: {sleep.avg_hrv:.1f} ms")
    else:
        print("No sleep data available")


def cmd_activities():
    """Print recent activities."""
    client = get_client()
    activities = client.get_recent_activities(limit=5)

    if activities:
        for a in activities:
            print(f"- {a.activity_name} ({a.activity_type_key})")
            print(
                f"  Duration: {a.duration_minutes:.0f} min, Distance: {a.distance_km:.2f} km"
            )
    else:
        print("No recent activities")


def cmd_snapshot():
    """Print full health snapshot as JSON."""
    client = get_client()
    snapshot = client.get_health_snapshot()
    print(json.dumps(snapshot, indent=2, default=str))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    command = sys.argv[1].lower()

    commands = {
        "summary": cmd_summary,
        "sleep": cmd_sleep,
        "activities": cmd_activities,
        "snapshot": cmd_snapshot,
    }

    if command in commands:
        commands[command]()
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
