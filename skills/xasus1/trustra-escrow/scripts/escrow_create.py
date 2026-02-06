#!/usr/bin/env python3
"""
Create a new escrow.

Usage:
  python escrow_create.py <COUNTERPARTY_WALLET> <AMOUNT_USDC> [--description "..."]
  
Examples:
  python escrow_create.py 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 50.00
  python escrow_create.py 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 100.00 --description "Payment for design work"
"""

import argparse
import requests
import sys
from config import BASE_URL, get_api_key, get_headers, get_wallet_address, print_json


def create_escrow(api_key: str, counterparty: str, amount: float, description: str = None) -> dict:
    """Create a new escrow."""
    url = f"{BASE_URL}/escrow/create"
    headers = get_headers(api_key)
    
    payload = {
        "counterparty": counterparty,
        "amount": amount
    }
    if description:
        payload["description"] = description
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 201:
        return response.json()
    else:
        print(f"Failed to create escrow: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Create a new escrow")
    parser.add_argument("counterparty", help="Counterparty wallet address")
    parser.add_argument("amount", type=float, help="Amount in USDC")
    parser.add_argument("--description", "-d", help="Description of the escrow")
    
    args = parser.parse_args()
    
    if args.amount <= 0:
        print("Amount must be greater than 0", file=sys.stderr)
        sys.exit(1)
    
    api_key = get_api_key()
    wallet = get_wallet_address()
    
    print(f"Creating escrow...")
    print(f"  From: {wallet} (you)")
    print(f"  To: {args.counterparty}")
    print(f"  Amount: {args.amount} USDC")
    if args.description:
        print(f"  Description: {args.description}")
    print("")
    
    result = create_escrow(api_key, args.counterparty, args.amount, args.description)
    
    if result.get("success"):
        escrow = result.get("escrow", {})
        print("Escrow created!")
        print("")
        print(f"  ID: {escrow.get('id')}")
        print(f"  Contract ID: {escrow.get('contractOrderId')}")
        print(f"  Status: {escrow.get('status')}")
        print(f"  Transaction: {escrow.get('transactionHash')}")
        print("")
        print("Next step: Fund the escrow by calling escrow_pay.py")
    else:
        print("Failed to create escrow", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
