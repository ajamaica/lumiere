#!/bin/bash
# digest-sessions — Extract learnings from session logs
# Usage: digest-sessions [--all | --recent N | --dry-run]

set -e

# Support custom paths via environment
WORKSPACE="${RECALL_WORKSPACE:-$HOME/.openclaw/workspace}"
SESSIONS_DIR="${RECALL_SESSIONS_DIR:-$HOME/.openclaw/agents/main/sessions}"
MEMORY_DIR="$WORKSPACE/memory"
DIGEST_DIR="$MEMORY_DIR/session-digests"
STATE_FILE="$MEMORY_DIR/.digest-state.json"

DRY_RUN=false
RECENT=""
ALL=false

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --all) ALL=true; shift ;;
        --recent) RECENT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Create directories
mkdir -p "$DIGEST_DIR"

# Initialize state file if missing
if [[ ! -f "$STATE_FILE" ]]; then
    echo '{"processed":[],"lastRun":0}' > "$STATE_FILE"
fi

# Check if sessions dir exists
if [[ ! -d "$SESSIONS_DIR" ]]; then
    echo "⚠ Sessions directory not found: $SESSIONS_DIR"
    exit 0
fi

# Get already processed sessions
processed=$(jq -r '.processed[]' "$STATE_FILE" 2>/dev/null || echo "")

# Find sessions to process
if [[ -n "$(ls -A "$SESSIONS_DIR"/*.jsonl 2>/dev/null)" ]]; then
    all_sessions=$(ls -1 "$SESSIONS_DIR"/*.jsonl 2>/dev/null | xargs -I{} basename {} .jsonl)
else
    echo "No session files found in $SESSIONS_DIR"
    exit 0
fi

new_sessions=""

if [[ "$ALL" == "true" ]]; then
    new_sessions="$all_sessions"
else
    for s in $all_sessions; do
        if ! echo "$processed" | grep -q "^${s}$"; then
            new_sessions="$new_sessions $s"
        fi
    done
fi

# Apply --recent limit
if [[ -n "$RECENT" ]]; then
    new_sessions=$(echo "$new_sessions" | tr ' ' '\n' | tail -n "$RECENT" | tr '\n' ' ')
fi

if [[ -z "$(echo $new_sessions | tr -d ' ')" ]]; then
    echo "✓ No new sessions to digest."
    exit 0
fi

echo "🦊 Jasper Recall — Session Digester"
echo "=" * 40
echo "Sessions to process: $(echo $new_sessions | wc -w)"
echo ""

# Process each session
for session_id in $new_sessions; do
    session_file="$SESSIONS_DIR/${session_id}.jsonl"
    [[ ! -f "$session_file" ]] && continue
    
    size=$(du -h "$session_file" | cut -f1)
    msgs=$(wc -l < "$session_file")
    date=$(stat -c %y "$session_file" 2>/dev/null | cut -d' ' -f1 || stat -f %Sm -t %Y-%m-%d "$session_file" 2>/dev/null || echo "unknown")
    
    echo "Processing: ${session_id:0:8}... ($size, $msgs messages)"
    
    # Extract key info using jq
    topics=$(jq -r 'select(.message.role == "user") | .message.content | 
        if type == "array" then 
            map(select(.type == "text") | .text) | join(" ") 
        else . end' "$session_file" 2>/dev/null | \
        grep -v "^\[message_id:" | \
        grep -v "^System:" | \
        grep -v "^{" | \
        head -10 || echo "")
    
    tools=$(jq -r '.message.content[]? | select(.type == "toolCall") | .name' "$session_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | head -5 | awk '{print $2 " (" $1 "x)"}' | tr '\n' ', ' | sed 's/, $//' || echo "")
    
    # Create digest file for this session
    digest_file="$DIGEST_DIR/${session_id:0:8}-$date.md"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        cat > "$digest_file" << EOF
# Session ${session_id:0:8} — $date

**Size:** $size | **Messages:** $msgs
**Tools:** ${tools:-none}

## Topics

$(echo "$topics" | head -5 | sed 's/^/- /' | grep -v "^- $" || echo "- (no topics extracted)")

---
*Full session: $session_file*
EOF
        
        # Update state
        jq --arg s "$session_id" '.processed += [$s] | .lastRun = now' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
        echo "  ✓ Created: $(basename $digest_file)"
    else
        echo "  [dry-run] Would create: $(basename $digest_file)"
    fi
done

echo ""
echo "✓ Digests saved to: $DIGEST_DIR"
