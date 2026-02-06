#!/usr/bin/env python3
"""
Complete AH OAuth flow with browser automation (fast!)
"""
import sys, json, re, time
from curl_cffi import requests

# Step 1: Start authorization
auth_url = "https://login.ah.nl/secure/oauth/authorize"
params = {
    "client_id": "appie",
    "redirect_uri": "appie://login-exit",
    "response_type": "code"
}

print("🌐 Open this URL in your browser and login:")
print(f"{auth_url}?client_id={params['client_id']}&redirect_uri={params['redirect_uri']}&response_type={params['response_type']}")
print()
print("After login, you'll be redirected to: appie://login-exit?code=XXXXX")
print("Paste the FULL redirect URL here:")
print()

redirect = input("Redirect URL: ").strip()

# Extract code
code_match = re.search(r'[?&]code=([^&]+)', redirect)
if not code_match:
    print("❌ No code found in URL!")
    sys.exit(1)

code = code_match.group(1)
print(f"\n✅ Code extracted: {code[:20]}...")

# Step 2: Exchange code for token (IMMEDIATELY!)
print("\n🔄 Exchanging code for token...")

token_url = "https://api.ah.nl/mobile-auth/v1/auth/token"
payload = {
    "clientId": "appie",
    "code": code
}

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Appie/9.29.1 (Android 13)",
}

response = requests.post(token_url, json=payload, headers=headers, impersonate="chrome120", timeout=10)

print(f"Status: {response.status_code}")

if response.status_code == 200:
    # Parse XML response
    xml = response.text
    access_token = re.search(r'<access_token>([^<]+)</access_token>', xml)
    refresh_token = re.search(r'<refresh_token>([^<]+)</refresh_token>', xml)
    expires_in = re.search(r'<expires_in>([^<]+)</expires_in>', xml)
    
    if access_token and refresh_token and expires_in:
        tokens = {
            "access_token": access_token.group(1),
            "refresh_token": refresh_token.group(1),
            "expires_in": int(expires_in.group(1))
        }
        
        print("\n✅ SUCCESS!")
        print(f"Access Token: {tokens['access_token'][:50]}...")
        print(f"Refresh Token: {tokens['refresh_token'][:50]}...")
        print(f"Expires in: {tokens['expires_in']} seconds ({tokens['expires_in']//3600} hours)")
        
        # Save tokens
        with open("/Users/sander/.ah_tokens.json", "w") as f:
            json.dump(tokens, f, indent=2)
        print("\n💾 Tokens saved to ~/.ah_tokens.json")
    else:
        print(f"❌ Failed to parse response:\n{xml}")
        sys.exit(1)
else:
    print(f"❌ FAILED!")
    print(f"Response: {response.text}")
    sys.exit(1)
