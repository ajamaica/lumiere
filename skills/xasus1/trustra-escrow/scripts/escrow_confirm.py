#!/usr/bin/env python3
"""
Confirm receipt and release funds to seller (buyer only).

Usage:
  python escrow_confirm.py <ESCROW_ID>
  
Examples:
  python escrow_confirm.py 123
"""

import argparse
import requests
import sys
from config import BASE_URL, get_api_key, get_headers, print_json


def confirm_escrow(api_key: str, escrow_id: str) -> dict:
    """Confirm escrow and release funds on-chain."""
    url = f"{BASE_URL}/escrow/{escrow_id}/confirm"
    headers = get_headers(api_key)
    
    payload = {"execute": True}
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to confirm: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Confirm escrow and release funds")
    parser.add_argument("escrow_id", help="Escrow ID")
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    print(f"Confirming escrow {args.escrow_id}...")
    
    result = confirm_escrow(api_key, args.escrow_id)
    
    if result.get("success"):
        escrow = result.get("escrow", {})
        print("")
        print("Escrow confirmed!")
        print(f"  Status: {escrow.get('status')}")
        print(f"  Completed at: {escrow.get('completedAt')}")
        if escrow.get("completionHash"):
            print(f"  TX: {escrow.get('completionHash')}")
        print("")
        print("Funds released to seller on-chain.")
    else:
        print("Failed to confirm", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
