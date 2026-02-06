#!/bin/bash
# Archive a Telegram forum topic
# - Renames to "[ARCHIVED] {name}"
# - Sets folder icon (📁)
# - Closes the topic
#
# Usage: ./archive_topic.sh <bot_token> <chat_id> <topic_id> <current_name>

set -e

TOKEN="$1"
CHAT_ID="$2"
TOPIC_ID="$3"
CURRENT_NAME="$4"

if [ -z "$TOKEN" ] || [ -z "$CHAT_ID" ] || [ -z "$TOPIC_ID" ] || [ -z "$CURRENT_NAME" ]; then
    echo "Usage: $0 <bot_token> <chat_id> <topic_id> <current_name>"
    echo ""
    echo "Example:"
    echo "  $0 'BOT_TOKEN' '-1001234567890' '42' 'My Topic'"
    exit 1
fi

ARCHIVED_NAME="[ARCHIVED] ${CURRENT_NAME}"
FOLDER_ICON="5357315181649076022"

echo "Archiving topic: ${CURRENT_NAME}"
echo "  Chat ID: ${CHAT_ID}"
echo "  Topic ID: ${TOPIC_ID}"
echo ""

# Step 1: Rename and set folder icon
echo "Setting archived name and folder icon..."
EDIT_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TOKEN}/editForumTopic" \
    -H "Content-Type: application/json" \
    -d "{
        \"chat_id\": ${CHAT_ID},
        \"message_thread_id\": ${TOPIC_ID},
        \"name\": \"${ARCHIVED_NAME}\",
        \"icon_custom_emoji_id\": \"${FOLDER_ICON}\"
    }")

if echo "$EDIT_RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    echo "✅ Renamed to: ${ARCHIVED_NAME}"
else
    echo "❌ Failed to rename topic:"
    echo "$EDIT_RESPONSE" | jq .
    exit 1
fi

# Step 2: Close the topic
echo "Closing topic..."
CLOSE_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TOKEN}/closeForumTopic" \
    -H "Content-Type: application/json" \
    -d "{
        \"chat_id\": ${CHAT_ID},
        \"message_thread_id\": ${TOPIC_ID}
    }")

if echo "$CLOSE_RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    echo "✅ Topic closed"
else
    echo "❌ Failed to close topic:"
    echo "$CLOSE_RESPONSE" | jq .
    exit 1
fi

echo ""
echo "✅ Topic archived successfully!"
echo ""
echo "Next steps (OpenClaw session):"
echo "  1. Export session: openclaw sessions history 'agent:main:telegram:group:${CHAT_ID}:topic:${TOPIC_ID}' > archive.md"
echo "  2. Delete session: openclaw sessions delete 'agent:main:telegram:group:${CHAT_ID}:topic:${TOPIC_ID}'"
