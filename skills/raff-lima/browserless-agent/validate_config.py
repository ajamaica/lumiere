#!/usr/bin/env python3
"""
Quick configuration validator for Browserless Agent
Tests if your environment variables are set correctly
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import BROWSERLESS_URL, BROWSERLESS_TOKEN, get_browserless_ws_url

def print_header():
    print("\n" + "="*60)
    print("🔍 Browserless Agent - Configuration Validator")
    print("="*60 + "\n")

def check_env_vars():
    print("📋 Checking Environment Variables...")
    print("-" * 60)
    
    # Check BROWSERLESS_URL
    if BROWSERLESS_URL:
        print(f"✅ BROWSERLESS_URL: {BROWSERLESS_URL}")
    else:
        print("❌ BROWSERLESS_URL: NOT SET")
        print("   Configure in OpenClaw UI or set environment variable")
        return False
    
    # Check BROWSERLESS_TOKEN
    if BROWSERLESS_TOKEN:
        masked_token = BROWSERLESS_TOKEN[:10] + "..." if len(BROWSERLESS_TOKEN) > 10 else "***"
        print(f"✅ BROWSERLESS_TOKEN: {masked_token} (set)")
    else:
        print("⚠️  BROWSERLESS_TOKEN: NOT SET (optional)")
        print("   Set this if your Browserless service requires authentication")
    
    print()
    return True

def validate_url():
    print("🔗 Validating WebSocket URL...")
    print("-" * 60)
    
    ws_url = get_browserless_ws_url()
    
    if not ws_url:
        print("❌ Failed to construct WebSocket URL")
        return False
    
    # Hide token in display
    display_url = ws_url.split('?')[0] if '?' in ws_url else ws_url
    has_token = '?' in ws_url and 'token=' in ws_url
    
    print(f"📍 Base URL: {display_url}")
    print(f"🔐 Token: {'Included' if has_token else 'Not included'}")
    print(f"🌐 Protocol: {'Secure (wss://)' if ws_url.startswith('wss://') else 'Insecure (ws://)'}")
    
    # Check for common issues
    print("\n🔍 Validation Checks:")
    
    checks = []
    
    # Check 1: Protocol
    if ws_url.startswith('wss://') or ws_url.startswith('ws://'):
        checks.append(("Protocol", True, "Valid WebSocket protocol"))
    else:
        checks.append(("Protocol", False, "Must start with wss:// or ws://"))
    
    # Check 2: Endpoint
    if '/playwright' in ws_url:
        checks.append(("Endpoint", True, "Playwright endpoint found"))
    else:
        checks.append(("Endpoint", True, "Will auto-add /playwright/chromium"))
    
    # Check 3: Token format
    if has_token:
        checks.append(("Token", True, "Token parameter present"))
    else:
        checks.append(("Token", True, "No token (OK if not required)"))
    
    for name, status, message in checks:
        symbol = "✅" if status else "❌"
        print(f"  {symbol} {name}: {message}")
    
    print()
    return all(check[1] for check in checks)

def provide_recommendations():
    print("💡 Recommendations:")
    print("-" * 60)
    
    recommendations = []
    
    # Check if using secure connection
    if BROWSERLESS_URL and not BROWSERLESS_URL.startswith('wss://'):
        if 'localhost' not in BROWSERLESS_URL and '127.0.0.1' not in BROWSERLESS_URL:
            recommendations.append("⚠️  Consider using wss:// instead of ws:// for production")
    
    # Check if token is set for cloud services
    if BROWSERLESS_URL and 'browserless.io' in BROWSERLESS_URL and not BROWSERLESS_TOKEN:
        recommendations.append("⚠️  browserless.io usually requires a token. Make sure it's set!")
    
    # Check if using default endpoint
    if BROWSERLESS_URL and '/playwright' not in BROWSERLESS_URL:
        recommendations.append("ℹ️  No endpoint specified. Will use default: /playwright/chromium")
    
    if not recommendations:
        print("✨ Configuration looks good! No recommendations.")
    else:
        for rec in recommendations:
            print(f"  {rec}")
    
    print()

def print_examples():
    print("📚 Configuration Examples:")
    print("-" * 60)
    print("""
# Cloud with token:
BROWSERLESS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=your-secret-token

# Local without token:
BROWSERLESS_URL=ws://localhost:3000

# Custom endpoint:
BROWSERLESS_URL=wss://your-host.com/playwright/firefox
BROWSERLESS_TOKEN=optional-token
""")

def main():
    print_header()
    
    # Step 1: Check environment variables
    if not check_env_vars():
        print("❌ Configuration incomplete. Please set required variables.\n")
        print_examples()
        return 1
    
    # Step 2: Validate WebSocket URL
    if not validate_url():
        print("❌ URL validation failed. Please check your configuration.\n")
        return 1
    
    # Step 3: Provide recommendations
    provide_recommendations()
    
    # Success!
    print("="*60)
    print("✅ Configuration is valid!")
    print("="*60)
    print("\n💡 Next steps:")
    print("   1. Test connection: python tests/test_browserless.py")
    print("   2. Run examples: python examples/quick_test.py")
    print("   3. Use in OpenClaw: Ask agent to use browserless-agent skill\n")
    
    return 0

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}\n")
        sys.exit(1)
