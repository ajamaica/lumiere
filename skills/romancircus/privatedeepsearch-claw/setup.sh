#!/bin/bash
# Setup script for privatedeepsearch-claw
# Generates a unique secret key for your SearXNG instance
# ⚠️  VPN REQUIRED - Check that VPN is active before proceeding

set -e

echo "🚨 VPN CHECK REQUIRED"
echo "Before proceeding, ensure your VPN is active."
echo "Without VPN, you're exposing your real IP to search engines."
echo ""
echo "🔐 Setting up private deep claw..."

# Check if VPN is recommended
if command -v curl &> /dev/null; then
    REAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
    if [[ "$REAL_IP" != "unknown" ]] && [[ ! "$REAL_IP" =~ ^(10\.|172\.|192\.168\.) ]]; then
        echo "⚠️  WARNING: Detected real IP address: $REAL_IP"
        echo "Please connect to VPN before continuing."
        echo ""
    fi
fi

# Generate random secret key
SECRET_KEY=$(openssl rand -hex 32)

# Replace placeholder in settings
SETTINGS_FILE="docker/searxng/settings.yml"
if grep -q "CHANGE_THIS_TO_A_RANDOM_STRING" "$SETTINGS_FILE"; then
    sed -i "s/CHANGE_THIS_TO_A_RANDOM_STRING/$SECRET_KEY/" "$SETTINGS_FILE"
    echo "✅ Generated unique secret key"
else
    echo "⚠️  Secret key already configured"
fi

# Start SearXNG
echo "🚀 Starting SearXNG..."
cd docker
docker-compose up -d

echo ""
echo "✅ private deep claw is ready at http://localhost:8888"
echo ""
echo "Install skills:"
echo "  cp -r skills/* ~/.clawdbot/skills/"
echo ""
echo "Test search:"
echo "  curl -s 'http://localhost:8888/search?q=hello&format=json' | jq '.results[:3]'"