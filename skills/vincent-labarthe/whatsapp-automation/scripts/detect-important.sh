#!/bin/bash
set -e

BOT_TOKEN='7760280308:AAHalIhIAdMKhd8cfgf5jsfq5CEP69HkEsc'
CHAT_ID='7661037126'
LAST_FILE="$HOME/.openclaw/workspace/.whatsapp-messages/.urgent-last-id"
JSONL="$HOME/.openclaw/workspace/.whatsapp-messages/messages.jsonl"

LAST=$(cat "$LAST_FILE" 2>/dev/null || echo 0)

while IFS= read -r line; do
  if [ -z "$line" ]; then continue; fi
  
  TS=$(echo "$line" | jq -r '.timestamp // empty' 2>/dev/null)
  TEXT=$(echo "$line" | jq -r '.text // empty' 2>/dev/null)
  CONTACT=$(echo "$line" | jq -r '.contact // empty' 2>/dev/null)
  FROM_ME=$(echo "$line" | jq -r '.fromMe // false' 2>/dev/null)
  
  if [ -z "$TS" ] || [ -z "$TEXT" ] || [ -z "$CONTACT" ]; then
    continue
  fi
  
  # Skip own messages
  if [ "$FROM_ME" == "true" ] || [ "$CONTACT" == "33608093808@c.us" ]; then
    continue
  fi
  
  if [ "$TS" -gt "$LAST" ]; then
    # Check if important
    if echo "$TEXT" | grep -iqE "URGENT|HELP|SOS|EMERGENCY|!!!|problem|crash|blocked|error"; then
      curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
        --data-urlencode "chat_id=$CHAT_ID" \
        --data-urlencode "text=📌 IMPORTANT
$CONTACT
$TEXT" \
        > /dev/null 2>&1
      
      LAST=$TS
    fi
  fi
done < <(jq -c '.' "$JSONL" 2>/dev/null)

echo "$LAST" > "$LAST_FILE"
