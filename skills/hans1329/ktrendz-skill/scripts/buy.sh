#!/bin/bash
# Buy K-Trendz lightstick token

CONFIG_FILE="$HOME/.config/ktrendz/config.json"
BASE_URL="https://k-trendz.com/api/bot"

# Get API key from config or environment
if [ -n "$KTRENDZ_API_KEY" ]; then
    API_KEY="$KTRENDZ_API_KEY"
elif [ -f "$CONFIG_FILE" ]; then
    API_KEY=$(jq -r '.api_key // empty' "$CONFIG_FILE" 2>/dev/null)
    if [ -z "$API_KEY" ]; then
        API_KEY=$(grep -o '"api_key": *"[^"]*"' "$CONFIG_FILE" | sed 's/"api_key": *"//' | sed 's/"$//')
    fi
else
    echo "✗ Not configured. Run ./scripts/setup.sh first"
    exit 1
fi

# Get artist name from argument
ARTIST="${1:-}"
if [ -z "$ARTIST" ]; then
    echo "Usage: ./scripts/buy.sh <artist_name> [slippage_percent]"
    echo ""
    echo "Run ./scripts/tokens.sh to see available tokens"
    exit 1
fi

SLIPPAGE="${2:-5}"

echo ""
echo "🛒 Buying $ARTIST Token"
echo "========================"
echo ""

# First get price
echo "Fetching current price..."
PRICE_RESPONSE=$(curl -s -X POST "$BASE_URL/token-price" \
    -H "Content-Type: application/json" \
    -H "x-bot-api-key: $API_KEY" \
    -d "{\"artist_name\": \"$ARTIST\"}")

if echo "$PRICE_RESPONSE" | grep -q '"success":true'; then
    if command -v jq &> /dev/null; then
        BUY_COST=$(echo "$PRICE_RESPONSE" | jq -r '.data.buy_cost_usdc')
    else
        BUY_COST=$(echo "$PRICE_RESPONSE" | grep -o '"buy_cost_usdc":[0-9.]*' | cut -d: -f2)
    fi
    echo "Buy cost: \$$BUY_COST USDC (+ ${SLIPPAGE}% slippage tolerance)"
else
    echo "✗ Could not fetch price"
    echo "$PRICE_RESPONSE"
    exit 1
fi

# Execute buy
echo ""
echo "Executing purchase..."

RESPONSE=$(curl -s -X POST "$BASE_URL/buy" \
    -H "Content-Type: application/json" \
    -H "x-bot-api-key: $API_KEY" \
    -d "{\"artist_name\": \"$ARTIST\", \"max_slippage_percent\": $SLIPPAGE}")

# Check for success
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ Purchase Successful!"
    echo ""
    
    if command -v jq &> /dev/null; then
        DATA=$(echo "$RESPONSE" | jq '.data')
        echo "Token:      $(echo "$DATA" | jq -r '.artist_name')"
        echo "Amount:     $(echo "$DATA" | jq -r '.amount') token"
        printf "Cost:       \$%.2f USDC\n" "$(echo "$DATA" | jq -r '.total_cost_usdc')"
        echo "Tx Hash:    $(echo "$DATA" | jq -r '.tx_hash // "pending"')"
        echo ""
        printf "Daily limit remaining: \$%.2f\n" "$(echo "$DATA" | jq -r '.remaining_daily_limit // "N/A"')"
    else
        echo "$RESPONSE"
    fi
else
    echo ""
    echo "✗ Purchase Failed"
    echo ""
    if command -v jq &> /dev/null; then
        echo "$RESPONSE" | jq -r '.error // .'
    else
        echo "$RESPONSE"
    fi
    exit 1
fi

echo ""
