#!/bin/bash
# Start OpenClaw Command Center
# Usage: ./start.sh [--tunnel]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3333
TUNNEL=false
PID_FILE="/tmp/openclaw-dashboard.pid"
TUNNEL_PID_FILE="/tmp/openclaw-tunnel.pid"

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --tunnel|-t)
            TUNNEL=true
            shift
            ;;
        --port|-p)
            PORT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Check if already running
if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    echo "⚠️  Dashboard already running (PID: $(cat $PID_FILE))"
    echo "   Stop it first: ./stop.sh"
    exit 1
fi

echo "🚀 Starting OpenClaw Command Center..."
echo ""

# Start the Node.js server
cd "$SCRIPT_DIR/.."
PORT=$PORT node lib/server.js &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

sleep 1

# Check if server started
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Failed to start server"
    exit 1
fi

echo "✅ Dashboard running at http://localhost:$PORT"

# Start tunnel if requested
if [ "$TUNNEL" = true ]; then
    echo ""
    echo "🌐 Starting Cloudflare tunnel..."
    cloudflared tunnel --url http://localhost:$PORT &
    TUNNEL_PID=$!
    echo $TUNNEL_PID > "$TUNNEL_PID_FILE"
    
    # Wait a moment for the tunnel URL to appear
    sleep 3
    echo ""
    echo "📋 Tunnel should be active. Look for the trycloudflare.com URL above."
fi

echo ""
echo "📊 Dashboard: http://localhost:$PORT"
echo "🛑 To stop: $SCRIPT_DIR/stop.sh"
