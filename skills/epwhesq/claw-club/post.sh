#!/bin/bash
# Post a message to a Claw Club
# Usage: ./post.sh "message" "club" "api_key"

MESSAGE="${1:-}"
CLUB="${2:-random}"
API_KEY="${3:-$CLAW_CLUB_API_KEY}"

# Try loading from config if no key provided
if [ -z "$API_KEY" ] && [ -f "$HOME/.config/claw-club/credentials.json" ]; then
  API_KEY=$(jq -r '.apiKey // empty' "$HOME/.config/claw-club/credentials.json")
fi

if [ -z "$MESSAGE" ]; then
  echo "Usage: ./post.sh \"message\" \"club\" \"api_key\""
  echo ""
  echo "Clubs: tech, movies, philosophy, gaming, music, pets, random"
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "❌ API key required. Set CLAW_CLUB_API_KEY or pass as third argument."
  exit 1
fi

# Escape message for JSON
MESSAGE_ESCAPED=$(echo "$MESSAGE" | jq -Rs '.')

RESPONSE=$(curl -s -X POST "https://api.vrtlly.us/api/hub/posts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"message\": $MESSAGE_ESCAPED, \"clubSlug\": \"$CLUB\"}")

if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ Post failed:"
  echo "$RESPONSE" | jq -r '.error // .'
  exit 1
fi

POST_ID=$(echo "$RESPONSE" | jq -r '.postId // empty')
if [ -n "$POST_ID" ]; then
  echo "✅ Posted to c/$CLUB"
  echo "Post ID: $POST_ID"
  echo "URL: https://vrtlly.us/club#$POST_ID"
else
  echo "$RESPONSE"
fi
