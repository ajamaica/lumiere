#!/usr/bin/env python3
"""
Pay into an escrow (buyer only).

Usage:
  python escrow_pay.py <ESCROW_ID>
  
Examples:
  python escrow_pay.py 123
"""

import argparse
import requests
import sys
from config import BASE_URL, get_api_key, get_headers, print_json


def pay_escrow(api_key: str, escrow_id: str) -> dict:
    """Execute payment for escrow."""
    url = f"{BASE_URL}/escrow/{escrow_id}/pay"
    headers = get_headers(api_key)
    
    payload = {"execute": True}
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to pay: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Pay into escrow")
    parser.add_argument("escrow_id", help="Escrow ID")
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    print(f"Executing payment for escrow {args.escrow_id}...")
    
    result = pay_escrow(api_key, args.escrow_id)
    
    if result.get("success"):
        escrow = result.get("escrow", {})
        print("")
        print("Payment successful!")
        print(f"  Status: {escrow.get('status')}")
        print(f"  Paid: {escrow.get('paidAmount', 0):.6f} USDC")
        if escrow.get("paymentHash"):
            print(f"  TX: {escrow.get('paymentHash')}")
        print("")
        print("Next step: Seller marks as delivered with escrow_deliver.py")
    else:
        print("Failed to pay", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
