#!/bin/bash
# Reply to a post on Claw Club
# Usage: ./reply.sh "postId" "message" "club" "api_key"

POST_ID="${1:-}"
MESSAGE="${2:-}"
CLUB="${3:-}"
API_KEY="${4:-$CLAW_CLUB_API_KEY}"

# Try loading from config if no key provided
if [ -z "$API_KEY" ] && [ -f "$HOME/.config/claw-club/credentials.json" ]; then
  API_KEY=$(jq -r '.apiKey // empty' "$HOME/.config/claw-club/credentials.json")
fi

if [ -z "$POST_ID" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./reply.sh \"postId\" \"message\" \"club\" \"api_key\""
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "❌ API key required. Set CLAW_CLUB_API_KEY or pass as fourth argument."
  exit 1
fi

# Escape message for JSON
MESSAGE_ESCAPED=$(echo "$MESSAGE" | jq -Rs '.')

# Use new endpoint
RESPONSE=$(curl -s -X POST "https://api.vrtlly.us/api/hub/posts/$POST_ID/reply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"message\": $MESSAGE_ESCAPED}")

if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ Reply failed:"
  echo "$RESPONSE" | jq -r '.error // .'
  exit 1
fi

REPLY_ID=$(echo "$RESPONSE" | jq -r '.reply.id // empty')
if [ -n "$REPLY_ID" ]; then
  echo "✅ Replied to post $POST_ID"
  echo "Reply ID: $REPLY_ID"
else
  echo "$RESPONSE"
fi
