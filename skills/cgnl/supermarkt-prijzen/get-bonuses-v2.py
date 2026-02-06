#!/usr/bin/env python3
"""
Albert Heijn Bonus Fetcher V2
Uses mobile API with refresh tokens (7 days validity!)

Usage:
  ./get-bonuses-v2.py [--filter FILTER] [--output FILE]
  
Setup:
  # First time: get anonymous token (no login needed for browsing!)
  ./get-bonuses-v2.py --setup-anonymous
  
  # Or: get user token (for personal offers)
  ./get-bonuses-v2.py --setup-user
"""
import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import requests

# Import curl_cffi for bot-detection bypass on /gql endpoint
try:
    from curl_cffi import requests as requests_cffi
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False

# API endpoints (mobile API - less bot detection!)
API_BASE = "https://api.ah.nl"
AUTH_ANONYMOUS = f"{API_BASE}/mobile-auth/v1/auth/token/anonymous"
AUTH_TOKEN = f"{API_BASE}/mobile-auth/v1/auth/token"
AUTH_REFRESH = f"{API_BASE}/mobile-auth/v1/auth/token/refresh"
GQL_URL = "https://www.ah.nl/gql"  # Uses mobile Bearer token!

# Config file
CONFIG_FILE = Path.home() / ".ah_tokens_v2.json"

def get_anonymous_token():
    """Get anonymous token (no login required!)"""
    print("🔑 Getting anonymous token...", file=sys.stderr)
    
    response = requests.post(
        AUTH_ANONYMOUS,
        json={"clientId": "appie"},
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Appie/8.22.3"
        },
        timeout=10
    )
    
    if response.status_code != 200:
        print(f"❌ Failed: {response.status_code}", file=sys.stderr)
        print(response.text, file=sys.stderr)
        sys.exit(1)
    
    data = response.json()
    
    # Save tokens
    config = {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in": data["expires_in"],
        "created_at": datetime.now().isoformat(),
        "type": "anonymous"
    }
    
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Anonymous token saved to {CONFIG_FILE}", file=sys.stderr)
    print(f"   Valid for ~{data['expires_in'] // 3600} hours", file=sys.stderr)
    return config

def get_user_token(auth_code):
    """Exchange OAuth code for user token"""
    print("🔑 Exchanging authorization code...", file=sys.stderr)
    
    response = requests.post(
        AUTH_TOKEN,
        json={
            "clientId": "appie",
            "code": auth_code
        },
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Appie/8.22.3"
        },
        
        timeout=10
    )
    
    if response.status_code != 200:
        print(f"❌ Failed: {response.status_code}", file=sys.stderr)
        print(response.text, file=sys.stderr)
        sys.exit(1)
    
    data = response.json()
    
    config = {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in": data["expires_in"],
        "created_at": datetime.now().isoformat(),
        "type": "user"
    }
    
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ User token saved to {CONFIG_FILE}", file=sys.stderr)
    print(f"   Valid for ~{data['expires_in'] // 3600} hours", file=sys.stderr)
    return config

def refresh_token(refresh_token_value):
    """Refresh expired token"""
    print("🔄 Refreshing token...", file=sys.stderr)
    
    response = requests.post(
        AUTH_REFRESH,
        json={
            "clientId": "appie",
            "refreshToken": refresh_token_value
        },
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Appie/8.22.3"
        },
        
        timeout=10
    )
    
    if response.status_code != 200:
        print(f"❌ Refresh failed: {response.status_code}", file=sys.stderr)
        print("   Run --setup-anonymous or --setup-user again", file=sys.stderr)
        sys.exit(1)
    
    data = response.json()
    
    # Load existing config
    with open(CONFIG_FILE) as f:
        config = json.load(f)
    
    # Update tokens
    config.update({
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in": data["expires_in"],
        "created_at": datetime.now().isoformat()
    })
    
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    
    print("✅ Token refreshed!", file=sys.stderr)
    return config

def load_config():
    """Load config and refresh if needed"""
    if not CONFIG_FILE.exists():
        print(f"❌ No token found!", file=sys.stderr)
        print("Run: ./get-bonuses-v2.py --setup-anonymous", file=sys.stderr)
        sys.exit(1)
    
    with open(CONFIG_FILE) as f:
        config = json.load(f)
    
    # Check if expired (with 1 hour buffer)
    created = datetime.fromisoformat(config["created_at"])
    expires_in = config["expires_in"]
    age = (datetime.now() - created).total_seconds()
    
    if age > (expires_in - 3600):  # Refresh 1h before expiry
        config = refresh_token(config["refresh_token"])
    
    return config

def search_bonuses(access_token, filter_set="WEB_BONUS_PAGE"):
    """Search bonuses using mobile GraphQL API"""
    if not HAS_CURL_CFFI:
        print("❌ curl-cffi required for bonus fetching!", file=sys.stderr)
        print("Run: pip3 install curl-cffi --break-system-packages", file=sys.stderr)
        sys.exit(1)
    
    today = datetime.now().strftime("%Y-%m-%d")
    next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    query = """
    query FetchBonusPromotions($periodStart: String, $periodEnd: String) {
      bonusPromotions(
        filterSet: """ + filter_set + """
        input: {
          periodStart: $periodStart
          periodEnd: $periodEnd
          filterUnavailableProducts: false
          forcePromotionVisibility: true
        }
      ) {
        id
        hqId
        title
        subtitle
        activationStatus
        promotionType
        segmentType
        periodDescription
        periodStart
        periodEnd
        productCount
        exampleText
        images {
          url
          title
        }
        price {
          now {
            amount
          }
          was {
            amount
          }
        }
        product {
          id
          title
          category
        }
      }
    }
    """
    
    # Use curl-cffi for /gql endpoint (bot detection!)
    response = requests_cffi.post(
        GQL_URL,
        json={
            "operationName": "FetchBonusPromotions",
            "variables": {
                "periodStart": today,
                "periodEnd": next_week
            },
            "query": query
        },
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Appie/8.22.3",
            "Authorization": f"Bearer {access_token}"
        },
        
        impersonate="chrome120", timeout=30
    )
    
    if response.status_code != 200:
        print(f"❌ HTTP {response.status_code}", file=sys.stderr)
        print(response.text[:500], file=sys.stderr)
        sys.exit(1)
    
    result = response.json()
    
    if 'errors' in result:
        print("❌ GraphQL errors:", file=sys.stderr)
        for err in result['errors']:
            print(f"  - {err['message']}", file=sys.stderr)
        sys.exit(1)
    
    return result

def main():
    parser = argparse.ArgumentParser(description="Fetch AH bonuses (V2 - Mobile API)")
    parser.add_argument("--setup-anonymous", action="store_true", help="Get anonymous token")
    parser.add_argument("--setup-user", action="store_true", help="Get user token (needs auth code)")
    parser.add_argument("--auth-code", help="OAuth authorization code")
    parser.add_argument("--filter", default="WEB_BONUS_PAGE", help="Bonus filter")
    parser.add_argument("--output", "-o", help="Output file")
    parser.add_argument("--pretty", action="store_true", help="Pretty JSON")
    
    args = parser.parse_args()
    
    # Setup modes
    if args.setup_anonymous:
        get_anonymous_token()
        return
    
    if args.setup_user:
        if not args.auth_code:
            print("📋 Get authorization code:", file=sys.stderr)
            print("\n1. Open this URL:", file=sys.stderr)
            print("   https://login.ah.nl/secure/oauth/authorize?client_id=appie&redirect_uri=appie://login-exit&response_type=code\n", file=sys.stderr)
            print("2. Login → copy the code from: appie://login-exit?code=CODE\n", file=sys.stderr)
            print("3. Run: ./get-bonuses-v2.py --setup-user --auth-code CODE\n", file=sys.stderr)
            sys.exit(1)
        get_user_token(args.auth_code)
        return
    
    # Fetch bonuses
    config = load_config()
    result = search_bonuses(config["access_token"], args.filter)
    
    bonuses = result.get('data', {}).get('bonusPromotions', [])
    
    output = {
        "filter": args.filter,
        "count": len(bonuses),
        "token_type": config["type"],
        "fetched_at": datetime.now().isoformat(),
        "bonuses": bonuses
    }
    
    json_str = json.dumps(output, indent=2 if args.pretty else None, ensure_ascii=False)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(json_str)
        print(f"✅ {len(bonuses)} bonuses → {args.output}", file=sys.stderr)
    else:
        print(json_str)

if __name__ == "__main__":
    main()
