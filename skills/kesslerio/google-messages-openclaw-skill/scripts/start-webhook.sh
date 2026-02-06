#!/usr/bin/env bash
# Start the SMS webhook server
#
# Usage: ./start-webhook.sh
#
# Environment variables (set before running):
#   SMS_NOTIFICATION_TARGET  - Where to send notifications (e.g., "telegram:123456")
#   SMS_NOTIFICATION_CHANNEL - Channel type (default: telegram)
#   SMS_WEBHOOK_PORT         - Port to listen on (default: 19888)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Check for node
if ! command -v node &> /dev/null; then
    echo "Error: node is not installed"
    exit 1
fi

# Check for openclaw (needed for forwarding)
if ! command -v openclaw &> /dev/null; then
    echo "Warning: openclaw CLI not found - forwarding will fail"
fi

# Check for required environment
if [ -z "$SMS_NOTIFICATION_TARGET" ]; then
    echo "Warning: SMS_NOTIFICATION_TARGET not set"
    echo "Notifications will be logged but not forwarded"
    echo ""
    echo "Set it like:"
    echo "  export SMS_NOTIFICATION_TARGET='telegram:123456789'"
    echo ""
fi

cd "$SCRIPT_DIR"
exec node sms-webhook-server.js
