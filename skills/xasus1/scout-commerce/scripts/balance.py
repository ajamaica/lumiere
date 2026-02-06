#!/usr/bin/env python3
"""
Check your Scout wallet balance.

Usage:
    python balance.py          # Show all token balances
    python balance.py --usdc   # Show only USDC balance

Shows all tokens in your wallet with their balances and mint addresses.
"""

import argparse
import json
import sys

import requests

from config import BASE_URL, HEADERS, RPC_URL, get_api_key, get_wallet_address

# USDC mint for reference
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def check_usdc_balance(api_key: str) -> dict:
    """Check USDC balance via Scout API."""
    try:
        headers = HEADERS.copy()
        headers["Authorization"] = f"Bearer {api_key}"
        
        response = requests.get(
            f"{BASE_URL}/auth/balance",
            headers=headers,
            timeout=30,
        )
        
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": {"code": "REQUEST_ERROR", "message": str(e)}}
    except Exception as e:
        return {"success": False, "error": {"code": "ERROR", "message": str(e)}}


def get_token_metadata(mints: list) -> dict:
    """
    Fetch token metadata from Jupiter API.
    Returns dict mapping mint -> {symbol, name}
    """
    metadata = {}
    if not mints:
        return metadata
    
    try:
        # Jupiter tokens API - get metadata for specific mints
        response = requests.get(
            "https://tokens.jup.ag/tokens",
            params={"tags": "verified,community"},
            timeout=10,
        )
        if response.status_code == 200:
            tokens = response.json()
            for token in tokens:
                if token.get("address") in mints:
                    metadata[token["address"]] = {
                        "symbol": token.get("symbol", "???"),
                        "name": token.get("name", "Unknown"),
                    }
    except Exception as e:
        print(f"Warning: Could not fetch token metadata: {e}", file=sys.stderr)
    
    return metadata


def get_all_balances(wallet_address: str) -> dict:
    """Get all token balances in wallet via Solana RPC."""
    try:
        tokens = []
        mints_found = []
        
        # Get SPL token accounts
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTokenAccountsByOwner",
            "params": [
                wallet_address,
                {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
                {"encoding": "jsonParsed"}
            ]
        }
        
        response = requests.post(RPC_URL, json=payload, timeout=30)
        data = response.json()
        
        usdc_balance = "0.00"
        
        # Collect all token accounts with balance > 0
        token_accounts = []
        for account in data.get("result", {}).get("value", []):
            info = account.get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
            mint = info.get("mint")
            amount = info.get("tokenAmount", {})
            
            ui_amount = float(amount.get("uiAmount", 0))
            if ui_amount > 0 and mint:
                mints_found.append(mint)
                token_accounts.append({
                    "mint": mint,
                    "balance": amount.get("uiAmountString", "0"),
                    "decimals": amount.get("decimals", 6),
                })
                
                # Track USDC specifically
                if mint == USDC_MINT:
                    usdc_balance = amount.get("uiAmountString", "0")
        
        # Try to get metadata for the tokens we found
        metadata = get_token_metadata(mints_found)
        
        # Build token list with metadata
        for t in token_accounts:
            mint = t["mint"]
            meta = metadata.get(mint, {})
            tokens.append({
                "symbol": meta.get("symbol", "???"),
                "name": meta.get("name", "Unknown Token"),
                "mint": mint,
                "balance": t["balance"],
                "decimals": t["decimals"],
            })
        
        # Get native SOL balance
        sol_payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [wallet_address]
        }
        sol_response = requests.post(RPC_URL, json=sol_payload, timeout=30)
        sol_data = sol_response.json()
        sol_lamports = sol_data.get("result", {}).get("value", 0)
        sol_balance = sol_lamports / 1e9
        
        if sol_balance > 0:
            tokens.insert(0, {
                "symbol": "SOL",
                "name": "Solana",
                "mint": "So11111111111111111111111111111111111111112",
                "balance": f"{sol_balance:.9f}".rstrip('0').rstrip('.'),
                "decimals": 9,
            })
        
        return {
            "success": True,
            "tokens": tokens,
            "usdc_balance": usdc_balance,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="Check wallet balance")
    parser.add_argument("--usdc", action="store_true", help="Show only USDC balance")
    args = parser.parse_args()
    
    # Auto-load credentials
    api_key = get_api_key(required=True)
    wallet_address = get_wallet_address(required=True)
    
    if args.usdc:
        # USDC only mode (legacy behavior)
        result = check_usdc_balance(api_key)
        
        if result.get("success"):
            print(json.dumps({
                "success": True,
                "balance": result.get("balance", "0.00"),
                "currency": "USDC",
                "walletAddress": result.get("walletAddress") or wallet_address,
                "message": "Fund this address with USDC to buy products.",
            }, indent=2))
        else:
            print(json.dumps(result, indent=2))
            sys.exit(1)
    else:
        # All tokens mode (default)
        result = get_all_balances(wallet_address)
        
        if result.get("success"):
            tokens = result.get("tokens", [])
            usdc_balance = result.get("usdc_balance", "0.00")
            
            # Build helpful message
            if not tokens:
                message = "Wallet is empty. Fund with USDC or SOL to get started."
            elif float(usdc_balance) > 0:
                message = f"Ready to buy with {usdc_balance} USDC."
            else:
                # Has tokens but no USDC - suggest swap
                non_usdc = [t for t in tokens if t["mint"] != USDC_MINT]
                if non_usdc:
                    first = non_usdc[0]
                    symbol = first["symbol"] if first["symbol"] != "???" else first["mint"][:8]
                    message = f"No USDC. Swap to USDC first: python swap.py {symbol} USDC <amount>"
                else:
                    message = "Fund wallet with USDC to buy products."
            
            print(json.dumps({
                "success": True,
                "walletAddress": wallet_address,
                "tokens": tokens,
                "usdc_balance": usdc_balance,
                "message": message,
            }, indent=2))
        else:
            print(json.dumps({
                "success": False,
                "error": result.get("error", "Failed to fetch balances"),
            }, indent=2))
            sys.exit(1)


if __name__ == "__main__":
    main()
