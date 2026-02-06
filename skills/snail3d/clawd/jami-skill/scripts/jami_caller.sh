#!/bin/bash
# Jami automated calling script
# Usage: ./jami_caller.sh <contact_id> [duration_seconds] [message]

CONTACT_ID="$1"
DURATION="${2:-30}"
MESSAGE="${3:-}"
ACCOUNT_ID="${JAMI_ACCOUNT_ID:-}"

if [ -z "$CONTACT_ID" ]; then
    echo "Usage: $0 <contact_id> [duration_seconds] [message]"
    echo ""
    echo "Example:"
    echo "  $0 abc123def456 30 'Hello from Clawdbot'"
    exit 1
fi

if [ -z "$ACCOUNT_ID" ]; then
    # Try to get default account
    ACCOUNT_ID=$(jami account list | head -1)
    if [ -z "$ACCOUNT_ID" ]; then
        echo "Error: No Jami account found. Set JAMI_ACCOUNT_ID or register an account."
        exit 1
    fi
fi

echo "📞 Calling $CONTACT_ID..."
echo "   Account: $ACCOUNT_ID"
echo "   Duration: ${DURATION}s"

# Initiate call
CALL_ID=$(jami call "$ACCOUNT_ID" "$CONTACT_ID" 2>&1 | grep -oE '[a-f0-9]{8}' | head -1)

if [ -z "$CALL_ID" ]; then
    echo "❌ Failed to initiate call"
    exit 1
fi

echo "✅ Call initiated (ID: $CALL_ID)"

# Send message if provided
if [ -n "$MESSAGE" ]; then
    echo "📨 Sending message: $MESSAGE"
    jami message send "$CONTACT_ID" "$MESSAGE" 2>/dev/null || true
fi

# Wait for duration
echo "⏱️  Call active for $DURATION seconds..."
sleep "$DURATION"

# Hangup
echo "📞 Ending call..."
jami hangup "$CALL_ID" 2>/dev/null || true

echo "✅ Call ended"
