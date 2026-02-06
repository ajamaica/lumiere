# Garmer - Garmin Data Extraction Tool

A Python library for extracting health and fitness data from Garmin Connect, designed for integration with MoltBot and other health insight applications.

## Features

- **Comprehensive Data Extraction**: Access activities, sleep, heart rate, stress, steps, body composition, hydration, and more
- **Easy Authentication**: OAuth-based authentication with token persistence
- **MoltBot Integration Ready**: Designed for seamless integration with AI health assistants
- **CLI Tool**: Command-line interface for quick data access
- **Type-Safe Models**: Pydantic-based data models with full type hints
- **Flexible Export**: Export data in JSON format for analysis

## Installation

```bash
# Install from source
pip install -e .

# Or with development dependencies
pip install -e ".[dev]"
```

## Quick Start

### Command Line

```bash
# Login to Garmin Connect
garmer login

# Check authentication status
garmer status

# Get today's summary
garmer summary

# Get sleep data
garmer sleep

# Get recent activities
garmer activities

# Get full health snapshot
garmer snapshot --json

# Export data
garmer export --days 7 -o my_data.json
```

### Python API

```python
from garmer import GarminClient

# Login with credentials (tokens are saved automatically)
client = GarminClient.from_credentials(
    email="your-email@example.com",
    password="your-password",
)

# Or use saved tokens
client = GarminClient.from_saved_tokens()

# Get today's summary
summary = client.get_daily_summary()
print(f"Steps: {summary.total_steps}")

# Get sleep data
sleep = client.get_sleep()
print(f"Sleep: {sleep.total_sleep_hours:.1f} hours")

# Get recent activities
activities = client.get_recent_activities(limit=5)
for activity in activities:
    print(f"{activity.activity_name}: {activity.distance_km:.1f} km")

# Get comprehensive health snapshot
snapshot = client.get_health_snapshot()

# Get weekly report
report = client.get_weekly_health_report()
```

## Available Data Types

### Activities

- Running, cycling, swimming, and 20+ activity types
- Duration, distance, pace, heart rate zones
- Laps, splits, GPS data (via detailed endpoints)
- Training effect metrics

### Sleep

- Total sleep duration and phases (deep, light, REM)
- Sleep score and quality metrics
- Heart rate, HRV, respiration during sleep
- Sleep phases timeline

### Heart Rate

- Resting heart rate
- Heart rate samples throughout the day
- Heart rate zones
- 7-day averages

### Stress

- Overall stress level
- Stress samples throughout the day
- Rest vs. stress duration
- Body Battery correlation

### Steps & Activity

- Total steps and goal tracking
- Distance traveled
- Floors climbed
- Intensity minutes (moderate/vigorous)
- Sedentary time

### Body Composition

- Weight tracking
- Body fat percentage
- Muscle mass, bone mass
- BMI, metabolic age

### Hydration

- Water intake tracking
- Daily goals
- Sweat loss correlation

### Respiration

- Breathing rate (waking and sleeping)
- Respiratory trends

## MoltBot Integration

Garmer is designed to work seamlessly with MoltBot for health insights:

```python
from garmer.examples.moltbot_integration import GarminIntegration

integration = GarminIntegration()

# Get health summary for AI analysis
summary = integration.get_health_summary()
# Returns structured data with metrics and insights

# Get activity analysis
activities = integration.get_activity_insights(days=7)

# Get sleep trend analysis
sleep_trends = integration.get_sleep_trends(days=7)

# Generate daily briefing
briefing = integration.get_daily_briefing()
```

## Configuration

Garmer stores configuration and tokens in `~/.garmer/`:

```
~/.garmer/
├── garmin_tokens    # OAuth tokens (auto-created after login)
├── config.json      # Optional configuration file
└── exports/         # Default export directory
```

### Environment Variables

- `GARMER_TOKEN_DIR`: Directory for token storage
- `GARMER_LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
- `GARMER_CACHE_ENABLED`: Enable/disable caching (true/false)

## Data Models

All data is returned as Pydantic models with type hints:

```python
from garmer.models import (
    Activity,
    SleepData,
    HeartRateData,
    StressData,
    StepsData,
    DailySummary,
    UserProfile,
)

# Models can be converted to dictionaries
activity_dict = activity.to_dict()

# Or accessed with full type support
print(activity.distance_km)  # float
print(activity.avg_heart_rate)  # int | None
```

## Error Handling

```python
from garmer.auth import AuthenticationError, SessionExpiredError

try:
    client = GarminClient.from_saved_tokens()
except AuthenticationError:
    print("Please login first: garmer login")

try:
    data = client.get_daily_summary()
except SessionExpiredError:
    # Token expired, need to re-authenticate
    client.login(email, password)
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy src/garmer

# Linting
ruff check src/garmer
```

## License

MIT License

## Acknowledgments

- Uses the [garth](https://github.com/matin/garth) library for Garmin Connect authentication
- Inspired by the need for comprehensive health data integration with AI assistants
