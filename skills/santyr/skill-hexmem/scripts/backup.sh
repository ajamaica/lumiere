#!/usr/bin/env bash
# Safe backup for HexMem SQLite DB
# Usage: ./scripts/backup.sh [--db path] [--outdir dir] [--check]

set -euo pipefail

DB_DEFAULT="$HOME/clawd/hexmem/hexmem.db"
OUTDIR_DEFAULT="$HOME/clawd/hexmem/backups"

DB="$DB_DEFAULT"
OUTDIR="$OUTDIR_DEFAULT"
CHECK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db)
      DB="$2"; shift 2 ;;
    --outdir)
      OUTDIR="$2"; shift 2 ;;
    --check)
      CHECK=true; shift 1 ;;
    -h|--help)
      echo "Usage: $0 [--db path] [--outdir dir] [--check]";
      exit 0;;
    *)
      echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

mkdir -p "$OUTDIR"
TS=$(date +%Y%m%d-%H%M%S)
OUT="$OUTDIR/hexmem-$TS.db"

sqlite3 "$DB" ".backup '$OUT'"

if [[ "$CHECK" == "true" ]]; then
  sqlite3 "$DB" "PRAGMA integrity_check;" | head -50
fi

echo "Backup written: $OUT"