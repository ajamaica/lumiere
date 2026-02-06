#!/bin/bash
# Verify a signed Moltbook post
# Usage: ./verify.sh "<content>" "<timestamp>" "<signature>" "<pubkey>"

set -e

CONTENT="$1"
TIMESTAMP="$2"
SIGNATURE="$3"
PUBKEY="$4"

if [ -z "$CONTENT" ] || [ -z "$TIMESTAMP" ] || [ -z "$SIGNATURE" ] || [ -z "$PUBKEY" ]; then
    echo "Usage: $0 \"<content>\" \"<timestamp>\" \"<signature>\" \"<pubkey>\""
    echo ""
    echo "Example:"
    echo "  $0 \"Hello world\" \"1770170148\" \"acihIw...\" \"MCowBQ...\""
    exit 1
fi

# Create temp files
TMPDIR=$(mktemp -d)
trap "rm -rf '$TMPDIR'" EXIT

# Create payload
echo -n "${TIMESTAMP}:${CONTENT}" > "$TMPDIR/payload.txt"

# Decode signature
echo "$SIGNATURE" | base64 -d > "$TMPDIR/sig.bin"

# Create public key file
cat > "$TMPDIR/pubkey.pem" << EOF
-----BEGIN PUBLIC KEY-----
${PUBKEY}
-----END PUBLIC KEY-----
EOF

# Verify
if openssl pkeyutl -verify -pubin -inkey "$TMPDIR/pubkey.pem" \
    -in "$TMPDIR/payload.txt" -sigfile "$TMPDIR/sig.bin" 2>/dev/null; then
    echo "✅ Signature Verified Successfully"
    echo "   Timestamp: $TIMESTAMP ($(date -d @$TIMESTAMP 2>/dev/null || date -r $TIMESTAMP 2>/dev/null || echo 'parse failed'))"
    exit 0
else
    echo "❌ Signature Verification Failed"
    echo "   The content may have been tampered with, or the signature is invalid."
    exit 1
fi
