#!/usr/bin/env python3
"""seats.aero API client for OpenClaw skill.

A Python helper module for searching award flight availability
via the seats.aero partner API.

Usage:
    from seats_api import search_availability, format_results

    results = search_availability(
        api_key="your_key",
        origin="SFO",
        destination="NRT",
        start_date="2024-03-01",
        end_date="2024-03-31",
        cabins="J"
    )
    print(format_results(results["data"]))
"""

import requests
from typing import Optional
from datetime import datetime

BASE_URL = "https://seats.aero/partnerapi"

VALID_CABINS = {"Y", "W", "J", "F"}
VALID_SOURCES = {
    "aeroplan", "alaska", "american", "aeromexico", "azul", "copa",
    "delta", "emirates", "ethiopian", "etihad", "finnair", "flyingblue",
    "gol", "jetblue", "lufthansa", "qantas", "qatar", "sas", "saudia",
    "singapore", "turkish", "united", "virginatlantic", "virginaustralia"
}
VALID_REGIONS = {
    "North America", "South America", "Europe", "Africa",
    "Middle East", "Asia", "Oceania"
}


def _get_headers(api_key: str) -> dict:
    """Build request headers with authorization."""
    return {
        "Partner-Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }


def _make_request(api_key: str, endpoint: str, params: dict = None) -> dict:
    """Make API request with error handling."""
    url = f"{BASE_URL}/{endpoint}"
    headers = _get_headers(api_key)

    response = requests.get(url, headers=headers, params=params, timeout=30)

    if response.status_code == 401:
        raise ValueError("Invalid or missing API key")
    elif response.status_code == 429:
        raise RuntimeError("Rate limited - please wait and retry")
    elif response.status_code == 404:
        return {"data": [], "count": 0}

    response.raise_for_status()
    return response.json()


def search_availability(
    api_key: str,
    origin: str,
    destination: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cabins: Optional[str] = None,
    sources: Optional[str] = None,
    only_direct: bool = False,
    take: int = 100,
    cursor: Optional[str] = None
) -> dict:
    """Search cached availability across programs.

    Args:
        api_key: seats.aero partner API key
        origin: 3-letter IATA airport code
        destination: 3-letter IATA code(s), comma-separated
        start_date: Start date YYYY-MM-DD
        end_date: End date YYYY-MM-DD
        cabins: Cabin codes (Y/W/J/F), comma-separated
        sources: Program names, comma-separated
        only_direct: Only return direct flights
        take: Results per page (max 1000)
        cursor: Pagination cursor from previous response

    Returns:
        dict with 'data' (list of availability), 'count', 'cursor'
    """
    params = {
        "origin_airport": origin.upper(),
        "destination_airport": destination.upper(),
        "take": min(take, 1000)
    }

    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    if cabins:
        params["cabin"] = cabins.upper()
    if sources:
        params["source"] = sources.lower()
    if only_direct:
        params["only_direct"] = "true"
    if cursor:
        params["cursor"] = cursor

    return _make_request(api_key, "search", params)


def bulk_availability(
    api_key: str,
    source: str,
    cabin: Optional[str] = None,
    origin_region: Optional[str] = None,
    destination_region: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    take: int = 100,
    cursor: Optional[str] = None
) -> dict:
    """Get bulk availability from single program.

    Args:
        api_key: seats.aero partner API key
        source: Program name (e.g., 'united', 'aeroplan')
        cabin: Single cabin code (Y/W/J/F)
        origin_region: Filter by origin region
        destination_region: Filter by destination region
        start_date: Start date YYYY-MM-DD
        end_date: End date YYYY-MM-DD
        take: Results per page
        cursor: Pagination cursor

    Returns:
        dict with 'data' (list of availability), 'count', 'cursor'
    """
    if source.lower() not in VALID_SOURCES:
        raise ValueError(f"Invalid source. Must be one of: {', '.join(sorted(VALID_SOURCES))}")

    params = {
        "source": source.lower(),
        "take": min(take, 1000)
    }

    if cabin:
        if cabin.upper() not in VALID_CABINS:
            raise ValueError(f"Invalid cabin. Must be one of: {', '.join(VALID_CABINS)}")
        params["cabin"] = cabin.upper()
    if origin_region:
        params["origin_region"] = origin_region
    if destination_region:
        params["destination_region"] = destination_region
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    if cursor:
        params["cursor"] = cursor

    return _make_request(api_key, "availability", params)


def get_routes(api_key: str, source: str) -> list:
    """Get all routes for a mileage program.

    Args:
        api_key: seats.aero partner API key
        source: Program name (e.g., 'united', 'aeroplan')

    Returns:
        list of route objects with origin/destination info
    """
    if source.lower() not in VALID_SOURCES:
        raise ValueError(f"Invalid source. Must be one of: {', '.join(sorted(VALID_SOURCES))}")

    params = {"source": source.lower()}
    result = _make_request(api_key, "routes", params)
    return result.get("data", [])


def get_trip_details(api_key: str, availability_id: str) -> dict:
    """Get flight-level details for an availability ID.

    Args:
        api_key: seats.aero partner API key
        availability_id: ID from availability search result

    Returns:
        dict with trip details including segments and booking links
    """
    return _make_request(api_key, f"trips/{availability_id}")


def format_results(data: list, cabin: str = "J", max_results: int = 20) -> str:
    """Format availability results for display.

    Args:
        data: List of availability objects from search
        cabin: Cabin to highlight (Y/W/J/F)
        max_results: Maximum results to display

    Returns:
        Formatted string for display
    """
    if not data:
        return "No availability found."

    cabin = cabin.upper()
    avail_key = f"{cabin}Available"
    miles_key = f"{cabin}MileageCost"
    direct_key = f"{cabin}Directs"

    # Filter to available results
    available = [r for r in data if r.get(avail_key)]

    if not available:
        return f"No {cabin} class availability found in results."

    lines = [f"Found {len(available)} results with {cabin} availability:\n"]
    lines.append(f"{'Date':<12} {'Route':<10} {'Miles':>10} {'Direct':>7} {'Source':<15}")
    lines.append("-" * 60)

    for result in available[:max_results]:
        date = result.get("Date", "")[:10]
        route = f"{result.get('OriginAirport', '???')}-{result.get('DestinationAirport', '???')}"
        miles = result.get(miles_key, "N/A")
        if isinstance(miles, (int, float)):
            miles = f"{miles:,.0f}"
        directs = result.get(direct_key, 0)
        direct_str = f"{directs}" if directs else "-"
        source = result.get("Source", "unknown")

        lines.append(f"{date:<12} {route:<10} {miles:>10} {direct_str:>7} {source:<15}")

    if len(available) > max_results:
        lines.append(f"\n... and {len(available) - max_results} more results")

    return "\n".join(lines)


def format_trip_details(trip: dict) -> str:
    """Format trip details for display.

    Args:
        trip: Trip details from get_trip_details()

    Returns:
        Formatted string with segment information
    """
    if not trip:
        return "No trip details found."

    lines = []

    # Basic info
    lines.append(f"Route: {trip.get('OriginAirport', '?')} → {trip.get('DestinationAirport', '?')}")
    lines.append(f"Date: {trip.get('Date', 'Unknown')}")
    lines.append(f"Source: {trip.get('Source', 'Unknown')}")
    lines.append("")

    # Segments
    segments = trip.get("Segments", [])
    if segments:
        lines.append("Flight Segments:")
        for i, seg in enumerate(segments, 1):
            dep = seg.get("DepartureAirport", "?")
            arr = seg.get("ArrivalAirport", "?")
            flight = seg.get("FlightNumber", "?")
            dep_time = seg.get("DepartureTime", "")[:16] if seg.get("DepartureTime") else "?"
            arr_time = seg.get("ArrivalTime", "")[:16] if seg.get("ArrivalTime") else "?"
            aircraft = seg.get("Aircraft", "")

            lines.append(f"  {i}. {flight}: {dep} → {arr}")
            lines.append(f"     Depart: {dep_time} | Arrive: {arr_time}")
            if aircraft:
                lines.append(f"     Aircraft: {aircraft}")

    # Booking link
    booking_link = trip.get("BookingLink")
    if booking_link:
        lines.append(f"\nBooking: {booking_link}")

    return "\n".join(lines)


if __name__ == "__main__":
    # Example usage / test
    import sys

    print("seats.aero API Client")
    print("=" * 40)
    print(f"Base URL: {BASE_URL}")
    print(f"Supported programs: {len(VALID_SOURCES)}")
    print(f"Valid cabins: {', '.join(sorted(VALID_CABINS))}")
    print()
    print("Functions available:")
    print("  - search_availability()")
    print("  - bulk_availability()")
    print("  - get_routes()")
    print("  - get_trip_details()")
    print("  - format_results()")
    print("  - format_trip_details()")
    print()
    print("To test with an API key:")
    print("  python -c \"from seats_api import *; print(search_availability('YOUR_KEY', 'SFO', 'NRT'))\"")
