#!/usr/bin/env python3
"""
Mark an escrow as delivered (seller only).
Note: Must wait 12 hours after payment before marking delivered.

Usage:
  python escrow_deliver.py <ESCROW_ID>
  
Examples:
  python escrow_deliver.py 123
"""

import argparse
import requests
import sys
from config import BASE_URL, get_api_key, get_headers, print_json


def mark_delivered(api_key: str, escrow_id: str) -> dict:
    """Mark escrow as delivered on-chain."""
    url = f"{BASE_URL}/escrow/{escrow_id}/deliver"
    headers = get_headers(api_key)
    
    payload = {"execute": True}
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to mark as delivered: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Mark escrow as delivered")
    parser.add_argument("escrow_id", help="Escrow ID")
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    print(f"Marking escrow {args.escrow_id} as delivered...")
    
    result = mark_delivered(api_key, args.escrow_id)
    
    if result.get("success"):
        escrow = result.get("escrow", {})
        print("")
        print("Marked as delivered!")
        print(f"  Status: {escrow.get('status')}")
        print(f"  Delivered at: {escrow.get('deliveredAt')}")
        if escrow.get("deliveryHash"):
            print(f"  TX: {escrow.get('deliveryHash')}")
        print("")
        print(escrow.get("message", "Buyer has 7 days to confirm or dispute."))
    else:
        print("Failed to mark as delivered", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
