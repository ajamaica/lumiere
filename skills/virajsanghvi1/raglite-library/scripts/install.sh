#!/usr/bin/env bash
set -euo pipefail

# Install raglite into a local venv inside the skill folder.
# This keeps skill dependencies isolated.

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$SKILL_DIR/.venv"

if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip setuptools wheel >/dev/null

# Install from GitHub main (or tag) so this skill works anywhere.
python -m pip install --upgrade "git+https://github.com/VirajSanghvi1/raglite.git@main" 

echo "Installed raglite into $VENV_DIR"
