#!/bin/bash
# Composio Action Executor
# Usage: ./composio-action.sh <app> <action> '<json_params>'

set -e

APP="$1"
ACTION="$2"
PARAMS="${3:-{}}"

if [ -z "$APP" ] || [ -z "$ACTION" ]; then
  echo "Usage: $0 <app> <action> '<json_params>'"
  echo ""
  echo "Examples:"
  echo "  $0 gmail GMAIL_SEND_EMAIL '{\"to\":\"test@example.com\",\"subject\":\"Hi\",\"body\":\"Hello\"}'"
  echo "  $0 googlecalendar GOOGLECALENDAR_LIST_EVENTS '{}'"
  echo "  $0 notion NOTION_CREATE_PAGE '{\"title\":\"New Task\"}'"
  exit 1
fi

if [ -z "$COMPOSIO_API_KEY" ]; then
  echo "Error: COMPOSIO_API_KEY not set"
  echo "Run: export COMPOSIO_API_KEY=\"your_key\""
  exit 1
fi

echo "🚀 Executing Composio action..."
echo "App: $APP"
echo "Action: $ACTION"
echo ""

# Execute the action via Composio API
RESPONSE=$(curl -s -X POST "https://backend.composio.dev/api/v1/actions/$ACTION/execute" \
  -H "X-API-Key: $COMPOSIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"input\": $PARAMS}")

# Check for errors
if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
  echo "❌ Error:"
  echo "$RESPONSE" | jq -r '.error'
  exit 1
fi

# Display result
echo "✅ Success!"
echo ""
echo "$RESPONSE" | jq '.'
