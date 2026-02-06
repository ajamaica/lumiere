#!/usr/bin/env bash
# sign-repo.sh — Regenerate and sign the manifest after changes
# Run this after any repo changes before pushing

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHON_DIR="$HOME/.config/hex/archon"

cd "$REPO_DIR"

# Check for archon config
if [[ ! -f "$ARCHON_DIR/wallet.json" ]]; then
  echo "Error: No wallet at $ARCHON_DIR/wallet.json"
  exit 1
fi

export ARCHON_GATEKEEPER_URL="${ARCHON_GATEKEEPER_URL:-https://archon.technology}"
if [[ -z "${ARCHON_PASSPHRASE:-}" ]]; then
  echo "Error: ARCHON_PASSPHRASE not set"
  exit 1
fi

MY_DID="did:cid:bagaaierajrr7k6izcrdfwqxpgtrobflsv5oibymfnthjazkkokaugszyh4ka"

echo "=== Generating manifest ==="

# Create temporary manifest
TMP_MANIFEST=$(mktemp)
cat > "$TMP_MANIFEST" << MANIFEST
{
  "@context": "https://w3id.org/security/v2",
  "type": "RepoManifest",
  "issuer": "$MY_DID",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "repository": "https://github.com/hexdaemon/hexmem",
  "files": [
$(find . -type f \
    ! -path "./.git/*" \
    ! -path "./.venv/*" \
    ! -path "./__pycache__/*" \
    ! -name "manifest*.json" \
    ! -name "*.pyc" \
    ! -name "*.db" \
    ! -name "*.db-*" \
    | sort | while read f; do
  hash=$(sha256sum "$f" | cut -d' ' -f1)
  echo "    {\"path\": \"$f\", \"sha256\": \"$hash\"},"
done | sed '$ s/,$//')
  ]
}
MANIFEST

echo "=== Signing manifest ==="
cd "$ARCHON_DIR"
npx @didcid/keymaster sign-file "$TMP_MANIFEST" > "$REPO_DIR/manifest.json" 2>&1
rm "$TMP_MANIFEST"

echo "=== Verifying ==="
npx @didcid/keymaster verify-file "$REPO_DIR/manifest.json" 2>&1

echo "=== Done ==="
echo "Manifest signed and saved to manifest.json"
echo "Don't forget to commit and push!"
