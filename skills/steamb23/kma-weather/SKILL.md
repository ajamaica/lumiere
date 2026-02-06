---
name: kma-weather
description: Get weather information from Korea Meteorological Administration (기상청). Provides current conditions, short-term forecasts (up to 3 days), mid-term forecasts (3-10 days), and weather warnings. Requires KMA API service key.
homepage: https://www.data.go.kr/data/15084084/openapi.do
metadata: {"openclaw":{"emoji":"🌦️","requires":{"bins":["python3"],"env":["KMA_SERVICE_KEY"]}}}
---

# kma-weather

Get official weather information from **Korea Meteorological Administration (KMA)** 기상청.

## Features

- **Current Weather** - Real-time observations (temperature, humidity, precipitation, wind)
- **Short-term Forecast** - Ultra-short (6 hours) and short-term (3 days) forecasts
- **Mid-term Forecast** - 3-10 day outlook
- **Weather Warnings** - Official warnings (typhoon, heavy rain, snow, etc.)
- **High Resolution** - 5km×5km grid system for precise local forecasts

## Quick Start

```bash
# Get current weather + 6-hour forecast (brief)
python3 skills/kma-weather/scripts/forecast.py brief --lat 37.5665 --lon 126.9780

# Get all forecasts as JSON (current + ultrashort + shortterm)
python3 skills/kma-weather/scripts/forecast.py all --lat 37.5665 --lon 126.9780 --json

# Get all short-term forecast data (3 days)
python3 skills/kma-weather/scripts/forecast.py shortterm --lat 37.5665 --lon 126.9780 --days all

# Get current nationwide weather warnings status
python3 skills/kma-weather/scripts/weather_warnings.py

# Get mid-term forecast for Seoul
python3 skills/kma-weather/scripts/midterm.py --region 서울
```

## Setup

### 1. Get API Key

1. Visit [공공데이터포털](https://www.data.go.kr)
2. Sign up / Log in
3. Request access to these 3 APIs (all use the same key):
   - [기상청 단기예보 조회서비스](https://www.data.go.kr/data/15084084/openapi.do) (15084084)
   - [기상청 기상특보 조회서비스](https://www.data.go.kr/data/15000415/openapi.do) (15000415)
   - [기상청 중기예보 조회서비스](https://www.data.go.kr/data/15059468/openapi.do) (15059468)
4. Wait for approval (usually instant to 1 day, auto-approved)
5. Go to My Page → API Key Management
6. Copy your `ServiceKey`

**Note**: All 3 APIs use the **same API key**.

### 2. Set Environment Variable

Add your API key to the environment:

**For Sandbox (Docker/Podman)**:
```yaml
# In agents.yaml
agents:
  defaults:
    sandbox:
      docker:
        env:
          KMA_SERVICE_KEY: "your-service-key-here"
```

**For Host**:
```yaml
# In agents.yaml
agents:
  defaults:
    env:
      vars:
        KMA_SERVICE_KEY: "your-service-key-here"
```

Or export directly:
```bash
export KMA_SERVICE_KEY="your-service-key-here"
```

## Usage

### Current Weather

Get real-time weather observations:

```bash
python3 skills/kma-weather/scripts/forecast.py current \
  --lat 37.5665 --lon 126.9780
```

**Output**:
```
🌤️ 현재 날씨 (초단기실황)
🌡️  기온: 5.2°C
💧 습도: 65%
🌧️  강수량: 0mm (1시간)
💨 풍속: 2.3m/s
🧭 풍향: NW (315°)
```

### Short-term Forecast

**Ultra-short forecast (6 hours)**:
```bash
python3 skills/kma-weather/scripts/forecast.py ultrashort \
  --lat 37.5665 --lon 126.9780
```

**Short-term forecast (3 days)**:
```bash
# 내일 예보 (기본값)
python3 skills/kma-weather/scripts/forecast.py shortterm \
  --lat 37.5665 --lon 126.9780

# 모레 예보
python3 skills/kma-weather/scripts/forecast.py shortterm \
  --lat 37.5665 --lon 126.9780 --days 2

# 글피 예보
python3 skills/kma-weather/scripts/forecast.py shortterm \
  --lat 37.5665 --lon 126.9780 --days 3

# 모든 예보 데이터 (3일치 전체)
python3 skills/kma-weather/scripts/forecast.py shortterm \
  --lat 37.5665 --lon 126.9780 --days all
```

**`--days` Options **: `all`=전체, `1`=내일(기본), `2`=모레, `3`=글피

### Combined Forecasts

**Brief (current + 6 hours)** - Perfect for quick weather checks:
```bash
python3 skills/kma-weather/scripts/forecast.py brief \
  --lat 37.5665 --lon 126.9780
```

**All (current + ultrashort + shortterm)** - Full data:
```bash
python3 skills/kma-weather/scripts/forecast.py all \
  --lat 37.5665 --lon 126.9780
```

When outputting JSON, return a structure separated by type:
```bash
python3 skills/kma-weather/scripts/forecast.py brief --lat 37.5665 --lon 126.9780 --json
# {"current": {...}, "ultrashort": {...}}

python3 skills/kma-weather/scripts/forecast.py all --lat 37.5665 --lon 126.9780 --json
# {"current": {...}, "ultrashort": {...}, "shortterm": {...}}
```

### Weather Warnings

Check current nationwide weather warning status:

```bash
# Get current nationwide warning status
python3 skills/kma-weather/scripts/weather_warnings.py
```

**Output**:
```
🚨 기상특보 현황
발표시각: 2026-02-01 10:00
발효시각: 2026-02-01 10:00

📍 현재 발효 중인 특보
  • 건조경보 : 강원도, 경상북도, ...
  • 풍랑주의보 : 동해중부안쪽먼바다, ...

⚠️  예비특보
  • (1) 강풍 예비특보 : 02월 02일 새벽(00시~06시) : 울릉도.독도
```

### Mid-term Forecast

Get 3-10 day forecasts by region:

```bash
# By region name
python3 skills/kma-weather/scripts/midterm.py --region 서울

# By station code
python3 skills/kma-weather/scripts/midterm.py --stn-id 109
```

**Supported regions**: 서울, 인천, 경기, 부산, 대구, 광주, 대전, 울산, 세종, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주

### Raw JSON Output

All scripts support `--json` flag for raw API responses:

```bash
python3 skills/kma-weather/scripts/forecast.py current \
  --lat 37.5665 --lon 126.9780 --json
```

## Grid Coordinates

KMA uses a **5km×5km grid system** based on Lambert Conformal Conic projection.

Convert lat/lon to grid coordinates:

```bash
python3 skills/kma-weather/scripts/grid_converter.py 37.5665 126.9780
```

**Output**:
```
Input: (37.5665, 126.9780)
Grid:  (60, 127)
Verify: (37.5665, 126.9780)
```

The scripts automatically handle grid conversion, so you can use latitude/longitude directly.

## Using in Python Code

Import and use functions directly:

```python
from skills.kma_weather.scripts.forecast import fetch_forecast, format_current
from skills.kma_weather.scripts.grid_converter import latlon_to_grid

# Get current weather
data = fetch_forecast("current", lat=37.5665, lon=126.9780)
print(format_current(data))

# Convert coordinates
nx, ny = latlon_to_grid(37.5665, 126.9780)
print(f"Grid: ({nx}, {ny})")
```

## API Details

For detailed API documentation, see:
- [references/api-forecast.md] - Short-term forecast API
- [references/api-warnings.md] - Weather warnings API
- [references/api-midterm.md] - Mid-term forecast API
- [references/category-codes.md] - Category code reference

## Workflow Examples

See [examples/daily-check.md] for a complete daily weather check workflow.

## Notes

- **API Release Schedule**:
  - Current/ultra-short: Every hour at :10 minutes
  - Short-term: 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10 (KST)
  - Mid-term: 06:00, 18:00 (KST)
- **Grid Resolution**: 5km×5km (higher resolution than global services)
- **Coverage**: South Korea only
- **API Limits**: Check 공공데이터포털 for your plan's rate limits
- **Auto-pagination**: Script automatically fetches all pages when data exceeds single page limit (300 rows/page)

## Comparison: weather vs kma-weather

| Feature | weather (Global) | kma-weather (KMA) |
|---------|------------------|-------------------|
| Data Source | wttr.in, Open-Meteo | Korea Meteorological Administration |
| Coverage | Worldwide | South Korea only |
| API Key | Not required | **Required** |
| Resolution | City-level | 5km×5km grid |
| Official Warnings | No | **Yes** (typhoon, heavy rain, snow) |
| Best For | Quick global lookups | Detailed Korean forecasts and weather warning |

**Recommendation**: Use both skills complementarily:
- `weather` for global locations
- `kma-weather` for detailed Korean forecasts and weather warnings

## Troubleshooting

### "KMA API service key not found"
Set the `KMA_SERVICE_KEY` environment variable. See [Setup](#setup).

### "API Error 30: SERVICE_KEY_IS_NOT_REGISTERED_ERROR"
Your API key is invalid or not approved yet. Check:
1. Did you request access to all 3 KMA APIs?
2. Has your request been approved?
3. Is the key copied correctly (no extra spaces)?

### "API Error 22: SERVICE_TIMEOUT_ERROR"
The KMA API server is experiencing delays. Try again in a few moments.

### No data returned
- Check if the coordinates are within South Korea.
- Verify the grid coordinates using `grid_converter.py`.
- Try increasing `--rows` parameter (default: 300). If it's too high, you may receive a `429 too many requests` error.

## License

This skill uses public APIs from the Korea Meteorological Administration via 공공데이터포털.

---

## Implementation Status

This skill implements the most commonly used endpoints. Additional endpoints may be added in future versions based on needs.

For more details, please read [implement-status.md]
