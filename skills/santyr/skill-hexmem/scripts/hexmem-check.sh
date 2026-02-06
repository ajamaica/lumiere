#!/usr/bin/env bash
set -euo pipefail

# Lightweight "active use" helper.
# Prints pending tasks + recent events, and exits.

source /home/sat/clawd/hexmem/hexmem.sh

echo "=== HexMem: Pending Tasks ==="
hexmem_pending_tasks || true

echo

echo "=== HexMem: Recent Events (5) ==="
hexmem_recent_events 5 || true
