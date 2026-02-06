#!/bin/bash
# Location check cron - runs periodically to check geofences and send notifications
# Uses Clawdbot's messaging system (works with Signal, Telegram, etc.)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configure your notification target (phone number, @username, or channel ID)
# Examples:
#   NOTIFY_TARGET="+1234567890"           # Signal phone number
#   NOTIFY_TARGET="@username"             # Telegram username  
#   NOTIFY_TARGET="channel:telegram:123"  # Specific channel
NOTIFY_TARGET="${CLAWDBOT_NOTIFY_TARGET:-}"

# Optional: specify channel (signal, telegram, etc.) - usually auto-detected from target
NOTIFY_CHANNEL="${CLAWDBOT_NOTIFY_CHANNEL:-}"

send_notification() {
    local message="$1"
    if [[ -z "$NOTIFY_TARGET" ]]; then
        echo "$message"  # Fallback: just print to stdout
        return
    fi
    
    local cmd=(clawdbot message send --target "$NOTIFY_TARGET" --message "$message")
    [[ -n "$NOTIFY_CHANNEL" ]] && cmd+=(--channel "$NOTIFY_CHANNEL")
    
    "${cmd[@]}" >/dev/null 2>&1 || echo "Failed to send: $message"
}

# Run location check
RESULT=$("$SCRIPT_DIR/location.sh" check --json 2>/dev/null) || exit 0

# Parse results
ACTIONS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(a['action'] for a in d.get('actions',[])))" 2>/dev/null || true)
REMINDERS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(r['text'] for r in d.get('reminders',[])))" 2>/dev/null || true)
ALERTS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(a['text'] for a in d.get('proximity_alerts',[])))" 2>/dev/null || true)

# Handle shopping_tasks action (customize for your task list)
if [[ "$ACTIONS" == *"shopping_tasks"* ]]; then
    # Example: SHOPPING=$(your-task-list-command)
    SHOPPING="Shopping list not configured"
    send_notification $'🛒 You'\''re at the store!\n\n'"$SHOPPING"
fi

# Handle reminders
if [[ -n "$REMINDERS" ]]; then
    while IFS= read -r reminder; do
        [[ -n "$reminder" ]] && send_notification "📍 Reminder: $reminder"
    done <<< "$REMINDERS"
fi

# Handle proximity alerts
if [[ -n "$ALERTS" ]]; then
    while IFS= read -r alert; do
        [[ -n "$alert" ]] && send_notification "📍 $alert"
    done <<< "$ALERTS"
fi
