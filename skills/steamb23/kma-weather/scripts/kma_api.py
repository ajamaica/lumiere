#!/usr/bin/env python3
"""
KMA (Korea Meteorological Administration) API Common Utilities

Provides shared functionality for all KMA API scripts:
- API key management via environment variables
- HTTP request handling with error handling
- Response validation

Used by forecast.py, warnings.py, and midterm.py
"""

import os
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Optional


def get_service_key() -> str:
    """
    Load and validate KMA API service key from environment variable.

    Returns:
        str: The API service key

    Raises:
        ValueError: If KMA_SERVICE_KEY environment variable is not set

    Example:
        >>> service_key = get_service_key()
    """
    service_key = os.environ.get("KMA_SERVICE_KEY")
    if not service_key:
        raise ValueError(
            "KMA API service key not found. "
            "Set KMA_SERVICE_KEY environment variable.\n"
            "Get your key at: https://www.data.go.kr"
        )
    return service_key


def fetch_api(
    url: str,
    params: Dict[str, str],
    service_key: Optional[str] = None
) -> Dict:
    """
    Generic API request handler for KMA APIs.

    Automatically adds serviceKey to parameters, handles HTTP requests,
    and validates API responses.

    Args:
        url: Full API endpoint URL
        params: Query parameters (serviceKey will be added automatically)
        service_key: Optional API key (defaults to environment variable)

    Returns:
        dict: Parsed JSON response from API

    Raises:
        Exception: On API errors or HTTP errors

    Example:
        >>> data = fetch_api(
        ...     "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst",
        ...     {"base_date": "20260201", "base_time": "0600", "nx": "60", "ny": "127"}
        ... )
    """
    # Add service key to parameters
    params["serviceKey"] = service_key or get_service_key()

    # Build full URL with query parameters
    full_url = f"{url}?{urllib.parse.urlencode(params)}"

    # Make HTTP request
    try:
        with urllib.request.urlopen(full_url) as response:
            if response.status != 200:
                raise Exception(f"HTTP Error: {response.status}")

            # Parse JSON response
            data = json.loads(response.read().decode("utf-8"))

            # Validate API response
            if "response" in data:
                header = data["response"].get("header", {})
                result_code = header.get("resultCode")

                if result_code != "00":
                    result_msg = header.get("resultMsg", "Unknown error")
                    raise Exception(
                        f"API Error {result_code}: {result_msg}"
                    )

            return data

    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        raise Exception(
            f"API request failed: HTTP {e.code}\n"
            f"Response: {error_body[:200]}"
        )
    except urllib.error.URLError as e:
        raise Exception(f"Network error: {e.reason}")


def print_error(message: str) -> None:
    """
    Print error message to stderr in a user-friendly format.

    Args:
        message: Error message to display
    """
    import sys
    print(f"Error: {message}", file=sys.stderr)


if __name__ == "__main__":
    # Test the module
    print("KMA API Utilities Module")
    print("=" * 40)

    # Test service key loading
    try:
        key = get_service_key()
        print(f"✓ Service key loaded: {key[:10]}...{key[-10:]}")
    except ValueError as e:
        print(f"✗ {e}")
