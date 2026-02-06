#!/usr/bin/env python3
"""
Withdraw funds after 7-day auto-release (seller only).

Usage:
  python escrow_withdraw.py <ESCROW_ID>
  
Examples:
  python escrow_withdraw.py 123
"""

import argparse
import requests
import sys
from config import BASE_URL, get_api_key, get_headers, print_json


def withdraw_funds(api_key: str, escrow_id: str) -> dict:
    """Withdraw funds from escrow on-chain."""
    url = f"{BASE_URL}/escrow/{escrow_id}/withdraw"
    headers = get_headers(api_key)
    
    payload = {"execute": True}
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to withdraw: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Withdraw funds from escrow")
    parser.add_argument("escrow_id", help="Escrow ID")
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    print(f"Withdrawing funds from escrow {args.escrow_id}...")
    
    result = withdraw_funds(api_key, args.escrow_id)
    
    if result.get("success"):
        escrow = result.get("escrow", {})
        print("")
        print("Funds withdrawn!")
        print(f"  Status: {escrow.get('status')}")
        print(f"  Withdrawn at: {escrow.get('withdrawnAt')}")
        if escrow.get("withdrawHash"):
            print(f"  TX: {escrow.get('withdrawHash')}")
    else:
        print("Failed to withdraw", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
