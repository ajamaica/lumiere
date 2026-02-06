#!/usr/bin/env python3
"""
WHOOP OAuth Setup Script
Run this once to authenticate with WHOOP API and get access tokens.
"""

import os
import json
import urllib.parse
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests

class OAuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        
        if parsed_url.path == '/oauth/callback':
            query_params = parse_qs(parsed_url.query)
            
            if 'code' in query_params:
                self.server.auth_code = query_params['code'][0]
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write('''
                <html><body>
                <h2>✅ Authorization successful!</h2>
                <p>You can close this window and return to the terminal.</p>
                </body></html>
                '''.encode('utf-8'))
            else:
                self.send_response(400)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                error = query_params.get('error', ['Unknown error'])[0]
                self.wfile.write(f'<html><body><h2>❌ Error: {error}</h2></body></html>'.encode('utf-8'))

    def log_message(self, format, *args):
        pass  # Suppress HTTP logs

def get_config():
    """Get WHOOP configuration from environment or OpenClaw config"""
    # Import the function from whoop_client
    import sys
    sys.path.append(os.path.dirname(__file__))
    from whoop_client import get_whoop_credentials
    
    client_id, client_secret = get_whoop_credentials()
    
    if not client_id or not client_secret:
        print("❌ Missing WHOOP_CLIENT_ID and/or WHOOP_CLIENT_SECRET")
        print("Please configure with:")
        print("  openclaw configure --section skills")
        print("Or set environment variables:")
        print("  export WHOOP_CLIENT_ID='your_id'")
        print("  export WHOOP_CLIENT_SECRET='your_secret'")
        return None, None
    
    return client_id, client_secret

def start_oauth_flow():
    """Start OAuth authorization flow"""
    client_id, client_secret = get_config()
    if not client_id:
        return False
    
    # OAuth URLs
    auth_url = "https://api.prod.whoop.com/developer/oauth/oauth2/auth"
    token_url = "https://api.prod.whoop.com/developer/oauth/oauth2/token"
    redirect_uri = "http://localhost:18790/oauth/callback"
    
    # Scopes needed for sleep and recovery data
    scopes = ["read:sleep", "read:recovery", "read:cycles", "read:profile"]
    scope_string = " ".join(scopes)
    
    # Build authorization URL
    auth_params = {
        'client_id': client_id,
        'response_type': 'code',
        'redirect_uri': redirect_uri,
        'scope': scope_string
    }
    
    full_auth_url = f"{auth_url}?{urllib.parse.urlencode(auth_params)}"
    
    print("🚀 Starting WHOOP OAuth flow...")
    print(f"🌐 Opening browser: {full_auth_url}")
    
    # Start local server for callback
    server = HTTPServer(('localhost', 18790), OAuthHandler)
    server.auth_code = None
    
    # Open browser
    webbrowser.open(full_auth_url)
    
    print("⏳ Waiting for authorization...")
    print("Please authorize the application in your browser.")
    
    # Wait for callback
    while server.auth_code is None:
        server.handle_request()
    
    auth_code = server.auth_code
    server.server_close()
    
    print("✅ Got authorization code!")
    
    # Exchange code for tokens
    print("🔄 Exchanging code for tokens...")
    
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
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        return False

if __name__ == "__main__":
    print("🏃‍♀️ WHOOP OAuth Setup")
    print("=" * 30)
    
    success = start_oauth_flow()
    
    if success:
        print("\n✅ Setup complete!")
        print("You can now use: python3 scripts/whoop_client.py")
    else:
        print("\n❌ Setup failed!")
        print("Please check your credentials and try again.")