#!/bin/bash
# List available K-Trendz lightstick tokens

CONFIG_FILE="$HOME/.config/ktrendz/config.json"
BASE_URL="https://k-trendz.com/api/bot"

# Get API key from config or environment
if [ -n "$KTRENDZ_API_KEY" ]; then
    API_KEY="$KTRENDZ_API_KEY"
elif [ -f "$CONFIG_FILE" ]; then
    API_KEY=$(jq -r '.api_key // empty' "$CONFIG_FILE" 2>/dev/null)
    if [ -z "$API_KEY" ]; then
        # Fallback for systems without jq
        API_KEY=$(grep -o '"api_key": *"[^"]*"' "$CONFIG_FILE" | sed 's/"api_key": *"//' | sed 's/"$//')
    fi
else
    echo "✗ Not configured. Run ./scripts/setup.sh first"
    exit 1
fi

# Call API
RESPONSE=$(curl -s -X GET "$BASE_URL/tokens" \
    -H "Content-Type: application/json" \
    -H "x-bot-api-key: $API_KEY")

# Check for success
if ! echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✗ API Error"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "🎤 Available K-Trendz Tokens"
echo "============================"
echo ""

# Parse with jq if available, fallback to basic parsing
if command -v jq &> /dev/null; then
    echo "$RESPONSE" | jq -r '.data.tokens[] | "• \(.artist_name) (ID: \(.token_id))\n  Supply: \(.total_supply) | Trending: \(.trending_score)"'
else
    # Basic grep-based parsing
    echo "$RESPONSE" | grep -o '"artist_name":"[^"]*"' | sed 's/"artist_name":"//g' | sed 's/"//g' | while read -r name; do
        echo "• $name"
    done
fi

echo ""
echo "Contract: $(echo "$RESPONSE" | grep -o '"contract_address":"[^"]*"' | sed 's/"contract_address":"//g' | sed 's/"//g')"
echo ""
