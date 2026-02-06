#!/bin/bash
# Omi.me Token Manager
# Usage: omi-token.sh [get|test|set]

CONFIG_DIR="$HOME/.config/omi-me"
TOKEN_FILE="$CONFIG_DIR/token"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

get_token() {
    if [ -f "$TOKEN_FILE" ]; then
        cat "$TOKEN_FILE"
    else
        echo ""
    fi
}

case "$1" in
    get)
        TOKEN=$(get_token)
        if [ -z "$TOKEN" ]; then
            echo "Error: OMI_API_TOKEN not configured."
            echo "Run 'omi-token.sh set' to configure."
            exit 1
        fi
        echo "$TOKEN"
        ;;
    
    test)
        TOKEN=$(get_token)
        if [ -z "$TOKEN" ]; then
            echo "✗ OMI_API_TOKEN not configured."
            echo "Run 'omi-token.sh set' to configure."
            exit 1
        fi
        
        echo "Testing Omi.me connection..."
        RESULT=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "https://api.omi.me/v1/dev/user/memories")
        
        if [ "$RESULT" = "200" ]; then
            echo "✓ Connected successfully!"
            echo ""
            echo "Memories count: $(curl -s -H "Authorization: Bearer $TOKEN" "https://api.omi.me/v1/dev/user/memories" | jq -r '. | length')"
        elif [ "$RESULT" = "401" ]; then
            echo "✗ Invalid API token. Run 'omi-token.sh set' to update."
            exit 1
        else
            echo "? Connection returned HTTP $RESULT"
            exit 1
        fi
        ;;
    
    set)
        echo "🧠 Omi.me Token Configuration"
        echo ""
        echo "Get your API token from: https://docs.omi.me/doc/developer/api/overview"
        echo ""
        read -p "Paste your OMI_API_TOKEN: " -s TOKEN
        echo ""
        
        if [ -z "$TOKEN" ]; then
            echo "Error: No token provided."
            exit 1
        fi
        
        echo "$TOKEN" > "$TOKEN_FILE"
        chmod 600 "$TOKEN_FILE"
        echo "✓ Token saved to $TOKEN_FILE"
        echo ""
        echo "Test your connection with: omi-token.sh test"
        ;;
    
    help|--help|-h)
        echo "🧠 Omi.me Token Manager"
        echo ""
        echo "Usage: omi-token.sh [get|test|set]"
        echo ""
        echo "Commands:"
        echo "  get   - Print current API token"
        echo "  test  - Test connection to Omi.me API"
        echo "  set   - Interactively configure API token"
        echo ""
        echo "Files:"
        echo "  $TOKEN_FILE"
        ;;
    
    "")
        TOKEN=$(get_token)
        if [ -z "$TOKEN" ]; then
            echo "✗ OMI_API_TOKEN not configured."
            echo "Run 'omi-token.sh set' to configure."
            echo ""
            echo "Or manually: echo 'your-token' > $TOKEN_FILE"
        else
            echo "✓ Token configured"
        fi
        ;;
    
    *)
        echo "Unknown command: $1"
        echo "Run 'omi-token.sh help' for usage"
        ;;
esac
