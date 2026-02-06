#!/usr/bin/env python3
"""
Manual WHOOP OAuth Setup - no local server required
"""

import os
import json
import urllib.parse
import requests
from whoop_client import get_whoop_credentials

def manual_oauth():
    """Manual OAuth flow - user copies authorization code"""
    
    client_id, client_secret = get_whoop_credentials()
    if not client_id:
        print("❌ Missing credentials")
        return False
    
    # Build authorization URL  
    auth_url = "https://api.prod.whoop.com/oauth/oauth2/auth"
    redirect_uri = "http://localhost:18789/oauth/callback"  # Must match WHOOP Dashboard registration
    scopes = ["read:sleep", "read:recovery", "read:cycles"]  # Removed read:profile
    
    import secrets
    state = secrets.token_urlsafe(16)  # Generate secure random state
    
    auth_params = {
        'client_id': client_id,
        'response_type': 'code', 
        'redirect_uri': redirect_uri,
        'scope': ' '.join(scopes),
        'state': state
    }
    
    full_auth_url = f"{auth_url}?{urllib.parse.urlencode(auth_params)}"
    
    print("🏃‍♀️ WHOOP Manual OAuth Setup")
    print("=" * 40)
    print("1. Open this URL in browser:")
    print(f"   {full_auth_url}")
    print()
    print("2. Authorize the app in WHOOP")
    print("3. Copy the 'code' parameter from redirect URL")
    print("   (Example: https://example.com/callback?code=ABC123...)")
    print()
    
    auth_code = input("Paste the authorization code here: ").strip()
    
    if not auth_code:
        print("❌ No code provided")
        return False
    
    # Exchange code for tokens
    print("🔄 Exchanging code for tokens...")
    token_url = "https://api.prod.whoop.com/oauth/oauth2/token"
    
    token_data = {
        'grant_type': 'authorization_code',
        'code': auth_code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri
    }
    
    try:
        response = requests.post(token_url, data=token_data)
        response.raise_for_status()
        
        tokens = response.json()
        
        # Save tokens
        config_path = os.path.expanduser("~/.openclaw/whoop_tokens.json")
        with open(config_path, 'w') as f:
            json.dump(tokens, f, indent=2)
        
        print("✅ Tokens saved successfully!")
        print(f"📁 Config saved to: {config_path}")
        print("\n🎉 WHOOP integration ready!")
        
        return True
        
    except requests.RequestException as e:
        print(f"❌ Token exchange failed: {e}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        return False

if __name__ == "__main__":
    manual_oauth()