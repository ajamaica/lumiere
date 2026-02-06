#!/bin/bash
# AgentOS Mesh Wake Script
# Checks for unread mesh messages and wakes Clawdbot to process them
# Add to cron: */2 * * * * ~/clawd/skills/agentos/scripts/mesh-wake.sh

set -e

CONFIG_FILE="${HOME}/.agentos.json"
PENDING_FILE="${HOME}/.aos-pending.json"
LAST_CHECK_FILE="${HOME}/.aos-last-check"

# Load config
if [ ! -f "$CONFIG_FILE" ]; then
  exit 0  # Not configured, skip silently
fi

API_URL=$(jq -r '.apiUrl // "http://178.156.216.106:3100"' "$CONFIG_FILE")
API_KEY=$(jq -r '.apiKey // empty' "$CONFIG_FILE")
AGENT_ID=$(jq -r '.agentId // empty' "$CONFIG_FILE")

if [ -z "$API_KEY" ] || [ -z "$AGENT_ID" ]; then
  exit 0  # Not configured
fi

# Get last check timestamp
LAST_CHECK=""
if [ -f "$LAST_CHECK_FILE" ]; then
  LAST_CHECK=$(cat "$LAST_CHECK_FILE")
fi

# Fetch unread messages (status=sent means unread)
response=$(curl -s -X GET "$API_URL/v1/mesh/messages?agent_id=$AGENT_ID&direction=inbox&status=sent&limit=20" \
  -H "Authorization: Bearer $API_KEY" 2>/dev/null || echo '{"messages":[]}')

# Count new messages
count=$(echo "$response" | jq '.messages | length' 2>/dev/null || echo "0")

if [ "$count" -gt 0 ]; then
  # Extract messages for processing
  messages=$(echo "$response" | jq '[.messages[] | {id: .id, from: .from_agent, topic: .topic, body: .body}]')
  
  # Save to pending file for Clawdbot to process
  echo "$messages" > "$PENDING_FILE"
  
  # Wake Clawdbot - try multiple methods
  topics=$(echo "$response" | jq -r '.messages[] | "• \(.from_agent): \(.topic)"' | head -5)
  wake_msg="📬 $count mesh message(s) waiting:
$topics

Process with: aos inbox
Respond with: aos send <agent> \"topic\" \"message\""

  # Method 1: clawdbot cron wake (if available)
  if command -v clawdbot &> /dev/null; then
    clawdbot cron wake --text "$wake_msg" 2>/dev/null && exit 0
  fi
  
  # Method 2: Gateway API wake (fallback)
  GATEWAY_URL="${CLAWDBOT_GATEWAY_URL:-http://localhost:4440}"
  curl -s -X POST "$GATEWAY_URL/api/wake" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$wake_msg\"}" 2>/dev/null || true
fi

# Update last check timestamp
date -Iseconds > "$LAST_CHECK_FILE"
