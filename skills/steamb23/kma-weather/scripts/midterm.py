#!/usr/bin/env python3
"""
KMA Mid-term Forecast

Retrieves mid-term weather forecasts (3-10 days) from Korea Meteorological Administration.

Released at 06:00 and 18:00 (KST).

Requires KMA_SERVICE_KEY environment variable.
"""

import sys
import json
import argparse
from datetime import datetime, timedelta
from typing import Dict

# Import local modules
try:
    from kma_api import fetch_api, print_error
except ImportError:
    # Try relative import if run as script
    import os
    sys.path.insert(0, os.path.dirname(__file__))
    from kma_api import fetch_api, print_error


# API Configuration
BASE_URL = "https://apis.data.go.kr/1360000/MidFcstInfoService"
ENDPOINT = "/getMidFcst"


# Station ID mapping for getMidFcst API (from official KMA documentation)
# Uses stnId parameter (not regId)
# Returns plain text forecast (wfSv field) for LLM interpretation
STATION_CODES = {
    "전국": "108",      # 전국 (National overview)
    "서울": "109",      # 서울, 인천, 경기도
    "경기": "109",      # 서울, 인천, 경기도
    "인천": "109",      # 서울, 인천, 경기도
    "강원": "105",      # 강원도
    "충북": "131",      # 충청북도
    "충남": "133",      # 대전, 세종, 충청남도
    "대전": "133",      # 대전, 세종, 충청남도
    "세종": "133",      # 대전, 세종, 충청남도
    "전북": "146",      # 전북자치도
    "광주": "156",      # 광주, 전라남도
    "전남": "156",      # 광주, 전라남도
    "대구": "143",      # 대구, 경상북도
    "경북": "143",      # 대구, 경상북도
    "부산": "159",      # 부산, 울산, 경상남도
    "울산": "159",      # 부산, 울산, 경상남도
    "경남": "159",      # 부산, 울산, 경상남도
    "제주": "184",      # 제주도
}


def get_midterm_time() -> str:
    """
    Calculate tmFc (release time) for mid-term forecast API.

    Mid-term forecasts are released at 06:00 and 18:00 KST.

    Returns:
        str: tmFc in format YYYYMMDDHHmm

    Example:
        >>> get_midterm_time()
        '202602010600'
    """
    now = datetime.now()

    # Determine which release time to use
    if now.hour < 6:
        # Use yesterday's 18:00
        release_time = now - timedelta(days=1)
        release_hour = 18
    elif now.hour < 18:
        # Use today's 06:00
        release_time = now
        release_hour = 6
    else:
        # Use today's 18:00
        release_time = now
        release_hour = 18

    tm_fc = release_time.strftime(f"%Y%m%d{release_hour:02d}00")
    return tm_fc


def fetch_midterm_forecast(stn_id: str, tm_fc: str = None) -> Dict:
    """
    Fetch mid-term forecast from KMA API.

    Args:
        stn_id: Station ID (e.g., "109" for Seoul·Gyeonggi)
        tm_fc: Release time in YYYYMMDDHHmm format (optional, auto-calculated)

    Returns:
        dict: API response data

    Raises:
        Exception: On API errors
    """
    if tm_fc is None:
        tm_fc = get_midterm_time()

    url = f"{BASE_URL}{ENDPOINT}"

    params = {
        "numOfRows": "10",
        "pageNo": "1",
        "dataType": "JSON",
        "stnId": stn_id,  # Changed from regId to stnId
        "tmFc": tm_fc,
    }

    return fetch_api(url, params)


def format_midterm(data: Dict) -> str:
    """
    Format mid-term forecast data from plain text response.

    Args:
        data: API response data

    Returns:
        str: Formatted text output (plain text from wfSv field)
    """
    try:
        items = data["response"]["body"]["items"]["item"]
    except (KeyError, TypeError):
        return "Error: Invalid API response format"

    if not items:
        return "No data available"

    # Mid-term forecast returns a single item with wfSv (plain text) field
    if isinstance(items, dict):
        item = items
    elif isinstance(items, list):
        item = items[0]
    else:
        return "Error: Unexpected data format"

    # Build output
    output = []
    output.append("📅 중기예보")

    # Release time
    if "tmFc" in item:
        tm_fc = item["tmFc"]
        tm_formatted = f"{tm_fc[:4]}-{tm_fc[4:6]}-{tm_fc[6:8]} {tm_fc[8:10]}:{tm_fc[10:12]}"
        output.append(f"발표시각: {tm_formatted}")
    output.append("")

    # Plain text forecast from wfSv field
    if "wfSv" in item:
        output.append(item["wfSv"])
    else:
        output.append("Error: No forecast text (wfSv) in response")

    return "\n".join(output)


def main():
    """Main entry point for midterm forecast script."""
    parser = argparse.ArgumentParser(
        description="Get mid-term forecast (3-10 days) from Korea Meteorological Administration"
    )

    # Region selection
    region_group = parser.add_mutually_exclusive_group(required=False)
    region_group.add_argument(
        "--region",
        choices=list(STATION_CODES.keys()),
        help="Region name (Korean)"
    )
    region_group.add_argument(
        "--stn-id",
        help="Station ID (e.g., 109 for Seoul·Gyeonggi)"
    )

    # Time
    parser.add_argument(
        "--tm-fc",
        help="Release time in YYYYMMDDHHmm format (optional, auto-calculated)"
    )

    # Output options
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON response"
    )

    # List regions
    parser.add_argument(
        "--list-regions",
        action="store_true",
        help="List all available regions and exit"
    )

    args = parser.parse_args()

    # List regions
    if args.list_regions:
        print("Available Regions:")
        print("=" * 50)
        for name, code in sorted(STATION_CODES.items()):
            print(f"  {name:10s} → {code}")
        sys.exit(0)

    # Determine station ID
    if not args.region and not args.stn_id:
        parser.error("one of the arguments --region --stn-id is required")

    if args.region:
        stn_id = STATION_CODES[args.region]
    else:
        stn_id = args.stn_id

    try:
        # Fetch mid-term forecast
        data = fetch_midterm_forecast(stn_id, args.tm_fc)

        if args.json:
            # Output raw JSON
            print(json.dumps(data, ensure_ascii=False, indent=2))
        else:
            # Format and output text
            output = format_midterm(data)
            print(output)

    except Exception as e:
        print_error(str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
