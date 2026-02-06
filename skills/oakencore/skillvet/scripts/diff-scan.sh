#!/usr/bin/env bash
# diff-scan.sh — Scan only changed files between two versions of a skill
# Usage: diff-scan.sh [--json] [--summary] <old-skill-dir> <new-skill-dir>

set -uo pipefail

JSON_FLAG=0
SUMMARY_FLAG=0
FLAGS=""
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --json) JSON_FLAG=1 ;;
    --summary) SUMMARY_FLAG=1 ;;
  esac
  FLAGS+="$1 "
  shift
done

OLD_DIR="${1:?Usage: diff-scan.sh [--json] [--summary] <old-skill-dir> <new-skill-dir>}"
NEW_DIR="${2:?Usage: diff-scan.sh [--json] [--summary] <old-skill-dir> <new-skill-dir>}"

if [ ! -d "$OLD_DIR" ]; then
  echo "Old skill directory not found: $OLD_DIR" >&2
  exit 2
fi

if [ ! -d "$NEW_DIR" ]; then
  echo "New skill directory not found: $NEW_DIR" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

SKILL_NAME="$(basename "$NEW_DIR")"
DIFF_DIR="$TMPDIR/$SKILL_NAME"
mkdir -p "$DIFF_DIR"

CHANGED=0
while IFS= read -r file; do
  rel="${file#$NEW_DIR/}"
  old_file="$OLD_DIR/$rel"
  if [ ! -f "$old_file" ] || ! diff -q "$file" "$old_file" &>/dev/null; then
    mkdir -p "$DIFF_DIR/$(dirname "$rel")"
    cp "$file" "$DIFF_DIR/$rel"
    CHANGED=$((CHANGED + 1))
  fi
done < <(find "$NEW_DIR" -type f 2>/dev/null)

if [ $CHANGED -eq 0 ]; then
  if [ $JSON_FLAG -eq 1 ]; then
    printf '{"skill":"%s","diff":true,"changed_files":0,"summary":{"critical":0,"warnings":0,"status":"clean"},"findings":[]}\n' "$SKILL_NAME"
  elif [ $SUMMARY_FLAG -eq 1 ]; then
    echo "skillvet: $SKILL_NAME — clean (no changes)"
  else
    echo "No changes detected between versions of $SKILL_NAME"
  fi
  exit 0
fi

if [ $JSON_FLAG -eq 0 ] && [ $SUMMARY_FLAG -eq 0 ]; then
  echo "Diff scan: $CHANGED changed/new files in $SKILL_NAME"
  echo ""
fi

# shellcheck disable=SC2086
"$SCRIPT_DIR/skill-audit.sh" $FLAGS "$DIFF_DIR"
