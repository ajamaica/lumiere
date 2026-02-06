#!/bin/bash
# List available Composio apps

set -e

if [ -z "$COMPOSIO_API_KEY" ]; then
  echo "Error: COMPOSIO_API_KEY not set"
  exit 1
fi

echo "📋 Fetching available Composio apps..."
echo ""

curl -s -X GET "https://backend.composio.dev/api/v1/apps" \
  -H "X-API-Key: $COMPOSIO_API_KEY" \
  | jq -r '.items[] | "\(.key): \(.displayName)"' | head -50

echo ""
echo "💡 See full list at: https://docs.composio.dev/apps"
