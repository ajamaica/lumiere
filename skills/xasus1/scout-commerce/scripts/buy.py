#!/usr/bin/env python3
"""
Buy a product on Scout.

Usage:
    python buy.py amazon:B07GBZ4Q68
    python buy.py amazon:B07GBZ4Q68 --quantity 2
    python buy.py amazon:B07GBZ4Q68 --email other@example.com

Uses saved shipping profile from credentials.json.
Run get_api_key.py first to set up your account.

No private key needed - payment comes from your Crossmint wallet.
Fund your wallet with USDC before buying.
"""

import argparse
import json
import sys

import requests

from config import BASE_URL, HEADERS, get_api_key, get_shipping_profile, load_credentials


def parse_address(address_str: str) -> dict:
    """Parse address string into dict."""
    parts = [p.strip() for p in address_str.split(",")]
    if len(parts) < 5:
        raise ValueError("Address must have: Name,Address,City,State,Zip (and optionally Phone)")
    
    return {
        "recipientName": parts[0],
        "address": parts[1],
        "city": parts[2],
        "state": parts[3],
        "zip": parts[4],
        **({"phone": parts[5]} if len(parts) > 5 else {}),
    }


def check_balance(api_key: str) -> dict:
    """Check wallet balance."""
    try:
        headers = HEADERS.copy()
        headers["Authorization"] = f"Bearer {api_key}"
        
        response = requests.get(
            f"{BASE_URL}/auth/balance",
            headers=headers,
            timeout=30,
        )
        
        return response.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


def buy_product(
    locator: str,
    api_key: str,
    email: str = None,
    address: dict = None,
    variant_id: str = None,
    quantity: int = 1,
) -> dict:
    """Buy a product. Payment comes from your Crossmint wallet."""
    try:
        # Build order payload
        payload = {
            "productLocator": locator,
            "quantity": quantity,
        }
        
        # Only include optional fields if provided
        if email:
            payload["email"] = email
        if address:
            payload.update(address)
        if variant_id:
            payload["variantId"] = variant_id
        
        # Make request
        headers = HEADERS.copy()
        headers["x-api-key"] = api_key
        
        response = requests.post(
            f"{BASE_URL}/order",
            headers=headers,
            json=payload,
            timeout=60,
        )
        
        result = response.json()
        
        if response.status_code == 200 and result.get("success"):
            return result
        elif response.status_code == 402:
            # Insufficient balance
            return {
                "success": False,
                "error": result.get("error", {"code": "INSUFFICIENT_BALANCE", "message": "Insufficient balance"}),
            }
        else:
            return {
                "success": False,
                "error": result.get("error", {"code": "ORDER_FAILED", "message": f"HTTP {response.status_code}"}),
                "details": result,
            }
            
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": {"code": "REQUEST_ERROR", "message": f"Request failed: {e}"}}
    except Exception as e:
        return {"success": False, "error": {"code": "ERROR", "message": str(e)}}


def main():
    parser = argparse.ArgumentParser(description="Buy a product on Scout")
    parser.add_argument("locator", help="Product locator (e.g., amazon:B07GBZ4Q68)")
    parser.add_argument("--email", help="Email for order updates (uses saved profile if omitted)")
    parser.add_argument("--address", help="Shipping: Name,Street,City,State,Zip (uses saved profile if omitted)")
    parser.add_argument("--variant", help="Variant ID (optional)")
    parser.add_argument("--quantity", type=int, default=1, help="Quantity (default: 1)")
    parser.add_argument("--check-balance", action="store_true", help="Check balance before buying")
    
    args = parser.parse_args()
    
    # Auto-load API key from credentials.json
    api_key = get_api_key(required=True)
    
    # Check balance if requested
    if args.check_balance:
        balance_result = check_balance(api_key)
        if balance_result.get("success"):
            print(f"Balance: {balance_result.get('balance', '0.00')} USDC", file=sys.stderr)
        else:
            print(f"Could not check balance", file=sys.stderr)
    
    # Load saved shipping profile as fallback
    profile = get_shipping_profile()
    
    # Determine email (CLI overrides saved profile)
    email = args.email
    if not email and profile:
        email = profile.get("email")
    
    # Determine address (CLI overrides saved profile)
    address = None
    if args.address:
        try:
            address = parse_address(args.address)
        except ValueError as e:
            print(json.dumps({
                "success": False,
                "error": {"code": "INVALID_ADDRESS", "message": str(e)}
            }, indent=2))
            sys.exit(1)
    # If no address provided, backend will use saved profile
    
    result = buy_product(
        locator=args.locator,
        api_key=api_key,
        email=email,
        address=address,
        variant_id=args.variant,
        quantity=args.quantity,
    )
    
    # Always output JSON
    print(json.dumps(result, indent=2))
    
    # Exit with error code if failed
    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()
