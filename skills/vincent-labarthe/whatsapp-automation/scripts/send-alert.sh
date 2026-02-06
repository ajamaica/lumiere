#!/bin/bash

# Send Telegram Alert - Using Telegram Bot API directly
# Usage: send-alert.sh "message text"

MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
  echo "Usage: send-alert.sh \"message\""
  exit 1
fi

# Log it
TIMESTAMP=$(date +'%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] $MESSAGE" >> "$HOME/.openclaw/workspace/.whatsapp-messages/alerts.log"

# Telegram credentials (from openclaw config)
BOT_TOKEN="7760280308:AAHalIhIAdMKhd8cfgf5jsfq5CEP69HkEsc"
CHAT_ID="7661037126"

# Send message via Telegram Bot API
RESPONSE=$(curl -s -X POST \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": $CHAT_ID, \"text\": \"$MESSAGE\", \"parse_mode\": \"HTML\"}" 2>&1)

# Check if successful
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Alert sent to Telegram"
else
  echo "❌ Failed to send alert: $RESPONSE"
  echo "Message: $MESSAGE"
fi
