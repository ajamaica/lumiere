#!/bin/bash
# Backup file to Archon vault
# Usage: archon-vault-backup.sh <vault-name> <file-path> <key>

set -e

# Detect platform and set appropriate commands
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/detect-platform.sh"

VAULT_NAME="${1:?Usage: $0 <vault-name> <file-path> <key>}"
FILE_PATH="${2:?}"
KEY="${3:?}"

# Convert to absolute path before cd
FILE_PATH=$(realpath "$FILE_PATH")

if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File not found: $FILE_PATH" >&2
    exit 1
fi

export ARCHON_CONFIG_DIR="$HOME/.config/hex/archon"
: "${ARCHON_PASSPHRASE:?Set ARCHON_PASSPHRASE in environment}"

cd "$ARCHON_CONFIG_DIR" || exit 1
: "${ARCHON_PASSPHRASE:?Set ARCHON_PASSPHRASE in environment}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FILESIZE=$($STAT_SIZE "$FILE_PATH")
CHECKSUM=$($CHECKSUM_CMD "$FILE_PATH" | awk '{print $1}')

METADATA=$(jq -n \
  --arg ts "$TIMESTAMP" \
  --arg size "$FILESIZE" \
  --arg sha256 "$CHECKSUM" \
  --arg original "$FILE_PATH" \
  '{timestamp: $ts, size: $size, sha256: $sha256, original_path: $original}')

echo "Backing up to vault: $VAULT_NAME"
echo "  File: $FILE_PATH ($FILESIZE bytes)"
echo "  Key: $KEY"
echo "  SHA256: $CHECKSUM"

# Read file content as base64 for binary safety
CONTENT=$(base64 < "$FILE_PATH")

npx @didcid/keymaster add-vault-item \
  --vault-id "$VAULT_NAME" \
  --key "$KEY" \
  --value "$CONTENT" \
  --metadata "$METADATA"

echo "✓ Backup complete"
