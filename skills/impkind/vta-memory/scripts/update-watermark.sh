#!/bin/bash
# update-watermark.sh — Update the lastProcessedSignal after encoding
# Usage: ./update-watermark.sh [--from-signals]
#
# If --from-signals, reads the last ID from reward-signals.jsonl
# Otherwise, requires --id <signal_id>

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
STATE_FILE="$WORKSPACE/memory/reward-state.json"
SIGNALS_FILE="$WORKSPACE/memory/reward-signals.jsonl"

# Parse arguments
FROM_SIGNALS=false
SIGNAL_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --from-signals)
      FROM_SIGNALS=true
      shift
      ;;
    --id)
      SIGNAL_ID="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [ "$FROM_SIGNALS" = true ]; then
  if [ -f "$SIGNALS_FILE" ]; then
    SIGNAL_ID=$(tail -1 "$SIGNALS_FILE" | jq -r '.id // empty')
  fi
fi

if [ -z "$SIGNAL_ID" ]; then
  echo "⚠️  No signal ID to update watermark"
  echo "Usage: $0 --from-signals  OR  $0 --id <signal_id>"
  exit 0
fi

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Update watermark
jq --arg id "$SIGNAL_ID" --arg now "$NOW" \
   '.lastProcessedSignal = $id | .lastUpdated = $now' \
   "$STATE_FILE" > "$STATE_FILE.tmp"
mv "$STATE_FILE.tmp" "$STATE_FILE"

echo "✅ Watermark updated: $SIGNAL_ID"
