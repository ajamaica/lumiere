#!/usr/bin/env bash
# create-hexmem-vault.sh — create a dedicated Archon vault named hexmem-vault

set -euo pipefail

VAULT_NAME="${1:-hexmem-vault}"

if [[ -z "${ARCHON_PASSPHRASE:-}" ]]; then
  echo "Error: ARCHON_PASSPHRASE not set" >&2
  exit 1
fi

# keymaster resolves the wallet relative to the current directory in some setups.
# Use the canonical Archon config dir so "current ID" is available.
ARCHON_DIR="$HOME/.config/hex/archon"

DID=$(cd "$ARCHON_DIR" && npx @didcid/keymaster create-vault -n "$VAULT_NAME" 2>/dev/null | tail -n 1 || true)

# In case create-vault doesn't print just DID, attempt resolve via name
if [[ -z "$DID" || "$DID" != did:* ]]; then
  DID=$(cd "$ARCHON_DIR" && npx @didcid/keymaster get-name "$VAULT_NAME" 2>/dev/null || true)
fi

if [[ -z "$DID" ]]; then
  echo "Created vault name '$VAULT_NAME', but could not resolve DID from output." >&2
  echo "Try: npx @didcid/keymaster get-name $VAULT_NAME" >&2
  exit 1
fi

echo "$DID"