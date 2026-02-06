#!/bin/bash
# Stop OpenClaw Command Center

PID_FILE="/tmp/openclaw-dashboard.pid"
TUNNEL_PID_FILE="/tmp/openclaw-tunnel.pid"

echo "🛑 Stopping OpenClaw Command Center..."

# Stop tunnel
if [ -f "$TUNNEL_PID_FILE" ]; then
    PID=$(cat "$TUNNEL_PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "   Tunnel stopped"
    fi
    rm -f "$TUNNEL_PID_FILE"
fi

# Stop server
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "   Server stopped"
    fi
    rm -f "$PID_FILE"
fi

# Also kill any orphaned processes
pkill -f "node.*lib/server.js" 2>/dev/null
pkill -f "cloudflared.*localhost:3333" 2>/dev/null

echo "✅ Done"
