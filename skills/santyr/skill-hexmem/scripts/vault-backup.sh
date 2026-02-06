#!/usr/bin/env bash
# vault-backup.sh — create signed HexMem artifacts and upload to Archon vault
# Requires:
# - ARCHON_PASSPHRASE (env)
# - keymaster configured (wallet.json)
# - vault DID either via HEXMEM_VAULT_DID or DID name hexmem-vault

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${HEXMEM_DB:-$HOME/clawd/hexmem/hexmem.db}"
VAULT_DID="${HEXMEM_VAULT_DID:-}"
VAULT_NAME="${HEXMEM_VAULT_NAME:-hexmem-vault}"

ARCHON_DIR="$HOME/.config/hex/archon"

if [[ -z "${ARCHON_PASSPHRASE:-}" ]]; then
  echo "Error: ARCHON_PASSPHRASE not set" >&2
  exit 1
fi

cd "$REPO_DIR"

# Resolve vault DID if not provided
if [[ -z "$VAULT_DID" ]]; then
  VAULT_DID=$(cd "$ARCHON_DIR" && npx @didcid/keymaster get-name "$VAULT_NAME" 2>/dev/null || true)
fi

if [[ -z "$VAULT_DID" ]]; then
  echo "Error: HEXMEM_VAULT_DID not set and name '$VAULT_NAME' not found in wallet." >&2
  echo "Hint: create it: npx @didcid/keymaster create-vault -n $VAULT_NAME" >&2
  exit 1
fi

echo "Using vault: $VAULT_DID" >&2

# 1) Backup DB
BACKUP_PATH=$(./scripts/backup.sh --db "$DB" --outdir "$REPO_DIR/backups")

# scripts/backup.sh prints 'Backup written: <path>'
BACKUP_FILE=$(echo "$BACKUP_PATH" | awk '{print $3}')

# 2) Export significant
EXPORT_FILE=$(./scripts/export-significant.sh)

# 3) Build metadata attestation
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TS_ID=$(date -u +%Y%m%d%H%M%S)
META_FILE="$REPO_DIR/exports/hexmem-vault-meta-$TS_ID.json"

DB_SHA=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
EX_SHA=$(sha256sum "$EXPORT_FILE" | awk '{print $1}')

cat > "$META_FILE" <<EOF
{
  "schema": "hexmem-vault-backup-meta",
  "version": 1,
  "created": "$TS",
  "db": {"path": "$(basename "$BACKUP_FILE")", "sha256": "$DB_SHA"},
  "export": {"path": "$(basename "$EXPORT_FILE")", "sha256": "$EX_SHA"}
}
EOF

# 4) Sign metadata
SIGNED_META="$META_FILE.signed.json"
(cd "$ARCHON_DIR" && npx @didcid/keymaster sign-file "$META_FILE") > "$SIGNED_META" 2>/dev/null

# 5) Upload artifacts
# Keymaster currently enforces short vault item names; stage with short basenames.
STAGE_DIR=$(mktemp -d)
trap 'rm -rf "$STAGE_DIR"' EXIT

DB_STAGE="$STAGE_DIR/hmdb-$TS_ID.db"
EX_STAGE="$STAGE_DIR/hmsig-$TS_ID.json"
META_STAGE="$STAGE_DIR/hmmeta-$TS_ID.json"

cp "$BACKUP_FILE" "$DB_STAGE"
cp "$EXPORT_FILE" "$EX_STAGE"
cp "$SIGNED_META" "$META_STAGE"

(cd "$ARCHON_DIR" && npx @didcid/keymaster add-vault-item "$VAULT_DID" "$DB_STAGE")
(cd "$ARCHON_DIR" && npx @didcid/keymaster add-vault-item "$VAULT_DID" "$EX_STAGE")
(cd "$ARCHON_DIR" && npx @didcid/keymaster add-vault-item "$VAULT_DID" "$META_STAGE")

# 6) Clear "backup needed" flag (best-effort)
sqlite3 "$DB" "INSERT INTO kv_store(key,value,namespace,updated_at) VALUES('vault_backup_needed','0','hexmem',datetime('now'))
  ON CONFLICT(namespace,key) DO UPDATE SET value='0', updated_at=datetime('now');" >/dev/null 2>&1 || true

echo "Vault backup complete: $(basename "$BACKUP_FILE"), $(basename "$EXPORT_FILE"), $(basename "$SIGNED_META")"