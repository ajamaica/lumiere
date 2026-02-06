#!/usr/bin/env python3
"""
AH Mobile API tool using OAuth Bearer token
"""
import sys, json, argparse
from curl_cffi import requests

def load_token():
    try:
        with open("/Users/sander/.ah_tokens.json") as f:
            return json.load(f)['access_token']
    except Exception as e:
        print(f"❌ No token found. Run OAuth flow first!", file=sys.stderr)
        sys.exit(1)

def get_receipts(token):
    """Get all receipts"""
    url = "https://api.ah.nl/mobile-services/v1/receipts"
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "Appie/8.22.3",
    }
    r = requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
    return r.json() if r.status_code == 200 else {"error": r.text, "status": r.status_code}

def get_receipt(token, transaction_id):
    """Get specific receipt details"""
    url = f"https://api.ah.nl/mobile-services/v2/receipts/{transaction_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "Appie/8.22.3",
    }
    r = requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
    return r.json() if r.status_code == 200 else {"error": r.text, "status": r.status_code}

def search_products(token, query, limit=30):
    """Search products (from gist example)"""
    url = f"https://api.ah.nl/mobile-services/product/search/v2"
    params = {
        "query": query,
        "sortOn": "RELEVANCE",
        "size": limit,
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "Appie/8.22.3",
    }
    r = requests.get(url, params=params, headers=headers, impersonate="chrome120", timeout=10)
    return r.json() if r.status_code == 200 else {"error": r.text, "status": r.status_code}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AH OAuth API tool")
    parser.add_argument("action", choices=["receipts", "receipt", "search"])
    parser.add_argument("--id", help="Transaction ID for receipt action")
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--limit", type=int, default=30)
    parser.add_argument("--pretty", action="store_true")
    
    args = parser.parse_args()
    token = load_token()
    
    if args.action == "receipts":
        result = get_receipts(token)
    elif args.action == "receipt":
        if not args.id:
            print("❌ --id required", file=sys.stderr)
            sys.exit(1)
        result = get_receipt(token, args.id)
    elif args.action == "search":
        if not args.query:
            print("❌ --query required", file=sys.stderr)
            sys.exit(1)
        result = search_products(token, args.query, args.limit)
    
    print(json.dumps(result, indent=2 if args.pretty else None, ensure_ascii=False))
