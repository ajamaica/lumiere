#!/bin/bash
# decay-drive.sh — Drive decays without rewards over time
# Usage: ./decay-drive.sh [--dry-run]
#
# Without rewards, motivation fades. This mimics dopamine baseline return.

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
STATE_FILE="$WORKSPACE/memory/reward-state.json"

if [ ! -f "$STATE_FILE" ]; then
  echo "❌ No reward state found"
  exit 1
fi

DRY_RUN=false
[ "$1" = "--dry-run" ] && DRY_RUN=true

# Decay rate: 15% toward baseline per run
DECAY_RATE=0.15

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

CURRENT_DRIVE=$(jq -r '.drive' "$STATE_FILE")
BASELINE=$(jq -r '.baseline.drive' "$STATE_FILE")

# Calculate decay
DIFF=$(awk -v b="$BASELINE" -v c="$CURRENT_DRIVE" 'BEGIN {print b - c}')
CHANGE=$(awk -v d="$DIFF" -v r="$DECAY_RATE" 'BEGIN {printf "%.3f", d * r}')
NEW_DRIVE=$(awk -v c="$CURRENT_DRIVE" -v ch="$CHANGE" 'BEGIN {printf "%.2f", c + ch}')

echo "⭐ Drive Decay"
echo "─────────────────────"
echo ""
echo "Drive: $CURRENT_DRIVE → $NEW_DRIVE (baseline: $BASELINE)"

# Check for stale anticipations (older than 7 days)
STALE_CUTOFF=$(date -u -v-7d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "7 days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "(dry run - no changes made)"
else
  # Update drive and prune stale anticipations (if they have timestamps)
  jq --argjson drive "$NEW_DRIVE" --arg now "$NOW" --arg cutoff "$STALE_CUTOFF" \
     '
     .drive = $drive | 
     .lastUpdated = $now |
     # Prune anticipations older than cutoff (if they have addedAt field)
     .anticipatingMeta = (if .anticipatingMeta then
       [.anticipatingMeta[] | select(.addedAt == null or .addedAt > $cutoff)]
     else [] end) |
     # Keep anticipating array in sync
     .anticipating = (if .anticipatingMeta then
       [.anticipatingMeta[].item]
     else .anticipating end)
     ' "$STATE_FILE" > "$STATE_FILE.tmp"
  mv "$STATE_FILE.tmp" "$STATE_FILE"
  
  echo ""
  echo "✅ Drive decayed"
  
  # Sync to VTA_STATE.md
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [ -f "$SCRIPT_DIR/sync-motivation.sh" ]; then
    "$SCRIPT_DIR/sync-motivation.sh"
  fi
fi
