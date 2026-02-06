#!/bin/bash
# Pomodoro Timer Skill - Start Script

TIMER_DIR="$HOME/clawd/pomodoro-timer"
FOCUS_TIME="${1:-25}"
SHORT_BREAK="${2:-5}"
LONG_BREAK="${3:-15}"

# Check if timer files exist
if [ ! -f "$TIMER_DIR/index.html" ]; then
    echo "Error: Pomodoro timer not found at $TIMER_DIR"
    echo "Run: mkdir -p $TIMER_DIR and create index.html"
    exit 1
fi

# Find available port
PORT=8765
while lsof -i :$PORT >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

# Start HTTP server in background
cd "$TIMER_DIR"
python3 -m http.server $PORT &
SERVER_PID=$!

# Wait for server to start
sleep 1

# Open browser
open "http://localhost:$PORT"

echo "🍅 Pomodoro timer started on http://localhost:$PORT"
echo "   Focus time: ${FOCUS_TIME}min"
echo "   Server PID: $SERVER_PID"
echo ""
echo "Press Ctrl+C to stop server"

# Trap to kill server on exit
trap "kill $SERVER_PID 2>/dev/null; exit" INT TERM

# Keep script running
wait $SERVER_PID
