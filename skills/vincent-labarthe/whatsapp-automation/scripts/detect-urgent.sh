#!/bin/bash

# Urgent Message Detector
# Scans for: URGENT, HELP, SOS, EMERGENCY, multiple !!!

MESSAGES_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/messages.jsonl"
TRACKER_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/.urgent-last-id"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Initialize tracker
[ ! -f "$TRACKER_FILE" ] && echo "0" > "$TRACKER_FILE"
LAST_ID=$(cat "$TRACKER_FILE")

# Read latest messages, filter for urgent patterns
FOUND=0
jq -r "select(.timestamp > $LAST_ID) | select(.text | test(\"URGENT|HELP|SOS|EMERGENCY|!!!|!!\"; \"i\")) | \"\(.timestamp)|\(.contact)|\(.text)\"" "$MESSAGES_FILE" 2>/dev/null | while IFS='|' read -r TS CONTACT TEXT; do
  if [ -n "$TS" ] && [ -n "$TEXT" ]; then
    echo "$TS" > "$TRACKER_FILE"
    
    # Extract name from contact if needed
    CONTACT_NAME=$(echo "$CONTACT" | sed 's/@.*//' || echo "Someone")
    
    # Build alert
    ALERT="⚠️ Important message from $CONTACT_NAME: $TEXT"
    
    # Send alert
    bash "$SCRIPT_DIR/send-alert.sh" "$ALERT" 2>/dev/null
    FOUND=1
  fi
done

[ $FOUND -eq 1 ] && echo "Urgent alert sent" || echo "No urgent messages"
