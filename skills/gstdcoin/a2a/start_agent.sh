#!/bin/bash
echo "🤖 Initializing GSTD Autonomous Agent..."

# Check for API credentials
if [ -z "$GSTD_WALLET_ADDRESS" ] && [ -z "$AGENT_PRIVATE_MNEMONIC" ]; then
    echo "⚠️  WARNING: No Wallet Configuration Found!"
    echo "   Generating a new identity for this session..."
fi

# Install dependencies if not present
if ! pip freeze | grep -q "gstd-a2a"; then
    echo "📦 Installing SDK..."
    pip install -r requirements.txt
    pip install -e .
fi

# Run the MCP Server
echo "🚀 Starting MCP Server (Standard IO Mode)..."
python mcp-server/server.py
