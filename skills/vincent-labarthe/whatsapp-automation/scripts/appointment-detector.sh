#!/bin/bash

# Appointment Detector - Scans WhatsApp messages for meetings/appointments
# Sends Telegram alert when pattern is detected

MESSAGES_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/messages.jsonl"
TRACKER_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/.appt-tracker"

# Initialize tracker if needed
[ ! -f "$TRACKER_FILE" ] && echo "0" > "$TRACKER_FILE"

LAST_PROCESSED=$(cat "$TRACKER_FILE")

# Scan for appointment patterns (case-insensitive)
APPOINTMENTS=$(tail -20 "$MESSAGES_FILE" 2>/dev/null | jq -r "select(.timestamp > $LAST_PROCESSED) | select(.text | test(\"meeting|rdv|rendez|appointment\"; \"i\")) | \"\(.text)\"" 2>/dev/null)

if [ -n "$APPOINTMENTS" ]; then
  # Get the latest timestamp we're processing
  LATEST_TS=$(tail -20 "$MESSAGES_FILE" 2>/dev/null | jq -r "select(.text | test(\"meeting|rdv|rendez|appointment\"; \"i\")) | .timestamp" 2>/dev/null | tail -1)
  
  # Save timestamp for next run
  echo "$LATEST_TS" > "$TRACKER_FILE"
  
  # Send Telegram alert for each appointment found
  while IFS= read -r appt; do
    if [ -n "$appt" ]; then
      # Try to extract time/day info from appointment text
      TIME_INFO=$(echo "$appt" | grep -oE "([0-9]{1,2}:[0-9]{2}|[0-9]{1,2}(am|pm|AM|PM)|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)" | head -1 || echo "")
      
      MESSAGE="🗓️ Appointment detected: $appt"
      
      # Send via telegram
      openclaw cron run -m "Send Telegram alert: $MESSAGE" 2>/dev/null || true
    fi
  done <<< "$APPOINTMENTS"
fi
