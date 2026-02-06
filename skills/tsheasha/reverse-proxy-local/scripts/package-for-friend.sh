#!/bin/bash
set -e

#######################################
# Package credentials for sharing
#######################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDENTIALS_FILE="$HOME/.openclaw/ecto-credentials.json"
OUTPUT_DIR="${1:-ecto-connection-package}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if credentials exist
if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo -e "${RED}Error:${NC} No credentials found at $CREDENTIALS_FILE"
    echo "Run ./connect.sh first to set up your connection."
    exit 1
fi

# Create package directory
mkdir -p "$OUTPUT_DIR"

# Copy files
cp "$CREDENTIALS_FILE" "$OUTPUT_DIR/ecto-credentials.json"
cp "$SCRIPT_DIR/test-connection.sh" "$OUTPUT_DIR/test-connection.sh"
chmod +x "$OUTPUT_DIR/test-connection.sh"

# Create README for friend
cat > "$OUTPUT_DIR/README.md" << 'EOF'
# OpenClaw API Access

Your friend has given you access to their OpenClaw AI assistant!

## Quick Test

```bash
./test-connection.sh
```

This will test the connection and send a greeting.

## Using the API

The `ecto-credentials.json` file contains:
- `url`: The API endpoint
- `token`: Your authentication token

### Example Request

```bash
URL=$(cat ecto-credentials.json | grep url | cut -d'"' -f4)
TOKEN=$(cat ecto-credentials.json | grep token | cut -d'"' -f4)

curl "$URL/v1/chat/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Your message here"}
    ]
  }'
```

### With jq (recommended)

```bash
URL=$(jq -r '.url' ecto-credentials.json)
TOKEN=$(jq -r '.token' ecto-credentials.json)

curl -s "$URL/v1/chat/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}' \
  | jq -r '.choices[0].message.content'
```

## API Format

The API follows OpenAI's chat completions format:

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Your question here"}
  ]
}
```

**Response:**
```json
{
  "id": "chatcmpl_...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "openclaw",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "The AI's response"
    },
    "finish_reason": "stop"
  }]
}
```

## Requirements

- `curl` (built-in on macOS/Linux)
- `jq` (optional, for easier JSON parsing)
  - Install: `brew install jq` (macOS)

## Security

- **Keep your credentials private** - anyone with the token can use the API
- The connection is secured via HTTPS (Tailscale Funnel)
- Your friend can regenerate the token at any time to revoke access

## Support

Contact your friend if:
- The connection test fails
- You get authentication errors
- You need help with API usage
EOF

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     📦 Package Ready for Sharing! 📦      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Package location:${NC} $OUTPUT_DIR"
echo ""
echo -e "${BLUE}Contents:${NC}"
echo "  ✓ ecto-credentials.json (API access)"
echo "  ✓ test-connection.sh (connection tester)"
echo "  ✓ README.md (usage instructions)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Share the entire folder: $OUTPUT_DIR"
echo "  2. Or zip it: zip -r ecto-connection.zip $OUTPUT_DIR"
echo "  3. Your friend runs: ./test-connection.sh"
echo ""
