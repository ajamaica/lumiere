#!/usr/bin/env python3
"""
Cancel an escrow (buyer only, before payment or within 12h window).

Usage:
  python escrow_cancel.py <ESCROW_ID> [--reason "..."]
  
Examples:
  python escrow_cancel.py 123
  python escrow_cancel.py 123 --reason "Changed my mind"
"""

import argparse
import requests
import sys
from config import BASE_URL, get_api_key, get_headers, print_json


def cancel_escrow(api_key: str, escrow_id: str, reason: str = None) -> dict:
    """Cancel an escrow."""
    url = f"{BASE_URL}/escrow/{escrow_id}/cancel"
    headers = get_headers(api_key)
    
    payload = {}
    if reason:
        payload["reason"] = reason
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to cancel: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Cancel an escrow")
    parser.add_argument("escrow_id", help="Escrow ID")
    parser.add_argument("--reason", "-r", help="Reason for cancellation")
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    print(f"Canceling escrow {args.escrow_id}...")
    
    result = cancel_escrow(api_key, args.escrow_id, args.reason)
    
    if result.get("success"):
        escrow = result.get("escrow", {})
        print("")
        print("Escrow canceled!")
        print(f"  Status: {escrow.get('status')}")
        print(f"  Reason: {escrow.get('cancelReason')}")
        print(f"  Canceled at: {escrow.get('canceledAt')}")
    else:
        print("Failed to cancel", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
