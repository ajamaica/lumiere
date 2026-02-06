#!/bin/bash
# OpenClaw Security Monitor - Telegram Alert Setup
# Usage: telegram-setup.sh [chat_id]

OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
LOG_DIR="$OPENCLAW_DIR/logs"
CHAT_ID_FILE="$LOG_DIR/telegram-chat-id"
TELEGRAM_TOKEN="${OPENCLAW_TELEGRAM_TOKEN:-}"

if [ -z "$TELEGRAM_TOKEN" ]; then
    echo "Error: OPENCLAW_TELEGRAM_TOKEN environment variable not set."
    echo "Export your Telegram bot token first:"
    echo "  export OPENCLAW_TELEGRAM_TOKEN='your-bot-token'"
    exit 1
fi

mkdir -p "$LOG_DIR"

if [ -n "${1:-}" ]; then
    echo "$1" > "$CHAT_ID_FILE"
    echo "Chat ID set to: $1"
else
    echo "Discovering chat ID from recent messages..."
    UPDATES=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?limit=5" --connect-timeout 10 2>/dev/null)
    CHAT_ID=$(echo "$UPDATES" | grep -o '"chat":{"id":[0-9]*' | head -1 | grep -o '[0-9]*$')
    if [ -n "$CHAT_ID" ]; then
        echo "$CHAT_ID" > "$CHAT_ID_FILE"
        echo "Auto-discovered chat ID: $CHAT_ID"
    else
        echo "No messages found. Send any message to the bot first, then re-run."
        exit 1
    fi
fi

# Send test message
STORED_ID=$(cat "$CHAT_ID_FILE" | tr -d '[:space:]')
RESULT=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -d "chat_id=${STORED_ID}" \
    -d "text=OpenClaw Security Monitor: Telegram alerts configured successfully." \
    --connect-timeout 10 2>/dev/null)

if echo "$RESULT" | grep -q '"ok":true'; then
    echo "Test message sent successfully."
else
    echo "Failed to send test message. Check bot token and chat ID."
    echo "Response: $RESULT"
fi
