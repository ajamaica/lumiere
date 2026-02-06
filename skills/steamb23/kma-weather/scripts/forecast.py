#!/usr/bin/env python3
"""
KMA Short-term Forecast

Retrieves short-term weather forecasts from Korea Meteorological Administration:
- current: Ultra-short-term observation (current weather)
- ultrashort: Ultra-short-term forecast (6 hours)
- shortterm: Short-term forecast (3 days)

Requires KMA_SERVICE_KEY environment variable.
"""

import sys
import json
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

# Import local modules
try:
    from grid_converter import latlon_to_grid
    from kma_api import fetch_api, print_error
except ImportError:
    # Try relative import if run as script
    import os
    sys.path.insert(0, os.path.dirname(__file__))
    from grid_converter import latlon_to_grid
    from kma_api import fetch_api, print_error


# API Configuration
BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
ENDPOINTS = {
    "current": "/getUltraSrtNcst",      # Ultra-short-term observation
    "ultrashort": "/getUltraSrtFcst",   # Ultra-short-term forecast
    "shortterm": "/getVilageFcst",      # Short-term forecast
}


def get_base_time(forecast_type: str) -> Tuple[str, str]:
    """
    Calculate base_date and base_time for API request.

    KMA API release schedules:
    - current: Every hour at :40 (base_time: HH00)
    - ultrashort: Every hour at :45 (base_time: HH30)
    - shortterm: 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10

    Args:
        forecast_type: One of "current", "ultrashort", "shortterm"

    Returns:
        tuple: (base_date, base_time) as strings (YYYYMMDD, HHmm)

    Example:
        >>> get_base_time("current")
        ('20260201', '1400')
    """
    now = datetime.now()

    if forecast_type == "current":
        # Released every hour at :40 (base_time: HH00)
        # If current time is before :40, use previous hour
        if now.minute < 40:
            now = now - timedelta(hours=1)

        base_date = now.strftime("%Y%m%d")
        base_time = now.strftime("%H00")

    elif forecast_type == "ultrashort":
        # Released every hour at :45 (base_time: HH30)
        # If current time is before :45, use previous hour's 30
        if now.minute < 45:
            now = now - timedelta(hours=1)

        base_date = now.strftime("%Y%m%d")
        base_time = now.strftime("%H30")

    elif forecast_type == "shortterm":
        # Released at 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10
        base_times = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"]

        # Find the most recent base time
        current_hour = now.hour
        current_minute = now.minute

        # Determine which base_time to use
        if current_hour < 2 or (current_hour == 2 and current_minute < 10):
            # Use yesterday's 23:00
            now = now - timedelta(days=1)
            base_time = "2300"
        else:
            # Find the latest base_time before current time
            for i in range(len(base_times) - 1, -1, -1):
                bt_hour = int(base_times[i][:2])
                if current_hour > bt_hour or (current_hour == bt_hour and current_minute >= 10):
                    base_time = base_times[i]
                    break

        base_date = now.strftime("%Y%m%d")

    else:
        raise ValueError(f"Invalid forecast_type: {forecast_type}")

    return base_date, base_time


def fetch_forecast(
    forecast_type: str,
    lat: float,
    lon: float,
    num_rows: int = 300
) -> Dict:
    """
    Fetch weather forecast from KMA API with automatic pagination.

    Args:
        forecast_type: One of "current", "ultrashort", "shortterm"
        lat: Latitude in decimal degrees
        lon: Longitude in decimal degrees
        num_rows: Rows per page (default: 300)

    Returns:
        dict: API response data with all items merged

    Raises:
        Exception: On API errors
    """
    # Convert lat/lon to grid coordinates
    nx, ny = latlon_to_grid(lat, lon)

    # Get base time
    base_date, base_time = get_base_time(forecast_type)

    # Build API URL
    url = f"{BASE_URL}{ENDPOINTS[forecast_type]}"

    params = {
        "numOfRows": str(num_rows),
        "pageNo": "1",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": str(nx),
        "ny": str(ny),
    }

    # First request
    data = fetch_api(url, params)

    # Check if pagination needed
    try:
        body = data["response"]["body"]
        total_count = int(body.get("totalCount", 0))
        items = body.get("items", {}).get("item", [])

        # If we got all items, return as-is
        if total_count <= num_rows:
            return data

        # Fetch remaining pages
        all_items = items if isinstance(items, list) else [items]
        total_pages = (total_count + num_rows - 1) // num_rows

        for page in range(2, total_pages + 1):
            params["pageNo"] = str(page)
            page_data = fetch_api(url, params)
            page_items = page_data["response"]["body"]["items"].get("item", [])
            if isinstance(page_items, list):
                all_items.extend(page_items)
            else:
                all_items.append(page_items)

        # Update response with merged items
        data["response"]["body"]["items"]["item"] = all_items
        return data

    except (KeyError, TypeError):
        return data


def format_current(data: Dict) -> str:
    """
    Format ultra-short-term observation data (current weather).

    Args:
        data: API response data

    Returns:
        str: Formatted text output
    """
    try:
        items = data["response"]["body"]["items"]["item"]
    except (KeyError, TypeError):
        return "Error: Invalid API response format"

    if not items:
        return "No data available"

    # Parse category values
    values = {}
    for item in items:
        category = item.get("category")
        obsrValue = item.get("obsrValue", "N/A")
        values[category] = obsrValue

    # Build output
    output = []
    output.append("🌤️ 현재 날씨 (초단기실황)")

    # Temperature
    if "T1H" in values:
        output.append(f"🌡️  기온: {values['T1H']}°C")

    # Humidity
    if "REH" in values:
        output.append(f"💧 습도: {values['REH']}%")

    # Precipitation (1 hour)
    if "RN1" in values:
        rn1 = values['RN1']
        if rn1 == "0" or rn1 == "강수없음":
            output.append("🌧️  강수량: 0mm (1시간)")
        else:
            output.append(f"🌧️  강수량: {rn1}mm (1시간)")

    # Wind speed
    if "WSD" in values:
        output.append(f"💨 풍속: {values['WSD']}m/s")

    # Wind direction
    if "VEC" in values:
        vec = values['VEC']
        direction = get_wind_direction(vec)
        output.append(f"🧭 풍향: {direction} ({vec}°)")

    # Atmospheric pressure
    if "PTY" in values:
        pty = values['PTY']
        pty_text = get_precipitation_type(pty)
        if pty != "0":
            output.append(f"☔ 강수형태: {pty_text}")

    return "\n".join(output)


def get_wind_direction(degree: str) -> str:
    """
    Convert wind direction in degrees to cardinal direction.

    Args:
        degree: Wind direction in degrees (0-360)

    Returns:
        str: Cardinal direction (N, NE, E, SE, S, SW, W, NW)
    """
    try:
        deg = float(degree)
    except (ValueError, TypeError):
        return "N/A"

    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    index = int((deg + 22.5) / 45) % 8
    return directions[index]


def get_precipitation_type(pty_code: str) -> str:
    """
    Convert PTY code to precipitation type text.

    Args:
        pty_code: PTY code (0-4)

    Returns:
        str: Precipitation type
    """
    pty_map = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    return pty_map.get(pty_code, "알 수 없음")


def get_sky_condition(sky_code: str) -> str:
    """
    Convert SKY code to sky condition text.

    Args:
        sky_code: SKY code (1-4)

    Returns:
        str: Sky condition
    """
    sky_map = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    return sky_map.get(sky_code, "알 수 없음")


def format_ultrashort(data: Dict) -> str:
    """
    Format ultra-short-term forecast data (6 hours).

    Args:
        data: API response data

    Returns:
        str: Formatted text output
    """
    try:
        items = data["response"]["body"]["items"]["item"]
    except (KeyError, TypeError):
        return "Error: Invalid API response format"

    if not items:
        return "No data available"

    # Group by forecast date and time
    forecasts = {}
    for item in items:
        fcst_date = item.get("fcstDate", "")
        fcst_time = item.get("fcstTime", "")
        category = item.get("category")
        fcst_value = item.get("fcstValue", "N/A")

        key = f"{fcst_date}_{fcst_time}"
        if key not in forecasts:
            forecasts[key] = {"date": fcst_date, "time": fcst_time}
        forecasts[key][category] = fcst_value

    # Build output
    output = []
    output.append("⏱️ 초단기예보 (6시간)")

    for key in sorted(forecasts.keys())[:6]:  # Show up to 6 hours
        fc = forecasts[key]
        time_str = f"{fc['time'][:2]}:{fc['time'][2:]}"

        output.append(f"\n⏰ {time_str}")

        # Temperature
        if "T1H" in fc:
            output.append(f"  🌡️  {fc['T1H']}°C")

        # Sky condition
        if "SKY" in fc:
            sky_text = get_sky_condition(fc["SKY"])
            output.append(f"  ☁️  {sky_text}")

        # Precipitation type
        if "PTY" in fc and fc["PTY"] != "0":
            pty_text = get_precipitation_type(fc["PTY"])
            output.append(f"  ☔ {pty_text}")

        # Precipitation amount
        if "RN1" in fc:
            rn1 = fc["RN1"]
            if rn1 not in ["0", "강수없음"]:
                output.append(f"  🌧️  강수량: {rn1}mm")

        # Humidity
        if "REH" in fc:
            output.append(f"  💧 습도: {fc['REH']}%")

    return "\n".join(output)


def format_shortterm(data: Dict, days=1) -> str:
    """
    Format short-term forecast data (3 days).

    Args:
        data: API response data
        days: Days from today ('all'=all days, 1=tomorrow, 2=day after, 3=3 days later)

    Returns:
        str: Formatted text output
    """
    try:
        items = data["response"]["body"]["items"]["item"]
    except (KeyError, TypeError):
        return "Error: Invalid API response format"

    if not items:
        return "No data available"

    # Group by date and time
    forecasts = {}
    for item in items:
        fcst_date = item.get("fcstDate")
        fcst_time = item.get("fcstTime")
        category = item.get("category")
        fcst_value = item.get("fcstValue", "N/A")

        key = f"{fcst_date}_{fcst_time}"
        if key not in forecasts:
            forecasts[key] = {"date": fcst_date, "time": fcst_time}
        forecasts[key][category] = fcst_value

    # Filter by target date(s)
    if days == "all":
        # Show all available dates
        filtered_keys = sorted(forecasts.keys())
        output = []
        output.append("📆 단기예보 (전체)")
    else:
        # Calculate target date for filtering
        target_date = (datetime.now() + timedelta(days=int(days))).strftime("%Y%m%d")
        filtered_keys = [k for k in sorted(forecasts.keys()) if forecasts[k]["date"] == target_date]

        day_label = {1: "내일", 2: "모레", 3: "글피"}.get(int(days), f"{days}일 후")
        date_formatted = f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:8]}"
        output = []
        output.append(f"📆 단기예보 ({day_label}, {date_formatted})")

    if not filtered_keys:
        output.append("\n해당 날짜의 예보 데이터가 없습니다.")
        return "\n".join(output)

    # Group forecasts by date when showing all days
    if days == "all":
        current_date = None
        for key in filtered_keys:
            fc = forecasts[key]
            date = fc["date"]
            time = fc["time"]

            # Add date header if date changes
            if date != current_date:
                current_date = date
                date_formatted = f"{date[:4]}-{date[4:6]}-{date[6:8]}"
                # Calculate days from now
                date_obj = datetime.strptime(date, "%Y%m%d")
                now_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                days_diff = (date_obj - now_date).days
                if days_diff == 0:
                    day_label = "오늘"
                elif days_diff == 1:
                    day_label = "내일"
                elif days_diff == 2:
                    day_label = "모레"
                elif days_diff == 3:
                    day_label = "글피"
                else:
                    day_label = f"{days_diff}일 후"
                output.append(f"\n📅 {date_formatted} ({day_label})")

            time_str = f"{time[:2]}:{time[2:]}"
            output.append(f"\n⏰ {time_str}")

            # Temperature (use TMP for short-term)
            if "TMP" in fc:
                output.append(f"  🌡️  {fc['TMP']}°C")

            # Sky condition
            if "SKY" in fc:
                sky_text = get_sky_condition(fc["SKY"])
                output.append(f"  ☁️  {sky_text}")

            # Precipitation type
            if "PTY" in fc and fc["PTY"] != "0":
                pty_text = get_precipitation_type(fc["PTY"])
                output.append(f"  ☔ {pty_text}")

            # Precipitation probability
            if "POP" in fc:
                output.append(f"  🌧️  강수확률: {fc['POP']}%")

            # Precipitation amount (6 hours)
            if "PCP" in fc:
                pcp = fc["PCP"]
                if pcp not in ["강수없음", "0"]:
                    output.append(f"  💧 강수량: {pcp}")
    else:
        # Single day view (existing logic)
        for key in filtered_keys:
            fc = forecasts[key]
            time = fc["time"]

            time_str = f"{time[:2]}:{time[2:]}"
            output.append(f"\n⏰ {time_str}")

            # Temperature (use TMP for short-term)
            if "TMP" in fc:
                output.append(f"  🌡️  {fc['TMP']}°C")

            # Sky condition
            if "SKY" in fc:
                sky_text = get_sky_condition(fc["SKY"])
                output.append(f"  ☁️  {sky_text}")

            # Precipitation type
            if "PTY" in fc and fc["PTY"] != "0":
                pty_text = get_precipitation_type(fc["PTY"])
                output.append(f"  ☔ {pty_text}")

            # Precipitation probability
            if "POP" in fc:
                output.append(f"  🌧️  강수확률: {fc['POP']}%")

            # Precipitation amount (6 hours)
            if "PCP" in fc:
                pcp = fc["PCP"]
                if pcp not in ["강수없음", "0"]:
                    output.append(f"  💧 강수량: {pcp}")

    return "\n".join(output)


def main():
    """Main entry point for forecast script."""
    parser = argparse.ArgumentParser(
        description="Get weather forecast from Korea Meteorological Administration"
    )

    # Subcommand
    parser.add_argument(
        "type",
        choices=["current", "ultrashort", "shortterm", "brief", "all"],
        help="Forecast type: current (현재), ultrashort (6시간), shortterm (3일), brief (현재+6시간), all (전체)"
    )

    # Location
    parser.add_argument(
        "--lat",
        type=float,
        required=True,
        help="Latitude in decimal degrees (e.g., 37.5665)"
    )
    parser.add_argument(
        "--lon",
        type=float,
        required=True,
        help="Longitude in decimal degrees (e.g., 126.9780)"
    )

    # Output options
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON response"
    )
    parser.add_argument(
        "--rows",
        type=int,
        default=300,
        help="Rows per API page (default: 300, auto-paginates if needed)"
    )
    parser.add_argument(
        "--days",
        default="1",
        help="Days from today for shortterm forecast ('all'=all available days, 1=tomorrow, 2=day after, 3=3 days later)"
    )

    args = parser.parse_args()

    # Validate --days argument
    if args.days != "all":
        try:
            days_int = int(args.days)
            if days_int < 1:
                print_error("--days must be 'all' or a positive integer")
                sys.exit(1)
        except ValueError:
            print_error("--days must be 'all' or a positive integer")
            sys.exit(1)

    try:
        if args.type == "all":
            # Fetch all forecast types
            results = {}
            for ftype in ["current", "ultrashort", "shortterm"]:
                results[ftype] = fetch_forecast(ftype, args.lat, args.lon, args.rows)

            if args.json:
                print(json.dumps(results, ensure_ascii=False, indent=2))
            else:
                outputs = []
                outputs.append(format_current(results["current"]))
                outputs.append("")
                outputs.append(format_ultrashort(results["ultrashort"]))
                outputs.append("")
                outputs.append(format_shortterm(results["shortterm"], args.days))
                print("\n".join(outputs))

        elif args.type == "brief":
            # Fetch current + ultrashort
            results = {}
            for ftype in ["current", "ultrashort"]:
                results[ftype] = fetch_forecast(ftype, args.lat, args.lon, args.rows)

            if args.json:
                print(json.dumps(results, ensure_ascii=False, indent=2))
            else:
                outputs = []
                outputs.append(format_current(results["current"]))
                outputs.append("")
                outputs.append(format_ultrashort(results["ultrashort"]))
                print("\n".join(outputs))
        else:
            # Fetch single forecast type
            data = fetch_forecast(args.type, args.lat, args.lon, args.rows)

            if args.json:
                print(json.dumps(data, ensure_ascii=False, indent=2))
            else:
                if args.type == "current":
                    output = format_current(data)
                elif args.type == "ultrashort":
                    output = format_ultrashort(data)
                elif args.type == "shortterm":
                    output = format_shortterm(data, args.days)
                else:
                    output = "Unknown forecast type"
                print(output)

    except Exception as e:
        print_error(str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
