# Short-term Forecast API Reference

KMA short-term forecast service provides three types of forecasts using the same grid coordinate system.

**Base URL**: `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0`

**Service**: 기상청 단기예보 조회서비스 (15084084)

## Endpoints

### 1. Ultra-short-term Observation (초단기실황)

**Endpoint**: `/getUltraSrtNcst`

**Description**: Current weather observations (실시간 관측 데이터)

**Release Schedule**: Every hour at :10 minutes (매시각 10분)

**Parameters**:

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| serviceKey | Yes | String | API service key | (your key) |
| numOfRows | Yes | Integer | Number of rows per page | 10 |
| pageNo | Yes | Integer | Page number | 1 |
| dataType | Yes | String | Response format (XML/JSON) | JSON |
| base_date | Yes | String | Base date (YYYYMMDD) | 20260201 |
| base_time | Yes | String | Base time (HHmm) | 0600 |
| nx | Yes | Integer | Grid X coordinate | 60 |
| ny | Yes | Integer | Grid Y coordinate | 127 |

**Response Categories** (초단기실황 카테고리):

| Category | Name | Unit | Description |
|----------|------|------|-------------|
| T1H | Temperature | °C | Current temperature |
| RN1 | 1-hour precipitation | mm | Precipitation in the last hour |
| UUU | East-west wind | m/s | Wind component (east-west) |
| VVV | North-south wind | m/s | Wind component (north-south) |
| REH | Humidity | % | Relative humidity |
| PTY | Precipitation type | Code | 0=None, 1=Rain, 2=Rain/Snow, 3=Snow, 4=Shower |
| VEC | Wind direction | deg | Wind direction in degrees (0-360) |
| WSD | Wind speed | m/s | Wind speed |

**Example Request**:
```bash
curl "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=YOUR_KEY&numOfRows=10&pageNo=1&dataType=JSON&base_date=20260201&base_time=0600&nx=60&ny=127"
```

---

### 2. Ultra-short-term Forecast (초단기예보)

**Endpoint**: `/getUltraSrtFcst`

**Description**: Forecast for the next 6 hours (6시간 예보)

**Release Schedule**: Every hour at :10 minutes (매시각 10분)

**Parameters**: Same as ultra-short-term observation

**Response Categories** (초단기예보 카테고리):

| Category | Name | Unit | Description |
|----------|------|------|-------------|
| T1H | Temperature | °C | Hourly temperature |
| RN1 | 1-hour precipitation | mm | Expected precipitation per hour |
| SKY | Sky condition | Code | 1=Clear, 3=Partly cloudy, 4=Cloudy |
| UUU | East-west wind | m/s | Wind component (east-west) |
| VVV | North-south wind | m/s | Wind component (north-south) |
| REH | Humidity | % | Relative humidity |
| PTY | Precipitation type | Code | 0=None, 1=Rain, 2=Rain/Snow, 3=Snow, 4=Shower |
| LGT | Lightning | Code | 0=None, 1-3=Lightning probability |
| VEC | Wind direction | deg | Wind direction in degrees (0-360) |
| WSD | Wind speed | m/s | Wind speed |

**Example Request**:
```bash
curl "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=YOUR_KEY&numOfRows=60&pageNo=1&dataType=JSON&base_date=20260201&base_time=0600&nx=60&ny=127"
```

---

### 3. Short-term Forecast (단기예보)

**Endpoint**: `/getVilageFcst`

**Description**: Forecast for the next 3 days (3일 예보)

**Release Schedule**: 8 times daily at 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10 (KST)

**Parameters**: Same as ultra-short-term observation

**Response Categories** (단기예보 카테고리):

| Category | Name | Unit | Description |
|----------|------|------|-------------|
| POP | Precipitation probability | % | Probability of precipitation |
| PTY | Precipitation type | Code | 0=None, 1=Rain, 2=Rain/Snow, 3=Snow, 4=Shower |
| PCP | Precipitation amount | mm | 1-hour precipitation (강수없음 = no rain) |
| REH | Humidity | % | Relative humidity |
| SNO | Snowfall | cm | 1-hour snowfall (적설없음 = no snow) |
| SKY | Sky condition | Code | 1=Clear, 3=Partly cloudy, 4=Cloudy |
| TMP | Temperature | °C | Hourly temperature |
| TMN | Min temperature | °C | Daily minimum temperature |
| TMX | Max temperature | °C | Daily maximum temperature |
| UUU | East-west wind | m/s | Wind component (east-west) |
| VVV | North-south wind | m/s | Wind component (north-south) |
| WAV | Wave height | m | Wave height |
| VEC | Wind direction | deg | Wind direction in degrees (0-360) |
| WSD | Wind speed | m/s | Wind speed |

**Example Request**:
```bash
curl "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=YOUR_KEY&numOfRows=100&pageNo=1&dataType=JSON&base_date=20260201&base_time=0500&nx=60&ny=127"
```

---

## Grid Coordinate System

KMA uses a **Lambert Conformal Conic projection** with 5km×5km grid cells.

**Projection Parameters**:
- Earth radius: 6371.00877 km
- Grid spacing: 5.0 km
- Standard parallel 1: 30°N
- Standard parallel 2: 60°N
- Reference longitude: 126°E
- Reference latitude: 38°N
- Reference point: (43, 136)

**Conversion**: Use `grid_converter.py` to convert latitude/longitude to grid coordinates (nx, ny).

Example:
```bash
python3 grid_converter.py 37.5665 126.9780
# Output: Grid: (60, 127)
```

---

## Response Format

All endpoints return JSON (or XML) in this structure:

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
            "baseDate": "20260201",
            "baseTime": "0600",
            "category": "T1H",
            "nx": 60,
            "ny": 127,
            "obsrValue": "5.2"  // or "fcstValue" for forecasts
          },
          ...
        ]
      },
      "pageNo": 1,
      "numOfRows": 10,
      "totalCount": 8
    }
  }
}
```

**Key Fields**:
- `baseDate`, `baseTime`: When the forecast was issued
- `fcstDate`, `fcstTime`: When the forecast applies (forecast endpoints only)
- `category`: Weather element code (T1H, SKY, etc.)
- `obsrValue`: Observed value (observation endpoint)
- `fcstValue`: Forecast value (forecast endpoints)

---

## Error Codes

| Code | Message | Description | Solution |
|------|---------|-------------|----------|
| 00 | NORMAL_SERVICE | Success | - |
| 01 | APPLICATION_ERROR | Application error | Check request parameters |
| 03 | DB_ERROR | Database error | Retry later |
| 04 | NODATA_ERROR | No data available | Check date/time, grid coordinates |
| 05 | SERVICETIMEOUT_ERROR | Service timeout | Retry later |
| 10 | INVALID_REQUEST_PARAMETER_ERROR | Invalid parameter | Check parameter format |
| 11 | NO_MANDATORY_REQUEST_PARAMETERS_ERROR | Missing parameter | Add required parameters |
| 12 | NO_OPENAPI_SERVICE_ERROR | Service not found | Check endpoint URL |
| 20 | SERVICE_ACCESS_DENIED_ERROR | Access denied | Check service key |
| 22 | LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR | Rate limit exceeded | Wait and retry |
| 30 | SERVICE_KEY_IS_NOT_REGISTERED_ERROR | Invalid service key | Check your API key |
| 31 | DEADLINE_HAS_EXPIRED_ERROR | Service key expired | Renew your API key |
| 32 | UNREGISTERED_IP_ERROR | IP not registered | Register IP in portal |
| 33 | UNSIGNED_CALL_ERROR | Unsigned request | Check request format |
| 99 | UNKNOWN_ERROR | Unknown error | Contact support |

---

## Usage Notes

1. **Base Time Calculation**:
   - For current/ultra-short: Use the most recent hour (if before :10, use previous hour)
   - For short-term: Use the most recent release time (02, 05, 08, 11, 14, 17, 20, 23)

2. **Data Availability**:
   - Data becomes available ~10 minutes after base_time
   - Historical data may not be available for all base times

3. **Grid Coverage**:
   - Grid coordinates cover South Korea only
   - Invalid coordinates will return NODATA_ERROR

4. **Pagination**:
   - Increase `numOfRows` to get more data points
   - Default: 10, Max: varies by service (typically 1000)

5. **Category Filtering**:
   - API returns all categories for the given time/location
   - Filter by `category` field in application code

---

## References

- Official API page: https://www.data.go.kr/data/15084084/openapi.do
- API documentation (Korean): Available after service subscription
- Grid conversion reference: https://gist.github.com/fronteer-kr/14d7f779d52a21ac2f16
