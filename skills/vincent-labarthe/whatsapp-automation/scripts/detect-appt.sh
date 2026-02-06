#!/bin/bash

BOT_TOKEN='7760280308:AAHalIhIAdMKhd8cfgf5jsfq5CEP69HkEsc'
CHAT_ID='7661037126'
LAST_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/.appt-last-id"
PENDING_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/.pending-appts"
JSONL="$HOME/.openclaw/workspace/.whatsapp-messages/messages.jsonl"

LAST=$(cat "$LAST_FILE" 2>/dev/null || echo 0)
NEW_LAST=$LAST

# Extract ONLY new appointment messages since last run
jq -c 'select(.timestamp > '"$LAST"' and .contact != "33608093808@c.us" and (.text | test("meeting|rdv|rendez-vous|reunion|appointment"; "i")))' "$JSONL" 2>/dev/null | while read -r line; do
  if [ -z "$line" ]; then continue; fi
  
  TS=$(echo "$line" | jq -r '.timestamp')
  TEXT=$(echo "$line" | jq -r '.text')
  CONTACT=$(echo "$line" | jq -r '.contact')
  
  # Send to Telegram
  curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    --data-urlencode "chat_id=$CHAT_ID" \
    --data-urlencode "text=🗓️ APPOINTMENT
$CONTACT
$TEXT" \
    > /dev/null 2>&1
  
  # Log to pending file (only once per TS)
  if ! grep -q "TS=$TS" "$PENDING_FILE" 2>/dev/null; then
    echo "TS=$TS|TEXT=$TEXT|CONTACT=$CONTACT" >> "$PENDING_FILE"
  fi
  
  NEW_LAST=$TS
done

# Write final timestamp ONLY if we processed something new
if [ "$NEW_LAST" -gt "$LAST" ]; then
  echo "$NEW_LAST" > "$LAST_FILE"
fi
