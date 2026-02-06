#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Catholic Grounding Pack"
echo "Root: $ROOT"

echo "\nScripts:"
ls -1 "$ROOT/scripts" | sed 's/^/- /'

echo "\nReferences:"
if [ -d "$ROOT/references" ]; then
  ls -1 "$ROOT/references" | sed 's/^/- /'
else
  echo "(none)"
fi

echo "\nQuick tips:"
echo "- CCC pointers:   ./scripts/ccc.sh \"eucharist\""
echo "- Prayer snippet: ./scripts/prayer.sh \"hail mary\""

echo "\nNote: This skill is designed for accurate, respectful Catholic explanations (Catechism-first)."
