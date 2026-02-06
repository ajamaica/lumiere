#!/usr/bin/env python3
"""
Get product details from Scout.

Usage:
    python product.py amazon:B07GBZ4Q68
    python product.py shopify:store.com/products/item

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


def get_product(locator: str, api_key: str) -> dict:
    """Get product details."""
    url = f"{BASE_URL}/products/{urllib.parse.quote(locator, safe='')}"
    
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
    parser = argparse.ArgumentParser(description="Get product details from Scout")
    parser.add_argument("locator", help="Product locator (e.g., amazon:B07GBZ4Q68)")
    
    args = parser.parse_args()
    
    # Auto-load API key from credentials.json
    api_key = get_api_key(required=True)
    
    result = get_product(args.locator, api_key)
    
    # Always output JSON
    print(json.dumps(result, indent=2))
    
    # Exit with error code if failed
    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()
