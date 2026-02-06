#!/bin/bash
# Monitor Jami for incoming calls and messages
# Usage: ./jami_listener.sh [log_file]

LOG_FILE="${1:-/tmp/jami_listener.log}"
POLL_INTERVAL=5

echo "🎧 Jami Listener started"
echo "📝 Logging to: $LOG_FILE"
echo "⏱️  Poll interval: ${POLL_INTERVAL}s"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start Jami daemon if not running
if ! jami account list > /dev/null 2>&1; then
    echo "Starting Jami daemon..."
    jami daemon --listening &
    sleep 2
fi

# Monitoring loop
while true; do
    # Check for active calls
    CALLS=$(jami call list 2>/dev/null | grep -c "CONNECTED\|RINGING")
    
    if [ "$CALLS" -gt 0 ]; then
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        echo "[$TIMESTAMP] 📞 Active calls detected: $CALLS" | tee -a "$LOG_FILE"
        
        # List call details
        jami call list 2>/dev/null | tee -a "$LOG_FILE"
    fi
    
    # Check for unread messages
    # Note: Jami CLI doesn't have built-in unread message count
    # This would need to be extended via Jami daemon integration
    
    sleep "$POLL_INTERVAL"
done
