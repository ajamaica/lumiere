#!/bin/bash
# quiet-mail Example 3: List sent emails

API_BASE="https://api.quiet-mail.com"
AGENT_ID="my-agent"

# Get API key from environment or file
if [ -z "$QUIETMAIL_API_KEY" ]; then
  if [ -f ~/.quietmail_key ]; then
    QUIETMAIL_API_KEY=$(cat ~/.quietmail_key)
  else
    echo "❌ Error: QUIETMAIL_API_KEY not set"
    exit 1
  fi
fi

echo "Fetching sent emails..."

response=$(curl -s "$API_BASE/agents/$AGENT_ID/sent?limit=10" \
  -H "Authorization: Bearer $QUIETMAIL_API_KEY")

echo "$response" | python3 -m json.tool

total=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin)['total'])" 2>/dev/null)

if [ -n "$total" ]; then
  echo ""
  echo "📊 Total sent emails: $total"
fi
