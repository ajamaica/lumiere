#!/bin/bash
# quiet-mail Example 1: Create an AI agent

API_BASE="https://api.quiet-mail.com"

echo "Creating AI agent..."

response=$(curl -s -X POST "$API_BASE/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-agent",
    "name": "My AI Assistant"
  }')

echo "$response" | python3 -m json.tool

# Extract and save API key
api_key=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin)['apiKey'])" 2>/dev/null)

if [ -n "$api_key" ]; then
  echo ""
  echo "✅ Agent created successfully!"
  echo "📧 Email: $(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin)['agent']['email'])" 2>/dev/null)"
  echo "🔑 API Key: $api_key"
  echo ""
  echo "⚠️  IMPORTANT: Save your API key!"
  echo "Store it securely:"
  echo "  export QUIETMAIL_API_KEY=\"$api_key\""
  echo "  Or save to file: echo \"$api_key\" > ~/.quietmail_key"
else
  echo ""
  echo "❌ Error creating agent. Check the response above."
fi
