#!/usr/bin/env python3
"""
Albert Heijn Mobile API OAuth Flow
Get access tokens for the mobile GraphQL API (api.ah.nl/graphql)

Usage:
  # Step 1: Get authorization code
  ./ah-mobile-auth.py get-auth-url
  # → Open URL in browser, login, copy code from failed redirect
  
  # Step 2: Exchange code for tokens
  ./ah-mobile-auth.py authorize --code YOUR_CODE
  # → Saves tokens to ~/.ah_mobile_tokens.json
  
  # Step 3: Use tokens
  ./ah-mobile-auth.py test
"""
import argparse
import json
import sys
from pathlib import Path
from curl_cffi import requests

# API endpoints
AUTH_URL = "https://api.ah.nl/mobile-auth/v1/auth/token"
REFRESH_URL = "https://api.ah.nl/mobile-auth/v1/auth/token/refresh"
GRAPHQL_URL = "https://api.ah.nl/graphql"
OAUTH_URL = "https://login.ah.nl/secure/oauth/authorize?client_id=appie&redirect_uri=appie://login-exit&response_type=code"

# Token storage
TOKEN_FILE = Path.home() / ".ah_mobile_tokens.json"

def get_auth_url():
    """Print OAuth authorization URL"""
    print("📝 Step 1: Get Authorization Code")
    print()
    print("1. Open this URL in your browser:")
    print(f"   {OAUTH_URL}")
    print()
    print("2. Login with your AH credentials")
    print()
    print("3. Browser will redirect to: appie://login-exit?code=XXXXXX")
    print("   (This will fail - that's expected!)")
    print()
    print("4. Open browser DevTools → Network tab")
    print("   Find the failed redirect request")
    print("   Copy the 'code' parameter from the URL")
    print()
    print("5. Run: ./ah-mobile-auth.py authorize --code YOUR_CODE")
    print()

def authorize(code):
    """Exchange authorization code for access token"""
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Appie/8.22.3",
        "X-Application": "AHWEBSHOP"
    }
    
    payload = {
        "clientId": "appie",
        "code": code
    }
    
    print(f"🔐 Exchanging code for tokens...")
    
    response = requests.post(
        AUTH_URL,
        headers=headers,
        json=payload,
        impersonate="chrome120"
    )
    
    if not response.ok:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    result = response.json()
    
    # Save tokens
    tokens = {
        "access_token": result.get("access_token"),
        "refresh_token": result.get("refresh_token"),
        "token_type": result.get("token_type", "Bearer"),
        "expires_in": result.get("expires_in")
    }
    
    with open(TOKEN_FILE, 'w') as f:
        json.dump(tokens, f, indent=2)
    
    print(f"✅ Tokens saved to {TOKEN_FILE}")
    print(f"   Access token: {tokens['access_token'][:30]}...")
    print(f"   Expires in: {tokens.get('expires_in')} seconds")
    print()
    print("Test with: ./ah-mobile-auth.py test")

def refresh_token():
    """Refresh access token using refresh token"""
    if not TOKEN_FILE.exists():
        print(f"❌ No tokens found. Run: ./ah-mobile-auth.py authorize --code YOUR_CODE")
        sys.exit(1)
    
    with open(TOKEN_FILE) as f:
        tokens = json.load(f)
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Appie/8.22.3",
        "X-Application": "AHWEBSHOP"
    }
    
    payload = {
        "clientId": "appie",
        "refreshToken": tokens["refresh_token"]
    }
    
    print("🔄 Refreshing access token...")
    
    response = requests.post(
        REFRESH_URL,
        headers=headers,
        json=payload,
        impersonate="chrome120"
    )
    
    if not response.ok:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    result = response.json()
    
    # Update tokens
    tokens["access_token"] = result.get("access_token")
    tokens["refresh_token"] = result.get("refresh_token")
    
    with open(TOKEN_FILE, 'w') as f:
        json.dump(tokens, f, indent=2)
    
    print(f"✅ Token refreshed!")
    print(f"   New access token: {tokens['access_token'][:30]}...")

def test_api():
    """Test GraphQL API with stored tokens"""
    if not TOKEN_FILE.exists():
        print(f"❌ No tokens found. Run: ./ah-mobile-auth.py authorize --code YOUR_CODE")
        sys.exit(1)
    
    with open(TOKEN_FILE) as f:
        tokens = json.load(f)
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {tokens['access_token']}",
        "User-Agent": "Appie/8.22.3",
        "X-Application": "AHWEBSHOP"
    }
    
    # Test with simple query
    query = """
    {
        __schema {
            queryType {
                name
            }
        }
    }
    """
    
    print("🧪 Testing GraphQL API...")
    
    response = requests.post(
        GRAPHQL_URL,
        headers=headers,
        json={"query": query},
        impersonate="chrome120"
    )
    
    print(f"Status: {response.status_code}")
    
    if response.ok:
        print("✅ API access successful!")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"❌ API error:")
        print(response.text)

def introspect():
    """Get full GraphQL schema via introspection"""
    if not TOKEN_FILE.exists():
        print(f"❌ No tokens found. Run: ./ah-mobile-auth.py authorize --code YOUR_CODE")
        sys.exit(1)
    
    with open(TOKEN_FILE) as f:
        tokens = json.load(f)
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {tokens['access_token']}",
        "User-Agent": "Appie/8.22.3",
        "X-Application": "AHWEBSHOP"
    }
    
    # Full introspection query
    query = """
    {
        __schema {
            queryType {
                name
                fields {
                    name
                    description
                    args {
                        name
                        type {
                            name
                        }
                    }
                }
            }
            mutationType {
                name
                fields {
                    name
                    description
                    args {
                        name
                        type {
                            name
                        }
                    }
                }
            }
        }
    }
    """
    
    print("🔍 Fetching GraphQL schema...")
    
    response = requests.post(
        GRAPHQL_URL,
        headers=headers,
        json={"query": query},
        impersonate="chrome120"
    )
    
    if response.ok:
        data = response.json()
        
        # Queries
        queries = data.get('data', {}).get('__schema', {}).get('queryType', {}).get('fields', [])
        print(f"\n📋 QUERIES ({len(queries)}):")
        for q in queries:
            desc = q.get('description', '')[:60]
            print(f"  - {q['name']}: {desc}")
        
        # Mutations
        mutations = data.get('data', {}).get('__schema', {}).get('mutationType', {}).get('fields', [])
        print(f"\n✏️ MUTATIONS ({len(mutations)}):")
        for m in mutations:
            desc = m.get('description', '')[:60]
            print(f"  - {m['name']}: {desc}")
        
        # Save full schema
        schema_file = Path("ah-mobile-schema.json")
        with open(schema_file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\n💾 Full schema saved to {schema_file}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

def main():
    parser = argparse.ArgumentParser(description="AH Mobile API OAuth")
    subparsers = parser.add_subparsers(dest="command")
    
    # get-auth-url
    subparsers.add_parser("get-auth-url", help="Print OAuth URL")
    
    # authorize
    auth_parser = subparsers.add_parser("authorize", help="Exchange code for tokens")
    auth_parser.add_argument("--code", required=True, help="OAuth authorization code")
    
    # refresh
    subparsers.add_parser("refresh", help="Refresh access token")
    
    # test
    subparsers.add_parser("test", help="Test API access")
    
    # introspect
    subparsers.add_parser("introspect", help="Get full GraphQL schema")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == "get-auth-url":
        get_auth_url()
    elif args.command == "authorize":
        authorize(args.code)
    elif args.command == "refresh":
        refresh_token()
    elif args.command == "test":
        test_api()
    elif args.command == "introspect":
        introspect()

if __name__ == "__main__":
    main()
