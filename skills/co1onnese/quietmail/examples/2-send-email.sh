#!/bin/bash
# quiet-mail Example 2: Send an email

API_BASE="https://api.quiet-mail.com"
AGENT_ID="my-agent"

# Get API key from environment or file
if [ -z "$QUIETMAIL_API_KEY" ]; then
  if [ -f ~/.quietmail_key ]; then
    QUIETMAIL_API_KEY=$(cat ~/.quietmail_key)
  else
    echo "❌ Error: QUIETMAIL_API_KEY not set"
    echo "Set it with: export QUIETMAIL_API_KEY=\"your_key_here\""
    exit 1
  fi
fi

echo "Sending email..."

response=$(curl -s -X POST "$API_BASE/agents/$AGENT_ID/send" \
  -H "Authorization: Bearer $QUIETMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from quiet-mail!",
    "text": "This is a test email sent via the quiet-mail API.",
    "html": "<h1>Hello!</h1><p>This is a <strong>test email</strong> sent via the quiet-mail API.</p>"
  }')

echo "$response" | python3 -m json.tool

if echo "$response" | grep -q '"id"'; then
  echo ""
  echo "✅ Email sent successfully!"
else
  echo ""
  echo "❌ Error sending email. Check the response above."
fi
