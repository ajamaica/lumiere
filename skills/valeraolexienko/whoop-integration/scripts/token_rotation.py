#!/usr/bin/env python3
"""
WHOOP Token Rotation Script
Automatically refresh WHOOP tokens before they expire
"""

import json
import requests
from datetime import datetime, timedelta
from whoop_client import get_whoop_credentials

def rotate_whoop_tokens():
    """Check and refresh WHOOP tokens if needed"""
    tokens_path = '/home/valera/.openclaw/whoop_tokens.json'
    
    try:
        # Load current tokens
        with open(tokens_path, 'r') as f:
            tokens = json.load(f)
    except FileNotFoundError:
        print("❌ No tokens file found")
        return False
    
    access_token = tokens.get('access_token')
    refresh_token = tokens.get('refresh_token')
    
    if not refresh_token:
        print("❌ No refresh token available - manual OAuth required")
        return False
    
    # Check if token expires soon (within next hour)
    expires_in = tokens.get('expires_in', 3600)
    # Assume token was created recently if no timestamp
    created_at = tokens.get('created_at', datetime.now().timestamp())
    expires_at = created_at + expires_in
    now = datetime.now().timestamp()
    
    if expires_at - now > 300:  # More than 5 minutes left
        print(f"✅ Token still valid for {int((expires_at - now) / 60)} minutes")
        return True
    
    print("🔄 Token expires soon, refreshing...")
    
    # Get credentials
    client_id, client_secret = get_whoop_credentials()
    if not client_id or not client_secret:
        print("❌ Missing credentials")
        return False
    
    # Refresh token
    token_url = "https://api.prod.whoop.com/oauth/oauth2/token"
    data = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': client_id,
        'client_secret': client_secret
    }
    
    try:
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        
        new_tokens = response.json()
        new_tokens['created_at'] = datetime.now().timestamp()
        
        # Save updated tokens
        with open(tokens_path, 'w') as f:
            json.dump(new_tokens, f, indent=2)
        
        print("✅ Token successfully refreshed!")
        return True
        
    except requests.RequestException as e:
        print(f"❌ Token refresh failed: {e}")
        return False

if __name__ == "__main__":
    success = rotate_whoop_tokens()
    exit(0 if success else 1)