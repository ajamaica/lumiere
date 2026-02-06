#!/usr/bin/env python3
"""
Open a dispute on an escrow.

Usage:
  python escrow_dispute.py <ESCROW_ID> [--reason "..."]
  
Examples:
  python escrow_dispute.py 123
  python escrow_dispute.py 123 --reason "Item not as described"
"""

import argparse
import requests
import sys
from config import BASE_URL, get_api_key, get_headers, print_json


def open_dispute(api_key: str, escrow_id: str, reason: str = None) -> dict:
    """Open a dispute."""
    url = f"{BASE_URL}/escrow/{escrow_id}/dispute"
    headers = get_headers(api_key)
    
    payload = {}
    if reason:
        payload["reason"] = reason
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to open dispute: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Open a dispute on an escrow")
    parser.add_argument("escrow_id", help="Escrow ID")
    parser.add_argument("--reason", "-r", help="Reason for dispute")
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    print(f"Opening dispute for escrow {args.escrow_id}...")
    
    result = open_dispute(api_key, args.escrow_id, args.reason)
    
    if result.get("success"):
        escrow = result.get("escrow", {})
        print("")
        print("Dispute opened!")
        print(f"  Status: {escrow.get('status')}")
        print(f"  Reason: {escrow.get('disputeReason')}")
        print(f"  Disputed at: {escrow.get('disputedAt')}")
        print("")
        print("Trustra team will review and resolve the dispute.")
    else:
        print("Failed to open dispute", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
