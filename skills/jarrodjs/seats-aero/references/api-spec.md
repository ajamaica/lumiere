# seats.aero Partner API Specification

Complete API reference for the seats.aero partner API.

## Base Information

| Item           | Value                                     |
| -------------- | ----------------------------------------- |
| Base URL       | `https://seats.aero/partnerapi/`          |
| Authentication | `Partner-Authorization: Bearer {api_key}` |
| Content Type   | `application/json`                        |
| Rate Limits    | Varies by plan                            |

---

## Endpoints

### 1. Cached Search

**`GET /search`**

Search cached award availability across all supported mileage programs.

#### Query Parameters

| Parameter             | Type    | Required | Description                                        |
| --------------------- | ------- | -------- | -------------------------------------------------- |
| `origin_airport`      | string  | Yes      | Origin airport IATA code (3 letters)               |
| `destination_airport` | string  | Yes      | Destination airport(s), comma-separated IATA codes |
| `cabin`               | string  | No       | Cabin class(es): Y, W, J, F (comma-separated)      |
| `start_date`          | string  | No       | Start of date range (YYYY-MM-DD)                   |
| `end_date`            | string  | No       | End of date range (YYYY-MM-DD)                     |
| `source`              | string  | No       | Mileage program(s), comma-separated                |
| `only_direct`         | boolean | No       | Only return direct flights (default: false)        |
| `exclude_sources`     | string  | No       | Programs to exclude, comma-separated               |
| `order_by`            | string  | No       | Sort field (e.g., "Date", "JMileageCost")          |
| `order_direction`     | string  | No       | "asc" or "desc"                                    |
| `take`                | integer | No       | Results per page (default: 100, max: 1000)         |
| `skip`                | integer | No       | Results to skip (deprecated, use cursor)           |
| `cursor`              | string  | No       | Pagination cursor from previous response           |

#### Response Schema

```json
{
  "data": [
    {
      "ID": "string",
      "RouteID": "string",
      "Route": "SFO-NRT",
      "OriginAirport": "SFO",
      "OriginRegion": "North America",
      "DestinationAirport": "NRT",
      "DestinationRegion": "Asia",
      "NumDaysOut": 45,
      "Date": "2024-03-15",
      "ParsedDate": "2024-03-15T00:00:00Z",
      "YAvailable": false,
      "YMileageCost": null,
      "YRemainingSeats": 0,
      "YAirlines": "",
      "YDirects": 0,
      "WAvailable": false,
      "WMileageCost": null,
      "WRemainingSeats": 0,
      "WAirlines": "",
      "WDirects": 0,
      "JAvailable": true,
      "JMileageCost": 70000,
      "JRemainingSeats": 2,
      "JAirlines": "NH,UA",
      "JDirects": 1,
      "FAvailable": true,
      "FMileageCost": 110000,
      "FRemainingSeats": 1,
      "FAirlines": "NH",
      "FDirects": 1,
      "Source": "united",
      "CreatedAt": "2024-02-01T12:00:00Z",
      "UpdatedAt": "2024-02-01T15:30:00Z",
      "ComputedLastSeen": "2024-02-01T15:30:00Z",
      "AvailabilityTrips": []
    }
  ],
  "count": 150,
  "hasMore": true,
  "cursor": "eyJpZCI6MTIzNH0="
}
```

#### Example Request

```bash
curl -X GET "https://seats.aero/partnerapi/search?origin_airport=SFO&destination_airport=NRT,HND&cabin=J,F&start_date=2024-03-01&end_date=2024-03-31" \
  -H "Partner-Authorization: Bearer YOUR_API_KEY"
```

---

### 2. Bulk Availability

**`GET /availability`**

Get bulk availability from a single mileage program, optionally filtered by region.

#### Query Parameters

| Parameter             | Type    | Required | Description                                |
| --------------------- | ------- | -------- | ------------------------------------------ |
| `source`              | string  | Yes      | Single mileage program name                |
| `cabin`               | string  | No       | Single cabin code: Y, W, J, or F           |
| `origin_region`       | string  | No       | Filter by origin region                    |
| `destination_region`  | string  | No       | Filter by destination region               |
| `origin_airport`      | string  | No       | Filter by origin airport                   |
| `destination_airport` | string  | No       | Filter by destination airport              |
| `start_date`          | string  | No       | Start of date range (YYYY-MM-DD)           |
| `end_date`            | string  | No       | End of date range (YYYY-MM-DD)             |
| `take`                | integer | No       | Results per page (default: 100, max: 1000) |
| `cursor`              | string  | No       | Pagination cursor                          |

#### Response Schema

Same as `/search` endpoint.

#### Example Request

```bash
curl -X GET "https://seats.aero/partnerapi/availability?source=united&cabin=J&origin_region=Europe" \
  -H "Partner-Authorization: Bearer YOUR_API_KEY"
```

---

### 3. Get Routes

**`GET /routes`**

Get all routes monitored for a specific mileage program.

#### Query Parameters

| Parameter | Type   | Required | Description          |
| --------- | ------ | -------- | -------------------- |
| `source`  | string | Yes      | Mileage program name |

#### Response Schema

```json
{
  "data": [
    {
      "ID": "string",
      "OriginAirport": "SFO",
      "OriginRegion": "North America",
      "DestinationAirport": "NRT",
      "DestinationRegion": "Asia",
      "Source": "united",
      "NumDaysOut": 330,
      "Distance": 5130,
      "AutoCreated": false
    }
  ]
}
```

#### Example Request

```bash
curl -X GET "https://seats.aero/partnerapi/routes?source=aeroplan" \
  -H "Partner-Authorization: Bearer YOUR_API_KEY"
```

---

### 4. Get Trip Details

**`GET /trips/{id}`**

Get detailed flight-level information for a specific availability, including segments and booking links.

#### Path Parameters

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| `id`      | string | Yes      | Availability ID from search results |

#### Response Schema

```json
{
  "ID": "string",
  "AvailabilityID": "string",
  "RouteID": "string",
  "OriginAirport": "SFO",
  "DestinationAirport": "NRT",
  "Date": "2024-03-15",
  "Source": "united",
  "Cabin": "J",
  "MileageCost": 70000,
  "TaxesCost": 56.5,
  "TaxesCurrency": "USD",
  "TotalDuration": 660,
  "RemainingSeats": 2,
  "BookingLink": "https://www.united.com/...",
  "Segments": [
    {
      "ID": "string",
      "TripID": "string",
      "SegmentIndex": 0,
      "FlightNumber": "UA837",
      "Aircraft": "777-300ER",
      "DepartureAirport": "SFO",
      "DepartureTime": "2024-03-15T11:30:00-07:00",
      "ArrivalAirport": "NRT",
      "ArrivalTime": "2024-03-16T15:30:00+09:00",
      "Duration": 660,
      "Cabin": "J",
      "BookingClass": "I",
      "OperatingCarrier": "UA",
      "MarketingCarrier": "UA"
    }
  ],
  "CreatedAt": "2024-02-01T12:00:00Z",
  "UpdatedAt": "2024-02-01T15:30:00Z"
}
```

#### Example Request

```bash
curl -X GET "https://seats.aero/partnerapi/trips/abc123def456" \
  -H "Partner-Authorization: Bearer YOUR_API_KEY"
```

---

## Reference Data

### Cabin Codes

| Code | Name            | Description                    |
| ---- | --------------- | ------------------------------ |
| `Y`  | Economy         | Standard economy class         |
| `W`  | Premium Economy | Premium economy / economy plus |
| `J`  | Business        | Business class                 |
| `F`  | First           | First class                    |

### Region Values

The following region strings are used for filtering:

- `North America`
- `South America`
- `Europe`
- `Africa`
- `Middle East`
- `Asia`
- `Oceania`

### Supported Mileage Programs (Sources)

| Program                      | API Name          |
| ---------------------------- | ----------------- |
| Air Canada Aeroplan          | `aeroplan`        |
| Alaska Airlines Mileage Plan | `alaska`          |
| American Airlines AAdvantage | `american`        |
| Aeromexico Club Premier      | `aeromexico`      |
| Azul TudoAzul                | `azul`            |
| Copa ConnectMiles            | `copa`            |
| Delta SkyMiles               | `delta`           |
| Emirates Skywards            | `emirates`        |
| Ethiopian ShebaMiles         | `ethiopian`       |
| Etihad Guest                 | `etihad`          |
| Finnair Plus                 | `finnair`         |
| Flying Blue (Air France/KLM) | `flyingblue`      |
| GOL Smiles                   | `gol`             |
| JetBlue TrueBlue             | `jetblue`         |
| Lufthansa Miles & More       | `lufthansa`       |
| Qantas Frequent Flyer        | `qantas`          |
| Qatar Privilege Club         | `qatar`           |
| SAS EuroBonus                | `sas`             |
| Saudia Alfursan              | `saudia`          |
| Singapore KrisFlyer          | `singapore`       |
| Turkish Miles&Smiles         | `turkish`         |
| United MileagePlus           | `united`          |
| Virgin Atlantic Flying Club  | `virginatlantic`  |
| Velocity Frequent Flyer      | `virginaustralia` |

### Date Format

All dates use ISO 8601 format: `YYYY-MM-DD`

Examples:

- `2024-03-15`
- `2024-12-25`

### Timestamps

All timestamps use ISO 8601 with timezone:

- `2024-03-15T11:30:00-07:00` (with offset)
- `2024-03-15T18:30:00Z` (UTC)

---

## Error Responses

### HTTP Status Codes

| Code | Description                               |
| ---- | ----------------------------------------- |
| 200  | Success                                   |
| 400  | Bad request - invalid parameters          |
| 401  | Unauthorized - invalid or missing API key |
| 404  | Not found - invalid availability ID       |
| 429  | Too many requests - rate limited          |
| 500  | Server error                              |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid cabin code. Must be one of: Y, W, J, F",
    "field": "cabin"
  }
}
```

### Common Error Codes

| Code                | Description                   |
| ------------------- | ----------------------------- |
| `INVALID_PARAMETER` | Parameter value is invalid    |
| `MISSING_PARAMETER` | Required parameter missing    |
| `INVALID_API_KEY`   | API key is invalid or expired |
| `RATE_LIMITED`      | Too many requests             |
| `NOT_FOUND`         | Resource not found            |

---

## Pagination

Results are paginated using cursor-based pagination.

### Response Fields

| Field     | Description                               |
| --------- | ----------------------------------------- |
| `count`   | Total number of matching results          |
| `hasMore` | Whether more results exist                |
| `cursor`  | Cursor for next page (if hasMore is true) |

### Usage

1. Make initial request without cursor
2. If `hasMore` is true, use returned `cursor` in next request
3. Repeat until `hasMore` is false

```bash
# First page
curl "https://seats.aero/partnerapi/search?origin_airport=SFO&destination_airport=NRT&take=100"

# Next page
curl "https://seats.aero/partnerapi/search?origin_airport=SFO&destination_airport=NRT&take=100&cursor=eyJpZCI6MTAwfQ=="
```

---

## Rate Limits

Rate limits vary by subscription plan. When rate limited, you'll receive a 429 status code.

### Headers

| Header                  | Description                      |
| ----------------------- | -------------------------------- |
| `X-RateLimit-Limit`     | Requests allowed per window      |
| `X-RateLimit-Remaining` | Requests remaining               |
| `X-RateLimit-Reset`     | Unix timestamp when limit resets |

### Best Practices

1. Cache results when possible
2. Use appropriate `take` values (don't over-fetch)
3. Implement exponential backoff on 429 errors
4. Check `ComputedLastSeen` for data freshness

---

## Data Freshness

The `ComputedLastSeen` field indicates when availability was last verified.

- Data is typically refreshed every few hours
- Some routes may be checked more frequently
- Availability can change rapidly, especially for premium cabins

### Recommendations

- Verify availability before booking
- Prefer results with recent `ComputedLastSeen` timestamps
- Be aware that displayed availability may no longer be bookable

---

## Example Workflows

### Find Business Class to Tokyo

```bash
# Search SFO to Tokyo (NRT and HND) for March 2024
curl -X GET "https://seats.aero/partnerapi/search?\
origin_airport=SFO&\
destination_airport=NRT,HND&\
cabin=J&\
start_date=2024-03-01&\
end_date=2024-03-31&\
only_direct=true" \
  -H "Partner-Authorization: Bearer YOUR_API_KEY"
```

### Explore United Availability from Europe

```bash
# Get all United J class availability originating from Europe
curl -X GET "https://seats.aero/partnerapi/availability?\
source=united&\
cabin=J&\
origin_region=Europe" \
  -H "Partner-Authorization: Bearer YOUR_API_KEY"
```

### Get Booking Details

```bash
# Get trip details for booking
curl -X GET "https://seats.aero/partnerapi/trips/abc123" \
  -H "Partner-Authorization: Bearer YOUR_API_KEY"
```
