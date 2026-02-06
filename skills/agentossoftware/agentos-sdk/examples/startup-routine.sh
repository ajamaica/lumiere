#!/usr/bin/env bash
# Example: Agent startup routine with AgentOS
# Run this at the start of each session to load context

set -euo pipefail

# Source the SDK
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/agentos.sh"

echo "=== Agent Startup Routine ==="
echo ""

# 1. Check API health
echo "Checking AgentOS connection..."
aos_health || exit 1
echo ""

# 2. Load identity
echo "Loading identity..."
identity=$(aos_get "/self/identity")
if echo "$identity" | jq -e '.found == true' > /dev/null 2>&1; then
  echo "$identity" | jq -r '.value | "Name: \(.name)\nRole: \(.role)"'
else
  echo "No identity found. Consider setting up /self/identity"
fi
echo ""

# 3. Recall recent learnings
echo "Recent learnings to keep in mind:"
aos_recall "important lessons" 3
echo ""

# 4. Recall mistakes to avoid
echo "Recent mistakes to avoid:"
aos_recall "mistakes I made" 3
echo ""

# 5. Check current goals
echo "Current goals:"
goals=$(aos_get "/self/goals")
if echo "$goals" | jq -e '.found == true' > /dev/null 2>&1; then
  echo "$goals" | jq -r '.value.active[]? // "No active goals"'
else
  echo "No goals defined"
fi
echo ""

echo "=== Startup Complete ==="
