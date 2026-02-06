#!/usr/bin/env python3
"""
Check wallet balance.

Usage:
  python balance.py
"""

import requests
import sys
from config import BASE_URL, get_api_key, get_headers, get_wallet_address, print_json


def get_balance(api_key: str) -> dict:
    """Get wallet balance."""
    url = f"{BASE_URL}/wallet/balance"
    headers = get_headers(api_key)
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to get balance: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    api_key = get_api_key()
    wallet = get_wallet_address()
    
    print(f"Wallet: {wallet}")
    print("")
    
    result = get_balance(api_key)
    balances = result.get("balances", {})
    
    print("Balances:")
    for token, info in balances.items():
        amount = info.get("amount", 0)
        symbol = info.get("symbol", token)
        print(f"  {symbol}: {amount:.6f}")
    
    print("")
    print("Fund this wallet with USDC to create escrows.")


if __name__ == "__main__":
    main()
