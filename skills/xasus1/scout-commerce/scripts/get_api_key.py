#!/usr/bin/env python3
"""
Get a Scout API key with Crossmint smart wallet.

Usage:
    python get_api_key.py --email z@example.com --address "Name,Street,City,State,Zip"

This creates:
- A Crossmint smart wallet for your agent
- An API key for Scout API access
- Saves everything to credentials.json

After registration, fund your wallet with USDC to start buying.
No private key management needed - Crossmint handles wallet security.
"""

import argparse
import json
import sys

import requests

from config import BASE_URL, HEADERS, save_credentials, CREDS_FILE


def get_api_key(email: str, address: str, phone: str = None) -> dict:
    """Register for Scout API and get a Crossmint smart wallet."""
    try:
        # Build request payload
        payload = {
            "email": email,
            "shippingAddress": address,
        }
        
        # Make registration request
        response = requests.post(
            f"{BASE_URL}/auth",
            headers=HEADERS,
            json=payload,
            timeout=30,
        )
        
        result = response.json()
        
        if response.status_code == 200 and result.get("success"):
            return {
                "success": True,
                "apiKey": result.get("apiKey"),
                "walletAddress": result.get("walletAddress"),
                "message": result.get("message"),
                "funding_instructions": result.get("funding_instructions"),
            }
        else:
            return {
                "success": False,
                "error": result.get("error", {"code": "AUTH_FAILED", "message": f"HTTP {response.status_code}"}),
                "details": result,
            }
            
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": {"code": "REQUEST_ERROR", "message": f"Request failed: {e}"}}
    except Exception as e:
        return {"success": False, "error": {"code": "ERROR", "message": str(e)}}


def validate_address(address_str: str) -> bool:
    """Validate address has required parts: Name,Street,City,State,Zip"""
    parts = [p.strip() for p in address_str.split(",")]
    return len(parts) >= 5


def main():
    parser = argparse.ArgumentParser(description="Register for Scout and get a Crossmint smart wallet")
    parser.add_argument("--email", required=True, help="Email for order tracking")
    parser.add_argument("--address", required=True, help="Shipping address: Name,Street,City,State,Zip,Country")
    parser.add_argument("--phone", help="Phone number (optional)")
    
    args = parser.parse_args()
    
    # Validate address format
    if not validate_address(args.address):
        print(json.dumps({
            "success": False,
            "error": {
                "code": "INVALID_ADDRESS",
                "message": "Invalid address format. Required: Name,Street,City,State,Zip"
            }
        }, indent=2))
        sys.exit(1)
    
    result = get_api_key(args.email, args.address, args.phone)
    
    if result.get("success"):
        # Build credentials with API key + shipping profile
        creds = {
            "api_key": result["apiKey"],
            "wallet_address": result["walletAddress"],
            "shipping_profile": {
                "email": args.email,
                "address": args.address,
                **({"phone": args.phone} if args.phone else {}),
            },
        }
        
        save_credentials(creds)
        
        # Add profile to result
        result["shipping_profile"] = creds["shipping_profile"]
        result["credentials_file"] = CREDS_FILE
    
    # Always output JSON
    print(json.dumps(result, indent=2))
    
    # Exit with error code if failed
    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()
