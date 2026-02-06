#!/bin/bash
# OpenClaw Security Monitor - Daily Automated Scan with Telegram Alerts
# Designed for cron: 0 6 * * * /path/to/daily-scan-cron.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
LOG_DIR="$OPENCLAW_DIR/logs"
CRON_LOG="$LOG_DIR/cron.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

mkdir -p "$LOG_DIR"

# Update IOC database before scanning
echo "$TIMESTAMP INFO: Updating IOC database..." >> "$CRON_LOG"
IOC_OUTPUT=$("$SCRIPT_DIR/update-ioc.sh" 2>&1) || true
IOC_UPDATES=$(echo "$IOC_OUTPUT" | grep "Updates available:" | grep -o '[0-9]*')
IOC_THREATS=$(echo "$IOC_OUTPUT" | grep "Threats found:" | grep -o '[0-9]*')
echo "$TIMESTAMP INFO: IOC update done (updates=${IOC_UPDATES:-0}, threats=${IOC_THREATS:-0})" >> "$CRON_LOG"

# Run scan
SCAN_OUTPUT=$("$SCRIPT_DIR/scan.sh" 2>&1)
SCAN_EXIT=$?

# Determine status
case $SCAN_EXIT in
    0) STATUS="SECURE" ;;
    1) STATUS="WARNING" ;;
    2) STATUS="COMPROMISED" ;;
    *) STATUS="ERROR" ;;
esac

# Log
echo "$TIMESTAMP $STATUS: Scan completed (exit=$SCAN_EXIT)" >> "$CRON_LOG"

# Build alert message
HOSTNAME=$(hostname -s 2>/dev/null || echo "unknown")
SUMMARY=$(echo "$SCAN_OUTPUT" | grep "^SCAN COMPLETE:" | tail -1)
IOC_LINE=""
if [ "${IOC_UPDATES:-0}" != "0" ] || [ "${IOC_THREATS:-0}" != "0" ]; then
    IOC_LINE="IOC: ${IOC_UPDATES:-0} updates, ${IOC_THREATS:-0} threats"
fi
MSG="[$STATUS] OpenClaw Security Scan
Host: $HOSTNAME
Time: $TIMESTAMP
$SUMMARY
$IOC_LINE"

# Send via Telegram
TELEGRAM_TOKEN="${OPENCLAW_TELEGRAM_TOKEN:-}"
CHAT_ID_FILE="$LOG_DIR/telegram-chat-id"

send_telegram() {
    local chat_id="$1"
    local text="$2"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -d "chat_id=${chat_id}" \
        -d "text=${text}" \
        -d "parse_mode=Markdown" \
        --connect-timeout 10 \
        --max-time 15 > /dev/null 2>&1
}

# Try openclaw message send first
if command -v openclaw &>/dev/null; then
    openclaw message send "$MSG" 2>/dev/null && exit 0
fi

# Fallback: direct Telegram API
if [ -z "$TELEGRAM_TOKEN" ]; then
    echo "$TIMESTAMP WARNING: OPENCLAW_TELEGRAM_TOKEN not set. Skipping Telegram alert." >> "$CRON_LOG"
    exit 0
fi
if [ -f "$CHAT_ID_FILE" ]; then
    CHAT_ID=$(cat "$CHAT_ID_FILE" | tr -d '[:space:]')
    if [ -n "$CHAT_ID" ]; then
        send_telegram "$CHAT_ID" "$MSG"
    else
        echo "$TIMESTAMP WARNING: Empty Telegram chat ID" >> "$CRON_LOG"
    fi
else
    # Try to discover chat ID
    UPDATES=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?limit=5" --connect-timeout 10 2>/dev/null)
    DISCOVERED_ID=$(echo "$UPDATES" | grep -o '"chat":{"id":[0-9]*' | head -1 | grep -o '[0-9]*$')
    if [ -n "$DISCOVERED_ID" ]; then
        echo "$DISCOVERED_ID" > "$CHAT_ID_FILE"
        send_telegram "$DISCOVERED_ID" "$MSG"
        echo "$TIMESTAMP INFO: Auto-discovered Telegram chat ID: $DISCOVERED_ID" >> "$CRON_LOG"
    else
        echo "$TIMESTAMP WARNING: No Telegram chat ID. Send any message to the bot first." >> "$CRON_LOG"
    fi
fi
