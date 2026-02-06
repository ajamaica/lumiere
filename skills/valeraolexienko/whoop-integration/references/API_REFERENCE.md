# WHOOP API Reference

Complete reference for WHOOP Developer Platform API endpoints.

## Base URL
```
https://api.prod.whoop.com/developer
```

## Authentication

All requests require Bearer token authentication:
```http
Authorization: Bearer {access_token}
```

## User Profile

### Get Basic Profile
```http
GET /v1/user/profile/basic
```

Response:
```json
{
  "user_id": 10129,
  "email": "user@example.com", 
  "first_name": "John",
  "last_name": "Smith"
}
```

### Get Body Measurements
```http
GET /v1/user/measurement/body
```

Response:
```json
{
  "height_meter": 1.8288,
  "weight_kilogram": 90.7185,
  "max_heart_rate": 200
}
```

## Sleep Data

### Get Sleep Collection
```http
GET /v1/activity/sleep?start={ISO_TIME}&end={ISO_TIME}&limit={LIMIT}
```

Parameters:
- `start` (optional): ISO 8601 timestamp (inclusive)
- `end` (optional): ISO 8601 timestamp (exclusive)  
- `limit` (optional): Max results (1-25, default 10)
- `nextToken` (optional): Pagination token

Response:
```json
{
  "records": [
    {
      "id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
      "cycle_id": 93845,
      "user_id": 10129,
      "created_at": "2022-04-24T11:25:44.774Z",
      "updated_at": "2022-04-24T14:25:44.774Z", 
      "start": "2022-04-24T02:25:44.774Z",
      "end": "2022-04-24T10:25:44.774Z",
      "timezone_offset": "-05:00",
      "nap": false,
      "score_state": "SCORED",
      "score": {
        "stage_summary": {
          "total_in_bed_time_milli": 30272735,
          "total_awake_time_milli": 1403507,
          "total_no_data_time_milli": 0,
          "total_light_sleep_time_milli": 14905851,
          "total_slow_wave_sleep_time_milli": 6630370,
          "total_rem_sleep_time_milli": 5879573,
          "sleep_cycle_count": 3,
          "disturbance_count": 12
        },
        "sleep_needed": {
          "baseline_milli": 27395716,
          "need_from_sleep_debt_milli": 352230,
          "need_from_recent_strain_milli": 208595,
          "need_from_recent_nap_milli": -12312
        },
        "respiratory_rate": 16.11328125,
        "sleep_performance_percentage": 98,
        "sleep_consistency_percentage": 90,
        "sleep_efficiency_percentage": 91.69533848
      }
    }
  ],
  "next_token": "MTIzOjEyMzEyMw"
}
```

### Get Sleep by ID
```http
GET /v1/activity/sleep/{sleep_id}
```

## Recovery Data

### Get Recovery Collection
```http
GET /v1/recovery?start={ISO_TIME}&end={ISO_TIME}&limit={LIMIT}
```

Response:
```json
{
  "records": [
    {
      "cycle_id": 93845,
      "sleep_id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": 10129,
      "created_at": "2022-04-24T11:25:44.774Z",
      "updated_at": "2022-04-24T14:25:44.774Z",
      "score_state": "SCORED",
      "score": {
        "user_calibrating": false,
        "recovery_score": 44,
        "resting_heart_rate": 64,
        "hrv_rmssd_milli": 31.813562,
        "spo2_percentage": 95.6875,
        "skin_temp_celsius": 33.7
      }
    }
  ]
}
```

### Get Recovery for Cycle
```http
GET /v1/recovery/cycle/{cycle_id}
```

## Cycles (Daily Physiological Data)

### Get Cycle Collection
```http
GET /v1/cycle?start={ISO_TIME}&end={ISO_TIME}&limit={LIMIT}
```

Response:
```json
{
  "records": [
    {
      "id": 93845,
      "user_id": 10129,
      "created_at": "2022-04-24T11:25:44.774Z",
      "updated_at": "2022-04-24T14:25:44.774Z",
      "start": "2022-04-24T02:25:44.774Z", 
      "end": "2022-04-24T10:25:44.774Z",
      "timezone_offset": "-05:00",
      "score_state": "SCORED",
      "score": {
        "strain": 5.2951527,
        "kilojoule": 8288.297,
        "average_heart_rate": 68,
        "max_heart_rate": 141
      }
    }
  ]
}
```

## Workouts

### Get Workout Collection
```http
GET /v1/activity/workout?start={ISO_TIME}&end={ISO_TIME}&limit={LIMIT}
```

Response includes workout strain, heart rate zones, distance, and sport type.

## Key Metrics for Assistant Behavior

### Sleep Performance Indicators
- **sleep_performance_percentage**: Overall sleep quality (0-100%)
- **sleep_efficiency_percentage**: Time asleep vs time in bed
- **disturbance_count**: Number of sleep interruptions
- **sleep_consistency_percentage**: Consistency with sleep schedule

### Recovery Indicators  
- **recovery_score**: Overall recovery (0-100)
- **hrv_rmssd_milli**: Heart Rate Variability (higher = better recovery)
- **resting_heart_rate**: Baseline heart rate (lower = better recovery)

### Behavior Adjustment Thresholds

**Excellent (90%+ performance):**
- High energy communication
- Suggest complex tasks
- Proactive project ideas

**Good (80-89% performance):**
- Normal energy levels
- Standard task complexity
- Balanced approach

**Fair (70-79% performance):** 
- Supportive communication
- Lighter task suggestions
- More patient responses

**Poor (<70% performance):**
- Gentle, caring tone
- Minimal task complexity
- Focus on rest and recovery