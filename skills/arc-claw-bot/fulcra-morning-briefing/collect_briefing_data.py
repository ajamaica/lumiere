#!/usr/bin/env python3
"""
Morning Briefing Data Collector
Pulls sleep, HR, HRV, calendar from Fulcra API + weather from wttr.in.
Outputs structured JSON for an agent to compose into a tone-calibrated briefing.

Usage:
    python3 collect_briefing_data.py [--location "New York"]
    python3 collect_briefing_data.py --location "London" --lookback 16
    python3 collect_briefing_data.py --demo          # synthetic calendar/location
    FULCRA_DEMO_MODE=true python3 collect_briefing_data.py

Requires: pip3 install fulcra-api
Auth: Run authorize_fulcra.py first to save a token.
"""

import json
import os
import subprocess
import sys
import argparse
import hashlib
from datetime import datetime, timedelta, timezone

TOKEN_FILE = os.path.expanduser("~/.config/fulcra/token.json")


# ---------------------------------------------------------------------------
# Demo mode: synthetic calendar & location data
# ---------------------------------------------------------------------------

# Three rotating daily schedules — picked deterministically by date
DEMO_CALENDARS = [
    # Schedule A: Builder day
    [
        {"title": "Morning standup", "start_hour": 9, "start_min": 0, "duration_min": 30, "location": ""},
        {"title": "Deep work block", "start_hour": 10, "start_min": 0, "duration_min": 120, "location": ""},
        {"title": "Lunch with investor", "start_hour": 12, "start_min": 30, "duration_min": 60, "location": "Blue Bottle Coffee, DUMBO"},
        {"title": "Product review", "start_hour": 14, "start_min": 0, "duration_min": 60, "location": "Conference Room A"},
        {"title": "1:1 with Jamie", "start_hour": 15, "start_min": 30, "duration_min": 30, "location": ""},
        {"title": "Gym", "start_hour": 17, "start_min": 30, "duration_min": 60, "location": "Equinox DUMBO"},
    ],
    # Schedule B: External-facing day
    [
        {"title": "Yoga", "start_hour": 7, "start_min": 30, "duration_min": 45, "location": "Y7 Studio, DUMBO"},
        {"title": "Team sync", "start_hour": 9, "start_min": 30, "duration_min": 30, "location": ""},
        {"title": "Design sprint", "start_hour": 10, "start_min": 0, "duration_min": 90, "location": ""},
        {"title": "Lunch", "start_hour": 12, "start_min": 0, "duration_min": 60, "location": "Juliana's Pizza, DUMBO"},
        {"title": "Partner call — a]6z", "start_hour": 14, "start_min": 0, "duration_min": 45, "location": ""},
        {"title": "Focus time: write investor update", "start_hour": 15, "start_min": 0, "duration_min": 90, "location": ""},
        {"title": "Drinks with Alex", "start_hour": 18, "start_min": 0, "duration_min": 90, "location": "Westlight, Williamsburg"},
    ],
    # Schedule C: Heads-down day
    [
        {"title": "Morning run", "start_hour": 6, "start_min": 30, "duration_min": 45, "location": "Brooklyn Bridge Park"},
        {"title": "Standup", "start_hour": 9, "start_min": 0, "duration_min": 15, "location": ""},
        {"title": "Architecture review", "start_hour": 10, "start_min": 0, "duration_min": 60, "location": ""},
        {"title": "Deep work: API redesign", "start_hour": 11, "start_min": 0, "duration_min": 120, "location": ""},
        {"title": "Lunch with co-founder", "start_hour": 13, "start_min": 0, "duration_min": 60, "location": "Shake Shack, DUMBO"},
        {"title": "Board deck prep", "start_hour": 14, "start_min": 30, "duration_min": 90, "location": ""},
        {"title": "1:1 with Sara", "start_hour": 16, "start_min": 30, "duration_min": 30, "location": ""},
        {"title": "Evening walk", "start_hour": 18, "start_min": 0, "duration_min": 30, "location": "Brooklyn Bridge Park"},
    ],
]

# Curated NYC demo locations — rotated by time-of-day
DEMO_LOCATIONS = [
    {"name": "DUMBO, Brooklyn", "lat": 40.7033, "lon": -73.9894, "context": "office"},
    {"name": "Central Park, Manhattan", "lat": 40.7829, "lon": -73.9654, "context": "outdoor"},
    {"name": "East Village, Manhattan", "lat": 40.7265, "lon": -73.9815, "context": "coffee shop"},
    {"name": "SoHo, Manhattan", "lat": 40.7233, "lon": -73.9985, "context": "lunch"},
    {"name": "Williamsburg, Brooklyn", "lat": 40.7081, "lon": -73.9571, "context": "evening"},
]


def _pick_schedule_index():
    """Pick a schedule deterministically based on today's date."""
    day_hash = int(hashlib.md5(datetime.now().strftime("%Y-%m-%d").encode()).hexdigest(), 16)
    return day_hash % len(DEMO_CALENDARS)


def get_demo_calendar():
    """Return synthetic calendar events for today, time-aware."""
    now = datetime.now(timezone.utc)
    today = now.date()
    schedule = DEMO_CALENDARS[_pick_schedule_index()]

    events = []
    for evt in schedule:
        start_dt = datetime(
            today.year, today.month, today.day,
            evt["start_hour"], evt["start_min"], tzinfo=timezone.utc
        )
        end_dt = start_dt + timedelta(minutes=evt["duration_min"])
        events.append({
            "title": evt["title"],
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
            "all_day": False,
            "location": evt["location"],
        })

    return {
        "available": True,
        "events": events,
        "count": len(events),
        "demo_mode": True,
    }


def get_demo_location():
    """Return a synthetic location based on time of day."""
    hour = datetime.now().hour
    if hour < 9:
        loc = DEMO_LOCATIONS[0]       # DUMBO — early morning / heading to office
    elif hour < 12:
        loc = DEMO_LOCATIONS[0]       # DUMBO — at the office
    elif hour < 14:
        loc = DEMO_LOCATIONS[3]       # SoHo — lunch
    elif hour < 17:
        loc = DEMO_LOCATIONS[0]       # DUMBO — back at office
    elif hour < 20:
        loc = DEMO_LOCATIONS[4]       # Williamsburg — evening
    else:
        loc = DEMO_LOCATIONS[2]       # East Village — late night

    return {
        "available": True,
        "name": loc["name"],
        "lat": loc["lat"],
        "lon": loc["lon"],
        "context": loc["context"],
        "demo_mode": True,
    }


def is_demo_mode(args):
    """Check if demo mode is enabled via CLI flag or env var."""
    if getattr(args, "demo", False):
        return True
    return os.environ.get("FULCRA_DEMO_MODE", "").lower() in ("true", "1", "yes")


def load_api():
    """Load Fulcra API with saved token."""
    try:
        from fulcra_api.core import FulcraAPI
    except ImportError:
        return None, "fulcra-api not installed. Run: pip3 install fulcra-api"

    if not os.path.exists(TOKEN_FILE):
        return None, f"No token file at {TOKEN_FILE}. Run authorize_fulcra.py first."

    with open(TOKEN_FILE) as f:
        token_data = json.load(f)

    exp = token_data.get("expiration")
    if exp:
        exp_dt = datetime.fromisoformat(exp)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if exp_dt < datetime.now(timezone.utc):
            return None, "Token expired. Re-run authorize_fulcra.py"

    api = FulcraAPI()
    api.fulcra_cached_access_token = token_data["access_token"]
    if exp:
        api.fulcra_cached_access_token_expiration = datetime.fromisoformat(exp)
    return api, None


def get_sleep(api, lookback_hours=14):
    """Get last night's sleep stages."""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(hours=lookback_hours)).isoformat()
    end = now.isoformat()

    try:
        samples = api.metric_samples(start, end, "SleepStage")
        if not samples:
            return {"available": False, "reason": "no data"}

        stage_names = {0: "InBed", 1: "Awake", 2: "Core", 3: "Deep", 4: "REM"}
        stage_minutes = {}

        for s in samples:
            try:
                sd = s["start_date"].replace("+00:00", "+0000")
                ed = s["end_date"].replace("+00:00", "+0000")
                start_dt = datetime.fromisoformat(sd)
                end_dt = datetime.fromisoformat(ed)
            except Exception:
                start_dt = datetime.strptime(s["start_date"][:19], "%Y-%m-%dT%H:%M:%S")
                end_dt = datetime.strptime(s["end_date"][:19], "%Y-%m-%dT%H:%M:%S")

            minutes = (end_dt - start_dt).total_seconds() / 60
            stage = stage_names.get(s.get("value", -1), f"Unknown({s.get('value')})")
            stage_minutes[stage] = stage_minutes.get(stage, 0) + minutes

        total = sum(stage_minutes.values())
        sleep_minutes = sum(v for k, v in stage_minutes.items() if k not in ("InBed", "Awake"))

        deep_pct = stage_minutes.get("Deep", 0) / max(sleep_minutes, 1) * 100
        rem_pct = stage_minutes.get("REM", 0) / max(sleep_minutes, 1) * 100

        if sleep_minutes < 360:
            quality = "poor"
        elif deep_pct < 10 or rem_pct < 15:
            quality = "fair"
        elif sleep_minutes >= 420 and deep_pct >= 15 and rem_pct >= 20:
            quality = "excellent"
        else:
            quality = "good"

        return {
            "available": True,
            "total_hours": round(sleep_minutes / 60, 1),
            "stages_minutes": {k: round(v, 0) for k, v in stage_minutes.items()},
            "quality": quality,
            "deep_pct": round(deep_pct, 1),
            "rem_pct": round(rem_pct, 1),
        }
    except Exception as e:
        return {"available": False, "reason": str(e)}


def get_heart_rate(api):
    """Get overnight/recent heart rate."""
    now = datetime.now(timezone.utc)
    try:
        samples = api.metric_samples(
            (now - timedelta(hours=10)).isoformat(), now.isoformat(), "HeartRate"
        )
        if not samples:
            return {"available": False}

        values = [s["value"] for s in samples if "value" in s]
        return {
            "available": True,
            "avg_bpm": round(sum(values) / len(values)),
            "min_bpm": round(min(values)),
            "max_bpm": round(max(values)),
            "resting_estimate_bpm": round(sorted(values)[: max(1, len(values) // 10)][-1]),
        }
    except Exception as e:
        return {"available": False, "reason": str(e)}


def get_hrv(api):
    """Get recent HRV."""
    now = datetime.now(timezone.utc)
    try:
        samples = api.metric_samples(
            (now - timedelta(hours=12)).isoformat(), now.isoformat(), "HeartRateVariabilitySDNN"
        )
        if not samples:
            return {"available": False}

        values = [s["value"] for s in samples if "value" in s]
        return {
            "available": True,
            "avg_ms": round(sum(values) / len(values), 1),
            "latest_ms": round(values[-1], 1),
        }
    except Exception as e:
        return {"available": False, "reason": str(e)}


def get_calendar(api):
    """Get today's calendar events."""
    now = datetime.now(timezone.utc)
    day_start = now.replace(hour=5, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(hours=24)

    try:
        events = api.calendar_events(day_start.isoformat(), day_end.isoformat())
        formatted = []
        for e in events:
            formatted.append({
                "title": e.get("title", "Untitled"),
                "start": e.get("start_time", ""),
                "end": e.get("end_time", ""),
                "all_day": e.get("all_day", False),
                "location": e.get("location", ""),
            })
        return {"available": True, "events": formatted, "count": len(formatted)}
    except Exception as e:
        return {"available": False, "reason": str(e)}


def get_steps(api):
    """Get last 24h step count."""
    now = datetime.now(timezone.utc)
    try:
        samples = api.metric_samples(
            (now - timedelta(hours=24)).isoformat(), now.isoformat(), "StepCount"
        )
        if not samples:
            return {"available": False}
        total = sum(s.get("value", 0) for s in samples)
        return {"available": True, "total": round(total)}
    except Exception:
        return {"available": False}


def get_weather(location="New+York"):
    """Get weather from wttr.in (no API key needed)."""
    try:
        r = subprocess.run(
            ["curl", "-s", f"wttr.in/{location}?format=%l:+%c+%t+%h+%w"],
            capture_output=True, text=True, timeout=10,
        )
        return {"available": True, "summary": r.stdout.strip(), "location": location.replace("+", " ")}
    except Exception as e:
        return {"available": False, "reason": str(e)}


def main():
    parser = argparse.ArgumentParser(description="Collect morning briefing data from Fulcra + weather")
    parser.add_argument("--location", default="New+York", help="Weather location (default: New+York)")
    parser.add_argument("--lookback", type=int, default=14, help="Hours to look back for sleep data (default: 14)")
    parser.add_argument("--demo", action="store_true", help="Enable demo mode (synthetic calendar/location)")
    args = parser.parse_args()

    demo = is_demo_mode(args)

    # In demo mode, biometrics still come from real API if available.
    # Calendar and location are always synthetic in demo mode.
    api, err = None, None
    if not demo:
        api, err = load_api()
        if err:
            print(json.dumps({"error": err}, indent=2))
            sys.exit(1)
    else:
        # Try loading API for real biometrics, but don't fail if unavailable
        api, err = load_api()
        if err:
            api = None  # biometrics will gracefully degrade

    briefing = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "demo_mode": demo,
        "sleep": get_sleep(api, args.lookback) if api else {"available": False, "reason": "demo mode — no API token"},
        "heart_rate": get_heart_rate(api) if api else {"available": False, "reason": "demo mode — no API token"},
        "hrv": get_hrv(api) if api else {"available": False, "reason": "demo mode — no API token"},
        "steps": get_steps(api) if api else {"available": False, "reason": "demo mode — no API token"},
        "weather": get_weather(args.location),
        # Calendar and location: synthetic in demo mode, real otherwise
        "calendar": get_demo_calendar() if demo else get_calendar(api),
        "location": get_demo_location() if demo else {"available": False, "reason": "location requires demo mode or MCP"},
    }

    print(json.dumps(briefing, indent=2, default=str))


if __name__ == "__main__":
    main()
