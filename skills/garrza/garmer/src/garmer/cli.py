"""Command-line interface for Garmer."""

import argparse
import getpass
import json
import logging
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from garmer.auth import AuthenticationError
from garmer.client import GarminClient
from garmer.config import load_config

logger = logging.getLogger(__name__)


def _get_package_root() -> Path | None:
    """Get the root directory of the garmer package (where .git lives)."""
    # First, try walking up from this file's location (works for editable installs)
    current = Path(__file__).resolve().parent
    for _ in range(5):  # Walk up at most 5 levels
        if (current / ".git").exists():
            return current
        current = current.parent

    # Check common source locations
    common_locations = [
        Path.home() / ".openclaw" / "skills" / "garmer",
        Path.home() / "Desktop" / "code" / "garmer",
        Path.home() / "code" / "garmer",
        Path.home() / "projects" / "garmer",
    ]

    for location in common_locations:
        if (location / ".git").exists():
            return location

    # Try to find from pip's direct_url.json (for editable installs)
    try:
        import importlib.metadata

        dist = importlib.metadata.distribution("garmer")
        direct_url_file = dist._path.parent / "direct_url.json"  # type: ignore
        if direct_url_file.exists():
            import json

            with open(direct_url_file) as f:
                data = json.load(f)
                if "url" in data and data["url"].startswith("file://"):
                    source_path = Path(data["url"].replace("file://", ""))
                    if (source_path / ".git").exists():
                        return source_path
    except Exception:
        pass

    return None


def setup_logging(verbose: bool = False) -> None:
    """Set up logging for CLI."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(levelname)s: %(message)s",
    )


def cmd_login(args: argparse.Namespace) -> int:
    """Handle login command."""
    email = args.email or input("Garmin Connect email: ")
    password = args.password or getpass.getpass("Garmin Connect password: ")

    try:
        client = GarminClient.from_credentials(
            email=email,
            password=password,
            save_tokens=True,
        )
        print("Successfully logged in and saved authentication tokens.")
        return 0
    except AuthenticationError as e:
        print(f"Login failed: {e}", file=sys.stderr)
        return 1


def cmd_logout(args: argparse.Namespace) -> int:
    """Handle logout command."""
    config = load_config()
    token_path = config.token_dir / config.token_file

    if token_path.exists():
        token_path.unlink()
        print("Logged out and deleted saved tokens.")
    else:
        print("No saved tokens found.")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    """Handle status command."""
    try:
        client = GarminClient.from_saved_tokens()
        profile = client.get_user_profile()
        if profile:
            print(f"Logged in as: {profile.display_name or profile.email}")
            print(f"User ID: {profile.profile_id}")
        else:
            print("Authenticated but could not retrieve profile.")
        return 0
    except AuthenticationError:
        print("Not logged in. Use 'garmer login' to authenticate.")
        return 1


def cmd_summary(args: argparse.Namespace) -> int:
    """Handle summary command."""
    try:
        client = GarminClient.from_saved_tokens()
    except AuthenticationError:
        print("Not logged in. Use 'garmer login' first.", file=sys.stderr)
        return 1

    # Default to yesterday to avoid timezone issues and ensure complete data
    target_date = args.date or (date.today() - timedelta(days=1))
    if isinstance(target_date, str):
        target_date = datetime.strptime(target_date, "%Y-%m-%d").date()

    summary = client.get_daily_summary(target_date)

    # Optionally fetch sleep data for a complete picture
    sleep = None
    if args.with_sleep:
        sleep = client.get_sleep(target_date)

    if not summary:
        if args.json:
            print(json.dumps({"date": str(target_date), "error": "No data available"}))
        else:
            print(f"No data available for {target_date}")
        return 1

    # JSON output for programmatic access (OpenClaw, scripts, etc.)
    if args.json:
        data = {
            "date": str(target_date),
            "steps": {
                "total": summary.total_steps,
                "goal": summary.daily_step_goal,
                "goal_percentage": round(summary.step_goal_percentage, 1),
                "goal_reached": summary.total_steps >= summary.daily_step_goal,
            },
            "distance_km": round(summary.total_distance_meters / 1000, 2),
            "calories": {
                "total": summary.total_kilocalories,
                "active": summary.active_kilocalories,
                "bmr": summary.bmr_kilocalories,
            },
            "floors": {
                "ascended": summary.floors_ascended,
                "descended": summary.floors_descended,
                "goal": summary.floors_ascended_goal,
            },
            "heart_rate": {
                "resting": summary.resting_heart_rate,
                "min": summary.min_heart_rate,
                "max": summary.max_heart_rate,
                "avg": summary.avg_heart_rate,
            },
            "stress": {
                "avg": summary.avg_stress_level,
                "max": summary.max_stress_level,
            },
            "body_battery": {
                "current": summary.body_battery_most_recent_value,
                "high": summary.body_battery_highest_value,
                "low": summary.body_battery_lowest_value,
                "charged": summary.body_battery_charged_value,
                "drained": summary.body_battery_drained_value,
                "net_change": summary.body_battery_net_change,
            },
            "intensity_minutes": {
                "moderate": summary.moderate_intensity_minutes,
                "vigorous": summary.vigorous_intensity_minutes,
                "total": summary.total_intensity_minutes,
                "goal": summary.intensity_minutes_goal,
            },
            "respiration": {
                "avg_waking": summary.avg_waking_respiration_value,
                "highest": summary.highest_respiration_value,
                "lowest": summary.lowest_respiration_value,
            },
            "spo2": {
                "avg": summary.avg_spo2_value,
                "lowest": summary.lowest_spo2_value,
                "latest": summary.latest_spo2_value,
            },
            "hrv_status": summary.hrv_status,
            "activity_time": {
                "highly_active_hours": round(summary.highly_active_seconds / 3600, 2),
                "active_hours": round(summary.active_seconds / 3600, 2),
                "sedentary_hours": round(summary.sedentary_seconds / 3600, 2),
            },
            "activities_count": summary.activities_count,
        }
        if sleep:
            data["sleep"] = {
                "total_hours": round(sleep.total_sleep_hours, 2),
                "deep_hours": round(sleep.deep_sleep_hours, 2),
                "light_hours": round(sleep.light_sleep_hours, 2),
                "rem_hours": round(sleep.rem_sleep_hours, 2),
                "awake_hours": round(sleep.awake_hours, 2),
                "score": sleep.overall_score,
                "avg_hr": sleep.avg_sleep_heart_rate,
                "avg_hrv": sleep.avg_hrv,
            }
        print(json.dumps(data, indent=2))
        return 0

    # Human-readable output
    print(f"\n=== Daily Summary for {target_date} ===\n")

    # Steps with goal percentage
    step_pct = summary.step_goal_percentage
    step_status = "achieved" if step_pct >= 100 else f"{step_pct:.0f}%"
    print(
        f"Steps: {summary.total_steps:,} / {summary.daily_step_goal:,} ({step_status})"
    )
    print(f"Distance: {summary.total_distance_meters / 1000:.2f} km")

    # Calories
    print(
        f"Calories: {summary.total_kilocalories:,} (Active: {summary.active_kilocalories:,}, BMR: {summary.bmr_kilocalories:,})"
    )

    # Floors with goal
    floors_pct = (
        (summary.floors_ascended / summary.floors_ascended_goal * 100)
        if summary.floors_ascended_goal > 0
        else 0
    )
    print(
        f"Floors: {summary.floors_ascended:.0f} / {summary.floors_ascended_goal} ({floors_pct:.0f}%)"
    )

    # Heart rate
    hr_parts = []
    if summary.resting_heart_rate:
        hr_parts.append(f"Resting: {summary.resting_heart_rate}")
    if summary.min_heart_rate and summary.max_heart_rate:
        hr_parts.append(f"Range: {summary.min_heart_rate}-{summary.max_heart_rate}")
    if summary.avg_heart_rate:
        hr_parts.append(f"Avg: {summary.avg_heart_rate}")
    if hr_parts:
        print(f"Heart Rate: {', '.join(hr_parts)} bpm")

    # Stress
    if summary.avg_stress_level:
        stress_label = _stress_level_label(summary.avg_stress_level)
        print(f"Stress: {summary.avg_stress_level} avg ({stress_label})", end="")
        if summary.max_stress_level:
            print(f", {summary.max_stress_level} max")
        else:
            print()

    # Body battery with details
    if summary.body_battery_most_recent_value:
        bb_parts = [f"Current: {summary.body_battery_most_recent_value}"]
        if summary.body_battery_highest_value and summary.body_battery_lowest_value:
            bb_parts.append(
                f"Range: {summary.body_battery_lowest_value}-{summary.body_battery_highest_value}"
            )
        if summary.body_battery_net_change is not None:
            sign = "+" if summary.body_battery_net_change >= 0 else ""
            bb_parts.append(f"Net: {sign}{summary.body_battery_net_change}")
        print(f"Body Battery: {', '.join(bb_parts)}")

    # Intensity minutes with goal
    total_intensity = summary.total_intensity_minutes
    intensity_pct = (
        (total_intensity / summary.intensity_minutes_goal * 100)
        if summary.intensity_minutes_goal > 0
        else 0
    )
    print(
        f"Intensity: {summary.moderate_intensity_minutes} moderate + {summary.vigorous_intensity_minutes} vigorous "
        f"= {total_intensity} total ({intensity_pct:.0f}% of {summary.intensity_minutes_goal} goal)"
    )

    # Respiration
    if summary.avg_waking_respiration_value:
        print(
            f"Respiration: {summary.avg_waking_respiration_value:.1f} breaths/min avg"
        )

    # SpO2
    if summary.avg_spo2_value:
        spo2_str = f"SpO2: {summary.avg_spo2_value:.0f}% avg"
        if summary.lowest_spo2_value:
            spo2_str += f", {summary.lowest_spo2_value:.0f}% lowest"
        print(spo2_str)

    # HRV status
    if summary.hrv_status:
        print(f"HRV Status: {summary.hrv_status}")

    # Activity time breakdown
    if summary.highly_active_seconds > 0 or summary.active_seconds > 0:
        active_mins = summary.highly_active_seconds // 60
        light_active_mins = summary.active_seconds // 60
        sedentary_hrs = summary.sedentary_seconds / 3600
        print(
            f"Activity: {active_mins} min highly active, {light_active_mins} min active, "
            f"{sedentary_hrs:.1f} hrs sedentary"
        )

    # Activities count
    if summary.activities_count > 0:
        print(f"Recorded Activities: {summary.activities_count}")

    # Sleep (if requested)
    if sleep:
        print(f"\n--- Last Night's Sleep ---")
        print(f"Total: {sleep.total_sleep_hours:.1f} hrs")
        print(
            f"Stages: {sleep.deep_sleep_hours:.1f}h deep, {sleep.light_sleep_hours:.1f}h light, "
            f"{sleep.rem_sleep_hours:.1f}h REM"
        )
        if sleep.overall_score:
            print(f"Score: {sleep.overall_score}")
        if sleep.avg_hrv:
            print(f"Avg HRV: {sleep.avg_hrv:.0f} ms")

    return 0


def _stress_level_label(level: int) -> str:
    """Convert stress level to descriptive label."""
    if level <= 25:
        return "rest"
    elif level <= 50:
        return "low"
    elif level <= 75:
        return "medium"
    else:
        return "high"


def cmd_sleep(args: argparse.Namespace) -> int:
    """Handle sleep command."""
    try:
        client = GarminClient.from_saved_tokens()
    except AuthenticationError:
        print("Not logged in. Use 'garmer login' first.", file=sys.stderr)
        return 1

    # Default to yesterday to avoid timezone issues and ensure complete data
    target_date = args.date or (date.today() - timedelta(days=1))
    if isinstance(target_date, str):
        target_date = datetime.strptime(target_date, "%Y-%m-%d").date()

    sleep = client.get_sleep(target_date)
    if sleep:
        print(f"\n=== Sleep Data for night ending {target_date} ===\n")
        print(f"Total Sleep: {sleep.total_sleep_hours:.1f} hours")
        print(
            f"Deep Sleep: {sleep.deep_sleep_hours:.1f} hours ({sleep.deep_sleep_percentage:.1f}%)"
        )
        print(f"Light Sleep: {sleep.light_sleep_hours:.1f} hours")
        print(
            f"REM Sleep: {sleep.rem_sleep_hours:.1f} hours ({sleep.rem_sleep_percentage:.1f}%)"
        )

        if sleep.overall_score:
            print(f"\nSleep Score: {sleep.overall_score}")

        if sleep.avg_sleep_heart_rate:
            print(f"Avg HR: {sleep.avg_sleep_heart_rate} bpm")

        if sleep.avg_hrv:
            print(f"Avg HRV: {sleep.avg_hrv:.1f} ms")

        efficiency = sleep.sleep_efficiency
        if efficiency:
            print(f"Sleep Efficiency: {efficiency:.1f}%")
    else:
        print(f"No sleep data available for {target_date}")

    return 0


def cmd_activities(args: argparse.Namespace) -> int:
    """Handle activities command."""
    try:
        client = GarminClient.from_saved_tokens()
    except AuthenticationError:
        print("Not logged in. Use 'garmer login' first.", file=sys.stderr)
        return 1

    # Get activities - either for a specific date or recent
    if args.date:
        target_date = args.date
        if isinstance(target_date, str):
            target_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        activities = client._activities.get_activities_for_date(target_date)
        title = f"Activities for {target_date}"
    else:
        activities = client.get_recent_activities(limit=args.limit)
        title = f"Recent Activities ({len(activities)})"

    if not activities:
        if args.json:
            print(json.dumps({"activities": [], "count": 0}))
        else:
            print("No activities found.")
        return 0

    # JSON output
    if args.json:
        data = {
            "count": len(activities),
            "activities": [_activity_to_dict(a) for a in activities],
        }
        print(json.dumps(data, indent=2, default=str))
        return 0

    # Human-readable output
    print(f"\n=== {title} ===\n")
    for activity in activities:
        _print_activity_brief(activity)
        print()

    return 0


def cmd_activity(args: argparse.Namespace) -> int:
    """Handle single activity detail command."""
    try:
        client = GarminClient.from_saved_tokens()
    except AuthenticationError:
        print("Not logged in. Use 'garmer login' first.", file=sys.stderr)
        return 1

    # Get activity - by ID or latest
    if args.id:
        activity = client.get_activity(args.id)
        if not activity:
            print(f"Activity {args.id} not found.", file=sys.stderr)
            return 1
    else:
        # Get latest activity
        activities = client.get_recent_activities(limit=1)
        if not activities:
            print("No activities found.", file=sys.stderr)
            return 1
        activity = activities[0]

    # Get additional details if requested
    laps = []
    hr_zones = None
    if args.laps:
        laps = client._activities.get_activity_laps(activity.activity_id)
    if args.zones:
        hr_zones = client._activities.get_activity_hr_zones(activity.activity_id)

    # JSON output
    if args.json:
        data = _activity_to_dict(activity, detailed=True)
        if laps:
            data["laps"] = [_lap_to_dict(lap) for lap in laps]
        if hr_zones:
            data["hr_zones"] = hr_zones
        print(json.dumps(data, indent=2, default=str))
        return 0

    # Human-readable output
    _print_activity_detailed(activity, laps, hr_zones)
    return 0


def _activity_to_dict(activity, detailed: bool = False) -> dict:
    """Convert activity to dictionary for JSON output."""
    data = {
        "id": activity.activity_id,
        "name": activity.activity_name,
        "type": activity.activity_type_key,
        "date": str(activity.start_time),
        "duration_minutes": round(activity.duration_minutes, 1),
        "distance_km": (
            round(activity.distance_km, 2) if activity.distance_meters > 0 else None
        ),
        "calories": int(activity.calories),
        "heart_rate": {
            "avg": activity.avg_heart_rate,
            "max": activity.max_heart_rate,
            "min": activity.min_heart_rate,
        },
    }

    if detailed or activity.elevation_gain:
        data["elevation"] = {
            "gain": activity.elevation_gain,
            "loss": activity.elevation_loss,
            "min": activity.min_elevation,
            "max": activity.max_elevation,
        }

    if activity.pace_per_km:
        data["pace_min_per_km"] = round(activity.pace_per_km, 2)

    if activity.aerobic_training_effect or activity.anaerobic_training_effect:
        data["training_effect"] = {
            "aerobic": activity.aerobic_training_effect,
            "anaerobic": activity.anaerobic_training_effect,
            "label": activity.training_effect_label,
        }

    if activity.avg_cadence:
        data["cadence"] = {
            "avg": activity.avg_cadence,
            "max": activity.max_cadence,
        }

    if activity.avg_power:
        data["power"] = {
            "avg": activity.avg_power,
            "max": activity.max_power,
            "normalized": activity.normalized_power,
        }

    if activity.steps:
        data["steps"] = activity.steps

    # Swimming metrics
    if activity.total_strokes:
        data["swimming"] = {
            "total_strokes": activity.total_strokes,
            "avg_strokes": activity.avg_stroke_count,
            "pool_length": activity.pool_length,
            "avg_swolf": activity.avg_swolf,
        }

    return data


def _lap_to_dict(lap) -> dict:
    """Convert lap to dictionary."""
    return {
        "lap_number": lap.lap_number,
        "duration_seconds": lap.duration_seconds,
        "distance_meters": lap.distance_meters,
        "calories": lap.calories,
        "avg_hr": lap.avg_heart_rate,
        "max_hr": lap.max_heart_rate,
        "avg_speed": lap.avg_speed,
        "elevation_gain": lap.elevation_gain,
    }


def _print_activity_brief(activity) -> None:
    """Print brief activity summary."""
    print(f"[{activity.activity_type_key}] {activity.activity_name}")
    print(f"  Date: {activity.start_time}")
    print(f"  Duration: {activity.duration_minutes:.1f} min")
    if activity.distance_meters > 0:
        print(f"  Distance: {activity.distance_km:.2f} km", end="")
        if activity.pace_per_km:
            pace_min = int(activity.pace_per_km)
            pace_sec = int((activity.pace_per_km - pace_min) * 60)
            print(f" ({pace_min}:{pace_sec:02d}/km)")
        else:
            print()
    print(f"  Calories: {activity.calories:.0f}")
    if activity.avg_heart_rate:
        hr_str = f"  HR: {activity.avg_heart_rate} avg"
        if activity.max_heart_rate:
            hr_str += f", {activity.max_heart_rate} max"
        print(hr_str)
    if activity.aerobic_training_effect:
        print(
            f"  Training Effect: {activity.aerobic_training_effect:.1f} aerobic", end=""
        )
        if activity.anaerobic_training_effect:
            print(f", {activity.anaerobic_training_effect:.1f} anaerobic")
        else:
            print()


def _print_activity_detailed(activity, laps: list, hr_zones: dict | None) -> None:
    """Print detailed activity information."""
    print(f"\n=== {activity.activity_name} ===")
    print(f"Type: {activity.activity_type_key}")
    print(f"Date: {activity.start_time}")
    print(f"ID: {activity.activity_id}")

    print(f"\n--- Performance ---")
    # Duration
    duration_mins = activity.duration_minutes
    if duration_mins >= 60:
        hours = int(duration_mins // 60)
        mins = int(duration_mins % 60)
        print(f"Duration: {hours}h {mins}m")
    else:
        print(f"Duration: {duration_mins:.1f} min")

    # Distance and pace
    if activity.distance_meters > 0:
        print(
            f"Distance: {activity.distance_km:.2f} km ({activity.distance_miles:.2f} mi)"
        )
        if activity.pace_per_km:
            pace_min = int(activity.pace_per_km)
            pace_sec = int((activity.pace_per_km - pace_min) * 60)
            print(f"Pace: {pace_min}:{pace_sec:02d}/km")

    # Speed
    if activity.avg_speed:
        avg_speed_kmh = activity.avg_speed * 3.6  # m/s to km/h
        print(f"Speed: {avg_speed_kmh:.1f} km/h avg", end="")
        if activity.max_speed:
            max_speed_kmh = activity.max_speed * 3.6
            print(f", {max_speed_kmh:.1f} km/h max")
        else:
            print()

    print(f"Calories: {activity.calories:.0f} ({activity.active_calories:.0f} active)")

    # Heart rate
    if activity.avg_heart_rate:
        print(f"\n--- Heart Rate ---")
        print(f"Average: {activity.avg_heart_rate} bpm")
        if activity.max_heart_rate:
            print(f"Max: {activity.max_heart_rate} bpm")
        if activity.min_heart_rate:
            print(f"Min: {activity.min_heart_rate} bpm")

    # Elevation
    if activity.elevation_gain:
        print(f"\n--- Elevation ---")
        print(f"Gain: {activity.elevation_gain:.0f} m")
        if activity.elevation_loss:
            print(f"Loss: {activity.elevation_loss:.0f} m")
        if activity.min_elevation and activity.max_elevation:
            print(
                f"Range: {activity.min_elevation:.0f} - {activity.max_elevation:.0f} m"
            )

    # Training effect
    if activity.aerobic_training_effect:
        print(f"\n--- Training Effect ---")
        print(f"Aerobic: {activity.aerobic_training_effect:.1f}")
        if activity.anaerobic_training_effect:
            print(f"Anaerobic: {activity.anaerobic_training_effect:.1f}")
        if activity.training_effect_label:
            print(f"Label: {activity.training_effect_label}")

    # Cadence
    if activity.avg_cadence:
        print(f"\n--- Cadence ---")
        print(f"Average: {activity.avg_cadence:.0f} spm")
        if activity.max_cadence:
            print(f"Max: {activity.max_cadence:.0f} spm")

    # Power
    if activity.avg_power:
        print(f"\n--- Power ---")
        print(f"Average: {activity.avg_power:.0f} W")
        if activity.max_power:
            print(f"Max: {activity.max_power:.0f} W")
        if activity.normalized_power:
            print(f"Normalized: {activity.normalized_power:.0f} W")

    # Steps
    if activity.steps:
        print(f"\nSteps: {activity.steps:,}")

    # Swimming
    if activity.total_strokes:
        print(f"\n--- Swimming ---")
        print(f"Total Strokes: {activity.total_strokes}")
        if activity.avg_stroke_count:
            print(f"Avg Strokes/Length: {activity.avg_stroke_count:.1f}")
        if activity.avg_swolf:
            print(f"Avg SWOLF: {activity.avg_swolf:.0f}")
        if activity.pool_length:
            print(f"Pool Length: {activity.pool_length:.0f} m")

    # HR Zones
    if hr_zones:
        print(f"\n--- HR Zones ---")
        if isinstance(hr_zones, list):
            for zone in hr_zones:
                zone_num = zone.get("zoneNumber", "?")
                seconds = zone.get("secsInZone", 0)
                mins = seconds // 60
                print(f"Zone {zone_num}: {mins} min")

    # Laps
    if laps:
        print(f"\n--- Laps ({len(laps)}) ---")
        for lap in laps:
            lap_dist = lap.distance_meters / 1000 if lap.distance_meters else 0
            lap_dur = lap.duration_seconds / 60 if lap.duration_seconds else 0
            print(
                f"Lap {lap.lap_number + 1}: {lap_dist:.2f} km in {lap_dur:.1f} min",
                end="",
            )
            if lap.avg_heart_rate:
                print(f" @ {lap.avg_heart_rate} bpm")
            else:
                print()


def cmd_snapshot(args: argparse.Namespace) -> int:
    """Handle health snapshot command."""
    try:
        client = GarminClient.from_saved_tokens()
    except AuthenticationError:
        print("Not logged in. Use 'garmer login' first.", file=sys.stderr)
        return 1

    # Default to yesterday to avoid timezone issues and ensure complete data
    target_date = args.date or (date.today() - timedelta(days=1))
    if isinstance(target_date, str):
        target_date = datetime.strptime(target_date, "%Y-%m-%d").date()

    snapshot = client.get_health_snapshot(target_date)

    if args.json:
        print(json.dumps(snapshot, indent=2, default=str))
    else:
        print(f"\n=== Health Snapshot for {target_date} ===\n")

        if snapshot.get("steps"):
            steps = snapshot["steps"]
            print(f"Steps: {steps['total']:,} / {steps['goal']:,}")

        if snapshot.get("sleep"):
            sleep = snapshot["sleep"]
            print(f"Sleep Score: {sleep.get('overall_score', 'N/A')}")

        if snapshot.get("heart_rate"):
            hr = snapshot["heart_rate"]
            print(f"Resting HR: {hr.get('resting', 'N/A')} bpm")

        if snapshot.get("stress"):
            stress = snapshot["stress"]
            print(f"Avg Stress: {stress.get('avg_level', 'N/A')}")

        if snapshot.get("hydration"):
            hydration = snapshot["hydration"]
            print(f"Hydration: {hydration.get('goal_percentage', 0):.0f}% of goal")

    return 0


def cmd_export(args: argparse.Namespace) -> int:
    """Handle export command."""
    try:
        client = GarminClient.from_saved_tokens()
    except AuthenticationError:
        print("Not logged in. Use 'garmer login' first.", file=sys.stderr)
        return 1

    end_date = args.end_date or date.today()
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

    start_date = args.start_date
    if start_date:
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    else:
        start_date = end_date - timedelta(days=args.days - 1)

    print(f"Exporting data from {start_date} to {end_date}...")

    data = client.export_data(
        start_date=start_date,
        end_date=end_date,
        include_activities=True,
        include_sleep=True,
        include_daily=True,
    )

    output_path = (
        Path(args.output)
        if args.output
        else Path(f"garmin_export_{start_date}_{end_date}.json")
    )

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2, default=str)

    print(f"Exported data to {output_path}")
    return 0


def cmd_update(args: argparse.Namespace) -> int:
    """Handle update command - pull latest changes from git."""
    package_root = _get_package_root()

    if not package_root:
        print("Could not find garmer package root directory.", file=sys.stderr)
        print("Make sure garmer is installed from a git repository.", file=sys.stderr)
        return 1

    print(f"Updating garmer from {package_root}...")

    try:
        # Fetch first to see what's available
        subprocess.run(
            ["git", "fetch"],
            cwd=package_root,
            check=True,
            capture_output=True,
        )

        # Check if there are updates
        result = subprocess.run(
            ["git", "status", "-uno"],
            cwd=package_root,
            check=True,
            capture_output=True,
            text=True,
        )

        if "Your branch is up to date" in result.stdout:
            print("Already up to date.")
            return 0

        # Show what will change
        log_result = subprocess.run(
            ["git", "log", "--oneline", "HEAD..@{u}"],
            cwd=package_root,
            capture_output=True,
            text=True,
        )
        if log_result.stdout.strip():
            print("\nIncoming changes:")
            print(log_result.stdout)

        # Pull the changes
        pull_result = subprocess.run(
            ["git", "pull", "--ff-only"],
            cwd=package_root,
            check=True,
            capture_output=True,
            text=True,
        )

        print(pull_result.stdout)
        print(
            "Update complete! Changes will take effect immediately (editable install)."
        )
        return 0

    except subprocess.CalledProcessError as e:
        print(f"Git error: {e.stderr if e.stderr else e}", file=sys.stderr)
        return 1
    except FileNotFoundError:
        print("Git is not installed or not in PATH.", file=sys.stderr)
        return 1


def cmd_version(args: argparse.Namespace) -> int:
    """Handle version command."""
    from garmer import __version__

    print(f"garmer {__version__}")

    package_root = _get_package_root()
    if package_root:
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=package_root,
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                print(f"git: {result.stdout.strip()}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass

    return 0


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser."""
    parser = argparse.ArgumentParser(
        prog="garmer",
        description="Garmin data extraction tool for MoltBot integration",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Enable verbose output"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Login command
    login_parser = subparsers.add_parser("login", help="Login to Garmin Connect")
    login_parser.add_argument("-e", "--email", help="Garmin Connect email")
    login_parser.add_argument("-p", "--password", help="Garmin Connect password")

    # Logout command
    subparsers.add_parser("logout", help="Logout and delete saved tokens")

    # Status command
    subparsers.add_parser("status", help="Show authentication status")

    # Summary command
    summary_parser = subparsers.add_parser("summary", help="Show daily summary")
    summary_parser.add_argument(
        "-d", "--date", help="Date (YYYY-MM-DD), defaults to yesterday"
    )
    summary_parser.add_argument(
        "--json", action="store_true", help="Output as JSON (for scripts/AI agents)"
    )
    summary_parser.add_argument(
        "-s",
        "--with-sleep",
        action="store_true",
        help="Include last night's sleep data",
    )

    # Sleep command
    sleep_parser = subparsers.add_parser("sleep", help="Show sleep data")
    sleep_parser.add_argument(
        "-d", "--date", help="Date (YYYY-MM-DD), defaults to yesterday"
    )

    # Activities command (list)
    activities_parser = subparsers.add_parser(
        "activities", help="List recent activities"
    )
    activities_parser.add_argument(
        "-n", "--limit", type=int, default=10, help="Number of activities"
    )
    activities_parser.add_argument(
        "-d", "--date", help="Get activities for specific date (YYYY-MM-DD)"
    )
    activities_parser.add_argument("--json", action="store_true", help="Output as JSON")

    # Activity command (single activity detail)
    activity_parser = subparsers.add_parser(
        "activity", help="Show detailed activity info"
    )
    activity_parser.add_argument(
        "id", type=int, nargs="?", help="Activity ID (omit for latest)"
    )
    activity_parser.add_argument("--laps", action="store_true", help="Include lap data")
    activity_parser.add_argument(
        "--zones", action="store_true", help="Include HR zone data"
    )
    activity_parser.add_argument("--json", action="store_true", help="Output as JSON")

    # Snapshot command
    snapshot_parser = subparsers.add_parser("snapshot", help="Get health snapshot")
    snapshot_parser.add_argument(
        "-d", "--date", help="Date (YYYY-MM-DD), defaults to yesterday"
    )
    snapshot_parser.add_argument("--json", action="store_true", help="Output as JSON")

    # Export command
    export_parser = subparsers.add_parser("export", help="Export data to file")
    export_parser.add_argument("-s", "--start-date", help="Start date (YYYY-MM-DD)")
    export_parser.add_argument("-e", "--end-date", help="End date (YYYY-MM-DD)")
    export_parser.add_argument(
        "-n", "--days", type=int, default=7, help="Number of days (if no start date)"
    )
    export_parser.add_argument("-o", "--output", help="Output file path")

    # Update command
    subparsers.add_parser("update", help="Update garmer to latest version (git pull)")

    # Version command
    subparsers.add_parser("version", help="Show version information")

    return parser


def main() -> int:
    """Main entry point for CLI."""
    parser = create_parser()
    args = parser.parse_args()

    setup_logging(args.verbose)

    if args.command is None:
        parser.print_help()
        return 0

    commands = {
        "login": cmd_login,
        "logout": cmd_logout,
        "status": cmd_status,
        "summary": cmd_summary,
        "sleep": cmd_sleep,
        "activities": cmd_activities,
        "activity": cmd_activity,
        "snapshot": cmd_snapshot,
        "export": cmd_export,
        "update": cmd_update,
        "version": cmd_version,
    }

    handler = commands.get(args.command)
    if handler:
        return handler(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
