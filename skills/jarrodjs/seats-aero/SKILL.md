---
name: seats-aero
description: Search award flight availability via seats.aero API. Triggers on: award flights, mileage bookings, points redemptions, finding business/first class availability, route availability searches.
---

# Seats.aero Award Flight Search

Search award flight availability across 24 mileage programs using the seats.aero partner API.

## Setup

Before searching, you need a seats.aero API key:

1. If the user hasn't provided an API key, prompt them:
   - "Please provide your seats.aero API key. You can get one at https://seats.aero/partner"
2. Store the key in conversation context for subsequent requests
3. All requests require the header: `Partner-Authorization: Bearer {api_key}`

## Core Capabilities

### 1. Search Routes (`/search`)

Search cached availability across all mileage programs for a specific origin-destination pair.

### 2. Bulk Availability (`/availability`)

Explore all availability from a single mileage program, optionally filtered by region.

### 3. Route Discovery (`/routes`)

Get all routes monitored for a specific mileage program.

### 4. Trip Details (`/trips/{id}`)

Get detailed flight segments and booking links for a specific availability.

## Quick Reference

| Item        | Value                                 |
| ----------- | ------------------------------------- |
| Base URL    | `https://seats.aero/partnerapi/`      |
| Auth Header | `Partner-Authorization: Bearer {key}` |
| Date Format | `YYYY-MM-DD`                          |

### Cabin Codes

- `Y` = Economy
- `W` = Premium Economy
- `J` = Business
- `F` = First

### Regions

North America, South America, Europe, Africa, Middle East, Asia, Oceania

## Supported Programs

```
aeroplan, alaska, american, aeromexico, azul, copa, delta, emirates,
ethiopian, etihad, finnair, flyingblue, gol, jetblue, lufthansa,
qantas, qatar, sas, saudia, singapore, turkish, united,
virginatlantic, virginaustralia
```

## Common Workflows

### Find availability on a specific route

**User**: "Find business class SFO to Tokyo next month"

1. Use `/search` endpoint with:
   - `origin_airport=SFO`
   - `destination_airport=NRT,HND` (both Tokyo airports)
   - `cabin=J`
   - `start_date` and `end_date` for the date range

### Explore program availability

**User**: "What United awards are available from Europe?"

1. Use `/availability` endpoint with:
   - `source=united`
   - `origin_region=Europe`

### Get booking details

**User**: "Show me details for that flight"

1. Use `/trips/{id}` with the availability ID from previous search
2. Response includes flight segments, times, and booking links

### Check what routes a program covers

**User**: "What routes does Aeroplan monitor?"

1. Use `/routes` endpoint with `source=aeroplan`

## API Parameters Quick Guide

### /search

| Parameter           | Required | Description                                  |
| ------------------- | -------- | -------------------------------------------- |
| origin_airport      | Yes      | 3-letter IATA code                           |
| destination_airport | Yes      | 3-letter IATA code(s), comma-separated       |
| cabin               | No       | Y, W, J, or F (comma-separated for multiple) |
| start_date          | No       | YYYY-MM-DD                                   |
| end_date            | No       | YYYY-MM-DD                                   |
| sources             | No       | Program name(s), comma-separated             |
| only_direct         | No       | true/false                                   |
| take                | No       | Results per page (default 100)               |
| cursor              | No       | Pagination cursor                            |

### /availability

| Parameter          | Required | Description                  |
| ------------------ | -------- | ---------------------------- |
| source             | Yes      | Single program name          |
| cabin              | No       | Single cabin code            |
| origin_region      | No       | Filter by origin region      |
| destination_region | No       | Filter by destination region |
| start_date         | No       | YYYY-MM-DD                   |
| end_date           | No       | YYYY-MM-DD                   |
| take               | No       | Results per page             |

## Script Usage

For complex or repeated searches, use the Python helper:

```python
from scripts.seats_api import search_availability, format_results

results = search_availability(
    api_key="your_key",
    origin="SFO",
    destination="NRT",
    start_date="2024-03-01",
    end_date="2024-03-31",
    cabins="J,F"
)
print(format_results(results["data"], cabin="J"))
```

See `scripts/seats_api.py` for full API client implementation.

## Response Handling

### Availability Object Fields

- `ID` - Use for `/trips/{id}` lookup
- `Route` - Origin-Destination pair
- `Date` - Flight date
- `YAvailable`, `WAvailable`, `JAvailable`, `FAvailable` - Boolean availability
- `YMileageCost`, etc. - Points required per cabin
- `YDirects`, etc. - Number of direct flights available
- `Source` - Program name
- `ComputedLastSeen` - Data freshness timestamp

### Error Handling

- 401: Invalid or missing API key
- 429: Rate limited, wait and retry
- 404: No results or invalid availability ID

## Tips

1. **Date ranges**: Keep to 30-60 days for faster results
2. **Multiple cabins**: Search J,F together for premium options
3. **Direct flights**: Use `only_direct=true` to filter connections
4. **Pagination**: Use `cursor` from response for more results
5. **Data freshness**: Check `ComputedLastSeen` - older data may be stale

## Reference Documentation

For complete API specification including all fields and response schemas, see `references/api-spec.md`.
