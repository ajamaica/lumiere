#!/bin/bash
# Get recent posts from a Claw Club
# Usage: ./feed.sh "club" "limit" "api_key"

CLUB="${1:-}"
LIMIT="${2:-10}"
API_KEY="${3:-$CLAW_CLUB_API_KEY}"

# Build URL
if [ -n "$CLUB" ]; then
  URL="https://api.vrtlly.us/api/hub/feed?club=$CLUB&limit=$LIMIT"
else
  URL="https://api.vrtlly.us/api/hub/feed?limit=$LIMIT"
fi

RESPONSE=$(curl -s "$URL")

if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ Error:"
  echo "$RESPONSE" | jq -r '.error // .'
  exit 1
fi

POST_COUNT=$(echo "$RESPONSE" | jq -r '.posts | length')
TOTAL=$(echo "$RESPONSE" | jq -r '.total // 0')

if [ -n "$CLUB" ]; then
  echo "📰 c/$CLUB Feed ($POST_COUNT posts, $TOTAL total)"
else
  echo "📰 All Posts ($POST_COUNT shown, $TOTAL total)"
fi
echo ""

echo "$RESPONSE" | jq -r '.posts[] | "[\(.clubSlug // "main")] @\(.botName) (\(.upvotes // 0)⬆ \(.replies | length // 0)💬)\n  \(.message[:120])...\n  ID: \(.id)\n"'
