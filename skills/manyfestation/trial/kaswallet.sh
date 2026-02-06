#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

export PYTHONPYCACHEPREFIX="${PYTHONPYCACHEPREFIX:-$ROOT_DIR/.pycache}"

run_wallet() {
  exec "$ROOT_DIR/.venv/bin/python" "$ROOT_DIR/scripts/kaswallet.py" "$@"
}

if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  run_wallet "$@"
fi

find_python() {
  if [[ -n "${KASPA_PYTHON:-}" ]]; then
    if [[ -x "$KASPA_PYTHON" ]]; then
      echo "$KASPA_PYTHON"
      return 0
    fi
    if command -v "$KASPA_PYTHON" >/dev/null 2>&1; then
      echo "$KASPA_PYTHON"
      return 0
    fi
  fi

  for exe in python3 python; do
    if command -v "$exe" >/dev/null 2>&1; then
      echo "$exe"
      return 0
    fi
  done
  return 1
}

PY="$(find_python || true)"
if [[ -z "$PY" ]]; then
  echo "No Python found. Install Python 3 and re-run: python3 install.py" >&2
  exit 1
fi

echo "Python venv not found. Bootstrapping with: $PY install.py" >&2
"$PY" install.py >&2

if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  run_wallet "$@"
fi

echo "Install failed (no .venv created). Try running manually:" >&2
echo "  $PY install.py" >&2
exit 1
