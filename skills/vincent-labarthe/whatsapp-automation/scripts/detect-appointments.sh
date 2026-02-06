#!/bin/bash

# Appointment Detector v3 - STRICT MATCHING
# Only detects REAL appointments: "meeting", "rdv", "rendez-vous"

MESSAGES_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/messages.jsonl"
TRACKER_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/.appt-last-id"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Initialize tracker
[ ! -f "$TRACKER_FILE" ] && echo "0" > "$TRACKER_FILE"
LAST_ID=$(cat "$TRACKER_FILE")

# Read latest messages, STRICT filter for appointment patterns
FOUND=0
jq -r "select(.timestamp > $LAST_ID) | select(.text | test(\"\\bmeeting\\b|\\brdv\\b|rendez.vous\"; \"i\")) | \"\(.timestamp)|\(.text)\"" "$MESSAGES_FILE" 2>/dev/null | while IFS='|' read -r TS TEXT; do
  if [ -n "$TS" ] && [ -n "$TEXT" ]; then
    echo "$TS" > "$TRACKER_FILE"
    
    # Extract time/day if present
    TIME_HINT=$(echo "$TEXT" | grep -oE "(demain|aujourd|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|[0-9]{1,2}h|[0-9]{1,2}:[0-9]{2})" | head -1 || echo "")
    
    if [ -n "$TIME_HINT" ]; then
      ALERT="🗓️ Meeting: $TIME_HINT"
    else
      ALERT="🗓️ Meeting detected"
    fi
    
    bash "$SCRIPT_DIR/send-alert.sh" "$ALERT" 2>/dev/null
    FOUND=1
  fi
done

[ $FOUND -eq 1 ] && echo "Appointment alert sent" || echo "No new appointments"
