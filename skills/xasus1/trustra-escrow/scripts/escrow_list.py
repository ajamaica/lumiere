#!/usr/bin/env python3
"""
List all escrows.

Usage:
  python escrow_list.py [--status STATUS] [--limit N]
  
Examples:
  python escrow_list.py
  python escrow_list.py --status paid
  python escrow_list.py --limit 10
"""

import argparse
import requests
import sys
from config import BASE_URL, get_api_key, get_headers, print_json


def list_escrows(api_key: str, status: str = None, limit: int = 50, offset: int = 0) -> dict:
    """List all escrows."""
    url = f"{BASE_URL}/escrow"
    headers = get_headers(api_key)
    
    params = {"limit": limit, "offset": offset}
    if status:
        params["status"] = status
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to list escrows: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="List all escrows")
    parser.add_argument("--status", "-s", help="Filter by status (created, paid, delivered, completed, disputed, canceled)")
    parser.add_argument("--limit", "-l", type=int, default=50, help="Max results (default: 50)")
    parser.add_argument("--json", "-j", action="store_true", help="Output raw JSON")
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    result = list_escrows(api_key, args.status, args.limit)
    
    if args.json:
        print_json(result)
        return
    
    escrows = result.get("escrows", [])
    total = result.get("total", 0)
    
    if not escrows:
        print("No escrows found.")
        return
    
    print(f"Found {total} escrow(s):")
    print("")
    
    for escrow in escrows:
        role = escrow.get("role", "unknown")
        status = escrow.get("status", "unknown")
        amount = escrow.get("amount", 0)
        
        # Color status
        status_display = status.upper()
        
        print(f"  [{escrow.get('id')}] {amount} USDC - {status_display} ({role})")
        print(f"      Buyer: {escrow.get('buyer')}")
        print(f"      Seller: {escrow.get('seller')}")
        print(f"      Created: {escrow.get('createdAt')}")
        print("")


if __name__ == "__main__":
    main()
