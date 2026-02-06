# Category Codes Reference

Complete reference for KMA weather category codes used in short-term and mid-term forecasts.

## Short-term Forecast Categories

### Observation Categories (초단기실황)

Used in `getUltraSrtNcst` endpoint:

| Category | Name | Unit | Range/Values | Description |
|----------|------|------|--------------|-------------|
| T1H | Temperature | °C | -50 ~ 50 | Current temperature |
| RN1 | 1-hour precipitation | mm | 0 ~ 300 | Precipitation in the last hour (강수없음 = 0) |
| UUU | East-west wind component | m/s | -100 ~ 100 | Wind component (positive = eastward) |
| VVV | North-south wind component | m/s | -100 ~ 100 | Wind component (positive = northward) |
| REH | Relative humidity | % | 0 ~ 100 | Relative humidity |
| PTY | Precipitation type | Code | 0-4 | See [Precipitation Type Codes](#precipitation-type-codes) |
| VEC | Wind direction | deg | 0 ~ 360 | Wind direction in degrees |
| WSD | Wind speed | m/s | 0 ~ 100 | Wind speed |

### Ultra-short Forecast Categories (초단기예보)

Used in `getUltraSrtFcst` endpoint:

| Category | Name | Unit | Range/Values | Description |
|----------|------|------|--------------|-------------|
| T1H | Temperature | °C | -50 ~ 50 | Hourly temperature forecast |
| RN1 | 1-hour precipitation | mm | 0 ~ 300 | Expected precipitation per hour |
| SKY | Sky condition | Code | 1, 3, 4 | See [Sky Condition Codes](#sky-condition-codes) |
| UUU | East-west wind component | m/s | -100 ~ 100 | Wind component (positive = eastward) |
| VVV | North-south wind component | m/s | -100 ~ 100 | Wind component (positive = northward) |
| REH | Relative humidity | % | 0 ~ 100 | Relative humidity |
| PTY | Precipitation type | Code | 0-4 | See [Precipitation Type Codes](#precipitation-type-codes) |
| LGT | Lightning | Code | 0-3 | 0=None, 1-3=Increasing probability |
| VEC | Wind direction | deg | 0 ~ 360 | Wind direction in degrees |
| WSD | Wind speed | m/s | 0 ~ 100 | Wind speed |

### Short-term Forecast Categories (단기예보)

Used in `getVilageFcst` endpoint:

| Category | Name | Unit | Range/Values | Description |
|----------|------|------|--------------|-------------|
| POP | Precipitation probability | % | 0 ~ 100 | Probability of precipitation |
| PTY | Precipitation type | Code | 0-4 | See [Precipitation Type Codes](#precipitation-type-codes) |
| PCP | Precipitation amount | mm/category | 강수없음, 1mm 미만, 1~4mm, ... | See [Precipitation Amount Format](#precipitation-amount-format) |
| REH | Relative humidity | % | 0 ~ 100 | Relative humidity |
| SNO | Snowfall | cm/category | 적설없음, 1cm 미만, 1~4cm, ... | Snowfall amount |
| SKY | Sky condition | Code | 1, 3, 4 | See [Sky Condition Codes](#sky-condition-codes) |
| TMP | Temperature | °C | -50 ~ 50 | Hourly temperature |
| TMN | Minimum temperature | °C | -50 ~ 50 | Daily minimum temperature (06:00 forecast only) |
| TMX | Maximum temperature | °C | -50 ~ 50 | Daily maximum temperature (06:00 forecast only) |
| UUU | East-west wind component | m/s | -100 ~ 100 | Wind component (positive = eastward) |
| VVV | North-south wind component | m/s | -100 ~ 100 | Wind component (positive = northward) |
| WAV | Wave height | m | 0 ~ 20 | Wave height (coastal areas) |
| VEC | Wind direction | deg | 0 ~ 360 | Wind direction in degrees |
| WSD | Wind speed | m/s | 0 ~ 100 | Wind speed |

---

## Code Value Mappings

### Precipitation Type Codes

Used in `PTY` category:

| Code | Korean | English | Icon Suggestion |
|------|--------|---------|-----------------|
| 0 | 없음 | None | ☀️ (if clear) or ☁️ (if cloudy) |
| 1 | 비 | Rain | 🌧️ |
| 2 | 비/눈 | Rain/Snow | 🌨️ |
| 3 | 눈 | Snow | ❄️ |
| 4 | 소나기 | Shower | 🌦️ |

### Sky Condition Codes

Used in `SKY` category:

| Code | Korean | English | Icon Suggestion |
|------|--------|---------|-----------------|
| 1 | 맑음 | Clear | ☀️ |
| 3 | 구름많음 | Partly Cloudy | ⛅ |
| 4 | 흐림 | Cloudy | ☁️ |

### Wind Direction Conversion

Convert `VEC` (degrees) to cardinal directions:

| Degrees | Direction | Korean | Abbreviation |
|---------|-----------|--------|--------------|
| 0-22.5 | North | 북 | N |
| 22.5-67.5 | Northeast | 북동 | NE |
| 67.5-112.5 | East | 동 | E |
| 112.5-157.5 | Southeast | 남동 | SE |
| 157.5-202.5 | South | 남 | S |
| 202.5-247.5 | Southwest | 남서 | SW |
| 247.5-292.5 | West | 서 | W |
| 292.5-337.5 | Northwest | 북서 | NW |
| 337.5-360 | North | 북 | N |

**Formula**:
```python
directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
index = int((degree + 22.5) / 45) % 8
direction = directions[index]
```

### Precipitation Amount Format

The `PCP` field uses categorical values instead of exact numbers:

| Value | Meaning |
|-------|---------|
| 강수없음 | No precipitation |
| 1mm 미만 | Less than 1mm |
| 1~4mm | 1-4mm |
| 5~9mm | 5-9mm |
| 10~19mm | 10-19mm |
| 20~29mm | 20-29mm |
| 30~49mm | 30-49mm |
| 50~99mm | 50-99mm |
| 100mm 이상 | 100mm or more |

For `RN1` (1-hour precipitation in observations), exact values are provided.

---

## Mid-term Forecast Fields

Used in `getMidFcst` endpoint from `MidFcstInfoService`:

### Weather Forecast Fields

| Field | Description | Example |
|-------|-------------|---------|
| wf3Am | Day 3 morning weather | 맑음 |
| wf3Pm | Day 3 afternoon weather | 구름많음 |
| wf4Am | Day 4 morning weather | ... |
| wf4Pm | Day 4 afternoon weather | ... |
| ... | Days 5-10 follow same pattern | ... |

### Precipitation Probability Fields

| Field | Description | Range |
|-------|-------------|-------|
| rnSt3Am | Day 3 morning rain probability | 0-100% |
| rnSt3Pm | Day 3 afternoon rain probability | 0-100% |
| rnSt4Am | Day 4 morning rain probability | ... |
| rnSt4Pm | Day 4 afternoon rain probability | ... |
| ... | Days 5-10 follow same pattern | ... |

### Temperature Fields

| Field | Description | Unit |
|-------|-------------|------|
| taMin3 | Day 3 minimum temperature | °C |
| taMax3 | Day 3 maximum temperature | °C |
| taMin4 | Day 4 minimum temperature | °C |
| taMax4 | Day 4 maximum temperature | °C |
| ... | Days 5-10 follow same pattern | ... |

---

## Weather Warning Types

Used in weather warning API (`WthrWrnInfoService`):

| Code | Korean | English | Severity |
|------|--------|---------|----------|
| W0 | 강풍 | Strong Wind | Warning |
| W1 | 호우 | Heavy Rain | Warning |
| W2 | 한파 | Cold Wave | Warning |
| W3 | 건조 | Dry Weather | Warning |
| W4 | 폭풍해일 | Storm Surge | Warning |
| W5 | 풍랑 | High Waves | Warning |
| W6 | 태풍 | Typhoon | Warning |
| W7 | 대설 | Heavy Snow | Warning |
| W8 | 황사 | Yellow Dust | Warning |
| W9 | 폭염 | Heat Wave | Warning |
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

**Warning vs Advisory**:
- **Advisory (주의보)**: Caution required, prepare for potential hazards
- **Warning (경보)**: Severe conditions, take protective actions

---

## Data Interpretation Notes

### Wind Components (UUU, VVV)

- UUU: East-west component (positive = eastward, negative = westward)
- VVV: North-south component (positive = northward, negative = southward)

**Calculate wind speed and direction**:
```python
import math

wsd = math.sqrt(uuu**2 + vvv**2)  # Wind speed
vec = (270 - math.atan2(vvv, uuu) * 180 / math.pi) % 360  # Wind direction
```

### Special Values

- **강수없음**: No precipitation (PCP field)
- **적설없음**: No snowfall (SNO field)
- **N/A**: Data not available

### Temperature Min/Max (TMN, TMX)

- Only provided in **02:00 and 11:00** base_time forecasts
- TMN: Minimum temperature from 00:00 to 12:00 (next day)
- TMX: Maximum temperature from 12:00 to 00:00 (next day)

---

## References

- Official category documentation: Available in API service detail page after subscription
- Grid conversion: [grid_converter.py](../scripts/grid_converter.py)
- Code examples: [forecast.py](../scripts/forecast.py)
