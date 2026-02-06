#!/usr/bin/env python3
import sys, json, re
from curl_cffi import requests

code = "39cc16a0-12b5-424e-b9ea-1123712145d5"
url = "https://api.ah.nl/mobile-auth/v1/auth/token"

payload = {"clientId": "appie", "code": code}
headers = {
    "Content-Type": "application/json",
    "User-Agent": "Appie/8.22.3",
}

print(f"⚡ Exchanging code...")
r = requests.post(url, json=payload, headers=headers, impersonate="chrome120", timeout=10)

print(f"Status: {r.status_code}")
print(f"Raw response:\n{r.text}\n")

if r.status_code == 200:
    xml = r.text
    access_token = re.search(r'<access_token>([^<]+)</access_token>', xml)
    refresh_token = re.search(r'<refresh_token>([^<]+)</refresh_token>', xml)
    expires_in = re.search(r'<expires_in>([^<]+)</expires_in>', xml)
    
    if access_token and refresh_token and expires_in:
        tokens = {
            "access_token": access_token.group(1),
            "refresh_token": refresh_token.group(1),
            "expires_in": int(expires_in.group(1))
        }
        
        print("✅ SUCCESS!")
        print(f"Access Token: {tokens['access_token'][:50]}...")
        print(f"Refresh Token: {tokens['refresh_token'][:50]}...")
        print(f"Expires in: {tokens['expires_in']} sec ({tokens['expires_in']//3600}h)")
        
        with open("/Users/sander/.ah_tokens.json", "w") as f:
            json.dump(tokens, f, indent=2)
        print("\n💾 Saved to ~/.ah_tokens.json")
    else:
        print(f"❌ Failed to parse XML")
        sys.exit(1)
else:
    print(f"❌ {r.text}")
    sys.exit(1)
