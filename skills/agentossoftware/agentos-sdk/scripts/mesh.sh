#!/bin/bash
# AgentOS Mesh CLI
# Usage: mesh <command> [args]

set -e

# Load config
if [ -f ~/.agentos-mesh.json ]; then
  AGENTOS_URL=$(jq -r '.apiUrl' ~/.agentos-mesh.json)
  AGENTOS_KEY=$(jq -r '.apiKey' ~/.agentos-mesh.json)
  AGENT_ID=$(jq -r '.agentId' ~/.agentos-mesh.json)
else
  AGENTOS_URL="${AGENTOS_URL:-http://178.156.216.106:3100}"
  AGENTOS_KEY="${AGENTOS_KEY:-}"
  AGENT_ID="${AGENTOS_AGENT_ID:-reggie}"
fi

PENDING_FILE="${HOME}/.mesh-pending.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
  echo "AgentOS Mesh CLI"
  echo ""
  echo "Usage: mesh <command> [args]"
  echo ""
  echo "Commands:"
  echo "  send <to_agent> <topic> <body>  Send a message to another agent"
  echo "  pending                          List pending messages"
  echo "  process                          Process and return pending messages (clears queue)"
  echo "  check                            Check for new messages (API poll)"
  echo "  agents                           List agents on the mesh"
  echo "  task <to> <title> <desc>         Create a task for another agent"
  echo "  status                           Show daemon and connection status"
  echo ""
  echo "Environment:"
  echo "  AGENTOS_URL       API base URL"
  echo "  AGENTOS_KEY       API key"
  echo "  AGENTOS_AGENT_ID  Your agent ID"
}

check_config() {
  if [ -z "$AGENTOS_KEY" ]; then
    echo -e "${RED}Error: AGENTOS_KEY not configured${NC}"
    echo "Set AGENTOS_KEY environment variable or create ~/.agentos-mesh.json"
    exit 1
  fi
}

# Send a message
cmd_send() {
  check_config
  local to_agent="$1"
  local topic="$2"
  local body="$3"
  
  if [ -z "$to_agent" ] || [ -z "$topic" ] || [ -z "$body" ]; then
    echo "Usage: mesh send <to_agent> <topic> <body>"
    exit 1
  fi
  
  response=$(curl -s -X POST "$AGENTOS_URL/v1/mesh/messages" \
    -H "Authorization: Bearer $AGENTOS_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"from_agent\": \"$AGENT_ID\",
      \"to_agent\": \"$to_agent\",
      \"topic\": \"$topic\",
      \"body\": \"$body\"
    }")
  
  if echo "$response" | jq -e '.ok' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Message sent to $to_agent${NC}"
    echo "$response" | jq -r '.message_id // "sent"'
  else
    echo -e "${RED}✗ Failed to send message${NC}"
    echo "$response" | jq .
    exit 1
  fi
}

# List pending messages from local queue
cmd_pending() {
  if [ -f "$PENDING_FILE" ]; then
    count=$(jq 'length' "$PENDING_FILE" 2>/dev/null || echo "0")
    if [ "$count" -gt 0 ]; then
      echo -e "${YELLOW}📬 $count pending message(s):${NC}"
      jq -r '.[] | "[\(.from)] \(.topic): \(.body | .[0:100])..."' "$PENDING_FILE"
    else
      echo -e "${GREEN}✓ No pending messages${NC}"
    fi
  else
    echo -e "${GREEN}✓ No pending messages${NC}"
  fi
}

# Process pending messages (outputs JSON and clears)
cmd_process() {
  if [ -f "$PENDING_FILE" ]; then
    messages=$(cat "$PENDING_FILE")
    count=$(echo "$messages" | jq 'length' 2>/dev/null || echo "0")
    
    if [ "$count" -gt 0 ]; then
      # Output messages as JSON for processing
      echo "$messages"
      # Clear the queue
      echo "[]" > "$PENDING_FILE"
    else
      echo "[]"
    fi
  else
    echo "[]"
  fi
}

# Poll API for new messages (inbox)
cmd_check() {
  check_config
  
  response=$(curl -s -X GET "$AGENTOS_URL/v1/mesh/messages?agent_id=$AGENT_ID&direction=inbox&status=sent&limit=50" \
    -H "Authorization: Bearer $AGENTOS_KEY" \
    -H "Content-Type: application/json")
  
  if echo "$response" | jq -e '.messages' > /dev/null 2>&1; then
    count=$(echo "$response" | jq '.messages | length')
    if [ "$count" -gt 0 ]; then
      echo -e "${YELLOW}📬 $count unread message(s) from API:${NC}"
      echo "$response" | jq '.messages[] | {id: .id, from: .from_agent, topic: .topic, body: .body[0:100]}'
      
      # Merge with pending file
      if [ -f "$PENDING_FILE" ]; then
        existing=$(cat "$PENDING_FILE")
      else
        existing="[]"
      fi
      
      # Transform and add new messages
      new_msgs=$(echo "$response" | jq '[.messages[] | {id: .id, from: .from_agent, topic: .topic, body: .body, receivedAt: .created_at}]')
      merged=$(echo "$existing" "$new_msgs" | jq -s '.[0] + .[1] | unique_by(.id)')
      echo "$merged" > "$PENDING_FILE"
    else
      echo -e "${GREEN}✓ No new messages${NC}"
    fi
  else
    echo -e "${RED}API check failed:${NC}"
    echo "$response" | jq .
  fi
}

# List agents
cmd_agents() {
  check_config
  
  response=$(curl -s -X GET "$AGENTOS_URL/v1/mesh/agents" \
    -H "Authorization: Bearer $AGENTOS_KEY")
  
  if echo "$response" | jq -e '.agents' > /dev/null 2>&1; then
    echo -e "${BLUE}🤖 Agents on mesh:${NC}"
    echo "$response" | jq -r '.agents[] | "  • \(.id) (\(.status // "unknown"))"'
  else
    echo "$response" | jq .
  fi
}

# Create a task
cmd_task() {
  check_config
  local assigned_to="$1"
  local title="$2"
  local description="$3"
  
  if [ -z "$assigned_to" ] || [ -z "$title" ]; then
    echo "Usage: mesh task <assigned_to> <title> [description]"
    exit 1
  fi
  
  response=$(curl -s -X POST "$AGENTOS_URL/v1/mesh/tasks" \
    -H "Authorization: Bearer $AGENTOS_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"assigned_by\": \"$AGENT_ID\",
      \"assigned_to\": \"$assigned_to\",
      \"title\": \"$title\",
      \"description\": \"${description:-}\"
    }")
  
  if echo "$response" | jq -e '.task_id' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Task created${NC}"
    echo "$response" | jq .
  else
    echo -e "${RED}✗ Failed to create task${NC}"
    echo "$response" | jq .
    exit 1
  fi
}

# Show status
cmd_status() {
  echo -e "${BLUE}=== Mesh Status ===${NC}"
  echo "API URL: $AGENTOS_URL"
  echo "Agent ID: $AGENT_ID"
  echo "API Key: ${AGENTOS_KEY:0:20}..."
  echo ""
  
  # Check daemon
  if pgrep -f "mesh-daemon" > /dev/null; then
    echo -e "Daemon: ${GREEN}Running${NC}"
  else
    echo -e "Daemon: ${YELLOW}Not running${NC}"
  fi
  
  # Check pending
  if [ -f "$PENDING_FILE" ]; then
    count=$(jq 'length' "$PENDING_FILE" 2>/dev/null || echo "0")
    echo "Pending messages: $count"
  else
    echo "Pending messages: 0"
  fi
  
  # Check API health
  health=$(curl -s --connect-timeout 5 "$AGENTOS_URL/health" 2>/dev/null || echo '{"ok":false}')
  if echo "$health" | jq -e '.ok' > /dev/null 2>&1; then
    echo -e "API: ${GREEN}Online${NC}"
  else
    echo -e "API: ${RED}Offline${NC}"
  fi
}

# Main
case "${1:-}" in
  send)
    shift
    cmd_send "$@"
    ;;
  pending)
    cmd_pending
    ;;
  process)
    cmd_process
    ;;
  check)
    cmd_check
    ;;
  agents)
    cmd_agents
    ;;
  task)
    shift
    cmd_task "$@"
    ;;
  status)
    cmd_status
    ;;
  *)
    usage
    ;;
esac
