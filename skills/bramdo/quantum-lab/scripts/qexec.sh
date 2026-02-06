#!/usr/bin/env bash
set -euo pipefail

ROOT="${QUANTUM_LAB_ROOT:-$HOME/work/quantum_lab}"
VENV="${VENV_PATH:-$HOME/.venvs/qiskit}"

if [[ ! -d "$VENV" ]]; then
  echo "Venv not found: $VENV" >&2
  echo "Set VENV_PATH or create the venv first." >&2
  exit 1
fi

if [[ ! -d "$ROOT" ]]; then
  echo "Repo not found: $ROOT" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Usage: qexec <command> [args...]" >&2
  echo "Example: qexec python quantum_app.py self-tests" >&2
  exit 2
fi

# shellcheck disable=SC1090
source "$VENV/bin/activate"
cd "$ROOT"

exec "$@"
