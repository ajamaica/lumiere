#!/bin/bash
# Get K-Trendz token price and signals

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
    echo "Usage: ./scripts/price.sh <artist_name>"
    echo ""
    echo "Run ./scripts/tokens.sh to see available tokens"
    exit 1
fi

# Call API
RESPONSE=$(curl -s -X POST "$BASE_URL/token-price" \
    -H "Content-Type: application/json" \
    -H "x-bot-api-key: $API_KEY" \
    -d "{\"artist_name\": \"$ARTIST\"}")

# Check for success
if ! echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✗ API Error"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "🎤 $ARTIST Token Price"
echo "========================"
echo ""

# Parse with jq if available
if command -v jq &> /dev/null; then
    DATA=$(echo "$RESPONSE" | jq '.data')
    
    PRICE=$(echo "$DATA" | jq -r '.current_price_usdc')
    BUY=$(echo "$DATA" | jq -r '.buy_cost_usdc')
    SELL=$(echo "$DATA" | jq -r '.sell_refund_usdc')
    CHANGE=$(echo "$DATA" | jq -r '.price_change_24h // "N/A"')
    SUPPLY=$(echo "$DATA" | jq -r '.total_supply')
    TRENDING=$(echo "$DATA" | jq -r '.trending_score')
    FOLLOWERS=$(echo "$DATA" | jq -r '.follower_count')
    VIEWS=$(echo "$DATA" | jq -r '.view_count')
    
    printf "💰 Current Price: \$%.2f USDC\n" "$PRICE"
    printf "📈 Buy Cost:      \$%.2f USDC\n" "$BUY"
    printf "📉 Sell Refund:   \$%.2f USDC\n" "$SELL"
    echo ""
    echo "📊 24h Change:    ${CHANGE}%"
    echo ""
    echo "📈 Total Supply:    $SUPPLY tokens"
    echo "🔥 Trending Score:  $TRENDING"
    echo "👥 Followers:       $FOLLOWERS"
    echo "👀 Views:           $VIEWS"
    
    # News signals
    NEWS_COUNT=$(echo "$DATA" | jq -r '.external_signals.article_count_24h // 0')
    HAS_NEWS=$(echo "$DATA" | jq -r '.external_signals.has_recent_news // false')
    
    if [ "$NEWS_COUNT" != "0" ] && [ "$NEWS_COUNT" != "null" ]; then
        echo ""
        echo "📰 News Signals:"
        echo "   Articles (24h): $NEWS_COUNT"
        if [ "$HAS_NEWS" = "true" ]; then
            echo "   Has Recent News: ✅ Yes"
        else
            echo "   Has Recent News: ❌ No"
        fi
        
        # Show headlines if available
        HEADLINES=$(echo "$DATA" | jq -r '.external_signals.headlines[]?.title // empty' 2>/dev/null)
        if [ -n "$HEADLINES" ]; then
            echo "   Headlines:"
            echo "$HEADLINES" | head -3 | while read -r h; do
                echo "   • ${h:0:60}..."
            done
        fi
    fi
else
    # Basic parsing without jq
    echo "$RESPONSE"
fi

echo ""
