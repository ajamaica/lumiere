#!/bin/bash
# Restore file from Archon vault
# Usage: archon-vault-restore.sh <vault-name> <key> <output-path>

set -e

# Detect platform and set appropriate commands
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/detect-platform.sh"

VAULT_NAME="${1:?Usage: $0 <vault-name> <key> <output-path>}"
KEY="${2:?}"
OUTPUT_PATH="${3:?}"

export ARCHON_CONFIG_DIR="$HOME/.config/hex/archon"
: "${ARCHON_PASSPHRASE:?Set ARCHON_PASSPHRASE in environment}"

cd "$ARCHON_CONFIG_DIR" || exit 1
: "${ARCHON_PASSPHRASE:?Set ARCHON_PASSPHRASE in environment}"

echo "Restoring from vault: $VAULT_NAME"
echo "  Key: $KEY"
echo "  Output: $OUTPUT_PATH"

npx @didcid/keymaster get-vault-item \
  --vault-id "$VAULT_NAME" \
  --key "$KEY" \
  --output "$OUTPUT_PATH"

if [ -f "$OUTPUT_PATH" ]; then
    FILESIZE=$($STAT_SIZE "$OUTPUT_PATH")
    CHECKSUM=$($CHECKSUM_CMD "$OUTPUT_PATH" | awk '{print $1}')
    echo "✓ Restored successfully"
    echo "  Size: $FILESIZE bytes"
    echo "  SHA256: $CHECKSUM"
else
    echo "✗ Restore failed" >&2
    exit 1
fi
