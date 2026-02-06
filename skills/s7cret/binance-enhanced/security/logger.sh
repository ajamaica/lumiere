#!/usr/bin/env bash
# logger.sh - detailed transaction logging for Binance skill
# Usage: source shared/security/logger.sh
# Then use log_txn function:
#   log_txn --type order --symbol BTCUSDT --side BUY --qty 0.001 --price 40000 --status submitted --note "user confirmed"

set -euo pipefail

LOG_DIR="$(dirname "${BASH_SOURCE[0]}")/logs"
LOG_FILE="$LOG_DIR/transactions.log"
mkdir -p "$LOG_DIR"

# Ensure a structured log entry. We keep logs NDJSON (one JSON per line)
log_txn() {
  local type="unknown"
  local symbol=""
  local side=""
  local qty=""
  local price=""
  local status=""
  local user=""
  local note=""
  local api_key_id=""
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --type) type="$2"; shift 2;;
      --symbol) symbol="$2"; shift 2;;
      --side) side="$2"; shift 2;;
      --qty) qty="$2"; shift 2;;
      --price) price="$2"; shift 2;;
      --status) status="$2"; shift 2;;
      --user) user="$2"; shift 2;;
      --note) note="$2"; shift 2;;
      --api-key-id) api_key_id="$2"; shift 2;;
      *) echo "Unknown arg $1" >&2; return 2;;
    esac
  done

  # Build JSON escaping properly
  jq -n --arg ts "$ts" --arg type "$type" --arg symbol "$symbol" --arg side "$side" \
    --arg qty "$qty" --arg price "$price" --arg status "$status" --arg user "$user" \
    --arg note "$note" --arg api_key_id "$api_key_id" '{timestamp:$ts, type:$type, symbol:$symbol, side:$side, qty:$qty, price:$price, status:$status, user:$user, note:$note, api_key_id:$api_key_id}' \
    >> "$LOG_FILE"
}

# Simple query helper to tail or filter logs by symbol/user
query_logs() {
  local filter="$1"
  grep -a --line-buffered "$filter" "$LOG_FILE" || true
}

# Rotate logs if too large
rotate_logs() {
  local max_mb=${1:-10}
  if [ -f "$LOG_FILE" ]; then
    local size_mb
    size_mb=$(du -m "$LOG_FILE" | cut -f1)
    if [ "$size_mb" -ge "$max_mb" ]; then
      mv "$LOG_FILE" "$LOG_FILE.$(date -u +%Y%m%dT%H%M%SZ)"
      gzip -9 "$LOG_FILE."*
      touch "$LOG_FILE"
    fi
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file is intended to be sourced: source $(realpath "$0")"
fi
