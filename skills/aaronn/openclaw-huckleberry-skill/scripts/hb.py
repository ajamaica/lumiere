#!/usr/bin/env python3
"""
Huckleberry Baby Tracker CLI
A command-line interface for the Huckleberry baby tracking app.

Requires: pip install huckleberry-api
Auth: Set HUCKLEBERRY_EMAIL and HUCKLEBERRY_PASSWORD environment variables,
      or use a credentials file at ~/.config/huckleberry/credentials.json

Created with AI - 2026-01-27
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

try:
    from huckleberry_api import HuckleberryAPI
    from google.cloud import firestore
except ImportError:
    print("Error: huckleberry-api not installed. Run: pip install huckleberry-api", file=sys.stderr)
    sys.exit(1)


def get_credentials() -> tuple[str, str, str]:
    """Get credentials from environment or config file."""
    email = os.environ.get("HUCKLEBERRY_EMAIL")
    password = os.environ.get("HUCKLEBERRY_PASSWORD")
    timezone = os.environ.get("HUCKLEBERRY_TIMEZONE", "America/Los_Angeles")
    
    if not email or not password:
        config_path = Path.home() / ".config" / "huckleberry" / "credentials.json"
        if config_path.exists():
            with open(config_path) as f:
                creds = json.load(f)
                email = email or creds.get("email")
                password = password or creds.get("password")
                timezone = creds.get("timezone", timezone)
    
    if not email or not password:
        print("Error: Missing credentials. Set HUCKLEBERRY_EMAIL and HUCKLEBERRY_PASSWORD", file=sys.stderr)
        print("Or create ~/.config/huckleberry/credentials.json with {\"email\": ..., \"password\": ...}", file=sys.stderr)
        sys.exit(1)
    
    return email, password, timezone


def get_timezone_offset_minutes(tz_name: str) -> float:
    """Get timezone offset in minutes from UTC (positive = behind UTC, e.g. PST=480).
    
    Huckleberry expects offset as positive minutes behind UTC.
    E.g., PST (UTC-8) = 480 minutes.
    """
    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo(tz_name)
        # Get current offset
        now = datetime.now(tz)
        offset_seconds = now.utcoffset().total_seconds()
        # Huckleberry uses positive values for behind UTC (opposite of standard)
        return -offset_seconds / 60
    except Exception:
        # Fallback: assume PST
        return 480.0


def get_api() -> HuckleberryAPI:
    """Initialize and authenticate API client."""
    email, password, timezone = get_credentials()
    api = HuckleberryAPI(email=email, password=password, timezone=timezone)
    api.authenticate()
    return api


def get_child_uid(api: HuckleberryAPI, child_name: str | None = None) -> str:
    """Get child UID, optionally filtering by name."""
    children = api.get_children()
    if not children:
        print("Error: No children found in account", file=sys.stderr)
        sys.exit(1)
    
    if child_name:
        for child in children:
            if child["name"].lower() == child_name.lower():
                return child["uid"]
        print(f"Error: Child '{child_name}' not found. Available: {[c['name'] for c in children]}", file=sys.stderr)
        sys.exit(1)
    
    # Default to first child
    return children[0]["uid"]


def add_notes_to_latest_interval(api: HuckleberryAPI, collection: str, child_uid: str, notes: str, subcollection: str = "intervals") -> None:
    """Add notes to the most recent interval document."""
    client = api._get_firestore_client()
    intervals_ref = client.collection(collection).document(child_uid).collection(subcollection)
    
    # Get most recent interval
    recent = list(intervals_ref.order_by("start", direction=firestore.Query.DESCENDING).limit(1).get())
    if recent:
        recent[0].reference.update({"notes": notes})


def cmd_children(args: argparse.Namespace) -> None:
    """List children in account."""
    api = get_api()
    children = api.get_children()
    
    if args.json:
        print(json.dumps(children, indent=2, default=str))
    else:
        for child in children:
            print(f"- {child['name']} (uid: {child['uid']})")
            if child.get("birthday"):
                print(f"  Birthday: {child['birthday']}")
            if child.get("gender"):
                print(f"  Gender: {child['gender']}")


def cmd_sleep_log(args: argparse.Namespace) -> None:
    """Log a completed sleep with specific start time and duration."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    
    # Parse start time or calculate from end time
    now = datetime.now()
    
    if args.start:
        # Parse start time (HH:MM or YYYY-MM-DD HH:MM)
        try:
            if len(args.start) <= 5:  # HH:MM format, assume today
                start = datetime.strptime(args.start, "%H:%M").replace(
                    year=now.year, month=now.month, day=now.day
                )
            else:
                start = datetime.strptime(args.start, "%Y-%m-%d %H:%M")
        except ValueError:
            print("Error: Invalid start time format. Use HH:MM or YYYY-MM-DD HH:MM", file=sys.stderr)
            sys.exit(1)
    elif args.duration:
        # Calculate start from duration (assume ended now or at specified end time)
        if args.end:
            try:
                if len(args.end) <= 5:
                    end = datetime.strptime(args.end, "%H:%M").replace(
                        year=now.year, month=now.month, day=now.day
                    )
                else:
                    end = datetime.strptime(args.end, "%Y-%m-%d %H:%M")
            except ValueError:
                print("Error: Invalid end time format. Use HH:MM or YYYY-MM-DD HH:MM", file=sys.stderr)
                sys.exit(1)
        else:
            end = now
        start = end - timedelta(minutes=args.duration)
    else:
        print("Error: Must specify --start or --duration", file=sys.stderr)
        sys.exit(1)
    
    # Calculate end time
    if args.duration:
        end = start + timedelta(minutes=args.duration)
    elif args.end:
        try:
            if len(args.end) <= 5:
                end = datetime.strptime(args.end, "%H:%M").replace(
                    year=now.year, month=now.month, day=now.day
                )
            else:
                end = datetime.strptime(args.end, "%Y-%m-%d %H:%M")
        except ValueError:
            print("Error: Invalid end time format", file=sys.stderr)
            sys.exit(1)
    else:
        end = now
    
    duration_secs = int((end - start).total_seconds())
    
    # Get timezone offset for Huckleberry (requires offset field for correct display)
    _, _, tz_name = get_credentials()
    offset_minutes = get_timezone_offset_minutes(tz_name)
    
    # Write directly to Firestore
    client = api._get_firestore_client()
    intervals_ref = client.collection("sleep").document(child_uid).collection("intervals")
    
    doc_data = {
        "start": float(start.timestamp()),
        "end": float(end.timestamp()),
        "duration": float(duration_secs),
        "offset": offset_minutes,
        "end_offset": offset_minutes,
        "pauses": [],
        "lastUpdated": datetime.now().timestamp(),
    }
    if args.notes:
        doc_data["notes"] = args.notes
    
    intervals_ref.add(doc_data)
    
    mins = duration_secs // 60
    print(f"✓ Sleep logged: {start.strftime('%H:%M')} - {end.strftime('%H:%M')} ({mins}min)" + 
          (f" (notes: {args.notes})" if args.notes else ""))


def cmd_sleep_start(args: argparse.Namespace) -> None:
    """Start sleep tracking."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.start_sleep(child_uid)
    print("✓ Sleep started")


def cmd_sleep_pause(args: argparse.Namespace) -> None:
    """Pause sleep tracking."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.pause_sleep(child_uid)
    print("✓ Sleep paused")


def cmd_sleep_resume(args: argparse.Namespace) -> None:
    """Resume sleep tracking."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.resume_sleep(child_uid)
    print("✓ Sleep resumed")


def cmd_sleep_cancel(args: argparse.Namespace) -> None:
    """Cancel sleep session without saving."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.cancel_sleep(child_uid)
    print("✓ Sleep cancelled (not saved)")


def cmd_sleep_complete(args: argparse.Namespace) -> None:
    """Complete and save sleep session."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.complete_sleep(child_uid)
    
    # Add notes if provided
    if args.notes:
        add_notes_to_latest_interval(api, "sleep", child_uid, args.notes)
    
    print("✓ Sleep completed and saved" + (f" (notes: {args.notes})" if args.notes else ""))


def cmd_feed_start(args: argparse.Namespace) -> None:
    """Start breastfeeding session."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.start_feeding(child_uid, side=args.side)
    print(f"✓ Feeding started on {args.side} side")


def cmd_feed_pause(args: argparse.Namespace) -> None:
    """Pause feeding session."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.pause_feeding(child_uid)
    print("✓ Feeding paused")


def cmd_feed_resume(args: argparse.Namespace) -> None:
    """Resume feeding session."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    side = args.side if args.side else None
    api.resume_feeding(child_uid, side=side)
    print(f"✓ Feeding resumed" + (f" on {side} side" if side else ""))


def cmd_feed_switch(args: argparse.Namespace) -> None:
    """Switch feeding side."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.switch_feeding_side(child_uid)
    print("✓ Switched feeding side")


def cmd_feed_cancel(args: argparse.Namespace) -> None:
    """Cancel feeding session without saving."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.cancel_feeding(child_uid)
    print("✓ Feeding cancelled (not saved)")


def cmd_feed_complete(args: argparse.Namespace) -> None:
    """Complete and save feeding session."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.complete_feeding(child_uid)
    
    # Add notes if provided
    if args.notes:
        add_notes_to_latest_interval(api, "feed", child_uid, args.notes)
    
    print("✓ Feeding completed and saved" + (f" (notes: {args.notes})" if args.notes else ""))


def cmd_bottle(args: argparse.Namespace) -> None:
    """Log bottle feeding."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    api.log_bottle_feeding(
        child_uid,
        amount=args.amount,
        bottle_type=args.type,
        units=args.units
    )
    
    # Add notes if provided
    if args.notes:
        add_notes_to_latest_interval(api, "feed", child_uid, args.notes)
    
    print(f"✓ Bottle feeding logged: {args.amount}{args.units} of {args.type}" + (f" (notes: {args.notes})" if args.notes else ""))


def cmd_diaper(args: argparse.Namespace) -> None:
    """Log diaper change."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    
    api.log_diaper(
        child_uid,
        mode=args.mode,
        pee_amount=args.pee_amount,
        poo_amount=args.poo_amount,
        color=args.color,
        consistency=args.consistency,
        diaper_rash=args.rash,
        notes=args.notes  # Diaper already supports notes in upstream API
    )
    
    details = [args.mode]
    if args.pee_amount:
        details.append(f"pee={args.pee_amount}")
    if args.poo_amount:
        details.append(f"poo={args.poo_amount}")
    if args.color:
        details.append(f"color={args.color}")
    if args.consistency:
        details.append(f"consistency={args.consistency}")
    if args.rash:
        details.append("diaper rash")
    if args.notes:
        details.append(f"notes: {args.notes}")
    
    print(f"✓ Diaper logged: {', '.join(details)}")


def cmd_growth(args: argparse.Namespace) -> None:
    """Log growth measurements."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    
    if not args.weight and not args.height and not args.head:
        print("Error: At least one measurement required (--weight, --height, or --head)", file=sys.stderr)
        sys.exit(1)
    
    api.log_growth(
        child_uid,
        weight=args.weight,
        height=args.height,
        head=args.head,
        units=args.units
    )
    
    # Add notes if provided (health uses "data" subcollection, not "intervals")
    if args.notes:
        add_notes_to_latest_interval(api, "health", child_uid, args.notes, subcollection="data")
    
    measurements = []
    unit_suffix = "kg/cm" if args.units == "metric" else "lbs/in"
    if args.weight:
        measurements.append(f"weight={args.weight}")
    if args.height:
        measurements.append(f"height={args.height}")
    if args.head:
        measurements.append(f"head={args.head}")
    
    print(f"✓ Growth logged ({unit_suffix}): {', '.join(measurements)}" + (f" (notes: {args.notes})" if args.notes else ""))


def cmd_growth_get(args: argparse.Namespace) -> None:
    """Get latest growth measurements."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    data = api.get_growth_data(child_uid)
    
    if args.json:
        print(json.dumps(data, indent=2, default=str))
    else:
        print("Latest growth measurements:")
        if data.get("weight"):
            print(f"  Weight: {data['weight']} {data.get('weight_units', 'kg')}")
        if data.get("height"):
            print(f"  Height: {data['height']} {data.get('height_units', 'cm')}")
        if data.get("head"):
            print(f"  Head: {data['head']} {data.get('head_units', 'cm')}")
        if data.get("timestamp_sec"):
            dt = datetime.fromtimestamp(data["timestamp_sec"])
            print(f"  Recorded: {dt.strftime('%Y-%m-%d %H:%M')}")


def cmd_history(args: argparse.Namespace) -> None:
    """Get history of events for a date range."""
    api = get_api()
    child_uid = get_child_uid(api, args.child)
    
    # Parse date range
    if args.date:
        # Single date
        try:
            date = datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            print(f"Error: Invalid date format. Use YYYY-MM-DD", file=sys.stderr)
            sys.exit(1)
        start = date.replace(hour=0, minute=0, second=0)
        end = date.replace(hour=23, minute=59, second=59)
    else:
        # Default: today
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        days_back = args.days or 1
        start = today - timedelta(days=days_back - 1)
        end = datetime.now()
    
    start_ts = int(start.timestamp())
    end_ts = int(end.timestamp())
    
    # Get events based on type filter
    events = {}
    event_types = args.type if args.type else ["sleep", "feed", "diaper", "health"]
    
    if "sleep" in event_types:
        events["sleep"] = api.get_sleep_intervals(child_uid, start_ts, end_ts)
    if "feed" in event_types:
        events["feed"] = api.get_feed_intervals(child_uid, start_ts, end_ts)
    if "diaper" in event_types:
        events["diaper"] = api.get_diaper_intervals(child_uid, start_ts, end_ts)
    if "health" in event_types:
        events["health"] = api.get_health_entries(child_uid, start_ts, end_ts)
    
    if args.json:
        print(json.dumps(events, indent=2, default=str))
    else:
        print(f"History from {start.strftime('%Y-%m-%d %H:%M')} to {end.strftime('%Y-%m-%d %H:%M')}:")
        
        for event_type, items in events.items():
            if items:
                print(f"\n{event_type.upper()} ({len(items)} events):")
                for item in items:
                    ts = datetime.fromtimestamp(item.get("start", 0))
                    time_str = ts.strftime("%Y-%m-%d %H:%M")
                    
                    if event_type == "sleep":
                        duration = item.get("duration", 0)
                        mins = duration // 60
                        print(f"  {time_str} - {mins}min")
                    elif event_type == "feed":
                        left = item.get("leftDuration", 0)
                        right = item.get("rightDuration", 0)
                        if left or right:
                            print(f"  {time_str} - L:{left:.0f}s R:{right:.0f}s")
                        else:
                            print(f"  {time_str}")
                    elif event_type == "diaper":
                        mode = item.get("mode", "?")
                        print(f"  {time_str} - {mode}")
                    elif event_type == "health":
                        parts = []
                        if item.get("weight"):
                            parts.append(f"weight={item['weight']}")
                        if item.get("height"):
                            parts.append(f"height={item['height']}")
                        if item.get("head"):
                            parts.append(f"head={item['head']}")
                        print(f"  {time_str} - {', '.join(parts) if parts else 'growth'}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Huckleberry Baby Tracker CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--child", "-c", help="Child name (defaults to first child)")
    parser.add_argument("--json", "-j", action="store_true", help="Output as JSON")
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Children
    subparsers.add_parser("children", help="List children in account")
    
    # Sleep commands
    sleep_log = subparsers.add_parser("sleep-log", help="Log a completed sleep with specific times")
    sleep_log.add_argument("--start", "-s", help="Start time (HH:MM or YYYY-MM-DD HH:MM)")
    sleep_log.add_argument("--end", "-e", help="End time (HH:MM or YYYY-MM-DD HH:MM, default: now)")
    sleep_log.add_argument("--duration", "-d", type=int, help="Duration in minutes")
    sleep_log.add_argument("--notes", "-n", help="Notes for this sleep")
    
    subparsers.add_parser("sleep-start", help="Start sleep tracking")
    subparsers.add_parser("sleep-pause", help="Pause sleep tracking")
    subparsers.add_parser("sleep-resume", help="Resume sleep tracking")
    subparsers.add_parser("sleep-cancel", help="Cancel sleep (don't save)")
    
    sleep_complete = subparsers.add_parser("sleep-complete", help="Complete and save sleep")
    sleep_complete.add_argument("--notes", "-n", help="Notes for this sleep session")
    
    # Feed commands
    feed_start = subparsers.add_parser("feed-start", help="Start breastfeeding")
    feed_start.add_argument("--side", "-s", choices=["left", "right"], default="left",
                           help="Starting side (default: left)")
    
    subparsers.add_parser("feed-pause", help="Pause feeding")
    
    feed_resume = subparsers.add_parser("feed-resume", help="Resume feeding")
    feed_resume.add_argument("--side", "-s", choices=["left", "right"],
                            help="Side to resume on (optional)")
    
    subparsers.add_parser("feed-switch", help="Switch feeding side")
    subparsers.add_parser("feed-cancel", help="Cancel feeding (don't save)")
    
    feed_complete = subparsers.add_parser("feed-complete", help="Complete and save feeding")
    feed_complete.add_argument("--notes", "-n", help="Notes for this feeding session")
    
    # Bottle command
    bottle = subparsers.add_parser("bottle", help="Log bottle feeding")
    bottle.add_argument("amount", type=float, help="Amount fed")
    bottle.add_argument("--type", "-t", choices=["Breast Milk", "Formula", "Mixed"],
                       default="Formula", help="Bottle contents (default: Formula)")
    bottle.add_argument("--units", "-u", choices=["ml", "oz"], default="ml",
                       help="Volume units (default: ml)")
    bottle.add_argument("--notes", "-n", help="Notes for this bottle feeding")
    
    # Diaper command
    diaper = subparsers.add_parser("diaper", help="Log diaper change")
    diaper.add_argument("mode", choices=["pee", "poo", "both", "dry"],
                       help="Diaper type")
    diaper.add_argument("--pee-amount", choices=["little", "medium", "big"],
                       help="Pee amount")
    diaper.add_argument("--poo-amount", choices=["little", "medium", "big"],
                       help="Poo amount")
    diaper.add_argument("--color", choices=["yellow", "brown", "black", "green", "red", "gray"],
                       help="Poo color")
    diaper.add_argument("--consistency",
                       choices=["solid", "loose", "runny", "mucousy", "hard", "pebbles", "diarrhea"],
                       help="Poo consistency")
    diaper.add_argument("--rash", action="store_true", help="Diaper rash present")
    diaper.add_argument("--notes", "-n", help="Notes for this diaper change")
    
    # Growth commands
    growth = subparsers.add_parser("growth", help="Log growth measurements")
    growth.add_argument("--weight", "-w", type=float, help="Weight (kg or lbs)")
    growth.add_argument("--height", "-l", type=float, help="Height/length (cm or in)")
    growth.add_argument("--head", type=float, help="Head circumference (cm or in)")
    growth.add_argument("--units", "-u", choices=["metric", "imperial"], default="metric",
                       help="Measurement units (default: metric)")
    growth.add_argument("--notes", "-n", help="Notes for this growth measurement")
    
    subparsers.add_parser("growth-get", help="Get latest growth measurements")
    
    # History command
    history = subparsers.add_parser("history", help="Get history of events")
    history.add_argument("--date", "-d", help="Date to fetch (YYYY-MM-DD)")
    history.add_argument("--days", type=int, help="Number of days back (default: 1)")
    history.add_argument("--type", "-t", action="append",
                        choices=["sleep", "feed", "diaper", "health"],
                        help="Event types to fetch (can repeat, default: all)")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    commands = {
        "children": cmd_children,
        "sleep-log": cmd_sleep_log,
        "sleep-start": cmd_sleep_start,
        "sleep-pause": cmd_sleep_pause,
        "sleep-resume": cmd_sleep_resume,
        "sleep-cancel": cmd_sleep_cancel,
        "sleep-complete": cmd_sleep_complete,
        "feed-start": cmd_feed_start,
        "feed-pause": cmd_feed_pause,
        "feed-resume": cmd_feed_resume,
        "feed-switch": cmd_feed_switch,
        "feed-cancel": cmd_feed_cancel,
        "feed-complete": cmd_feed_complete,
        "bottle": cmd_bottle,
        "diaper": cmd_diaper,
        "growth": cmd_growth,
        "growth-get": cmd_growth_get,
        "history": cmd_history,
    }
    
    commands[args.command](args)


if __name__ == "__main__":
    main()
