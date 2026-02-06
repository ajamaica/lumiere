#!/bin/bash
# Voice UI Startup Script

cd "$(dirname "$0")"

# Load API key from OpenClaw config or environment
export OPENAI_API_KEY="${OPENAI_API_KEY:-$(cat ~/.openclaw/openclaw.json 2>/dev/null | grep -o '"apiKey": "[^"]*"' | head -1 | cut -d'"' -f4)}"

# If still empty, try skills config
if [ -z "$OPENAI_API_KEY" ]; then
  export OPENAI_API_KEY=$(cat ~/.openclaw/openclaw.json 2>/dev/null | python3 -c "import sys,json; c=json.load(sys.stdin); print(c.get('skills',{}).get('entries',{}).get('openai-whisper-api',{}).get('apiKey',''))" 2>/dev/null)
fi

echo "🎤 Starting Voice UI..."
echo "📍 http://localhost:8765"

node server.cjs
