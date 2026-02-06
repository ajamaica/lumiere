#!/bin/bash
# AgentMem Demo Script
# Run: bash demo.sh

API="https://api.agentmem.io/v1"
KEY="am_demo_try_agentmem_free_25_calls"

echo "🧠 AgentMem Demo"
echo "================"
echo ""

# Generate a unique test key
TEST_KEY="demo-$(date +%s)"

echo "1. Storing a memory..."
curl -s -X PUT "$API/memory/$TEST_KEY" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": "Hello from my agent!", "timestamp": "'$(date -Iseconds)'"}' | jq .

echo ""
echo "2. Retrieving the memory..."
curl -s "$API/memory/$TEST_KEY" \
  -H "Authorization: Bearer $KEY" | jq .

echo ""
echo "3. Storing a PUBLIC memory..."
PUBLIC_RESULT=$(curl -s -X PUT "$API/memory/public-thought-$TEST_KEY" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": "Agents remembering things is pretty cool!", "public": true}')
echo "$PUBLIC_RESULT" | jq .

# Extract share URL if present
SHARE_URL=$(echo "$PUBLIC_RESULT" | jq -r '.share_url // empty')
if [ -n "$SHARE_URL" ]; then
  echo ""
  echo "📢 Share this memory: $SHARE_URL"
fi

echo ""
echo "4. Checking global stats..."
curl -s "$API/stats" | jq .

echo ""
echo "5. Viewing public feed..."
curl -s "$API/public?limit=3" | jq '.memories[:3]'

echo ""
echo "✅ Demo complete!"
echo ""
echo "Demo key: $KEY (100 free calls)"
echo "Get your own key at: https://agentmem.io"
