#!/usr/bin/env python3
"""
Search products on Scout.

Usage:
    python search.py "wireless mouse"
    python search.py "laptop stand" --source amazon

API key is loaded automatically from credentials.json.
Run get_api_key.py first if you don't have one.
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
import urllib.parse

from config import BASE_URL, get_headers, get_api_key


def search_products(query: str, api_key: str, source: str = "all") -> dict:
    """Search for products."""
    params = f"q={urllib.parse.quote(query)}"
    if source and source != "all":
        params += f"&source={source}"
    
    url = f"{BASE_URL}/search?{params}"
    
    try:
        req = urllib.request.Request(url, headers=get_headers(api_key), method="GET")
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        try:
            return json.loads(error_body)
        except:
            return {"success": False, "error": {"code": "HTTP_ERROR", "message": f"HTTP {e.code}: {error_body}"}}
    except Exception as e:
        return {"success": False, "error": {"code": "REQUEST_ERROR", "message": str(e)}}


def main():
    parser = argparse.ArgumentParser(description="Search products on Scout")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--source", choices=["amazon", "shopify", "all"], default="all", help="Product source")
    
    args = parser.parse_args()
    
    # Auto-load API key from credentials.json
    api_key = get_api_key(required=True)
    
    result = search_products(args.query, api_key, args.source)
    
    # Always output JSON
    print(json.dumps(result, indent=2))
    
    # Exit with error code if failed
    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()
