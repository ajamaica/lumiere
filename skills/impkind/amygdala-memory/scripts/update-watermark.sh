#!/bin/bash
# update-watermark.sh — Advance the watermark after processing emotional signals
#
# Usage:
#   update-watermark.sh --from-signals   # Set to last signal ID
#   update-watermark.sh --to <id>        # Set to specific ID

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
STATE_FILE="$WORKSPACE/memory/emotional-state.json"
SIGNALS_FILE="$WORKSPACE/memory/emotional-signals.jsonl"

# Parse args
FROM_SIGNALS=false
SPECIFIC_ID=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --from-signals) FROM_SIGNALS=true; shift ;;
        --to) SPECIFIC_ID="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ "$FROM_SIGNALS" = true ]; then
    # Check if signals file exists and has content
    if [ ! -f "$SIGNALS_FILE" ]; then
        echo "ℹ️ No signals file found - nothing to update"
        exit 0
    fi
    
    if [ ! -s "$SIGNALS_FILE" ]; then
        echo "ℹ️ Signals file is empty - nothing to update"
        exit 0
    fi
    
    LAST_ID=$(tail -1 "$SIGNALS_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
    
    if [ -z "$LAST_ID" ]; then
        echo "ℹ️ No valid signal ID found - nothing to update"
        exit 0
    fi
    
    SPECIFIC_ID="$LAST_ID"
fi

if [ -z "$SPECIFIC_ID" ]; then
    echo "Usage: update-watermark.sh --from-signals OR --to <id>"
    exit 1
fi

# Update the state file
if [ ! -f "$STATE_FILE" ]; then
    echo "⚠️ No state file found at $STATE_FILE"
    exit 1
fi

OLD_WATERMARK=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('lastProcessedSignal','(none)'))" 2>/dev/null || echo "(none)")

python3 -c "
import json
from datetime import datetime

with open('$STATE_FILE') as f:
    state = json.load(f)

state['lastProcessedSignal'] = '$SPECIFIC_ID'
state['lastUpdated'] = datetime.now().isoformat()

with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
"

echo "✅ Watermark updated: $OLD_WATERMARK → $SPECIFIC_ID"
