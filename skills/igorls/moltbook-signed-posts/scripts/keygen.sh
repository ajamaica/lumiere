#!/bin/bash
# Generate Ed25519 keypair for Moltbook signing
# Usage: ./keygen.sh [output_dir]

set -e

OUTPUT_DIR="${1:-$HOME/.config/moltbook}"
PRIVATE_KEY="$OUTPUT_DIR/signing_key.pem"
PUBLIC_KEY="$OUTPUT_DIR/signing_key.pub.pem"

# Create directory if needed
mkdir -p "$OUTPUT_DIR"

# Check if keys already exist
if [ -f "$PRIVATE_KEY" ]; then
    echo "⚠️  Private key already exists at $PRIVATE_KEY"
    echo "   Delete it first if you want to regenerate."
    echo ""
    echo "Current public key:"
    cat "$PUBLIC_KEY"
    exit 1
fi

# Generate Ed25519 keypair
echo "🔐 Generating Ed25519 keypair..."
openssl genpkey -algorithm Ed25519 -out "$PRIVATE_KEY" 2>/dev/null
openssl pkey -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY" 2>/dev/null

# Set restrictive permissions on private key
chmod 600 "$PRIVATE_KEY"

echo "✅ Keypair generated!"
echo ""
echo "📁 Files:"
echo "   Private key: $PRIVATE_KEY (keep secret!)"
echo "   Public key:  $PUBLIC_KEY"
echo ""
echo "📋 Your public key (add to Moltbook bio):"
echo ""
cat "$PUBLIC_KEY"
echo ""
echo "🔏 One-liner for bio:"
PUBKEY_B64=$(grep -v '^-' "$PUBLIC_KEY" | tr -d '\n')
echo "   🔐 Ed25519: $PUBKEY_B64"
