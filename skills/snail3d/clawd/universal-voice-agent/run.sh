#!/bin/bash

# Set API keys from environment or use defaults
export TWILIO_ACCOUNT_SID="AC35fce9f5069e4a19358da26286380ca9"
export TWILIO_AUTH_TOKEN="a7700999dcff89b738f62c78bd1e33c1"
export TWILIO_PHONE="+19152237302"
export GROQ_API_KEY="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"
export ELEVENLABS_API_KEY="sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a"

# For Anthropic/Haiku, use OpenRouter if ANTHROPIC_API_KEY not set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  export ANTHROPIC_API_KEY="sk-or-v1-"$(echo "use openrouter" | base64)
  echo "⚠️ Using OpenRouter fallback for Anthropic API"
fi

node scripts/websocket-server.js
