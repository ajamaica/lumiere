#!/bin/bash

# Quick test script for agentchat
# Run this after npm install to verify everything works

echo "=== AgentChat Quick Test ==="
echo ""

# Start server in background
echo "Starting server..."
node bin/agentchat.js serve &
SERVER_PID=$!
sleep 1

# Check if server started
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "ERROR: Server failed to start"
    exit 1
fi

echo "Server running (PID: $SERVER_PID)"
echo ""

# List channels
echo "Listing channels..."
node bin/agentchat.js channels ws://localhost:6667
echo ""

# Send a test message
echo "Sending test message..."
node bin/agentchat.js send ws://localhost:6667 "#general" "Test message from quick-test.sh"
echo ""

# Clean up
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "=== Test Complete ==="
echo ""
echo "To run manually:"
echo "  Terminal 1: node bin/agentchat.js serve"
echo "  Terminal 2: node bin/agentchat.js listen ws://localhost:6667 '#general'"
echo "  Terminal 3: node bin/agentchat.js send ws://localhost:6667 '#general' 'Hello!'"
