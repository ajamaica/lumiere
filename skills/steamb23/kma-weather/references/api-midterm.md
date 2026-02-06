# Mid-term Forecast API Reference

KMA mid-term forecast service provides weather outlook for 3-10 days ahead.

**Base URL**: `https://apis.data.go.kr/1360000/MidFcstInfoService`

**Service**: 기상청 중기예보 조회서비스 (15059468)

## Endpoints

### 1. Get Mid-term Forecast

**Endpoint**: `/getMidFcst`

**Description**: Retrieve mid-term forecast (3-10 days) for a specific region

**Release Schedule**: Twice daily at **06:00** and **18:00** (KST)

**Parameters**:

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| serviceKey | Yes | String | API service key | (your key) |
| numOfRows | Yes | Integer | Number of rows per page | 10 |
| pageNo | Yes | Integer | Page number | 1 |
| dataType | Yes | String | Response format (XML/JSON) | JSON |
| stnId | Yes | String | Station ID (3-digit code) | 109 |
| tmFc | Yes | String | Release time (YYYYMMDDHHmm) | 202602010600 |

**Example Request**:
```bash
curl "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidFcst?serviceKey=YOUR_KEY&numOfRows=10&pageNo=1&dataType=JSON&stnId=109&tmFc=202602010600"
```

**Note**: This endpoint returns **plain text forecasts** in the `wfSv` field, designed for natural language interpretation.

---

## Station Codes

The mid-term forecast API uses simplified 3-digit station codes:

| Code | Region Coverage | Korean |
|------|-----------------|--------|
| 108 | National | 전국 |
| 109 | Seoul, Incheon, Gyeonggi | 서울, 인천, 경기도 |
| 105 | Gangwon | 강원도 |
| 131 | Chungcheongbuk | 충청북도 |
| 133 | Daejeon, Sejong, Chungcheongnam | 대전, 세종, 충청남도 |
| 146 | Jeonbuk | 전북자치도 |
| 156 | Gwangju, Jeonnam | 광주, 전라남도 |
| 143 | Daegu, Gyeongbuk | 대구, 경상북도 |
| 159 | Busan, Ulsan, Gyeongnam | 부산, 울산, 경상남도 |
| 184 | Jeju | 제주도 |

**Note**: Each station code covers a broad region. For city-level detail, use the short-term forecast API with grid coordinates.

---

## Response Format

**JSON Structure**:
```json
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "dataType": "JSON",
      "items": {
        "item": {
          "stnId": "109",
          "tmFc": "202602010600",
          "wfSv": "○ (날씨) 28일(수)~3월 2일(일)은 고기압의 영향으로 대체로 맑겠으나, 3일(월)~5일(수)은 기압골의 영향으로 구름많고 3일(월)에는 눈 또는 비가 오겠습니다.\n\n○ (아침기온) 평년(-6~2도)과 비슷하거나 조금 낮겠습니다.\n○ (낮기온) 평년(4~11도)과 비슷하거나 조금 높겠습니다."
        }
      },
      "pageNo": 1,
      "numOfRows": 10,
      "totalCount": 1
    }
  }
}
```

**Key Fields**:
- `stnId`: Station code (e.g., "109" for Seoul·Gyeonggi)
- `tmFc`: Release time in YYYYMMDDHHmm format
- `wfSv`: **Plain text forecast** in Korean, containing:
  - General weather outlook for the 3-10 day period
  - Expected temperatures compared to normal ranges
  - Precipitation expectations
  - Notable weather patterns (high/low pressure systems, etc.)

---

## Response Field Details

### Plain Text Forecast (wfSv)

The `wfSv` field contains a **natural language forecast** written by KMA meteorologists. This text typically includes:

**Structure**:
1. **Weather Overview** (날씨)
   - General weather patterns for the forecast period
   - Expected conditions day by day
   - Precipitation events (rain/snow)
   - Weather system influences (high pressure, low pressure, fronts)

2. **Morning Temperature** (아침기온)
   - Expected morning lows
   - Comparison to normal temperatures (평년)
   - Normal range provided in parentheses

3. **Afternoon Temperature** (낮기온)
   - Expected afternoon highs
   - Comparison to normal temperatures (평년)
   - Normal range provided in parentheses

**Example Content**:
```
○ (날씨) 28일(수)~3월 2일(일)은 고기압의 영향으로 대체로 맑겠으나,
3일(월)~5일(수)은 기압골의 영향으로 구름많고 3일(월)에는 눈 또는 비가 오겠습니다.

○ (아침기온) 평년(-6~2도)과 비슷하거나 조금 낮겠습니다.
○ (낮기온) 평년(4~11도)과 비슷하거나 조금 높겠습니다.
```

**Interpreting the Text**:
- Use LLMs to parse and extract key information
- Look for keywords: 맑음 (clear), 구름많음 (cloudy), 비 (rain), 눈 (snow)
- Temperature comparisons: 비슷하다 (similar), 높다 (higher), 낮다 (lower)
- Time indicators: Day of week and dates

---

## Usage Notes

### Release Time Calculation

Mid-term forecasts are issued at **06:00** and **18:00** KST:

```python
from datetime import datetime

now = datetime.now()

if now.hour < 6:
    # Use yesterday's 18:00
    tm_fc = (now - timedelta(days=1)).strftime("%Y%m%d1800")
elif now.hour < 18:
    # Use today's 06:00
    tm_fc = now.strftime("%Y%m%d0600")
else:
    # Use today's 18:00
    tm_fc = now.strftime("%Y%m%d1800")
```

### Forecast Coverage

- **Period**: 3-10 days ahead (general outlook)
- **Format**: Plain text narrative, not structured data
- **Detail Level**: Less specific than short-term forecasts
- **Best Use**: General planning and trend awareness

### Data Availability

- Forecasts are typically available **~30 minutes** after release time
- Historical forecasts may not be available for all regions
- Use most recent `tmFc` for current forecast

### Station Selection

- Use station code (e.g., `109` for Seoul·Gyeonggi region)
- Each code covers a broad geographic area
- For city-level or precise location forecasts, use short-term forecast API with grid coordinates

---

## Integration Example

**Get mid-term forecast for Seoul**:
```python
from midterm import fetch_midterm_forecast, format_midterm

# Fetch forecast (auto-calculates tmFc)
data = fetch_midterm_forecast("109")  # Seoul·Gyeonggi

# Display formatted output
print(format_midterm(data))
```

**Extract plain text forecast**:
```python
item = data["response"]["body"]["items"]["item"]

# Get the plain text forecast
forecast_text = item["wfSv"]
print(forecast_text)

# Parse with LLM or text processing
# Example output:
# ○ (날씨) 28일(수)~3월 2일(일)은 고기압의 영향으로 대체로 맑겠으나...
# ○ (아침기온) 평년(-6~2도)과 비슷하거나 조금 낮겠습니다.
# ○ (낮기온) 평년(4~11도)과 비슷하거나 조금 높겠습니다.
```

**Process with LLM for structured extraction**:
```python
# Use an LLM to extract structured information from the text
prompt = f"""
Extract weather information from this Korean forecast:
{forecast_text}

Provide:
1. Overall weather pattern
2. Precipitation days
3. Temperature trends
"""
# Process with your LLM of choice
```

---

## Error Codes

See [api-forecast.md](api-forecast.md#error-codes) for common error codes.

**Mid-term specific errors**:
- **NODATA_ERROR (04)**: Invalid `stnId` or `tmFc` not yet released
- **INVALID_REQUEST_PARAMETER_ERROR (10)**: Check `stnId` format (must be 3-digit code) and `tmFc` time

---

## Best Practices

1. **Auto-calculate tmFc**: Use helper function to determine most recent release time
2. **Cache forecasts**: Mid-term forecasts change only twice daily - cache for up to 6 hours
3. **Station mapping**: Provide user-friendly region names, map to station codes internally
4. **Combine with short-term**: Use short-term for Days 1-3, mid-term for Days 4-10
5. **LLM Processing**: Use LLMs to parse the plain text forecast for structured information extraction
6. **Present原文**: Show the original Korean text to users for full detail

---

## Comparison with Short-term Forecast

| Feature | Short-term (단기예보) | Mid-term (중기예보) |
|---------|---------------------|-------------------|
| Coverage | 3 days (72 hours) | 3-10 days |
| Resolution | Hourly | Daily overview |
| Updates | 8 times daily | 2 times daily |
| Format | Structured data (codes) | Plain text narrative |
| Location | 5km×5km grid coordinates | Regional station codes |
| Best for | Detailed planning (1-3 days) | General outlook (4-10 days) |

**Recommendation**: Use both APIs complementarily:
- Short-term for detailed hourly forecasts (Days 1-3)
- Mid-term for general outlook (Days 4-10)

---

## References

- Official API page: https://www.data.go.kr/data/15059468/openapi.do
- Station code mapping: [midterm.py](../scripts/midterm.py) `STATION_CODES` dictionary
- Code examples: [midterm.py](../scripts/midterm.py)
