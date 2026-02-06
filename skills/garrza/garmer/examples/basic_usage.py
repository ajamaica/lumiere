#!/usr/bin/env python3
"""
Basic usage examples for Garmer - Garmin data extraction tool.

This script demonstrates how to use Garmer to extract various health
and fitness data from Garmin Connect.
"""

from datetime import date, timedelta

from garmer import GarminClient


def main():
    """Demonstrate basic Garmer usage."""

    # =========================================================================
    # Authentication
    # =========================================================================

    # Option 1: Login with credentials (tokens are saved automatically)
    # client = GarminClient.from_credentials(
    #     email="your-email@example.com",
    #     password="your-password",
    # )

    # Option 2: Use previously saved tokens
    client = GarminClient.from_saved_tokens()

    # =========================================================================
    # User Profile
    # =========================================================================

    print("=== User Profile ===")
    profile = client.get_user_profile()
    if profile:
        print(f"Name: {profile.display_name}")
        print(f"Email: {profile.email}")
        if profile.height_cm:
            print(f"Height: {profile.height_cm} cm")
        if profile.weight_kg:
            print(f"Weight: {profile.weight_kg} kg")

    # =========================================================================
    # User Devices
    # =========================================================================

    print("\n=== User Devices ===")
    devices = client.get_user_devices()
    if devices:
        for device in devices:
            print(
                f"- {device.get('deviceTypeName', 'Unknown')} ({device.get('deviceId', 'N/A')})"
            )
    else:
        print("No devices found")

    # =========================================================================
    # Today's Summary
    # =========================================================================

    print("\n=== Today's Summary ===")
    summary = client.get_daily_summary()
    if summary:
        print(f"Steps: {summary.total_steps:,} / {summary.daily_step_goal:,}")
        print(f"Calories: {summary.total_kilocalories:,}")
        print(f"Distance: {summary.total_distance_meters / 1000:.2f} km")
        print(f"Floors: {summary.floors_ascended}")
        if summary.resting_heart_rate:
            print(f"Resting HR: {summary.resting_heart_rate} bpm")

    # =========================================================================
    # Weekly Summary
    # =========================================================================

    print("\n=== Weekly Summary ===")
    weekly = client.get_weekly_summary()
    if weekly:
        print(f"Period: {weekly.get('start_date')} to {weekly.get('end_date')}")
        print(f"Total Steps: {weekly.get('total_steps', 0):,}")
        print(f"Avg Daily Steps: {weekly.get('avg_daily_steps', 0):,.0f}")
        print(f"Total Calories: {weekly.get('total_calories', 0):,}")

    # =========================================================================
    # Last Night's Sleep
    # =========================================================================

    print("\n=== Last Night's Sleep ===")
    sleep = client.get_sleep()
    if sleep:
        print(f"Total Sleep: {sleep.total_sleep_hours:.1f} hours")
        print(f"Deep Sleep: {sleep.deep_sleep_hours:.1f} hours")
        print(f"REM Sleep: {sleep.rem_sleep_hours:.1f} hours")
        if sleep.overall_score:
            print(f"Sleep Score: {sleep.overall_score}")
        if sleep.avg_sleep_heart_rate:
            print(f"Avg HR during sleep: {sleep.avg_sleep_heart_rate} bpm")

    # Alternative: get_last_night_sleep() is a convenience alias
    # sleep = client.get_last_night_sleep()

    # =========================================================================
    # Sleep for Date Range
    # =========================================================================

    print("\n=== Sleep History (Last 3 Days) ===")
    end_date = date.today()
    start_date = end_date - timedelta(days=2)
    sleep_history = client.get_sleep_range(start_date=start_date, end_date=end_date)
    for sleep_record in sleep_history:
        print(
            f"- {sleep_record.calendar_date}: {sleep_record.total_sleep_hours:.1f} hours"
        )

    # =========================================================================
    # Today's Stress
    # =========================================================================

    print("\n=== Today's Stress ===")
    stress = client.get_stress()
    if stress:
        if stress.avg_stress_level:
            print(f"Average Stress: {stress.avg_stress_level}")
        print(f"Rest Time: {stress.rest_duration_hours:.1f} hours")
        print(f"High Stress Time: {stress.high_stress_hours:.1f} hours")

    # =========================================================================
    # Body Battery
    # =========================================================================

    print("\n=== Body Battery ===")
    battery = client.get_body_battery()
    if battery:
        print(f"Current: {battery.get('charged', 'N/A')}")
        print(f"High: {battery.get('max', 'N/A')}")
        print(f"Low: {battery.get('min', 'N/A')}")

    # =========================================================================
    # Steps Data
    # =========================================================================

    print("\n=== Steps Data ===")
    steps = client.get_steps()
    if steps:
        print(f"Total Steps: {steps.total_steps:,}")
        print(f"Step Goal: {steps.step_goal:,}")
        print(f"Goal Reached: {steps.goal_reached}")
        print(f"Distance: {steps.total_distance_km:.2f} km")
        print(f"Floors Ascended: {steps.floors_ascended}")
        print(f"Intensity Minutes: {steps.total_intensity_minutes}")

    # Convenience method for just the step count
    total_steps = client.get_total_steps()
    print(f"Total Steps (quick): {total_steps:,}" if total_steps else "N/A")

    # =========================================================================
    # Recent Activities
    # =========================================================================

    print("\n=== Recent Activities ===")
    activities = client.get_recent_activities(limit=5)
    for activity in activities:
        print(f"- [{activity.activity_type_key}] {activity.activity_name}")
        print(f"  Duration: {activity.duration_minutes:.1f} min")
        if activity.distance_km > 0:
            print(f"  Distance: {activity.distance_km:.2f} km")
        print(f"  Calories: {activity.calories:.0f}")

    # =========================================================================
    # Activities with Filters
    # =========================================================================

    print("\n=== Activities with Filters ===")
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    filtered_activities = client.get_activities(
        start_date=start_date,
        end_date=end_date,
        activity_type="running",  # Filter by type
        limit=5,
    )
    print(f"Running activities in last 30 days: {len(filtered_activities)}")
    for activity in filtered_activities:
        print(f"- {activity.activity_name}: {activity.distance_km:.2f} km")

    # =========================================================================
    # Single Activity Detail
    # =========================================================================

    print("\n=== Single Activity Detail ===")
    if activities:
        # Get the most recent activity's full details
        latest = activities[0]
        activity_detail = client.get_activity(latest.activity_id)
        if activity_detail:
            print(f"Activity: {activity_detail.activity_name}")
            print(f"Type: {activity_detail.activity_type_key}")
            print(f"Duration: {activity_detail.duration_minutes:.1f} min")
            if activity_detail.avg_heart_rate:
                print(f"Avg HR: {activity_detail.avg_heart_rate} bpm")
            if activity_detail.aerobic_training_effect:
                print(f"Aerobic TE: {activity_detail.aerobic_training_effect}")

    # =========================================================================
    # Heart Rate
    # =========================================================================

    print("\n=== Heart Rate ===")
    hr = client.get_heart_rate()
    if hr:
        if hr.resting_heart_rate:
            print(f"Resting HR: {hr.resting_heart_rate} bpm")
        if hr.max_heart_rate:
            print(f"Max HR: {hr.max_heart_rate} bpm")
        if hr.min_heart_rate:
            print(f"Min HR: {hr.min_heart_rate} bpm")

    # Convenience method for just resting HR
    resting_hr = client.get_resting_heart_rate()
    print(f"Resting HR (quick): {resting_hr} bpm" if resting_hr else "N/A")

    # =========================================================================
    # Hydration
    # =========================================================================

    print("\n=== Hydration ===")
    hydration = client.get_hydration()
    if hydration:
        print(f"Water Intake: {hydration.total_intake_ml} ml")
        print(f"Goal: {hydration.goal_ml} ml ({hydration.goal_percentage:.0f}%)")

    # =========================================================================
    # Weight
    # =========================================================================

    print("\n=== Weight ===")
    weight = client.get_latest_weight()
    if weight:
        print(f"Latest Weight: {weight.weight_kg:.1f} kg ({weight.weight_lbs:.1f} lbs)")

    # Get weight for specific date
    # weight_on_date = client.get_weight(date(2025, 1, 15))

    # =========================================================================
    # Body Composition
    # =========================================================================

    print("\n=== Body Composition ===")
    body = client.get_body_composition()
    if body:
        if body.weight_kg:
            print(f"Weight: {body.weight_kg:.1f} kg")
        if body.body_fat_percentage:
            print(f"Body Fat: {body.body_fat_percentage:.1f}%")
        if body.muscle_mass_kg:
            print(f"Muscle Mass: {body.muscle_mass_kg:.1f} kg")
        if body.bmi:
            print(f"BMI: {body.bmi:.1f}")

    # =========================================================================
    # Respiration
    # =========================================================================

    print("\n=== Respiration ===")
    resp = client.get_respiration()
    if resp:
        if resp.avg_waking_respiration:
            print(f"Avg Waking: {resp.avg_waking_respiration:.1f} breaths/min")
        if resp.avg_sleeping_respiration:
            print(f"Avg Sleeping: {resp.avg_sleeping_respiration:.1f} breaths/min")
        if resp.highest_respiration:
            print(f"Highest: {resp.highest_respiration:.1f} breaths/min")
        if resp.lowest_respiration:
            print(f"Lowest: {resp.lowest_respiration:.1f} breaths/min")

    # =========================================================================
    # Health Snapshot (All Data at Once)
    # =========================================================================

    print("\n=== Health Snapshot ===")
    snapshot = client.get_health_snapshot()
    print(f"Date: {snapshot['date']}")

    if snapshot.get("steps"):
        steps = snapshot["steps"]
        print(f"Steps: {steps['total']:,} (Goal reached: {steps['goal_reached']})")

    if snapshot.get("sleep"):
        sleep_data = snapshot["sleep"]
        print(
            f"Sleep Duration: {sleep_data.get('total_sleep_seconds', 0) / 3600:.1f} hours"
        )

    # =========================================================================
    # Weekly Report
    # =========================================================================

    print("\n=== Weekly Health Report ===")
    report = client.get_weekly_health_report()
    print(f"Period: {report['period']['start']} to {report['period']['end']}")

    if report.get("activities"):
        act = report["activities"]
        print(f"Activities: {act['count']} workouts")
        print(f"Total Duration: {act['total_duration_hours']:.1f} hours")
        print(f"Total Distance: {act['total_distance_km']:.1f} km")

    if report.get("steps"):
        steps = report["steps"]
        print(f"Avg Daily Steps: {steps['avg_daily']:.0f}")
        print(f"Days Goal Reached: {steps['days_goal_reached']}/7")

    if report.get("sleep"):
        sleep = report["sleep"]
        print(f"Avg Sleep: {sleep['avg_hours']:.1f} hours")

    # =========================================================================
    # Export Data
    # =========================================================================

    print("\n=== Data Export ===")
    end_date = date.today()
    start_date = end_date - timedelta(days=6)

    export = client.export_data(
        start_date=start_date,
        end_date=end_date,
        include_activities=True,
        include_sleep=True,
        include_daily=True,
    )

    print(f"Exported {len(export.get('activities', []))} activities")
    print(f"Exported {len(export.get('sleep', []))} sleep records")
    print(f"Exported {len(export.get('daily_summaries', []))} daily summaries")


if __name__ == "__main__":
    main()
