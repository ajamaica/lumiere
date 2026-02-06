#!/bin/bash
# Create a Telegram forum topic
# Usage: ./create_topic.sh <bot_token> <chat_id> <topic_name> [emoji_id]

set -e

TOKEN="$1"
CHAT_ID="$2"
NAME="$3"
EMOJI_ID="$4"

if [ -z "$TOKEN" ] || [ -z "$CHAT_ID" ] || [ -z "$NAME" ]; then
    echo "Usage: $0 <bot_token> <chat_id> <topic_name> [emoji_id]"
    echo ""
    echo "Example:"
    echo "  $0 'BOT_TOKEN' '-1001234567890' 'My Topic'"
    echo "  $0 'BOT_TOKEN' '-1001234567890' 'My Topic' '5312016608254762256'"
    exit 1
fi

# Create the topic
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TOKEN}/createForumTopic" \
    -H "Content-Type: application/json" \
    -d "{
        \"chat_id\": ${CHAT_ID},
        \"name\": \"${NAME}\"
    }")

echo "$RESPONSE" | jq .

# Check if successful
if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    THREAD_ID=$(echo "$RESPONSE" | jq -r '.result.message_thread_id')
    echo ""
    echo "✅ Topic created successfully!"
    echo "   Thread ID: $THREAD_ID"
    
    # If emoji ID provided, set the icon
    if [ -n "$EMOJI_ID" ]; then
        echo ""
        echo "Setting icon..."
        EDIT_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TOKEN}/editForumTopic" \
            -H "Content-Type: application/json" \
            -d "{
                \"chat_id\": ${CHAT_ID},
                \"message_thread_id\": ${THREAD_ID},
                \"name\": \"${NAME}\",
                \"icon_custom_emoji_id\": \"${EMOJI_ID}\"
            }")
        
        if echo "$EDIT_RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
            echo "✅ Icon set successfully!"
        else
            echo "❌ Failed to set icon:"
            echo "$EDIT_RESPONSE" | jq .
        fi
    fi
else
    echo ""
    echo "❌ Failed to create topic"
    exit 1
fi
