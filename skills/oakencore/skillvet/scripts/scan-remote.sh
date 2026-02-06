#!/usr/bin/env bash
# scan-remote.sh — Download and scan a ClawHub skill without installing it
# Usage: scan-remote.sh [--json] [--summary] <skill-slug>

set -uo pipefail

FLAGS=""
while [[ "${1:-}" == --* ]]; do
  FLAGS+="$1 "
  shift
done

SLUG="${1:?Usage: scan-remote.sh [--json] [--summary] <skill-slug>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

mkdir -p "$TMPDIR/skills"

if ! (cd "$TMPDIR" && clawdhub install "$SLUG") &>/dev/null; then
  echo "Failed to download skill: $SLUG" >&2
  exit 2
fi

if [ ! -d "$TMPDIR/skills/$SLUG" ]; then
  echo "Skill not found after download: $SLUG" >&2
  exit 2
fi

# shellcheck disable=SC2086
"$SCRIPT_DIR/skill-audit.sh" $FLAGS "$TMPDIR/skills/$SLUG"
