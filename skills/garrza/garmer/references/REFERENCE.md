# Garmer API Reference

Detailed documentation for the garmer Python API and data models.

## GarminClient

The main client class for interacting with Garmin Connect.

### Initialization

```python
from garmer import GarminClient

# From saved tokens (recommended)
client = GarminClient.from_saved_tokens()

# From credentials (saves tokens automatically)
client = GarminClient.from_credentials(
    email="user@example.com",
    password="password",
    save_tokens=True
)

# With custom token directory
client = GarminClient.from_saved_tokens(token_dir="/custom/path")
```

### Methods

#### get_daily_summary(target_date=None) -> DailySummary

Returns daily health metrics.

```python
summary = client.get_daily_summary()  # Today
summary = client.get_daily_summary(date(2024, 1, 15))  # Specific date

# DailySummary fields:
summary.total_steps           # int
summary.daily_step_goal       # int
summary.total_distance_meters # float
summary.total_kilocalories    # int
summary.active_kilocalories   # int
summary.floors_ascended       # int
summary.resting_heart_rate    # int | None
summary.avg_stress_level      # int | None
summary.body_battery_most_recent_value  # int | None
summary.moderate_intensity_minutes      # int
summary.vigorous_intensity_minutes      # int
```

#### get_sleep(target_date=None) -> SleepData

Returns sleep data for the night ending on the target date.

```python
sleep = client.get_sleep()  # Last night
sleep = client.get_sleep(date(2024, 1, 15))

# SleepData fields:
sleep.total_sleep_seconds     # int
sleep.total_sleep_hours       # float (computed)
sleep.deep_sleep_seconds      # int
sleep.deep_sleep_hours        # float (computed)
sleep.light_sleep_seconds     # int
sleep.rem_sleep_seconds       # int
sleep.rem_sleep_hours         # float (computed)
sleep.awake_seconds           # int
sleep.overall_score           # int | None (0-100)
sleep.avg_sleep_heart_rate    # int | None
sleep.avg_hrv                 # float | None
sleep.sleep_efficiency        # float | None (percentage)
sleep.deep_sleep_percentage   # float (computed)
sleep.rem_sleep_percentage    # float (computed)
sleep.sleep_phases            # list[SleepPhase]
sleep.sleep_movements         # list[SleepMovement]
```

#### get_recent_activities(limit=10) -> list[Activity]

Returns recent fitness activities.

```python
activities = client.get_recent_activities(limit=5)

# Activity fields:
activity.activity_id          # int
activity.activity_name        # str
activity.activity_type_key    # str (e.g., "running", "cycling")
activity.start_time           # datetime
activity.duration_seconds     # float
activity.duration_minutes     # float (computed)
activity.distance_meters      # float
activity.distance_km          # float (computed)
activity.calories             # float
activity.avg_heart_rate       # int | None
activity.max_heart_rate       # int | None
activity.avg_speed            # float | None
activity.max_speed            # float | None
activity.elevation_gain       # float | None
activity.training_effect_label # str | None
```

#### get_activities(start_date, end_date, limit=100) -> list[Activity]

Returns activities within a date range.

```python
from datetime import date, timedelta

end = date.today()
start = end - timedelta(days=30)
activities = client.get_activities(start_date=start, end_date=end)
```

#### get_activity_details(activity_id) -> Activity

Returns detailed information for a specific activity.

```python
activity = client.get_activity_details(12345678)
```

#### get_activity_laps(activity_id) -> list[Lap]

Returns lap data for an activity.

```python
laps = client.get_activity_laps(12345678)

# Lap fields:
lap.lap_index         # int
lap.start_time        # datetime
lap.duration_seconds  # float
lap.distance_meters   # float
lap.avg_heart_rate    # int | None
lap.max_heart_rate    # int | None
lap.calories          # float
```

#### get_heart_rate(target_date=None) -> HeartRateData

Returns heart rate data for a day.

```python
hr = client.get_heart_rate()

# HeartRateData fields:
hr.resting_heart_rate   # int | None
hr.max_heart_rate       # int | None
hr.min_heart_rate       # int | None
hr.samples              # list[HeartRateSample]
hr.zones                # list[HeartRateZone]
```

#### get_stress(target_date=None) -> StressData

Returns stress data for a day.

```python
stress = client.get_stress()

# StressData fields:
stress.avg_stress_level      # int | None
stress.max_stress_level      # int | None
stress.high_stress_seconds   # int
stress.medium_stress_seconds # int
stress.low_stress_seconds    # int
stress.rest_stress_seconds   # int
stress.samples               # list[StressSample]
```

#### get_steps(target_date=None) -> StepsData

Returns step data for a day.

```python
steps = client.get_steps()

# StepsData fields:
steps.total_steps       # int
steps.step_goal         # int
steps.total_distance    # float
steps.calories_burned   # int
steps.samples           # list[StepsSample]
```

#### get_body_composition(target_date=None) -> BodyComposition

Returns body composition data.

```python
body = client.get_body_composition()

# BodyComposition fields:
body.weight_kg          # float | None
body.bmi                # float | None
body.body_fat_percent   # float | None
body.muscle_mass_kg     # float | None
body.bone_mass_kg       # float | None
body.body_water_percent # float | None
body.metabolic_age      # int | None
```

#### get_hydration(target_date=None) -> HydrationData

Returns hydration tracking data.

```python
hydration = client.get_hydration()

# HydrationData fields:
hydration.intake_ml         # int
hydration.goal_ml           # int
hydration.sweat_loss_ml     # int | None
hydration.goal_percentage   # float (computed)
```

#### get_respiration(target_date=None) -> RespirationData

Returns respiration data.

```python
resp = client.get_respiration()

# RespirationData fields:
resp.avg_waking_respiration   # float | None
resp.avg_sleeping_respiration # float | None
resp.highest_respiration      # float | None
resp.lowest_respiration       # float | None
resp.samples                  # list[RespirationSample]
```

#### get_user_profile() -> UserProfile

Returns the user's Garmin profile.

```python
profile = client.get_user_profile()

# UserProfile fields:
profile.profile_id    # int
profile.display_name  # str | None
profile.email         # str | None
profile.gender        # str | None
profile.birth_date    # date | None
profile.height_cm     # float | None
profile.weight_kg     # float | None
```

#### get_devices() -> list[dict]

Returns registered Garmin devices.

```python
devices = client.get_devices()
for device in devices:
    print(device["deviceId"], device["displayName"])
```

#### get_health_snapshot(target_date=None) -> dict

Returns a comprehensive health snapshot as a dictionary.

```python
snapshot = client.get_health_snapshot()

# Returns dict with keys:
# - date: str
# - steps: dict (total, goal, goal_reached)
# - sleep: dict (sleep metrics)
# - heart_rate: dict (resting, max, min)
# - stress: dict (avg_level, max_level, etc.)
# - hydration: dict (intake, goal, percentage)
# - body_composition: dict (weight, bmi, etc.)
```

#### get_weekly_health_report() -> dict

Returns a weekly health summary.

```python
report = client.get_weekly_health_report()
```

#### export_data(start_date, end_date, ...) -> dict

Exports comprehensive data for a date range.

```python
data = client.export_data(
    start_date=date(2024, 1, 1),
    end_date=date(2024, 1, 31),
    include_activities=True,
    include_sleep=True,
    include_daily=True,
)
```

## MoltBot Integration

For AI health assistant integration, use the `GarminIntegration` class:

```python
from garmer.examples.moltbot_integration import GarminIntegration

integration = GarminIntegration()

# Check connection
if integration.is_connected():
    # Get formatted health summary
    summary = integration.get_health_summary()

    # Get activity insights
    insights = integration.get_activity_insights(days=7)

    # Get sleep trends
    trends = integration.get_sleep_trends(days=7)

    # Generate daily briefing
    briefing = integration.get_daily_briefing()
```

### GarminIntegration Methods

- `is_connected() -> bool` - Check if authenticated
- `get_health_summary() -> dict` - Formatted health data with insights
- `get_activity_insights(days=7) -> dict` - Activity analysis with recommendations
- `get_sleep_trends(days=7) -> dict` - Sleep trend analysis
- `get_daily_briefing() -> str` - Formatted health briefing text
- `format_for_chat(data) -> str` - Format dict as JSON for chat

## Activity Types

Common activity type keys returned by the API:

| Key                 | Description        |
| ------------------- | ------------------ |
| `running`           | Running/jogging    |
| `cycling`           | Cycling            |
| `swimming`          | Swimming           |
| `walking`           | Walking            |
| `hiking`            | Hiking             |
| `strength_training` | Weight training    |
| `yoga`              | Yoga               |
| `elliptical`        | Elliptical trainer |
| `indoor_cycling`    | Stationary bike    |
| `treadmill_running` | Treadmill          |

## Error Handling

```python
from garmer.auth import AuthenticationError, SessionExpiredError

try:
    client = GarminClient.from_saved_tokens()
except AuthenticationError:
    # No tokens found - need to login
    pass

try:
    data = client.get_daily_summary()
except SessionExpiredError:
    # Token expired - re-authenticate
    client.login(email, password)
```

## Token Storage

Tokens are stored in `~/.garmer/garmin_tokens` by default. The file contains OAuth tokens that are automatically refreshed when needed.

To customize the location:

```python
client = GarminClient.from_saved_tokens(token_dir=Path("/custom/path"))
```

Or use environment variable:

```bash
export GARMER_TOKEN_DIR=/custom/path
```
