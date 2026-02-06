#!/bin/bash
# List contents of Archon vault
# Usage: archon-vault-list.sh <vault-name>

set -e

VAULT_NAME="${1:?Usage: $0 <vault-name>}"

export ARCHON_CONFIG_DIR="$HOME/.config/hex/archon"
: "${ARCHON_PASSPHRASE:?Set ARCHON_PASSPHRASE in environment}"

cd "$ARCHON_CONFIG_DIR" || exit 1
: "${ARCHON_PASSPHRASE:?Set ARCHON_PASSPHRASE in environment}"

echo "Vault: $VAULT_NAME"
echo "---"
npx @didcid/keymaster list-vault-items "$VAULT_NAME"
