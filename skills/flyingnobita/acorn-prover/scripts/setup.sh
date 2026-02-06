#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$SKILL_DIR/config.env"

# Usage: setup.sh <ACORN_LIB> <ACORN_PROJECT>
if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <ACORN_LIB> <ACORN_PROJECT>"
  echo "  ACORN_LIB    - Path to acornlib directory"
  echo "  ACORN_PROJECT - Path to project directory for .ac files"
  exit 1
fi

ACORN_LIB="$1"
ACORN_PROJECT="$2"

echo "Acorn Prover - Setup"
echo "======================"
echo

# Validate ACORN_LIB
if [[ ! -d "$ACORN_LIB" ]]; then
  echo "Error: Directory '$ACORN_LIB' does not exist."
  exit 1
fi

# Validate ACORN_PROJECT
if [[ ! -d "$ACORN_PROJECT" ]]; then
  echo "Error: Directory '$ACORN_PROJECT' does not exist."
  exit 1
fi

# Detect mise
USE_MISE=false
if command -v mise &>/dev/null; then
  USE_MISE=true
fi

cat > "$CONFIG_FILE" <<EOF
ACORN_LIB=$ACORN_LIB
ACORN_PROJECT=$ACORN_PROJECT
USE_MISE=$USE_MISE
EOF

echo
echo "Config written to $CONFIG_FILE"
echo "  ACORN_LIB=$ACORN_LIB"
echo "  ACORN_PROJECT=$ACORN_PROJECT"
echo "  USE_MISE=$USE_MISE"
