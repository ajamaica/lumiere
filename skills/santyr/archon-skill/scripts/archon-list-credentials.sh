#!/bin/bash
# List verifiable credentials in local Archon wallet

set -e

export ARCHON_CONFIG_DIR="$HOME/.config/hex/archon"
: "${ARCHON_PASSPHRASE:?Set ARCHON_PASSPHRASE in environment}"

cd "$ARCHON_CONFIG_DIR" || exit 1
: "${ARCHON_PASSPHRASE:?Set ARCHON_PASSPHRASE in environment}"

echo "Verifiable Credentials:"
echo "---"
npx @didcid/keymaster list-credentials
