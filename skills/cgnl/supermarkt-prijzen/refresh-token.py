#!/usr/bin/env python3
"""
Refresh AH OAuth token using refresh_token
"""
import sys, json
from curl_cffi import requests

# Load existing tokens
try:
    with open("/Users/sander/.ah_tokens.json") as f:
        tokens = json.load(f)
        refresh_token = tokens['refresh_token']
except Exception as e:
    print(f"❌ Failed to load tokens: {e}")
    sys.exit(1)

url = "https://api.ah.nl/mobile-auth/v1/auth/token/refresh"
payload = {
    "clientId": "appie",
    "refreshToken": refresh_token
}

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Appie/8.22.3",
}

print(f"🔄 Refreshing token...")
r = requests.post(url, json=payload, headers=headers, impersonate="chrome120", timeout=10)

print(f"Status: {r.status_code}")

if r.status_code == 200:
    new_tokens = r.json()
    print("\n✅ SUCCESS!")
    print(f"New Access Token: {new_tokens['access_token'][:50]}...")
    print(f"New Refresh Token: {new_tokens['refresh_token'][:50]}...")
    print(f"Expires in: {new_tokens['expires_in']} sec ({new_tokens['expires_in']//3600}h)")
    
    with open("/Users/sander/.ah_tokens.json", "w") as f:
        json.dump(new_tokens, f, indent=2)
    print("\n💾 Updated ~/.ah_tokens.json")
else:
    print(f"❌ Refresh failed!")
    print(f"Response: {r.text}")
    sys.exit(1)
