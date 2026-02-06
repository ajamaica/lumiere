#!/usr/bin/env python3
"""
Export private key from your managed wallet.
Use this if you want to use your wallet outside of Trustra.

Usage:
  python export_key.py
"""

import requests
import sys
from config import BASE_URL, get_api_key, get_headers, get_wallet_address, print_json


def export_key(api_key: str) -> dict:
    """Export wallet private key."""
    url = f"{BASE_URL}/wallet/export"
    headers = get_headers(api_key)
    
    response = requests.post(url, json={}, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to export key: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    api_key = get_api_key()
    wallet = get_wallet_address()
    
    print(f"Exporting private key for wallet: {wallet}")
    print("")
    
    result = export_key(api_key)
    
    if result.get("success"):
        print(f"Wallet: {result.get('walletAddress')}")
        print(f"Private Key: {result.get('privateKey')}")
        print("")
        print("WARNING: Keep this key secret. Anyone with it can control your wallet.")
    else:
        print("Failed to export key", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
