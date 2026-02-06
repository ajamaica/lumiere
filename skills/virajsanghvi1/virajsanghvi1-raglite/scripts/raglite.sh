#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$SKILL_DIR/.venv"

if [[ ! -d "$VENV_DIR" ]]; then
  echo "RAGLite skill not installed yet. Run: $SKILL_DIR/scripts/install.sh" >&2
  exit 2
fi

source "$VENV_DIR/bin/activate"

# Default engine to OpenClaw unless user overrides.
# If user didn't pass --engine, inject: --engine openclaw
args=("$@")
if [[ " ${args[*]} " != *" --engine "* ]]; then
  args=("${args[@]:0:1}" "--engine" "openclaw" "${args[@]:1}")
fi

exec raglite "${args[@]}"
