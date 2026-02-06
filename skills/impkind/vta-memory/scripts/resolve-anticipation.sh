#!/bin/bash
# resolve-anticipation.sh — Mark an anticipation as resolved (it happened!)
# Usage: ./resolve-anticipation.sh --item "thing that happened" [--reward]
#
# When something you were looking forward to happens, resolve it.
# Optional --reward flag also logs a social/connection reward.

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
STATE_FILE="$WORKSPACE/memory/reward-state.json"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$STATE_FILE" ]; then
  echo "❌ No reward state found at $STATE_FILE"
  exit 1
fi

# Parse arguments
ITEM=""
LOG_REWARD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --item)
      ITEM="$2"
      shift 2
      ;;
    --reward)
      LOG_REWARD=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ -z "$ITEM" ]; then
  echo "Usage: $0 --item \"thing that happened\" [--reward]"
  exit 1
fi

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Check if item exists in anticipating
EXISTS=$(jq -r --arg item "$ITEM" '.anticipating | map(ascii_downcase) | index($item | ascii_downcase) // -1' "$STATE_FILE")

if [ "$EXISTS" = "-1" ]; then
  echo "⚠️  '$ITEM' not found in anticipating list"
  echo ""
  echo "Current anticipations:"
  jq -r '.anticipating[]' "$STATE_FILE" 2>/dev/null || echo "(none)"
  exit 0
fi

# Remove from anticipating
jq --arg item "$ITEM" --arg now "$NOW" \
   '
   .anticipating = [.anticipating[] | select((. | ascii_downcase) != ($item | ascii_downcase))] |
   .anticipatingMeta = (if .anticipatingMeta then
     [.anticipatingMeta[] | select((.item | ascii_downcase) != ($item | ascii_downcase))]
   else [] end) |
   .lastUpdated = $now
   ' "$STATE_FILE" > "$STATE_FILE.tmp"
mv "$STATE_FILE.tmp" "$STATE_FILE"

echo "✨ Anticipation resolved!"
echo "   '$ITEM' happened!"

# Log as reward if requested
if [ "$LOG_REWARD" = true ]; then
  echo ""
  "$SCRIPT_DIR/log-reward.sh" --type social --source "anticipated: $ITEM" --intensity 0.6
fi

# Sync state
"$SCRIPT_DIR/sync-motivation.sh"
