#!/usr/bin/env python3
"""
Check order status or list order history on Scout.

Usage:
    # Check specific order
    python order_status.py ord_abc123

    # List all orders
    python order_status.py --list

API key is loaded automatically from credentials.json.
Run get_api_key.py first if you don't have one.
"""

import argparse
import json
import sys
import urllib.request
import urllib.error

from config import BASE_URL, get_headers, get_api_key


def get_order_status(order_id: str, api_key: str) -> dict:
    """Get status of a specific order."""
    url = f"{BASE_URL}/orders/{order_id}"
    
    try:
        req = urllib.request.Request(url, headers=get_headers(api_key), method="GET")
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        try:
            return json.loads(error_body)
        except:
            return {"success": False, "error": {"code": "HTTP_ERROR", "message": f"HTTP {e.code}: {error_body}"}}
    except Exception as e:
        return {"success": False, "error": {"code": "REQUEST_ERROR", "message": str(e)}}


def list_orders(api_key: str, limit: int = 10) -> dict:
    """List order history."""
    url = f"{BASE_URL}/orders?limit={limit}"
    
    try:
        req = urllib.request.Request(url, headers=get_headers(api_key), method="GET")
        with urllib.request.urlopen(req, timeout=30) as response:
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
    parser = argparse.ArgumentParser(description="Check order status on Scout")
    parser.add_argument("order_id", nargs="?", help="Order ID to check")
    parser.add_argument("--list", action="store_true", help="List all orders")
    
    args = parser.parse_args()
    
    if not args.order_id and not args.list:
        print(json.dumps({
            "success": False,
            "error": {"code": "MISSING_ARG", "message": "Provide an order_id or use --list"}
        }, indent=2))
        sys.exit(1)
    
    # Auto-load API key from credentials.json
    api_key = get_api_key(required=True)
    
    if args.list:
        result = list_orders(api_key)
    else:
        result = get_order_status(args.order_id, api_key)
    
    # Always output JSON
    print(json.dumps(result, indent=2))
    
    # Exit with error code if failed
    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()
