#!/usr/bin/env python3
"""
Swap tokens on Solana using Jupiter via Scout API.

Usage:
    python swap.py SOL USDC 0.1          # Swap 0.1 SOL to USDC
    python swap.py USDC SOL 10           # Swap 10 USDC to SOL
    python swap.py BONK USDC 1000000     # Swap BONK to USDC
    python swap.py --quote SOL USDC 0.1  # Get quote only (no swap)
    python swap.py --list                # List tokens in wallet

Supports: SOL, USDC, USDT, BONK, TRUST - or use any mint address directly.
Uses your Crossmint smart wallet. Run get_api_key.py first.
"""

import argparse
import json
import sys
import requests

from config import BASE_URL, get_api_key, get_wallet_address, HEADERS, RPC_URL

# Common tokens - for other tokens, use mint address directly
KNOWN_TOKENS = {
    "SOL": {"address": "So11111111111111111111111111111111111111112", "decimals": 9, "name": "Solana"},
    "USDC": {"address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "decimals": 6, "name": "USD Coin"},
    "USDT": {"address": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "decimals": 6, "name": "Tether USD"},
    "BONK": {"address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "decimals": 5, "name": "Bonk"},
    "TRUST": {"address": "F5sc3CGLmKueyUqaCkwopo9u61HsgpmJc8Cmc9xibonk", "decimals": 6, "name": "TRUST"},
}


def lookup_token(symbol_or_address: str) -> dict:
    """
    Look up token by symbol or mint address.
    Returns dict with: address, decimals, name, symbol
    """
    symbol_upper = symbol_or_address.upper()
    
    # Check known tokens first
    if symbol_upper in KNOWN_TOKENS:
        token = KNOWN_TOKENS[symbol_upper]
        return {
            "address": token["address"],
            "decimals": token["decimals"],
            "name": token["name"],
            "symbol": symbol_upper,
        }
    
    # If it looks like a mint address (32-44 chars base58), use it directly
    if len(symbol_or_address) >= 32 and len(symbol_or_address) <= 44:
        # Check if this address is in our known tokens
        for sym, data in KNOWN_TOKENS.items():
            if data["address"] == symbol_or_address:
                return {
                    "address": data["address"],
                    "decimals": data["decimals"],
                    "name": data["name"],
                    "symbol": sym,
                }
        
        # Use as-is with default decimals (6 is most common)
        return {
            "address": symbol_or_address,
            "decimals": 6,
            "name": "Unknown Token",
            "symbol": symbol_or_address[:6] + "...",
        }
    
    raise ValueError(
        f"Token '{symbol_or_address}' not found. "
        f"Known tokens: {', '.join(KNOWN_TOKENS.keys())}. "
        f"Or use the mint address directly."
    )


def get_wallet_tokens(wallet_address: str) -> list:
    """Get all token balances in wallet via Solana RPC."""
    try:
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
        
        tokens = []
        for account in data.get("result", {}).get("value", []):
            info = account.get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
            mint = info.get("mint")
            amount = info.get("tokenAmount", {})
            
            if float(amount.get("uiAmount", 0)) > 0:
                # Try to get token info from known tokens
                token_info = {"symbol": "???", "name": "Unknown"}
                for sym, data in KNOWN_TOKENS.items():
                    if data["address"] == mint:
                        token_info = {"symbol": sym, "name": data["name"]}
                        break
                
                tokens.append({
                    "symbol": token_info["symbol"],
                    "name": token_info["name"],
                    "mint": mint,
                    "balance": amount.get("uiAmountString", "0"),
                    "decimals": amount.get("decimals", 6),
                })
        
        # Also check SOL balance
        sol_payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [wallet_address]
        }
        sol_response = requests.post(RPC_URL, json=sol_payload, timeout=30)
        sol_data = sol_response.json()
        sol_balance = sol_data.get("result", {}).get("value", 0) / 1e9
        
        if sol_balance > 0:
            tokens.insert(0, {
                "symbol": "SOL",
                "name": "Solana",
                "mint": "So11111111111111111111111111111111111111112",
                "balance": f"{sol_balance:.9f}".rstrip('0').rstrip('.'),
                "decimals": 9,
            })
        
        return tokens
    except Exception as e:
        print(f"Error fetching wallet tokens: {e}", file=sys.stderr)
        return []


def get_quote(api_key: str, input_mint: str, output_mint: str, amount: int) -> dict:
    """Get swap quote from Scout API."""
    headers = HEADERS.copy()
    headers["x-api-key"] = api_key
    
    payload = {
        "inputMint": input_mint,
        "outputMint": output_mint,
        "amount": amount,
    }
    
    response = requests.post(
        f"{BASE_URL}/swap/quote",
        headers=headers,
        json=payload,
        timeout=60,
    )
    
    if response.status_code != 200:
        return {"success": False, "error": {"code": f"HTTP_{response.status_code}", "message": response.text or "Empty response"}}
    
    try:
        return response.json()
    except:
        return {"success": False, "error": {"code": "INVALID_JSON", "message": response.text or "Empty response"}}


def execute_swap(api_key: str, input_mint: str, output_mint: str, amount: int) -> dict:
    """Execute swap via Scout API."""
    headers = HEADERS.copy()
    headers["x-api-key"] = api_key
    
    payload = {
        "inputMint": input_mint,
        "outputMint": output_mint,
        "amount": amount,
    }
    
    response = requests.post(
        f"{BASE_URL}/swap",
        headers=headers,
        json=payload,
        timeout=120,
    )
    
    if response.status_code != 200:
        return {"success": False, "error": {"code": f"HTTP_{response.status_code}", "message": response.text or "Empty response"}}
    
    try:
        return response.json()
    except:
        return {"success": False, "error": {"code": "INVALID_JSON", "message": response.text or "Empty response"}}


def format_amount(amount: int, decimals: int) -> str:
    """Format raw amount to human readable."""
    return f"{amount / (10 ** decimals):.9f}".rstrip('0').rstrip('.')


def list_wallet_tokens(wallet_address: str):
    """List all tokens in wallet."""
    print(f"Fetching tokens for {wallet_address}...", file=sys.stderr)
    tokens = get_wallet_tokens(wallet_address)
    
    if not tokens:
        print(json.dumps({
            "success": True,
            "tokens": [],
            "message": "No tokens found in wallet",
        }, indent=2))
        return
    
    print(json.dumps({
        "success": True,
        "tokens": tokens,
        "count": len(tokens),
    }, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Swap tokens on Solana using Jupiter")
    parser.add_argument("input_token", nargs="?", help="Token to sell (symbol or mint address)")
    parser.add_argument("output_token", nargs="?", help="Token to buy (symbol or mint address)")
    parser.add_argument("amount", nargs="?", type=float, help="Amount to swap (in token units)")
    parser.add_argument("--quote", action="store_true", help="Get quote only, don't execute swap")
    parser.add_argument("--list", action="store_true", help="List all tokens in wallet")
    
    args = parser.parse_args()
    
    # Get credentials
    wallet_address = get_wallet_address(required=True)
    
    # List tokens mode
    if args.list:
        list_wallet_tokens(wallet_address)
        return
    
    # Validate swap arguments
    if not args.input_token or not args.output_token or args.amount is None:
        parser.error("For swaps, provide: input_token output_token amount")
    
    api_key = get_api_key(required=True)
    
    # Resolve tokens
    try:
        print(f"Looking up tokens...", file=sys.stderr)
        input_token = lookup_token(args.input_token)
        output_token = lookup_token(args.output_token)
    except ValueError as e:
        print(json.dumps({"success": False, "error": str(e)}, indent=2))
        sys.exit(1)
    
    input_mint = input_token["address"]
    output_mint = output_token["address"]
    input_decimals = input_token["decimals"]
    output_decimals = output_token["decimals"]
    
    # Calculate amount in smallest units
    amount_raw = int(args.amount * (10 ** input_decimals))
    
    if args.quote:
        # Quote only mode
        print(f"Getting quote: {args.amount} {input_token['symbol']} -> {output_token['symbol']}...", file=sys.stderr)
        result = get_quote(api_key, input_mint, output_mint, amount_raw)
        
        if result.get("success"):
            in_amt = int(result.get("inAmount", amount_raw))
            out_amt = int(result.get("outAmount", 0))
            print(json.dumps({
                "success": True,
                "quote": {
                    "inputToken": input_token["symbol"],
                    "inputMint": input_mint,
                    "outputToken": output_token["symbol"],
                    "outputMint": output_mint,
                    "inputAmount": format_amount(in_amt, input_decimals),
                    "outputAmount": format_amount(out_amt, output_decimals),
                },
                "message": "Quote only. Run without --quote to execute swap.",
            }, indent=2))
        else:
            print(json.dumps(result, indent=2))
            sys.exit(1)
        return
    
    # Execute swap
    print(f"Executing swap: {args.amount} {input_token['symbol']} -> {output_token['symbol']}...", file=sys.stderr)
    result = execute_swap(api_key, input_mint, output_mint, amount_raw)
    
    if result.get("success"):
        in_amt = int(result.get("inAmount", amount_raw))
        out_amt = int(result.get("outAmount", 0))
        print(json.dumps({
            "success": True,
            "swap": {
                "inputToken": input_token["symbol"],
                "inputMint": input_mint,
                "outputToken": output_token["symbol"],
                "outputMint": output_mint,
                "inputAmount": format_amount(in_amt, input_decimals),
                "outputAmount": format_amount(out_amt, output_decimals),
            },
            "signature": result.get("signature"),
            "message": f"Swapped {format_amount(in_amt, input_decimals)} {input_token['symbol']} for {format_amount(out_amt, output_decimals)} {output_token['symbol']}",
        }, indent=2))
    else:
        print(json.dumps({
            "success": False,
            "error": result.get("error", "Swap failed"),
        }, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
