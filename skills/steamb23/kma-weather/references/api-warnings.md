# Weather Warnings API Reference

KMA weather warning service provides official warnings and advisories for severe weather conditions.

**Base URL**: `https://apis.data.go.kr/1360000/WthrWrnInfoService`

**Service**: 기상청 기상특보 조회서비스 (15000415)

## Endpoint

### Get Warning Status

**Endpoint**: `/getPwnStatus`

**Description**: Get current nationwide weather warning status summary

**Parameters**:

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| serviceKey | Yes | String | API service key | (your key) |
| numOfRows | Yes | Integer | Number of rows per page | 10 |
| pageNo | Yes | Integer | Page number | 1 |
| dataType | Yes | String | Response format (XML/JSON) | JSON |

**Example Request**:
```bash
curl "https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus?serviceKey=YOUR_KEY&numOfRows=10&pageNo=1&dataType=JSON"
```

**Response Fields**:

| Field | Description | Example |
|-------|-------------|---------|
| tmFc | Issue time (YYYYMMDDHHmm) | 202602011000 |
| tmEf | Effective time (YYYYMMDDHHmm) | 202602011000 |
| tmSeq | Sequence number | 3 |
| t6 | Current active warnings summary | o 건조경보 : 강원도... |
| t7 | Preliminary warnings | (1) 강풍 예비특보... |
| other | Other information | o 없음 |

**Usage Note**: This endpoint provides a concise nationwide summary of all active warnings and preliminary warnings, ideal for quick status checks.

---

## Warning Types

### Warning Levels

Korean weather warnings have two severity levels:

1. **Advisory (주의보)**: Caution required, prepare for potential hazards
2. **Warning (경보)**: Severe conditions, take protective actions immediately

### Warning Type Codes

| Code | Korean | English | Type |
|------|--------|---------|------|
| W0 | 강풍경보 | Strong Wind Warning | Warning |
| W1 | 호우경보 | Heavy Rain Warning | Warning |
| W2 | 한파경보 | Cold Wave Warning | Warning |
| W3 | 건조경보 | Dry Weather Warning | Warning |
| W4 | 폭풍해일경보 | Storm Surge Warning | Warning |
| W5 | 풍랑경보 | High Waves Warning | Warning |
| W6 | 태풍경보 | Typhoon Warning | Warning |
| W7 | 대설경보 | Heavy Snow Warning | Warning |
| W8 | 황사경보 | Yellow Dust Warning | Warning |
| W9 | 폭염경보 | Heat Wave Warning | Warning |
| O0 | 강풍주의보 | Strong Wind Advisory | Advisory |
| O1 | 호우주의보 | Heavy Rain Advisory | Advisory |
| O2 | 한파주의보 | Cold Wave Advisory | Advisory |
| O3 | 건조주의보 | Dry Weather Advisory | Advisory |
| O4 | 폭풍해일주의보 | Storm Surge Advisory | Advisory |
| O5 | 풍랑주의보 | High Waves Advisory | Advisory |
| O6 | 태풍주의보 | Typhoon Advisory | Advisory |
| O7 | 대설주의보 | Heavy Snow Advisory | Advisory |
| O8 | 황사주의보 | Yellow Dust Advisory | Advisory |
| O9 | 폭염주의보 | Heat Wave Advisory | Advisory |

---

## Warning Criteria

### Heavy Rain (호우)

**Advisory (주의보)**:
- 3-hour rainfall ≥ 60mm
- 12-hour rainfall ≥ 110mm

**Warning (경보)**:
- 3-hour rainfall ≥ 90mm
- 12-hour rainfall ≥ 180mm

### Heavy Snow (대설)

**Advisory (주의보)**:
- 24-hour snowfall ≥ 5cm (plains/coast)
- 24-hour snowfall ≥ 20cm (mountainous areas)

**Warning (경보)**:
- 24-hour snowfall ≥ 20cm (plains/coast)
- 24-hour snowfall ≥ 30cm (mountainous areas)

### Strong Wind (강풍)

**Advisory (주의보)**:
- Wind speed ≥ 14 m/s (plains)
- Wind speed ≥ 17 m/s (mountains)
- Wind speed ≥ 21 m/s (coastal areas)

**Warning (경보)**:
- Wind speed ≥ 21 m/s (plains)
- Wind speed ≥ 24 m/s (mountains)
- Wind speed ≥ 26 m/s (coastal areas)

### Cold Wave (한파)

**Advisory (주의보)**:
- Morning minimum temperature ≤ -12°C (2 consecutive days)
- Morning minimum drops ≥ 10°C in 24 hours to ≤ 3°C

**Warning (경보)**:
- Morning minimum temperature ≤ -15°C (2 consecutive days)
- Morning minimum drops ≥ 15°C in 24 hours to ≤ 3°C

### Heat Wave (폭염)

**Advisory (주의보)**:
- Daily maximum temperature ≥ 33°C (2 consecutive days)

**Warning (경보)**:
- Daily maximum temperature ≥ 35°C (2 consecutive days)

### Typhoon (태풍)

**Advisory (주의보)**:
- Typhoon expected to affect region within 48 hours
- Wind speed expected to reach 17-24 m/s

**Warning (경보)**:
- Typhoon expected to affect region within 24 hours
- Wind speed expected to exceed 25 m/s

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
        "item": [
          {
            "stnId": "108",
            "title": "서울특별시 호우주의보",
            "tmFc": "202602011200",
            "tmSeq": "1",
            "wrnId": "O1"
          },
          ...
        ]
      },
      "pageNo": 1,
      "numOfRows": 10,
      "totalCount": 3
    }
  }
}
```

**Key Fields**:

| Field | Description | Example |
|-------|-------------|---------|
| stnId | Station/Region ID | 108 (Seoul) |
| title | Warning title | 서울특별시 호우주의보 |
| tmFc | Issue time (YYYYMMDDHHmm) | 202602011200 |
| tmSeq | Sequence number | 1 |
| wrnId | Warning type code | O1 (Heavy Rain Advisory) |

---

## Station IDs

Common station IDs for major cities:

| Station ID | Region | Korean Name |
|------------|--------|-------------|
| 108 | Seoul | 서울 |
| 112 | Incheon | 인천 |
| 119 | Suwon | 수원 |
| 131 | Gangneung | 강릉 |
| 133 | Daejeon | 대전 |
| 143 | Daegu | 대구 |
| 146 | Jeonju | 전주 |
| 152 | Ulsan | 울산 |
| 156 | Gwangju | 광주 |
| 159 | Busan | 부산 |
| 184 | Jeju | 제주 |
| 0 | All stations | 전국 |

---

## Usage Notes

### Time Range

- Use `fromTmFc` and `toTmFc` to specify time range
- Recommended: Query last 24-48 hours for current warnings
- Format: YYYYMMDDHHmm (e.g., 202602011200 = 2026-02-01 12:00)

### Station Filtering

- Use `stnId=0` to get warnings for all regions (recommended)
- Use specific station ID to filter by region
- A single warning may affect multiple stations

### Active Warnings

To get currently active warnings:
```python
from datetime import datetime, timedelta

# Query last 24 hours
to_time = datetime.now().strftime("%Y%m%d%H%M")
from_time = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d%H%M")

fetch_warnings(from_time, to_time, stn_id="0")
```

### Warning Lifecycle

1. **Issue**: Warning is first issued (주의보/경보 발표)
2. **Update**: Warning is updated with new information (갱신)
3. **Upgrade**: Advisory upgraded to Warning (경보로 상향)
4. **Downgrade**: Warning downgraded to Advisory (주의보로 하향)
5. **Cancel**: Warning is cancelled (해제)

Check the `title` field for status keywords: 발표, 갱신, 상향, 하향, 해제

---

## Error Codes

See [api-forecast.md](api-forecast.md#error-codes) for common error codes.

---

## Integration Example

**Check for warnings and display**:
```python
from warnings import fetch_warnings, format_warnings

# Get recent warnings
data = fetch_warnings()

# Check if there are active warnings
items = data["response"]["body"]["items"]["item"]

if items:
    print("⚠️  Active weather warnings!")
    print(format_warnings(data))
else:
    print("✅ No active weather warnings")
```

**Filter by warning type**:
```python
items = data["response"]["body"]["items"]["item"]

# Filter for typhoon warnings
typhoon_warnings = [
    item for item in items
    if item.get("wrnId") in ["O6", "W6"]
]

if typhoon_warnings:
    print("🌀 Typhoon warning in effect!")
```

---

## Best Practices

1. **Check regularly**: Query every 1-3 hours during severe weather season
2. **Use stnId=0**: Get warnings for all regions to avoid missing any
3. **Parse title**: Extract status (발표/해제) from title field
4. **Alert users**: Display warnings prominently when detected
5. **Store history**: Keep track of warning lifecycle for analytics

---

## References

- Official API page: https://www.data.go.kr/data/15000415/openapi.do
- KMA warning criteria: https://www.kma.go.kr/
- Code examples: [weather_warnings.py](../scripts/weather_warnings.py)
