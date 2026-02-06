---
name: pcmiler
description: |
  PCMier REST API provides methods to retrieves a series of geographic coordinates that make up a route.
compatibility: Requires network access and valid PCMiler API key
metadata:
  author: nirjhar
  version: '1.0'
---

# PCMiler

Access the PCMiler REST API with API authentication. Manage truck routing needs.

## Quick Start

```bash
# Show route report
curl -s -X GET "https://pcmiler.alk.com/apis/rest/v1.0/Service.svc/route/routeReports?stops=-75.173297%2C39.942892%3B-74.83153%2C39.61703%3B-74.438942%2C39.362469&reports=RoutePath" -H "Authorization: $PCMILER_API_KEY"

Example JSON Response
[
    {
        "__type": "RoutePathReport:http://pcmiler.alk.com/APIs/v1.0",
        "RouteID": null,
        "type": "Feature",
        "geometry": {
            "type": "MultiLineString",
            "coordinates": [
                [
                    [
                        -75.173297,
                        39.942892
                    ],
                    [
                        -74.439742,
                        39.362342
                    ]
                ]
            ]
        },
        "TMinutes": 102,
        "TDistance": 74.411,
        "properties": null
    }
]
```

```bash
# Geocode an address to fir lat/lon
curl -s -X GET "https://pcmiler.alk.com/apis/rest/v1.0/Service.svc/locations?street=1%20Independence%20Way&city=princeton&state=nj&country=US&postcode=08540&postcodeFilter=us&region=NA&dataset=Current" -H "Authorization: $PCMILER_API_KEY"

Example JSON Response
[
    {
        "Address": {
            "StreetAddress": "1 Independence Way",
            "City": "Princeton",
            "State": "NJ",
            "Zip": "08540",
            "County": "Mercer",
            "Country": "United States",
            "SPLC": null,
            "CountryPostalFilter": 0,
            "AbbreviationFormat": 0,
            "StateName": "New Jersey",
            "StateAbbreviation": "NJ",
            "CountryAbbreviation": "US"
        },
        "Coords": {
            "Lat": "40.360639",
            "Lon": "-74.599867"
        },
        "Region": 4,
        "Label": "",
        "PlaceName": "",
        "TimeZone": "EST",
        "Errors": [],
        "SpeedLimitInfo": null,
        "ConfidenceLevel": "Exact",
        "DistanceFromRoad": null,
        "CrossStreet": null,
        "TimeZoneOffset": "GMT-5:00",
        "TimeZoneAbbreviation": "EST",
        "IsDST": false
    }
]
```

## Setup

Requires environment variable

- `PCMILER_API_KEY` - PCMiler API Key
