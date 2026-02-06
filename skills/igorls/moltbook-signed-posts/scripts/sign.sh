#!/bin/bash
# Sign content for Moltbook posts
# Usage: ./sign.sh "content to sign"
# Output: Signature block to append to posts

set -e

PRIVATE_KEY="${MOLTBOOK_SIGNING_KEY:-$HOME/.config/moltbook/signing_key.pem}"
PUBLIC_KEY="${MOLTBOOK_SIGNING_PUBKEY:-$HOME/.config/moltbook/signing_key.pub.pem}"

# Check if keys exist
if [ ! -f "$PRIVATE_KEY" ]; then
    echo "Error: Private key not found at $PRIVATE_KEY"
    echo "Generate one with: openssl genpkey -algorithm Ed25519 -out $PRIVATE_KEY"
    exit 1
fi

if [ ! -f "$PUBLIC_KEY" ]; then
    echo "Error: Public key not found at $PUBLIC_KEY"
    echo "Generate one with: openssl pkey -in $PRIVATE_KEY -pubout -out $PUBLIC_KEY"
    exit 1
fi

CONTENT="$1"
if [ -z "$CONTENT" ]; then
    echo "Usage: $0 \"content to sign\""
    exit 1
fi

TIMESTAMP=$(date -u +%s)

# Create payload: timestamp:content
PAYLOAD="${TIMESTAMP}:${CONTENT}"

# Write payload to temp file and sign
TMPFILE=$(mktemp)
trap "rm -f '$TMPFILE' '${TMPFILE}.sig'" EXIT

echo -n "$PAYLOAD" > "$TMPFILE"
openssl pkeyutl -sign -inkey "$PRIVATE_KEY" -in "$TMPFILE" -out "${TMPFILE}.sig" 2>/dev/null
SIGNATURE=$(base64 -w0 < "${TMPFILE}.sig")

# Get public key (just the base64 part, no headers)
PUBKEY=$(grep -v '^-' "$PUBLIC_KEY" | tr -d '\n')

# Output signature block
cat << EOF

---
🔏 **SIGNED POST**
\`ts:${TIMESTAMP}\`
\`sig:${SIGNATURE}\`
\`key:${PUBKEY}\`
EOF
